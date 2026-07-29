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
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white font-inter p-6 flex gap-6 overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 flex flex-col h-[calc(100vh-48px)]">
        <Header />
        <main className="flex-1 overflow-auto bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)]">
          {children}
        </main>
      </div>
    </div>
  );
}
