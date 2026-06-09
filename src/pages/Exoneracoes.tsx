import React, { useState, useEffect } from 'react';
import { UserMinus, ShieldAlert, AlertTriangle, Send, ScrollText, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RankIcon } from '../components/RankIcon';

interface UserData {
  id: string;
  name: string;
  role: string;
  status: string;
}

interface ExonerationLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  reason: string;
  authorName: string;
  authorRole: string;
  date: string;
}

export const Exoneracoes: React.FC = () => {
  const { user, isHighCommand } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<ExonerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/users/all'),
        fetch('/api/exoneracoes')
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        // Filtrar apenas usuários ativos (ou pendentes) que não sejam o Coronel Comando
        setUsers(uData.filter((u: UserData) => u.status !== 'exonerated' && u.role !== 'coronel'));
      }
      
      if (logsRes.ok) {
        const lData = await logsRes.json();
        setLogs(lData);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExonerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !reason.trim()) return;
    setShowConfirmModal(true);
  };

  const executeExoneration = async () => {
    setShowConfirmModal(false);
    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/exoneracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedUser, reason })
      });

      if (response.ok) {
        setSuccess('Membro exonerado com sucesso!');
        setSelectedUser('');
        setReason('');
        await fetchData(); // Refresh lists
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao processar exoneração.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
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
      '1-soldado': '1º Soldado',
      '2-soldado': '2º Soldado',
      'aluno': 'Aluno Soldado'
    };
    return roles[role] || role;
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-black border border-rose-900/50 p-6 sm:p-8 shadow-[0_0_30px_rgba(225,29,72,0.05)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-rose-600 to-rose-900 shadow-[0_0_15px_rgba(225,29,72,0.5)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/50 flex items-center justify-center text-rose-500 border border-rose-900 shadow-inner">
              <UserMinus className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-outfit font-black text-3xl text-zinc-100 uppercase tracking-tight">Módulo de Exoneração</h1>
              <p className="text-[11px] text-rose-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Alto Comando da Corregedoria
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulário de Exoneração */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-zinc-800 bg-zinc-950/80 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-transparent" />
            
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              <h3 className="font-outfit font-black text-xl text-zinc-100 uppercase tracking-tight">Executar Exoneração</h3>
            </div>

            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Esta ação é **irreversível** pelo painel. O militar selecionado terá o acesso permanentemente negado e a ação será registrada no Diário Oficial publicamente.
            </p>

            <form onSubmit={handleExonerateSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Militar Alvo
                </label>
                <select
                  required
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black text-zinc-200 border border-zinc-800 focus:border-rose-500 outline-none text-sm font-medium transition-colors"
                  disabled={loading || processing}
                >
                  <option value="">Selecione um militar...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      [{getRankLabel(u.role)}] {u.name} - Passaporte: {u.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <ScrollText className="w-3.5 h-3.5" />
                  Motivo da Exoneração
                </label>
                <textarea
                  required
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Ausente desde sempre, insubordinação, abandono de serviço..."
                  className="w-full px-4 py-3 rounded-xl bg-black text-zinc-200 border border-zinc-800 focus:border-rose-500 outline-none text-sm font-medium transition-colors resize-none placeholder-zinc-700"
                  disabled={loading || processing}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedUser || !reason || processing}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-sm uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {processing ? 'PROCESSANDO...' : 'CONFIRMAR EXONERAÇÃO'}
                {!processing && <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* Diário Oficial de Exonerações */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-zinc-800 bg-black shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4 border-b border-zinc-900 pb-5 mb-6">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-yellow-500 border border-zinc-800">
                <ScrollText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-outfit font-black text-zinc-100 text-2xl tracking-tight uppercase">Diário Oficial de Exoneração</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Registros Públicos da Corregedoria</p>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-600 flex-1">
                <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin mb-4" />
                <span className="text-sm font-bold uppercase tracking-widest">Buscando registros...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-600 flex-1">
                <ScrollText className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-outfit font-bold text-xl uppercase tracking-widest">Nenhum Registro</p>
                <p className="text-sm">Nenhuma exoneração consta no diário oficial.</p>
              </div>
            ) : (
              <div className="space-y-5 relative z-10 overflow-y-auto pr-2 max-h-[600px]">
                {logs.map((log) => (
                  <div key={log.id} className="relative p-6 sm:p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-yellow-500/30 transition-all group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-rose-600 to-rose-900" />
                    
                    <div className="flex flex-col gap-4">
                      
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900/80 pb-4">
                         <div className="flex items-center gap-3">
                           <h4 className="font-outfit font-black text-xl text-rose-500 uppercase tracking-tight">NOME & QRA:</h4>
                           <span className="text-lg font-bold text-zinc-200 uppercase">{log.userName}</span>
                         </div>
                         <div className="shrink-0 bg-black px-3 py-1.5 rounded-lg border border-zinc-800">
                           <span className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest">
                             DATA: {new Date(log.date).toLocaleDateString('pt-BR')}
                           </span>
                         </div>
                      </div>

                      <div className="bg-black/50 p-4 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block mb-2">MOTIVO DECLARADO:</span>
                        <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed font-medium">
                          {log.reason}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col gap-1 text-sm font-medium text-zinc-400">
                        <p className="uppercase">AÇÃO TOMADA: <span className="text-rose-500 font-black">EXONERADO</span></p>
                        <p className="text-xs mt-2 italic text-zinc-600">Publique-se no Diário Oficial da C.O.O.P</p>
                        
                        <div className="mt-4 border-t border-zinc-900 pt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider">
                           <span>Atenciosamente,</span>
                           <span className="font-bold text-zinc-300">Corregedoria:</span>
                           <span className="text-yellow-500 font-black px-2 py-1 bg-black rounded border border-zinc-800 flex items-center gap-1.5 shadow-inner">
                             <RankIcon role={log.authorRole} className="w-3.5 h-3.5" />
                             {log.authorName}
                           </span>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel border border-rose-950/60 bg-zinc-900 p-8 rounded-2xl text-center space-y-6 shadow-[0_0_50px_rgba(225,29,72,0.15)] animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Red alert top line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-transparent" />
            
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-outfit font-extrabold text-xl text-zinc-100 uppercase tracking-wide">Confirmar Exoneração?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Você tem certeza absoluta? Esta ação bloqueará permanentemente o acesso do militar ao sistema e registrará a exoneração no Diário Oficial.
              </p>
            </div>
            
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider text-[10px] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeExoneration}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-900/40 active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
