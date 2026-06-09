import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldAlert, Check, RefreshCw, Save } from 'lucide-react';

export const PermissionsConfig: React.FC = () => {
  const { user, permissions: globalPermissions, reloadUser } = useAuth();
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchPermissions = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissionsMap(data);
      }
    } catch (err) {
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleTogglePermission = (role: string, permKey: string) => {
    // Prevent locking out coronel from any permission (always has bypass anyway, but keep UI correct)
    if (role === 'coronel') return;

    const currentRolePerms = permissionsMap[role] || [];
    let nextRolePerms: string[] = [];

    if (currentRolePerms.includes(permKey)) {
      nextRolePerms = currentRolePerms.filter(p => p !== permKey);
    } else {
      nextRolePerms = [...currentRolePerms, permKey];
    }

    setPermissionsMap({
      ...permissionsMap,
      [role]: nextRolePerms
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/permissions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPermissions: permissionsMap })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar configurações.');
      }

      setSuccess('Configurações de acesso salvas com sucesso!');
      await reloadUser(); // refresh current user context permissions
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const roles = [
    { value: 'coronel', label: 'Coronel' },
    { value: 'tenente-coronel', label: 'Ten. Coronel' },
    { value: 'major', label: 'Major' },
    { value: 'capitao', label: 'Capitão' },
    { value: 'tenente', label: 'Tenente' },
    { value: 'sargento', label: 'Sargento' },
    { value: 'cabo', label: 'Cabo' },
    { value: 'soldado-1', label: 'Soldado 1ª Cl.' },
    { value: 'soldado-2', label: 'Soldado 2ª Cl.' }
  ];

  const features = [
    { key: 'dashboard', label: 'Acesso ao Dashboard Principal' },
    { key: 'prisional', label: 'Módulo Prisional e Histórico' },
    { key: 'relatorios', label: 'Relatórios PTR e Central (COPOM)' },
    { key: 'ausencias', label: 'Módulo de Ausências' },
    { key: 'comandos', label: 'Gestão de Subdivisões' },
    { key: 'corregedoria', label: 'Corregedoria Interna' },
    { key: 'cursos', label: 'Cursos & Apostilas' },
    { key: 'informativos', label: 'Informativos e Murais' },
    { key: 'users', label: 'Gestão de Membros' },
    { key: 'exoneracoes', label: 'Exonerações' },
    { key: 'permissions', label: 'Configurações de Permissões' },
    { key: 'metrics', label: 'Métricas da Corporação' },
    { key: 'social', label: 'Comunidade & Clipes' },
    { key: 'chat', label: 'Bate-Papo da Corporação' }
  ];

  const hasAdminRights = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  if (!hasAdminRights) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <ShieldAlert className="w-12 h-12 text-rose-500/80 mb-3" />
        <h3 className="font-outfit font-bold text-slate-200">Acesso Restrito</h3>
        <p className="text-xs mt-1">Apenas Coronéis e Tenente-Coronéis podem configurar chaves de acesso do painel.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-outfit font-bold text-slate-100 text-lg">Matriz de Permissões de Acesso</h2>
            <p className="text-xs text-slate-500">Configure dinamicamente quais abas e recursos cada cargo militar pode acessar.</p>
          </div>
        </div>
        <button 
          onClick={fetchPermissions} 
          disabled={fetching || saving}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Recarregar"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${(fetching || saving) ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-5 border border-slate-800/60 space-y-5">
        
        {fetching ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
            <span>Carregando matriz de segurança...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2 w-1/4">Recurso / Página</th>
                  {roles.map((role) => (
                    <th key={role.value} className="py-3 px-2 text-center text-[9px]">
                      {role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-xs">
                {features.map((feat) => (
                  <tr key={feat.key} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 px-2 font-semibold text-slate-300">
                      {feat.label}
                    </td>
                    {roles.map((role) => {
                      const hasPerm = role.value === 'coronel' || (permissionsMap[role.value] || []).includes(feat.key);
                      const isCoronel = role.value === 'coronel';

                      return (
                        <td key={role.value} className="py-3.5 px-2 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isCoronel || saving}
                              checked={hasPerm}
                              onChange={() => handleTogglePermission(role.value, feat.key)}
                              className="rounded text-yellow-600 bg-slate-950 border-slate-800 w-4.5 h-4.5 cursor-pointer focus:ring-0 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4 mt-2">
          <p className="text-[10px] text-slate-500 italic max-w-md">
            Nota: Coronéis possuem privilégios totais e não podem ter permissões revogadas no sistema para evitar bloqueios permanentes.
          </p>

          <div className="flex items-center gap-3">
            {success && <span className="text-[10px] text-emerald-400 font-bold">{success}</span>}
            {error && <span className="text-[10px] text-rose-400 font-bold">{error}</span>}
            <button
              onClick={handleSave}
              disabled={saving || fetching}
              className="py-3 px-6 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-700/50 text-white text-xs font-bold transition-all shadow-md hover:shadow-yellow-500/15 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SALVANDO...' : 'SALVAR MATRIZ'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
