import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown, 
  MousePointer, 
  Sliders,
  EyeOff
} from "lucide-react";

interface TVScrollbarControllerProps {
  /** Optional ID of the specific scrollable element. */
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
  const [isHoldingUp, setIsHoldingUp] = useState(false);
  const [isHoldingDown, setIsHoldingDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Helper inside utility to get current scroll position from all possible scroll layers
  const getScrollMetrics = () => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return { top: 0, maxScroll: 0, progress: 0 };
    }

    const el = document.getElementById(targetId);
    const docEl = document.documentElement;
    const body = document.body;

    // Check if the custom scroll container is active and has scrolling capacity
    if (el && el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
      const top = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const progress = maxScroll > 0 ? (top / maxScroll) * 100 : 0;
      return { top, maxScroll, progress };
    }

    // Default to document body viewport
    const bodyScrollHeight = body ? body.scrollHeight : 0;
    const docScrollHeight = docEl ? docEl.scrollHeight : 0;
    const totalHeight = Math.max(docScrollHeight, bodyScrollHeight, 0);
    const clientHeight = window.innerHeight || (docEl ? docEl.clientHeight : 0) || 0;
    const maxScroll = totalHeight - clientHeight;
    
    const top = window.pageYOffset || window.scrollY || (docEl ? docEl.scrollTop : 0) || (body ? body.scrollTop : 0) || 0;
    const progress = maxScroll > 0 ? (top / maxScroll) * 100 : 0;
    
