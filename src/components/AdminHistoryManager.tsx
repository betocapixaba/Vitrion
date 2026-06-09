import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc, setDoc, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { db, auth, logAdminAction, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Shield, UserPlus, Trash2, History, UserCheck, 
  Clock, Search, Filter, Loader2, Key, Mail, User, AlertCircle, RefreshCw
} from 'lucide-react';

interface AuthorizedAdmin {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  createdAt: any;
}

interface AuditLog {
  id: string;
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  target: string;
  details: string;
  timestamp: any;
}

export default function AdminHistoryManager() {
  const [admins, setAdmins] = useState<AuthorizedAdmin[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');
  const [selectedAdminFilter, setSelectedAdminFilter] = useState('all');

  const currentUserId = auth.currentUser?.uid;

  // Active Admin loaded from localStorage
  const [activeAdmin, setActiveAdmin] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);

  // Profile Form States
  const [myUsername, setMyUsername] = useState('');
  const [myPassword, setMyPassword] = useState('');
  const [showMyPassword, setShowMyPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Dynamic Master Admin Display
  const [dynamicMasterUsername, setDynamicMasterUsername] = useState('beto');
  const [dynamicMasterEmail, setDynamicMasterEmail] = useState('betocapixaba@gmail.com');

  useEffect(() => {
    // Read from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vitrion_active_admin');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setActiveAdmin(parsed);
        } catch (e) {
          console.warn('Error reading active admin from localStorage:', e);
        }
      }
    }

    // Read dynamic master configs
    const fetchMasterConfig = async () => {
      try {
        const masterSnap = await getDoc(doc(db, 'admin_settings', 'master'));
        if (masterSnap.exists()) {
          const data = masterSnap.data();
          if (data.username) setDynamicMasterUsername(data.username);
          if (data.email) setDynamicMasterEmail(data.email);
        }
      } catch (e) {
        console.warn('Error loading dynamic master settings:', e);
      }
    };
    fetchMasterConfig();
  }, []);

  // Load current credential values for editing
  useEffect(() => {
    if (!activeAdmin) return;

    const loadProfileData = async () => {
      try {
        if (activeAdmin.uid === 'vitrion-sandbox-admin') {
          const masterSnap = await getDoc(doc(db, 'admin_settings', 'master'));
          if (masterSnap.exists()) {
            const data = masterSnap.data();
            setMyUsername(data.username || 'beto');
            setMyPassword(data.password || 'Vi9212376!@');
          } else {
            setMyUsername('beto');
            setMyPassword('Vi9212376!@');
          }
        } else {
          const adminSnap = await getDoc(doc(db, 'authorized_admins', activeAdmin.uid));
          if (adminSnap.exists()) {
            const data = adminSnap.data();
            setMyUsername(data.username || '');
            setMyPassword(data.password || '');
          }
        }
      } catch (err) {
        console.warn('Error loading profile credentials for editing:', err);
      }
    };

    loadProfileData();
  }, [activeAdmin]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setIsUpdatingProfile(true);

    const cleanUsername = myUsername.trim().toLowerCase();
    const cleanPassword = myPassword;

    if (!cleanUsername) {
      setProfileError('O nome de usuário não pode ficar vazio.');
      setIsUpdatingProfile(false);
      return;
    }

    if (cleanPassword.length < 5) {
      setProfileError('A senha precisa ter no mínimo 5 caracteres.');
      setIsUpdatingProfile(false);
      return;
    }

    try {
      if (!activeAdmin) {
        setProfileError('Identificação do administrador indisponível.');
        setIsUpdatingProfile(false);
        return;
      }

      // Check conflicts: If another auxiliary admin has this user
      if (activeAdmin.uid !== 'vitrion-sandbox-admin') {
        // Checking for conflicts if we are auxiliary
        if (cleanUsername === 'beto' || cleanUsername === dynamicMasterUsername.toLowerCase()) {
          setProfileError('Este nome de usuário é reservado ao administrador mestre.');
          setIsUpdatingProfile(false);
          return;
        }

        const conflictQuery = query(
          collection(db, 'authorized_admins'),
          where('username', '==', cleanUsername)
        );
        const conflictSnap = await getDocs(conflictQuery);
        let hasConflict = false;
        conflictSnap.forEach((docSnap) => {
          if (docSnap.id !== activeAdmin.uid) {
            hasConflict = true;
          }
        });

        if (hasConflict) {
          setProfileError('Já existe outro administrador registrado com este nome de usuário.');
          setIsUpdatingProfile(false);
          return;
        }
      } else {
        // If master: ensure they don't conflict with existing auxiliary admin usernames
        const conflictQuery = query(
          collection(db, 'authorized_admins'),
          where('username', '==', cleanUsername)
        );
        const conflictSnap = await getDocs(conflictQuery);
        if (!conflictSnap.empty) {
          setProfileError('Este nome de usuário já está sendo utilizado por um administrador auxiliar.');
          setIsUpdatingProfile(false);
          return;
        }
      }

      // Saving
      if (activeAdmin.uid === 'vitrion-sandbox-admin') {
        const masterRef = doc(db, 'admin_settings', 'master');
        await setDoc(masterRef, {
          username: cleanUsername,
          password: cleanPassword,
          email: 'betocapixaba@gmail.com',
          updatedAt: new Date()
        });

        setDynamicMasterUsername(cleanUsername);
        
        await logAdminAction(
          'UPDATE_MASTER_PROFILE',
          'Mestre',
          `Administrador mestre alterou o próprio usuário para "${cleanUsername}" e atualizou sua senha.`
        );
      } else {
        const adminRef = doc(db, 'authorized_admins', activeAdmin.uid);
        // Let's get the record to preserve name/email
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          await setDoc(adminRef, {
            ...adminSnap.data(),
            username: cleanUsername,
            password: cleanPassword,
            updatedAt: new Date()
          });
        }

        await logAdminAction(
          'UPDATE_ADMIN_PROFILE',
          `Admin ID: ${activeAdmin.uid}`,
          `Administrador auxiliar "${activeAdmin.displayName}" alterou o próprio usuário para "${cleanUsername}".`
        );
      }

      setProfileSuccess('Credenciais atualizadas com sucesso!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      console.error(err);
      setProfileError('Erro ao atualizar: ' + (err.message || err));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Real-time synchronization
  useEffect(() => {
    setIsLoading(true);

    // Sync Admins
    const adminsQuery = query(collection(db, 'authorized_admins'), orderBy('createdAt', 'desc'));
    const unsubscribeAdmins = onSnapshot(adminsQuery, (snapshot) => {
      const list: AuthorizedAdmin[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          name: d.name || '',
          username: d.username || '',
          email: d.email || '',
          password: d.password || '',
          createdAt: d.createdAt
        });
      });
      setAdmins(list);
    }, (err) => {
      console.error("Error streaming authorized admins:", err);
    });

    // Sync Audit Logs
    // Note: If no composite index for orderBy exists/raises permission/index issues, 
    // we query general and sort on client-side or use a simple query.
    const logsQuery = query(collection(db, 'admin_audit_logs'), limit(300));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          adminUid: d.adminUid || '',
          adminName: d.adminName || 'Gestor',
          adminEmail: d.adminEmail || '',
          action: d.action || '',
          target: d.target || '',
          details: d.details || '',
          timestamp: d.timestamp
        });
      });
      
      // Sort client side by timestamp descending (robust against missing Firestore index warnings)
      list.sort((a, b) => {
        const timeA = a.timestamp?.seconds ? a.timestamp.seconds : (a.timestamp instanceof Date ? a.timestamp.getTime() / 1000 : 0);
        const timeB = b.timestamp?.seconds ? b.timestamp.seconds : (b.timestamp instanceof Date ? b.timestamp.getTime() / 1000 : 0);
        return timeB - timeA;
      });

      setLogs(list);
      setIsLoading(false);
    }, (err) => {
      console.error("Error streaming audit logs:", err);
      setIsLoading(false);
    });

    return () => {
      unsubscribeAdmins();
      unsubscribeLogs();
    };
  }, []);

  // Format Firestore or JS timestamps to readable PT-BR date time
  const formatDateTime = (ts: any) => {
    if (!ts) return 'N/A';
    let date: Date;
    if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      date = new Date(ts);
    }
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Authorize new person handler
  const handleAuthorizeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    const formattedUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!name.trim() || !formattedUsername || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 5) {
      setErrorMsg('A senha de acesso deve possuir ao menos 5 caracteres.');
      return;
    }

    // Check username conflict with Beto master
    if (formattedUsername === 'beto' || formattedUsername === 'betocapixaba@gmail.com') {
      setErrorMsg('O nome de usuário "beto" é exclusivo para o administrador mestre.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check database conflicts on same username
      const q = query(collection(db, 'authorized_admins'), where('username', '==', formattedUsername));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        setErrorMsg('Este nome de usuário já está associado a outro administrador.');
        setIsSubmitting(false);
        return;
      }

      // Add document in authorized_admins
      await addDoc(collection(db, 'authorized_admins'), {
        name: name.trim(),
        username: formattedUsername,
        email: email.trim().toLowerCase(),
        password: password,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Audit Log
      await logAdminAction(
        'AUTHORIZE_ADMIN', 
        `Admin: ${name.trim()}`, 
        `Autorizou novo usuário de administração "${formattedUsername}" (${email || 'sem e-mail'}).`
      );

      setSuccessMsg(`Sucesso! O administrador ${name} foi credenciado e já pode acessar o painel.`);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      console.error('Error authorizing administrator:', err);
      setErrorMsg('Erro ao salvar administrador na nuvem: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revoke authorization handler
  const handleRevokeAdmin = async (admin: AuthorizedAdmin) => {
    if (!window.confirm(`Atenção: Tem certeza de que deseja revogar o acesso administrativo de ${admin.name}? Essa pessoa perderá acesso imediato ao painel.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'authorized_admins', admin.id));
      
      // Audit log
      await logAdminAction(
        'REVOKE_ADMIN', 
        `Admin: ${admin.name}`, 
        `Revogou autorização de acesso de "${admin.username}".`
      );
    } catch (err: any) {
      console.error('Error revoking admin access:', err);
      alert('Não foi possível remover este administrador.');
    }
  };

  // Clear log history helper
  const handleClearLogs = async () => {
    if (!window.confirm('CUIDADO: Deseja realmente reiniciar o histórico de logs de auditoria? Todas as entradas anteriores serão limpas no banco de dados.')) {
      return;
    }

    try {
      const q = query(collection(db, 'admin_audit_logs'), limit(150));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'admin_audit_logs', d.id));
      }

      await logAdminAction(
        'CLEAR_LOGS', 
        'Todas as Entradas', 
        'Histórico de logs reiniciado para otimização de banco pelo gestor.'
      );
      
      alert('Histórico de logs reiniciado com sucesso!');
    } catch (err) {
      console.error('Error cleaning audit log files:', err);
    }
  };

  // Action background style color mapping list
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50';
      case 'AUTHORIZE_ADMIN':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200/50';
      case 'REVOKE_ADMIN':
        return 'bg-rose-50 text-rose-700 border border-rose-250/50';
      case 'CREATE_CLIENT':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'DELETE_CLIENT':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'CREATE_MEDIA':
        return 'bg-sky-50 text-sky-700 border border-sky-150';
      case 'UPDATE_SCREEN':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  // Human readable action translation helper
  const translateAction = (action: string) => {
    const t: Record<string, string> = {
      'LOGIN_SUCCESS': 'Sessão Iniciada',
      'AUTHORIZE_ADMIN': 'Admin Autorizado',
      'REVOKE_ADMIN': 'Acesso Removido',
      'CREATE_CLIENT': 'Novo Cliente',
      'UPDATE_CLIENT': 'Atualizou Cliente',
      'DELETE_CLIENT': 'Fim de Parceria',
      'CREATE_MEDIA': 'Upload Mídia',
      'UPDATE_MEDIA': 'Editou Mídia',
      'DELETE_MEDIA': 'Deletou Mídia',
      'CREATE_PLAYLIST': 'Nova Playlist',
      'UPDATE_PLAYLIST': 'Editou Playlist',
      'DELETE_PLAYLIST': 'Limpou Playlist',
      'UPDATE_SCREEN': 'Atualizou TV',
      'DELETE_SCREEN': 'Sintonizador Fora',
      'CREATE_SCREEN': 'Controlador Pareado',
      'UPDATE_PLAN': 'Configurou Planos',
      'CLEAR_LOGS': 'Logs Reiniciados'
    };
    return t[action] || action;
  };

  // Filter lists according to search outputs
  const filteredLogs = logs.filter(log => {
    const searchString = `${log.adminName} ${log.adminEmail} ${log.details} ${log.target} ${log.action}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesAction = selectedActionFilter === 'all' || log.action === selectedActionFilter;
    const matchesAdmin = selectedAdminFilter === 'all' || log.adminUid === selectedAdminFilter;
    return matchesSearch && matchesAction && matchesAdmin;
  });

  // Unique list of admins who performed actions for log filter selector
  const distinctAdminsInLogs = Array.from(
    new Map<string, { uid: string; name: string }>(
      logs.map(l => [l.adminUid, { uid: l.adminUid, name: l.adminName }])
    ).values()
  ).filter(adm => adm.uid && adm.name);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* Dynamic Introduction Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden shadow-md select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-white shrink-0 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
              Gestão de Administradores & Logs de Auditoria
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Autorize auxiliares ou filiais secundárias para gerenciar mídias e monitores conectados, e confira o histórico completo de ações de segurança em tempo real.
            </p>
          </div>
          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-rose-400 hover:text-rose-300 rounded-lg text-[10.5px] font-bold uppercase tracking-wider shrink-0 border border-white/5 hover:border-rose-500/20 shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer max-w-xs self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reiniciar Histórico
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: AUTHORIZE & ACTIVE ADMINS LIST */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* New Authorization Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
              Autorizar Novo Administrador
            </h3>
            
            <form onSubmit={handleAuthorizeAdmin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva da Filial"
                    className="w-full bg-slate-50 border border-slate-205 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Nome de Usuário (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: joaosilva"
                    className="w-full bg-slate-50 border border-slate-205 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-indigo-500/20 lowercase"
                  />
                </div>
                <span className="text-[9px] text-slate-400 leading-none">Usado para ele fazer o login de administrador.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  E-mail do Administrador (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="joao@gmail.com"
                    className="w-full bg-slate-50 border border-slate-205 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 5 caracteres"
                    className="w-full bg-slate-50 border border-slate-205 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200/50 rounded-xl text-[11px] flex gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-xl text-[11px] flex gap-2 animate-fade-in">
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{successMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition duration-150 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Acesso...</span>
                  </>
                ) : (
                  <span>Cadastrar e Autorizar Acesso</span>
                )}
              </button>
            </form>
          </div>

          {/* Card: Change My Credentials */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
            <div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 text-indigo-400">
                <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                Meus Dados de Acesso
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Altere aqui o seu nome de usuário e senha de acesso pessoais para gerir o painel com total privacidade.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Usuário de Login ({activeAdmin?.uid === 'vitrion-sandbox-admin' ? 'Fundador/Mestre' : 'Auxiliar'})
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={myUsername}
                    onChange={(e) => setMyUsername(e.target.value)}
                    placeholder="Ex: beto.novo"
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type={showMyPassword ? 'text' : 'password'}
                    required
                    value={myPassword}
                    onChange={(e) => setMyPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-10 py-2 text-xs text-white outline-none transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMyPassword(!showMyPassword)}
                    className="absolute right-3 top-2 focus:outline-none text-slate-500 hover:text-slate-350 transition"
                  >
                    {showMyPassword ? (
                      <span className="text-[9px] font-black uppercase text-slate-400">Ocultar</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-indigo-405">Mostrar</span>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow-sm transition duration-150 cursor-pointer"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Alternar Credenciais</span>
                )}
              </button>
            </form>
          </div>

          {/* Active Administrators List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              Equipe Administrativa Cadastrada ({admins.length + 1})
            </h3>
            
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {/* Beto Master - Hardcoded indicator */}
              <div className="p-3 rounded-xl border border-dashed border-indigo-200 bg-gradient-to-r from-indigo-500/5 to-transparent flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-800">Beto (Fundador)</p>
                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-extrabold rounded text-[8px] uppercase">Mestre</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{dynamicMasterUsername} / {dynamicMasterEmail}</p>
                </div>
                <span className="text-[10px] text-slate-400 italic">Vitalício</span>
              </div>

              {/* Dynamic authorized admins */}
              {admins.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-slate-50/50 border border-slate-200">
                  <p className="text-[11.5px] text-slate-405 leading-relaxed">Nenhum administrador adicional cadastrado. Use o formulário acima para autorizar outras pessoas.</p>
                </div>
              ) : (
                admins.map((adm) => (
                  <div key={adm.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 transition flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{adm.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">User: {adm.username}</p>
                      {adm.email && <p className="text-[9.5px] text-indigo-500 truncate">{adm.email}</p>}
                      <div className="mt-1 flex items-center gap-1 select-none">
                        <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 font-extrabold rounded text-[8px] uppercase">Auxiliar</span>
                        <div className="text-[8.5px] text-slate-400" title="Senha de visualização rápida em sandbox">
                          Senha: <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-bold">{adm.password}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeAdmin(adm)}
                      className="p-1 px-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200/20 text-xs font-semibold hover:border-red-500/30 shrink-0 transition transition duration-150 cursor-pointer flex items-center justify-center"
                      title="Revogar as permissões"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED AUDIT HISTORY FEED */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col h-[700px]">
            
            {/* Log Header with count */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600 shrink-0" />
                Histórico Geral de Auditoria ({filteredLogs.length})
              </h3>
              <span className="text-[10px] font-bold font-mono text-slate-405 bg-slate-100 px-2.5 py-1 rounded-full">
                Mostrando os últimos 300 eventos
              </span>
            </div>

            {/* Filter Bar with Search, Admin and Action selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
              {/* Search Details input */}
              <div className="relative sm:col-span-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar detalhes..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition focus:ring-1 focus:ring-indigo-500/20 placeholder-slate-400"
                />
              </div>

              {/* Action Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedActionFilter}
                  onChange={(e) => setSelectedActionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition cursor-pointer text-slate-600"
                >
                  <option value="all">Todas as Ações</option>
                  <option value="LOGIN_SUCCESS">Login de Administradores</option>
                  <option value="AUTHORIZE_ADMIN">Autorizações / Credenciamento</option>
                  <option value="REVOKE_ADMIN">Revogação de Acesso</option>
                  <option value="CREATE_CLIENT">Cadastro de Estabelecimentos</option>
                  <option value="UPDATE_CLIENT">Edição de Estabelecimentos</option>
                  <option value="DELETE_CLIENT">Exclusão de Estabelecimentos</option>
                  <option value="CREATE_MEDIA">Upload/Criação Mídias</option>
                  <option value="DELETE_MEDIA">Exclusão Mídias</option>
                  <option value="CREATE_PLAYLIST">Configuração de Playlists</option>
                  <option value="UPDATE_SCREEN">Edição de Smart TVs</option>
                  <option value="UPDATE_PLAN">Alteração Tarifária</option>
                  <option value="CLEAR_LOGS">Reinicialização de Logs</option>
                </select>
              </div>

              {/* Admin Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedAdminFilter}
                  onChange={(e) => setSelectedAdminFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none transition cursor-pointer text-slate-600"
                >
                  <option value="all">Todos Operadores</option>
                  <option value="vitrion-sandbox-admin">Beto (Mestre)</option>
                  {distinctAdminsInLogs.filter(a => a.uid !== 'vitrion-sandbox-admin').map(adm => (
                    <option key={adm.uid} value={adm.uid}>{adm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logs Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Sincronizando auditoria...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-xl border border-slate-200">
                  <History className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-800">Nenhum evento registrado</p>
                  <p className="text-[10.5px] text-slate-405 mt-1 max-w-xs leading-relaxed">
                    Não há registros que correspondam aos filtros selecionados de pesquisa.
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 border border-slate-100 hover:border-slate-200 rounded-xl bg-white transition hover:shadow-xs space-y-2 text-xs">
                    
                    {/* Log Card Metadata Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 select-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Event Name Accent Badge */}
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase font-mono ${getActionStyle(log.action)}`}>
                          {translateAction(log.action)}
                        </span>
                        
                        {/* Operator Identity label */}
                        <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400" />
                          {log.adminName}
                        </span>
                        
                        {log.adminEmail && (
                          <span className="text-[9.5px] text-slate-400 font-mono">({log.adminEmail})</span>
                        )}
                      </div>

                      {/* Event Timestamp */}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 shrink-0 text-slate-350" />
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>

                    {/* Log Details Description */}
                    <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 space-y-1">
                      {log.target && (
                        <div className="text-[9.5px] font-extrabold text-indigo-500 uppercase tracking-wider leading-none">
                          Foco: <span className="bg-indigo-100/50 px-1 py-0.2 rounded">{log.target}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-650 leading-relaxed font-sans">{log.details}</p>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
