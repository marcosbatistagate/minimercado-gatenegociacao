import { Package, BarChart3, Store, MonitorSmartphone, ClipboardCheck } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export type TabType = 'inventory' | 'dashboard' | 'audit';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { switchInstance } = useMarketStore();

  return (
    <>
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex w-24 flex-col items-center py-8 gap-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl h-full shadow-[0_0_30px_rgba(139,92,246,0.1)] relative">
        <div className="text-white/80 hover:text-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.4)] bg-white/10 p-3 rounded-xl border border-white/20">
          <Store size={28} />
        </div>

        <nav className="flex flex-col gap-6 mt-4 w-full items-center flex-1">
          {/* 1. Conferência Diária de Estoque */}
          <button 
            onClick={() => onTabChange('audit')}
            title="Conferência Diária de Estoque"
            className={`p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border group ${activeTab === 'audit' ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-white/60 hover:text-violet-300 hover:bg-violet-500/10 border-transparent hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105'}`}>
            <ClipboardCheck size={24} className="group-hover:scale-110 transition-transform" />
          </button>
          
          {/* 2. Gestão de Estoque */}
          <button 
            onClick={() => onTabChange('inventory')}
            title="Gestão de Estoque"
            className={`p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border group ${activeTab === 'inventory' ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-white/60 hover:text-violet-300 hover:bg-violet-500/10 border-transparent hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105'}`}>
            <Package size={24} className="group-hover:scale-110 transition-transform" />
          </button>

          {/* 3. Dashboard e Métricas */}
          <button 
            onClick={() => onTabChange('dashboard')}
            title="Dashboard e Métricas"
            className={`p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border group ${activeTab === 'dashboard' ? 'bg-violet-600/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'text-white/60 hover:text-violet-300 hover:bg-violet-500/10 border-transparent hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105'}`}>
            <BarChart3 size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </nav>

        {/* 4. Página Inicial */}
        <div className="mt-auto">
          <button 
            onClick={() => switchInstance('client')}
            title="Página Inicial"
            className="p-3 rounded-xl transition-all duration-300 w-14 h-14 flex items-center justify-center border border-transparent text-white/40 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-400/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:scale-105 group"
          >
            <MonitorSmartphone size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 md:hidden bg-slate-950/90 border-t border-white/10 backdrop-blur-md flex items-center justify-around px-4 z-40">
        {/* 1. Conferência */}
        <button 
          onClick={() => onTabChange('audit')}
          className={`flex flex-col items-center justify-center p-2 transition-all duration-300 ${activeTab === 'audit' ? 'text-violet-400 scale-105' : 'text-white/60 hover:text-violet-300'}`}
        >
          <ClipboardCheck size={20} />
          <span className="text-[10px] font-medium mt-0.5">Conferência</span>
        </button>

        {/* 2. Estoque */}
        <button 
          onClick={() => onTabChange('inventory')}
          className={`flex flex-col items-center justify-center p-2 transition-all duration-300 ${activeTab === 'inventory' ? 'text-violet-400 scale-105' : 'text-white/60 hover:text-violet-300'}`}
        >
          <Package size={20} />
          <span className="text-[10px] font-medium mt-0.5">Estoque</span>
        </button>

        {/* 3. Métricas */}
        <button 
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center p-2 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-violet-400 scale-105' : 'text-white/60 hover:text-violet-300'}`}
        >
          <BarChart3 size={20} />
          <span className="text-[10px] font-medium mt-0.5">Métricas</span>
        </button>

        {/* 4. Página Inicial */}
        <button 
          onClick={() => switchInstance('client')}
          className="flex flex-col items-center justify-center p-2 text-white/40 hover:text-violet-300 transition-all duration-300"
        >
          <MonitorSmartphone size={20} />
          <span className="text-[10px] font-medium mt-0.5">Pág. Inicial</span>
        </button>
      </div>
    </>
  );
}
