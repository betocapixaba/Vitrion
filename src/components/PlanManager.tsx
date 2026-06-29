import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  DollarSign, ShieldAlert, CheckCircle2, RefreshCw, Layers, Edit3, Settings, HelpCircle, Save, X
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number | null;
  maxScreens: number;
}

export default function PlanManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Temporary editing prices state (keyed by planId)
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const plansCollection = collection(db, 'plans');
    
    const unsubscribe = onSnapshot(
      plansCollection,
      async (snapshot) => {
        let list: Plan[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Plan);
        });

        // If plans don't exist in Firestore, initialize them (auto-seeding)
        if (list.length === 0) {
          console.log('Seeding plans 1 to 7...');
          const initialPlans: Plan[] = [
            { id: 'plan_1', name: 'Plano 1', price: null, maxScreens: 1 },
            { id: 'plan_2', name: 'Plano 2', price: null, maxScreens: 2 },
            { id: 'plan_3', name: 'Plano 3', price: null, maxScreens: 3 },
            { id: 'plan_4', name: 'Plano 4', price: null, maxScreens: 5 },
            { id: 'plan_5', name: 'Plano 5', price: null, maxScreens: 10 },
            { id: 'plan_6', name: 'Plano 6', price: null, maxScreens: 15 },
            { id: 'plan_7', name: 'Plano 7', price: null, maxScreens: 30 }
          ];

          try {
            const batch = writeBatch(db);
            initialPlans.forEach((plan) => {
              const ref = doc(db, 'plans', plan.id);
              batch.set(ref, {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                maxScreens: plan.maxScreens,
                updatedAt: serverTimestamp()
              });
            });
            await batch.commit();
            console.log('Plans 1 to 7 successfully seeded.');
          } catch (err) {
            console.error('Error seeding plans:', err);
            setErrorMsg('Erro de permissão ao inicializar modelos de planos tarifários.');
          }
        } else {
          // Sort plans by id order (plan_1 to plan_7)
          list.sort((a, b) => a.id.localeCompare(b.id));
          setPlans(list);
          
          // Pre-populate input price states with existing values
          const prices: Record<string, string> = {};
          list.forEach((p) => {
            prices[p.id] = p.price !== null ? p.price.toString() : '';
          });
          setEditPrices(prices);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error reading plans:', err);
        setErrorMsg('Erro de permissão do Firestore ao acessar planos tarifários.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handlePriceChange = (planId: string, value: string) => {
    // Only allow numbers, dot, or comma
    const cleaned = value.replace(/[^\d.,]/g, '');
    setEditPrices((prev) => ({
      ...prev,
      [planId]: cleaned
    }));
  };

  const handleSavePrice = async (planId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setUpdatingId(planId);

    const priceInput = editPrices[planId]?.trim();
    
    // Parse to floating number or null if empty
    let priceValue: number | null = null;
    if (priceInput !== '') {
      // Normalize comma to dot
      const normalized = priceInput.replace(',', '.');
      const num = parseFloat(normalized);
      if (isNaN(num)) {
        setErrorMsg('Por favor, digite um valor numérico válido.');
        setUpdatingId(null);
        return;
      }
      if (num < 0) {
        setErrorMsg('O preço do plano não pode ser menor do que zero.');
        setUpdatingId(null);
        return;
      }
      priceValue = num;
    }

    try {
      const planRef = doc(db, 'plans', planId);
      await updateDoc(planRef, {
        price: priceValue,
        updatedAt: serverTimestamp()
      });
      setSuccessMsg('Valor reajustado e atualizado em tempo real!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving plan price:', err);
      setErrorMsg('Falha ao reajustar preço do plano. Permissão negada pelo banco.');
    } finally {
      setUpdatingId(null);
    }
  };

const safeConfirm = (message: string): boolean => {
  try {
    return window.confirm(message);
  } catch (e) {
    console.warn("window.confirm was blocked or failed. Auto-confirming action.", e);
    return true;
  }
};

  const handleClearPrice = async (planId: string) => {
    if (!safeConfirm('Deixar este plano com preço "em aberto"? Ele será ocultado nas novas telas de registro de cliente.')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setUpdatingId(planId);

    try {
      const planRef = doc(db, 'plans', planId);
      await updateDoc(planRef, {
        price: null,
        updatedAt: serverTimestamp()
      });
      setEditPrices((prev) => ({
        ...prev,
        [planId]: ''
      }));
      setSuccessMsg('O plano foi definido como em aberto e agora está oculto para clientes.');
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error clearing plan price:', err);
      setErrorMsg('Falha ao redefinir o preço do plano.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Info Banner Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xxs">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            Configuração de Assinaturas e Planos Tarifários
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie os planos de 1 a 7, estipulando os preços acordados e reajustando os valores. Os planos cujo preço estiver em aberto (vazio) não serão exibidos na tela de cadastro de cliente.
          </p>
        </div>
      </div>

      {/* Global Alert Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2 animate-fade-in shadow-xxs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="space-y-1">
            <strong className="block">Erro de Configuração</strong>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-xxs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-450">Carregando planos da rede...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isPriceSet = p.price !== null;
            const displayPrice = isPriceSet 
              ? `R$ ${p.price!.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'Em Aberto';

            return (
              <div 
                key={p.id}
                id={`plan-card-${p.id}`}
                className={`bg-white border rounded-xl p-5 shadow-xxs hover:shadow-xs transition duration-205 flex flex-col justify-between ${
                  isPriceSet ? 'border-slate-200 hover:border-indigo-300' : 'border-dashed border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Name and Status Identifier */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">{p.name}</h3>
                      <p className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        Limite: <strong className="text-slate-600">{p.maxScreens} {p.maxScreens === 1 ? 'Tela (TV)' : 'Telas (TVs)'}</strong>
                      </p>
                    </div>

                    <div>
                      {isPriceSet ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-200/50">
                          VISÍVEL NO REGISTRO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded border border-amber-250/50">
                          OCULTADO (EM ABERTO)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content Description */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Preço Estipulado:</span>
                      <strong className={`text-sm font-sans ${isPriceSet ? 'text-indigo-650' : 'text-slate-450 italic'}`}>
                        {displayPrice} {isPriceSet && <span className="text-[10px] font-medium text-slate-400">/mês</span>}
                      </strong>
                    </div>

                    <p className="text-[10.5px] text-slate-500 leading-normal">
                      Permite que o cliente adquira e adicione até <strong>{p.maxScreens}</strong> {p.maxScreens === 1 ? 'player' : 'players (displays fictícios)'} na sua conta no smart portal.
                    </p>

                    {/* Adjustable pricing forms */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tight block">
                        Ajustar Preço Mensal (R$)
                      </label>
                      
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-[11px] font-mono pointer-events-none">
                            R$
                          </span>
                          <input
                            type="text"
                            value={editPrices[p.id] || ''}
                            onChange={(e) => handlePriceChange(p.id, e.target.value)}
                            placeholder="Ex: 149.90"
                            className="w-full bg-white border border-slate-250 focus:border-indigo-500 text-xs pl-8 pr-2 py-2 rounded-lg font-mono outline-none"
                          />
                        </div>
                        
                        <button
                          onClick={() => handleSavePrice(p.id)}
                          disabled={updatingId === p.id}
                          className="px-3 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer"
                          title="Salvar reajuste"
                        >
                          {updatingId === p.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </button>
                        
                        {isPriceSet && (
                          <button
                            onClick={() => handleClearPrice(p.id)}
                            disabled={updatingId === p.id}
                            className="px-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-605 border border-slate-200 hover:border-rose-200 rounded-lg text-xs transition flex items-center justify-center cursor-pointer"
                            title="Deixar em aberto / Ocultar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[8px] text-slate-400 text-right mt-3 pt-1 border-t border-slate-100 font-mono select-none">
                  Ajustado em tempo real via Firestore
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
