import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Radio, 
  FileText, 
  Calculator, 
  CalendarX, 
  Users, 
  BookOpen, 
  KeyRound, 
  UserCog, 
  LogOut, 
  Shield, 
  Menu, 
  X,
  FileQuestion,
  ShieldAlert,
  Archive,
  BarChart2,
  PlaySquare,
  UserMinus
} from 'lucide-react';

import { RankIcon } from './RankIcon';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, logout, hasPermission } = useAuth();

  const getRankBadgeColor = (role: string) => {
    switch (role) {
      case 'coronel':
        return 'bg-red-950 text-red-400 border-red-800/40';
      case 'tenente-coronel':
        return 'bg-orange-950 text-orange-400 border-orange-800/40';
      case 'major':
        return 'bg-amber-950 text-amber-400 border-amber-800/40';
      case 'capitao':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800/40';
      case '1-tenente':
        return 'bg-yellow-950 text-yellow-450 border-yellow-800/40';
      case '2-tenente':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800/40';
      case '1-sargento':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800/40';
      case '2-sargento':
        return 'bg-emerald-950 text-emerald-500 border-emerald-800/30';
      case '3-sargento':
        return 'bg-teal-950 text-teal-400 border-teal-800/40';
      case 'cabo':
        return 'bg-yellow-950 text-yellow-400 border-yellow-800/40';
      case '1-soldado':
        return 'bg-zinc-900 text-zinc-300 border-zinc-700/40';
      case '2-soldado':
        return 'bg-zinc-900 text-zinc-400 border-zinc-700/40';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-700/40';
    }
  };

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
      '1-soldado': '1º Soldado',
      '2-soldado': '2º Soldado'
    };
    return roles[role] || role;
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { path: '/prisional', label: 'Módulo Prisional', icon: Shield, permission: 'prisional' },
    { path: '/fichas', label: 'Histórico Prisional', icon: Archive, permission: 'prisional' },
    { path: '/relatorios', label: 'PTR', icon: FileText, permission: 'relatorios' },
    { path: '/ausencias', label: 'Ausências', icon: CalendarX, permission: 'ausencias' },
    { path: '/comandos', label: 'Comandos & Operadores', icon: Users, permission: 'comandos' },
    { path: '/corregedoria', label: 'Corregedoria Interna', icon: ShieldAlert, permission: 'corregedoria' },
    { path: '/cursos', label: 'Cursos & Apostilas', icon: BookOpen, permission: 'cursos' },
    { path: '/informativos', label: 'Informativos', icon: BookOpen, permission: 'informativos' },
    { path: '/usuarios', label: 'Gestão de Membros', icon: UserCog, permission: 'users' },
    { path: '/exoneracoes', label: 'Exonerações', icon: UserMinus, permission: 'exoneracoes' },
    { path: '/permissoes', label: 'Permissões de Acesso', icon: KeyRound, permission: 'permissions' },
    { path: '/metricas', label: 'Métricas da Corporação', icon: BarChart2, permission: 'metrics' },
    { path: '/social', label: 'Comunidade & Clipes', icon: PlaySquare, permission: 'dashboard' }
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.path === '/usuarios') {
      return user?.role === 'coronel' || user?.role === 'tenente-coronel';
    }
    return hasPermission(item.permission);
  });

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between transition-transform duration-300 transform
    lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses}>
        <div>
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-900 bg-zinc-950">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="COOP Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
              <div>
                <h1 className="font-outfit font-extrabold text-lg tracking-wider bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">COOP</h1>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Painel Tático</p>
              </div>
            </div>
            <button className="lg:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900" onClick={toggleSidebar}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-yellow-600 text-white border border-yellow-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer Panel */}
        {user && (
          <div className="p-4 border-t border-zinc-900 bg-zinc-950">
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300 border border-zinc-700 uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden flex flex-col items-start">
                  <h4 className="text-xs font-semibold text-zinc-200 truncate">{user.name}</h4>
                  <div className="flex items-center gap-1.5 opacity-90 border border-zinc-700 bg-zinc-800/50 px-2 py-0.5 rounded shadow-inner">
                    <RankIcon role={user.role} className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">{getRankLabel(user.role)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={logout} 
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                title="Desconectar"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
