import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Prisional } from './pages/Prisional';
import { FichasPrisionais } from './pages/FichasPrisionais';
import { RelatoriosOcorrencias } from './pages/RelatoriosOcorrencias';
import { Ausencias } from './pages/Ausencias';
import { Subdivisoes } from './pages/Subdivisoes';
import { SubdivisaoManager } from './pages/SubdivisaoManager';
import { Corregedoria } from './pages/Corregedoria';
import { Cursos } from './pages/Cursos';
import { Informativos } from './pages/Informativos';
import { UserManagement } from './pages/UserManagement';
import { Exoneracoes } from './pages/Exoneracoes';
import { PermissionsConfig } from './pages/PermissionsConfig';
import { Metricas } from './pages/Metricas';
import { RedeSocial } from './pages/RedeSocial';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { PublicPost } from './pages/PublicPost';
import { BatePonto } from './pages/BatePonto';
import { RHPontoDashboard } from './pages/RHPontoDashboard';
import { Shield, ShieldAlert } from 'lucide-react';

// Private Route Wrapper with Permission Gating
const PrivateRoute: React.FC<{ children: React.ReactNode; permission?: string; title: string }> = ({ 
  children, 
  permission,
  title 
}) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600 gap-3">
        <Shield className="w-10 h-10 text-yellow-600 fill-yellow-600/5 animate-pulse" />
        <span className="text-[10px] font-bold tracking-widest font-mono text-slate-400 uppercase">RESOLVENDO INTEGRIDADE DO SISTEMA...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <MainLayout title={title}>
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-slate-500 px-4">
          <ShieldAlert className="w-12 h-12 text-rose-500/80 mb-3" />
          <h3 className="font-outfit font-bold text-slate-200">Acesso Restrito</h3>
          <p className="text-xs mt-1 text-center">Seu cargo militar atual não possui autorização para este canal.</p>
        </div>
      </MainLayout>
    );
  }

  return <MainLayout title={title}>{children}</MainLayout>;
};

// Main Layout Template
const MainLayout: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const { user, reloadUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clockingIn, setClockingIn] = useState(false);

  const isOutOfService = user && user.dutyStatus === 'fora-de-servico';
  const isBatePontoPage = location.pathname === '/bate-ponto';

  const handleClockIn = async () => {
    setClockingIn(true);
    try {
      const res = await fetch('/api/ponto/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await reloadUser();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao entrar em serviço.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClockingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto lg:pl-64 bg-zinc-950 text-zinc-200">
        <Header title={title} toggleSidebar={toggleSidebar} />
        <main className="flex-1 pb-12 relative">
          {/* Out of Service Blocker Overlay */}
          {isOutOfService && (location.pathname === '/prisional' || location.pathname === '/fichas') ? (
            <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
              <div className="max-w-md w-full glass-panel border border-zinc-800/80 bg-zinc-900/90 p-8 rounded-2xl text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-outfit font-extrabold text-xl text-zinc-100 uppercase tracking-wide">Você está Fora de Serviço</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Por determinação do comando, você deve bater o ponto de entrada para poder interagir com os outros módulos do painel.
                  </p>
                </div>
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleClockIn}
                    disabled={clockingIn}
                    className="flex-1 py-3 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center gap-2"
                  >
                    {clockingIn ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Bater Ponto de Entrada</span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/bate-ponto')}
                    className="flex-1 py-3 px-4 rounded-xl border border-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center"
                  >
                    Ver Meu Histórico
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth & Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/clipe/:id" element={<PublicPost />} />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <PrivateRoute permission="dashboard" title="Dashboard Geral">
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/prisional" 
            element={
              <PrivateRoute permission="prisional" title="Módulo Prisional (Pendente / Executado)">
                <Prisional />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/fichas" 
            element={
              <PrivateRoute permission="prisional" title="Histórico Prisional - Fichas">
                <FichasPrisionais />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/relatorios" 
            element={
              <PrivateRoute permission="relatorios" title="Gerenciamento de PTR">
                <RelatoriosOcorrencias />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/ausencias" 
            element={
              <PrivateRoute permission="ausencias" title="Solicitações de Ausência">
                <Ausencias />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/subdivisoes" 
            element={
              <PrivateRoute permission="comandos" title="Gestão de Subdivisões">
                <Subdivisoes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/subdivisao/:id" 
            element={
              <PrivateRoute permission="comandos" title="Gerenciar Subdivisão">
                <SubdivisaoManager />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/corregedoria" 
            element={
              <PrivateRoute permission="corregedoria" title="Corregedoria Interna COOP">
                <Corregedoria />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/cursos" 
            element={
              <PrivateRoute permission="cursos" title="Cursos & Apostilas de Estudo">
                <Cursos />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/informativos" 
            element={
              <PrivateRoute permission="informativos" title="Informativos e Diretrizes">
                <Informativos />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/usuarios" 
            element={
              <PrivateRoute permission="users" title="Gestão de Militares">
                <UserManagement />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/bate-ponto" 
            element={
              <PrivateRoute permission="dashboard" title="Terminal de Bate Ponto">
                <BatePonto />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/rh-ponto" 
            element={
              <PrivateRoute permission="users" title="RH - Controle de Ponto">
                <RHPontoDashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/exoneracoes" 
            element={
              <PrivateRoute permission="exoneracoes" title="Módulo de Exonerações">
                <Exoneracoes />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/permissoes" 
            element={
              <PrivateRoute permission="permissions" title="Configurações de Permissão">
                <PermissionsConfig />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/metricas" 
            element={
              <PrivateRoute permission="metrics" title="Métricas e Desempenho">
                <Metricas />
              </PrivateRoute>
            } 
          />

          <Route 
            path="/social" 
            element={
              <PrivateRoute permission="social" title="Comunidade e Vdeos">
                <RedeSocial />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <PrivateRoute permission="chat" title="Bate-Papo da Corporação">
                <Chat />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/perfil" 
            element={
              <PrivateRoute permission="dashboard" title="Meu Perfil">
                <Profile />
              </PrivateRoute>
            } 
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
