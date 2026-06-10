import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, logAdminAction } from '../lib/firebase';
import { Client } from '../types';
import { 
  Search, Plus, Pencil, Trash2, Phone, MessageSquare, 
  MapPin, ShieldAlert, User, Mail, Eye, EyeOff, 
  Building, CheckCircle, X, RefreshCw, AlertTriangle,
  Play, VideoOff, Tv
} from 'lucide-react';

// Error monitoring based on firebase-integration skill
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ClientRegistryProps {
  onImpersonate?: (client: Client) => void;
}

export default function ClientRegistry({ onImpersonate }: ClientRegistryProps) {
  const [clients, setClients] = useState<Client[]>([]);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Form Field States
  const [establishmentName, setEstablishmentName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState(''); // Estado
  const [cep, setCep] = useState(''); // CEP (ZIP Code)
  const [planId, setPlanId] = useState(''); // Associated plan selection
  const [vencimento, setVencimento] = useState(''); // Data de Vencimento

  const [plans, setPlans] = useState<any[]>([]); // Dynamic plans array
  const [screens, setScreens] = useState<any[]>([]); // Dynamic screens array for administrator TV overrides

  // Phone and WhatsApp number formats: 'PT' (Portuguese/Brazilian format) or 'EN' (English/American/International format)
  const [phoneFormat, setPhoneFormat] = useState<'PT' | 'EN'>('PT');
  const [whatsappFormat, setWhatsappFormat] = useState<'PT' | 'EN'>('PT');

  const formatToPT = (val: string) => {
    // Only allow numbers and the + symbol
    const cleaned = ('' + val).replace(/[^\d+]/g, '');
    
    // Country code for Brazil
    if (cleaned.startsWith('+55')) {
      const nums = cleaned.slice(3).replace(/\D/g, '');
      if (nums.length <= 2) return `+55 (${nums}`;
      if (nums.length <= 7) return `+55 (${nums.slice(0, 2)}) ${nums.slice(2)}`;
      return `+55 (${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
    }
    
    // Country code for Portugal
    if (cleaned.startsWith('+351')) {
      const nums = cleaned.slice(4).replace(/\D/g, '');
      if (nums.length <= 3) return `+351 ${nums}`;
      if (nums.length <= 6) return `+351 ${nums.slice(0, 3)} ${nums.slice(3)}`;
      return `+351 ${nums.slice(0, 3)} ${nums.slice(3, 6)} ${nums.slice(6, 9)}`;
    }

    // Default local Brazilian format
    const numsOnly = cleaned.replace(/\D/g, '');
    if (numsOnly.length === 0) return '';
    if (numsOnly.length <= 2) return `(${numsOnly}`;
    if (numsOnly.length <= 6) return `(${numsOnly.slice(0, 2)}) ${numsOnly.slice(2)}`;
    if (numsOnly.length <= 10) return `(${numsOnly.slice(0, 2)}) ${numsOnly.slice(2, 6)}-${numsOnly.slice(6)}`;
    return `(${numsOnly.slice(0, 2)}) ${numsOnly.slice(2, 7)}-${numsOnly.slice(7, 11)}`;
  };

  const formatToEN = (val: string) => {
    const cleaned = ('' + val).replace(/[^\d+]/g, '');
    
    // Country code for USA / Canada
    if (cleaned.startsWith('+1')) {
      const nums = cleaned.slice(2).replace(/\D/g, '');
      if (nums.length === 0) return '+1';
      if (nums.length <= 3) return `+1 (${nums}`;
      if (nums.length <= 6) return `+1 (${nums.slice(0, 3)}) ${nums.slice(3)}`;
      return `+1 (${nums.slice(0, 3)}) ${nums.slice(3, 6)}-${nums.slice(6, 10)}`;
    }
    
    // Country code for United Kingdom
    if (cleaned.startsWith('+44')) {
      const nums = cleaned.slice(3).replace(/\D/g, '');
      if (nums.length === 0) return '+44';
      if (nums.length <= 4) return `+44 ${nums}`;
      return `+44 ${nums.slice(0, 4)} ${nums.slice(4, 10)}`;
    }

    // Standard EN layout (XXX) XXX-XXXX
    const numsOnly = cleaned.replace(/\D/g, '');
    if (numsOnly.length === 0) return '';
    if (numsOnly.length <= 3) return `(${numsOnly}`;
    if (numsOnly.length <= 6) return `(${numsOnly.slice(0, 3)}) ${numsOnly.slice(3)}`;
    return `(${numsOnly.slice(0, 3)}) ${numsOnly.slice(3, 6)}-${numsOnly.slice(6, 10)}`;
  };

  const handlePhoneChange = (val: string) => {
    if (phoneFormat === 'PT') {
      setPhone(formatToPT(val));
    } else {
      setPhone(formatToEN(val));
    }
  };

  const handleWhatsappChange = (val: string) => {
    if (whatsappFormat === 'PT') {
      setWhatsapp(formatToPT(val));
    } else {
      setWhatsapp(formatToEN(val));
    }
  };

  const renderPhoneWithFlag = (num: string) => {
    if (!num) return <span className="text-slate-400 italic">Nenhum</span>;
    
    const isEN = num.startsWith('+1') || (num.startsWith('(') && num.indexOf(')') === 4);
    const isUK = num.startsWith('+44');
    const isPT = num.startsWith('+351');
    const isBR = num.startsWith('+55') || (!isEN && !isUK && !isPT);

    let flag = '🇧🇷';
    let label = 'Portugal/Brasil';
    if (isEN) {
      flag = '🇺🇸';
      label = 'Inglês (EUA)';
    } else if (isUK) {
      flag = '🇬🇧';
      label = 'Inglês (Reino Unido)';
    } else if (isPT) {
      flag = '🇵🇹';
      label = 'Português (Portugal)';
    } else if (isBR) {
      flag = '🇧🇷';
      label = 'Português (Brasil)';
    }

    return (
      <span className="inline-flex items-center gap-1.5 font-sans">
        <span className="text-xs shrink-0 select-none cursor-help" title={label}>
          {flag}
        </span>
        <span className="font-mono text-[10px] font-semibold text-slate-700 tracking-tight">{num}</span>
      </span>
    );
  };

  // Synchronize available plan layouts
  useEffect(() => {
    const plansCollection = collection(db, 'plans');
    const unsubscribe = onSnapshot(
      plansCollection,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        setPlans(list);
      },
      (err) => {
        console.error('Error loading plans in ClientRegistry:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Synchronize screens for administrator control override
  useEffect(() => {
    const screensCollection = collection(db, 'screens');
    const unsubscribe = onSnapshot(
      screensCollection,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setScreens(list);
      },
      (err) => {
        console.error('Error loading screens in ClientRegistry:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Monitor client records for all users (administrator total access)
  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const path = 'clients';
    
    // Querying clients directly without the ownerId filter to grant the network manager total client oversight
    const q = query(
      collection(db, path)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cls: Client[] = [];
        snapshot.forEach((docSnap) => {
          cls.push({ id: docSnap.id, ...docSnap.data() } as Client);
        });
        
        // Sort alphabetically by establishmentName
        cls.sort((a, b) => a.establishmentName.localeCompare(b.establishmentName));
        
        setClients(cls);
        setIsLoading(false);
        setErrorText('');
      },
      (err) => {
        setIsLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, path);
        } catch (wrappedError: any) {
          setErrorText('Erro de permissão ao recuperar registros de clientes. Verifique o console.');
        }
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const openAddModal = () => {
    setEditingClient(null);
    setEstablishmentName('');
    setPhone('');
    setWhatsapp('');
    setUsername('');
    setPassword('');
    setEmail('');
    setAddress('');
    setCity('');
    setStateCode('');
    setCep('');
    setPlanId('');
    setVencimento('');
    setPhoneFormat('PT');
    setWhatsappFormat('PT');
    setErrorText('');
    setSuccessText('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEstablishmentName(client.establishmentName);
    setPhone(client.phone);
    setWhatsapp(client.whatsapp || '');
    setUsername(client.username);
    setPassword(client.password || '');
    setEmail(client.email);
    setAddress(client.address);
    setCity(client.city);
    setStateCode(client.state);
    setCep(client.cep || '');
    setPlanId(client.planId || '');
    setVencimento(client.vencimento || '');
    
    // Auto-detect phone / whatsapp formats
    const isPhoneEN = client.phone?.startsWith('+1') || (client.phone?.startsWith('(') && client.phone?.charAt(4) === ')');
    setPhoneFormat(isPhoneEN ? 'EN' : 'PT');

    const isWpEN = client.whatsapp?.startsWith('+1') || (client.whatsapp?.startsWith('(') && client.whatsapp?.charAt(4) === ')');
    setWhatsappFormat(isWpEN ? 'EN' : 'PT');

    setErrorText('');
    setSuccessText('');
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');

    if (!currentUserId) {
      setErrorText('Sessão de administrador não identificada. Autentique-se novamente.');
      return;
    }

    // Validation
    if (!establishmentName.trim() || establishmentName.length < 2) {
      setErrorText('Insira o nome do estabelecimento (mínimo 2 caracteres).');
      return;
    }
    if (!username.trim() || username.length < 2) {
      setErrorText('Insira o usuário do cliente (mínimo 2 caracteres).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorText('Insira um e-mail válido.');
      return;
    }
    if (!phone.trim()) {
      setErrorText('Insira o telefone comercial.');
      return;
    }
    if (!planId) {
      setErrorText('Selecione o plano tarifário para o estabelecimento.');
      return;
    }

    const path = 'clients';
    const clientId = editingClient ? editingClient.id : `client_${Date.now()}`;

    const clientPayload = {
      establishmentName: establishmentName.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      username: username.trim(),
      password: password.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state: stateCode.trim().toUpperCase(),
      cep: cep.trim(),
      planId: planId,
      vencimento: vencimento.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingClient) {
        // Safe update following Zero-Trust strict keys
        const docRef = doc(db, path, clientId);
        await updateDoc(docRef, clientPayload);
        setSuccessText('Cliente atualizado com sucesso!');
        await logAdminAction(
          'UPDATE_CLIENT', 
          `Cliente: ${establishmentName}`, 
          `Atualizou dados cadastrais do estabelecimento "${establishmentName}".`
        );
      } else {
        // Complete create snapshot
        const docRef = doc(db, path, clientId);
        await setDoc(docRef, {
          ...clientPayload,
          id: clientId,
          ownerId: currentUserId,
          createdAt: serverTimestamp()
        });
        setSuccessText('Cliente registrado com sucesso!');
        await logAdminAction(
          'CREATE_CLIENT', 
          `Cliente: ${establishmentName}`, 
          `Registrou o estabelecimento "${establishmentName}" (${username}) com o plano tierID: ${planId}.`
        );
      }

      // Close modal on brief delay
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessText('');
      }, 1000);

    } catch (err) {
      console.error(err);
      try {
        const op = editingClient ? OperationType.UPDATE : OperationType.CREATE;
        handleFirestoreError(err, op, `${path}/${clientId}`);
      } catch (wrapped: any) {
        setErrorText('Erro de gravação no banco de dados. Campos inválidos ou permissão negada.');
      }
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover o registro deste cliente? Esta ação não pode ser desfeita.')) {
      return;
    }

    setErrorText('');
    setSuccessText('');
    const path = 'clients';

    try {
      const docRef = doc(db, path, clientId);
      const clientName = clients.find(c => c.id === clientId)?.establishmentName || clientId;
      await deleteDoc(docRef);
      setSuccessText('Cliente removido com sucesso!');
      await logAdminAction(
        'DELETE_CLIENT', 
        `Cliente ID: ${clientId}`, 
        `Removeu o estabelecimento associado "${clientName}" e desativou as TVs conectadas a ele.`
      );
      setTimeout(() => setSuccessText(''), 3000);
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${clientId}`);
      } catch (wrapped: any) {
        setErrorText('Não foi possível remover o registro do cliente.');
      }
    }
  };

  const togglePasswordVisibility = (clientId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));
  };

  const handleStopExibicao = async (clientId: string) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      alert('Nenhuma TV vinculada a este cliente para parar a exibição.');
      return;
    }
    if (!window.confirm('Tem certeza de que deseja parar a exibição de todas as TVs deste cliente? (Elas entrarão em modo Standby)')) return;
    try {
      setErrorText('');
      setSuccessText('');
      for (const screen of clientScreens) {
        await updateDoc(doc(db, 'screens', screen.id), {
          contentType: 'standby',
          updatedAt: serverTimestamp()
        });
      }
      setSuccessText('Exibição de todas as TVs do cliente interrompida (colocadas em Standby)!');
      setTimeout(() => setSuccessText(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorText('Erro ao interromper a exibição das TVs.');
    }
  };

  const handleAtivarExibicao = async (clientId: string) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      alert('Nenhuma TV vinculada a este cliente para ativar a exibição.');
      return;
    }
    try {
      setErrorText('');
      setSuccessText('');
      for (const screen of clientScreens) {
        await updateDoc(doc(db, 'screens', screen.id), {
          contentType: 'idle',
          updatedAt: serverTimestamp()
        });
      }
      setSuccessText('Exibição de todas as TVs do cliente ativada com sucesso!');
      setTimeout(() => setSuccessText(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorText('Erro ao ativar a exibição das TVs.');
    }
  };

  const handleRemoverExibicao = async (clientId: string) => {
    const clientScreens = screens.filter(s => s.clientId === clientId);
    if (clientScreens.length === 0) {
      alert('Nenhuma TV de cliente vinculada.');
      return;
    }
    if (!window.confirm('Tem certeza de que deseja desvincular TODAS as TVs integradas a este cliente? Elas serão removidas da exibição e retornarão ao modo de pareamento original.')) return;
    try {
      setErrorText('');
      setSuccessText('');
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
      setSuccessText('Todas as TVs do cliente foram removidas da exibição com sucesso!');
      setTimeout(() => setSuccessText(''), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorText('Erro ao remover as TVs da exibição do cliente.');
    }
  };

  // Filter clients by search terms (establishmentName, phone, username, city, state, cep)
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    const estName = (c.establishmentName || '').toLowerCase();
    const phoneNum = c.phone || '';
    const whatsappNum = c.whatsapp || '';
    const uName = (c.username || '').toLowerCase();
    const emailAddr = (c.email || '').toLowerCase();
    const cityName = (c.city || '').toLowerCase();
    const stateName = (c.state || '').toLowerCase();
    const zipCode = (c.cep || '').toLowerCase();

    return (
      estName.includes(term) ||
      phoneNum.includes(term) ||
      whatsappNum.includes(term) ||
      uName.includes(term) ||
      emailAddr.includes(term) ||
      cityName.includes(term) ||
      stateName.includes(term) ||
      zipCode.includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header section with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xxs">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-500" />
            Registro de Clientes e Estabelecimentos
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie as contas de acesso, contatos de suporte e endereços das lojas que transmitem sua sinalização.
          </p>
        </div>
        <button
          onClick={openAddModal}
          id="btn-add-client"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Novo Cliente
        </button>
      </div>

      {/* Global alert messages */}
      {errorText && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-fade-in shadow-xxs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <strong className="block">Alerta de Segurança / Erro</strong>
            <p className="leading-relaxed">{errorText}</p>
          </div>
        </div>
      )}

      {successText && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-xxs">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successText}</span>
        </div>
      )}

      {/* Filter and Search rail */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xxs">
        <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type="text"
          id="search-clients-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por estabelecimento, usuário, e-mail, telefone, cidade ou estado..."
          className="flex-1 bg-transparent border-0 outline-none placeholder-slate-400 text-xs text-slate-700 focus:ring-0"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="text-slate-400 hover:text-slate-600 text-xs font-mono px-1.5 py-0.5 hover:bg-slate-100 rounded"
          >
            Limpar
          </button>
        )}
      </div>

      {/* List content loader or empty state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-450">Sincronizando registros...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xxs p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <User className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">Nenhum cliente cadastrado</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchTerm 
                ? 'Nenhum resultado corresponde à sua pesquisa atual. Tente outros termos.'
                : 'Cadastre os dados de contato de estabelecimentos comerciais, usuários e senhas para obter um painel organizado e limpo.'
              }
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Primeiro Cliente
            </button>
          )}
        </div>
      ) : (
        /* Responsive list grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const hasPassword = !!client.password;
            const reveal = !!showPasswordMap[client.id];
            
            return (
              <div 
                key={client.id}
                id={`client-card-${client.id}`}
                className="bg-white border border-slate-200 hover:border-slate-350 rounded-xl p-5 shadow-xxs hover:shadow-xs transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top: title and action buttons */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{client.establishmentName}</h4>
                      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-350" />
                        Usuário: <span className="font-semibold text-slate-600">{client.username}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      <button
                        onClick={() => openEditModal(client)}
                        title="Editar Registro e Plano do Cliente"
                        className="group flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 hover:border-indigo-500 bg-indigo-50/70 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg transition-all duration-200 text-[11px] font-bold cursor-pointer shadow-xs shadow-indigo-100"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0 text-indigo-650 group-hover:text-white transition-colors duration-200" />
                        <span>Editar Cliente</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        title="Deletar Registro"
                        className="p-1.5 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2.5 text-xs">
                    {/* Contacts: Phone / WhatsApp */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-150/40 p-2 rounded-lg space-y-0.5">
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Telefone</span>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-400 shrink-0" />
                          {renderPhoneWithFlag(client.phone)}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-150/40 p-2 rounded-lg space-y-0.5">
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block">WhatsApp</span>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-500 shrink-0" />
                          {renderPhoneWithFlag(client.whatsapp || '')}
                        </div>
                      </div>
                    </div>

                    {/* Plan contract summary */}
                    <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg flex flex-col gap-1.5 estimation-block">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Plano Contratado</span>
                            <button
                              type="button"
                              onClick={() => openEditModal(client)}
                              title="Editar Plano de Displays e Registro"
                              className="text-indigo-400 hover:text-indigo-600 transition p-0.5 cursor-pointer"
                            >
                              <Pencil className="w-[11px] h-[11px] hover:scale-110 duration-155" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-indigo-805 block">
                            {(() => {
                              const pl = plans.find(p => p.id === client.planId);
                              if (!pl) return 'Nenhum Plano Assinado';
                              return pl.name;
                            })()}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Preço / Limite</span>
                          <span className="text-[10px] font-bold text-slate-700 font-mono block">
                            {(() => {
                              const pl = plans.find(p => p.id === client.planId);
                              if (!pl) return '0 TVs';
                              const priceStr = pl.price !== null ? `R$ ${pl.price.toFixed(2)}` : 'Em Aberto';
                              return `${priceStr} (${pl.maxScreens} ${pl.maxScreens === 1 ? 'TV' : 'TVs'})`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Expiration/Vencimento sub-row */}
                      <div className="border-t border-indigo-100/50 pt-1.5 flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-slate-400">📅 Vencimento do Plano:</span>
                        <span className="font-bold font-mono text-indigo-700">
                          {(() => {
                            if (!client.vencimento) return 'Sem Vencimento';
                            const parts = client.vencimento.split('-');
                            if (parts.length === 3) {
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                            return client.vencimento;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2 text-[10.5px] bg-slate-50 border border-slate-150/30 px-2 py-1.5 rounded-lg text-slate-600 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={client.email}>{client.email}</span>
                    </div>

                    {/* Credentials reveal secure block */}
                    <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-150/30 px-2 py-1 rounded-lg text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8px] font-bold text-slate-400 uppercase tracking-wider">Senha:</span>
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {hasPassword ? (reveal ? client.password : '••••••••') : 'Não Configurada'}
                        </span>
                      </div>
                      {hasPassword && (
                        <button
                          onClick={() => togglePasswordVisibility(client.id)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          {reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Address metadata */}
                    <div className="flex items-start gap-2 text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Endereço (Padrão US)</span>
                        <p className="truncate text-slate-600 leading-snug font-medium" title={client.address}>
                          {client.address || 'Endereço não cadastrado'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {client.city ? `${client.city}, ${client.state}${client.cep ? ` ${client.cep}` : ''}` : (client.state || 'Sem Estado')}
                        </p>
                      </div>
                    </div>

                    {/* Admin Display Controls */}
                    {(() => {
                      const clientScreens = screens.filter(s => s.clientId === client.id);
                      const screenCount = clientScreens.length;
                      const activeCount = clientScreens.filter(s => s.contentType !== 'standby').length;

                      return (
                        <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-indigo-600 font-mono uppercase tracking-wider flex items-center gap-1">
                              <Tv className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              Controle das TVs ({screenCount})
                            </span>
                            {screenCount > 0 ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-750 text-[9px] font-bold rounded border border-emerald-250 font-mono">
                                {activeCount} Ativa(s)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded border border-slate-200 font-mono">
                                Nenhuma TV
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 pt-0.5">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStopExibicao(client.id)}
                                disabled={screenCount === 0}
                                title="Parar exibição das TVs vinculadas (Standby)"
                                className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 disabled:bg-slate-50 border border-amber-200 disabled:border-slate-150 disabled:opacity-40 text-amber-700 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <VideoOff className="w-3.5 h-3.5 shrink-0" />
                                <span>Parar Exibição</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAtivarExibicao(client.id)}
                                disabled={screenCount === 0}
                                title="Ativar exibição das TVs vinculadas (Ativo)"
                                className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-50 border border-emerald-200 disabled:border-slate-150 disabled:opacity-40 text-emerald-700 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 shrink-0" />
                                <span>Ativar Exibição</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoverExibicao(client.id)}
                              disabled={screenCount === 0}
                              title="Remover e desvincular todas as TVs deste cliente"
                              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 disabled:bg-slate-50 border border-rose-200 disabled:border-slate-150 disabled:opacity-40 text-rose-700 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer w-full"
                            >
                              <Tv className="w-3.5 h-3.5 shrink-0" />
                              <span>Remover Exibição</span>
                            </button>
                          </div>

                          {/* Client Portal Impersonation Access block (Monitores, Mídias, Playlists) */}
                          <div className="bg-slate-55 border border-slate-200 p-3 rounded-xl space-y-1.5 mt-2 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50">
                            <span className="text-[9px] font-bold text-indigo-700 font-mono uppercase tracking-wider block">Controle do Cliente</span>
                            <p className="text-[10px] text-slate-550 leading-tight">
                              Gerencie a <strong className="text-slate-700 font-semibold">Biblioteca de Mídias</strong>, configure as <strong className="text-slate-700 font-semibold">Playlists de Loop</strong> e controle os <strong className="text-slate-700 font-semibold">Monitores & TVs</strong> deste cliente acessando diretamente o terminal dele:
                            </p>
                            {onImpersonate && (
                              <button
                                type="button"
                                onClick={() => onImpersonate(client)}
                                className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-650 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer w-full shadow-xs hover:shadow-md hover:scale-[1.01]"
                              >
                                <Tv className="w-3.5 h-3.5" />
                                <span>Acessar Painel do Cliente</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Card footer metrics if any */}
                <div className="text-[8px] text-slate-400 text-right mt-3 pt-1 border-t border-slate-100 font-mono select-none">
                  Cadastrado em: {client.createdAt?.toDate ? client.createdAt.toDate().toLocaleDateString('pt-BR') : 'Novos Dados'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up select-none max-h-[90vh] flex flex-col">
            
            {/* Modal header */}
            <header className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingClient ? 'Atualizar Dados do Cliente' : 'Registrar Novo Cliente'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Preencha com atenção todos os campos de identificação.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </header>

            {/* Modal body (scrollable content) */}
            <form onSubmit={handleSaveClient} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Section 1: Informações Gerais / Contact Details (US CRM Standard Format) */}
              <div className="space-y-4 pt-1 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block border-b border-slate-200 pb-1.5">
                  1. Detalhes de Contato Comercial
                </span>

                {/* Establishment name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nome do Estabelecimento / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    placeholder="Ex: Mercadinho Alvorada LTDA"
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Endereço de E-mail de Suporte *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contato@mercadinhoalvorada.com"
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                  />
                </div>

                {/* Phone + WhatsApp with Format Selectors (Portuguese and English) */}
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Telefone Comercial *
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneFormat('PT');
                            setPhone(formatToPT(phone));
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                            phoneFormat === 'PT'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Padrão Português (Brasil / Portugal)"
                        >
                          PT 🇧🇷
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneFormat('EN');
                            setPhone(formatToEN(phone));
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                            phoneFormat === 'EN'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Padrão Inglês (EUA / Reino Unido)"
                        >
                          EN 🇺🇸
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={
                        phoneFormat === 'PT'
                          ? 'Ex: (27) 3222-1111 ou +55 / +351'
                          : 'Ex: (555) 019-2834 ou +1 / +44'
                      }
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition font-mono"
                    />
                    <p className="text-[8.5px] text-slate-400 leading-tight">
                      {phoneFormat === 'PT' 
                        ? 'Formato: (DD) Número (BR) ou +351 (PT)' 
                        : 'Formato: (Area) Number (US) ou +44 (UK)'}
                    </p>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        WhatsApp de Suporte
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappFormat('PT');
                            setWhatsapp(formatToPT(whatsapp));
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                            whatsappFormat === 'PT'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Padrão Português (Brasil / Portugal)"
                        >
                          PT 🇧🇷
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWhatsappFormat('EN');
                            setWhatsapp(formatToEN(whatsapp));
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                            whatsappFormat === 'EN'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title="Padrão Inglês (EUA / Reino Unido)"
                        >
                          EN 🇺🇸
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={whatsapp}
                      onChange={(e) => handleWhatsappChange(e.target.value)}
                      placeholder={
                        whatsappFormat === 'PT'
                          ? 'Ex: (27) 99999-8888 ou +55 / +351'
                          : 'Ex: (555) 019-2834 ou +1 / +44'
                      }
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition font-mono"
                    />
                    <p className="text-[8.5px] text-slate-400 leading-tight">
                      {whatsappFormat === 'PT'
                        ? 'Formato: (DD) Celular (BR) ou +351 (PT)'
                        : 'Formato: (Area) Mobile (US) ou +44 (UK)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1.5: Plano de Sinalização Adquirido */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <div className="border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block">
                    1.5 Plano de Displays Adquirido *
                  </span>
                  <span className="text-[9px] text-indigo-600 font-bold">1 até 7 Displays Máx</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Escolha o Plano Comercial *
                  </label>
                  <select
                    required
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition font-medium"
                  >
                    <option value="">Selecione o plano adquirido...</option>
                    {plans
                      .filter(p => p.price !== null || p.id === planId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {p.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês ({p.maxScreens} {p.maxScreens === 1 ? 'Display Máx' : 'Displays Máx'})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1 mt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Data de Vencimento do Plano *
                  </label>
                  <input
                    type="date"
                    required
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition font-medium"
                  />
                  <p className="text-[8.5px] text-slate-400 leading-normal pt-0.5">
                    Selecione a data de vencimento da assinatura do cliente para relatórios e controle de sinal.
                  </p>
                </div>
              </div>

              {/* Section 2: Credenciais do Administrador do Player */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block border-b border-slate-200 pb-1.5">
                  2. Credenciais de Controle / Acesso
                </span>

                {/* Client credentials row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Usuário de Login *
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ex: alvoradapdv"
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Senha de Acesso
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ex: alvorada@2026"
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Endereço Comercial no Padrão Americano (Street / City / ST / ZIP) */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                <div className="border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest block">
                    3. Localização (Padrão Postal US)
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">Formato: Street, City, State ZIP</span>
                </div>

                {/* Physical Street address / Line 1 */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Endereço Principal / Logradouro (Street Address)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Av. Dante Michelini, 1200 - Camburi"
                    className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                  />
                </div>

                {/* US structure line 2: City | State (ST) | ZIP Code (CEP) */}
                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cidade (City)
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Vitória"
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center truncate">
                      UF (ST)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      placeholder="ES"
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-1 py-2 text-xs text-slate-700 outline-none transition uppercase text-center font-bold"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      CEP (ZIP Code)
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="Ex: 29060-220"
                      className="w-full bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none transition text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Inline Alerts */}
              {errorText && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorText}</span>
                </div>
              )}

              {successText && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>{successText}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-5 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 hover:shadow-md text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  {editingClient ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
