import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { TabType } from './Sidebar';
import { Header } from './Header';
import { AppFooter } from './AppFooter';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white font-inter flex flex-col justify-between">
      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 p-3 sm:p-4 md:p-6 overflow-x-hidden">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-auto md:h-[calc(100vh-145px)] overflow-x-hidden md:overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto min-w-0 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 md:p-6 shadow-[0_0_30px_rgba(139,92,246,0.05)]">
            {children}
          </main>
        </div>
      </div>
      <AppFooter className="mb-16 md:mb-0" />
    </div>
  );
}
