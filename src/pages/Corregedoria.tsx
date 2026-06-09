import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, BookOpen, UserCheck, Plus, CheckCircle, RefreshCw, X, AlertOctagon } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface Warning {
  userId: string;
  userName: string;
  reason: string;
  severity: string;
  issuedBy: string;
  date: string;
}

interface Guideline {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
}

interface UserListItem {
  id: string;
  name: string;
  role: string;
}

export const Corregedoria: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'orientacoes' | 'advertencias'>('orientacoes');
  
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);

  // Create Guideline states
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTitle, setGuideTitle] = useState('');
  const [guideContent, setGuideContent] = useState('');

  // Create Warning states
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnTargetUserId, setWarnTargetUserId] = useState('');
  const [warnReason, setWarnReason] = useState('');
  const [warnSeverity, setWarnSeverity] = useState('Advertência Verbal');

  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchCorregedoriaData = async () => {
    try {
      setFetching(true);
      // Fetch Guidelines
      const guideRes = await fetch('/api/corregedoria/orientacoes');
      if (guideRes.ok) {
        const guideData = await guideRes.json();
        setGuidelines(guideData);
      }

      // Fetch Warnings
      const warnRes = await fetch('/api/warnings');
      if (warnRes.ok) {
        const warnData = await warnRes.json();
        setWarnings(warnData);
      }

      // Fetch Users list (for warnings dropdown)
      if (hasPermission('users')) {
        const usersRes = await fetch('/api/users/all');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsersList(usersData.filter((u: any) => u.status === 'active'));
        }
      }
    } catch (err) {
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchCorregedoriaData();
  }, []);

  const handleCreateGuideline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/corregedoria/orientacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: guideTitle, content: guideContent })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao publicar diretriz.');
      }

      setSuccess('Instrução de conduta publicada!');
      setGuideTitle('');
      setGuideContent('');
      setShowGuideModal(false);
      await fetchCorregedoriaData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnTargetUserId) {
      setError('Selecione o militar infrator.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: warnTargetUserId,
          reason: warnReason,
          severity: warnSeverity
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao aplicar advertência.');
      }

      setSuccess('Advertência arquivada com sucesso!');
      setWarnTargetUserId('');
      setWarnReason('');
      setWarnSeverity('Advertência Verbal');
      setShowWarnModal(false);
      await fetchCorregedoriaData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadgeClass = (s: string) => {
    switch (s) {
      case 'Advertência Verbal':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'Advertência 1':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/25';
      case 'Advertência 2':
        return 'bg-red-500/10 text-red-400 border-red-500/25';
      case 'Advertência 3':
      default:
        return 'bg-rose-600/15 text-rose-500 border-rose-500/25 animate-pulse';
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
      'aspirante': 'Aspirante',
      'subtenente': 'Subtenente',
      '1-sargento': '1º Sargento',
      '2-sargento': '2º Sargento',
      '3-sargento': '3º Sargento',
      'cabo': 'Cabo',
      'soldado': 'Soldado',
      'aluno': 'Aluno Soldado'
    };
    return roles[role] || role;
  };

  const isOfficer = hasPermission('users'); // Major+ has access to post warning / guidelines

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          <div>
            <h2 className="font-outfit font-bold text-slate-100 text-lg">Corregedoria Interna & Ética COOP</h2>
            <p className="text-xs text-slate-500">Supervisão de conduta, diretrizes éticas e histórico de penalidades disciplinares.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOfficer && (
            <div className="flex gap-2">
              <button
                onClick={() => { setShowGuideModal(true); setError(''); setSuccess(''); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 text-xs font-bold transition-all uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Diretriz</span>
              </button>
              <button
                onClick={() => { setShowWarnModal(true); setError(''); setSuccess(''); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md uppercase tracking-wider"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Aplicar Advertência</span>
              </button>
            </div>
          )}
          <button 
            onClick={fetchCorregedoriaData} 
            disabled={fetching}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
            title="Recarregar"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/80 bg-slate-900/10 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('orientacoes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
            activeTab === 'orientacoes' 
              ? 'bg-yellow-600/15 text-yellow-400 border border-yellow-500/25 shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>INSTRUÇÕES & DIRETRIZES</span>
        </button>
        <button
          onClick={() => setActiveTab('advertencias')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 ${
            activeTab === 'advertencias' 
              ? 'bg-yellow-600/15 text-yellow-400 border border-yellow-500/25 shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>LIVRO DE ADVERTÊNCIAS</span>
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Guidelines tab */}
        {activeTab === 'orientacoes' && (
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/60 min-h-[400px]">
            <h3 className="font-outfit font-extrabold text-xs text-slate-300 tracking-wider uppercase border-b border-slate-800 pb-3 mb-4">Código de Conduta & Orientações</h3>

            {fetching && guidelines.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
                <span>Carregando manuais de conduta...</span>
              </div>
            ) : guidelines.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-16">Nenhuma orientação publicada pela Corregedoria.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guidelines.map(g => (
                  <div key={g.id} className="relative p-5 rounded-2xl glass-card border border-zinc-800/80 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.05)] transition-all flex flex-col group overflow-hidden bg-zinc-900/40">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-600/40 group-hover:bg-yellow-500 transition-colors" />
                    
                    <div className="flex items-start justify-between gap-4 mb-4 pl-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20 shadow-inner shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-outfit font-extrabold text-zinc-100 text-base leading-tight truncate">{g.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-xs text-zinc-300 font-bold">{g.authorName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-[9px] font-bold uppercase flex items-center gap-1">
                              <RankIcon role={g.authorRole} className="w-5 h-5 text-zinc-400" />
                              {getRankLabel(g.authorRole)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 bg-zinc-950/50 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Publicado em</p>
                        <p className="text-xs font-mono font-bold text-zinc-400">{new Date(g.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="flex-1 text-xs text-zinc-300 leading-relaxed whitespace-pre-line bg-zinc-950/80 p-4 ml-2 rounded-xl border border-zinc-800/80 shadow-inner font-medium">
                      {g.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Warnings Tab */}
        {activeTab === 'advertencias' && (
          <div className="glass-panel rounded-2xl p-5 border border-slate-800/60 min-h-[400px]">
            <h3 className="font-outfit font-extrabold text-xs text-slate-300 tracking-wider uppercase border-b border-slate-800 pb-3 mb-4">Registro Oficial de Advertências Aplicadas</h3>

            {fetching && warnings.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
                <span>Carregando arquivo de infrações...</span>
              </div>
            ) : warnings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-16">Nenhuma advertência cadastrada no diário.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Militar Infrator</th>
                      <th className="py-3 px-2">Passaporte</th>
                      <th className="py-3 px-2">Gravidade da Ação</th>
                      <th className="py-3 px-2">Motivo / Infração</th>
                      <th className="py-3 px-2">Oficial Corregedor</th>
                      <th className="py-3 px-2 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-xs text-slate-300">
                    {warnings.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5 px-2">
                          <span className="font-bold text-slate-200">{w.userName}</span>
                        </td>
                        <td className="py-3.5 px-2 text-slate-400 font-mono">{w.userId}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${getSeverityBadgeClass(w.severity)}`}>
                            {w.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 max-w-xs truncate" title={w.reason}>{w.reason}</td>
                        <td className="py-3.5 px-2 font-medium">{w.issuedBy}</td>
                        <td className="py-3.5 px-2 text-right text-slate-500 font-mono text-[10px]">
                          {new Date(w.date).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Guideline Creation Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-yellow-400" />
                <h3 className="font-outfit font-bold text-slate-200">Publicar Diretriz de Conduta</h3>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGuideline} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Título / Assunto</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conduta em Abordagem de Trânsito"
                  value={guideTitle}
                  onChange={(e) => setGuideTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Texto da Diretriz</label>
                <textarea
                  required
                  placeholder="Escreva detalhadamente o manual ou a instrução de conduta..."
                  value={guideContent}
                  onChange={(e) => setGuideContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-xs text-white uppercase tracking-wider transition-colors shadow-md"
                >
                  {submitting ? 'Publicando...' : 'PUBLICAR MANUAL'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="font-outfit font-bold text-slate-200">Aplicar Medida Disciplinar</h3>
              </div>
              <button onClick={() => setShowWarnModal(false)} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyWarning} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Selecione o Militar</label>
                <select
                  required
                  value={warnTargetUserId}
                  onChange={(e) => setWarnTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer focus:border-yellow-500"
                >
                  <option value="" className="bg-slate-900 text-slate-500">Selecione um militar ativo...</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                      {u.name} (Passaporte: {u.id} | {getRankLabel(u.role)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Medida Disciplinar</label>
                <select
                  value={warnSeverity}
                  onChange={(e) => setWarnSeverity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs cursor-pointer focus:border-yellow-500"
                >
                  <option value="Advertência Verbal" className="bg-slate-900">Advertência Verbal</option>
                  <option value="Advertência 1" className="bg-slate-900">Advertência 1</option>
                  <option value="Advertência 2" className="bg-slate-900">Advertência 2</option>
                  <option value="Advertência 3" className="bg-slate-900">Advertência 3 (Passível de Exoneração)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fatos / Justificativa da Penalidade</label>
                <textarea
                  required
                  placeholder="Descreva detalhadamente a conduta ou erro do militar..."
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs text-white uppercase tracking-wider transition-colors shadow-md hover:shadow-red-500/10"
                >
                  {submitting ? 'Registrando...' : 'REGISTRAR PENALIDADE'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarnModal(false)}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Corregedoria;
