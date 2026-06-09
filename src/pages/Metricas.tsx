import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart2, Shield, TrendingUp, Crosshair, Award, Users, Target, Clock, AlertTriangle } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface OfficerStats {
  name: string;
  role: string;
  ptrCount: number;
  totalMinutes: number;
  arrestsCount: number;
  qruCount: number;
  chiefCount: number;
  score: number;
}

export const Metricas: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
  
  // Resumo do Batalhão
  const [totalPtrs, setTotalPtrs] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [totalArrests, setTotalArrests] = useState(0);
  const [totalQrus, setTotalQrus] = useState(0);

  // Rankings
  const [officers, setOfficers] = useState<OfficerStats[]>([]);
  const [bestOfficer, setBestOfficer] = useState<OfficerStats | null>(null);
  const [bestChief, setBestChief] = useState<OfficerStats | null>(null);

  useEffect(() => {
    fetchMetricsData();
  }, []);

  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Falha ao obter relatórios');
      
      const reports = await res.json();
      
      let pCount = 0;
      let pArrests = 0;
      let pQrus = 0;
      let pMinutes = 0;
      
      const statsMap: Record<string, OfficerStats> = {};

      reports.forEach((rep: any) => {
        pCount++;
        pArrests += (rep.arrestsCount || 0);
        pQrus += (rep.qruCount || 0);

        // Calcular tempo de patrulha
        let durationMinutes = 0;
        if (rep.startTime && rep.endTime) {
          const start = new Date(rep.startTime).getTime();
          const end = new Date(rep.endTime).getTime();
          durationMinutes = Math.max(0, Math.floor((end - start) / 60000));
          pMinutes += durationMinutes;
        }

        // Processar guarnição
        if (rep.membersData) {
          try {
            const members = JSON.parse(rep.membersData);
            members.forEach((m: any) => {
              const key = m.name;
              if (!statsMap[key]) {
                statsMap[key] = {
                  name: m.name,
                  role: m.role,
                  ptrCount: 0,
                  totalMinutes: 0,
                  arrestsCount: 0,
                  qruCount: 0,
                  chiefCount: 0,
                  score: 0
                };
              }
              
              statsMap[key].ptrCount += 1;
              statsMap[key].totalMinutes += durationMinutes;
              statsMap[key].arrestsCount += (rep.arrestsCount || 0);
              statsMap[key].qruCount += (rep.qruCount || 0);
              if (m.isChief) {
                statsMap[key].chiefCount += 1;
              }
            });
          } catch (e) {
          }
        }
      });

      setTotalPtrs(pCount);
      setTotalHours(Math.floor(pMinutes / 60));
      setTotalArrests(pArrests);
      setTotalQrus(pQrus);

      // Calcular Score e ordenar
      const sortedOfficers = Object.values(statsMap).map(o => {
        // Fórmula de pontuação de Desempenho
        // PTR = 5 pts | Cada 60 min = 10 pts | Prisão = 3 pts | QRU = 2 pts
        const score = (o.ptrCount * 5) + (Math.floor(o.totalMinutes / 60) * 10) + (o.arrestsCount * 3) + (o.qruCount * 2);
        return { ...o, score };
      }).sort((a, b) => b.score - a.score);

      setOfficers(sortedOfficers);
      if (sortedOfficers.length > 0) {
        setBestOfficer(sortedOfficers[0]);
      }

      // Encontrar Melhor Chefe de Guarnição (Aquele com mais chiefCount e mais sucesso)
      const chiefs = sortedOfficers.filter(o => o.chiefCount > 0);
      const topChief = chiefs.sort((a, b) => {
        const scoreA = (a.chiefCount * 10) + (a.arrestsCount * 5) + (a.qruCount * 3);
        const scoreB = (b.chiefCount * 10) + (b.arrestsCount * 5) + (b.qruCount * 3);
        return scoreB - scoreA;
      })[0];

      if (topChief) {
        setBestChief(topChief);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxScore = officers.length > 0 ? officers[0].score : 1;

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-zinc-500 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
        <span className="text-xs uppercase tracking-widest font-bold">Processando dados corporativos...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-outfit font-extrabold text-zinc-100 text-lg uppercase tracking-wider">Métricas e Desempenho</h2>
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">Painel Analítico do Alto Comando</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <p className="text-xs text-rose-400 font-bold">{error}</p>
        </div>
      )}

      {/* Top Level Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-colors" />
          <Shield className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Patrulhas (PTRs)</p>
          <p className="text-2xl font-outfit font-black text-zinc-200 mt-1">{totalPtrs}</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4 border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-colors" />
          <Clock className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Horas de Operação</p>
          <p className="text-2xl font-outfit font-black text-zinc-200 mt-1">{totalHours}h</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors" />
          <Target className="w-6 h-6 text-emerald-400 mb-2" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Prisões Totais</p>
          <p className="text-2xl font-outfit font-black text-zinc-200 mt-1">{totalArrests}</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-colors" />
          <Crosshair className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">QRUs Atendidos</p>
          <p className="text-2xl font-outfit font-black text-zinc-200 mt-1">{totalQrus}</p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bestOfficer && (
          <div className="glass-panel rounded-2xl p-5 border border-yellow-500/30 flex items-center gap-5 relative overflow-hidden bg-zinc-900/60 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
            <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-yellow-400 to-yellow-600" />
            
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
              <Award className="w-7 h-7 text-yellow-400" />
            </div>
            
            <div className="flex-1 relative z-10">
              <p className="text-[9px] text-yellow-500/80 font-bold uppercase tracking-widest mb-1">Destaque Geral Operacional</p>
              <h3 className="text-lg font-outfit font-black text-zinc-100 flex items-center gap-2">
                {bestOfficer.name}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-bold uppercase text-zinc-300">
                  <RankIcon role={bestOfficer.role} className="w-5 h-5 text-zinc-400" />
                  {getRankLabel(bestOfficer.role)}
                </span>
                <span className="text-xs text-yellow-400 font-bold">{bestOfficer.score} PONTOS</span>
              </div>
            </div>
          </div>
        )}

        {bestChief && (
          <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 flex items-center gap-5 relative overflow-hidden bg-zinc-900/60 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
            <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-purple-400 to-purple-600" />
            
            <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-purple-400" />
            </div>
            
            <div className="flex-1 relative z-10">
              <p className="text-[9px] text-purple-500/80 font-bold uppercase tracking-widest mb-1">Destaque Comando de Guarnição</p>
              <h3 className="text-lg font-outfit font-black text-zinc-100 flex items-center gap-2">
                {bestChief.name}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[9px] font-bold uppercase text-zinc-300">
                  <RankIcon role={bestChief.role} className="w-5 h-5 text-zinc-400" />
                  {getRankLabel(bestChief.role)}
                </span>
                <span className="text-xs text-purple-400 font-bold">{bestChief.chiefCount} PTRs Lideradas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bars (Ranking) */}
      <div className="glass-panel rounded-2xl p-6 border border-zinc-800/80 bg-zinc-900/40">
        <h3 className="font-outfit font-extrabold text-zinc-100 text-base uppercase tracking-wider mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-500" />
          Ranking de Oficial por Pontuação (Score)
        </h3>
        
        <div className="space-y-6">
          {officers.slice(0, 10).map((off, i) => {
            const percentage = Math.max(5, (off.score / maxScore) * 100);
            
            return (
              <div key={i} className="relative">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-zinc-800 text-zinc-400 font-mono text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold text-sm text-zinc-200">{off.name}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 uppercase font-semibold">{getRankLabel(off.role)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-yellow-400">{off.score} pts</span>
                    <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{off.ptrCount} PTRs | {Math.floor(off.totalMinutes/60)}h</p>
                  </div>
                </div>
                {/* Custom CSS Bar Chart */}
                <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400 relative"
                    style={{ width: `${percentage}%`, transition: 'width 1s ease-in-out' }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
