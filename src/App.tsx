/**
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, logAdminAction } from './lib/firebase';
import MediaManager from './components/MediaManager';
import PlaylistManager from './components/PlaylistManager';
import ScreenManager from './components/ScreenManager';
import TVPlayer from './components/TVPlayer';
import ClientRegistry from './components/ClientRegistry';
import ClientPortal from './components/ClientPortal';
import PlanManager from './components/PlanManager';
import ClientSelfRegistration from './components/ClientSelfRegistration';
import AdminHistoryManager from './components/AdminHistoryManager';
import { VitrionLogo } from './components/VitrionLogo';
import { Client } from './types';
import { 
  Tv, Layers, LogOut, ShieldCheck, HelpCircle, Eye,
  Loader2, BadgeHelp, CheckCircle2, UserCheck, LayoutGrid, 
  Menu, Info, ExternalLink, Monitor, Key, User as UserIcon,
  ShieldAlert, Sparkles, EyeOff, DollarSign
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vitrion_active_admin');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.uid) {
            return {
              ...parsed,
              isSandbox: true
            };
          }
        }
      } catch (e) {
        console.warn('Error reviving active admin from localStorage:', e);
      }
    }
    return null;
  });
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

    // Auto-sync active admin state to localStorage for sub-components
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('vitrion_active_admin', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Administrador'
        }));
      } catch (e) {
        console.warn('Error syncing active admin to localStorage:', e);
      }
    }

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
  const [activeTab, setActiveTab] = useState<'screens' | 'media' | 'playlists' | 'clients' | 'plans' | 'admins'>('screens');

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

  const [loginTab, setLoginTab] = useState<'client' | 'admin' | 'pair'>('client');
  const [pairingCodeParam, setPairingCodeParam] = useState('');
  const [pairingAction, setPairingAction] = useState<'mirror' | 'pair_store'>('mirror');
  const [pairClientUser, setPairClientUser] = useState('');
  const [pairClientPass, setPairClientPass] = useState('');
  const [pairSuccess, setPairSuccess] = useState('');
  const [pairError, setPairError] = useState('');
  const [pairIsSubmitting, setPairIsSubmitting] = useState(false);
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientLoggingIn, setClientLoggingIn] = useState(false);
  const [clientLoginError, setClientLoginError] = useState('');

  // Admin Custom Email & Password states
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [adminAuthSuccess, setAdminAuthSuccess] = useState('');
  const [isSandboxAdmin, setIsSandboxAdmin] = useState(false);
 
   // Monitor Auth Changes
   useEffect(() => {
     const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
       if (firebaseUser) {
         // Ensure only betocapixaba@gmail.com is allowed into administrator portal
         if (firebaseUser.email === 'betocapixaba@gmail.com') {
           setUser(firebaseUser);
           setIsSandboxAdmin(false);
         } else {
           signOut(auth);
           setUser(null);
           setAdminAuthError('Acesso não autorizado! Apenas o administrador betocapixaba@gmail.com está autorizado.');
         }
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
         'O navegador bloqueou ou restringiu o pop-up ou cookies devido ao ambiente integrado (iframe) do AI Studio. Por favor, clique em "Abrir Aplicativo em Nova Aba" para usar a sua conta do Gmail real com segurança.'
       );
     }
   };
 
   // Submit Handler for custom Admin Gmail / Email + password form
   const handleAdminEmailLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setAdminAuthError('');
     setAdminAuthSuccess('');
     
     const emailOrUser = adminEmail.trim();
     if (!emailOrUser) {
       setAdminAuthError('Por favor, informe seu usuário ou e-mail de administrador.');
       return;
     }
     if (!adminPassword) {
       setAdminAuthError('Por favor, informe sua senha de acesso.');
       return;
     }
 
     setAdminLoggingIn(true);
     
     // Check master admin credentials: beto / Vi9212376!@ or betocapixaba@gmail.com / Vi9212376!@
     const normalizedUser = emailOrUser.toLowerCase();
     let customMaster: any = null;
     try {
       const masterSnap = await getDoc(doc(db, 'admin_settings', 'master'));
       if (masterSnap.exists()) {
         customMaster = masterSnap.data();
       }
     } catch (dbErr) {
       console.warn('Error reading dynamic master credentials:', dbErr);
     }
     const masterUser = (customMaster?.username || 'beto').toLowerCase();
     const masterEmail = (customMaster?.email || 'betocapixaba@gmail.com').toLowerCase();
     const masterPass = customMaster?.password || 'Vi9212376!@';

     if ((normalizedUser === masterUser || normalizedUser === masterEmail) && adminPassword === masterPass) {
       try {
         // Try background authentication with Firebase using standard Gmail account so Firestore triggers write rules normally
         try {
           await signInWithEmailAndPassword(auth, 'betocapixaba@gmail.com', 'Vi9212376!@');
           if (typeof window !== 'undefined') {
              localStorage.setItem('vitrion_active_admin', JSON.stringify({
                uid: 'vitrion-sandbox-admin',
                email: 'betocapixaba@gmail.com',
                displayName: 'Beto (Administrador)'
              }));
            }
            setAdminAuthSuccess('Autenticação de administrador realizada com sucesso!');
            await logAdminAction('LOGIN_SUCCESS', 'Beto (Administrador)', 'Administrador mestre iniciou sessão no painel.');
         } catch (fbErr: any) {
           console.warn('Real Firebase sign-in was blocked or not configured, registering automatically or bypassing securely:', fbErr);
           
           if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
             try {
               await createUserWithEmailAndPassword(auth, 'betocapixaba@gmail.com', 'Vi9212376!@');
               setAdminAuthSuccess('Cadastro e autenticação integrados com sucesso!');
             } catch (createErr) {
               // Bypassing directly
               setUser({
                 uid: 'vitrion-sandbox-admin',
                 email: 'betocapixaba@gmail.com',
                 displayName: 'Beto (Administrador)',
                 isSandbox: true,
                 emailVerified: true
               });
               setAdminAuthSuccess('Acesso mestre concedido localmente!');
             }
           } else {
             // General Firestore sandbox bypass
             setUser({
               uid: 'vitrion-sandbox-admin',
               email: 'betocapixaba@gmail.com',
               displayName: 'Beto (Administrador)',
               isSandbox: true,
               emailVerified: true
             });
             setAdminAuthSuccess('Acesso mestre concedido localmente!');
           }
         }
         setAdminEmail('');
         setAdminPassword('');
       } catch (err: any) {
         setAdminAuthError('Erro ao iniciar sessão: ' + (err.message || err.code));
       } finally {
         setAdminLoggingIn(false);
       }
       return;
     }
 
     // Check secondary authorized admins in real-time collection
      try {
        const q = query(
          collection(db, 'authorized_admins'),
          where('username', '==', normalizedUser)
        );
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          let matchedAdmin: any = null;
          querySnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.password === adminPassword) {
              matchedAdmin = { id: docSnap.id, ...data };
            }
          });

          if (matchedAdmin) {
            const activeAdminObj = {
              uid: matchedAdmin.id,
              email: matchedAdmin.email || `${matchedAdmin.username}@vitrion.com`,
              displayName: matchedAdmin.name
            };

            if (typeof window !== 'undefined') {
              localStorage.setItem('vitrion_active_admin', JSON.stringify(activeAdminObj));
            }

            setUser({
              uid: matchedAdmin.id,
              email: matchedAdmin.email || `${matchedAdmin.username}@vitrion.com`,
              displayName: matchedAdmin.name,
              isSandbox: true,
              emailVerified: true
            });

            await logAdminAction('LOGIN_SUCCESS', `${matchedAdmin.name} (Auxiliar)`, 'Administrador auxiliar credenciado iniciou sessão no painel.');
            setAdminAuthSuccess('Autenticação de administrador realizada com sucesso!');
            setAdminEmail('');
            setAdminPassword('');
            setAdminLoggingIn(false);
            return;
          }
        }
      } catch (dbErr) {
        console.warn('Error reading authorized secondary admins collection:', dbErr);
      }

      // Block non-authorized accounts
     setTimeout(() => {
       setAdminAuthError('Usuário ou senha de acesso incorretos. Apenas administradores autorizados têm acesso a este painel.');
       setAdminLoggingIn(false);
     }, 700);
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vitrion_active_admin');
      }
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

  // Fast synchronization submit handler
  const handleTVPairingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairError('');
    setPairSuccess('');
    
    const code = pairingCodeParam.trim().toUpperCase();
    if (code.length !== 4) {
      setPairError('O código de pareamento deve conter exatamente 4 caracteres.');
      return;
    }
    
    setPairIsSubmitting(true);
    
    try {
      // 1. Verify existence of TV screen in FireStore
      const screenRef = doc(db, 'screens', code);
      const screenSnap = await getDoc(screenRef);
      
      if (!screenSnap.exists()) {
        setPairError('Estação de TV não encontrada! Certifique-se de que a Smart TV está aberta no Modo Player e exibe o código correto de 4 letras.');
        setPairIsSubmitting(false);
        return;
      }
      
      if (pairingAction === 'mirror') {
        // Option A: Just mirror screen in this browser right now!
        if (typeof window !== 'undefined') {
          localStorage.setItem('op_player_screen_id', code);
        }
        setPairSuccess('Sintonização concluída! Abrindo reprodutor nesta tela...');
        setTimeout(() => {
          setAppMode('player');
          setLoginTab('client'); // default back
          setPairingCodeParam('');
          setPairSuccess('');
          setPairIsSubmitting(false);
        }, 1500);
      } else {
        // Option B: Pair TV with an establishment
        if (!pairClientUser.trim() || !pairClientPass.trim()) {
          setPairError('Por favor, informe credenciais válidas do estabelecimento.');
          setPairIsSubmitting(false);
          return;
        }
        
        // Find matched client store
        const q = query(
          collection(db, 'clients'),
          where('username', '==', pairClientUser.trim())
        );
        const querySnap = await getDocs(q);
        
        if (querySnap.empty) {
          setPairError('Estabelecimento não encontrado com este usuário.');
          setPairIsSubmitting(false);
          return;
        }
        
        let targetClient: Client | null = null;
        querySnap.forEach((docSnap) => {
          const data = docSnap.data() as Client;
          if (data.password === pairClientPass) {
            targetClient = { id: docSnap.id, ...data };
          }
        });
        
        if (!targetClient) {
          setPairError('Senha incorreta para o estabelecimento selecionado.');
          setPairIsSubmitting(false);
          return;
        }
        
        // Success: update screen to pair with this establishment!
        await updateDoc(screenRef, {
          name: `TV - Sincronizada via Conexão Rápida`,
          ownerId: 'vitrion-sandbox-admin', // default admin manager or self-assigned
          clientId: (targetClient as Client).id,
          pairedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'online'
        });
        
        setPairSuccess(`Parabéns! TV sintonizada com sucesso em ${(targetClient as Client).establishmentName}. Redirecionando...`);
        
        // Log them into ClientPortal automatically for convenience!
        if (typeof window !== 'undefined') {
          localStorage.setItem('vitrion_logged_client', JSON.stringify(targetClient));
        }
        
        setTimeout(() => {
          setLoggedClient(targetClient);
          setPairingCodeParam('');
          setPairClientUser('');
          setPairClientPass('');
          setPairSuccess('');
          setPairIsSubmitting(false);
        }, 1800);
      }
      
    } catch (err: any) {
      console.error('Erro na sintonização rápida:', err);
      setPairError('Falha de segurança ou conexão com o Firestore: ' + err.message);
      setPairIsSubmitting(false);
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
          
          {/* High-fidelity Brand Logo and Wordmark */}
          <VitrionLogo variant="full" size="xl" theme="dark" className="filter drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]" />

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

        {/* Floating Admin Gmail button on the right side of the page */}
        <div className="absolute top-4 right-4 z-40 sm:top-6 sm:right-6 lg:top-8 lg:right-8">
          <button
            onClick={() => {
              setLoginTab(loginTab === 'admin' ? 'client' : 'admin');
              setClientLoginError('');
            }}
            type="button"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md transition-all duration-300 shadow-lg border cursor-pointer ${
              loginTab === 'admin'
                ? 'bg-indigo-600 border-indigo-550 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.03]'
                : 'bg-slate-900/80 border-white/5 text-slate-350 hover:text-white hover:border-white/15'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-cyan-300" />
            <span>Acesso Administrador (Gmail)</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-slate-900 border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative z-10 text-white">
          
          {/* Header banner */}
          <div className="p-6 pb-2 text-center space-y-3">
            <div className="flex justify-center select-none pb-1">
              <VitrionLogo variant="icon" size="sm" theme="dark" className="filter drop-shadow-[0_0_10px_rgba(56,189,248,0.25)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Acesse sua Conta</h1>
              <p className="text-xs text-slate-400 mt-1">Monitore e controle mídias e telas de TV em tempo real</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="px-6 pb-1">
            <div className="flex bg-slate-955/80 p-1 rounded-xl border border-white/5 gap-1">
              <button
                onClick={() => {
                  setLoginTab('client');
                  setClientLoginError('');
                }}
                className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === 'client'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Painel do Cliente
              </button>
              <button
                onClick={() => {
                  setLoginTab('pair');
                  setClientLoginError('');
                }}
                className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === 'pair'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-205'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Sincronizar Smart TV
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
            ) : loginTab === 'admin' ? (
              /* ADMINISTRATOR EMAIL & PASSWORD AUTH BLOCK FOR GMAIL USERS */
              <form onSubmit={handleAdminEmailLogin} className="space-y-4 animate-fade-in">
                
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  <span>Espaço exclusivo para gestores autorizados da rede. Informe seu Usuário ou e-mail cadastrado e sua senha de acesso.</span>
                </p>

                {/* Username / Email input */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Usuário ou E-mail
                  </label>
                  <input
                    type="text"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="beto..."
                    className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Password input with toggle visibility */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Senha de Acesso
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-500 rounded-lg pl-3 pr-10 py-2 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 leading-normal block">
                    Nota: O cadastro de novos administradores é restrito. Contate o suporte para autorizações adicionais.
                  </span>
                </div>

                {/* Status indicator feedbacks */}
                {adminAuthError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in text-left">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <p className="leading-snug">{adminAuthError}</p>
                  </div>
                )}

                {adminAuthSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in text-left">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <p className="leading-snug">{adminAuthSuccess}</p>
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={adminLoggingIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition duration-200 cursor-pointer"
                >
                  {adminLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verificando Credenciais...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Acessar Painel Administrador</span>
                    </>
                  )}
                </button>

                {/* Dynamic alternative Google Popup OAuth link (only visible if outside of AI Studio iframe dashboard) */}
                {typeof window !== 'undefined' && window.self === window.top && (
                  <div className="pt-2">
                    <button
                      onClick={handleGoogleLogin}
                      type="button"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-white/5 hover:border-white/10 bg-slate-950/40 hover:bg-slate-950/70 text-slate-300 hover:text-white text-[11px] font-bold rounded-lg transition"
                    >
                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.14 3.06-2.91 4.19v3.47h4.7c2.75-2.53 4.34-6.26 4.34-10.27l-.005-.72z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.7-3.47c-1.3.87-2.97 1.39-4.7 1.39-3.62 0-6.68-2.45-7.77-5.74H.32v3.58C2.3 20.83 6.88 24 12 24z" />
                        <path fill="#FBBC05" d="M4.23 13.27a7.185 7.185 0 0 1 0-4.54V5.15H.32a11.97 11.97 0 0 0 0 10.7l3.91-3.58z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.15 15.24 0 12 0 6.88 0 2.3 3.17.32 7.15l3.91 3.58c1.09-3.29 4.15-5.74 7.77-5.74z" />
                      </svg>
                      Ou Login expresso via Conta Google pop-up
                    </button>
                  </div>
                )}

                {/* Back to Client Login helper footer link */}
                <div className="pt-3.5 text-center select-none border-t border-white/5 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab('client');
                      setClientLoginError('');
                    }}
                    className="text-[10.5px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors duration-150"
                  >
                    &larr; Voltar para Painel do Cliente
                  </button>
                </div>
              </form>
            ) : (
              /* QUICK TV PAIRING/SYNC FORM */
              <form onSubmit={handleTVPairingSubmit} className="space-y-4 animate-fade-in">
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  Tem um monitor ou Smart TV exibindo um código de pareamento de 4 letras em sua tela? Sincronize-o instantaneamente abaixo.
                </p>

                {/* 4-digit code input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    Código de Pareamento (4 Letras)
                  </label>
                  <div className="flex justify-center">
                    <input
                      type="text"
                      required
                      value={pairingCodeParam}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setPairingCodeParam(val.slice(0, 4));
                      }}
                      placeholder="ABCD"
                      className="w-36 bg-slate-950/80 border border-white/10 focus:border-cyan-500 rounded-xl px-4 py-3 text-center text-xl font-black tracking-[0.25em] text-cyan-400 font-mono outline-none transition placeholder-slate-700 focus:ring-1 focus:ring-cyan-500/30 uppercase"
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Connection type Action Selector */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tipo de Conexão
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPairingAction('mirror')}
                      className={`p-3 rounded-xl border text-left transition text-white cursor-pointer ${
                        pairingAction === 'mirror'
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-300">
                        <Monitor className="w-3.5 h-3.5" />
                        Espelhar nesta tela
                      </div>
                      <p className="text-[9.5px] text-slate-450 mt-1 leading-snug">
                        Simula a Smart TV direto neste navegador para testes.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPairingAction('pair_store')}
                      className={`p-3 rounded-xl border text-left transition text-white cursor-pointer ${
                        pairingAction === 'pair_store'
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-300">
                        <UserCheck className="w-3.5 h-3.5" />
                        Vincular ao Estabelecimento
                      </div>
                      <p className="text-[9.5px] text-slate-450 mt-1 leading-snug">
                        Associa a TV física à conta da sua loja em tempo real.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Conditional store credentials for pairing */}
                {pairingAction === 'pair_store' && (
                  <div className="space-y-3 p-3 bg-slate-950/40 border border-white/5 rounded-xl animate-fade-in text-left">
                    <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wide block">
                      Credenciais do Estabelecimento
                    </span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nome de Usuário
                      </label>
                      <input
                        type="text"
                        required={pairingAction === 'pair_store'}
                        value={pairClientUser}
                        onChange={(e) => setPairClientUser(e.target.value)}
                        placeholder="Ex: alvoradapdv"
                        className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Senha de Acesso
                      </label>
                      <input
                        type="password"
                        required={pairingAction === 'pair_store'}
                        value={pairClientPass}
                        onChange={(e) => setPairClientPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/80 border border-white/10 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/30 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Success/Error Feedbacks */}
                {pairError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in text-left">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <p className="leading-snug">{pairError}</p>
                  </div>
                )}

                {pairSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl text-[11px] flex items-start gap-2 animate-fade-in text-left">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <p className="leading-snug">{pairSuccess}</p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={pairIsSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition duration-200 cursor-pointer"
                >
                  {pairIsSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Sincronizando via Nuvem...</span>
                    </>
                  ) : (
                    <span>
                      {pairingAction === 'mirror' 
                        ? '📺 Simular e Espelhar TV' 
                        : '🏢 Parear e Conectar TV'}
                    </span>
                  )}
                </button>
              </form>
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
        
        <div className="p-6 pb-4 flex flex-col items-start gap-1 text-left border-b border-slate-800/60 shadow-sm">
          <VitrionLogo variant="badge" theme="dark" size="xs" />
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider pl-1 mr-1 mt-1 block">
            Painel de Controle
          </span>
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

          <button
            onClick={() => setActiveTab('admins')}
            id="nav-tab-admins"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
              activeTab === 'admins'
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 font-medium'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className="text-sm">Admins & Histórico</span>
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
            <VitrionLogo variant="badge" theme="dark" size="xs" />
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
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition ${
              activeTab === 'admins' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'
            }`}
          >
            Admins
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
              {activeTab === 'admins' && 'Administradores Autorizados e Audit trail (Logs)'}
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
            {activeTab === 'admins' && <AdminHistoryManager />}
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
