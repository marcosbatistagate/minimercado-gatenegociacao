import { Package, BarChart3, Store, MonitorSmartphone } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export type TabType = 'inventory' | 'dashboard';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { switchInstance } = useMarketStore();

  return (
    <aside className="w-24 flex flex-col items-center py-8 gap-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl h-full shadow-[0_0_30px_rgba(139,92,246,0.1)] relative">
      <div className="text-white/80 hover:text-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.4)] bg-white/10 p-3 rounded-xl border border-white/20">
        <Store size={28} />
      </div>

      <nav className="flex flex-col gap-6 mt-4 w-full items-center flex-1">

        <button 
          onClick={() => onTabChange('inventory')}
          className={`p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border group ${activeTab === 'inventory' ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-white/60 hover:text-violet-300 hover:bg-violet-500/10 border-transparent hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105'}`}>
          <Package size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={() => onTabChange('dashboard')}
          className={`p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border group ${activeTab === 'dashboard' ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-white/60 hover:text-violet-300 hover:bg-violet-500/10 border-transparent hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105'}`}>
          <BarChart3 size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </nav>

      <div className="mt-auto">
        <button 
          onClick={() => switchInstance('client')}
          title="Modo Totem / Cliente"
          className="p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border border-transparent text-white/40 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105 group"
        >
          <MonitorSmartphone size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </aside>
  );
}
