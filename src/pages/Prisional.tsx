import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clipboard, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

export const Prisional: React.FC = () => {
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // UI States
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Listen to postMessage responses from the reverse-proxied iframe calculator
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Handle the data extracted from the calculator DOM
      if (event.data && event.data.type === 'calculator_data_response') {
        const { prisonerName, passport, crimes, penalty, fine, bail, relatorio, files } = event.data.data;
        
        if (!prisonerName || !passport) {
          showToast('error', 'Preencha Nome e Passaporte na calculadora antes de registrar!');
          setLoading(false);
          return;
        }

        // Extract pure numbers from pena and multa text
        const penaltyVal = penalty.replace(/[^0-9]/g, '') || '0';
        const fineVal = fine.replace(/[^0-9]/g, '') || '0';

        // Retrieve base64 files
        const imageUrl = files.preso || '';
        const rgUrl = files.rg || '';
        const evidenceUrl = files.apreensao || '';
        const quimicoUrl = files.quimico || '';
        const residualUrl = files.residual || '';

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
              residualUrl
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Erro ao registrar.');
          }

          showToast('success', `Prisão de ${prisonerName} (ID: ${passport}) registrada com sucesso!`);
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
      // Trigger the injected scraper script inside the proxied iframe
      iframeRef.current.contentWindow.postMessage('get_calculator_data', '*');
    } else {
      showToast('error', 'A calculadora ainda não terminou de carregar.');
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 top-16 lg:left-64 flex flex-col overflow-hidden z-20">

      {/* ── Top Action Bar (dark, outside the iframe) ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-slate-900 border-b border-slate-800/70">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="text-[10px] font-mono uppercase tracking-widest">Calculadora Penal — Capital City</span>
        </div>
        <button
          onClick={handleRegisterOneClick}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/60 disabled:text-white/30 text-white text-xs font-bold tracking-wider uppercase transition-all shadow-sm active:scale-95"
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
