import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Building, Phone, MessageSquare, MapPin, Mail, Eye, EyeOff, 
  User, Key, Tv, ShieldAlert, CheckCircle, Loader2, ArrowLeft, CheckCircle2
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number | null;
  maxScreens: number;
}

interface ClientSelfRegistrationProps {
  onClose: () => void;
  onSuccess: (username: string) => void;
}

export default function ClientSelfRegistration({ onClose, onSuccess }: ClientSelfRegistrationProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [establishmentName, setEstablishmentName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [cep, setCep] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  // Status indicators
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Synchronize available active plan layouts
  useEffect(() => {
    const plansRef = collection(db, 'plans');
    const unsubscribe = onSnapshot(plansRef, (snapshot) => {
      const list: Plan[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Plan);
      });
      // Sort plans by id order
      list.sort((a, b) => a.id.localeCompare(b.id));
      
      // Filter out plans with "em aberto" / null prices
      const activePlans = list.filter(p => p.price !== null && p.price !== undefined);
      setPlans(activePlans);
      
      if (activePlans.length > 0) {
        setSelectedPlanId(activePlans[0].id);
      }
      setLoadingPlans(false);
    }, (err) => {
      console.error('Error loading plans in SelfRegistration:', err);
      setLoadingPlans(false);
    });

    return () => unsubscribe();
  }, []);

  // Autofill address via CEP API (viacep)
  const handleCepBlur = async () => {
    const cleanedCep = cep.replace(/[^\d]/g, '');
    if (cleanedCep.length === 8) {
      try {
        setErrorText('');
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress(data.logradouro || '');
          setCity(data.localidade || '');
          setStateCode(data.uf || '');
        } else {
          setErrorText('CEP não encontrado. Digite os dados manualmente.');
        }
      } catch (e) {
        console.warn('Falha ao buscar CEP automaticamente:', e);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setSuccessText('');

    // Pre-validations
    if (!establishmentName.trim() || establishmentName.length < 2) {
      setErrorText('Insira o nome do estabelecimento (mínimo 2 caracteres).');
      return;
    }
    if (!username.trim() || username.length < 3) {
      setErrorText('Insira um nome de usuário válido (mínimo 3 caracteres).');
      return;
    }
    // Prevent client usernames that contain spaces
    if (/\s/.test(username.trim())) {
      setErrorText('O nome de usuário não pode conter espaços.');
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
    if (!password.trim() || password.length < 4) {
      setErrorText('Escolha uma senha de acesso segura (mínimo 4 caracteres).');
      return;
    }
    if (!selectedPlanId) {
      setErrorText('Por favor, selecione um plano para continuar.');
      return;
    }

    setSaving(true);

    try {
      // 1. Verify username uniqueness
      const q = query(
        collection(db, 'clients'),
        where('username', '==', username.trim().toLowerCase())
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        setErrorText('Este nome de usuário já está sendo utilizado por outro estabelecimento.');
        setSaving(false);
        return;
      }

      // 2. Generate a custom client ID
      const clientId = `client_${Date.now()}`;
      
      // 3. Compute default vencimento (30 days from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const vencimentoString = futureDate.toISOString().split('T')[0]; // Format standard YYYY-MM-DD

      // 4. Save to Firestore
      const docRef = doc(db, 'clients', clientId);
      await setDoc(docRef, {
        id: clientId,
        establishmentName: establishmentName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateCode.trim().toUpperCase(),
        cep: cep.trim(),
        planId: selectedPlanId,
        vencimento: vencimentoString,
        ownerId: 'self-registered', // flag that client registered themselves
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSuccessText('Inscrição realizada com sucesso! Redirecionando...');
      setSaving(false);

      setTimeout(() => {
        onSuccess(username.trim().toLowerCase());
      }, 1800);

    } catch (err: any) {
      console.error('Self registration error: ', err);
      setErrorText('Não foi possível registrar sua conta. Tente novamente ou fale com nosso suporte.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div 
        id="modal-self-registration"
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-up text-white max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Voltar ao Login"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold tracking-tight">Crie sua Conta de Parceiro</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Cadastre seu estabelecimento inteligente na rede Vitrion</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400">
            <Tv className="w-4 h-4" />
          </div>
        </div>

        {/* Modal Scroll Container */}
        <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Status alerts */}
          {errorText && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorText}</p>
            </div>
          )}

          {successText && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="leading-snug font-bold">{successText}</p>
            </div>
          )}

          {/* Section 1: Dados do Estabelecimento */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-400 font-mono">1. Dados do Estabelecimento</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Estabelecimento *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: Padaria Alvorada Real"
                  value={establishmentName}
                  onChange={(e) => setEstablishmentName(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Telefone Comercial *</label>
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-md border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneFormat('PT');
                        setPhone(formatToPT(phone));
                      }}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                        phoneFormat === 'PT'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
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
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                      title="Padrão Inglês (EUA / Reino Unido)"
                    >
                      EN 🇺🇸
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={
                      phoneFormat === 'PT'
                        ? 'Ex: (11) 4567-8910'
                        : 'Ex: (555) 019-2834'
                    }
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
                <p className="text-[8.5px] text-slate-500 leading-tight">
                  {phoneFormat === 'PT' ? 'Formato: (DD) Número (BR)' : 'Formato: (Area) Number (US)'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp de Campanhas</label>
                  <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-md border border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappFormat('PT');
                        setWhatsapp(formatToPT(whatsapp));
                      }}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                        whatsappFormat === 'PT'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
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
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                      title="Padrão Inglês (EUA / Reino Unido)"
                    >
                      EN 🇺🇸
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder={
                      whatsappFormat === 'PT'
                        ? 'Ex: (11) 99999-8888'
                        : 'Ex: (555) 019-2834'
                    }
                    value={whatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
                <p className="text-[8.5px] text-slate-500 leading-tight">
                  {whatsappFormat === 'PT' ? 'Formato: (DD) Celular (BR)' : 'Formato: (Area) Number (US)'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail de Contato *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="Ex: contato@padariaalvorada.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Localização */}
          <div className="space-y-3 pt-1 border-t border-white/5">
            <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-400 font-mono">2. Localização do Ponto de Venda</h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CEP</label>
                <input
                  type="text"
                  placeholder="CEP"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={handleCepBlur}
                  className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço Comercial</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rua, Número, Bairro"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1 col-span-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cidade</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">UF</label>
                <input
                  type="text"
                  placeholder="UF"
                  maxLength={2}
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-center text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Plano Escolhido */}
          <div className="space-y-3 pt-1 border-t border-white/5">
            <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-400 font-mono">3. Escolha o Plano das TVs</h3>
            {loadingPlans ? (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono">Carregando planos de TVs disponíveis...</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="text-xs text-slate-400 border border-slate-800 p-3 bg-slate-955 rounded-xl">
                Nenhum plano configurado para contratação pública nesta rede no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-3 text-left rounded-xl transition border flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-md text-white' 
                          : 'bg-slate-950/40 border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="selectedPlan"
                          checked={isSelected}
                          onChange={() => setSelectedPlanId(p.id)}
                          className="w-3.5 h-3.5 text-indigo-500 bg-slate-950 border-white/20 select-none pointer-events-none"
                        />
                        <div>
                          <p className="font-bold text-xs">{p.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Suporta até <strong className="text-slate-300 font-bold">{p.maxScreens}</strong> {p.maxScreens === 1 ? 'tela de TV simulada' : 'telas de TVs'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-[9px] font-normal text-slate-500 font-sans">/mês</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Acesso ao Painel */}
          <div className="space-y-3 pt-1 border-t border-white/5">
            <h3 className="text-xs font-bold tracking-wider uppercase text-indigo-400 font-mono">4. Credenciais de Acesso</h3>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Usuário de Login *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: alvoradapdv"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Senha de Acesso *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 4 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2 text-xs text-white outline-none transition focus:ring-1 focus:ring-indigo-500/30 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-slate-955/80 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/10 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Voltar
          </button>
          
          <button
            type="button"
            onClick={handleRegisterSubmit}
            disabled={saving || loadingPlans}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <span>Finalizar Cadastro</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
