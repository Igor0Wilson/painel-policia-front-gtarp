import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Prisional } from './pages/Prisional';
import { FichasPrisionais } from './pages/FichasPrisionais';
import { RelatoriosOcorrencias } from './pages/RelatoriosOcorrencias';
import { Ausencias } from './pages/Ausencias';
import { ComandosOperadores } from './pages/ComandosOperadores';
import { Corregedoria } from './pages/Corregedoria';
import { Cursos } from './pages/Cursos';
import { Informativos } from './pages/Informativos';
import { UserManagement } from './pages/UserManagement';
import { Exoneracoes } from './pages/Exoneracoes';
import { PermissionsConfig } from './pages/PermissionsConfig';
import { Metricas } from './pages/Metricas';
import { RedeSocial } from './pages/RedeSocial';
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

  return (
    <div className="min-h-screen bg-zinc-950 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto lg:pl-64 bg-zinc-950 text-zinc-200">
        <Header title={title} toggleSidebar={toggleSidebar} />
        <main className="flex-1 pb-12">
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
          {/* Public Auth */}
          <Route path="/login" element={<Login />} />

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
            path="/comandos" 
            element={
              <PrivateRoute permission="comandos" title="Quadros Táticos e Operadores">
                <ComandosOperadores />
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
              <PrivateRoute permission="dashboard" title="Comunidade e Vídeos">
                <RedeSocial />
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
