import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Subdivisao, Operator } from './Subdivisoes';
import { Shield, ArrowLeft, Trash2, Plus, Users, Save, Loader2 } from 'lucide-react';

export const SubdivisaoManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [unit, setUnit] = useState<Subdivisao | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Editable state
  const [subcomandoId, setSubcomandoId] = useState('');
  const [cargos, setCargos] = useState<string[]>([]);
  const [newCargo, setNewCargo] = useState('');
  
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedOperatorCargo, setSelectedOperatorCargo] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resUnit, resUsers] = await Promise.all([
        fetch('/api/subdivisoes'),
        fetch('/api/users')
      ]);

      if (resUnit.ok && resUsers.ok) {
        const unitsData: Subdivisao[] = await resUnit.json();
        const usersData = await resUsers.json();
        
        const currentUnit = unitsData.find(u => u.id === id);
        if (currentUnit) {
          setUnit(currentUnit);
          setSubcomandoId(currentUnit.subcomandoId || '');
          setCargos(currentUnit.cargos || []);
          setOperators(currentUnit.operators || []);
        } else {
          navigate('/subdivisoes');
        }
        setAllUsers(usersData);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!unit) return;
    setSaving(true);
    try {
      const subcomandoUser = allUsers.find(u => u.id === subcomandoId);
      
      const payload = {
        subcomandoId,
        subcomandoName: subcomandoUser ? subcomandoUser.name : '',
        cargos,
        operators
      };

      const res = await fetch(`/api/subdivisoes/${unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('success', 'Subdivisão atualizada com sucesso!');
        setTimeout(() => navigate('/subdivisoes'), 1000);
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Erro ao salvar.');
      }
    } catch (err) {
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/subdivisoes/${unit?.id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/subdivisoes');
      } else {
        showToast('error', 'Erro ao deletar. Apenas Coronel e Ten. Coronel podem deletar.');
        setShowConfirmDelete(false);
      }
    } catch (err) {
      showToast('error', 'Erro de conexão.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCargo = () => {
    if (newCargo.trim() && !cargos.includes(newCargo.trim().toUpperCase())) {
      setCargos([...cargos, newCargo.trim().toUpperCase()]);
      setNewCargo('');
    }
  };

  const handleRemoveCargo = (cargo: string) => {
    setCargos(cargos.filter(c => c !== cargo));
    // Also remove this cargo from operators who have it?
    // Actually, maybe keep it on them or reset to 'Membro'. Let's reset to 'MEMBRO'
    setOperators(operators.map(op => op.cargo === cargo ? { ...op, cargo: 'MEMBRO' } : op));
  };

  const handleAddOperator = () => {
    if (!selectedOperatorId) return;
    if (operators.some(op => op.userId === selectedOperatorId)) {
      return showToast('error', 'Usuário já está nesta subdivisão.');
    }
    
    const userObj = allUsers.find(u => u.id === selectedOperatorId);
    if (userObj) {
      setOperators([...operators, {
        userId: userObj.id,
        userName: userObj.name,
        cargo: selectedOperatorCargo || 'MEMBRO'
      }]);
      setSelectedOperatorId('');
      setSelectedOperatorCargo('');
    }
  };

  const handleRemoveOperator = (userId: string) => {
    setOperators(operators.filter(op => op.userId !== userId));
  };

  if (loading || !unit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-zinc-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <span className="text-xs font-bold uppercase tracking-widest">Carregando gerenciador...</span>
      </div>
    );
  }

  const isHighRank = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/subdivisoes')}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-outfit font-black text-xl text-zinc-100 uppercase tracking-wide">{unit.name}</h2>
            <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase mt-1">Gerenciamento de Grupamento</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isHighRank && (
            <button 
              onClick={() => setShowConfirmDelete(true)}
              disabled={saving}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
            >
              Excluir Subdivisão
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-colors shadow-lg shadow-yellow-600/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-[9999] animate-in slide-in-from-bottom-5 font-bold tracking-widest text-xs border ${toastMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {toastMessage.text}
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <Trash2 className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-outfit font-bold text-zinc-100 mb-2">Excluir Subdivisão</h3>
            <p className="text-sm text-zinc-400 mb-6">Tem certeza que deseja <strong className="text-rose-500">DELETAR</strong> esta subdivisão inteira? Esta ação não poderá ser desfeita.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                disabled={saving}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
              >
                {saving ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Command & Ranks */}
        <div className="space-y-6">
          <div className="glass-panel border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-outfit font-bold text-zinc-300 text-sm border-b border-zinc-800 pb-2">Hierarquia de Comando</h3>
            
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Comando Responsável</label>
              <div className="px-4 py-3 bg-zinc-900 border border-zinc-800/60 rounded-xl text-sm font-semibold text-yellow-500 truncate flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {unit.comandoName}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 italic">Apenas a alta cúpula pode alterar o dono da subdivisão.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Sub-Comando (Opcional)</label>
              <select 
                value={subcomandoId}
                onChange={e => setSubcomandoId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-zinc-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
              >
                <option value="">Nenhum designado</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="glass-panel border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-outfit font-bold text-zinc-300 text-sm border-b border-zinc-800 pb-2">Cargos Customizados</h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Crie funções específicas para esta subdivisão (ex: Batedor, Piloto Águia, Negociador).
            </p>

            <div className="flex gap-2">
              <input 
                type="text"
                value={newCargo}
                onChange={e => setNewCargo(e.target.value)}
                placeholder="Nome do cargo..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-yellow-500/50"
              />
              <button 
                onClick={handleAddCargo}
                className="px-3 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 rounded-xl transition-colors border border-zinc-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <div className="px-3 py-1 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                MEMBRO (Padrão)
              </div>
              {cargos.map((cargo, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                  {cargo}
                  <button onClick={() => handleRemoveCargo(cargo)} className="text-yellow-600/50 hover:text-red-400 transition-colors">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Operators */}
        <div className="lg:col-span-2 glass-panel border border-zinc-800 rounded-2xl p-5 flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
          <h3 className="font-outfit font-bold text-zinc-300 text-sm border-b border-zinc-800 pb-2 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-500" />
            Quadro de Operadores
          </h3>

          <div className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl mb-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Militar</label>
              <select 
                value={selectedOperatorId}
                onChange={e => setSelectedOperatorId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-yellow-500/50"
              >
                <option value="">Buscar militar...</option>
                {allUsers.filter(u => !operators.some(op => op.userId === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Cargo na Subdivisão</label>
              <select 
                value={selectedOperatorCargo}
                onChange={e => setSelectedOperatorCargo(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-yellow-500/50"
              >
                <option value="MEMBRO">Membro (Padrão)</option>
                {cargos.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleAddOperator}
                className="h-[34px] px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {operators.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <Users className="w-8 h-8 opacity-20" />
                <p className="text-xs font-bold tracking-widest uppercase">Nenhum operador inserido</p>
              </div>
            ) : (
              operators.map((op) => (
                <div key={op.userId} className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl group hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                      <Shield className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">{op.userName}</h4>
                      <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">{op.cargo}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Inline cargo changer */}
                    <select 
                      value={op.cargo}
                      onChange={e => {
                        const newOperators = operators.map(o => o.userId === op.userId ? { ...o, cargo: e.target.value } : o);
                        setOperators(newOperators);
                      }}
                      className="bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-zinc-400 rounded px-2 py-1 uppercase tracking-widest focus:outline-none"
                    >
                      <option value="MEMBRO">Membro</option>
                      {cargos.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>

                    <button 
                      onClick={() => handleRemoveOperator(op.userId)}
                      className="p-1.5 text-zinc-600 hover:text-red-400 bg-zinc-950 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const XIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
