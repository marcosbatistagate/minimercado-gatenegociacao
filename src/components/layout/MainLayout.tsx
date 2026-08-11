import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { TabType } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white font-inter p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden pb-20 md:pb-6">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col min-h-0 h-auto md:h-[calc(100vh-48px)] overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)] mt-4 md:mt-0">
          {children}
        </main>
        <footer className="mt-4 text-center text-xs text-white/40 font-medium hidden md:block">
          Desenvolvido por: Delta Negociação - 2026
        </footer>
      </div>
    </div>
  );
}
