import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Clock, ShieldAlert, Award } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface UserStat {
  id: string;
  name: string;
  role: string;
  dutyStatus: string;
  totalHours: number;
}

interface Anomaly {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  type: string;
  description: string;
  clockIn: string | null;
  clockOut: string | null;
}

interface DashboardData {
  summary: {
    totalActiveDuty: number;
    totalOutOfDuty: number;
    totalAnomalies: number;
  };
  bestPerformer: UserStat | null;
  worstPerformer: UserStat | null;
  highPerformance: UserStat[];
  lowPerformance: UserStat[];
  anomalies: Anomaly[];
  charts: {
    pieData: { name: string; value: number }[];
    barData: { name: string; hours: number }[];
  };
}

export const RHPontoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const fetchDashboard = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/ponto/admin/dashboard');
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard de RH', err);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Ausente';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOfficer = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  if (!isOfficer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <ShieldAlert className="w-12 h-12 text-rose-500/80 mb-3" />
        <h3 className="font-outfit font-bold text-slate-200">Acesso Restrito</h3>
        <p className="text-xs mt-1">Apenas oficiais superiores de RH podem gerenciar o controle de ponto do efetivo.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-3" />
        <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Buscando dados de serviço...</span>
      </div>
    );
  }

  // Calculate percentages for SVG Donut
  const activeDutyCount = data.summary.totalActiveDuty;
  const outOfDutyCount = data.summary.totalOutOfDuty;
  const totalUsers = activeDutyCount + outOfDutyCount;
  const inServicePercent = totalUsers > 0 ? (activeDutyCount / totalUsers) * 100 : 0;
  const donutCircumference = 2 * Math.PI * 40; // ~251.3
  const strokeDashoffset = donutCircumference - (donutCircumference * inServicePercent) / 100;

  // Max value for bar chart normalization
  const maxHours = data.charts.barData.length > 0 
    ? Math.max(...data.charts.barData.map(b => b.hours), 1) 
    : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="font-outfit font-bold text-zinc-100 text-lg">Administração de Ponto e Escala (RH)</h2>
            <p className="text-xs text-zinc-500">Monitore o desempenho de plantões, contabilização de horas e resolva anomalias de serviço.</p>
          </div>
        </div>
        <button 
          onClick={fetchDashboard} 
          disabled={fetching}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          title="Recarregar dados"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${fetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Stats & Performer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI: In Duty */}
        <div className="glass-panel p-4 border border-zinc-850 rounded-xl bg-zinc-950 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Policiais de Serviço</span>
            <h3 className="text-2xl font-extrabold text-emerald-400">{activeDutyCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        {/* KPI: Out of Duty */}
        <div className="glass-panel p-4 border border-zinc-850 rounded-xl bg-zinc-950 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fora de Serviço</span>
            <h3 className="text-2xl font-extrabold text-zinc-400">{outOfDutyCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Anomalies */}
        <div className="glass-panel p-4 border border-zinc-850 rounded-xl bg-zinc-950 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Anomalias Ativas</span>
            <h3 className="text-2xl font-extrabold text-red-500">{data.summary.totalAnomalies}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI: Performance Leader */}
        <div className="glass-panel p-4 border border-zinc-850 rounded-xl bg-zinc-950 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Efetivo Cadastrado</span>
            <h3 className="text-2xl font-extrabold text-yellow-500">{totalUsers}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
            <Award className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Best & Worst Performers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Best Performance */}
        <div className="glass-panel p-5 border border-zinc-850 rounded-2xl bg-zinc-950/40 relative overflow-hidden flex items-center gap-4">
          <div className="absolute right-4 top-4 text-emerald-500/10">
            <TrendingUp className="w-24 h-24" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mais Desempenho (Escala)</span>
            {data.bestPerformer ? (
              <div>
                <h4 className="font-outfit font-bold text-zinc-200 text-sm">{data.bestPerformer.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase">
                    {getRankLabel(data.bestPerformer.role)}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">{data.bestPerformer.totalHours} Horas</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Sem registros fechados</p>
            )}
          </div>
        </div>

        {/* Card: Worst Performance */}
        <div className="glass-panel p-5 border border-zinc-850 rounded-2xl bg-zinc-950/40 relative overflow-hidden flex items-center gap-4">
          <div className="absolute right-4 top-4 text-red-500/10">
            <TrendingDown className="w-24 h-24" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <TrendingDown className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Menos Desempenho (Escala)</span>
            {data.worstPerformer ? (
              <div>
                <h4 className="font-outfit font-bold text-zinc-200 text-sm">{data.worstPerformer.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase">
                    {getRankLabel(data.worstPerformer.role)}
                  </span>
                  <span className="text-xs font-bold text-rose-450 text-red-400">{data.worstPerformer.totalHours} Horas</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">Sem registros fechados</p>
            )}
          </div>
        </div>
      </div>

      {/* Roster & Anomalies Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Performance lists (High vs Low) */}
        <div className="lg:col-span-1 space-y-6">
          {/* List: High Performance */}
          <div className="glass-panel p-5 border border-zinc-850 rounded-2xl bg-zinc-950 space-y-4">
            <h3 className="font-outfit font-bold text-zinc-250 text-xs tracking-wider uppercase border-b border-zinc-900 pb-2 text-emerald-400">
              Alto Desempenho
            </h3>
            {data.highPerformance.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4 italic">Nenhum oficial com horas.</p>
            ) : (
              <div className="space-y-2.5">
                {data.highPerformance.map((u, idx) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/30 border border-zinc-900 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-extrabold flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-zinc-300">{u.name}</span>
                        <p className="text-[9px] text-zinc-500 uppercase">{getRankLabel(u.role)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono">{u.totalHours}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List: Low Performance */}
          <div className="glass-panel p-5 border border-zinc-850 rounded-2xl bg-zinc-950 space-y-4">
            <h3 className="font-outfit font-bold text-zinc-250 text-xs tracking-wider uppercase border-b border-zinc-900 pb-2 text-red-400">
              Baixo Desempenho
            </h3>
            {data.lowPerformance.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4 italic">Nenhum militar cadastrado.</p>
            ) : (
              <div className="space-y-2.5">
                {data.lowPerformance.map((u, idx) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/30 border border-zinc-900 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-400 font-extrabold flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-zinc-300">{u.name}</span>
                        <p className="text-[9px] text-zinc-500 uppercase">{getRankLabel(u.role)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-red-400 font-mono">{u.totalHours}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Anomalies board (2 Columns) */}
        <div className="lg:col-span-2 glass-panel p-5 border border-zinc-850 rounded-2xl bg-zinc-950 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-4">
            <h3 className="font-outfit font-bold text-zinc-250 text-xs tracking-wider uppercase border-b border-zinc-900 pb-2 text-yellow-500">
              Controle de Anomalias de Plantão
            </h3>
            {data.anomalies.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-xs text-zinc-500 italic">Nenhuma anomalia ativa detectada na guarnição.</p>
                <p className="text-[10px] text-zinc-650 mt-1">Todos os militares bateram ponto corretamente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase">
                      <th className="py-2 px-1">Militar</th>
                      <th className="py-2 px-1">Desvio Identificado</th>
                      <th className="py-2 px-1">Entrada</th>
                      <th className="py-2 px-1 text-right">Saída</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/30 text-xs">
                    {data.anomalies.map(a => (
                      <tr key={a.id} className="hover:bg-zinc-900/10">
                        <td className="py-2.5 px-1 font-bold text-zinc-350">{a.userName}</td>
                        <td className="py-2.5 px-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            a.type === 'missing_clock_in' 
                              ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' 
                              : 'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`}>
                            {a.description}
                          </span>
                        </td>
                        <td className="py-2.5 px-1 font-mono text-[10px] text-zinc-500">{formatDate(a.clockIn)}</td>
                        <td className="py-2.5 px-1 text-right font-mono text-[10px] text-zinc-500">{formatDate(a.clockOut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SVG Charts Section underneath */}
      <div className="glass-panel p-6 border border-zinc-850 rounded-2xl bg-zinc-950 space-y-6">
        <h3 className="font-outfit font-bold text-zinc-250 text-xs tracking-wider uppercase border-b border-zinc-900 pb-2.5 text-zinc-300">
          Relatórios Gráficos da Guarnição
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Chart 1: Donut Pie Chart (SVG) */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-900/20 border border-zinc-900/50">
            <h4 className="text-xs font-semibold text-zinc-400 mb-6 font-outfit uppercase tracking-wider">Status de Cobertura (Em Serviço vs Fora)</h4>
            
            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* SVG Donut */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Outer circle base */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#18181b" strokeWidth="8" />
                  
                  {/* Segment: In Service */}
                  {totalUsers > 0 && (
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="transparent" 
                      stroke="#10b981" 
                      strokeWidth="8" 
                      strokeDasharray={donutCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    />
                  )}
                </svg>
                {/* Center text */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-black text-zinc-150">{totalUsers > 0 ? Math.round(inServicePercent) : 0}%</span>
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Cobertura</span>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-300">Em Serviço</span>
                    <p className="text-[10px] text-zinc-500">{activeDutyCount} policial(is)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded bg-zinc-800" />
                  <div className="text-xs">
                    <span className="font-bold text-zinc-300">Fora de Serviço</span>
                    <p className="text-[10px] text-zinc-500">{outOfDutyCount} policial(is)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Bar Chart (SVG columns) */}
          <div className="flex flex-col justify-between p-5 rounded-xl bg-zinc-900/20 border border-zinc-900/50 overflow-hidden">
            <h4 className="text-xs font-semibold text-zinc-400 mb-4 font-outfit uppercase tracking-wider">Comparativo de Horas por Patente (Hierarquia)</h4>
            
            {data.charts.barData.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-12 italic">Nenhum dado registrado para gerar o gráfico.</p>
            ) : (
              <div className="flex items-end justify-between h-44 pt-6 border-b border-zinc-800 px-1">
                {data.charts.barData.map((item, index) => {
                  const percent = (item.hours / maxHours) * 100;
                  return (
                    <div key={index} className="flex flex-col items-center group relative flex-1 mx-0.5 max-w-[42px]">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-zinc-800 text-[10px] text-zinc-100 px-2 py-0.5 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg font-mono whitespace-nowrap">
                        {item.name}: {item.hours}h
                      </div>
                      {/* Column block */}
                      <div 
                        style={{ height: `${Math.max(6, percent)}%` }} 
                        className="w-full rounded-t bg-gradient-to-t from-yellow-600 to-yellow-400 group-hover:from-yellow-400 group-hover:to-yellow-300 transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.1)]"
                      />
                      <span className="text-[7px] text-zinc-500 mt-2 truncate w-full text-center" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
