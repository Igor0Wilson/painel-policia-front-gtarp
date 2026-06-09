import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Plus, ShieldCheck, UserCog, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Operator {
  userId: string;
  userName: string;
  cargo: string;
}

export interface Subdivisao {
  id: string;
  name: string;
  comandoId: string;
  comandoName: string;
  subcomandoId?: string;
  subcomandoName?: string;
  cargos: string[];
  operators: Operator[];
}

export const Subdivisoes: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [units, setUnits] = useState<Subdivisao[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // Creation modal states
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // We need user list for selecting the "Comando Responsável"
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const fetchUnits = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/subdivisoes');
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch (err) {
    } finally {
      setFetching(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchUnits();
    if (isHighRank) {
      fetchUsers();
    }
  }, []);

  const isHighRank = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // By default, the creator is set as the Comando Responsável if they don't pick someone else?
    // Actually, we should just let them pick or default to themselves. For simplicity, default to themselves in this UI, or they can change it later in the manager.
    // Wait, the requirement: "precisa colocar o nome da subdivisao e e o comando responsavel dela".
    // I will add a select for the comando responsável.
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-yellow-500" />
          <div>
            <h2 className="font-outfit font-bold text-zinc-100 text-lg">Subdivisões</h2>
            <p className="text-xs text-zinc-500">Unidades táticas e grupamentos da corporação.</p>
          </div>
        </div>
        {isHighRank && (
          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Subdivisão
          </button>
        )}
      </div>

      {showCreate && (
        <CreateModal 
          users={allUsers}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            showToast('success', 'Subdivisão criada com sucesso!');
            fetchUnits();
          }}
          onError={(msg) => showToast('error', msg)}
        />
      )}

      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[9999] animate-in slide-in-from-bottom-5 font-bold tracking-widest text-xs border ${toastMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {toastMessage.text}
        </div>
      )}

      {fetching ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-500 text-xs gap-3">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          <span>Carregando subdivisões...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {units.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
              Nenhuma subdivisão encontrada.
            </div>
          ) : (
            units.map((unit) => {
              const canManage = isHighRank || unit.comandoId === user?.id;

              return (
                <div 
                  key={unit.id} 
                  className="glass-panel rounded-2xl p-5 border border-zinc-800/60 flex flex-col justify-between space-y-4 hover:border-zinc-700/60 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start border-b border-zinc-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <h4 className="font-outfit font-extrabold text-sm text-zinc-200 tracking-wide uppercase">{unit.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {unit.operators.length} Operadores
                          </span>
                        </div>
                      </div>
                      {canManage && (
                        <Link
                          to={`/subdivisao/${unit.id}`}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-yellow-500 hover:text-yellow-400 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                          Gerenciar
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">COMANDO</span>
                        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-yellow-600" />
                          {unit.comandoName}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">SUB-COMANDO</span>
                        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold truncate">
                          <Shield className="w-3.5 h-3.5 text-zinc-600" />
                          {unit.subcomandoName || 'Indefinido'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">OPERADORES DA UNIDADE</span>
                      {unit.operators.length === 0 ? (
                        <p className="text-zinc-600 italic text-xs">Nenhum operador designado.</p>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                          {unit.operators.map((op, idx) => (
                            <div key={idx} className="flex justify-between items-center px-3 py-2 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
                              <span className="font-bold text-xs text-zinc-300">{op.userName}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase tracking-widest font-bold">
                                {op.cargo}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const CreateModal: React.FC<{ users: any[], onClose: () => void, onSuccess: () => void, onError: (msg: string) => void }> = ({ users, onClose, onSuccess, onError }) => {
  const [name, setName] = useState('');
  const [comandoId, setComandoId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !comandoId) return onError('Preencha o nome da subdivisão e selecione o comando.');
    
    setSaving(true);
    try {
      const selectedUser = users.find(u => u.id === comandoId);
      const res = await fetch('/api/subdivisoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          comandoId,
          comandoName: selectedUser?.name || 'Desconhecido'
        })
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        onError('Erro ao criar subdivisão.');
      }
    } catch (err) {
      onError('Erro de conexão ao criar subdivisão.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-outfit font-bold text-zinc-100 mb-4">Nova Subdivisão</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Nome da Subdivisão</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-500/50"
              placeholder="Ex: RUP-ROMEU"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Comando Responsável</label>
            <select 
              value={comandoId}
              onChange={e => setComandoId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-yellow-500/50"
            >
              <option value="">Selecione um oficial...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-900">
            <button 
              type="button" 
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
            >
              {saving ? 'Criando...' : 'Criar Subdivisão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
