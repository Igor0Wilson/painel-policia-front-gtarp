import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarX, Check, X, RefreshCw, Send, AlertTriangle, CheckCircle, Calendar, CalendarDays } from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface AbsenceRequest {
  id: string;
  userId: string;
  name: string;
  role: string;
  date: string;
  reason: string;
  status: string;
  approvedBy: string;
  createdAt: string;
}

export const Ausencias: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  
  // Form fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchAbsences = async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/absences');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Erro ao buscar ausências:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (new Date(endDate) < new Date(startDate)) {
      setError('A data final não pode ser anterior à data de início.');
      return;
    }

    setLoading(true);

    try {
      // Formata as datas no frontend para manter compatibilidade com o backend que espera string "date"
      const formatLocal = (dStr: string) => {
        const parts = dStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };
      
      const formattedStart = formatLocal(startDate);
      const formattedEnd = formatLocal(endDate);
      const dateStr = startDate === endDate ? formattedStart : `${formattedStart} até ${formattedEnd}`;

      const response = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, reason })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao enviar solicitação.');
      }

      setSuccess('Solicitação de ausência enviada para análise!');
      setStartDate('');
      setEndDate('');
      setReason('');
      await fetchAbsences();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/absences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await fetchAbsences();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao processar solicitação.');
      }
    } catch (err) {
      console.error('Erro ao atualizar ausência:', err);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.15)]"><Check className="w-3 h-3"/> APROVADO</span>;
      case 'rejected':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(225,29,72,0.15)]"><X className="w-3 h-3"/> RECUSADO</span>;
      case 'pending':
      default:
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.15)] animate-pulse">PENDENTE</span>;
    }
  };

  const getRankLabel = (role: string) => {
    const roles: Record<string, string> = {
      'coronel': 'Coronel',
      'tenente-coronel': 'Ten. Coronel',
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

  const isOfficer = hasPermission('users'); // users management permission corresponds to officer role

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-transparent">
      
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-4xl font-outfit font-black text-slate-100 tracking-tight flex items-center gap-3">
          Justificar <span className="text-yellow-500">Ausência</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">Informe seus períodos de inatividade para evitar exoneração.</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-[0_0_15px_rgba(225,29,72,0.1)] animate-in zoom-in-95">
          <AlertTriangle className="w-5 h-5 text-rose-500"/> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-in zoom-in-95">
          <CheckCircle className="w-5 h-5 text-emerald-500"/> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Request Form */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 h-fit space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-500" />
          
          <div className="flex items-center gap-3 border-b border-slate-800/60 pb-5">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit font-bold text-xl text-slate-100">Nova Solicitação</h3>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Preencha os dados</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400" /> Data Inicial
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <CalendarDays className="w-3.5 h-3.5 text-yellow-400" /> Data Final
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Motivo Detalhado</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explique detalhadamente o motivo de sua ausência..."
                className="w-full glass-input resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold transition-all shadow-lg shadow-yellow-900/30 flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>ENVIAR SOLICITAÇÃO</span>
            </button>
          </form>
        </div>

        {/* Right: History List */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 min-h-[500px] flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/60 pb-5 mb-6 gap-4">
            <div>
              <h3 className="font-outfit font-bold text-2xl text-slate-100">Histórico de Pedidos</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Suas ausências registradas e status atual.</p>
            </div>
            <button 
              onClick={fetchAbsences} 
              disabled={fetching}
              className="p-3 text-slate-400 hover:text-yellow-400 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-yellow-500/30 transition-colors shadow-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin text-yellow-500' : ''}`} />
              <span className="text-xs font-bold sm:hidden">Atualizar</span>
            </button>
          </div>

          {fetching && requests.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-sm gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-yellow-500/20 border-t-yellow-500 animate-spin" />
              <span className="font-bold">Buscando histórico...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-24 text-center border border-slate-800 border-dashed rounded-3xl bg-slate-900/20 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center shadow-sm">
                <CalendarX className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                <p className="text-slate-300 font-bold text-lg">Nenhum pedido registrado</p>
                <p className="text-slate-500 text-sm mt-1">Você ainda não enviou justificativas de ausência.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
              {requests.map((req) => (
                <div key={req.id} className="p-5 rounded-2xl glass-card border-slate-800 hover:border-yellow-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="font-bold text-slate-200 text-lg">{req.name}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase w-fit flex items-center gap-1.5">
                        <RankIcon role={req.role} className="w-5 h-5 text-slate-400" />
                        {getRankLabel(req.role)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-yellow-400" />
                      <strong className="text-slate-300 font-bold">Período:</strong> <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-md border border-yellow-500/20 font-bold">{req.date}</span>
                    </p>
                    
                    <div className="text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800 leading-relaxed font-medium">
                      "{req.reason}"
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Enviado em {new Date(req.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      {req.approvedBy && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800">
                          Analisado por: <span className="text-slate-300">{req.approvedBy}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto justify-between sm:justify-start pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {getStatusBadge(req.status)}

                    {isOfficer && req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'approved')}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all shadow-sm flex items-center gap-1.5"
                          title="Aprovar"
                        >
                          <Check className="w-4 h-4" /> Aprovar
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'rejected')}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all shadow-sm flex items-center gap-1.5"
                          title="Recusar"
                        >
                          <X className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
