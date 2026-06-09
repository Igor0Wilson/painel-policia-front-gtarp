import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Play, Square, Clock, ListCollapse, History, Shield, ShieldAlert, CheckCircle } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface PunchLog {
  id: string;
  clockIn: string | null;
  clockOut: string | null;
  durationHours: number;
  anomaly: boolean;
  anomalyType: string | null;
}

export const BatePonto: React.FC = () => {
  const { user, reloadUser } = useAuth();
  const [logs, setLogs] = useState<PunchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ponto/my-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Erro ao buscar logs de ponto', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.dutyStatus]);

  // Handle active timer
  useEffect(() => {
    // Find if there is an active punch
    const activePunch = logs.find(log => log.clockOut === null);

    if (user?.dutyStatus === 'em-servico' && activePunch && activePunch.clockIn) {
      const startTime = new Date(activePunch.clockIn).getTime();

      // Clear existing timer if any
      if (timerRef.current) clearInterval(timerRef.current);

      const updateTimer = () => {
        const now = Date.now();
        const diffMs = Math.max(0, now - startTime);
        
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);

        const pad = (num: number) => String(num).padStart(2, '0');
        setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      };

      updateTimer(); // run once immediately
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [logs, user?.dutyStatus]);

  const handleClockAction = async () => {
    setActionLoading(true);
    const endpoint = user?.dutyStatus === 'em-servico' ? '/api/ponto/clock-out' : '/api/ponto/clock-in';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok) {
        await reloadUser();
        await fetchLogs();
      } else {
        alert(data.error || 'Erro ao bater ponto.');
      }
    } catch (err) {
      console.error('Erro na requisição de ponto', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return 'Múltipla Anomalia / Sem registro';
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  const isInService = user?.dutyStatus === 'em-servico';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-outfit font-extrabold text-zinc-100 text-xl tracking-wide">Terminal de Bate Ponto</h2>
            <p className="text-xs text-zinc-500">Registre sua entrada e saída de serviço para contabilização de horas.</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel Left, Quick Stats Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Clock Punch Center (2 Columns) */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 border border-zinc-800/80 bg-zinc-950 flex flex-col items-center justify-center text-center space-y-6 min-h-[350px] relative overflow-hidden group">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25" />

          {/* User Badge Info */}
          {user && (
            <div className="z-10 flex flex-col items-center space-y-3">
              {/* Profile Picture (Avatar) */}
              <div className={`w-24 h-24 rounded-full bg-zinc-900 border-2 flex items-center justify-center uppercase overflow-hidden shadow-2xl relative transition-all duration-300 ${
                isInService ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-zinc-800 shadow-black'
              }`}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-extrabold text-zinc-300">{user.name.charAt(0)}</span>
                )}
              </div>
              
              {/* Name and Rank Details */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-zinc-100 font-outfit text-lg tracking-wide">{user.name}</h3>
                  {/* Small Rank Icon next to name */}
                  <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-zinc-900 border border-zinc-850 rounded p-0.5 shadow-inner">
                    <RankIcon role={user.role} className="w-full h-full" />
                  </div>
                </div>
                
                {/* Rank Name Badge */}
                <div className="inline-flex items-center justify-center mt-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-0.5 rounded-full text-[9px] font-bold text-zinc-450 uppercase tracking-widest">
                  {getRankLabel(user.role)}
                </div>
              </div>
            </div>
          )}

          {/* Large Live Digital Clock */}
          <div className="z-10 flex flex-col items-center space-y-1">
            <span className={`font-mono text-5xl font-extrabold tracking-wider filter drop-shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-colors duration-300 ${isInService ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {elapsedTime}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${isInService ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
              <span className={`font-bold tracking-widest uppercase text-[10px] ${isInService ? 'text-emerald-400' : 'text-red-400'}`}>
                {isInService ? 'EM SERVIÇO' : 'FORA DE SERVIÇO'}
              </span>
            </div>
          </div>

          {/* Clock Action Button */}
          <div className="z-10 w-full max-w-xs">
            <button
              onClick={handleClockAction}
              disabled={actionLoading}
              className={`w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border shadow-2xl ${
                isInService
                  ? 'bg-gradient-to-r from-red-650 to-red-800 hover:from-red-600 hover:to-red-750 text-white border-red-700/50 hover:shadow-red-500/10'
                  : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black border-yellow-400/40 hover:shadow-yellow-500/10'
              }`}
            >
              {actionLoading ? (
                <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isInService ? (
                <>
                  <Square className="w-4 h-4 fill-white" />
                  <span>Bater Saída de Serviço</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>Entrar em Serviço</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Instructions & Policy Right (1 Column) */}
        <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
              <Shield className="w-4 h-4 text-yellow-500" />
              <h3 className="font-outfit font-bold text-zinc-200 text-xs tracking-wider uppercase">Regulamento</h3>
            </div>
            <ul className="space-y-3 text-[11px] text-zinc-400 leading-relaxed list-disc pl-4">
              <li>Sempre bata o ponto assim que iniciar sua escala de patrulhamento no painel.</li>
              <li>A não marcação de saída é considerada uma <strong>Anomalia</strong> e os oficiais serão notificados.</li>
              <li>Ficar fora de serviço impede o acesso a todos os outros módulos (Fichas Prisionais, Relatórios, etc.).</li>
              <li>Seu total de horas é auditado e serve de critério de promoção pela administração de RH.</li>
            </ul>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-850 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Evite plantões abertos por mais de 12 horas consecutivas sem aprovação prévia do comando.
            </p>
          </div>
        </div>

      </div>

      {/* History Log Section */}
      <div className="glass-panel rounded-2xl p-5 border border-zinc-800/80 bg-zinc-950 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
          <History className="w-4.5 h-4.5 text-zinc-400" />
          <h3 className="font-outfit font-bold text-zinc-200 text-sm">Seu Histórico de Pontos</h3>
        </div>

        {loading && logs.length === 0 ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-12">Você ainda não registrou nenhum ponto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Entrada (Entrada em Serviço)</th>
                  <th className="py-2.5 px-3">Saída (Saída de Serviço)</th>
                  <th className="py-2.5 px-3">Duração</th>
                  <th className="py-2.5 px-3 text-right">Detecção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/40 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="py-3 px-3">
                      {log.clockOut === null ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] uppercase tracking-wide">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                          Escala Ativa
                        </span>
                      ) : log.anomaly ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[9px] uppercase tracking-wide">
                          Anomalia
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold text-[9px] uppercase tracking-wide">
                          Finalizado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-mono">
                      {log.clockIn ? formatDateTime(log.clockIn) : <span className="text-red-400 italic">Ausente</span>}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-mono">
                      {log.clockOut ? formatDateTime(log.clockOut) : <span className="text-zinc-500 italic">Em andamento...</span>}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-semibold">
                      {log.clockOut === null ? (
                        <span className="text-zinc-500">Contando...</span>
                      ) : (
                        `${log.durationHours}h`
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.anomaly ? (
                        <span className="text-[10px] text-red-400 font-medium">
                          {log.anomalyType === 'missing_clock_in' ? 'Saída sem Entrada' : 'Escala > 12h'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-emerald-500 font-medium gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Normal
                        </span>
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
  );
};
