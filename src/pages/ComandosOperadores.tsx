import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Plus, Trash2, Edit2, CheckCircle, RefreshCw } from 'lucide-react';

interface TacticalUnit {
  id: string;
  name: string;
  subCommand: string;
  operators: string[];
}

export const ComandosOperadores: React.FC = () => {
  const { hasPermission } = useAuth();
  const [units, setUnits] = useState<TacticalUnit[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Edit states
  const [subCommand, setSubCommand] = useState('');
  const [newOperator, setNewOperator] = useState('');
  const [operatorsList, setOperatorsList] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const fetchUnits = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/tactical-units');
      if (res.ok) {
        const data = await res.json();
        setUnits(data);
      }
    } catch (err) {
      console.error('Erro ao buscar unidades táticas:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleStartEdit = (unit: TacticalUnit) => {
    setEditingUnitId(unit.id);
    setSubCommand(unit.subCommand);
    setOperatorsList([...unit.operators]);
    setNewOperator('');
  };

  const handleAddOperator = () => {
    if (newOperator.trim() && !operatorsList.includes(newOperator.trim())) {
      setOperatorsList([...operatorsList, newOperator.trim()]);
      setNewOperator('');
    }
  };

  const handleRemoveOperator = (idx: number) => {
    const list = [...operatorsList];
    list.splice(idx, 1);
    setOperatorsList(list);
  };

  const handleSave = async (id: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/tactical-units/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subCommand, operators: operatorsList })
      });

      if (response.ok) {
        setEditingUnitId(null);
        await fetchUnits();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao atualizar unidade.');
      }
    } catch (err) {
      console.error('Erro ao salvar unidade tática:', err);
    } finally {
      setUpdating(false);
    }
  };

  const isOfficer = hasPermission('users'); // Requires officer role to configure tactical units

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-outfit font-bold text-slate-100 text-lg">Comandos & Operadores Especiais</h2>
            <p className="text-xs text-slate-500">Quadro de efetivos e divisões táticas autorizadas da corporação.</p>
          </div>
        </div>
        <button 
          onClick={fetchUnits} 
          disabled={fetching}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Recarregar"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${fetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {fetching && units.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
          <span>Carregando divisões táticas...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {units.map((unit) => {
            const isEditing = editingUnitId === unit.id;

            return (
              <div 
                key={unit.id} 
                className="glass-panel rounded-2xl p-5 border border-slate-800/60 flex flex-col justify-between space-y-4 hover:border-slate-700/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500/10" />
                      <h4 className="font-outfit font-extrabold text-sm text-slate-200 tracking-wide">{unit.name}</h4>
                    </div>
                    {isOfficer && !isEditing && (
                      <button
                        onClick={() => handleStartEdit(unit)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:text-white text-slate-300 transition-colors"
                        title="Editar divisão"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    /* EDITING PANEL */
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sub Comando / Liderança</label>
                        <input
                          type="text"
                          value={subCommand}
                          onChange={(e) => setSubCommand(e.target.value)}
                          placeholder="Ex: Adam Clay #13763"
                          className="w-full px-2.5 py-1.5 rounded-lg glass-input text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operadores Autorizados</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newOperator}
                            onChange={(e) => setNewOperator(e.target.value)}
                            placeholder="Ex: Texas #4474"
                            className="flex-1 px-2.5 py-1.5 rounded-lg glass-input text-xs"
                          />
                          <button
                            type="button"
                            onClick={handleAddOperator}
                            className="px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold text-white transition-colors"
                          >
                            Add
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 mt-2">
                          {operatorsList.map((op, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-950/40 border border-slate-850/60">
                              <span className="text-slate-300">{op}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOperator(idx)}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* VIEW PANEL */
                    <div className="text-xs space-y-3">
                      <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">SUB. COMANDO</span>
                        <span className="text-slate-300 font-semibold">{unit.subCommand || 'N/A'}</span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">OPERADORES AUTORIZADOS</span>
                        {unit.operators.length === 0 ? (
                          <p className="text-slate-600 italic">Nenhum operador cadastrado.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {unit.operators.map((op, oIdx) => (
                              <div 
                                key={oIdx} 
                                className="px-2.5 py-1.5 rounded-lg bg-slate-950/20 border border-slate-800/50 text-slate-400 flex items-center gap-1.5"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <span className="font-medium truncate">{op}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() => handleSave(unit.id)}
                      disabled={updating}
                      className="flex-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold text-xs text-white transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Salvar alterações</span>
                    </button>
                    <button
                      onClick={() => setEditingUnitId(null)}
                      disabled={updating}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
