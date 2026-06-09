import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Asset, AssetType, AssetConfig } from '../types';
import { 
  FileImage, Video, Globe, FileText, Trash2, Plus, 
  Sparkles, Check, Play, Edit3, Save, X, Eye, HelpCircle, Building
} from 'lucide-react';

const PRESET_TEMPLATES = [
  {
    name: '☕ Menu Especial do Dia (Cafeteria)',
    type: 'text' as AssetType,
    url: '',
    content: '☕ ESPRESSO BAR\n\n• Espresso Clássico ....... R$ 6,50\n• Cappuccino Italiano ... R$ 9,50\n• Mochaccino Caramel ... R$ 12,00\n\n🍰 DOCES & SALGADOS\n• Croissant de Queijo ..... R$ 8,50\n• Fatia de Red Velvet .... R$ 14,00\n\n✨ Peça no balcão e ganhe desconto pelo App!',
    config: {
      backgroundColor: '#1e1b4b', // Indigo escuro
      textColor: '#fef08a', // Amarelo suave
      fontSize: '2xl' as const,
      fontFamily: 'serif' as const,
      textAlign: 'center' as const,
      scrollSpeed: 'none' as const
    },
    duration: 12
  },
  {
    name: '🏢 Comunicado Interno - Metas Semanais',
    type: 'text' as AssetType,
    url: '',
    content: '🚀 AVISO IMPORTANTE\n\nNosso foco esta semana é o engajamento na campanha de Junho!\n\n📅 Reunião Geral de Alinhamento:\nSexta-feira às 15:00 na Sala Ágora.\n\n"Pessoas excepcionais constroem o amanhã."',
    config: {
      backgroundColor: '#0f172a', // Slate escuro
      textColor: '#38bdf8', // Blue céu
      fontSize: 'xl' as const,
      fontFamily: 'sans' as const,
      textAlign: 'center' as const,
      scrollSpeed: 'none' as const
    },
    duration: 10
  },
  {
    name: '🌅 Ambientação Relaxante (Vídeo Loop)',
    type: 'video' as AssetType,
    url: 'https://images.unsplash.com/video-free/unsplash-ambient-nature-loop.mp4', // we can use direct free mock loop url
    content: 'Momento de relaxamento na recepção',
    config: {
      backgroundColor: '#1e293b',
      textColor: '#ffffff',
      fontSize: 'md' as const,
      fontFamily: 'sans' as const,
      scrollSpeed: 'none' as const
    },
    duration: 15
  },
  {
    name: '🍕 Promoção Combo Especial',
    type: 'image' as AssetType,
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop',
    content: 'Promoção por tempo limitado',
    config: {
      backgroundColor: '#7f1d1d', // Vermelho escuro
      textColor: '#ffffff',
      fontSize: 'lg' as const,
      fontFamily: 'sans' as const,
      scrollSpeed: 'none' as const
    },
    duration: 8
  }
];