    return { top, maxScroll, progress };
  };

  // Update percentages based on current document or container coordinates
  const updateScrollProgress = () => {
    const { progress } = getScrollMetrics();
    setScrollProgress(progress);
  };

  // Keep progress perfectly synchronized via scroll events (element and root) and a timer poll
  useEffect(() => {
    const el = document.getElementById(targetId);
    updateScrollProgress();

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

    // Set up a resize observer on target element if available
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateScrollProgress();
      });
      observer.observe(el);
    }

    // High frequency fallback polling (200ms) specifically for TV browsers (Silk/WebOS/Tizen) 
    // that may fail to dispatch scroll events during quick virtual scrolls or spatial remote inputs
    const interval = setInterval(() => {
      updateScrollProgress();
    }, 200);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleScroll);
        document.removeEventListener("scroll", handleScroll);
      }
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
      if (observer && el) {
        observer.unobserve(el);
      }
      clearInterval(interval);
    };
  }, [targetId]);

  // Capture TV Remote Navigation Keys (Arrows + Page Controls)
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a form control or screen/media name editor
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || active.getAttribute("contenteditable") === "true") {
          return;
        }
      }

      const key = e.key;
      const keyCode = e.keyCode;

      // Handle ArrowDown (40), ArrowUp (38), PageDown (34), PageUp (33)
      if (key === "ArrowDown" || keyCode === 40) {
        // Safe programmatic scroll down
        scrollByAmount(60, false);
      } else if (key === "ArrowUp" || keyCode === 38) {
        // Safe programmatic scroll up
        scrollByAmount(-60, false);
      } else if (key === "PageDown" || keyCode === 34) {
        scrollByAmount(350, true);
      } else if (key === "PageUp" || keyCode === 33) {
        scrollByAmount(-350, true);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [targetId]);

  // Ultimate Universal scrollBy helper targeting EVERY layer with triple recovery strategies
  const scrollByAmount = (pxAmount: number, smooth = true) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const el = document.getElementById(targetId);
    const docEl = document.documentElement;
    const body = document.body;

    // A. Element layer
    if (el) {
      try {
        el.scrollTop += pxAmount;
      } catch (err) {}
      try {
        if (typeof el.scrollBy === "function") {
          el.scrollBy(0, pxAmount);
        }
      } catch (err) {}
      try {
        if (typeof el.scrollBy === "function") {
          el.scrollBy({ top: pxAmount, behavior: smooth ? "smooth" : "auto" });
        }
      } catch (err) {}
    }

    // B. Viewport/Document/Body layers
    try {
      window.scrollBy(0, pxAmount);
    } catch (err) {}
    try {
      window.scrollBy({ top: pxAmount, behavior: smooth ? "smooth" : "auto" });
    } catch (err) {}

    try {
      if (docEl) {
        docEl.scrollTop += pxAmount;
        if (typeof docEl.scrollBy === "function") {
          docEl.scrollBy(0, pxAmount);
        }
      }
    } catch (err) {}

    try {
      if (body) {
        body.scrollTop += pxAmount;
        if (typeof body.scrollBy === "function") {
          body.scrollBy(0, pxAmount);
        }
      }
    } catch (err) {}

    // Force an immediate UI status repaint
    updateScrollProgress();
  };

  // Ultimate Universal scrollTo helper targeting EVERY layer with triple recovery strategies
  const scrollToPercent = (percent: number) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const el = document.getElementById(targetId);
    const docEl = document.documentElement;
    const body = document.body;

    // Calculate percent position for element and viewport
    const { maxScroll } = getScrollMetrics();

    // A. Element target calculation
    if (el) {
      const elMax = el.scrollHeight - el.clientHeight;
      const targetTop = (percent / 100) * elMax;
      try {
        el.scrollTop = targetTop;
      } catch (err) {}
      try {
        if (typeof el.scrollTo === "function") {
          el.scrollTo(0, targetTop);
        }
      } catch (err) {}
      try {
        if (typeof el.scrollTo === "function") {
          el.scrollTo({ top: targetTop, behavior: "smooth" });
        }
      } catch (err) {}
    }

    // B. Viewport target calculation
    const bodyScrollHeight = body ? body.scrollHeight : 0;
    const docScrollHeight = docEl ? docEl.scrollHeight : 0;
    const totalHeight = Math.max(docScrollHeight, bodyScrollHeight, 0);
    const clientHeight = window.innerHeight || (docEl ? docEl.clientHeight : 0) || 0;
    const vpMax = totalHeight - clientHeight;
    const vpTargetTop = (percent / 100) * vpMax;

    try {
      window.scrollTo(0, vpTargetTop);
    } catch (err) {}
    try {
      window.scrollTo({ top: vpTargetTop, behavior: "smooth" });
    } catch (err) {}

    try {
      if (docEl) {
        docEl.scrollTop = vpTargetTop;
        if (typeof docEl.scrollTo === "function") {
          docEl.scrollTo(0, vpTargetTop);
        }
      }
    } catch (err) {}

    try {
      if (body) {
        body.scrollTop = vpTargetTop;
        if (typeof body.scrollTo === "function") {
          body.scrollTo(0, vpTargetTop);
        }
      }
    } catch (err) {}

    // Force an immediate UI status repaint
    updateScrollProgress();
  };

  // Continuous hold logic for remote click-and-hold actions
  const startContinuousScroll = (direction: "up" | "down") => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }

    if (direction === "up") {
      setIsHoldingUp(true);
    } else {
      setIsHoldingDown(true);
    }

    const speed = direction === "up" ? -35 : 35;
    scrollByAmount(speed * 1.5, false);

    const startTime = Date.now();
    holdIntervalRef.current = setInterval(() => {
      // Safety auto-stop limit after 2.5 seconds to prevent runaway scrolling on bugged TV browsers
      if (Date.now() - startTime > 2500) {
        setIsHoldingUp(false);
        setIsHoldingDown(false);
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        return;
      }
      scrollByAmount(speed, false);
    }, 40);
  };

  const stopContinuousScroll = () => {
    setIsHoldingUp(false);
    setIsHoldingDown(false);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  // Jump to specific track vertical coordinate
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (clickY / rect.height) * 100));
    scrollToPercent(percentage);
  };

  // Drag handles for mouse/touch-drag interactions on the scroll feedback handle
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    // Prevent default screen panning on mobile while dragging scroll
    if (e.cancelable) {
      e.preventDefault();
    }
    handleDragMove(e);
  };

  const handleDragMove = (e: any) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    let clientY = 0;
    if (e.touches && e.touches[0]) {
      clientY = e.touches[0].clientY;
    } else if (e.clientY !== undefined) {
      clientY = e.clientY;
    } else {
      return;
    }
    const relativeY = clientY - rect.top;
    const pct = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));
    scrollToPercent(pct);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      handleDragMove(e);
    };

    const handleGlobalUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleGlobalMove, { passive: true });
    window.addEventListener("mouseup", handleGlobalUp, { passive: true });
    window.addEventListener("touchmove", handleGlobalMove, { passive: false });
    window.addEventListener("touchend", handleGlobalUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [isDragging]);

  return (
    <div 
      id="tv-scrollbar-interactive-controller"
      className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-[99] flex items-center gap-2 select-none"
    >
      {/* Mini Toggle / Restore button when collapsed */}
      {!isVisible && (
        <button
          onClick={() => {
            setIsVisible(true);
            // Flash update on maximize
            setTimeout(updateScrollProgress, 100);
          }}
          className="flex items-center justify-center w-12 h-12 bg-indigo-650 hover:bg-indigo-700 active:scale-95 text-white border-2 border-indigo-500 rounded-full shadow-2xl transition hover:scale-110 cursor-pointer"
          title="Exibir Painel de Rolagem da TV"
        >
          <Sliders className="w-5 h-5 animate-pulse" />
        </button>
      )}

      {/* Primary Scroll Panel Container */}
      {isVisible && (
        <div className="flex flex-col items-center justify-between w-18 md:w-22 bg-slate-950/95 border-2 border-slate-800 p-2.5 rounded-3xl shadow-2xl backdrop-blur-md">
          
          {/* Header Title & Minimizer */}
          <div className="w-full flex flex-col items-center gap-0.5 border-b border-slate-900 pb-2 mb-2 text-center">
            <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest font-mono">
              Rolagem
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-500 hover:text-red-400 p-1 hover:bg-slate-900 rounded-lg transition"
              title="Ocultar Painel"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          {/* BTN: TOP SPEED */}
          <button
            onClick={() => scrollToPercent(0)}
            className="w-12 h-11 flex flex-col items-center justify-center bg-slate-900/90 hover:bg-indigo-950 text-slate-300 hover:text-indigo-400 border border-slate-850 rounded-xl transition cursor-pointer mb-2.5 active:bg-indigo-900 active:scale-95 shadow-sm"
            title="Ir para o Início"
          >
            <ChevronsUp className="w-4 h-4 text-indigo-400" />
            <span className="text-[7.5px] font-mono font-bold tracking-tight mt-0.5 uppercase">Topo</span>
          </button>

          {/* BTN: STEP SCROLL UP */}
          <button
            onMouseDown={() => startContinuousScroll("up")}
            onMouseUp={stopContinuousScroll}
            onMouseLeave={stopContinuousScroll}
            onTouchStart={() => startContinuousScroll("up")}
            onTouchEnd={stopContinuousScroll}
            onClick={() => scrollByAmount(-180, true)}
            className={`w-14 h-14 flex flex-col items-center justify-center rounded-xl border transition shadow-md cursor-pointer ${
              isHoldingUp 
                ? "bg-indigo-650 border-indigo-400 text-white scale-105" 
                : "bg-slate-900 border-slate-800 hover:bg-indigo-900/80 hover:border-indigo-500 text-slate-300 hover:text-white"
            }`}
            title="Subir (Dica: Segure para rolar rápido)"
          >
            <ChevronUp className="w-6 h-6 text-indigo-400 hover:text-white" />
            <span className="text-[8.5px] font-extrabold tracking-tight">SUBIR</span>
          </button>

          {/* INTERACTIVE TRACK WITH CLICK & DRAG HANDLE */}
          <div className="my-3.5 py-2 px-1.5 bg-slate-900/60 rounded-xl border border-slate-900/60 flex items-center justify-center flex-col w-full h-32">
            <div 
              ref={trackRef}
              onClick={handleTrackClick}
              className="relative w-4 h-full bg-slate-950 hover:bg-slate-900 rounded-full cursor-pointer overflow-hidden border border-slate-850 flex items-start justify-center"
              title="Clique ou arraste para rolar"
            >
              {/* Scroll thumb indicator */}
              <div 
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className={`absolute w-full bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-75 cursor-ns-resize shadow-md ${
                  isDragging ? "brightness-125 border border-indigo-300" : ""
                }`}
                style={{ 
                  height: "22%", 
                  top: `${Math.max(0, Math.min(78, scrollProgress * 0.78))}%` 
                }}
              />
            </div>
            <span className="text-[8px] font-mono text-slate-400 mt-2 font-bold bg-slate-950/80 px-1 py-0.2 rounded">
              {Math.round(scrollProgress)}%
            </span>
          </div>

          {/* BTN: STEP SCROLL DOWN */}
          <button
            onMouseDown={() => startContinuousScroll("down")}
            onMouseUp={stopContinuousScroll}
            onMouseLeave={stopContinuousScroll}
            onTouchStart={() => startContinuousScroll("down")}
            onTouchEnd={stopContinuousScroll}
            onClick={() => scrollByAmount(180, true)}
            className={`w-14 h-14 flex flex-col items-center justify-center rounded-xl border transition shadow-md cursor-pointer ${
              isHoldingDown 
                ? "bg-indigo-650 border-indigo-400 text-white scale-105" 
                : "bg-slate-900 border-slate-800 hover:bg-indigo-900/80 hover:border-indigo-500 text-slate-300 hover:text-white"
            }`}
            title="Descer (Dica: Segure para rolar rápido)"
          >
            <span className="text-[8.5px] font-extrabold tracking-tight">DESCER</span>
            <ChevronDown className="w-6 h-6 text-indigo-400 hover:text-white" />
          </button>

          {/* BTN: BOTTOM SPEED */}
          <button
            onClick={() => scrollToPercent(100)}
            className="w-12 h-11 flex flex-col items-center justify-center bg-slate-900/90 hover:bg-indigo-950 text-slate-300 hover:text-indigo-400 border border-slate-850 rounded-xl transition cursor-pointer mt-2.5 active:bg-indigo-900 active:scale-95 shadow-sm"
            title="Ir para o Final"
          >
            <span className="text-[7.5px] font-mono font-bold tracking-tight mb-0.5 uppercase">Fim</span>
            <ChevronsDown className="w-4 h-4 text-indigo-400" />
          </button>

          {/* HELP COMPATIBILITY STAMP */}
          <div className="w-full flex flex-col items-center mt-3 pt-2 border-t border-slate-900 text-center">
            <MousePointer className="w-4 h-4 text-slate-500" />
            <span className="text-[6.5px] font-bold font-mono text-slate-500 mt-1 uppercase leading-none tracking-tight">
              Tv-Cursor<br/>Compatível
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
