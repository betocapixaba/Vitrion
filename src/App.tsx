/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import MediaManager from './components/MediaManager';
import PlaylistManager from './components/PlaylistManager';
import ScreenManager from './components/ScreenManager';
import TVPlayer from './components/TVPlayer';
import ClientRegistry from './components/ClientRegistry';
import ClientPortal from './components/ClientPortal';
import PlanManager from './components/PlanManager';
import ClientSelfRegistration from './components/ClientSelfRegistration';
import { Client } from './types';
import { 
  Tv, Layers, LogOut, ShieldCheck, HelpCircle, Eye,
  Loader2, BadgeHelp, CheckCircle2, UserCheck, LayoutGrid, 
  Menu, Info, ExternalLink, Monitor, Key, User as UserIcon,
  ShieldAlert, Sparkles, EyeOff, DollarSign
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  
  // App initialization states
  const [showSplash, setShowSplash] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Displays counters state for "Sincronizador Múltiplo de Displays"
  const [totalDisplays, setTotalDisplays] = useState(0);
  const [activeDisplays, setActiveDisplays] = useState(0);

  // Synchronized Displays dynamic listeners for administrator dashboard
  useEffect(() => {
    if (!user) return;
    const screensCol = collection(db, 'screens');
    const unsubscribe = onSnapshot(screensCol, (snapshot) => {
      let total = 0;
      let active = 0;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        total++;
        if (d.status === 'online') {
          active++;
        }
      });
      setTotalDisplays(total);
      setActiveDisplays(active);
    }, (err) => {
      console.warn("Error streaming screens for global synchronization counter:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const [appMode, setAppMode] = useState<'admin' | 'player'>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('mode') === 'player' || p.get('player') === 'true') {
        return 'player';
      }
    }
    return 'admin';
  });
  const [activeTab, setActiveTab] = useState<'screens' | 'media' | 'playlists' | 'clients' | 'plans'>('screens');

  // Splash screen timeout loop running for 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Client and Unified authentication states
  const [loggedClient, setLoggedClient] = useState<Client | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vitrion_logged_client');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const [loginTab, setLoginTab] = useState<'client' | 'admin'>('client');
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientLoggingIn, setClientLoggingIn] = useState(false);
  const [clientLoginError, setClientLoginError] = useState('');

  const [isSandboxAdmin, setIsSandboxAdmin] = useState(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsSandboxAdmin(false);
      } else {
        // If we are currently in a custom local sandbox admin session, don't clear it
        setUser((curr: any) => {
          if (curr && curr.isSandbox) return curr;
          return null;
        });
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [isSandboxAdmin]);

  // Login handler
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setAuthError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Falha ao autenticar com Google: ', err);
      setAuthError(
        'O navegador bloqueou ou restringiu o pop-up ou cookies devido ao ambiente integrado (iframe) do AI Studio. Clique no botão de "Acesso Rápido" abaixo para usar instantaneamente, ou abra em uma Nova Guia para sintonizar a sua Conta do Google real.'
      );
    }
  };

  // Safe login for sandboxed environments
  const handleAnonymousLogin = async () => {
    setAuthError('');
    try {
      await signInAnonymously(auth);
      setIsSandboxAdmin(false);
    } catch (err: any) {
      console.warn('Falha no login anônimo nativo. Usando bypass seguro do sandbox de demonstração:', err);
      // Fallback for sandboxed developer settings (when Anonymous Sign-in is disabled in Firebase Console)
      setIsSandboxAdmin(true);
      setUser({
        uid: 'vitrion-sandbox-admin',
        email: 'gestor@vitrionsmartdisplay.com',
        displayName: 'Administrador (Sandbox)',
        isSandbox: true,
        emailVerified: true
      });
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      setIsSandboxAdmin(false);
      setUser(null);
      await signOut(auth);
      setAppMode('admin');
    } catch (err) {
      console.error('Erro ao encerrar sessão: ', err);
    }
  };

  // Client logout handler
  const handleClientLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vitrion_logged_client');
    }
    setLoggedClient(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Erro ao deslogar cliente: ', err);
    }
    setAppMode('admin');
  };

  // Client login submit handler
  const handleClientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientLoginError('');
    setClientLoggingIn(true);

    try {
      // Query Firestore clients collection directly for matches on username
      const q = query(
        collection(db, 'clients'),
        where('username', '==', clientUsername.trim())
      );
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setClientLoginError('Usuário não cadastrado nesta rede. Contate seu administrador.');
        setClientLoggingIn(false);
        return;
      }

      let matchedClient: Client | null = null;
      querySnap.forEach((docSnap) => {
        const data = docSnap.data() as Client;
        if (data.password === clientPassword) {
          matchedClient = { id: docSnap.id, ...data };
        }
      });

      if (!matchedClient) {
        setClientLoginError('Senha de acesso incorreta para este estabelecimento.');
        setClientLoggingIn(false);
        return;
      }

      // Save to state and localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('vitrion_logged_client', JSON.stringify(matchedClient));
      }
      setLoggedClient(matchedClient);
      setClientLoggingIn(false);

    } catch (err: any) {
      console.error('Erro no login do cliente: ', err);
      setClientLoginError('Falha temporária ao comunicar com o servidor de autenticação.');
      setClientLoggingIn(false);
    }
  };

  // 3-second immersive startup screen with high-fidelity brand logomark and tagline as requested
  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
        {/* Ambient Grid Backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.14),rgba(255,255,255,0))]" />
        
        {/* Floating Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

        {/* Animated Brand Content */}
        <div className="relative z-10 text-center flex flex-col items-center max-w-lg space-y-7 animate-fade-in">
          
          {/* Stunning SVG reproduction of Vitrion glowing display icon/logo */}
          <div className="relative w-40 h-40 filter drop-shadow-[0_0_25px_rgba(99,102,241,0.3)] animate-pulse" style={{ animationDuration: '2.5s' }}>
            <svg viewBox="0 0 500 500" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Left Dark Structural Path */}
              <path 
                d="M170 120 L240 330 L320 330 L195 120 Z" 
                fill="#1e293b" 
                stroke="#334155" 
                strokeWidth="6"
                strokeLinejoin="round"
              />
              <path 
                d="M170 120 L240 330 L275 330 L210 120 Z" 
                fill="#0f172a" 
                opacity="0.85"
              />
              
              {/* Glowing Right Panel Screen Frame */}
              <g filter="url(#glow-filter-splash)">
                <rect 
                  x="260" 
                  y="120" 
                  width="110" 
                  height="210" 
                  rx="16" 
                  transform="skewX(-16) rotate(-5 260 120)" 
                  fill="url(#screen-gradient-splash)" 
                  stroke="url(#border-gradient-splash)"
                  strokeWidth="5"
                  opacity="0.95"
                />
                {/* Simulated highlight line inside tablet glass */}
                <path 
                  d="M310 125 L245 320 M330 125 L265 320" 
                  stroke="white" 
                  strokeWidth="1.5"
                  opacity="0.15" 
                  strokeLinecap="round"
                />
              </g>

              {/* Definitions */}
              <defs>
                <linearGradient id="screen-gradient-splash" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="border-gradient-splash" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <filter id="glow-filter-splash" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#06b6d4" floodOpacity="0.45" />
                </filter>
              </defs>
            </svg>
          </div>

          {/* Typography Pairings matching VITRION SMART DISPLAY */}
          <div className="space-y-1 select-none">
            <h1 className="text-4xl font-extrabold tracking-[0.22em] text-white flex items-center justify-center">
              VITRI
              <span className="text-cyan-400 relative">
                O<span className="absolute -bottom-1 left-0.5 w-[90%] h-1 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-sm skew-x-12" />
              </span>
              N
            </h1>
            <p className="text-xs font-semibold tracking-[0.58em] text-indigo-400 uppercase font-mono">
              Smart Display
            </p>
          </div>

          {/* Separation Accent Line */}
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          {/* Bold, highlighted slogan sentence requested by the user */}
          <div className="px-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md">
            <p className="text-xs sm:text-xs font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-cyan-300 font-sans leading-relaxed">
              "SUA VITRINE DIGITAL INTELIGENTE E CONECTADA EM TEMPO REAL"
            </p>
          </div>

          {/* Gentle loading spinner */}
          <div className="flex items-center gap-2 pt-3 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Sincronizando Painel...</span>
          </div>

        </div>
      </div>
    );
  }

  // Show Loading while checking session status
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-xs tracking-widest uppercase font-mono text-slate-500">Iniciando Sintonizadores...</p>
      </div>
    );
  }

  // Render Client Portal if a client establishment is logged in
  if (loggedClient) {
    return (
      <ClientPortal client={loggedClient} onLogout={handleClientLogout} />
    );
  }

  // 1. RENDER TV PLAYER MODE DIRECTLY (No Auth Needed)
  if (appMode === 'player') {
    return (
      <div className="relative">
        <TVPlayer />
        
        {/* Helper visual link to return to login if user is testing and doesn't know how to go back */}
        <button
          onClick={() => setAppMode('admin')}
          className="absolute bottom-4 right-4 z-50 bg-slate-900/80 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white backdrop-blur-xs px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition duration-200 shadow-lg cursor-pointer"
        >
          Voltar ao Painel
        </button>
      </div>
    );
  }

  // Helper gate for unauthenticated users (Admins or Clients)
  if (appMode === 'admin' && !user && !loggedClient) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative z-10 text-white">
          
          {/* Header banner */}
          <div className="p-6 pb-2 text-center space-y-3">
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400 select-none">
              <Tv className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Acesse sua Conta</h1>
              <p className="text-xs text-slate-400 mt-1">Monitore e controle mídias e telas de TV em tempo real</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="px-6 pb-1">
            <div className="flex bg-slate-955/80 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => {
                  setLoginTab('client');
                  setClientLoginError('');
                }}
                className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === 'client'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Cliente
              </button>
              <button
                onClick={() => {
                  setLoginTab('admin');
                  setClientLoginError('');
                }}
                className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrador
              </button>
            </div>
          </div>

          <div className="p-6 pt-4">
            {loginTab === 'client' ? (
              /* CLIENT LOGIN FORM */
              <form onSubmit={handleClientLoginSubmit} className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Identifique o seu estabelecimento para gerenciar seus displays de TVs e associar seus produtos promocionais.
                </p>

                {/* Username Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nome de Usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={clientUsername}
                      onChange={(e) => setClientUsername(e.target.value)}
                      placeholder="Digite seu usuário (Ex: alvoradapdv)"
                      className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type={showClientPassword ? 'text' : 'password'}
                      required
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      placeholder="Ex: ••••••••"
                      className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientPassword(!showClientPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Client Login Error feedback */}
                {clientLoginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in shadow-xs">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <p className="leading-snug">{clientLoginError}</p>
                  </div>
                )}

                {/* Button Client Submit */}
                <button
                  type="submit"
                  disabled={clientLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition duration-200 cursor-pointer"
                >
                  {clientLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sintonizando Conta...</span>
                    </>
                  ) : (
                    <span>Entrar no Painel do Cliente</span>
                  )}
                </button>

                {/* Self-registration redirect URL requested by user */}
                <div className="pt-3 border-t border-white/5 text-center">
                  <p className="text-[11px] text-slate-405">
                    Ainda não possui cadastro?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-extrabold hover:underline transition duration-150 cursor-pointer"
                    >
                      Crie sua conta aqui &rarr;
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              /* ADMINISTRATOR AUTH BLOCK */
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Espaço exclusivo para gestores da rede. Monitore e configure todas as TVs, mídias corporativas e campanhas globais.
                </p>

                <div className="space-y-3 py-1">
                  {/* Google Login */}
                  <button
                    onClick={handleGoogleLogin}
                    id="btn-google-login"
                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-2.5 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.14 3.06-2.91 4.19v3.47h4.7c2.75-2.53 4.34-6.26 4.34-10.27l-.005-.72z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.7-3.47c-1.3.87-2.97 1.39-4.7 1.39-3.62 0-6.68-2.45-7.77-5.74H.32v3.58C2.3 20.83 6.88 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M4.23 13.27a7.185 7.185 0 0 1 0-4.54V5.15H.32a11.97 11.97 0 0 0 0 10.7l3.91-3.58z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.15 15.24 0 12 0 6.88 0 2.3 3.17.32 7.15l3.91 3.58c1.09-3.29 4.15-5.74 7.77-5.74z"
                      />
                    </svg>
                    Acessar com Conta Google
                  </button>
                </div>

                {/* Google login sandboxing exception notice */}
                {authError && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl text-xs space-y-2 mt-2 text-left animate-fade-in shadow-md">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase text-[10px] tracking-wider">
                      <span>💡 Restrição de iFrame Detectada</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-300">{authError}</p>
                    <div className="pt-1 border-t border-white/5 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-medium">
                      <span>Sugestão:</span>
                      <a
                        href={typeof window !== 'undefined' ? window.location.href : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                      >
                        Abrir em Nova Aba <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Link to TV Player */}
            <div className="pt-4 border-t border-white/5 text-center space-y-1.5">
              <p className="text-[10px] text-slate-500">Deseja parear ou sintonizar uma tela de TV neste ambiente?</p>
              <button
                onClick={() => setAppMode('player')}
                className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 hover:underline cursor-pointer font-semibold mx-auto"
              >
                <Monitor className="w-3.5 h-3.5" />
                Iniciar Reprodutor de Tela (Modo TV Player) &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Self-registration form popup overlay */}
        {isRegisterOpen && (
          <ClientSelfRegistration
            onClose={() => setIsRegisterOpen(false)}
            onSuccess={(registeredUser) => {
              setClientUsername(registeredUser);
              setClientPassword(''); // clear password box
              setLoginTab('client');
              setIsRegisterOpen(false);
            }}
          />
        )}

        {/* Global Footer info requested by user */}
        <footer className="mt-8 text-center select-none text-[11px] text-slate-500 font-medium tracking-wide z-10 relative">
          Vitrion Smart Display ©2026
        </footer>
      </div>
    );
  }

  // 3. ADMIN DASHBOARD (Authenticated)
  return (
    <div className="flex h-screen w-screen bg-slate-55 overflow-hidden font-sans text-slate-600">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 hidden md:flex border-r border-slate-800 select-none">
        
        <div className="p-6 pb-4 flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight block">Vitrion Smart Display</span>
            <span className="text-[10px] text-indigo-400 block uppercase font-bold">Painel Controle</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-1">
          <button
            onClick={() => setActiveTab('screens')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'screens'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <Tv className="w-4 h-4 shrink-0" />
            <span className="text-sm">Telas e Monitores</span>
          </button>
          
          <button
            onClick={() => setActiveTab('media')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'media'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="text-sm">Biblioteca Mídias</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'playlists'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="text-sm">Grade de Playlists</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            id="nav-tab-clients"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'clients'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span className="text-sm">Clientes</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            id="nav-tab-plans"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'plans'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="text-sm">Configurar Planos</span>
          </button>
        </nav>

        {/* User Profile Footer */}
        <div className="p-6 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Operador'} 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.displayName ? user.displayName.charAt(0) : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-white font-semibold truncate leading-none">{user?.displayName || 'Gestor'}</p>
              <p className="text-[9px] text-slate-500 truncate mt-1">Sessão Comercial Ativa</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-755 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Panel Content Container */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Mobile Navbar */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 py-3.5 px-4 flex items-center justify-between z-10 sticky top-0 shrink-0 select-none">
          <div className="flex items-center gap-2 text-left">
            <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-tight">Vitrion</span>
          </div>

          <div className="flex items-center gap-3">
            {user?.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Admin'} 
                referrerPolicy="no-referrer"
                className="w-6.5 h-6.5 rounded-full border border-slate-700 font-sans"
              />
            )}
            <button
              onClick={handleSignOut}
              className="p-1 text-red-400"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Route Tabs Controller */}
        <div className="md:hidden flex items-center bg-white border-b border-slate-200 px-2 py-0.5 gap-1 sticky top-0 z-10 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('screens')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
              activeTab === 'screens' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            Telas
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
              activeTab === 'media' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            Biblioteca
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
              activeTab === 'playlists' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            Playlists
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
              activeTab === 'clients' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            Clientes
          </button>
        </div>

        {/* Desktop Header Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-8 shrink-0 select-none">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-slate-800">
              {activeTab === 'screens' && 'Central de Distribuição de Monitores'}
              {activeTab === 'media' && 'Biblioteca de Arquivos e Quadros Digitais'}
              {activeTab === 'playlists' && 'Compilador de Sequências de Rodízio'}
              {activeTab === 'clients' && 'Registro e CRM de Estabelecimentos Associados'}
              {activeTab === 'plans' && 'Gestão Tarifária e Planos de Assinatura'}
            </h1>
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            <div className="flex gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200/40 flex items-center gap-1 leading-none select-none">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                Firebase Realtime
              </span>

              {/* Sincronizador Múltiplo de Displays requested by user */}
              <div className="px-3 py-1 bg-gradient-to-r from-slate-900 to-slate-950 text-slate-100 border border-slate-800 rounded-lg flex items-center gap-2 select-none shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeDisplays > 0 ? 'bg-cyan-400' : 'bg-slate-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${activeDisplays > 0 ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
                  </span>
                  <span className="text-[9.5px] uppercase font-mono tracking-wider text-indigo-400 font-extrabold">Sincronizador Múltiplo de Displays</span>
                </div>
                <div className="h-3.5 w-px bg-white/10" />
                <span className="text-[10.5px] font-extrabold text-slate-200 font-mono">
                  {activeDisplays} <span className="text-[9.5px] text-slate-400 font-normal">em funcionamento</span> <span className="text-indigo-400">/</span> {totalDisplays} <span className="text-[9.5px] text-slate-400 font-normal font-sans">total</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Open a helper guide instructing testing
                alert("Dica de Teste:\n1. Clique em 'Sair do Painel' para voltar à tela principal.\n2. No rodapé da tela de login, clique em 'Iniciar Reprodutor de Tela (Modo TV Player)'.\n3. Anote o código de pareamento de 4 dígitos gerado na tela virtual.\n4. Volte ao login, entre no painel administrativo e registre esse código em 'Parear Nova Tela'.\n5. Pronto! O monitor virtual sintonizará e trocará mídias em tempo real.");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-550 hover:text-slate-800 text-[11px] font-semibold bg-white hover:bg-slate-50 rounded-lg transition"
            >
              <BadgeHelp className="w-3.5 h-3.5" />
              Guia de Simulação
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
          <div className="max-w-7xl mx-auto w-full space-y-4">
            {activeTab === 'screens' && <ScreenManager />}
            {activeTab === 'media' && <MediaManager />}
            {activeTab === 'playlists' && <PlaylistManager />}
            {activeTab === 'clients' && <ClientRegistry />}
            {activeTab === 'plans' && <PlanManager />}
          </div>
          
          {/* Global Footer info requested by user */}
          <footer className="mt-12 pt-4 border-t border-slate-200 text-center select-none text-[11px] text-slate-400 font-medium tracking-wide">
            Vitrion Smart Display ©2026
          </footer>
        </div>

      </div>
    </div>
  );
}
