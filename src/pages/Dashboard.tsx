import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Radio, 
  FileText, 
  Calendar, 
  Shield, 
  Bell, 
  ArrowRight,
  UserPlus,
  Send,
  Sparkles,
  ClipboardPen,
  FileQuestion
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { RankIcon } from '../components/RankIcon';

interface Announcement {
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  date: string;
}

interface PromotionLog {
  userId: string;
  userName: string;
  oldRole: string;
  newRole: string;
  promotedBy: string;
  date: string;
}

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [promotions, setPromotions] = useState<PromotionLog[]>([]);
  const [stats, setStats] = useState({
    copomCount: 0,
    reportsCount: 0,
    pendingAbsences: 0
  });
  
  // Post announcement states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');
  const [annError, setAnnError] = useState('');

  const [loading, setLoading] = useState(true);

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats
      const copomRes = await fetch('/api/copom/active');
      const reportsRes = await fetch('/api/reports');
      const absencesRes = await fetch('/api/absences');
      
      let copomCount = 0;
      let reportsCount = 0;
      let pendingAbsences = 0;

      if (copomRes.ok) {
        const copomData = await copomRes.json();
        copomCount = copomData.length;
      }
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        reportsCount = reportsData.length;
      }
      if (absencesRes.ok) {
        const absencesData = await absencesRes.json();
        pendingAbsences = absencesData.filter((a: any) => a.status === 'pending').length;
      }

      setStats({ copomCount, reportsCount, pendingAbsences });

      // Fetch Announcements
      const annRes = await fetch('/api/announcements');
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData);
      }

      // Fetch Promotions Logs
      const promRes = await fetch('/api/promotions/logs');
      if (promRes.ok) {
        const promData = await promRes.json();
        setPromotions(promData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    setPostingAnn(true);
    setAnnError('');
    setAnnSuccess('');

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: annTitle, content: annContent })
      });

      if (response.ok) {
        setAnnSuccess('Aviso geral publicado!');
        setAnnTitle('');
        setAnnContent('');
        setShowAnnForm(false);
        // Refresh announcements
        const annRes = await fetch('/api/announcements');
        if (annRes.ok) {
          const annData = await annRes.json();
          setAnnouncements(annData);
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao publicar aviso.');
      }
    } catch (err: any) {
      setAnnError(err.message);
    } finally {
      setPostingAnn(false);
    }
  };

  const isHighCommand = user?.role === 'coronel' || user?.role === 'tenente-coronel';

  return (
    <div className="p-6 space-y-6">
      
      {/* Tactical caution stripes decoration at top of page */}
      <div className="h-1.5 w-full caution-stripes rounded-lg" />

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/60 via-slate-900/40 to-slate-950 border border-slate-800/80 p-6 shadow-xl police-border">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-yellow-500/5 blur-2xl" />
        <div className="z-10 relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] bg-yellow-600/10 text-yellow-400 font-bold px-3 py-1 rounded-full border border-yellow-500/20 uppercase tracking-widest">
              Central Operativa Geral COOP
            </span>
            <h1 className="font-outfit font-extrabold text-2xl sm:text-3xl text-slate-100 mt-2.5">
              Bem-vindo, {user?.name}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Painel integrado do Comando Ostensivo de Operações Policiais. Efetue check-in no COPOM, consulte a calculadora penal ou envie relatórios de PTR nos botões de acesso rápido.
            </p>
          </div>
          {hasPermission('users') && (
            <Link 
              to="/usuarios" 
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-yellow-500/20 uppercase tracking-wider"
            >
              <UserPlus className="w-4 h-4" />
              <span>Gerenciar Efetivo</span>
            </Link>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* COPOM */}
        <Link to="/copom" className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Membros em QAP (COPOM)</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-200 group-hover:text-yellow-400 transition-colors">
              {loading ? '...' : stats.copomCount}
            </h3>
            <p className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">Acessar Frequência →</p>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/5 text-yellow-500 border border-yellow-500/15 group-hover:bg-yellow-600/10 transition-colors">
            <Radio className="w-5.5 h-5.5 animate-pulse" />
          </div>
        </Link>

        {/* Reports */}
        <Link to="/relatorios" className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Patrulhas (PTR) Registradas</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-200 group-hover:text-yellow-400 transition-colors">
              {loading ? '...' : stats.reportsCount}
            </h3>
            <p className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">Ver Histórico →</p>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/5 text-yellow-500 border border-yellow-500/15 group-hover:bg-yellow-600/10 transition-colors">
            <FileText className="w-5.5 h-5.5" />
          </div>
        </Link>

        {/* Absences */}
        <Link to="/ausencias" className="glass-card rounded-xl p-5 border border-slate-800/80 hover:border-slate-700/50 transition-all flex items-center justify-between group sm:col-span-2 lg:col-span-1">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ausências Justificadas</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-200 group-hover:text-amber-400 transition-colors">
              {loading ? '...' : stats.pendingAbsences}
            </h3>
            <p className="text-[9px] text-slate-600 font-medium uppercase tracking-wide">Ver Pedidos →</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/5 text-amber-500 border border-amber-500/15 group-hover:bg-amber-600/10 transition-colors">
            <Calendar className="w-5.5 h-5.5" />
          </div>
        </Link>
      </div>

      {/* Full-width Announcements Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-yellow-500/20 relative overflow-hidden bg-black shadow-[0_0_40px_rgba(234,179,8,0.05)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-yellow-400 to-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.5)]" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-yellow-500/20 pb-5 mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/30 shadow-inner">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-outfit font-black text-zinc-100 text-2xl uppercase tracking-tight">Comunicações Oficiais</h3>
                <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-[0.2em] mt-0.5">Alto Comando do Batalhão</p>
              </div>
            </div>
            {isHighCommand && (
              <button
                onClick={() => { setShowAnnForm(!showAnnForm); setAnnError(''); setAnnSuccess(''); }}
                className="text-xs bg-yellow-600 hover:bg-yellow-500 text-black font-black px-4 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] uppercase flex items-center gap-2"
              >
                {showAnnForm ? 'FECHAR FORMULÁRIO' : 'PUBLICAR AVISO'}
              </button>
            )}
          </div>

          {/* Posting Form */}
          {showAnnForm && isHighCommand && (
            <form onSubmit={handlePostAnnouncement} className="mb-8 p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 shadow-inner">
              <h4 className="text-xs font-black text-yellow-500 uppercase tracking-[0.15em] flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Novo Comunicado Oficial
              </h4>
              
              <input
                type="text"
                required
                placeholder="Título do aviso"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm font-bold text-white placeholder-zinc-500 border-zinc-800 focus:border-yellow-500"
              />

              <textarea
                required
                placeholder="Escreva a mensagem oficial..."
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl glass-input text-sm text-zinc-300 placeholder-zinc-500 border-zinc-800 focus:border-yellow-500 resize-none"
              />

              <div className="flex justify-between items-center gap-4 pt-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Postando como: Coronel/Ten. Coronel</span>
                <button
                  type="submit"
                  disabled={postingAnn}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 uppercase tracking-wide"
                >
                  <Send className="w-4 h-4" />
                  <span>Publicar</span>
                </button>
              </div>
              {annSuccess && <p className="text-xs text-emerald-400 font-bold mt-2">{annSuccess}</p>}
              {annError && <p className="text-xs text-rose-400 font-bold mt-2">{annError}</p>}
            </form>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-600">
              <div className="w-8 h-8 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin mb-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Buscando avisos...</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-600">
              <FileQuestion className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-outfit font-bold text-xl uppercase tracking-widest">Nenhum Aviso</p>
              <p className="text-sm">O Alto Comando não publicou comunicados recentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {announcements.map((ann, idx) => (
                <div key={idx} className="relative p-6 sm:p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-yellow-500/30 transition-all group overflow-hidden shadow-lg flex flex-col">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-600/30 to-transparent group-hover:from-yellow-500 transition-colors" />
                  
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h4 className="text-lg font-outfit font-black text-zinc-100 uppercase tracking-tight flex-1 group-hover:text-yellow-400 transition-colors">{ann.title}</h4>
                    <div className="shrink-0 bg-black px-3 py-1.5 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest">
                        {new Date(ann.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed font-medium flex-1 mb-6">
                    {ann.content}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-zinc-900 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                    <Shield className="w-4 h-4 text-yellow-500/70" />
                    <span>Autor:</span>
                    <span className="text-zinc-200">{ann.authorName}</span>
                    <span className="ml-auto px-2 py-1 rounded bg-black text-yellow-500 border border-yellow-900/30 text-[9px] font-black uppercase flex items-center gap-1.5 shadow-inner">
                      <RankIcon role={ann.authorRole} className="w-3.5 h-3.5 text-yellow-500" />
                      {getRankLabel(ann.authorRole)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-zinc-900 pt-5 mt-8 flex justify-end">
            <Link 
              to="/informativos" 
              className="text-xs text-yellow-500 hover:text-yellow-400 font-black inline-flex items-center gap-2 group transition-colors uppercase tracking-[0.15em]"
            >
              <span>Acessar Diretrizes Táticas Completas</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Promotions Below */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-zinc-800/80 bg-zinc-950/80 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 border-b border-zinc-900 pb-5 mb-6">
          <div className="p-2.5 rounded-xl bg-zinc-900 text-yellow-500 border border-zinc-800">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-outfit font-black text-zinc-100 text-xl tracking-tight uppercase">Diário Oficial de Promoções</h3>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-zinc-600">
            <div className="w-6 h-6 rounded-full border-2 border-yellow-500/20 border-t-yellow-500 animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="py-16 text-center text-zinc-600 text-sm font-bold uppercase tracking-widest">
            Nenhum registro de promoção recente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {promotions.map((log, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-black border border-zinc-800/80 flex flex-col gap-3 hover:border-yellow-500/20 transition-colors group">
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono font-bold">
                  <span>{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                  <span className="uppercase text-zinc-600">Por: {log.promotedBy}</span>
                </div>
                <div className="text-zinc-300 text-sm leading-snug font-medium">
                  Policial <span className="font-black text-zinc-100 group-hover:text-yellow-400 transition-colors">{log.userName}</span> foi elevado na hierarquia:
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] uppercase tracking-wider text-zinc-400 font-black">{getRankLabel(log.oldRole)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] uppercase tracking-wider text-yellow-500 font-black shadow-inner">{getRankLabel(log.newRole)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
