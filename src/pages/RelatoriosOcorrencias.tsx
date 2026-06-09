import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  RefreshCw, Check, Shield, ShieldAlert, Users, Clock, Play, Square, UserPlus, LogOut, X, AlertTriangle, Crosshair, MapPin, DollarSign, Gavel, Award, User, Plus, CheckCircle, ClipboardPen, Trash2, FileText, ChevronUp, ChevronDown
} from 'lucide-react';
import { RankIcon } from '../components/RankIcon';

interface Prisoner {
  name: string;
  passport: string;
  reason: string;
  penalty: string;
}

interface UserData {
  id: string;
  name: string;
  role: string;
  status: string;
  dutyStatus?: string;
  isWaitingPtr?: boolean;
}

interface MemberData {
  userId: string;
  name: string;
  role: string;
  joinTime: string | null;
  totalTimeMs: number;
}

interface RequestData {
  userId: string;
  name: string;
  role: string;
  type: 'join' | 'leave';
  status: string;
}

interface ActivePtr {
  id: string;
  vtrNumber: string;
  status: 'preparation' | 'active';
  chiefId: string;
  members: MemberData[];
  pastMembers: MemberData[];
  requests: RequestData[];
  startedAt: string | null;
  createdAt: string;
}

interface PtrReport {
  id: string;
  userId: string;
  authorName: string;
  authorRole: string;
  vtrNumber?: string;
  barcaName: string;
  membersData?: MemberData[];
  qruCount: number;
  approachesCount: number;
  arrestsCount: number;
  finesCount: number;
  arrestDetails: Prisoner[];
  comments: string;
  createdAt: string;
}

