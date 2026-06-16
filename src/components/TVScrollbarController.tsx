import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown, 
  MousePointer, 
  Settings, 
  Eye, 
  EyeOff,
  Sliders
} from "lucide-react";

interface TVScrollbarControllerProps {
  /** Optional ID of the specific scrollable element. Falls back to window. */
  targetId?: string;
  /** Label for the controller widget */
  label?: string;
}

export function TVScrollbarController({ 
  targetId = "client-portal-scroll-container", 
  label = "Painel de Rolagem (TV)" 
}: TVScrollbarControllerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 100
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [isHoldingUp, setIsHoldingUp] = useState(false);
  const [isHoldingDown, setIsHoldingDown] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to find the scrollable element
  const getScrollElement = (): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    const el = document.getElementById(targetId);
    if (el) {
      // An element is only scrollable if its content height transcends its visible client height
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
        return el;
      }
    }
    return null;
  };

  // Synchronize scroll position percentage
  const updateScrollProgress = () => {
    const el = getScrollElement();
    if (el) {
      const top = el.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      setScrollHeight(el.scrollHeight);
      setContainerHeight(el.clientHeight);
      if (height > 0) {
        setScrollProgress((top / height) * 100);
      } else {
        setScrollProgress(0);
      }
    } else {
      // Fallback to window/document scrolling
      if (typeof window !== "undefined") {
        const docEl = document.documentElement;
        const body = document.body || { scrollTop: 0, scrollHeight: 0 };
        const top = window.pageYOffset || window.scrollY || docEl.scrollTop || body.scrollTop || 0;
        const currentScrollHeight = Math.max(docEl.scrollHeight, body.scrollHeight, 0);
        const currentClientHeight = window.innerHeight || docEl.clientHeight || 0;
        const height = currentScrollHeight - currentClientHeight;
        
        setScrollHeight(currentScrollHeight);
        setContainerHeight(currentClientHeight);
        if (height > 0) {
          setScrollProgress((top / height) * 100);
        } else {
          setScrollProgress(0);
        }
      }
    }
  };

  // Listen to scrolls on target element or window
  useEffect(() => {
    const el = getScrollElement();
    updateScrollProgress();

    // Set up scroll listeners
    const handleScroll = () => {
      updateScrollProgress();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", handleScroll, { passive: true });
      document.addEventListener("scroll", handleScroll, { passive: true });
    }

    if (el) {
      el.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Set up a resize observer on target element, if possible, to capture content changes
    let observer: ResizeObserver | null = null;
    const targetEl = document.getElementById(targetId);
    if (targetEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateScrollProgress();
      });
      observer.observe(targetEl);
    }

    // Periodic check to capture dynamically loaded screens/assets
    const timer = setInterval(() => {
      updateScrollProgress();
    }, 1000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("scroll", handleScroll);
      }
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
      if (observer && targetEl) {
        observer.unobserve(targetEl);
      }
      clearInterval(timer);
    };
  }, [targetId]);

  // Main scroll action function
  const scrollByAmount = (pxAmount: number, smooth = true) => {
    const el = getScrollElement();
    if (el) {
      el.scrollBy({
        top: pxAmount,
        behavior: smooth ? "smooth" : "auto",
      });
      // Fallback update
      setTimeout(updateScrollProgress, 50);
    } else if (typeof window !== "undefined") {
      window.scrollBy({
        top: pxAmount,
        behavior: smooth ? "smooth" : "auto",
      });
      // Alternate backups for older smart TVs / Amazon Silk rendering engines
      try {
        const docEl = document.documentElement;
        if (docEl) {
          docEl.scrollBy({
            top: pxAmount,
            behavior: smooth ? "smooth" : "auto",
          });
        }
        const body = document.body;
        if (body) {
          body.scrollBy({
            top: pxAmount,
            behavior: smooth ? "smooth" : "auto",
          });
        }
      } catch (err) {
        // Safe catch
      }
      setTimeout(updateScrollProgress, 50);
    }
  };

  // Absolute scroll action function (0 = top, 1 = bottom)
  const scrollToPercent = (percent: number) => {
    const el = getScrollElement();
    if (el) {
      const targetTop = (percent / 100) * (el.scrollHeight - el.clientHeight);
      el.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    } else if (typeof window !== "undefined") {
      const docEl = document.documentElement;
      const body = document.body;
      const bodyScrollHeight = body ? body.scrollHeight : 0;
      const docScrollHeight = Math.max(docEl.scrollHeight, bodyScrollHeight);
      const targetTop = (percent / 100) * (docScrollHeight - window.innerHeight);
      
      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
      try {
        if (docEl) {
          docEl.scrollTo({
            top: targetTop,
            behavior: "smooth",
          });
        }
        if (body) {
          body.scrollTo({
            top: targetTop,
            behavior: "smooth",
          });
        }
      } catch (err) {
        // Safe catch
      }
    }
  };

  // Continuous holding handle
  const startContinuousScroll = (direction: "up" | "down") => {
    // Clear any existing active timer
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }

    const speed = direction === "up" ? -40 : 40;
    // Initial single scroll fast-tap feedback
    scrollByAmount(speed * 2, false);

    holdIntervalRef.current = setInterval(() => {
      // In Amazon Silk we want immediate responsiveness during scroll holding
      scrollByAmount(speed, false);
    }, 50);
  };

  const stopContinuousScroll = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  // Handle click directly on custom visual track to jump to area
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (clickY / rect.height) * 100));
    scrollToPercent(percentage);
  };

  return (
    <div 
      id="tv-scrollbar-interactive-controller"
      className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 select-none pointer-events-none"
    >
      {/* Dynamic collapsing indicator */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="pointer-events-auto flex items-center justify-center w-12 h-12 bg-slate-950/90 hover:bg-indigo-700 text-indigo-400 hover:text-white border border-slate-800 rounded-full shadow-2xl transition hover:scale-110 cursor-pointer"
          title="Exibir Rolagem"
        >
          <Sliders className="w-5 h-5 animate-pulse" />
        </button>
      )}

      {/* Main Bar Navigation Container */}
      {isVisible && (
        <div className="pointer-events-auto flex flex-col items-center justify-between w-18 md:w-20 bg-slate-950/95 border border-slate-850 p-2.5 rounded-3xl shadow-2xl backdrop-blur-lg">
          
          {/* Header Title / Hide Button */}
          <div className="w-full flex flex-col items-center gap-1 border-b border-slate-800 pb-2 mb-2 text-center">
            <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              Rolagem
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-500 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition"
              title="Ocultar painel de rolagem"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* BUTTON: HOME / TOP JUMP */}
          <button
            onClick={() => scrollToPercent(0)}
            className="w-12 h-10 flex flex-col items-center justify-center bg-slate-900/80 hover:bg-indigo-950 text-slate-300 hover:text-indigo-300 border border-slate-800 rounded-xl transition cursor-pointer mb-2 active:bg-indigo-900 active:scale-95"
            title="Ir para o Topo"
          >
            <ChevronsUp className="w-4 h-4" />
            <span className="text-[7px] font-mono font-medium tracking-tight mt-0.5 uppercase">Topo</span>
          </button>

          {/* BUTTON: STEP SCROLL UP */}
          <button
            onMouseDown={() => startContinuousScroll("up")}
            onMouseUp={stopContinuousScroll}
            onMouseLeave={stopContinuousScroll}
            onTouchStart={() => startContinuousScroll("up")}
            onTouchEnd={stopContinuousScroll}
            onClick={() => scrollByAmount(-180, true)}
            className="w-14 h-14 flex flex-col items-center justify-center bg-slate-900/90 hover:bg-indigo-600 text-white rounded-xl border border-slate-800 hover:border-indigo-500 transition hover:scale-105 active:scale-95 shadow-md flex-shrink-0 cursor-pointer"
            title="Subir Página (Segure para rolagem contínua)"
          >
            <ChevronUp className="w-6 h-6 text-indigo-400 hover:text-white" />
            <span className="text-[8px] font-bold text-slate-400">SUBIR</span>
          </button>

          {/* INTERACTIVE TRACK SCROLLBAR BAR */}
          <div className="my-3 py-1 px-1.5 bg-slate-900/60 rounded-xl border border-slate-900 flex items-center justify-center flex-col w-full h-28">
            <div 
              onClick={handleTrackClick}
              className="relative w-3.5 h-full bg-slate-950 hover:bg-slate-900 rounded-full cursor-pointer overflow-hidden border border-slate-800 flex items-start justify-center"
              title="Seletor de posição - Clique para saltar"
            >
              {/* Dynamic scroll indicator handle */}
              <div 
                className="absolute w-full bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full transition-all duration-150"
                style={{ 
                  height: "20%", 
                  top: `${Math.max(0, Math.min(80, scrollProgress * 0.8))}%` 
                }}
              />
            </div>
            <span className="text-[7.5px] font-mono text-slate-500 mt-1.5 font-bold">
              {Math.round(scrollProgress)}%
            </span>
          </div>

          {/* BUTTON: STEP SCROLL DOWN */}
          <button
            onMouseDown={() => startContinuousScroll("down")}
            onMouseUp={stopContinuousScroll}
            onMouseLeave={stopContinuousScroll}
            onTouchStart={() => startContinuousScroll("down")}
            onTouchEnd={stopContinuousScroll}
            onClick={() => scrollByAmount(180, true)}
            className="w-14 h-14 flex flex-col items-center justify-center bg-slate-900/90 hover:bg-indigo-600 text-white rounded-xl border border-slate-800 hover:border-indigo-500 transition hover:scale-105 active:scale-95 shadow-md flex-shrink-0 cursor-pointer"
            title="Descer Página (Segure para rolagem contínua)"
          >
            <span className="text-[8px] font-bold text-slate-400">DESCER</span>
            <ChevronDown className="w-6 h-6 text-indigo-400 hover:text-white" />
          </button>

          {/* BUTTON: END / BOTTOM JUMP */}
          <button
            onClick={() => scrollToPercent(100)}
            className="w-12 h-10 flex flex-col items-center justify-center bg-slate-900/80 hover:bg-indigo-950 text-slate-300 hover:text-indigo-300 border border-slate-800 rounded-xl transition cursor-pointer mt-2 active:bg-indigo-900 active:scale-95"
            title="Ir para o Final"
          >
            <span className="text-[7px] font-mono font-medium tracking-tight mb-0.5 uppercase">Fim</span>
            <ChevronsDown className="w-4 h-4" />
          </button>

          {/* HELP INFO ICON DESCRIPTOR FOR SMART TV CONTROLS */}
          <div className="w-full flex flex-col items-center mt-2.5 pt-2 border-t border-slate-850 text-center">
            <MousePointer className="w-3.5 h-3.5 text-slate-500 hover:text-indigo-400 transition" />
            <span className="text-[6.5px] font-mono text-slate-400 mt-1 uppercase leading-none tracking-tight">
              Tv-Cursor<br/>Compatível
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
