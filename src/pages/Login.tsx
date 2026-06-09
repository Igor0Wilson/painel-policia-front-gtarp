import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login fields
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register fields
  const [qra, setQra] = useState('');
  const [ra, setRa] = useState('');
  const [passport, setPassport] = useState('');
  const [patente, setPatente] = useState('2-soldado');
  const [responsible, setResponsible] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login.');
      }

      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passport,
          name: qra,
          password: regPassword,
          role: patente,
          ra,
          responsible
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao solicitar acesso.');
      }

      setSuccess(data.message || 'Solicitação de acesso enviada com sucesso! Aguarde aprovação.');
      
      // Reset request fields
      setQra('');
      setRa('');
      setPassport('');
      setResponsible('');
      setRegPassword('');
      setShowRegPassword(false);
      
      // Go back to login after 3 seconds
      setTimeout(() => {
        setIsRegistering(false);
        setError('');
        setSuccess('');
      }, 3500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black font-sans relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />
      <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-yellow-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-[420px] px-6 flex flex-col items-center">
        
        {/* Logo at the top with premium glow */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full scale-75 group-hover:bg-yellow-500/30 transition-all duration-700 pointer-events-none" />
          <img src="/logo.png" alt="COOP Logo" className="relative w-40 sm:w-48 drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
        </div>
        
        {/* Modern Glassmorphism Login Box */}
        <div className="w-full relative">
          {/* Subtle border glow */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-yellow-500/20 to-transparent pointer-events-none" />
          
          <div className="relative w-full bg-zinc-950/60 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            <div className="flex items-center gap-2 mb-8">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] text-center">
                {isRegistering ? 'Solicitar Acesso' : 'Autenticação'}
              </h2>
            </div>

            {/* Error / Success */}
            {error && <div className="w-full p-4 mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-bold">{error}</div>}
            {success && <div className="w-full p-4 mb-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold">{success}</div>}

            {!isRegistering ? (
              <form onSubmit={handleLogin} className="w-full space-y-5">
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      placeholder="Passaporte"
                      className="w-full !px-5 !py-4 rounded-2xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-medium"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full !pl-5 !pr-12 !py-4 rounded-2xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-yellow-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-6 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-zinc-800 disabled:to-zinc-800 text-black text-sm font-black uppercase tracking-[0.15em] transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] flex justify-center items-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar no Sistema'}
                </button>

                <div className="pt-8 pb-2 text-center text-[10px] text-zinc-600 leading-relaxed font-bold uppercase tracking-[0.15em]">
                  Comando Ostensivo de Operações Policiais
                </div>
              </form>
            ) : (
              <form onSubmit={handleRequestAccess} className="w-full space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative col-span-2">
                    <input
                      type="text"
                      required
                      value={qra}
                      onChange={(e) => setQra(e.target.value)}
                      placeholder="Nome Operacional"
                      className="w-full !px-5 !py-3.5 rounded-xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all font-medium"
                    />
                  </div>

                  <div className="relative col-span-1">
                    <input
                      type="text"
                      required
                      value={passport}
                      onChange={(e) => setPassport(e.target.value)}
                      placeholder="Passaporte"
                      className="w-full !px-5 !py-3.5 rounded-xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all font-medium"
                    />
                  </div>

                  <div className="relative col-span-1">
                    <select
                      value={patente}
                      onChange={(e) => setPatente(e.target.value)}
                      className="w-full !px-5 !py-3.5 rounded-xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm focus:outline-none focus:border-yellow-500/50 transition-all appearance-none font-medium"
                    >
                      <option value="aluno">Aluno Soldado</option>
                      <option value="soldado">Soldado</option>
                      <option value="cabo">Cabo</option>
                      <option value="3-sargento">3º Sargento</option>
                      <option value="2-sargento">2º Sargento</option>
                      <option value="1-sargento">1º Sargento</option>
                      <option value="subtenente">Subtenente</option>
                      <option value="aspirante">Aspirante a Oficial</option>
                      <option value="2-tenente">2º Tenente</option>
                      <option value="1-tenente">1º Tenente</option>
                      <option value="capitao">Capitão</option>
                      <option value="major">Major</option>
                      <option value="tenente-coronel">Tenente-Coronel</option>
                      <option value="coronel">Coronel</option>
                    </select>
                  </div>

                  <div className="relative col-span-2">
                    <input
                      type="text"
                      required
                      value={responsible}
                      onChange={(e) => setResponsible(e.target.value)}
                      placeholder="Responsável pelo recrutamento"
                      className="w-full !px-5 !py-3.5 rounded-xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all font-medium"
                    />
                  </div>

                  <div className="relative col-span-2">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Senha segura"
                      className="w-full !pl-5 !pr-12 !py-3.5 rounded-xl border border-zinc-800/80 bg-black/50 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-yellow-500 transition-colors"
                      tabIndex={-1}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-6 rounded-xl bg-zinc-200 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex justify-center items-center"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Solicitar Aprovação'}
                </button>

              </form>
            )}
          </div>
        </div>

        {/* Floating action links */}
        <div className="mt-8 text-center">
          {!isRegistering ? (
            <div className="text-[11px] text-zinc-500 font-medium tracking-wide">
              Não possui acesso? <button onClick={() => setIsRegistering(true)} className="text-yellow-500 font-bold uppercase hover:text-yellow-400 transition-colors ml-1">Solicitar Acesso</button>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 font-medium tracking-wide">
              Já pertence à corporação? <button onClick={() => setIsRegistering(false)} className="text-yellow-500 font-bold uppercase hover:text-yellow-400 transition-colors ml-1">Voltar ao Login</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Login;
