import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Clipboard, Search, RefreshCw, Image, X,
  FileText, Clock, DollarSign, User, Calendar,
  AlertTriangle, CheckCircle, ExternalLink, ChevronDown, Gavel,
} from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface PrisonRecord {
  id: string;
  prisonerName: string;
  passport: string;
  crimes: string;
  penalty: string;
  fine: number;
  bail: string;
  imageUrl?: string;
  rgUrl?: string;
  evidenceUrl?: string;
  quimicoUrl?: string;
  residualUrl?: string;
  rawText?: string;
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  participants?: { id: string; name: string; role: string }[];
  ptrInfo?: { id: string; vtrNumber: string; viaturaName: string } | null;
}

const parseCrimes = (raw: string): string[] =>
  raw.split(/\n|;|•|\|/).map(s => s.replace(/^[\s\-\d\.\)]+/, '').trim()).filter(Boolean);

export const FichasPrisionais: React.FC = () => {
  const { user } = useAuth();
  const [records,  setRecords]  = useState<PrisonRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc'|'date-asc'|'penalty-desc'|'penalty-asc'>('date-desc');
  const [selectedRecord, setSelectedRecord] = useState<PrisonRecord|null>(null);
  const [previewImage,   setPreviewImage]   = useState<string|null>(null);
  const [previewTitle,   setPreviewTitle]   = useState('');
  const [notification,   setNotification]   = useState<{type:'success'|'error';text:string}|null>(null);

  const showToast = (type: 'success'|'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRecords = async () => {
    try {
      setFetching(true);
      const r = await fetch('/api/prisional');
      if (r.ok) setRecords(await r.json());
    } catch { showToast('error', 'Erro ao carregar registros.'); }
    finally   { setFetching(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

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
  const handleCopy = async (rec: PrisonRecord) => {
    try {
      let t = `⚖️ **FICHA PRISIONAL - PMCC** ⚖️\n\n`;
      t += `👤 **Nome:** ${rec.prisonerName}\n🆔 **Passaporte:** ${rec.passport}\n👮 **Captor Oficial:** ${rec.createdByName} (${getRankLabel(rec.createdByRole)})\n`;
      if (rec.ptrInfo) {
        t += `🚓 **Viatura:** ${rec.ptrInfo.vtrNumber} ${rec.ptrInfo.viaturaName ? `(${rec.ptrInfo.viaturaName})` : ''}\n`;
      }
      if (rec.participants && rec.participants.length > 0) {
        t += `👥 **Guarnição:** ${rec.participants.map(p => p.name).join(', ')}\n`;
      }
      t += `\n`;
      t += `⏳ **Pena:** ${rec.penalty}\n💸 **Multa:** R$ ${Number(rec.fine).toLocaleString('pt-BR')}\n💰 **Fiança:** ${rec.bail}\n\n`;
      t += `📜 **Crimes:**\n${rec.crimes}\n\n`;
      if (rec.rawText)    t += `📝 **Relatório:**\n${rec.rawText}\n\n`;
      if (rec.imageUrl)   t += `🖼️ Foto do Preso: ${window.location.origin}/api/prisional/${rec.id}/image/preso\n`;
      if (rec.rgUrl)      t += `🖼️ Foto do RG: ${window.location.origin}/api/prisional/${rec.id}/image/rg\n`;
      if (rec.evidenceUrl)t += `🖼️ Apreensão: ${window.location.origin}/api/prisional/${rec.id}/image/provas\n`;
      if (rec.quimicoUrl) t += `🖼️ Teste Químico: ${window.location.origin}/api/prisional/${rec.id}/image/quimico\n`;
      if (rec.residualUrl)t += `🖼️ Teste Residual: ${window.location.origin}/api/prisional/${rec.id}/image/residual\n`;
      await navigator.clipboard.writeText(t);
      showToast('success', `Ficha de ${rec.prisonerName} copiada!`);
    } catch (e: any) { showToast('error', e.message); }
  };

  const filtered = records
    .filter(r =>
      r.prisonerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.passport.includes(searchTerm) ||
      r.crimes.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date-desc') return +new Date(b.createdAt) - +new Date(a.createdAt);
      if (sortBy === 'date-asc')  return +new Date(a.createdAt) - +new Date(b.createdAt);
      const n = (x: string) => parseInt(x.replace(/\D/g,'')) || 0;
      return sortBy === 'penalty-desc' ? n(b.penalty)-n(a.penalty) : n(a.penalty)-n(b.penalty);
    });

  /* ─────────────── BURP-STYLE CARD (Now Discord Dark) ─────────────── */
  const BurpCard = ({ rec }: { rec: PrisonRecord }) => {
    const isBailFree = /não|inafiançável|in/i.test(rec.bail) || rec.bail === '0';
    const crimes = parseCrimes(rec.crimes);

    return (
      <div className="flex flex-col rounded-2xl overflow-hidden shadow-xl glass-card border border-zinc-800 transition-all hover:border-zinc-700 min-w-0">
        {/* ── Gradient Header ── */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-yellow-600/80 to-yellow-600/80">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mugshot mini */}
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-950/40 border border-white/20 shadow-inner">
              {rec.imageUrl
                ? <img src={rec.imageUrl} alt="" className="w-full h-full object-cover" />
                : <User className="w-4 h-4 text-white/60" />}
            </div>
            <div className="min-w-0">
              <p className="font-outfit font-black text-sm text-zinc-100 leading-tight truncate drop-shadow-sm">{rec.prisonerName}</p>
              <p className="text-[9px] text-zinc-200/80 font-mono font-bold">ID {rec.passport}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedRecord(rec)}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-zinc-950/30 hover:bg-zinc-950/50 text-white text-[9px] font-bold uppercase tracking-wider transition-all border border-white/20 shadow-sm"
          >
            Ver
          </button>
        </div>

        {/* ── Stats — individual boxes ── */}
        <div className="p-3 space-y-2">

          {/* Pena */}
          <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">
              <span>⏳</span> PENA TOTAL
            </p>
            <p className="text-lg font-black font-outfit text-yellow-400">{rec.penalty}</p>
          </div>

          {/* Multa */}
          <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">
              <span>💸</span> MULTA
            </p>
            <p className="text-lg font-black font-outfit text-amber-400">R$ {Number(rec.fine).toLocaleString('pt-BR')}</p>
          </div>

          {/* Fiança */}
          <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">
              <span>💰</span> FIANÇA
            </p>
            <p className={`text-lg font-black font-outfit ${isBailFree ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isBailFree ? 'Inafiançável' : rec.bail}
            </p>
          </div>

          {/* Crimes */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <span>☰</span> CRIMES SELECIONADOS
              </p>
              <span className="text-[9px] font-black text-zinc-100 bg-yellow-600 rounded-full w-5 h-5 flex items-center justify-center shadow-sm">{crimes.length}</span>
            </div>
            <div className="px-4 py-2 space-y-1 bg-zinc-950/40">
              {crimes.length === 0 ? (
                <p className="text-xs text-zinc-600 italic py-1 text-center font-medium">Nenhum crime selecionado</p>
              ) : crimes.map((c, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  <span className="flex-shrink-0 text-[9px] font-mono text-zinc-500 mt-0.5 w-4 text-right">{i+1}.</span>
                  <span className="text-xs text-zinc-300 leading-snug font-medium">{c}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Footer: captor + actions ── */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-zinc-800 bg-zinc-950/80">
          <div className="min-w-0">
            <p className="text-xs text-zinc-300 font-semibold truncate">{rec.createdByName}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <p className="text-[9px] text-zinc-500 font-mono flex items-center gap-1 font-bold">
                <Calendar className="w-2.5 h-2.5" />
                {new Date(rec.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {rec.participants && rec.participants.length > 0 && (
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 text-emerald-500" />
                  {rec.participants.length}
                </span>
              )}
              {rec.ptrInfo && (
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-amber-500" />
                  {rec.ptrInfo.vtrNumber}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleCopy(rec)}
              title="Copiar Ficha"
              className="p-2 rounded-lg transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
            {(rec.evidenceUrl || rec.rgUrl || rec.quimicoUrl || rec.residualUrl) && (
              <button
                onClick={() => {
                  const firstImg = rec.evidenceUrl || rec.rgUrl || rec.quimicoUrl || rec.residualUrl || null;
                  const firstTitle = rec.evidenceUrl ? 'Apreensão' : rec.rgUrl ? 'Foto do RG' : rec.quimicoUrl ? 'Teste Químico' : 'Teste Residual';
                  setPreviewImage(firstImg);
                  setPreviewTitle(`${firstTitle} — ${rec.prisonerName}`);
                }}
                title="Ver Provas"
                className="p-2 rounded-lg transition-all bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20"
              >
                <Image className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────── DETAIL MODAL ─────────────── */
  const DetailModal = ({ rec }: { rec: PrisonRecord }) => {
    const isBailFree = /não|inafiançável|in/i.test(rec.bail) || rec.bail === '0';
    const crimes = parseCrimes(rec.crimes);
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
        onClick={() => setSelectedRecord(null)}
      >
        <div
          className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl glass-panel border border-zinc-800"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between gap-3 bg-gradient-to-r from-yellow-600/90 to-yellow-600/90 shadow-sm border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-950/40 border border-white/20 shadow-inner">
                {rec.imageUrl
                  ? <img src={rec.imageUrl} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => { setPreviewImage(rec.imageUrl||null); setPreviewTitle(rec.prisonerName); }} />
                  : <User className="w-5 h-5 text-zinc-100/60" />}
              </div>
              <div className="min-w-0">
                <p className="font-outfit font-black text-base text-zinc-100 leading-tight truncate drop-shadow-sm">{rec.prisonerName}</p>
                <p className="text-[10px] text-zinc-200/80 font-mono font-bold">Passaporte: {rec.passport}</p>
              </div>
            </div>
            <button onClick={() => setSelectedRecord(null)} className="p-1.5 rounded-lg bg-zinc-950/30 hover:bg-zinc-950/50 text-white transition-colors flex-shrink-0 border border-transparent hover:border-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
            {/* Pena */}
            <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800 shadow-inner">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">⏳ PENA TOTAL</p>
              <p className="text-2xl font-black font-outfit text-yellow-400">{rec.penalty}</p>
            </div>

            {/* Multa */}
            <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800 shadow-inner">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">💸 MULTA</p>
              <p className="text-2xl font-black font-outfit text-amber-400">R$ {Number(rec.fine).toLocaleString('pt-BR')}</p>
            </div>

            {/* Fiança */}
            <div className="rounded-xl px-4 py-3 text-center bg-zinc-950/60 border border-zinc-800 shadow-inner">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1.5 mb-1">💰 FIANÇA</p>
              <p className={`text-2xl font-black font-outfit ${isBailFree ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isBailFree ? 'Inafiançável' : rec.bail}
              </p>
            </div>

            {/* Crimes */}
            <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/80">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">☰ CRIMES SELECIONADOS</p>
                <span className="text-[9px] font-black text-white bg-yellow-600 rounded-full w-5 h-5 flex items-center justify-center shadow-sm">{crimes.length}</span>
              </div>
              <div className="px-4 py-3 space-y-2 bg-zinc-950/40">
                {crimes.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic text-center font-medium">Nenhum crime selecionado</p>
                ) : crimes.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 text-[9px] font-mono text-zinc-500 mt-0.5 w-4 text-right">{i+1}.</span>
                    <span className="text-xs text-zinc-300 leading-snug font-medium">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Captor info */}
            <div className="rounded-xl px-4 py-3 flex items-center justify-between bg-zinc-950/60 border border-zinc-800 shadow-sm">
              <div>
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">@ CAPTOR OFICIAL</p>
                <p className="text-sm text-zinc-200 font-bold">{rec.createdByName}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1.5 mt-0.5">
                  <RankIcon role={rec.createdByRole} className="w-5 h-5 text-zinc-500" />
                  {getRankLabel(rec.createdByRole)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Data</p>
                <p className="text-xs text-zinc-400 font-mono font-bold">{new Date(rec.createdAt).toLocaleDateString('pt-BR')}</p>
                <p className="text-[9px] text-zinc-600 font-mono font-bold">{new Date(rec.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Guarnição / PTR Info */}
            {(rec.ptrInfo || (rec.participants && rec.participants.length > 0)) && (
              <div className="rounded-xl px-4 py-3 bg-zinc-950/60 border border-zinc-800 shadow-sm">
                <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-emerald-500" />
                  GUARNIÇÃO / ENVOLVIDOS
                </p>
                {rec.ptrInfo && (
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      {rec.ptrInfo.vtrNumber} {rec.ptrInfo.viaturaName ? `(${rec.ptrInfo.viaturaName})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {rec.participants && rec.participants.length > 0 ? (
                    rec.participants.map(p => (
                      <span key={p.id} className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
                        <RankIcon role={p.role} className="w-3 h-3 text-zinc-500" />
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-medium italic">Nenhum outro policial registrado.</span>
                  )}
                </div>
              </div>
            )}

            {/* Relatório */}
            {rec.rawText && (
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
                <div className="px-4 py-2.5 bg-zinc-950/80">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" /> RELATÓRIO
                  </p>
                </div>
                <div className="px-4 py-3 bg-zinc-950/40">
                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono font-medium">{rec.rawText}</p>
                </div>
              </div>
            )}

            {/* Evidências */}
            {(rec.imageUrl || rec.rgUrl || rec.evidenceUrl || rec.quimicoUrl || rec.residualUrl) && (
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-sm">
                <div className="px-4 py-2.5 bg-zinc-950/80">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <Image className="w-3 h-3" /> EVIDÊNCIAS
                  </p>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2 bg-zinc-950/40">
                  {rec.imageUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 cursor-zoom-in group" onClick={() => { setPreviewImage(rec.imageUrl||null); setPreviewTitle(`Foto do Preso — ${rec.prisonerName}`); }}>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase px-2 py-1 text-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">Foto do Preso</p>
                      <img src={rec.imageUrl} alt="" className="w-full h-24 object-cover" />
                    </div>
                  )}
                  {rec.rgUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 cursor-zoom-in group" onClick={() => { setPreviewImage(rec.rgUrl||null); setPreviewTitle(`Foto do RG — ${rec.prisonerName}`); }}>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase px-2 py-1 text-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">Foto do RG</p>
                      <img src={rec.rgUrl} alt="" className="w-full h-24 object-cover" />
                    </div>
                  )}
                  {rec.evidenceUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 cursor-zoom-in group" onClick={() => { setPreviewImage(rec.evidenceUrl||null); setPreviewTitle(`Apreensão — ${rec.prisonerName}`); }}>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase px-2 py-1 text-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">Apreensão</p>
                      <img src={rec.evidenceUrl} alt="" className="w-full h-24 object-cover" />
                    </div>
                  )}
                  {rec.quimicoUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 cursor-zoom-in group" onClick={() => { setPreviewImage(rec.quimicoUrl||null); setPreviewTitle(`Teste Químico — ${rec.prisonerName}`); }}>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase px-2 py-1 text-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">Teste Químico</p>
                      <img src={rec.quimicoUrl} alt="" className="w-full h-24 object-cover" />
                    </div>
                  )}
                  {rec.residualUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 cursor-zoom-in group" onClick={() => { setPreviewImage(rec.residualUrl||null); setPreviewTitle(`Teste Residual — ${rec.prisonerName}`); }}>
                      <p className="text-[8px] text-zinc-400 font-bold uppercase px-2 py-1 text-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">Teste Residual</p>
                      <img src={rec.residualUrl} alt="" className="w-full h-24 object-cover" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-zinc-800 bg-zinc-900/80">
            <button
              onClick={() => handleCopy(rec)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 border border-emerald-400/20"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copiar Ficha
            </button>
            <button
              onClick={() => setSelectedRecord(null)}
              className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-bold border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-all shadow-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────── PAGE ─────────────── */
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto bg-transparent">

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-4xl font-black font-outfit text-zinc-100 tracking-tight">Histórico Prisional</h1>
          <p className="text-sm text-zinc-400 mt-1 font-medium">{records.length} ficha{records.length !== 1 ? 's' : ''} registrada{records.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={fetchRecords}
          disabled={fetching}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin text-yellow-500' : ''}`} />
          Recarregar
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, passaporte ou crime..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 glass-input shadow-sm"
          />
        </div>
        <div className="relative sm:w-56">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full glass-input shadow-sm"
          >
            <option value="date-desc">Mais Recentes</option>
            <option value="date-asc">Mais Antigos</option>
            <option value="penalty-desc">Pena (Maior)</option>
            <option value="penalty-asc">Pena (Menor)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {fetching && records.length === 0 ? (
        <div className="py-32 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-zinc-500">Carregando fichas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
          <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-sm">
            <Shield className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-300 font-bold text-xl">Nenhuma ficha encontrada</p>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Verifique os filtros de pesquisa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(rec => <BurpCard key={rec.id} rec={rec} />)}
        </div>
      )}

      {/* Modal */}
      {selectedRecord && <DetailModal rec={selectedRecord} />}

      {/* Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer bg-zinc-950/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl glass-panel border border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-950/80">
              <span className="text-sm font-bold text-zinc-300">{previewTitle}</span>
              <button onClick={() => setPreviewImage(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors border border-transparent hover:border-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={previewImage} alt="" className="w-full max-h-[85vh] object-contain bg-zinc-950" />
          </div>
        </div>
      )}

      {/* Toast */}
      {notification && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300"
          style={{
            background: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            borderColor: notification.type === 'success' ? '#059669' : '#dc2626',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
          }}
        >
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-white" /> : <AlertTriangle className="w-4 h-4 text-white" />}
          <span className="font-outfit" style={{ color: '#ffffff' }}>{notification.text}</span>
        </div>
      )}
    </div>
  );
};

export default FichasPrisionais;
