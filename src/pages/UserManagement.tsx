import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCog, UserCheck, ShieldAlert, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface UserData {
  id: string;
  name: string;
  role: string;
  status: string;
  isInstructor?: boolean;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/users/all');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao aprovar usuário.');
      }
    } catch (err) {
    } finally {
      setUpdating(null);
    }
  };

  const handlePromote = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/users/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole })
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao alterar cargo.');
      }
    } catch (err) {
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleInstructor = async (userId: string, currentFlag: boolean) => {
    setUpdating(userId);
    try {
      const response = await fetch('/api/users/toggle-instructor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isInstructor: !currentFlag })
      });

      if (response.ok) {
        await fetchUsers();
        if (user?.id === userId) {
          if (reloadUser) await reloadUser();
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao alterar flag de instrutor.');
      }
    } catch (err) {
    } finally {
      setUpdating(null);
    }
  };

  const getRankLabel = (role: string) => {
    const roles: Record<string, string> = {
      'coronel': 'Coronel',
      'tenente-coronel': 'Tenente Coronel',
      'major': 'Major',
      'capitao': 'Capitão',
      '1-tenente': '1º Tenente',
      '2-tenente': '2º Tenente',
      '1-sargento': '1º Sargento',
      '2-sargento': '2º Sargento',
      '3-sargento': '3º Sargento',
      'cabo': 'Cabo',
      'soldado': 'Soldado',
      'aluno': 'Aluno Soldado'
    };
    return roles[role] || role;
  };

  const roleOptions = [
    { value: 'coronel', label: 'Coronel' },
    { value: 'tenente-coronel', label: 'Tenente Coronel' },
    { value: 'major', label: 'Major' },
    { value: 'capitao', label: 'Capitão' },
    { value: '1-tenente', label: '1º Tenente' },
    { value: '2-tenente', label: '2º Tenente' },
    { value: 'aspirante', label: 'Aspirante a Oficial' },
    { value: 'subtenente', label: 'Subtenente' },
    { value: '1-sargento', label: '1º Sargento' },
    { value: '2-sargento', label: '2º Sargento' },
    { value: '3-sargento', label: '3º Sargento' },
    { value: 'cabo', label: 'Cabo' },
    { value: 'soldado', label: 'Soldado' },
    { value: 'aluno', label: 'Aluno Soldado' }
  ];

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'active');

  const isOfficer = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  if (!isOfficer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <ShieldAlert className="w-12 h-12 text-rose-500/80 mb-3" />
        <h3 className="font-outfit font-bold text-slate-200">Acesso Restrito</h3>
        <p className="text-xs mt-1">Apenas oficiais autorizados podem gerenciar os militares do efetivo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-outfit font-bold text-slate-100 text-lg">Gerenciamento de Membros (Efetivo)</h2>
            <p className="text-xs text-slate-500">Gerencie aprovações de novos ingressos e a hierarquia dos militares.</p>
          </div>
        </div>
        <button 
          onClick={fetchUsers} 
          disabled={fetching}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Recarregar"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${fetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Approvals Left (1 col) */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/60 h-fit space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-outfit font-bold text-slate-200 text-sm">Aprovações Pendentes</h3>
          </div>

          {fetching && pendingUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Buscando cadastros...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map(u => (
                <div key={u.id} className="p-3.5 rounded-xl bg-slate-900/30 border border-slate-800/60 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-200">QRA: {u.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Passaporte: {u.id}</p>
                      {u.ra && <p className="text-[10px] text-slate-400">RA: {u.ra}</p>}
                      {u.responsible && <p className="text-[10px] text-slate-400">Responsável: {u.responsible}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700/50">
                      <RankIcon role={u.role} className="w-5 h-5" />
                      <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">
                        {getRankLabel(u.role)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={updating === u.id}
                    className="w-full py-2 mt-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 font-bold text-[10px] uppercase text-white transition-colors"
                  >
                    {updating === u.id ? 'Aprovando...' : 'Aprovar ingresso'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Efetivo Geral Right (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-slate-800/60 min-h-[400px] space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            <h3 className="font-outfit font-bold text-slate-200 text-sm">Militares Ativos (Efetivo Geral)</h3>
          </div>

          {fetching && activeUsers.length === 0 ? (
            <div className="py-16 flex justify-center">
              <div className="w-6 h-6 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
            </div>
          ) : activeUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-16">Nenhum militar cadastrado no efetivo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-2">Militar</th>
                    <th className="py-3 px-2">Passaporte</th>
                    <th className="py-3 px-2">Cargo / Patente</th>
                    <th className="py-3 px-2 text-center">Instrutor</th>
                    <th className="py-3 px-2 text-right">Ações de Cargo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30 text-xs">
                  {activeUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase overflow-hidden border border-slate-700/50 flex-shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{u.name}</span>
                            {u.ra && <span className="text-[10px] text-slate-500 font-mono">RA: {u.ra}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-slate-400 font-mono">{u.id}</td>
                      <td className="py-3.5 px-2">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 w-fit">
                            <RankIcon role={u.role} className="w-5 h-5 drop-shadow-lg" />
                            <span className="text-[10px] font-bold uppercase text-slate-300">
                              {getRankLabel(u.role)}
                            </span>
                          </div>
                          {u.responsible && <span className="text-[9px] text-slate-500">Resp: {u.responsible}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <label className="flex items-center justify-center cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={u.isInstructor || false}
                            disabled={updating === u.id}
                            onChange={() => handleToggleInstructor(u.id, u.isInstructor || false)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-slate-900 cursor-pointer disabled:opacity-50"
                          />
                        </label>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        {/* Avoid self promotion/demotion */}
                        {u.id !== user?.id ? (
                          <select
                            disabled={updating === u.id}
                            value={u.role}
                            onChange={(e) => handlePromote(u.id, e.target.value)}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px] cursor-pointer hover:border-slate-700/60 focus:outline-none"
                          >
                            {roleOptions.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Sua conta</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
