import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Asset, Playlist, PlaylistItem } from '../types';
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Play, ListPlus,
  Save, Trash, Sparkles, FolderHeart, Info, Film,
  Building, HelpCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

export default function PlaylistManager() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [playlistClientId, setPlaylistClientId] = useState('');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [playlistSchedule, setPlaylistSchedule] = useState<Record<string, any>>({});
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // List Search & Filter states
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [filterClientId, setFilterClientId] = useState('all');

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

    // Listen playlists
    const playlistQuery = query(
      collection(db, 'playlists'),
      where('ownerId', '==', currentUserId)
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
            clientId: d.clientId || '',
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          });
        });
        setPlaylists(list);
        setIsLoading(false);
      },
      (err) => {
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'playlists');
      }
    );

    // Listen assets (to choose from)
    const assetQuery = query(
      collection(db, 'assets'),
      where('ownerId', '==', currentUserId)
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

    // Listen clients
    const clientQuery = query(
      collection(db, 'clients')
    );
    const unsubscribeClients = onSnapshot(
      clientQuery,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setClients(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'clients');
      }
    );

    return () => {
      unsubscribePlaylists();
      unsubscribeAssets();
      unsubscribeClients();
    };
  }, [currentUserId]);

  const createDefaultSchedule = () => {
    const sched: any = {};
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach((day) => {
      sched[day] = {
        enabled: false,
        startTime: '08:00',
        endTime: '18:00'
      };
    });
    return sched;
  };

  const resetForm = () => {
    setName('');
    setPlaylistClientId('');
    setItems([]);
    setEditingPlaylist(null);
    setPlaylistSchedule(createDefaultSchedule());
    setIsScheduleOpen(false);
    setIsFormOpen(false);
  };

  const handleEdit = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setName(playlist.name);
    setPlaylistClientId(playlist.clientId || '');
    setItems([...playlist.items]);
    
    const existing = playlist.schedule || {};
    const defaultSched = createDefaultSchedule();
    const merged = { ...defaultSched };
    Object.keys(existing).forEach((day) => {
      merged[day] = {
        enabled: existing[day]?.enabled ?? false,
        startTime: existing[day]?.startTime || '08:00',
        endTime: existing[day]?.endTime || '18:00'
      };
    });
    setPlaylistSchedule(merged);
    setIsScheduleOpen(false);
    setIsFormOpen(true);
  };

  const handleDelete = async (playlistId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta playlist? As TVs que exibem esta playlist voltarão ao modo ocioso.')) return;
    try {
      await deleteDoc(doc(db, 'playlists', playlistId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `playlists/${playlistId}`);
    }
  };

  const addAssetToPlaylist = (asset: Asset) => {
    const newItem: PlaylistItem = {
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
      url: asset.url,
      content: asset.content,
      config: asset.config,
      duration: asset.duration || 10,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleDurationChange = (index: number, val: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index].duration = val;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !name.trim()) return;
    if (items.length === 0) {
      alert('Por favor, adicione pelo menos uma mídia para salvar sua playlist!');
      return;
    }

    const playlistData = {
      name: name.trim(),
      items: items.map((item) => ({
        assetId: item.assetId,
        name: item.name,
        type: item.type,
        url: item.url,
        content: item.content,
        config: item.config || {},
        duration: Number(item.duration) || 10,
      })),
      ownerId: currentUserId,
      clientId: playlistClientId || '',
      schedule: playlistSchedule,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingPlaylist) {
        await updateDoc(doc(db, 'playlists', editingPlaylist.id), playlistData);
      } else {
        await addDoc(collection(db, 'playlists'), {
          ...playlistData,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingPlaylist ? OperationType.UPDATE : OperationType.CREATE, 'playlists');
    }
  };

  // Compute total duration
  const totalDuration = items.reduce((acc, current) => acc + current.duration, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-sans">Playlists de Exibição</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Organize seu conteúdo em sequências que rodam em loop em suas Smart TVs.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <ListPlus className="w-4 h-4" />
            Criar Playlist
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-6 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {editingPlaylist ? `Configurando Playlist: ${editingPlaylist.name}` : 'Nova Linha de Transmissão (Playlist)'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 px-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-xs font-semibold rounded transition"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Playlist Construction (Left) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Playlist de Promoção</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Grade Matinal / Cardápio Almoço"
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa / Cliente Proprietário</label>
                  <select
                    value={playlistClientId}
                    onChange={(e) => setPlaylistClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 bg-white rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Playlist Geral / Todas as TVs --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.establishmentName} ({c.city} - {c.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Collapsible Playlist Weekly Schedule */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-bold uppercase tracking-wider flex items-center justify-between w-full transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Programador Semanal de Exibição (Playlist Timer)
                  </span>
                  {isScheduleOpen ? <ChevronUp className="w-4 h-4 text-indigo-505" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {isScheduleOpen && (
                  <div className="pt-2 border-t border-slate-200 space-y-2 text-xs text-slate-600 animate-fade-in">
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Configure em quais horários esta playlist poderá ser exibida automaticamente. Fora deste intervalo, a tela exibirá uma <strong>tela preta</strong> se esta playlist estiver sintonizada na Smart TV.
                    </p>
                    
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {[
                        { key: 'monday', label: 'Segunda-feira' },
                        { key: 'tuesday', label: 'Terça-feira' },
                        { key: 'wednesday', label: 'Quarta-feira' },
                        { key: 'thursday', label: 'Quinta-feira' },
                        { key: 'friday', label: 'Sexta-feira' },
                        { key: 'saturday', label: 'Sábado' },
                        { key: 'sunday', label: 'Domingo' }
                      ].map(({ key, label }) => {
                        const dayConfig = playlistSchedule[key] || { enabled: false, startTime: '08:00', endTime: '18:00' };
                        return (
                          <div key={key} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-150 rounded text-slate-750">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                id={`playlist-sched-${key}`}
                                checked={dayConfig.enabled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setPlaylistSchedule((prev) => ({
                                    ...prev,
                                    [key]: { ...dayConfig, enabled: checked }
                                  }));
                                }}
                                className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                              />
                              <label htmlFor={`playlist-sched-${key}`} className="font-semibold text-[10.5px] select-none cursor-pointer">
                                {label}
                              </label>
                            </div>
                            
                            {dayConfig.enabled ? (
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-slate-400 text-[9px]">Das:</span>
                                <input
                                  type="time"
                                  value={dayConfig.startTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPlaylistSchedule((prev) => ({
                                      ...prev,
                                      [key]: { ...dayConfig, startTime: val }
                                    }));
                                  }}
                                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 outline-none focus:border-indigo-500 text-[10px] font-bold"
                                />
                                <span className="text-slate-400 text-[9px]">Até:</span>
                                <input
                                  type="time"
                                  value={dayConfig.endTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPlaylistSchedule((prev) => ({
                                      ...prev,
                                      [key]: { ...dayConfig, endTime: val }
                                    }));
                                  }}
                                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 outline-none focus:border-indigo-500 text-[10px] font-bold"
                                />
                              </div>
                            ) : (
                              <span className="text-[9.5px] italic text-slate-400">Ativo o dia todo</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    📖 Sequência de Exibição ({items.length} itens)
                  </span>
                  {items.length > 0 && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                      Duração Total: {totalDuration}s
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Nenhuma mídia adicionada a esta playlist.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Clique no botão "+" na biblioteca ao lado para inserir.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-xxs gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 h-5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {item.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Duration editor */}
                          <div className="flex items-center gap-1.5 border border-slate-200 rounded px-1.5 py-1 bg-slate-50">
                            <input
                              type="number"
                              min={3}
                              max={600}
                              value={item.duration}
                              onChange={(e) => handleDurationChange(idx, Number(e.target.value))}
                              className="w-8 border-0 bg-transparent text-[11px] font-semibold text-center focus:ring-0 p-0"
                            />
                            <span className="text-[10px] font-bold text-slate-400">seg</span>
                          </div>

                          {/* Order controls */}
                          <div className="flex border border-slate-200 rounded overflow-hidden">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveUp(idx)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 transition"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === items.length - 1}
                              onClick={() => moveDown(idx)}
                              className="p-1 border-l border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-800 disabled:opacity-30 transition"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Delete Item */}
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Playlist
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  Limpar / Cancelar
                </button>
              </div>
            </div>

            {/* Asset Library Picker (Right) */}
            <div className="lg:col-span-5 border-l border-slate-100 lg:pl-6 space-y-3">
              <span className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                📦 Biblioteca de Mídias
              </span>
              {playlistClientId ? (
                <div className="text-[10px] text-indigo-750 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-150 font-semibold leading-relaxed">
                  🎯 Mostrando mídias exclusivas de <strong>{clients.find((c) => c.id === playlistClientId)?.establishmentName}</strong> e mídias gerais.
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed font-sans">
                  Clique no botão <strong>adicionar (+)</strong> nas mídias abaixo para agendá-las nesta playlist.
                </p>
              )}

              {assets.filter((asset) => !playlistClientId || !asset.clientId || asset.clientId === playlistClientId).length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-250">
                  <Info className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-[11px] text-slate-500 font-sans">Nenhuma mídia correspondente encontrada.</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 font-sans">Por favor, cadastre mídias primeiro.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {assets
                    .filter((asset) => !playlistClientId || !asset.clientId || asset.clientId === playlistClientId)
                    .map((asset) => {
                      const matchesClient = asset.clientId === playlistClientId;
                      return (
                        <div 
                          key={asset.id} 
                          className={`flex items-center justify-between p-2.5 border rounded-lg hover:bg-slate-100 transition gap-2 ${
                            matchesClient ? 'border-indigo-200 bg-indigo-50/5' : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="w-10 h-10 rounded bg-slate-900 border overflow-hidden flex items-center justify-center text-[10px] text-white select-none shrink-0 font-bold">
                              {asset.type === 'text' ? (
                                <span className="truncate max-w-full scale-75 text-center">{asset.content}</span>
                              ) : asset.type === 'image' ? (
                                <img src={asset.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span>{asset.type.toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-[11px] font-bold text-slate-700 truncate">{asset.name}</h5>
                              <div className="flex items-center gap-1.5 leading-none mt-1">
                                <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold shrink-0">
                                  {asset.type} • {asset.duration}s
                                </span>
                                {asset.clientId && (
                                  <span className="text-[8px] font-extrabold text-indigo-700 bg-indigo-150/30 px-1 py-0.2 rounded shrink-0 uppercase select-none">
                                    EXCLUSIVA
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => addAssetToPlaylist(asset)}
                            className="p-1 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 hover:border-indigo-500 rounded text-slate-500 text-xs font-bold transition flex items-center justify-center shrink-0 shadow-xxs"
                            title="Adicionar à Playlist"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Playlists Dashboard Grid */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
            🔎 Filtros e Busca de Playlists
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar pelo nome da playlist..."
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium rounded-lg md:w-64 focus:ring-1 focus:ring-indigo-500 font-sans"
            />
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-semibold rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">-- Todos os Clientes --</option>
              <option value="none">Gerais (Sem Cliente)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 {c.establishmentName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
          <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium">Buscando playlists...</span>
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <FolderHeart className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Nenhuma Playlist Composta</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Selecione e compile coleções de mídias para gerar seqüências circulares de apresentação.</p>
          <button
            onClick={() => {
              setPlaylistClientId('');
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
          >
            Criar Minha Primeira Playlist
          </button>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* 1. Playlists Gerais Section */}
          {(filterClientId === 'all' || filterClientId === 'none') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shrink-0" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Canal Geral / Playlists Globais
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {playlists.filter((p) => !p.clientId).length} playlists
                  </span>
                </div>
                {filterClientId === 'none' && (
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded italic">
                    Visualização filtrada
                  </span>
                )}
              </div>

              {playlists.filter((p) => !p.clientId && p.name.toLowerCase().includes(playlistSearch.toLowerCase())).length === 0 ? (
                <div className="text-slate-400 text-xs py-6 text-center bg-slate-50/50 rounded-xl border border-dashed">
                  Nenhuma playlist geral atende ao termo pesquisado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists
                    .filter((p) => !p.clientId && p.name.toLowerCase().includes(playlistSearch.toLowerCase()))
                    .map((playlist) => {
                      const sumSeconds = playlist.items.reduce((acc, curr) => acc + curr.duration, 0);
                      return (
                        <div 
                          key={playlist.id} 
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col justify-between"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{playlist.name}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">Disponível para qualquer Smart TV</p>
                              </div>
                              <span className="text-[9px] font-mono bg-slate-50 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-100 uppercase">
                                {playlist.items.length} itens
                              </span>
                            </div>

                            {/* Quick summary of items */}
                            <div className="mt-4 space-y-1 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                              <span className="block text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mídias do Feed:</span>
                              {playlist.items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-[10px] text-slate-600">
                                  <span className="truncate select-none font-medium max-w-[140px]">
                                    • {item.name}
                                  </span>
                                  <span className="font-mono text-slate-400 border px-1 rounded-sm text-[9px]">
                                    {item.duration}s
                                  </span>
                                </div>
                              ))}
                              {playlist.items.length > 3 && (
                                <span className="block text-[8.5px] font-bold text-indigo-500 text-right mt-1">
                                  e mais {playlist.items.length - 3} itens...
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">
                              Loop: <strong className="text-slate-700 font-bold">{sumSeconds}s</strong>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEdit(playlist)}
                                className="px-2 py-0.8 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded text-[10px] transition cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(playlist.id)}
                                className="p-1 hover:bg-red-50 hover:text-red-600 border border-slate-250 hover:border-red-200 rounded text-slate-400 transition cursor-pointer"
                                title="Excluir Playlist"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* 2. Client-Specific Sections */}
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Promoções Organizadas por Cliente Registrado
              </h3>
            </div>

            {clients
              .filter((c) => filterClientId === 'all' || filterClientId === c.id)
              .map((client) => {
                const clientPlaylists = playlists.filter(
                  (p) => p.clientId === client.id && p.name.toLowerCase().includes(playlistSearch.toLowerCase())
                );

                return (
                  <div 
                    key={client.id} 
                    className="bg-white border border-slate-200 p-5 rounded-xl shadow-xxs space-y-4 hover:border-slate-300 transition"
                  >
                    {/* Customer Row Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{client.establishmentName}</h4>
                          <span className="text-[10px] text-slate-500 font-medium">
                            📁 {client.city} - {client.state} • WhatsApp: {client.whatsapp || 'Não informado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full uppercase shrink-0">
                          {clientPlaylists.length} Playlists de Promoção
                        </span>
                        <button
                          onClick={() => {
                            setPlaylistClientId(client.id);
                            setIsFormOpen(true);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-55 hover:text-indigo-700 border border-slate-200 text-indigo-600 text-[10px] font-bold rounded-md shadow-xxs transition cursor-pointer"
                        >
                          + Criar para este Cliente
                        </button>
                      </div>
                    </div>

                    {/* Customer Playlists Grid */}
                    {clientPlaylists.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-100 rounded-lg bg-slate-50/20">
                        <p className="font-medium">Nenhuma playlist de promoção ativa para este cliente corporativo.</p>
                        <button
                          onClick={() => {
                            setPlaylistClientId(client.id);
                            setIsFormOpen(true);
                          }}
                          className="text-indigo-600 font-bold hover:underline mt-1 block text-[10px]"
                        >
                          Clique para cadastrar uma playlist promocional exclusiva agora
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientPlaylists.map((playlist) => {
                          const sumSeconds = playlist.items.reduce((acc, curr) => acc + curr.duration, 0);
                          return (
                            <div 
                              key={playlist.id} 
                              className="bg-white border border-indigo-100 hover:border-indigo-200 rounded-xl overflow-hidden hover:shadow-md transition flex flex-col justify-between"
                            >
                              <div className="p-5">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{playlist.name}</h4>
                                    <span className="inline-block mt-0.5 text-[8px] font-black text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100 uppercase">
                                      Promocional Exclusiva
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono bg-indigo-50/50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                                    {playlist.items.length} mídias
                                  </span>
                                </div>

                                {/* Items list detail */}
                                <div className="mt-4 space-y-1 bg-indigo-50/10 p-2.5 rounded-lg border border-indigo-50/50">
                                  <span className="block text-[8.5px] font-bold text-indigo-500 uppercase tracking-wider mb-1.5">Fila de Loopings:</span>
                                  {playlist.items.slice(0, 3).map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px] text-slate-600">
                                      <span className="truncate select-none font-semibold max-w-[140px] text-slate-700">
                                        • {item.name}
                                      </span>
                                      <span className="font-mono text-indigo-405 text-indigo-700 bg-indigo-50/50 border border-indigo-100/50 px-0.8 rounded-sm text-[8px]">
                                        {item.duration}s
                                      </span>
                                    </div>
                                  ))}
                                  {playlist.items.length > 3 && (
                                    <span className="block text-[8.5px] font-extrabold text-indigo-600 text-right mt-1">
                                      + {playlist.items.length - 3} arquivos cadastrados
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="px-5 py-3 bg-indigo-50/20 border-t border-indigo-50 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium">
                                  Tempo total: <strong className="text-indigo-700 font-black">{sumSeconds}s</strong>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleEdit(playlist)}
                                    className="px-2 py-0.8 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 font-bold rounded text-[10px] transition cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDelete(playlist.id)}
                                    className="p-1 hover:bg-red-50 hover:text-red-600 border border-slate-250 hover:border-red-200 rounded text-slate-400 transition cursor-pointer"
                                    title="Excluir Playlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
