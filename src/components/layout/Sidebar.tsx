import { ShoppingCart, Package, BarChart3, Store } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="w-24 flex flex-col items-center py-8 gap-8 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl h-full shadow-[0_0_30px_rgba(139,92,246,0.1)]">
      <div className="text-white/80 hover:text-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.4)] bg-white/10 p-3 rounded-xl border border-white/20">
        <Store size={28} />
      </div>

      <nav className="flex flex-col gap-6 mt-4 w-full items-center">
        <button className="text-white/60 hover:text-white hover:bg-white/10 p-3 rounded-xl transition-all w-14 h-14 flex items-center justify-center border border-transparent hover:border-white/10 group">
          <ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button className="text-white/60 hover:text-white hover:bg-white/10 p-3 rounded-xl transition-all w-14 h-14 flex items-center justify-center border border-transparent hover:border-white/10 group">
          <Package size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button className="text-white/60 hover:text-white hover:bg-white/10 p-3 rounded-xl transition-all w-14 h-14 flex items-center justify-center border border-transparent hover:border-white/10 group">
          <BarChart3 size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </nav>
    </aside>
  );
}