export const RelatoriosOcorrencias: React.FC = () => {
  const { user } = useAuth();
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<'vtrs' | 'history'>('vtrs');

  // Data States
  const [reports, setReports] = useState<PtrReport[]>([]);
  const [activePtrs, setActivePtrs] = useState<ActivePtr[]>([]);
  const [systemUsers, setSystemUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Create VTR State
  const [isCreatingVtr, setIsCreatingVtr] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [chiefId, setChiefId] = useState<string>('');
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);

  // Finish PTR Form State
  const [isFinishing, setIsFinishing] = useState(false);
  const [qruCount, setQruCount] = useState('');
  const [approachesCount, setApproachesCount] = useState('');
  const [arrestsCount, setArrestsCount] = useState('');
  const [finesCount, setFinesCount] = useState('');
  const [comments, setComments] = useState('SEM ALTERAÇÕES');
  const [arrestDetails, setArrestDetails] = useState<Prisoner[]>([]);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date().getTime());
  const [viaturas, setViaturas] = useState<any[]>([]);
  const [selectedViaturaId, setSelectedViaturaId] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [repRes, ptrRes, usrRes, vtrRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/ptrs/active'),
        fetch('/api/users/all'),
        fetch('/api/viaturas')
      ]);

      if (repRes.ok) setReports(await repRes.json());
      if (ptrRes.ok) setActivePtrs(await ptrRes.json());
      if (usrRes.ok) {
        const users = await usrRes.json();
        setSystemUsers(users.filter((u: UserData) => u.status === 'active' && u.dutyStatus !== 'fora-de-servico'));
      }
      if (vtrRes.ok) setViaturas(await vtrRes.json());
    } catch (err) {
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const myPtr = activePtrs.find(p => p.members.some(m => m.userId === user?.id));
  const isChief = myPtr?.chiefId === user?.id;
  const isMeWaiting = systemUsers.find(u => u.id === user?.id)?.isWaitingPtr || false;

  // Formatting helpers
  const formatDuration = (totalMs: number, joinTime: string | null, status: string) => {
    let ms = totalMs;
    if (status === 'active' && joinTime) {
      ms += currentTime - new Date(joinTime).getTime();
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRankLabel = (role: string) => {
    const roles: Record<string, string> = {
      'coronel': 'Coronel',
      'tenente-coronel': 'Ten. Coronel',
      'major': 'Major',
      'capitao': 'Capitão',
      '1-tenente': '1º Tenente',
      '2-tenente': '2º Tenente',
      '1-sargento': '1º Sargento',
      '2-sargento': '2º Sargento',
      '3-sargento': '3º Sargento',
      'cabo': 'Cabo',
      '1-soldado': '1º Soldado',
      '2-soldado': '2º Soldado'
    };
    return roles[role] || role;
  };

  // VTR Creation Logic
  const handleCreateVtr = async () => {
    if (selectedUsers.length === 0) return setError('Selecione os tripulantes.');
    if (!chiefId) return setError('Selecione o Chefe da VTR.');

    setLoading(true);
    setError('');
    try {
      const selectedViatura = viaturas.find(v => v.id === selectedViaturaId);
      const res = await fetch('/api/ptrs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chiefId, 
          initialMembers: selectedUsers,
          viaturaId: selectedViatura?.id || null,
          viaturaName: selectedViatura?.name || null
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setSuccess('VTR Montada com sucesso!');
      setIsCreatingVtr(false);
      setSelectedUsers([]);
      setChiefId('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userToToggle: UserData) => {
    if (selectedUsers.some(u => u.id === userToToggle.id)) {
      const newSel = selectedUsers.filter(u => u.id !== userToToggle.id);
      setSelectedUsers(newSel);
      if (chiefId === userToToggle.id) setChiefId('');
    } else {
      if (selectedUsers.length >= 6) {
        alert('Limite máximo de 6 tripulantes atingido.');
        return;
      }
      const newSel = [...selectedUsers, userToToggle];
      setSelectedUsers(newSel);
      if (newSel.length === 1) setChiefId(userToToggle.id); // Auto-assign chief to first
    }
  };

  const handleToggleWaitingPtr = async () => {
    const isWaiting = !isMeWaiting;
    await handleAction('/api/users/waiting-ptr', { isWaiting });
  };

  const handleAction = async (endpoint: string, payload: any = {}) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      fetchData();
      setSuccess('Ação concluída com sucesso.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myPtr) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/ptrs/${myPtr.id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qruCount, approachesCount, arrestsCount, finesCount, arrestDetails, comments
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      setIsFinishing(false);
      setQruCount(''); setApproachesCount(''); setArrestsCount(''); setFinesCount('');
      setArrestDetails([]); setComments('SEM ALTERAÇÕES');
      fetchData();
      setActiveTab('history');
      setSuccess('Patrulha encerrada e relatório enviado!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Renders ---
  
  const renderMyPtr = () => {
    if (!myPtr) return null;

    return (
      <div className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-yellow-500/30 via-transparent to-yellow-500/20 mb-8 shadow-xl shadow-yellow-900/20">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl z-0 rounded-3xl" />
        
        {/* Glow effect for dark tactical mode */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-${myPtr.status === 'active' ? 'emerald' : 'amber'}-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen`} />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/80 pb-6 mb-8 gap-6">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                myPtr.status === 'active' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              }`}>
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-outfit font-black text-3xl text-slate-100 tracking-tight flex items-center gap-3">
                  {myPtr.vtrNumber}
                  {myPtr.viaturaName && (
                    <span className="text-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-xl">
                      {myPtr.viaturaName}
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    myPtr.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  }`}>
                    {myPtr.status === 'active' ? 'EM PATRULHA' : 'EM PREPARAÇÃO'}
                  </span>
                  {myPtr.startedAt && (
                    <span className="text-xs text-slate-400 font-mono bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
                      Início: {new Date(myPtr.startedAt).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              {isChief && myPtr.status === 'preparation' && (
                <button
                  onClick={() => handleAction(`/api/ptrs/${myPtr.id}/start`)}
                  disabled={loading}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 border border-emerald-400/20"
                >
                  <Play className="w-4 h-4" /> INICIAR PATRULHA
                </button>
              )}
              {isChief && myPtr.status === 'active' && !isFinishing && (
                <button
                  onClick={() => setIsFinishing(true)}
                  className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/40 border border-rose-400/20"
                >
                  <Square className="w-4 h-4" /> ENCERRAR
                </button>
              )}
              {!isChief && (
                <button
                  onClick={() => {
                    if(confirm("Deseja realmente solicitar saída desta VTR?")) {
                      handleAction(`/api/ptrs/${myPtr.id}/requests`, { type: 'leave' })
                    }
                  }}
                  disabled={loading}
                  className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-rose-500/30"
                >
                  <LogOut className="w-4 h-4" /> SOLICITAR SAÍDA
                </button>
              )}
            </div>
          </div>

          {/* Finishing Form Overlay - Tactical Dark Mode */}
          {isFinishing && isChief && (
            <div className="mb-8 rounded-2xl glass-panel relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-500" />
              
              <div className="p-6 sm:p-8">
                <button onClick={() => setIsFinishing(false)} className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                    <ClipboardPen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-xl text-slate-100">Relatório Final</h3>
                    <p className="text-xs text-slate-400 font-medium">Preencha as estatísticas da patrulha para encerramento.</p>
                  </div>
                </div>

                <form onSubmit={handleFinishPtr} className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="group">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400" /> QRUs
                      </label>
                      <input type="number" min="0" required value={qruCount} onChange={(e) => setQruCount(e.target.value)} placeholder="0" className="w-full glass-input" />
                    </div>
                    <div className="group">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <Crosshair className="w-3.5 h-3.5 text-emerald-400" /> Abordagens
                      </label>
                      <input type="number" min="0" required value={approachesCount} onChange={(e) => setApproachesCount(e.target.value)} placeholder="0" className="w-full glass-input" />
                    </div>
                    <div className="group">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <Gavel className="w-3.5 h-3.5 text-rose-400" /> Prisões
                      </label>
                      <input type="number" min="0" required value={arrestsCount} onChange={(e) => setArrestsCount(e.target.value)} placeholder="0" className="w-full glass-input" />
                    </div>
                    <div className="group">
                      <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400" /> Multas
                      </label>
                      <input type="number" min="0" required value={finesCount} onChange={(e) => setFinesCount(e.target.value)} placeholder="0" className="w-full glass-input" />
                    </div>
                  </div>

                  {Number(arrestsCount) > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-800/60">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4"/> Fichas Prisionais
                        </h4>
                        <button type="button" onClick={() => setArrestDetails([...arrestDetails, {name:'', passport:'', reason:'', penalty:''}])} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10">
                          <Plus className="w-3.5 h-3.5" /> ADD PRESO
                        </button>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {arrestDetails.map((p, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 shadow-inner relative group">
                            <button type="button" onClick={() => {
                              const list = [...arrestDetails];
                              list.splice(idx, 1);
                              setArrestDetails(list);
                            }} className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Prisioneiro #{idx+1}</span>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input type="text" required placeholder="Nome do Preso" value={p.name} onChange={e => {
                                  const list = [...arrestDetails]; list[idx].name = e.target.value; setArrestDetails(list);
                                }} className="w-full glass-input" />
                                <input type="text" required placeholder="Passaporte" value={p.passport} onChange={e => {
                                  const list = [...arrestDetails]; list[idx].passport = e.target.value; setArrestDetails(list);
                                }} className="w-full glass-input" />
                              </div>
                              <input type="text" required placeholder="Motivo da prisão" value={p.reason} onChange={e => {
                                  const list = [...arrestDetails]; list[idx].reason = e.target.value; setArrestDetails(list);
                                }} className="w-full glass-input" />
                              <input type="text" required placeholder="Pena Aplicada (Ex: 80 meses + 50k)" value={p.penalty} onChange={e => {
                                  const list = [...arrestDetails]; list[idx].penalty = e.target.value; setArrestDetails(list);
                                }} className="w-full glass-input" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Observações Adicionais</label>
                    <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full glass-input" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-600 hover:from-yellow-500 hover:to-yellow-500 font-bold text-white text-sm shadow-xl shadow-yellow-900/30 transition-all flex justify-center items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> ENVIAR RELATÓRIO E FINALIZAR VTR
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Members Grid */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4" /> Tripulação Atual
                </h4>
                {isChief && myPtr.members.length < 6 && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsUserSelectOpen(!isUserSelectOpen)}
                      className="px-3 py-1.5 rounded-lg bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 border border-yellow-500/30"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar Oficial
                    </button>
                    {isUserSelectOpen && (
                      <div className="absolute z-20 top-full right-0 mt-2 w-64 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2 space-y-1">
                        {systemUsers
                          .filter(u => u.isWaitingPtr && !activePtrs.some(p => p.members.some(m => m.userId === u.id)))
                          .map(u => (
                            <div 
                              key={u.id}
                              onClick={() => {
                                handleAction(`/api/ptrs/${myPtr.id}/add-member`, { targetUserId: u.id });
                                setIsUserSelectOpen(false);
                              }}
                              className="p-3 text-sm rounded-lg cursor-pointer flex items-center justify-between text-slate-300 hover:bg-slate-800 transition-all border border-transparent font-medium"
                            >
                              <span>{u.name} <span className="text-slate-500 text-[10px] ml-1 uppercase">Aguardando</span></span>
                            </div>
                        ))}
                        {systemUsers.filter(u => u.isWaitingPtr && !activePtrs.some(p => p.members.some(m => m.userId === u.id))).length === 0 && (
                          <div className="p-3 text-xs text-slate-500 text-center">Nenhum oficial aguardando PTR.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myPtr.members.map(m => (
                  <div key={m.userId} className={`relative p-5 rounded-2xl overflow-hidden transition-all shadow-sm ${
                    m.userId === myPtr.chiefId 
                      ? 'bg-yellow-900/20 border border-yellow-500/30' 
                      : 'bg-slate-900/40 border border-slate-800 hover:border-slate-700'
                  }`}>
                    {/* Inner glowing accent */}
                    {m.userId === myPtr.chiefId && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-yellow-500" />
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${m.userId === myPtr.chiefId ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-400'}`}>
                          {m.userId === myPtr.chiefId ? <Award className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-base">{m.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                            <RankIcon role={m.role} className="w-5 h-5 text-slate-400" />
                            <span className="uppercase tracking-wider font-bold">{getRankLabel(m.role)}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-500">#{m.userId}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center justify-between p-3 rounded-xl border ${myPtr.status === 'active' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-900/20 border-transparent'}`}>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className={`w-4 h-4 ${myPtr.status === 'active' ? 'text-yellow-400' : 'text-slate-500'}`} />
                        <span className="text-xs font-medium">Tempo na VTR</span>
                      </div>
                      <span className={`font-mono font-bold text-sm tracking-widest ${myPtr.status === 'active' ? 'text-slate-200' : 'text-slate-500'}`}>
                        {formatDuration(m.totalTimeMs, m.joinTime, myPtr.status)}
                      </span>
                    </div>

                    {isChief && m.userId !== user?.id && (
                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => {
                            if(confirm(`Transferir a liderança da VTR para ${m.name}? Você deixará de ser o chefe.`)) {
                              handleAction(`/api/ptrs/${myPtr.id}/transfer-chief`, { newChiefId: m.userId });
                            }
                          }}
                          className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-yellow-500/10 text-[10px] font-bold text-slate-400 hover:text-yellow-400 uppercase tracking-wider transition-colors border border-slate-800 hover:border-yellow-500/30"
                        >
                          Transferir
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm(`Remover ${m.name} da VTR?`)) {
                              handleAction(`/api/ptrs/${myPtr.id}/remove-member`, { targetUserId: m.userId });
                            }
                          }}
                          className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-rose-500/10 text-[10px] font-bold text-slate-400 hover:text-rose-400 uppercase tracking-wider transition-colors border border-slate-800 hover:border-rose-500/30"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Requests Panel */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                <span>Solicitações</span>
                {myPtr.requests.length > 0 && (
                  <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-md text-[10px] shadow-sm font-bold animate-pulse">
                    {myPtr.requests.length} Pendentes
                  </span>
                )}
              </h4>
              
              {myPtr.requests.length === 0 ? (
                <div className="p-6 rounded-2xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-center gap-3 bg-slate-900/20">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <p className="text-slate-500 text-xs font-medium">Nenhuma solicitação pendente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPtr.requests.map(req => (
                    <div key={`${req.userId}-${req.type}`} className="p-4 rounded-xl glass-card relative overflow-hidden">
                      <div className={`absolute left-0 top-0 w-1 h-full ${req.type === 'join' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      
                      <div className="flex justify-between items-start mb-3 pl-2">
                        <div>
                          <span className="font-bold text-slate-200 text-sm block">{req.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1 mt-1">
                            <RankIcon role={req.role} className="w-5 h-5 text-slate-400" />
                            {getRankLabel(req.role)}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider ${req.type === 'join' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          Deseja {req.type === 'join' ? 'Entrar' : 'Sair'}
                        </span>
                      </div>
                      
                      {isChief ? (
                        <div className="flex gap-2 mt-4 pl-2">
                          <button 
                            onClick={() => handleAction(`/api/ptrs/${myPtr.id}/requests/${req.userId}`, { action: 'approve', type: req.type })}
                            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-700 hover:border-emerald-500/30"
                          >Aprovar</button>
                          <button 
                            onClick={() => handleAction(`/api/ptrs/${myPtr.id}/requests/${req.userId}`, { action: 'deny', type: req.type })}
                            className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider transition-colors border border-slate-700 hover:border-rose-500/30"
                          >Recusar</button>
                        </div>
                      ) : (
                        <div className="mt-3 pl-2 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-slate-600 border-t-slate-400 animate-spin" />
                          <p className="text-[10px] text-slate-500 font-medium">Aguardando chefe...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivePtrs = () => {
    if (myPtr) return null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h3 className="font-outfit font-bold text-2xl text-slate-100 flex items-center gap-2">
              <RadioIcon /> Central de Patrulhas
            </h3>
            <p className="text-sm text-slate-400 mt-1">Acompanhe e participe das VTRs ativas na cidade.</p>
          </div>
          {user?.dutyStatus === 'fora-de-servico' ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-red-950/20 border border-red-500/20 px-5 py-3 rounded-2xl animate-in fade-in duration-300">
              <div className="flex items-center gap-3 text-red-400">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse text-red-500" />
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wider">Patrulha Restrita</p>
                  <p className="text-[10px] text-slate-400 font-medium">Bata o ponto de entrada para montar ou participar de patrulhas.</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto ml-auto">
                <button 
                  disabled
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-slate-600 border border-slate-850 text-xs font-bold cursor-not-allowed opacity-50 uppercase tracking-wider"
                >
                  Aguardar PTR
                </button>
                <button 
                  disabled
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-slate-600 border border-slate-850 text-xs font-bold cursor-not-allowed opacity-50 uppercase tracking-wider"
                >
                  Montar VTR
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleToggleWaitingPtr}
                disabled={loading}
                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border shadow-lg ${
                  isMeWaiting 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 shadow-amber-500/10 animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:text-slate-100 border-slate-700 hover:border-slate-500'
                }`}
              >
                <Clock className="w-5 h-5" />
                {isMeWaiting ? 'AGUARDANDO VTR...' : 'FICAR AGUARDANDO PTR'}
              </button>
              <button 
                onClick={() => setIsCreatingVtr(true)}
                className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-yellow-600/20"
              >
                <Plus className="w-5 h-5" /> MONTAR NOVA VTR
              </button>
            </div>
          )}
        </div>

        {/* Modal de Criação - Tactical Dark Mode */}
        {isCreatingVtr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl shadow-yellow-900/20 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-outfit font-bold text-2xl text-slate-100">Criar Nova VTR</h4>
                <button onClick={() => setIsCreatingVtr(false)} className="text-slate-500 hover:text-slate-300 p-2 rounded-lg hover:bg-slate-800 transition-colors"><X className="w-6 h-6"/></button>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Viatura Física</label>
                  <select
                    value={selectedViaturaId}
                    onChange={(e) => setSelectedViaturaId(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    <option value="">-- Selecione uma viatura --</option>
                    {viaturas.map(v => (
                      <option key={v.id} value={v.id} className="bg-slate-900 text-slate-200">
                        {v.name} (Min: {getRankLabel(v.minRole)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Selecionar Tripulação (MÁX 6)</label>
                  <div 
                    onClick={() => setIsUserSelectOpen(!isUserSelectOpen)}
                    className="w-full p-4 rounded-xl glass-input cursor-pointer min-h-[60px] flex flex-wrap gap-2 items-center"
                  >
                    {selectedUsers.length === 0 ? <span className="text-slate-500 text-sm">Clique para buscar militares...</span> : (
                      selectedUsers.map(u => (
                        <span key={u.id} className="bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 border border-yellow-500/30">
                          {u.name}
                          <button onClick={(e) => { e.stopPropagation(); toggleUserSelection(u); }} className="hover:text-rose-400 transition-colors"><X className="w-4 h-4"/></button>
                        </span>
                      ))
                    )}
                  </div>

                  {isUserSelectOpen && (
                    <div className="absolute z-20 top-full left-0 mt-2 w-full max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                      {systemUsers
                        .filter(u => u.isWaitingPtr || selectedUsers.some(su => su.id === u.id))
                        .map(u => {
                        const isSelected = selectedUsers.some(su => su.id === u.id);
                        const inOtherPtr = activePtrs.some(p => p.members.some(m => m.userId === u.id));

                        if (inOtherPtr && !isSelected) {
                          return (
                            <div key={u.id} className="p-3 text-sm rounded-lg flex items-center justify-between text-slate-500 bg-slate-900/50 cursor-not-allowed border border-transparent">
                              <span>{u.name}</span>
                              <span className="text-[10px] uppercase font-bold text-rose-500/80 bg-rose-500/10 px-2 py-1 rounded">Em Patrulha</span>
                            </div>
                          )
                        }

                        return (
                          <div 
                            key={u.id}
                            onClick={() => toggleUserSelection(u)}
                            className={`p-3 text-sm rounded-lg cursor-pointer flex items-center justify-between transition-all border ${
                              isSelected 
                                ? 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30 font-bold' 
                                : 'text-slate-300 hover:bg-slate-800 border-transparent font-medium'
                            }`}
                          >
                            <span>{u.name} <span className="text-slate-500 text-xs ml-1 font-mono font-normal">#{u.id}</span></span>
                            {isSelected && <Check className="w-5 h-5 text-yellow-400" />}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {selectedUsers.length > 0 && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Definir Chefe da VTR</label>
                    <select 
                      value={chiefId} 
                      onChange={(e) => setChiefId(e.target.value)}
                    >
                      {selectedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}

                <button 
                  onClick={handleCreateVtr} 
                  disabled={loading || selectedUsers.length === 0} 
                  className="w-full py-4 mt-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-bold transition-all shadow-lg shadow-yellow-900/30"
                >
                  CONFIRMAR E CRIAR VTR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VTRs List */}
        {activePtrs.length === 0 ? (
          <div className="py-20 text-center border border-slate-800 border-dashed rounded-3xl bg-slate-900/20 flex flex-col items-center justify-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
              <Shield className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <p className="text-slate-300 font-bold text-lg">Nenhuma viatura em operação</p>
              <p className="text-slate-500 text-sm mt-1">A cidade está sem patrulhas ativas no momento.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activePtrs.map(ptr => (
              <div key={ptr.id} className="glass-panel p-1 rounded-2xl hover:border-slate-700 transition-all duration-300 flex flex-col">
                <div className="bg-slate-900/60 rounded-[14px] p-5 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${ptr.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        <Shield className="w-6 h-6" />
                      </div>
                      <h4 className="font-outfit font-black text-2xl text-slate-200">{ptr.vtrNumber}</h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${
                      ptr.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${ptr.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      {ptr.status === 'active' ? 'Ativa' : 'Prep'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-6 flex-1 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Guarnição ({ptr.members.length}/6)
                    </p>
                    {ptr.members.map(m => (
                      <div key={m.userId} className="text-xs text-slate-300 flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-800 transition-colors">
                        <span className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${m.userId === ptr.chiefId ? 'bg-yellow-400' : 'bg-slate-600'}`} />
                          <span className={m.userId === ptr.chiefId ? "font-bold text-slate-200" : "font-medium"}>{m.name}</span>
                          {m.userId === ptr.chiefId && <span className="text-[9px] text-yellow-400 font-bold ml-1 uppercase">(Chefe)</span>}
                        </span>
                        {ptr.status === 'active' && <span className="font-mono text-[10px] text-slate-500 font-bold">{formatDuration(m.totalTimeMs, m.joinTime, ptr.status)}</span>}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleAction(`/api/ptrs/${ptr.id}/requests`, { type: 'join' })}
                    disabled={loading || user?.dutyStatus === 'fora-de-servico' || ptr.members.length >= 6 || ptr.requests.some(r => r.userId === user?.id && r.type === 'join')}
                    className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-yellow-500/20 text-yellow-400 font-bold text-xs transition-colors border border-slate-700 hover:border-yellow-500/30 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" /> {user?.dutyStatus === 'fora-de-servico' ? 'PONTO EXIGIDO' : 'SOLICITAR ENTRADA'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="font-outfit font-black text-3xl text-slate-100 flex items-center gap-3">
              <FileText className="text-yellow-500 w-8 h-8" /> Relatórios Anteriores
            </h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">Histórico completo de patrulhamentos finalizados.</p>
          </div>
          <button 
            onClick={fetchData} 
            disabled={fetching}
            className="p-3 text-slate-400 hover:text-yellow-400 rounded-xl glass-panel transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin text-yellow-500' : ''}`} />
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="py-24 text-center border border-slate-800 border-dashed rounded-3xl bg-slate-900/20">
            <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-300 font-bold text-lg">Nenhum relatório encontrado</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reports.map((rep) => {
              const isOpen = openReportId === rep.id;
              
              let parsedMembers = [];
              if (rep.membersData && rep.membersData.length > 0) {
                 parsedMembers = rep.membersData;
              } else {
                 parsedMembers = rep.barcaName.split(',').map((p, i) => {
                   const [name, ...rest] = p.trim().split('#');
                   return {
                     userId: rest.join('#'),
                     name: name.trim(),
                     role: 'Militar',
                     isChief: i === 0 // Assume first is chief in old format
                   }
                 });
              }

              return (
                <div key={rep.id} className={`rounded-2xl transition-all duration-300 overflow-hidden ${
                  isOpen ? 'glass-panel border-yellow-500/30 shadow-xl shadow-yellow-900/20' : 'bg-slate-900/40 border border-slate-800 hover:border-slate-700'
                }`}>
                  <button 
                    onClick={() => setOpenReportId(isOpen ? null : rep.id)} 
                    className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left transition-colors hover:bg-slate-800/50"
                  >
                    <div className="flex items-start sm:items-center gap-4 sm:gap-6 w-full">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${isOpen ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        <Shield className="w-7 h-7" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                          <h4 className="text-lg font-black text-slate-100">{rep.vtrNumber || 'PTR-Antiga'}</h4>
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-400 bg-slate-950/50 border border-slate-800">
                            {new Date(rep.createdAt).toLocaleDateString('pt-BR')} às {new Date(rep.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                           {parsedMembers.map((m: any, i) => {
                             return (
                               <div key={i} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border ${m.isChief ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                 <RankIcon role={m.role} className="w-5 h-5 opacity-80" />
                                 {m.name} {m.isChief && '(Chefe)'}
                               </div>
                             );
                           })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {!isOpen && (
                         <div className="hidden lg:flex items-center gap-3 mr-4">
                            <span className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[11px] font-bold">QRUs: {rep.qruCount}</span>
                            <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">Presos: {rep.arrestsCount}</span>
                         </div>
                      )}
                      <div className={`p-2 rounded-xl transition-colors border ${isOpen ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-slate-800 border-slate-700 group-hover:bg-slate-700'}`}>
                        {isOpen ? <ChevronUp className="w-5 h-5 text-yellow-400" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-6 sm:p-8 border-t border-slate-800/60 bg-slate-950/40">
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                          <div className="p-5 rounded-2xl glass-card flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
                            <MapPin className="w-5 h-5 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">QRUs Atendidos</span>
                            <span className="text-3xl font-black text-slate-100">{rep.qruCount}</span>
                          </div>
                          <div className="p-5 rounded-2xl glass-card flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                            <Crosshair className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Abordagens</span>
                            <span className="text-3xl font-black text-slate-100">{rep.approachesCount}</span>
                          </div>
                          <div className="p-5 rounded-2xl glass-card flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
                            <Gavel className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Prisões</span>
                            <span className="text-3xl font-black text-slate-100">{rep.arrestsCount}</span>
                          </div>
                          <div className="p-5 rounded-2xl glass-card flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                            <DollarSign className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Multas</span>
                            <span className="text-3xl font-black text-slate-100">{rep.finesCount}</span>
                          </div>
                        </div>

                        {rep.arrestDetails && rep.arrestDetails.length > 0 && (
                          <div className="mb-8 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                            <h5 className="text-[12px] font-black text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800/50 pb-3">
                              <Users className="w-5 h-5 text-rose-500"/> Fichas Prisionais Registradas
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {rep.arrestDetails.map((pris, pIdx) => (
                                <div key={pIdx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-rose-500/30 transition-colors">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                    <span className="font-bold text-slate-200 flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-400">{pIdx + 1}</div>
                                      {pris.name} <span className="text-slate-500 text-xs font-mono font-medium">(Passaporte: {pris.passport})</span>
                                    </span>
                                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase">
                                      Pena: {pris.penalty}
                                    </span>
                                  </div>
                                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    <p className="text-slate-400 text-sm leading-relaxed"><strong className="text-slate-300">Motivo:</strong> {pris.reason}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-6 border-t border-slate-800">
                          <h5 className="text-[12px] font-black text-slate-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ClipboardPen className="w-4 h-4 text-yellow-400" /> Observações Finais
                          </h5>
                          <div className="text-slate-300 text-sm bg-slate-900/60 p-5 rounded-2xl border border-slate-800 whitespace-pre-line leading-relaxed shadow-inner">
                            {rep.comments}
                          </div>
                          
                          <div className="mt-5 flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-950 inline-flex px-3 py-1.5 rounded-lg border border-slate-800">
                            Enviado por: <span className="text-slate-300 font-bold">{rep.authorName}</span> <span className="uppercase text-[10px] ml-1 bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{getRankLabel(rep.authorRole)}</span>
                          </div>
                        </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 bg-transparent">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-4xl font-outfit font-black text-slate-100 tracking-tight">Relatórios <span className="text-yellow-500">PTR</span></h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">Gestão em tempo real de patrulhas e emissão de boletins.</p>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl w-full sm:w-auto shadow-inner">
          <button 
            onClick={() => setActiveTab('vtrs')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'vtrs' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/30' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            Gestão Ativa
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'history' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/30' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Toast Alerts */}
      {error && (
        <div className="fixed bottom-6 right-6 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-2xl rounded-xl text-xs font-bold tracking-widest flex items-center gap-2 animate-in slide-in-from-bottom-5 z-[9999]">
          <AlertTriangle className="w-4 h-4"/> {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-6 right-6 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-2xl rounded-xl text-xs font-bold tracking-widest flex items-center gap-2 animate-in slide-in-from-bottom-5 z-[9999]">
          <CheckCircle className="w-4 h-4"/> {success}
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-[500px]">
        {activeTab === 'vtrs' ? (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {renderMyPtr()}
            {renderActivePtrs()}
          </div>
        ) : (
          <div className="animate-in slide-in-from-left-4 duration-300">
            {renderHistory()}
          </div>
        )}
      </div>
    </div>
  );
};

const RadioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>;