export default function MediaManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('text');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState(10);
  const [formClientId, setFormClientId] = useState('');
  
  // Custom text slide style states
  const [bgColor, setBgColor] = useState('#0f172a');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'>('xl');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [scrollSpeed, setScrollSpeed] = useState<'none' | 'slow' | 'medium' | 'fast'>('none');

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

  // Sync Library
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'assets'),
      where('ownerId', '==', currentUserId)
    );

    const unsubscribe = onSnapshot(
      q,
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
        
        // Sort alphabetically or by createdAt
        setAssets(list.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'assets');
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // Sync clients for association dropdown and library categorizations
  useEffect(() => {
    const q = query(
      collection(db, 'clients')
    );

    const unsubscribe = onSnapshot(
      q,
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

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setName('');
    setType('text');
    setUrl('');
    setContent('');
    setDuration(10);
    setBgColor('#0f172a');
    setTextColor('#ffffff');
    setFontSize('xl');
    setFontFamily('sans');
    setTextAlign('center');
    setScrollSpeed('none');
    setEditingAsset(null);
    setFormClientId('');
    setIsFormOpen(false);
  };

  const loadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setName(preset.name);
    setType(preset.type);
    setUrl(preset.url);
    setContent(preset.content);
    setDuration(preset.duration);
    if (preset.config) {
      if (preset.config.backgroundColor) setBgColor(preset.config.backgroundColor);
      if (preset.config.textColor) setTextColor(preset.config.textColor);
      if (preset.config.fontSize) setFontSize(preset.config.fontSize);
      if (preset.config.fontFamily) setFontFamily(preset.config.fontFamily);
      if (preset.config.textAlign) setTextAlign(preset.config.textAlign);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setType(asset.type);
    setUrl(asset.url);
    setContent(asset.content);
    setDuration(asset.duration);
    setFormClientId(asset.clientId || '');
    
    const config = asset.config || {};
    setBgColor(config.backgroundColor || '#0f172a');
    setTextColor(config.textColor || '#ffffff');
    setFontSize(config.fontSize || 'xl');
    setFontFamily(config.fontFamily || 'sans');
    setTextAlign(config.textAlign || 'center');
    setScrollSpeed(config.scrollSpeed || 'none');
    
    setIsFormOpen(true);
  };

  const handleDelete = async (assetId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta mídia da sua biblioteca?')) return;
    try {
      await deleteDoc(doc(db, 'assets', assetId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assets/${assetId}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !name.trim()) return;

    // Build URL if not specified for web, but fallback
    let finalUrl = url.trim();
    if (type === 'image' && !finalUrl) {
      finalUrl = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600'; // high tech background
    } else if (type === 'video' && !finalUrl) {
      finalUrl = 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-over-a-silent-lake-40321-large.mp4'; // beautiful default ambient
    } else if (type === 'web' && !finalUrl) {
      finalUrl = 'https://earth.nullschool.net/'; // animated wind map, looks super premium on displays!
    }

    const assetData = {
      name: name.trim(),
      type,
      url: finalUrl,
      content: content.trim(),
      duration: Number(duration) || 10,
      config: {
        backgroundColor: bgColor,
        textColor,
        fontSize,
        fontFamily,
        textAlign,
        scrollSpeed,
      },
      ownerId: currentUserId,
      clientId: formClientId || '',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingAsset) {
        await updateDoc(doc(db, 'assets', editingAsset.id), assetData);
      } else {
        await addDoc(collection(db, 'assets'), {
          ...assetData,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingAsset ? OperationType.UPDATE : OperationType.CREATE, 'assets');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">Biblioteca de Mídias</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Adicione e molde os slides, fotos e sites que rodarão em suas TVs.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Mídia
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {editingAsset ? 'Editar Mídia' : 'Criar Nova Conteúdo de Transmissão'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 px-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs font-semibold rounded transition"
            >
              Cancelar
            </button>
          </div>

          {!editingAsset && (
            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-150/40">
              <span className="text-xxs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                ⚡ Presets Rápidos / Modelos Prontos
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-2">Selecione um dos modelos abaixo para aplicar configurações profissionais instantaneamente:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadPreset(tmpl)}
                    className="p-2 text-left bg-white hover:bg-indigo-50/60 transition text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-400 rounded-md shadow-xxs text-[11px] font-medium truncate"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nome da Mídia</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Tabela de Preços / Aviso Funcionários"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duração (Segundos)</label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Separar por Cliente (Banco Exclusivo)</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Mídia Geral / Sem Cliente Exclusivo --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.establishmentName} ({c.city} - {c.state})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ao definir um cliente, esta imagem ou vídeo ficará visível de maneira isolada na biblioteca e nos relatórios de transmissão desse cliente específico.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de Formato</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'text', label: 'Quadro de Texto/Aviso', icon: FileText },
                    { key: 'image', label: 'Imagem Externa', icon: FileImage },
                    { key: 'video', label: 'Vídeo Direto/Loop', icon: Video },
                    { key: 'web', label: 'Website / Link', icon: Globe },
                  ].map((mType) => {
                    const IconComp = mType.icon;
                    return (
                      <button
                        key={mType.key}
                        type="button"
                        onClick={() => {
                          setType(mType.key as AssetType);
                          setUrl('');
                          setContent('');
                        }}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition ${
                          type === mType.key
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <IconComp className="w-5 h-5 shrink-0" />
                        <span className="text-[10px] font-bold leading-none">{mType.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {type !== 'text' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {type === 'image' && 'URL da Imagem'}
                    {type === 'video' && 'URL do Vídeo (Recomendado mp4 direto)'}
                    {type === 'web' && 'URL do Site para Embed (Iframe)'}
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {type === 'image' && 'Utilize o link de qualquer imagem hospedada na web (ex: Unsplash).'}
                    {type === 'video' && 'Utilize um link direto para um arquivo .mp4 para reprodução fluida no player.'}
                    {type === 'web' && 'Alguns sites bloqueiam iframe (X-Frame-Options). Prefira ferramentas como Google Slides, mapas meteorológicos ou dashboards públicos.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Texto Principal do Aviso (Suporta Quebra de Linha)</label>
                    <textarea
                      required
                      rows={5}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="☕ CAFETERIA CENTRAL..."
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 font-serif"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fundo</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['#0f172a', '#1e1b4b', '#1e293b', '#7f1d1d', '#022c22', '#14532d', '#311005'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBgColor(color)}
                            className={`w-5 h-5 rounded-full border border-white shrink-0 relative flex items-center justify-center`}
                            style={{ backgroundColor: color }}
                          >
                            {bgColor === color && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cor Texto</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['#ffffff', '#fef08a', '#e2e8f0', '#93c5fd', '#fca5a5', '#bef264'].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setTextColor(color)}
                            className={`w-5 h-5 rounded-full border border-slate-300 shrink-0 relative flex items-center justify-center`}
                            style={{ backgroundColor: color }}
                          >
                            {textColor === color && <Check className="w-2.5 h-2.5 text-slate-700 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alinhamento</label>
                      <select
                        value={textAlign}
                        onChange={(e) => setTextAlign(e.target.value as any)}
                        className="w-full text-[11px] font-medium border border-slate-200 bg-white py-1 rounded"
                      >
                        <option value="left">Esquerda</option>
                        <option value="center">Centralizado</option>
                        <option value="right">Direita</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estilo Fonte</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as any)}
                        className="w-full text-[11px] font-medium border border-slate-200 bg-white py-1 rounded"
                      >
                        <option value="sans">Sem Serifa (Moderna)</option>
                        <option value="serif">Serifada (Elegante)</option>
                        <option value="mono">Monoespaçada (Código/Dados)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Live Preview Box */}
            <div className="lg:col-span-5 h-full flex flex-col justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  Visualização em Tempo Real (TV Preview)
                </span>
                <div 
                  className="w-full aspect-video rounded-xl border border-slate-900 overflow-hidden flex flex-col relative shadow-lg bg-black"
                  style={{ 
                    backgroundColor: type === 'text' ? bgColor : '#000000',
                    color: type === 'text' ? textColor : '#ffffff'
                  }}
                >
                  {/* Status indicators like real TVs */}
                  <div className="absolute top-2 right-2 bg-slate-900/60 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] font-mono tracking-widest text-white/80 border border-white/5 z-10">
                    HDMI 1 • 1080P
                  </div>

                  {type === 'text' && (
                    <div className="flex-1 flex flex-col justify-center p-6 overflow-hidden">
                      <div 
                        className={`whitespace-pre-line text-xs font-semibold leading-relaxed`}
                        style={{
                          textAlign,
                          fontFamily: fontFamily === 'sans' ? 'Inter, sans-serif' : fontFamily === 'mono' ? 'Courier, monospace' : 'Georgia, serif',
                          color: textColor
                        }}
                      >
                        {content || 'Insira o aviso para visualizar nesta tela simulada de Smart TV...'}
                      </div>
                    </div>
                  )}

                  {type === 'image' && (
                    <div className="flex-1 w-full h-full relative">
                      {url ? (
                        <img 
                          src={url} 
                          alt="Live sign preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-xs">
                          Sem imagem configurada
                        </div>
                      )}
                    </div>
                  )}

                  {type === 'video' && (
                    <div className="flex-1 w-full h-full flex items-center justify-center bg-slate-900">
                      {url ? (
                        <video 
                          src={url} 
                          muted 
                          loop 
                          autoPlay 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          Formatos MP4 Direto suportados
                        </div>
                      )}
                    </div>
                  )}

                  {type === 'web' && (
                    <div className="flex-1 w-full h-full bg-slate-900">
                      {url ? (
                        <iframe 
                          src={url} 
                          title="Preview"
                          className="w-full h-full border-0 pointer-events-none scale-90" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          Site embedding configurado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  {editingAsset ? 'Atualizar Mídia' : 'Gravar na Biblioteca'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Library Grid */}
      <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3.5 shadow-xxs">
        <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          🗂️ Banco Separado de Mídias por Cliente
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedClientFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedClientFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-650 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            📋 Todos ({assets.length})
          </button>
          <button
            onClick={() => setSelectedClientFilter('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedClientFilter === 'general'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-650 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            📺 Mídias Gerais ({assets.filter(a => !a.clientId).length})
          </button>
          {clients.map((c) => {
            const count = assets.filter(a => a.clientId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClientFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer truncate max-w-[200px] inline-flex items-center gap-1 ${
                  selectedClientFilter === c.id
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-650 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>🏢 {c.establishmentName} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium">Buscando biblioteca de mídias...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <FileImage className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Sua Biblioteca está vazia</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Adicione avisos em texto, imagens, vídeos de ambientação ou links de monitoramento para iniciar.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            Começar Agora
          </button>
        </div>
      ) : assets.filter(a => {
        if (selectedClientFilter === 'all') return true;
        if (selectedClientFilter === 'general') return !a.clientId;
        return a.clientId === selectedClientFilter;
      }).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <FileImage className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-xs font-bold text-slate-600">Nenhuma Mídia Vinculada</h4>
          <p className="text-[11px] text-slate-450">Não há imagens ou vídeos cadastrados especificamente para o cliente selecionado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
          {assets.filter(a => {
            if (selectedClientFilter === 'all') return true;
            if (selectedClientFilter === 'general') return !a.clientId;
            return a.clientId === selectedClientFilter;
          }).map((asset) => (
            <div 
              key={asset.id} 
              className="bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Visual Header depending on type */}
                <div 
                  className="aspect-video w-full border-b border-slate-100 overflow-hidden relative flex items-center justify-center bg-slate-900 text-white"
                  style={{ backgroundColor: asset.type === 'text' ? (asset.config?.backgroundColor || '#0f172a') : '#1e293b' }}
                >
                  {asset.type === 'text' ? (
                    <div className="p-4 w-full h-full flex flex-col justify-center overflow-hidden">
                      <div 
                        className="text-[9px] font-medium leading-normal line-clamp-4 select-none"
                        style={{ 
                          color: asset.config?.textColor || '#ffffff', 
                          textAlign: asset.config?.textAlign || 'center',
                          fontFamily: asset.config?.fontFamily === 'sans' ? 'sans-serif' : asset.config?.fontFamily === 'mono' ? 'monospace' : 'serif'
                        }}
                      >
                        {asset.content}
                      </div>
                    </div>
                  ) : asset.type === 'image' ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : asset.type === 'video' ? (
                    <div className="w-full h-full relative">
                      <video src={asset.url} muted loop className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white/80" />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <Globe className="w-7 h-7 mx-auto mb-1 opacity-70 text-indigo-400" />
                      <span className="text-[10px] font-mono text-slate-400 truncate block max-w-xs">{asset.url}</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-bold text-slate-200 flex items-center gap-1">
                    {asset.type === 'text' && <FileText className="w-3 h-3 text-amber-400" />}
                    {asset.type === 'image' && <FileImage className="w-3 h-3 text-emerald-400" />}
                    {asset.type === 'video' && <Video className="w-3 h-3 text-sky-400" />}
                    {asset.type === 'web' && <Globe className="w-3 h-3 text-indigo-400" />}
                    {asset.type.toUpperCase()}
                  </div>

                  <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-bold text-white">
                    {asset.duration}s
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{asset.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate mb-2">
                    {asset.type === 'text' ? 'Aviso de Quadro customizado' : asset.url}
                  </p>

                  {/* Owner establishment label inside card */}
                  {(() => {
                    const client = clients.find(c => c.id === asset.clientId);
                    if (client) {
                      return (
                        <div className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[9px] px-2 py-0.5 rounded-md leading-none select-none">
                          <Building className="w-2.5 h-2.5" />
                          <span>{client.establishmentName}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="inline-flex items-center bg-slate-55 border border-slate-200 text-slate-500 font-bold text-[9px] px-2 py-0.5 rounded-md leading-none select-none">
                        <span>Público / Geral</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[9px] font-medium text-slate-400">
                  Adicionado em {asset.createdAt ? new Date(asset.createdAt.seconds * 1000).toLocaleDateString() : 'hoje'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(asset)}
                    className="p-1 px-1.5 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 hover:text-indigo-600 transition"
                    title="Editar Mídia"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="p-1 px-1.5 hover:bg-slate-200 border border-slate-300 rounded text-slate-400 hover:text-red-600 transition"
                    title="Excluir Mídia"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
