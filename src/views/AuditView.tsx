import React, { useMemo, useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { ClipboardCheck, Search, RefreshCw } from 'lucide-react';
import { FadeIn } from '../components/ui/FadeIn';

export const AuditView: React.FC = () => {
  const { sales, products, initData } = useMarketStore();
  const [auditSearch, setAuditSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await initData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const yesterdaySales = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    return sales.filter(sale => {
      const d = new Date(sale.created_at);
      return d >= start && d <= end && sale.status !== 'cancelled';
    });
  }, [sales]);

  const yesterdayProductConsumption = useMemo(() => {
    const consumptionMap: Record<string, number> = {};
    yesterdaySales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product?.id) {
          consumptionMap[item.product.id] = (consumptionMap[item.product.id] || 0) + item.quantity;
        }
      });
    });
    return consumptionMap;
  }, [yesterdaySales]);

  const filteredAuditProducts = useMemo(() => {
    const lower = auditSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(lower));
  }, [products, auditSearch]);

  return (
    <div className="flex flex-col h-full gap-6 p-6 overflow-auto">
      <FadeIn delay="100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-600/20 border border-violet-500/30 rounded-xl text-violet-400">
              <ClipboardCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-jakarta">Conferência Diária de Estoque</h1>
              <p className="text-sm text-white/60">Auditoria física matutina do mercado baseada nas vendas de ontem</p>
            </div>
          </div>
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative flex-1 md:w-80">
              <input 
                type="text" 
                placeholder="Buscar produto por nome..." 
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 w-full text-sm"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Atualizar dados"
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-violet-400' : 'text-white'} />
            </button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay="200">
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-white/60 font-medium text-sm">Produto</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Estoque Inicial</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Vendas de Ontem</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Estoque Atual Esperado</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditProducts.map(p => {
                  const salesYesterday = yesterdayProductConsumption[p.id] || 0;
                  const maxStock = p.stock + salesYesterday;
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{p.name}</span>
                          {p.code && (
                            <span className="text-xs text-white/40 font-mono mt-0.5">
                              Cód: {p.code}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-white/80 font-semibold">
                        {maxStock} un.
                      </td>
                      <td className="p-4 text-center font-bold text-white text-base">
                        {salesYesterday > 0 ? (
                          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full text-sm">
                            {salesYesterday} un.
                          </span>
                        ) : (
                          <span className="text-white/40 text-sm">0 un.</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-400 text-lg">
                        {p.stock} un.
                      </td>
                    </tr>
                  );
                })}
                {filteredAuditProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-white/50">
                      Nenhum produto encontrado para conferência.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};
