import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shirt, Car, ShieldAlert, Plus, X, Upload, CheckCircle, Trash2, Shield } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

export const Informativos: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  const [activeTab, setActiveTab] = useState<'viaturas' | 'hierarquia' | string>('viaturas');
  
  const [categorias, setCategorias] = useState<any[]>([]);
  const [viaturas, setViaturas] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  const getRankLabel = (role: string) => {
    const roles: Record<string, string> = {
      'coronel': 'Coronel',
      'tenente-coronel': 'Ten. Coronel',
      'major': 'Major',
      'capitao': 'Capitão',
      '1-tenente': '1º Tenente',
      '2-tenente': '2º Tenente',
      '1-sargento': '1º Sargento',
      '2-sargento': '2º Sargento',
      '3-sargento': '3º Sargento',
      'cabo': 'Cabo',
      'soldado': 'Soldado',
      '1-soldado': '1º Soldado',
      '2-soldado': '2º Soldado'
    };
    return roles[role] || role;
  };

  // Modais
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');

  const [isAddingVtr, setIsAddingVtr] = useState(false);
  const [newVtrName, setNewVtrName] = useState('');
  const [newVtrRole, setNewVtrRole] = useState('soldado');
  const [newVtrDesc, setNewVtrDesc] = useState('');
  const [newVtrImage, setNewVtrImage] = useState('');

  // Imagem em tela cheia
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, vtrRes, usrRes] = await Promise.all([
        fetch('/api/informativos'),
        fetch('/api/viaturas'),
        fetch('/api/users/all')
      ]);

      if (catRes.ok) setCategorias(await catRes.json());
      if (vtrRes.ok) setViaturas(await vtrRes.json());
      if (usrRes.ok) {
        const users = await usrRes.json();
        setSystemUsers(users.filter((u: any) => u.status === 'active'));
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setBase64: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle) return;
    try {
      await fetch('/api/informativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newCatTitle, iconName: 'BookOpen' })
      });
      setNewCatTitle('');
      setIsAddingCat(false);
      fetchData();
    } catch (err) {}
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle) return;
    try {
      await fetch(`/api/informativos/${activeTab}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newItemTitle, description: newItemDesc, imageUrl: newItemImage })
      });
      setNewItemTitle(''); setNewItemDesc(''); setNewItemImage('');
      setIsAddingItem(false);
      fetchData();
    } catch (err) {}
  };

  const handleAddViatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVtrName || !newVtrRole) return;
    try {
      await fetch('/api/viaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVtrName, minRole: newVtrRole, description: newVtrDesc, imageUrl: newVtrImage })
      });
      setNewVtrName(''); setNewVtrRole('soldado'); setNewVtrDesc(''); setNewVtrImage('');
      setIsAddingVtr(false);
      fetchData();
    } catch (err) {}
  };

  const handleDeleteViatura = async (id: string) => {
    if(confirm('Remover viatura?')) {
      await fetch(`/api/viaturas/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if(confirm('Tem certeza que deseja apagar esta categoria inteira? Todos os itens dentro dela serão perdidos!')) {
      await fetch(`/api/informativos/${id}`, { method: 'DELETE' });
      setActiveTab('viaturas');
      fetchData();
    }
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    if(confirm('Tem certeza que deseja apagar este item?')) {
      await fetch(`/api/informativos/${catId}/items/${itemId}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const activeCategory = categorias.find(c => c.id === activeTab);

  // Agrupar usuários por patente para a Hierarquia
  const hierarchyMap: Record<string, any[]> = {
    'coronel': [], 'tenente-coronel': [], 'major': [], 'capitao': [],
    '1-tenente': [], '2-tenente': [], 'aspirante': [], 'subtenente': [],
    '1-sargento': [], '2-sargento': [], '3-sargento': [], 'cabo': [],
    'soldado': [], 'aluno': []
  };

  systemUsers.forEach(u => {
    if (hierarchyMap[u.role]) hierarchyMap[u.role].push(u);
    else if(u.role === '1-soldado' || u.role === '2-soldado') hierarchyMap['soldado'].push(u);
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Modal Tela Cheia da Imagem */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm animate-in fade-in cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img 
            src={fullscreenImage} 
            alt="Fullscreen Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          />
          <button 
            className="absolute top-6 right-6 text-white bg-zinc-900/50 hover:bg-rose-500 p-2 rounded-full transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-outfit font-black text-zinc-100 flex items-center gap-3">
            <BookOpen className="text-yellow-500 w-8 h-8" /> Informativos
          </h1>
          <p className="text-sm text-zinc-400 mt-1 font-medium">Manuais, fardamentos oficiais, viaturas liberadas e organograma de hierarquia.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categorias.filter(c => c.title.toLowerCase() === 'fardamento').map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border ${
              activeTab === cat.id 
                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30 shadow-inner shadow-yellow-500/10' 
                : 'bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Shirt className="w-4 h-4" /> {cat.title.toUpperCase()}
          </button>
        ))}

        <button
          onClick={() => setActiveTab('viaturas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border ${
            activeTab === 'viaturas' 
              ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30 shadow-inner shadow-yellow-500/10' 
              : 'bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <Car className="w-4 h-4" /> VIATURAS FÍSICAS
        </button>
        <button
          onClick={() => setActiveTab('hierarquia')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border ${
            activeTab === 'hierarquia' 
              ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30 shadow-inner shadow-yellow-500/10' 
              : 'bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> HIERARQUIA
        </button>

        {categorias.filter(c => c.title.toLowerCase() !== 'fardamento').map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border ${
              activeTab === cat.id 
                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30 shadow-inner shadow-yellow-500/10' 
                : 'bg-zinc-900/50 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> {cat.title.toUpperCase()}
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setIsAddingCat(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-yellow-500/20 hover:text-yellow-400 text-zinc-300 text-sm font-bold transition-colors border border-dashed border-zinc-600 hover:border-yellow-500/50"
          >
            <Plus className="w-4 h-4" /> NOVA CATEGORIA
          </button>
        )}
      </div>

      {isAddingCat && (
        <form onSubmit={handleAddCategory} className="glass-panel p-6 rounded-2xl flex items-end gap-4 animate-in slide-in-from-top-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Nome da Categoria</label>
            <input type="text" required value={newCatTitle} onChange={e => setNewCatTitle(e.target.value)} placeholder="Ex: Fardamento, Armamento..." className="w-full glass-input" />
          </div>
          <button type="submit" className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4"/> SALVAR</button>
          <button type="button" onClick={() => setIsAddingCat(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold">CANCELAR</button>
        </form>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB: VIATURAS */}
          {activeTab === 'viaturas' && (
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4">
                <h3 className="font-outfit font-extrabold text-lg text-zinc-200 uppercase tracking-wider">Viaturas Autorizadas na Base</h3>
                {isAdmin && (
                  <button onClick={() => setIsAddingVtr(true)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                    <Plus className="w-4 h-4" /> CADASTRAR VIATURA
                  </button>
                )}
              </div>

              {isAddingVtr && (
                <form onSubmit={handleAddViatura} className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Nome da Viatura (Ex: VTR Blazer)</label>
                      <input type="text" required value={newVtrName} onChange={e => setNewVtrName(e.target.value)} className="w-full glass-input" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Patente Mínima para uso</label>
                      <select value={newVtrRole} onChange={e => setNewVtrRole(e.target.value)} className="w-full glass-input">
                        <option value="soldado">Soldado</option>
                        <option value="cabo">Cabo</option>
                        <option value="1-sargento">Sargento</option>
                        <option value="capitao">Oficial (Capitão+)</option>
                        <option value="coronel">Comando (Coronel)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Especificações (opcional)</label>
                    <textarea value={newVtrDesc} onChange={e => setNewVtrDesc(e.target.value)} rows={2} className="w-full glass-input" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Anexar Foto da Viatura</label>
                    <div className="relative border-2 border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-800/50 hover:border-yellow-500/50 transition-colors">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewVtrImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {newVtrImage ? <img src={newVtrImage} className="max-h-32 rounded-lg" alt="Preview" /> : <div className="flex flex-col items-center"><Upload className="w-6 h-6 mb-2"/><span>Clique para enviar ou arraste a imagem</span></div>}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setIsAddingVtr(false)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-bold text-xs">CANCELAR</button>
                    <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-bold text-xs flex items-center gap-2"><CheckCircle className="w-4 h-4"/> SALVAR VIATURA</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {viaturas.map(v => (
                  <div key={v.id} className="glass-card rounded-2xl overflow-hidden border border-zinc-800/60 hover:border-zinc-700 transition-colors relative group">
                    {isAdmin && (
                      <button onClick={() => handleDeleteViatura(v.id)} className="absolute top-2 right-2 bg-rose-500/80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-500">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    )}
                    {v.imageUrl ? (
                      <div 
                        className="h-48 w-full bg-zinc-900/50 border-b border-zinc-800 relative flex items-center justify-center p-2 cursor-pointer group/img overflow-hidden"
                        onClick={() => setFullscreenImage(v.imageUrl)}
                      >
                        <img src={v.imageUrl} alt={v.name} className="w-full h-full object-contain drop-shadow-2xl group-hover/img:scale-110 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-zinc-900 border-b border-zinc-800 flex items-center justify-center text-zinc-700">
                        <Car className="w-16 h-16 opacity-50" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-outfit font-black text-xl text-zinc-100">{v.name}</h4>
                      </div>
                      <span className="inline-block px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase tracking-widest mb-3">
                        MIN: {getRankLabel(v.minRole)}
                      </span>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: HIERARQUIA */}
          {activeTab === 'hierarquia' && (
            <div className="glass-panel p-6 rounded-2xl space-y-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />
              
              <h3 className="font-outfit font-extrabold text-lg text-zinc-200 uppercase tracking-wider text-center border-b border-zinc-800 pb-4">
                Cadeia de Comando Oficial
              </h3>
              
              <div className="flex flex-col items-center space-y-6 py-8">
                {Object.entries(hierarchyMap).map(([role, usersInRole]) => {
                  if (usersInRole.length === 0) return null;
                  
                  // Color codes for hierarchy
                  let badgeColor = 'bg-slate-900 border-slate-700 text-slate-300';
                  if (role === 'coronel' || role === 'tenente-coronel') badgeColor = 'bg-rose-950 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
                  else if (role === 'major') badgeColor = 'bg-amber-950 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
                  else if (role === 'capitao' || role === '1-tenente') badgeColor = 'bg-yellow-950 border-yellow-500/50 text-yellow-400';
                  else if (role.includes('sargento')) badgeColor = 'bg-emerald-950 border-emerald-500/50 text-emerald-400';
                  else if (role === 'cabo') badgeColor = 'bg-teal-950 border-teal-500/50 text-teal-400';

                  return (
                    <div key={role} className="flex flex-col items-center w-full max-w-4xl animate-in fade-in zoom-in-95 duration-500">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">{getRankLabel(role)}</div>
                      
                      <div className="flex flex-wrap justify-center gap-4 w-full">
                        {usersInRole.map(u => (
                          <div key={u.id} className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${badgeColor} backdrop-blur-md`}>
                            <RankIcon role={u.role} className="w-5 h-5 opacity-80" />
                            <span className="font-bold text-sm">{u.name}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="h-8 w-px bg-gradient-to-b from-zinc-700 to-transparent my-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: CATEGORIAS DINAMICAS */}
          {activeCategory && (
            <div className="glass-panel p-6 rounded-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4">
                <h3 className="font-outfit font-extrabold text-lg text-zinc-200 uppercase tracking-wider">{activeCategory.title}</h3>
                {isAdmin && (
                  <button onClick={() => setIsAddingItem(true)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-yellow-500/20">
                    <Plus className="w-4 h-4" /> ADICIONAR ITEM
                  </button>
                )}
              </div>

              {isAddingItem && (
                <form onSubmit={handleAddItem} className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-4 relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Título do Item</label>
                    <input type="text" required value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} className="w-full glass-input" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Descrição / Códigos / Regras</label>
                    <textarea value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} rows={3} className="w-full glass-input" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Anexar Foto de Exemplo (Opcional)</label>
                    <div className="relative border-2 border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-800/50 transition-colors">
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewItemImage)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      {newItemImage ? <img src={newItemImage} className="max-h-32 rounded-lg" alt="Preview" /> : <div className="flex flex-col items-center"><Upload className="w-6 h-6 mb-2"/><span>Clique para enviar foto</span></div>}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setIsAddingItem(false)} className="px-4 py-2 bg-zinc-800 text-white rounded-lg font-bold text-xs">CANCELAR</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-2"><CheckCircle className="w-4 h-4"/> SALVAR ITEM</button>
                  </div>
                </form>
              )}

              <div className="space-y-6">
                {(activeCategory.items || []).map((item: any) => (
                  <div key={item.id} className="relative p-6 sm:p-8 rounded-2xl bg-black border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)] hover:shadow-[0_0_40px_rgba(234,179,8,0.15)] hover:border-yellow-500/40 transition-all duration-300 overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                    
                    {/* Header: Title and Icon */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 border border-yellow-500/20 shadow-inner">
                            <BookOpen className="w-6 h-6" />
                         </div>
                         <div>
                           <h4 className="font-outfit font-black text-2xl text-zinc-100 group-hover:text-yellow-400 transition-colors tracking-tight">{item.title}</h4>
                           <span className="text-[10px] uppercase font-bold text-yellow-500/70 tracking-[0.2em]">Comunicado Oficial</span>
                         </div>
                      </div>
                      
                      {isAdmin && (
                        <button onClick={() => handleDeleteItem(activeCategory.id, item.id)} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="flex-1">
                        <p className="text-sm sm:text-base text-zinc-300/90 leading-relaxed whitespace-pre-wrap font-medium">{item.description}</p>
                      </div>

                      {item.imageUrl && (
                        <div 
                          className="w-full md:w-80 h-48 sm:h-56 rounded-xl bg-zinc-950 shrink-0 border border-zinc-800 overflow-hidden cursor-pointer relative group/img shadow-xl"
                          onClick={() => setFullscreenImage(item.imageUrl)}
                        >
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-yellow-500/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-300">
                            <div className="bg-black/60 p-3 rounded-full">
                              <Plus className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!activeCategory.items || activeCategory.items.length === 0) && (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-600">
                    <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-outfit font-bold text-xl uppercase tracking-widest">Nenhum Comunicado</p>
                    <p className="text-sm">Ainda não há registros nesta categoria.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};
