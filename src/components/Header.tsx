import React, { useState, useEffect } from 'react';
import { ShieldCheck, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, toggleSidebar }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar} 
          className="lg:hidden p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 mr-1"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-outfit font-black text-yellow-500 text-sm tracking-widest uppercase">Comando de Operações</h1>
          <h2 className="font-outfit font-bold text-zinc-200 text-lg tracking-wide leading-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <ShieldCheck className="w-3.5 h-3.5 animate-pulse" />
          <span>SISTEMA SEGURO</span>
        </div>
        <div className="px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono tracking-widest shadow-inner">
          {time}
        </div>
      </div>
    </header>
  );
};
