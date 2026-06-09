import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clipboard, 
  CheckCircle, 
  AlertTriangle,
  Users,
  Shield,
  ChevronDown,
  X
} from 'lucide-react';

export const Prisional: React.FC = () => {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // UI States
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // New Data States
  const [activePtrs, setActivePtrs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedPtrId, setSelectedPtrId] = useState<string>('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);

  // Ref to hold current state for the message event listener
  const stateRef = useRef({ participants, selectedPtrId, activePtrs });
  useEffect(() => {
    stateRef.current = { participants, selectedPtrId, activePtrs };
  }, [participants, selectedPtrId, activePtrs]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resPtrs, resUsers] = await Promise.all([
          fetch('/api/ptrs/active'),
          fetch('/api/users')
        ]);
        if (resPtrs.ok) setActivePtrs(await resPtrs.json());
        if (resUsers.ok) setAllUsers(await resUsers.json());
      } catch (err) {
      }
    };
    fetchData();
  }, []);

  // Listen to postMessage responses from the reverse-proxied iframe calculator
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'calculator_data_response') {
        const { prisonerName, passport, crimes, penalty, fine, bail, relatorio, files } = event.data.data;
        
        if (!prisonerName || !passport) {
          showToast('error', 'Preencha Nome e Passaporte na calculadora antes de registrar!');
          setLoading(false);
          return;
        }

        const penaltyVal = penalty.replace(/[^0-9]/g, '') || '0';
        const fineVal = fine.replace(/[^0-9]/g, '') || '0';

        const imageUrl = files.preso || '';
        const rgUrl = files.rg || '';
        const evidenceUrl = files.apreensao || '';
        const quimicoUrl = files.quimico || '';
        const residualUrl = files.residual || '';

        const ptrId = stateRef.current.selectedPtrId;
        const ptr = stateRef.current.activePtrs.find(p => p.id === ptrId);
        const ptrInfo = ptr ? { id: ptr.id, vtrNumber: ptr.vtrNumber, viaturaName: ptr.viaturaName } : null;

        const mappedParticipants = stateRef.current.participants.map(p => ({
          id: p.id || p.userId,
          name: p.name,
          role: p.role
        }));

        try {
          const response = await fetch('/api/prisional', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prisonerName,
              passport,
              crimes: crimes || 'Nenhum selecionado',
              penalty: `${penaltyVal} meses`,
              fine: fineVal,
              bail: bail || 'Não informada',
              rawText: relatorio || '',
              imageUrl,
              rgUrl,
              evidenceUrl,
              quimicoUrl,
              residualUrl,
              participants: mappedParticipants,
              ptrInfo
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao registrar.');
          }

          showToast('success', `Prisão de ${prisonerName} registrada com sucesso!`);
          
          // Clear selections after success
          setSelectedPtrId('');
          setParticipants([]);
        } catch (err: any) {
          showToast('error', `Erro ao registrar: ${err.message}`);
        } finally {
          setLoading(false);
        }
      } else if (event.data && event.data.type === 'calculator_data_error') {
        showToast('error', `Erro ao extrair laudo: ${event.data.error}`);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRegisterOneClick = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      setLoading(true);
      iframeRef.current.contentWindow.postMessage('get_calculator_data', '*');
    } else {
      showToast('error', 'A calculadora ainda não terminou de carregar.');
    }
  };

  const handleSelectPtr = (ptrId: string) => {
    setSelectedPtrId(ptrId);
    if (!ptrId) return;
    const ptr = activePtrs.find(p => p.id === ptrId);
    if (ptr) {
      const newParticipants = ptr.members.map((m: any) => {
        const fullUser = allUsers.find(u => u.id === m.userId);
        return fullUser || { id: m.userId, name: m.name, role: m.role };
      });
      setParticipants(newParticipants);
    }
  };

  const toggleParticipant = (user: any) => {
    if (participants.some(p => p.id === user.id || p.userId === user.id)) {
      setParticipants(participants.filter(p => p.id !== user.id && p.userId !== user.id));
    } else {
      setParticipants([...participants, user]);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-16 lg:left-64 flex flex-col overflow-hidden z-20" onClick={() => isUserSelectOpen && setIsUserSelectOpen(false)}>

      {/* ── Top Action Bar (dark, outside the iframe) ── */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800/70 gap-4">
        
        <div className="flex flex-1 flex-wrap items-center gap-4 text-slate-500 w-full">
          
          {/* PTR Select */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <select
              value={selectedPtrId}
              onChange={(e) => handleSelectPtr(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">-- Nenhuma Viatura --</option>
              {activePtrs.map(p => (
                <option key={p.id} value={p.id}>{p.vtrNumber} {p.viaturaName ? `(${p.viaturaName})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Participants Multi-Select */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsUserSelectOpen(!isUserSelectOpen)}
              className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-3 py-2 transition-colors min-w-[220px]"
            >
              <Users className="w-4 h-4 text-emerald-500" />
              {participants.length === 0 ? 'Marcar Policiais Envolvidos...' : `${participants.length} Policiais Marcados`}
              <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-500" />
            </button>

            {isUserSelectOpen && (
              <div className="absolute top-full mt-2 w-72 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 z-50 scrollbar-thin scrollbar-thumb-slate-700">
                {allUsers.map(u => {
                  const isSelected = participants.some(p => p.id === u.id || p.userId === u.id);
                  return (
                    <div 
                      key={u.id}
                      onClick={() => toggleParticipant(u)}
                      className={`p-2.5 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-all border ${
                        isSelected 
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 font-bold' 
                          : 'text-slate-300 hover:bg-slate-800 border-transparent font-medium'
                      }`}
                    >
                      <span>{u.name} <span className="text-slate-500 ml-1 font-mono font-normal">#{u.id}</span></span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleRegisterOneClick}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/60 disabled:text-white/30 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-sm active:scale-95"
        >
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Clipboard className="w-3.5 h-3.5" />
          )}
          <span>{loading ? 'Registrando...' : 'Registrar Relatório'}</span>
        </button>
      </div>

      {/* ── Full-height Iframe ── */}
      <div className="flex-1 w-full overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/api/proxy/calculadora"
          title="Calculadora Penal Oficial"
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      {/* ── Toast Notification ── */}
      {notification && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300"
          style={{
            background: notification.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            borderColor: notification.type === 'success' ? '#059669' : '#dc2626',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-white" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white" />
          )}
          <span className="font-outfit" style={{ color: '#ffffff' }}>{notification.text}</span>
        </div>
      )}
    </div>
  );
};

export default Prisional;
