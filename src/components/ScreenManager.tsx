import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, logAdminAction } from '../lib/firebase';
import { Screen, Playlist, Asset } from '../types';
import { 
  Tv, Sparkles, Trash2, ShieldCheck, Play, HelpCircle, AlertCircle,
  Smartphone, Monitor, RefreshCw, Layers, CheckCircle, Info, ExternalLink,
  Search, Calendar, Pencil, X, Building, Clock, Power
} from 'lucide-react';

export default function ScreenManager() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search parameters
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Panel dialog states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [editScreenName, setEditScreenName] = useState('');
  const [editScreenClientId, setEditScreenClientId] = useState('');

  // Edit Client states
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [editClientEstName, setEditClientEstName] = useState('');
  const [editClientOwnerName, setEditClientOwnerName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientCity, setEditClientCity] = useState('');
  const [editClientState, setEditClientState] = useState('');
  const [editClientPlanId, setEditClientPlanId] = useState('');
  const [editClientVencimento, setEditClientVencimento] = useState('');

  // Pairing inputs
  const [pairingOpen, setPairingOpen] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [screenNameInput, setScreenNameInput] = useState('');
  const [pairingClientId, setPairingClientId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active simulated screen state
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [confirmDeleteScreenId, setConfirmDeleteScreenId] = useState<string | null>(null);
  const [confirmClientStandbyId, setConfirmClientStandbyId] = useState<string | null>(null);
  const [confirmClientUnpairAllId, setConfirmClientUnpairAllId] = useState<string | null>(null);

  // Smart TV Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorClient, setSimulatorClient] = useState<any | null>(null);
  const [simulatorScreenId, setSimulatorScreenId] = useState<string>('');
  
  // Custom tabs and pricing plans
  const [activeTab, setActiveTab] = useState<'individual' | 'by-client'>('by-client');
  const [plans, setPlans] = useState<any[]>([]);
  
  // Simulated playback state (for the embedded TV viewer)
  const [simulatedAsset, setSimulatedAsset] = useState<any>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (auth.currentUser) {
        setCurrentUserId(auth.currentUser.uid);
      } else {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('vitrion_active_admin');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.uid) {
                setCurrentUserId(parsed.uid);
                return;
              }
            }
          } catch (e) {
            console.warn('Error reading active admin from localStorage:', e);
          }
        }
        setCurrentUserId(null);
      }
    };

    checkAuth();
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAuth();
    });
    return () => unsubscribe();
  }, []);

  const hasAutoSelected = useRef(false);

  // Sync Screens, Playlists, Assets & Clients
  useEffect(() => {
    if (!currentUserId) {
      hasAutoSelected.current = false;
      return;
    }

    // Screens
    const screenQuery = query(
      collection(db, 'screens')
    );
    const unsubscribeScreens = onSnapshot(
      screenQuery,
      (snapshot) => {
        const list: Screen[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || 'Sem Nome',
            pairingCode: d.pairingCode || '',
            status: d.status || 'offline',
            lastActive: d.lastActive,
            contentType: d.contentType || 'idle',
            contentId: d.contentId || '',
            pairedAt: d.pairedAt,
            ownerId: d.ownerId || '',
            clientId: d.clientId || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        });
        setScreens(list);
        
        // Auto-select first screen if nothing selected
        if (list.length > 0 && !hasAutoSelected.current) {
          setSelectedScreenId((prev) => prev || list[0].id);
          hasAutoSelected.current = true;
        }
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'screens');
      }
    );

    // Playlists (for drop-down mappings)
    const playlistQuery = query(
      collection(db, 'playlists')
    );
    const unsubscribePlaylists = onSnapshot(
      playlistQuery,
      (snapshot) => {
        const list: Playlist[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || '',
            items: d.items || [],
            ownerId: d.ownerId || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        });
        setPlaylists(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'playlists');
      }
    );

    // Assets (for drop-down mappings)
    const assetQuery = query(
      collection(db, 'assets')
    );
    const unsubscribeAssets = onSnapshot(
      assetQuery,
      (snapshot) => {
        const list: Asset[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || '',
            type: d.type || 'text',
            url: d.url || '',
            content: d.content || '',
            config: d.config || {},
            duration: d.duration || 10,
            ownerId: d.ownerId || '',
            clientId: d.clientId || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        });
        setAssets(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'assets');
      }
    );

    // Clients (for mapping screens and lists)
    const clientsQuery = query(
      collection(db, 'clients')
    );
    const unsubscribeClients = onSnapshot(
      clientsQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
        setClients(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'clients');
      }
    );

    // Plans (for mapping plan names in client listings)
    const plansQuery = query(
      collection(db, 'plans')
    );
    const unsubscribePlans = onSnapshot(
      plansQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPlans(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'plans');
      }
    );

    return () => {
      unsubscribeScreens();
      unsubscribePlaylists();
      unsubscribeAssets();
      unsubscribeClients();
      unsubscribePlans();
    };
  }, [currentUserId]);

  // Live TV Simulator Logic (Runs the loop for the currently selected screen)
  useEffect(() => {
    if (!selectedScreenId) {
      setSimulatedAsset(null);
      return;
    }

    const currentScreen = screens.find((s) => s.id === selectedScreenId);
    if (!currentScreen || currentScreen.contentType === 'idle' || currentScreen.contentType === 'standby' || currentScreen.contentType === 'stopped') {
      setSimulatedAsset(null);
      return;
    }

    if (currentScreen.contentType === 'asset') {
      const match = assets.find((a) => a.id === currentScreen.contentId);
      setSimulatedAsset(match || null);
    } else if (currentScreen.contentType === 'playlist') {
      const activePlaylist = playlists.find((p) => p.id === currentScreen.contentId);
      if (!activePlaylist || activePlaylist.items.length === 0) {
        setSimulatedAsset(null);
        return;
      }

      // Start looping through playlist contents
      setPlaylistIndex(0);
      setSimulatedAsset(activePlaylist.items[0]);

      let timeoutId: any;
      
      const runPlaylistTick = (index: number) => {
        const item = activePlaylist.items[index];
        setSimulatedAsset(item);
        
        const nextIndex = (index + 1) % activePlaylist.items.length;
        const durationMs = (item.duration || 10) * 1000;

        timeoutId = setTimeout(() => {
          setPlaylistIndex(nextIndex);
          runPlaylistTick(nextIndex);
        }, durationMs);
      };

      runPlaylistTick(0);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [selectedScreenId, screens, playlists, assets]);

  // Handle Pairing Linking
  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const parsedCode = pairingCodeInput.trim().toUpperCase();
    if (parsedCode.length !== 4) {
      setErrorMsg('O código de pareamento deve conter exatamente 4 caracteres.');
      return;
    }

    if (!screenNameInput.trim()) {
      setErrorMsg('Por favor, informe um nome para identificar a tela.');
      return;
    }

    try {
      // Look up and examine reference document /screens/{parsedCode}
      const ref = doc(db, 'screens', parsedCode);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setErrorMsg('Estação não encontrada! Certifique-se de que a Smart TV está aberta no Modo Player e gerou o código de 4 dígitos correto.');
        return;
      }

      const screenData = snap.data();
      if (screenData.ownerId) {
        setErrorMsg('Este monitor já se encontra pareado sob a administração de outro gestor de contas.');
        return;
      }

      // Update Screen document to assign to this Admin!
      await updateDoc(ref, {
        name: screenNameInput.trim(),
        ownerId: currentUserId,
        clientId: pairingClientId || '',
        pairedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'online',
      });

      setSuccessMsg(`Monitor "${screenNameInput.trim()}" integrado com sucesso!`);
      setPairingCodeInput('');
      setScreenNameInput('');
      setPairingClientId('');
      setTimeout(() => {
        setPairingOpen(false);
        setSuccessMsg('');
      }, 2000);

    } catch (err) {
      setErrorMsg('Falha na segurança ao parear estação.');
      console.error(err);
    }
  };

  // Change active screen contents
  const assignContentToScreen = async (screenId: string, contentType: 'idle' | 'asset' | 'playlist' | 'standby' | 'stopped', contentId: string) => {
    try {
      await updateDoc(doc(db, 'screens', screenId), {
        contentType,
        contentId,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `screens/${screenId}`);
    }
  };

  // Toggle individual screen on / off (exhibition status)
  const handleTogglePower = async (screenId: string, currentType: 'playlist' | 'asset' | 'idle' | 'standby' | 'stopped', contentId: string) => {
    try {
      if (currentType === 'stopped') {
        // Toggle ON: restore previous type or fallback to idle
        let newType: 'playlist' | 'asset' | 'idle' | 'standby' = 'idle';
        if (contentId) {
          const isPlaylist = playlists.some((p) => p.id === contentId);
          const isAsset = assets.some((a) => a.id === contentId);
          if (isPlaylist) {
            newType = 'playlist';
          } else if (isAsset) {
            newType = 'asset';
          }
        }
        await updateDoc(doc(db, 'screens', screenId), {
          contentType: newType,
          updatedAt: serverTimestamp()
        });
        setSuccessMsg('O monitor foi ligado com sucesso!');
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        // Toggle OFF: set to stopped
        await updateDoc(doc(db, 'screens', screenId), {
          contentType: 'stopped',
          updatedAt: serverTimestamp()
        });
        setSuccessMsg('O monitor foi desligado (Exibição Parada)!');
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err) {
      console.error('Erro ao alternar energia da tela:', err);
      setErrorMsg('Falha ao alternar a exibição da tela.');
    }
  };

  // Permanently delete screen from Firestore database
  const handleUnpairScreen = async (screenId: string, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Deseja realmente EXCLUIR este monitor/display permanentemente do sistema? Esta ação apagará o registro da TV no banco de dados.')) return;
    try {
      await deleteDoc(doc(db, 'screens', screenId));
      if (selectedScreenId === screenId) {
        setSelectedScreenId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `screens/${screenId}`);
    }
  };

  const handleClientStandby = async (clientId: string, skipConfirm = false) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      setErrorMsg('Nenhuma TV vinculada a este cliente para colocar em standby.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!skipConfirm && !window.confirm('Colocar todas as TVs deste cliente em Standby?')) return;
    try {
      for (const screen of clientScreens) {
        await updateDoc(doc(db, 'screens', screen.id), {
          contentType: 'standby',
          updatedAt: serverTimestamp()
        });
      }
      setSuccessMsg('Todas as TVs do cliente foram colocadas em Standby!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao aplicar standby nas TVs do cliente.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleClientActive = async (clientId: string) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      setErrorMsg('Nenhuma TV vinculada a este cliente.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    try {
      for (const screen of clientScreens) {
        await updateDoc(doc(db, 'screens', screen.id), {
          contentType: 'idle',
          updatedAt: serverTimestamp()
        });
      }
      setSuccessMsg('Todas as TVs do cliente foram ativas/ligadas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao reativar as TVs do cliente.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleClientUnpairAll = async (clientId: string, skipConfirm = false) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      setErrorMsg('Nenhuma TV de cliente vinculada.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!skipConfirm && !window.confirm('Tem certeza que deseja desvincular TODAS as TVs integradas a este cliente? Elas retornarão ao modo de pareamento original.')) return;
    try {
      for (const screen of clientScreens) {
        await updateDoc(doc(db, 'screens', screen.id), {
          name: 'Smart TV',
          ownerId: '',
          pairedAt: null,
          clientId: '',
          contentType: 'idle',
          contentId: '',
          status: 'online',
          updatedAt: serverTimestamp()
        });
      }
      setSuccessMsg('Todas as TVs do cliente foram desvinculadas!');
      setTimeout(() => setSuccessMsg(''), 3505);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao desvincular as TVs do cliente.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleCreateVirtualTV = async (clientId: string) => {
    try {
      const code = 'VIRT' + Math.floor(10 + Math.random() * 90) + String.fromCharCode(65 + Math.floor(Math.random() * 26)); 
      const ref = doc(db, 'screens', code);
      await setDoc(ref, {
        id: code,
        name: `TV Simuladora - ${clients.find(c => c.id === clientId)?.establishmentName || 'Cliente'}`,
        pairingCode: code,
        status: 'online',
        lastActive: serverTimestamp(),
        contentType: 'idle',
        contentId: '',
        pairedAt: serverTimestamp(),
        ownerId: 'admin_simulation',
        clientId: clientId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg('Smart TV Virtual criada e pareada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setSimulatorScreenId(code);
    } catch (err) {
      console.error('Error creating virtual screen:', err);
      setErrorMsg('Falha ao instanciar TV virtual.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const formatFullDateTime = (ts: any) => {
    if (!ts) return 'N/A';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : (ts.toDate ? ts.toDate() : new Date(ts));
    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayName = daysOfWeek[date.getDay()];
    const formattedDate = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `${dayName}, ${formattedDate} às ${formattedTime}`;
  };

  const handleSaveScreenDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScreen) return;
    try {
      const ref = doc(db, 'screens', editingScreen.id);
      await updateDoc(ref, {
        name: editScreenName.trim(),
        clientId: editScreenClientId || '',
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg(`Configurações de "${editScreenName.trim()}" atualizadas!`);
      setIsEditModalOpen(false);
      setEditingScreen(null);
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao atualizar as configurações do monitor.');
    }
  };

  const handleSaveClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const ref = doc(db, 'clients', editingClient.id);
      await updateDoc(ref, {
        establishmentName: editClientEstName.trim(),
        name: editClientOwnerName.trim(),
        phone: editClientPhone.trim(),
        city: editClientCity.trim(),
        state: editClientState.trim().toUpperCase(),
        planId: editClientPlanId,
        vencimento: editClientVencimento.trim(),
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg(`Cadastro de "${editClientEstName.trim()}" atualizado com sucesso!`);
      setIsEditClientModalOpen(false);
      setEditingClient(null);
      setTimeout(() => setSuccessMsg(''), 2500);

      await logAdminAction(
        'UPDATE_CLIENT_QUICK', 
        `Cliente: ${editClientEstName.trim()}`, 
        `Atualizou dados cadastrais (rápido) do estabelecimento na Central de Distribuição.`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao atualizar o cadastro do cliente.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const filteredScreens = screens.filter((screen) => {
    const term = searchTerm.toLowerCase();
    const client = clients.find((c) => c.id === screen.clientId);
    const clientName = client ? client.establishmentName.toLowerCase() : '';
    
    const pairDateFormatted = formatFullDateTime(screen.pairedAt || screen.createdAt).toLowerCase();
    
    return (
      screen.name.toLowerCase().includes(term) ||
      screen.pairingCode.toLowerCase().includes(term) ||
      screen.id.toLowerCase().includes(term) ||
      clientName.includes(term) ||
      pairDateFormatted.includes(term)
    );
  });

  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    const clientScreens = screens.filter((s) => s.clientId === client.id);
    const matchesScreens = clientScreens.some(
      (scr) => 
        scr.name.toLowerCase().includes(term) ||
        scr.pairingCode.toLowerCase().includes(term)
    );

    return (
      (client.establishmentName || '').toLowerCase().includes(term) ||
      (client.name || '').toLowerCase().includes(term) ||
      (client.city || '').toLowerCase().includes(term) ||
      (client.state || '').toLowerCase().includes(term) ||
      matchesScreens
    );
  });



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">Gestão de Telas (TVs/Painéis)</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Gerencie os monitores conectados e distribua o conteúdo em tempo real.</p>
        </div>
        {!pairingOpen && (
          <button
            onClick={() => setPairingOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            Parear Nova Tela
          </button>
        )}
      </div>

      {/* Switcher Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-1 select-none">
        <button
          onClick={() => { setActiveTab('by-client'); setSearchTerm(''); }}
          className={`py-2.5 px-4 text-xs font-bold leading-none border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'by-client'
              ? 'border-indigo-600 text-indigo-700 font-extrabold pb-3'
              : 'border-transparent text-slate-550 hover:text-slate-850 pb-3'
          }`}
        >
          🏢 Central de Distribuição por Cliente
        </button>
        <button
          onClick={() => { setActiveTab('individual'); setSearchTerm(''); }}
          className={`py-2.5 px-4 text-xs font-bold leading-none border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'individual'
              ? 'border-indigo-600 text-indigo-700 font-extrabold pb-3'
              : 'border-transparent text-slate-550 hover:text-slate-850 pb-3'
          }`}
        >
          🖥️ Todas as TVs Individuais
        </button>
      </div>

      {pairingOpen && (
        <form onSubmit={handlePair} className="bg-white rounded-xl border border-indigo-200/60 bg-indigo-50/10 p-5 space-y-4 animate-fade-in max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Conectar Monitor Digital
            </h3>
            <button
              type="button"
              onClick={() => { setPairingOpen(false); setErrorMsg(''); }}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Fechar
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Abra o <strong>Modo Player</strong> em sua Smart TV (ou em uma nova aba do navegador). Copie o código de 4 caracteres gerado lá e insira abaixo para reivindicar o pareamento remoto:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Código de 4 Dígitos *</label>
              <input
                type="text"
                required
                maxLength={4}
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value)}
                placeholder="Ex: F9XQ"
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome de Identificação *</label>
              <input
                type="text"
                required
                value={screenNameInput}
                onChange={(e) => setScreenNameInput(e.target.value)}
                placeholder="Ex: Monitor Recepção principal"
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* New Client Selector on pairing form */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estabelecimento / Cliente Proprietário (Opcional)</label>
            <select
              value={pairingClientId}
              onChange={(e) => setPairingClientId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs leading-tight outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Vincular a Nenhum (Geral) --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.establishmentName} ({c.city} - {c.state})
                </option>
              ))}
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2 border border-red-200/50">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-2 border border-emerald-250/50">
              <CheckCircle className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
            >
              Parear Conexão
            </button>
            <button
              type="button"
              onClick={() => setPairingOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Global Toast Success Alerts */}
      {successMsg && !pairingOpen && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-xxs">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Connected Screens List (Left) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Shared Search Bar for both tabs */}
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xxs">
            <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <input
              type="text"
              id="search-screens-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por cliente, Smart TV, código (ex: F9XQ) ou cidade..."
              className="flex-1 bg-transparent border-0 outline-none placeholder-slate-400 text-xs text-slate-700 focus:ring-0"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-slate-400 hover:text-slate-600 text-xs font-mono px-1.5 py-0.5 hover:bg-slate-100 rounded"
              >
                Limpar
              </button>
            )}
          </div>

          {activeTab === 'individual' ? (
            <>
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-slate-700">🖥️ Monitores Encontrados ({filteredScreens.length})</span>
              </div>

              {/* Quick Fire TV Helpful notice inside Control Panel */}
              <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 rounded-xl p-3.5 flex items-start gap-2.5 transition text-xs text-slate-600 leading-normal animate-fade-in shadow-xxs">
                <span className="text-base shrink-0 select-none">🔥</span>
                <div className="space-y-1">
                  <p className="font-bold text-amber-850 text-[11px] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Conexão com Amazon Fire TV Stick
                  </p>
                  <p className="text-[10.5px] text-slate-600">
                    Para sinalizar em um **Fire TV Stick** ou Smart TV: abra o navegador **Amazon Silk** na TV, acesse a URL deste app (ou do QR code do player) com <code className="bg-amber-550/10 px-1 py-0.2 rounded font-mono font-semibold">?mode=player</code> e use o botão central **OK / SELECT** do controle remoto para alternar a tela cheia.
                  </p>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs font-medium">Buscando monitores conectados...</span>
                </div>
              ) : filteredScreens.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                  <Tv className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">Nenhum Monitor Encontrado</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
                    {searchTerm 
                      ? 'Nenhuma TV corresponde aos termos pesquisados. Verifique se digitou o código de pareamento correto.'
                      : 'Nenhuma Smart TV está integrada a esta conta. Clique em "Parear Nova Tela" e use o código do player para sintonizá-la.'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      type="button"
                      onClick={() => setPairingOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                      Parear Meu Primeiro Dispositivo
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredScreens.map((screen) => {
                    const isSelected = selectedScreenId === screen.id;
                    const associatedClient = clients.find((c) => c.id === screen.clientId);
                    
                    // Determine online/offline based on lastActive timestamp (within 60s)
                    let isOnline = false;
                    if (screen.lastActive) {
                      const lastActiveMs = screen.lastActive.seconds * 1000;
                      const deltaSeconds = (Date.now() - lastActiveMs) / 1000;
                      isOnline = deltaSeconds < 65; // Online if updated within 65 seconds
                    }

                    return (
                      <div 
                        key={screen.id}
                        onClick={() => setSelectedScreenId(screen.id)}
                        className={`p-4 bg-white border rounded-xl shadow-xxs transition-all cursor-pointer relative ${
                          isSelected 
                            ? 'border-indigo-600 ring-1 ring-indigo-50/50 bg-indigo-50/5' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 bg-slate-100 rounded-lg shrink-0 ${isOnline ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
                              <Tv className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                {screen.name}
                                <span className="text-[9px] font-mono bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 py-0.2 rounded font-bold shrink-0">
                                  CÓD: {screen.pairingCode}
                                </span>
                                <a
                                  href={`/?mode=player&screenId=${screen.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="text-[9.5px] text-indigo-600 hover:underline font-bold flex items-center gap-0.5 ml-1"
                                  title="Abrir reprodutor de Smart TV simulado em outra aba"
                                >
                                  <ExternalLink className="w-3 h-3" /> Player
                                </a>
                              </h4>
                              
                              {/* Owner establishment label */}
                              {associatedClient ? (
                                <div className="text-[10px] text-indigo-700 bg-indigo-50/50 border border-indigo-100/70 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <Building className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>Estabelecimento: <strong>{associatedClient.establishmentName}</strong></span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="italic">Geral / Sem Cliente Proprietário</span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1">
                                {/* Online / Offline badge */}
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                                  {isOnline ? 'ONLINE • RECEBENDO TRANSMISSÃO' : 'SEM SINAL (OFFLINE)'}
                                </span>
                              </div>

                              {/* Complete Timestamp activity and pairing logger */}
                              <div className="mt-2 text-[10px] text-slate-500 flex flex-col gap-1 leading-normal bg-slate-50 p-2 rounded-lg border border-slate-150/40">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span><strong>Pareado em:</strong> {formatFullDateTime(screen.pairedAt || screen.createdAt)}</span>
                                </div>
                                {screen.lastActive && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span><strong>Último sinal (Heartbeat):</strong> {formatFullDateTime(screen.lastActive)}</span>
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 select-none">
                            {/* Switch de On/Off para controle de exibição */}
                            <div className="flex items-center gap-1.5 mr-2 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg">
                              <span className={`text-[9px] font-extrabold uppercase tracking-wider ${screen.contentType !== 'stopped' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {screen.contentType !== 'stopped' ? 'ON' : 'OFF'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePower(screen.id, screen.contentType, screen.contentId);
                                }}
                                className={`w-8.5 h-4.5 rounded-full p-0.5 transition-colors duration-250 cursor-pointer ${
                                  screen.contentType !== 'stopped' ? 'bg-emerald-500' : 'bg-slate-350'
                                }`}
                                title={screen.contentType !== 'stopped' ? 'Desligar Exibição' : 'Ligar Exibição'}
                              >
                                <div
                                  className={`bg-orange-500 w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform duration-250 ${
                                    screen.contentType !== 'stopped' ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingScreen(screen);
                                setEditScreenName(screen.name);
                                setEditScreenClientId(screen.clientId || '');
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition shrink-0"
                              title="Editar Monitor e Cliente Associado"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {confirmDeleteScreenId === screen.id ? (
                              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5 h-8 animate-fade-in z-10 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnpairScreen(screen.id, true);
                                    setConfirmDeleteScreenId(null);
                                  }}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-black uppercase transition cursor-pointer"
                                  title="Confirmar Exclusão"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteScreenId(null);
                                  }}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                                  title="Cancelar"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteScreenId(screen.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition shrink-0"
                                title="Excluir Monitor Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mapping controller inside card */}
                        <div className="mt-4 pt-3.5 border-t border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider block mb-1">Mídia Ativa em Reprodução</span>
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                              <span className="font-semibold text-slate-800">
                                {screen.contentType === 'idle' && 'Nenhum Conteúdo Vinculado (Ocioso)'}
                                {screen.contentType === 'standby' && 'TV em Modo Standby / Suspensa 💤'}
                                {screen.contentType === 'asset' && `Vídeo/Imagem Individual: ${assets.find(a=>a.id===screen.contentId)?.name || 'Carregando...'}`}
                                {screen.contentType === 'playlist' && `Playlist: ${playlists.find(p=>p.id===screen.contentId)?.name || 'Carregando...'}`}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                            <select
                              value={`${screen.contentType}:${screen.contentId}`}
                              onChange={(e) => {
                                const [cType, cId] = e.target.value.split(':');
                                assignContentToScreen(screen.id, cType as any, cId);
                              }}
                              className="px-2.5 py-1 text-xxs font-bold uppercase tracking-wider bg-slate-50 border hover:bg-slate-100 text-slate-700 rounded-md focus:border-indigo-500"
                            >
                              <option value="idle:">-- Pausar Programação --</option>
                              <option value="standby:">💤 Standby (Tela de Descanso)</option>
                              <optgroup label="📋 Playlists Específicas">
                                {playlists.map((p) => (
                                  <option key={p.id} value={`playlist:${p.id}`}>
                                    🔁 PLAYLIST: {p.name}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="🎯 Mídias Avulsas (Biblioteca)">
                                {assets
                                  .filter((a) => !a.clientId || !screen.clientId || a.clientId === screen.clientId)
                                  .map((a) => (
                                    <option key={a.id} value={`asset:${a.id}`}>
                                      📺 {a.type.toUpperCase()}: {a.name} {a.clientId ? `[${clients.find(c => c.id === a.clientId)?.establishmentName || 'Cliente'}]` : ''}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* BY CLIENT LAYOUT */
            <div className="space-y-4 font-sans text-slate-700">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-semibold text-slate-700">🏢 Painel de Controle de TVs por Cliente ({filteredClients.length})</span>
              </div>

              {filteredClients.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                  <Building className="w-10 h-10 text-slate-350 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700 font-sans">Nenhum Registro Encontrado</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed font-sans">
                    Não encontramos clientes que correspondam aos filtros de pesquisa ativos.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* List of Registered Client Rows */}
                  {filteredClients.map((client) => {
                    const clientScreens = screens.filter((s) => s.clientId === client.id);
                    const plan = plans.find((p) => p.id === client.planId);
                    
                    // Format vencimento nicely
                    const formatVencimento = (v: string) => {
                      if (!v) return 'Sem Vencimento';
                      const parts = v.split('-');
                      if (parts.length === 3) {
                        return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      return v;
                    };

                    return (
                      <div key={client.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition hover:border-indigo-200">
                        {/* Elegant Client Line Header */}
                        <div className="bg-slate-50/70 p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                              <Building className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-800 leading-snug">
                                  {client.establishmentName}
                                </h4>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClient(client);
                                    setEditClientEstName(client.establishmentName || '');
                                    setEditClientOwnerName(client.name || '');
                                    setEditClientPhone(client.phone || '');
                                    setEditClientCity(client.city || '');
                                    setEditClientState(client.state || '');
                                    setEditClientPlanId(client.planId || '');
                                    setEditClientVencimento(client.vencimento || '');
                                    setIsEditClientModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-slate-200 hover:text-indigo-650 text-slate-400 rounded transition cursor-pointer"
                                  title="Editar Estabelecimento Comercial / Cliente"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-semibold text-slate-550 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                  {client.city} - {client.state}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                  Plano: {plan ? plan.name : 'Nenhum'}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span><strong>👤 Responsável:</strong> {client.name}</span>
                                {client.phone && (
                                  <a 
                                    href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline font-semibold flex items-center gap-0.5"
                                  >
                                    📞 {client.phone}
                                  </a>
                                )}
                                <span className="text-indigo-700 font-mono font-bold bg-indigo-50/20 text-[10px] px-1.5 py-0.2 rounded border border-indigo-100/30">
                                  📅 Vence: {formatVencimento(client.vencimento)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Batch Actions & TV Limits */}
                          <div className="flex items-center gap-3 shrink-0 flex-wrap">
                            <div className="text-left md:text-right mr-1">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                TVs Pareadas: <span className="text-indigo-700 font-extrabold">{clientScreens.length}</span> / {plan ? plan.maxScreens : '0'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {confirmClientStandbyId === client.id ? (
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg h-8 animate-fade-in text-[10.5px] font-bold text-amber-850">
                                  <span>Confirmar Standby de {clientScreens.length} TV(s)?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClientStandby(client.id, true);
                                      setConfirmClientStandbyId(null);
                                    }}
                                    className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-extrabold uppercase text-[10px] cursor-pointer"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmClientStandbyId(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-355 text-slate-700 rounded font-bold uppercase text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                               </div>
                              ) : confirmClientUnpairAllId === client.id ? (
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg h-8 animate-fade-in text-[10.5px] font-bold text-red-850">
                                  <span>Desvincular TODAS as {clientScreens.length} TV(s)?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleClientUnpairAll(client.id, true);
                                      setConfirmClientUnpairAllId(null);
                                    }}
                                    className="px-2 py-0.5 bg-red-650 hover:bg-red-750 text-white rounded font-extrabold uppercase text-[10px] cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmClientUnpairAllId(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold uppercase text-[10px] cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSimulatorClient(client);
                                      const firstScr = clientScreens[0];
                                      setSimulatorScreenId(firstScr ? firstScr.id : '');
                                      setIsSimulatorOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9.5px] tracking-wider rounded-lg transition-all cursor-pointer shadow-xxs flex items-center gap-1 shrink-0"
                                    title="Abrir Simulador de Smart TV Inteligente em Tempo Real para este Cliente"
                                  >
                                    🖥️ SIMULAR SMART TV
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleClientActive(client.id)}
                                    disabled={clientScreens.length === 0}
                                    className="px-2.5 py-1.5 bg-emerald-550 hover:bg-emerald-600 text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-[9.5px] tracking-wider rounded-lg transition-all border border-emerald-600 cursor-pointer shadow-xxs"
                                    title="Ligar todas as TVs deste cliente"
                                  >
                                    🚀 LIGAR TUDO
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmClientStandbyId(client.id);
                                      setConfirmClientUnpairAllId(null);
                                    }}
                                    disabled={clientScreens.length === 0}
                                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200 font-extrabold text-[9.5px] tracking-wider rounded-lg transition-all cursor-pointer shadow-xxs"
                                    title="Standby para todas as TVs"
                                  >
                                    💤 STANDBY
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmClientUnpairAllId(client.id);
                                      setConfirmClientStandbyId(null);
                                    }}
                                    disabled={clientScreens.length === 0}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200 font-extrabold text-[9.5px] tracking-wider rounded-lg transition-all cursor-pointer shadow-xxs"
                                    title="Desvincular todas as TVs deste cliente"
                                  >
                                    🚨 REMOVER TUDO
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* List of TVs belonging to this client (Rows/Lines) */}
                        <div className="p-4 bg-slate-50/20 divide-y divide-slate-100">
                          {clientScreens.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center font-sans">Nenhuma Smart TV vinculada a este estabelecimento.</p>
                          ) : (
                            <div className="space-y-2">
                              {clientScreens.map((scr) => {
                                const isSelected = selectedScreenId === scr.id;
                                let online = false;
                                if (scr.lastActive) {
                                  const lastMs = scr.lastActive.seconds * 1000;
                                  online = (Date.now() - lastMs) / 1000 < 65;
                                }

                                return (
                                  <div
                                    key={scr.id}
                                    onClick={() => setSelectedScreenId(scr.id)}
                                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${
                                      isSelected 
                                        ? 'border-indigo-600 bg-indigo-50/15 font-semibold text-indigo-950 ring-1 ring-indigo-150 shadow-xxs'
                                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 shadow-3xs'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                                        <span className="text-[11.5px] font-extrabold text-slate-700 truncate block">{scr.name}</span>
                                        <span className="text-[9.5px] font-mono font-bold bg-slate-100 text-slate-650 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                                          CÓD: {scr.pairingCode}
                                        </span>
                                        <a
                                          href={`/?mode=player&screenId=${scr.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-[10px] text-indigo-650 hover:underline font-extrabold flex items-center gap-0.5"
                                          title="Abrir reprodutor de Smart TV simulado em outra aba"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" /> Player Remoto
                                        </a>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 leading-none mt-1.5 text-[10.5px] text-slate-550">
                                        <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider shrink-0">Status Ativo:</span>
                                        <span className="font-semibold text-slate-700 truncate max-w-xs md:max-w-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 border border-slate-200 rounded-md">
                                          {scr.contentType === 'idle' && 'Ocioso (Sem programação)'}
                                          {scr.contentType === 'standby' && 'Standby / Descanso 💤'}
                                          {scr.contentType === 'stopped' && 'Desligado / Sem Transmissão 🛑'}
                                          {scr.contentType === 'asset' && `Vídeo/Imagem: ${assets.find(a=>a.id===scr.contentId)?.name || 'Carregando'}`}
                                          {scr.contentType === 'playlist' && `🔁 Playlist: ${playlists.find(a=>a.id===scr.contentId)?.name || 'Carregando'}`}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Column with Content Assigner dropdown + Power Switch + Controls */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 select-none">
                                      {/* On/Off Switch for power control */}
                                      <div className="flex items-center gap-1 bg-white border border-slate-150 px-2 py-0.5 rounded-lg h-8">
                                        <span className={`text-[9.5px] font-black tracking-wider ${scr.contentType !== 'stopped' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                          {scr.contentType !== 'stopped' ? 'LIG' : 'DES'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePower(scr.id, scr.contentType, scr.contentId);
                                          }}
                                          className={`w-7.5 h-4.5 rounded-full p-0.5 transition-colors duration-250 cursor-pointer flex items-center ${
                                            scr.contentType !== 'stopped' ? 'bg-emerald-500' : 'bg-slate-300'
                                          }`}
                                          title={scr.contentType !== 'stopped' ? 'Desligar Exibição' : 'Ligar Exibição'}
                                        >
                                          <div
                                            className={`bg-white w-3.5 h-3.5 rounded-full shadow-xs transform transition-transform duration-250 ${
                                              scr.contentType !== 'stopped' ? 'translate-x-3' : 'translate-x-0'
                                            }`}
                                          />
                                        </button>
                                      </div>

                                      {/* Dropdown selector for active contents */}
                                      <select
                                        value={`${scr.contentType}:${scr.contentId}`}
                                        onClick={(e) => e.stopPropagation()} 
                                        onChange={(e) => {
                                          const [cType, cId] = e.target.value.split(':');
                                          assignContentToScreen(scr.id, cType as any, cId);
                                        }}
                                        className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold leading-tight outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer h-8 max-w-[140px] md:max-w-[180px]"
                                      >
                                        <option value="idle:">Ocioso</option>
                                        <option value="standby:">Standby</option>
                                        <option value="stopped:">Desligado 🛑</option>
                                        <optgroup label="📋 Playlists">
                                          {playlists.map((p) => (
                                            <option key={p.id} value={`playlist:${p.id}`}>
                                              🔁 {p.name}
                                            </option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="🎯 Mídias de Vitrine">
                                          {assets
                                            .filter((a) => !a.clientId || a.clientId === scr.clientId)
                                            .map((a) => (
                                              <option key={a.id} value={`asset:${a.id}`}>
                                                📺 {a.name}
                                              </option>
                                            ))}
                                        </optgroup>
                                      </select>

                                      {/* Pencil (Edit) & Trash (Unpair) buttons */}
                                      {confirmDeleteScreenId === scr.id ? (
                                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-0.5 h-8 animate-fade-in z-10 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleUnpairScreen(scr.id, true);
                                              setConfirmDeleteScreenId(null);
                                            }}
                                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-black uppercase transition cursor-pointer"
                                            title="Confirmar Exclusão"
                                          >
                                            Sim
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmDeleteScreenId(null);
                                            }}
                                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded text-[10px] font-bold uppercase transition cursor-pointer"
                                            title="Cancelar"
                                          >
                                            Não
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-0.5 bg-white border border-slate-150 rounded-lg p-0.5 h-8">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingScreen(scr);
                                              setEditScreenName(scr.name);
                                              setEditScreenClientId(scr.clientId || '');
                                              setIsEditModalOpen(true);
                                            }}
                                            className="p-1 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 rounded transition"
                                            title="Editar TV e Proprietário"
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setConfirmDeleteScreenId(scr.id);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded transition"
                                            title="Excluir Monitor Permanentemente"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}


                </div>
              )}
            </div>
          )}
        </div>

        {/* Live TV Monitor Simulator Pane (Right) */}
        <div className="lg:col-span-5 space-y-4 shadow-sm bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-1">
                <Monitor className="w-4 h-4 text-indigo-500" />
                Simulador de TV Inteligente
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Veja em tempo real o que está transmitindo no monitor ativo.</p>
            </div>
          </div>

          {selectedScreenId ? (
            (() => {
              const pairedScreen = screens.find((s) => s.id === selectedScreenId);
              if (!pairedScreen) return null;

              return (
                <div className="space-y-4">
                  {/* Outer Frame styled like a thin bezel premium TV display */}
                  <div className="w-full relative bg-slate-950 rounded-lg p-2.5 border border-slate-800 shadow-xl flex flex-col justify-between">
                    <div className="w-full aspect-video rounded bg-black overflow-hidden relative flex flex-col items-center justify-center">
                      
                      {/* Interactive Player Renderer depending on active states */}
                      {pairedScreen.contentType === 'standby' ? (
                        <div className="w-full h-full bg-[#05060c] flex flex-col items-center justify-center text-center p-4 select-none">
                          <Tv className="w-5 h-5 text-amber-500 animate-pulse mb-1 shrink-0" />
                          <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider font-mono">Standby Ativado</span>
                          <span className="text-[8px] text-slate-500 font-medium leading-tight max-w-xs">Smart TV em modo de espera / descanso do cliente.</span>
                        </div>
                      ) : pairedScreen.contentType === 'stopped' ? (
                        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-center p-4 select-none">
                          {/* Color bars preview */}
                          <div className="flex w-24 h-6 border border-slate-900 rounded overflow-hidden opacity-40 mb-1 leading-none mx-auto">
                            <div className="flex-1 bg-white h-full" />
                            <div className="flex-1 bg-yellow-400 h-full" />
                            <div className="flex-1 bg-teal-400 h-full" />
                            <div className="flex-1 bg-emerald-400 h-full" />
                            <div className="flex-1 bg-rose-500 h-full" />
                            <div className="flex-1 bg-blue-600 h-full" />
                          </div>
                          <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider font-mono leading-none mt-1 shadow-xs">Exibição Parada</span>
                          <span className="text-[8px] text-slate-500 mt-0.5">Transmissão interrompida de forma temporária.</span>
                        </div>
                      ) : !simulatedAsset ? (
                        <div className="p-4 w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800/80 text-center select-none space-y-1">
                          <Tv className="w-6 h-6 text-indigo-400 animate-pulse mb-1" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">TV OCIOSA</span>
                          <span className="text-[9px] text-slate-500 max-w-xs leading-normal">Selecione uma Playlist ou Mídia no painel ao lado para transmitir conteúdo em tempo real nesta tela.</span>
                        </div>
                      ) : (
                        <div className="w-full h-full relative flex flex-col justify-center overflow-hidden">
                          {simulatedAsset.type === 'text' && (
                            <div 
                              className="w-full h-full flex flex-col justify-center p-4"
                              style={{ 
                                backgroundColor: simulatedAsset.config?.backgroundColor || '#0f172a',
                                color: simulatedAsset.config?.textColor || '#ffffff'
                              }}
                            >
                              <div 
                                className="text-[10px] font-bold leading-normal whitespace-pre-line"
                                style={{ 
                                  textAlign: simulatedAsset.config?.textAlign || 'center',
                                  fontFamily: simulatedAsset.config?.fontFamily === 'sans' ? 'sans-serif' : simulatedAsset.config?.fontFamily === 'mono' ? 'monospace' : 'serif'
                                }}
                              >
                                {simulatedAsset.content}
                              </div>
                            </div>
                          )}

                          {simulatedAsset.type === 'image' && (
                            <img 
                              src={simulatedAsset.url} 
                              alt="" 
                              className="w-full h-full object-cover animate-fade-in" 
                              referrerPolicy="no-referrer"
                            />
                          )}

                          {simulatedAsset.type === 'video' && (
                            <video 
                              src={simulatedAsset.url} 
                              muted 
                              loop 
                              autoPlay 
                              className="w-full h-full object-cover" 
                            />
                          )}

                          {simulatedAsset.type === 'web' && (
                            <iframe 
                              src={simulatedAsset.url} 
                              title="tv-sim-web"
                              className="w-full h-full border-0 pointer-events-none scale-90" 
                            />
                          )}

                          {/* OSD Ticker Overlay for playlists */}
                          {pairedScreen.contentType === 'playlist' && (
                            <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-xs py-0.5 px-1.5 rounded text-[8px] font-bold text-white tracking-wider uppercase border border-white/5">
                              LOOP PLAYLIST • {playlistIndex + 1}/{playlists.find(p=>p.id===pairedScreen.contentId)?.items.length}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display watermarks */}
                      <div className="absolute bottom-2 right-2 bg-slate-950/70 p-1 rounded border border-white/5 text-[7px] text-slate-300 pointer-events-none uppercase tracking-widest font-mono">
                        VITRION PLAYER
                      </div>
                    </div>

                    {/* Plastic Bezel stand foot at bottom */}
                    <div className="w-10 h-2.5 bg-slate-850 mx-auto mt-1 rounded-sm border-b border-slate-900" />
                    <div className="w-16 h-1 bg-slate-900 mx-auto rounded-sm shrink-0" />
                  </div>

                  <div className="bg-slate-50 border border-slate-150 rounded-lg p-3">
                    <h5 className="text-[11px] font-bold text-slate-700">Painel Físico: {pairedScreen.name}</h5>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-slate-500">
                      <div>
                        <span className="font-medium text-slate-400 block">Canal Ativo</span>
                        <span className="font-bold text-slate-700 capitalize">{pairedScreen.contentType}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-400 block">Sintonizado em</span>
                        <span className="font-bold text-slate-700 truncate block">
                          {pairedScreen.contentType === 'idle' && 'Nenhum'}
                          {pairedScreen.contentType === 'asset' && (assets.find(a=>a.id===pairedScreen.contentId)?.name || 'Desconhecido')}
                          {pairedScreen.contentType === 'playlist' && (playlists.find(p=>p.id===pairedScreen.contentId)?.name || 'Desconhecido')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-10 bg-slate-55 border rounded flex flex-col items-center justify-center text-slate-400 gap-1.5 grayscale">
              <Monitor className="w-8 h-8 opacity-60" />
              <span className="text-[11px] font-bold text-slate-500 leading-none">SEM MONITOR SELECIONADO</span>
              <span className="text-[9px] text-slate-400 max-w-[200px]">Clique em qualquer TV na lista para carregar seu sinal nesta aba de simulação.</span>
            </div>
          )}
        </div>
      </div>

      {/* Screen Editor Modal Panel Dialog */}
      {isEditModalOpen && editingScreen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up select-none">
            
            <header className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                  <Tv className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Definições do Monitor ({editingScreen.pairingCode})</h3>
                  <p className="text-[10px] text-slate-400">Configure o apelido do painel ou vincule a um cliente.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditModalOpen(false); setEditingScreen(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            <form onSubmit={handleSaveScreenDetails} className="p-6 space-y-4">
              {/* Apelido do Painel */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome de Identificação / Apelido *</label>
                <input
                  type="text"
                  required
                  value={editScreenName}
                  onChange={(e) => setEditScreenName(e.target.value)}
                  placeholder="Ex: Painel Lanchonete"
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                />
              </div>

              {/* Cliente Associado */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cliente / Estabelecimento Proprietário</label>
                <select
                  value={editScreenClientId}
                  onChange={(e) => setEditScreenClientId(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition leading-normal"
                >
                  <option value="">-- Vincular a Nenhum (Geral) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.establishmentName} ({c.city} - {c.state})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 leading-normal pt-1">
                  Vincular o monitor a um cliente permite que você rastreie e localize este display facilmente no projeto.
                </p>
              </div>

              {/* Unique stats and timeline details */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[9.5px] text-slate-500 font-mono space-y-1">
                <div><strong>CÓDIGO EXCLUSIVO:</strong> <span className="text-slate-800 font-bold bg-slate-200 px-1 rounded">{editingScreen.pairingCode}</span></div>
                <div><strong>SINTONIZADO EM:</strong> {formatFullDateTime(editingScreen.pairedAt || editingScreen.createdAt)}</div>
                {editingScreen.lastActive && (
                  <div><strong>SINAL ATIVO (PULSO):</strong> {formatFullDateTime(editingScreen.lastActive)}</div>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingScreen(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs hover:shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Client Quick Editor Modal Panel Dialog */}
      {isEditClientModalOpen && editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          {/* ... edit client contents are retained ... */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up select-none">
            
            <header className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                  <Building className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Editar Estabelecimento</h3>
                  <p className="text-[10px] text-slate-400">Atualize os dados e plano contratado do cliente.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditClientModalOpen(false); setEditingClient(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            <form onSubmit={handleSaveClientDetails} className="p-6 space-y-4">
              {/* Nome do Estabelecimento */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome do Estabelecimento *</label>
                <input
                  type="text"
                  required
                  value={editClientEstName}
                  onChange={(e) => setEditClientEstName(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                />
              </div>

              {/* Nome do Responsável */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome do Responsável *</label>
                <input
                  type="text"
                  required
                  value={editClientOwnerName}
                  onChange={(e) => setEditClientOwnerName(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                />
              </div>

              {/* Telefone Responsável */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefone Comercial *</label>
                <input
                  type="text"
                  required
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Cidade */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={editClientCity}
                    onChange={(e) => setEditClientCity(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                  />
                </div>
                {/* Estado */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado (UF) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={editClientState}
                    onChange={(e) => setEditClientState(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Plano */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plano Comercial *</label>
                  <select
                    value={editClientPlanId}
                    onChange={(e) => setEditClientPlanId(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-[11px] text-slate-700 outline-none transition"
                  >
                    <option value="">-- Sem Plano --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Max: {p.maxScreens})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Vencimento */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={editClientVencimento}
                    onChange={(e) => setEditClientVencimento(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsEditClientModalOpen(false); setEditingClient(null); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-xs hover:shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Real-time Smart TV Simulator Modal Dialog */}
      {isSimulatorOpen && simulatorClient && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-white select-none">
          <div className="bg-slate-905 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-scale-up flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]">
            
            {/* Modal Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-650/10 border border-indigo-500/20 flex items-center justify-center text-indigo-450">
                  <Tv className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Vitrion Smart TV Simulator</h3>
                  <p className="text-[10.5px] text-slate-400 font-medium select-text">
                    Estabelecimento: <strong className="text-indigo-400">{simulatorClient.establishmentName}</strong>
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsSimulatorOpen(false);
                  setSimulatorClient(null);
                  setSimulatorScreenId('');
                }}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:grid md:grid-cols-12 gap-6 space-y-6 md:space-y-0 bg-slate-900">
              
              {/* Left Column (Virtual TV Frame) */}
              <div className="md:col-span-7 flex flex-col justify-center items-center">
                <div className="w-full text-center mb-2 flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">
                    SAÍDA DO DISPLAY DIGITAL EM TEMPO REAL
                  </span>
                  {simulatorScreenId && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-mono px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                      Status: Transmitindo
                    </span>
                  )}
                </div>

                <div className="w-full relative py-4 px-2 flex flex-col justify-center items-center">
                  {/* Glowing LED backlighting */}
                  <div className="absolute inset-0 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none scale-75 animate-pulse" />

                  {/* Physical Bezel structure resembling a physical commercial display */}
                  <div className="w-full aspect-video bg-black border-8 border-slate-950 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
                    {/* Top glass reflection */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />

                    {simulatorScreenId ? (
                      <iframe
                        src={`/?mode=player&screenId=${simulatorScreenId}`}
                        title="Vitrion Smart TV Simulator Canvas"
                        className="w-full h-full border-0 select-none pointer-events-auto bg-slate-950"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <Monitor className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Nenhuma TV Sintonizada</h4>
                        <p className="text-[10.5px] text-slate-500 max-w-xs mt-1.5 leading-relaxed font-sans">
                          Este cliente não possui nenhuma TV pareada no momento. Para iniciar a simulação, clique no botão abaixo para gerar uma TV virtual.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCreateVirtualTV(simulatorClient.id)}
                          className="mt-4 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Parear TV Virtual de Testes
                        </button>
                      </div>
                    )}

                    <div className="absolute bottom-1 right-2 z-20 text-[6px] text-white/20 uppercase tracking-widest font-mono">
                      VITRION OS PLAYER v2.4
                    </div>
                  </div>

                  {/* TV Stand Base */}
                  <div className="w-16 h-3 bg-slate-950 rounded-t-xl z-0 shadow-md relative" />
                  <div className="w-32 h-1 bg-slate-950 rounded-full z-0 shadow-inner" />
                </div>

                {simulatorScreenId && (
                  <div className="text-center mt-3 text-[10px] text-slate-400 font-mono">
                    Smart TV ID: <strong className="text-indigo-400 select-all">{simulatorScreenId}</strong> • Conectado à Firebase Firestore
                  </div>
                )}
              </div>

              {/* Right Column (Controls & Infrared Remote Simulator) */}
              <div className="md:col-span-5 flex flex-col justify-between gap-5 border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-6 bg-slate-900">
                
                {/* 1. TV Screen selector dropdown list */}
                <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Selecione qual TV Monitor simular:
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={simulatorScreenId}
                      onChange={(e) => setSimulatorScreenId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-505 cursor-pointer max-w-[200px] md:max-w-none text-ellipsis"
                    >
                      <option value="">-- Escolha uma TV do Cliente --</option>
                      {screens
                        .filter((s) => s.clientId === simulatorClient.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            📺 {s.name} (Cód: {s.pairingCode})
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleCreateVirtualTV(simulatorClient.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-indigo-400 border border-slate-700/60 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer shrink-0"
                      title="Parear uma nova TV virtual de testes para este cliente"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      + CRIAR
                    </button>
                  </div>
                </div>

                {simulatorScreenId ? (
                  <>
                    {/* 2. Media Quick Sintonizer */}
                    <div className="space-y-3 p-4 bg-slate-950/20 rounded-xl border border-slate-850">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                          Sintonizar Conteúdo:
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">Clique para aplicar</span>
                      </div>

                      <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                        {/* List available playlists */}
                        {playlists.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">📋 Playlists Comerciais</span>
                            <div className="flex flex-wrap gap-1.5">
                              {playlists.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => assignContentToScreen(simulatorScreenId, 'playlist', p.id)}
                                  className="px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white rounded text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer transition shrink-0"
                                >
                                  🔁 {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* List available Assets */}
                        {assets.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">🎯 Biblioteca de Mídias Ativas</span>
                            <div className="flex flex-wrap gap-1.5">
                              {assets.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => assignContentToScreen(simulatorScreenId, 'asset', a.id)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-650 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
                                >
                                  <span>{a.type === 'video' ? '🎬' : '📷'}</span>
                                  <span>{a.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Remote Control */}
                    <div className="flex bg-slate-950 rounded-2xl p-4 border border-slate-800 items-center justify-between shadow-lg">
                      <div className="space-y-1 pr-2 flex-1">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-550/10 px-2 py-0.5 rounded border border-indigo-500/15 inline-block">
                          Controle Remoto Simulador
                        </span>
                        <h4 className="text-xs font-bold text-slate-200">IR Remote v2</h4>
                        <p className="text-[9px] text-slate-400 leading-relaxed font-sans mt-1">
                          Pressione os botões do controle ao lado para disparar ações diretas na smart TV via Firestore.
                        </p>
                      </div>

                      {/* Remote Hardware Body Casing */}
                      <div className="w-[105px] bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-col items-center gap-2.5 shadow-xl shrink-0">
                        
                        <div className="flex items-center justify-between w-full px-1">
                          {/* Red Power Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const scr = screens.find(s => s.id === simulatorScreenId);
                              if (scr) {
                                handleTogglePower(simulatorScreenId, scr.contentType, scr.contentId);
                              }
                            }}
                            className="w-7 h-7 bg-red-650 hover:bg-red-550 text-white rounded-full flex items-center justify-center cursor-pointer transition shadow-xl"
                            title="Ligar ou Desligar Monitor"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Standby moon button */}
                          <button
                            type="button"
                            onClick={() => assignContentToScreen(simulatorScreenId, 'standby', '')}
                            className="w-7 h-7 bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 rounded-full flex items-center justify-center cursor-pointer transition"
                            title="Entrar em Modo Standby (Logo)"
                          >
                            💤
                          </button>
                        </div>

                        {/* Physical D-Pad Circle */}
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center relative shadow-inner">
                          <button
                            type="button"
                            onClick={() => assignContentToScreen(simulatorScreenId, 'idle', '')}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-[9px] font-mono font-black shadow-md cursor-pointer transition border border-slate-700"
                            title="Parar / Resetar ao Ocioso"
                          >
                            OK
                          </button>
                          
                          <span className="absolute top-0.5 text-[7px] text-slate-600">▲</span>
                          <span className="absolute bottom-0.5 text-[7px] text-slate-600">▼</span>
                          <span className="absolute left-1 text-[7px] text-slate-600">◀</span>
                          <span className="absolute right-1 text-[7px] text-slate-600">▶</span>
                        </div>

                        {/* Lower layout button panel for decoration */}
                        <div className="grid grid-cols-2 gap-1 w-full">
                          <button
                            type="button"
                            onClick={() => assignContentToScreen(simulatorScreenId, 'idle', '')}
                            className="py-1 px-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded text-[8px] font-bold uppercase transition"
                            title="Zerar exibição"
                          >
                            Ocioso
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const scr = screens.find(s => s.id === simulatorScreenId);
                              if (scr) {
                                assignContentToScreen(simulatorScreenId, scr.contentType, scr.contentId);
                              }
                            }}
                            className="py-1 px-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded text-[8px] font-bold uppercase transition"
                            title="Sincronizar Monitor"
                          >
                            Sync
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-slate-500 py-12 text-center text-[10.5px] font-sans">
                    <Monitor className="w-8 h-8 text-slate-700 mb-2 animate-bounce" />
                    <span>Selecione um monitor acima para carregar o feed do player, e liberar o sintonizador rápido e controle remoto.</span>
                  </div>
                )}

              </div>

            </div>

            {/* Modal Footer */}
            <footer className="p-3 bg-slate-950 shrink-0 text-center border-t border-slate-800 text-[10px] text-slate-500 flex justify-between px-6 items-center">
              <span>Para rodar o player em tela cheia no dispositivo real, pegue o código da TV na lista e use o modo Parear Player.</span>
              <button
                type="button"
                onClick={() => {
                  setIsSimulatorOpen(false);
                  setSimulatorClient(null);
                  setSimulatorScreenId('');
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-extrabold uppercase transition cursor-pointer"
              >
                Fechar Simulador
              </button>
            </footer>

          </div>
        </div>
      )}

    </div>
  );
}
