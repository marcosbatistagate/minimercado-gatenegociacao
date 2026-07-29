import React, { useMemo, useState } from 'react';
import { useMarketStore, type Sale, type PaymentMethod } from '../store/useMarketStore';
import { TrendingUp, ShoppingBag, AlertTriangle, Receipt, X } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (isoString: string) => {
  return new Intl.DateTimeFormat('pt-BR', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  }).format(new Date(isoString));
};

const paymentMethodLabels: Record<NonNullable<PaymentMethod>, string> = {
  money: 'Dinheiro',
  credit_card: 'Crédito',
  debit_card: 'Débito',
  pix: 'PIX',
};

export const DashboardView: React.FC = () => {
  const { sales, products } = useMarketStore();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [reFilter, setReFilter] = useState('');

  const filteredSales = useMemo(() => {
    if (!reFilter) return sales;
    return sales.filter(s => s.customerRe?.includes(reFilter));
  }, [sales, reFilter]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0), [filteredSales]);
  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  const criticalStockItems = useMemo(() => products.filter(p => p.stock <= p.minStock).length, [products]);

  const paymentDistribution = useMemo(() => {
    const dist: Record<string, number> = { money: 0, credit_card: 0, debit_card: 0, pix: 0 };
    filteredSales.forEach(s => {
      if (s.payment_method) {
        dist[s.payment_method] += s.total_amount;
      }
    });
    return dist;
  }, [filteredSales]);

  return (
    <div className="flex flex-col h-full gap-6 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white font-jakarta">Dashboard & Métricas</h1>
        <input 
          type="text" 
          placeholder="Filtrar por RE..." 
          value={reFilter}
          onChange={e => setReFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 min-w-[200px]"
        />
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Total */}
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 text-white/60">
            <TrendingUp size={20} />
            <span className="font-medium">Faturamento Total</span>
          </div>
          <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">
            {formatCurrency(totalRevenue)}
          </span>
        </div>

        {/* Total de Vendas */}
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 text-white/60">
            <ShoppingBag size={20} />
            <span className="font-medium">Total de Vendas</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {totalSales}
          </span>
        </div>

        {/* Ticket Médio */}
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 text-white/60">
            <Receipt size={20} />
            <span className="font-medium">Ticket Médio</span>
          </div>
          <span className="text-3xl font-bold text-white">
            {formatCurrency(averageTicket)}
          </span>
        </div>

        {/* Itens em Estoque Crítico */}
        <div className={`glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] ${criticalStockItems > 0 ? 'bg-amber-500/10 border-amber-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]' : ''}`}>
          <div className="flex items-center gap-2 text-white/60">
            <AlertTriangle size={20} className={criticalStockItems > 0 ? 'text-amber-400' : ''} />
            <span className="font-medium">Estoque Crítico</span>
          </div>
          <span className={`text-3xl font-bold ${criticalStockItems > 0 ? 'text-amber-400' : 'text-white'}`}>
            {criticalStockItems}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Panel */}
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 col-span-1 lg:col-span-1">
          <h2 className="text-lg font-bold text-white font-jakarta">Métodos de Pagamento</h2>
          <div className="flex flex-col gap-4">
            {(Object.entries(paymentMethodLabels) as [NonNullable<PaymentMethod>, string][]).map(([key, label]) => {
              const amount = paymentDistribution[key] || 0;
              const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">{label}</span>
                    <span className="text-white font-medium">{formatCurrency(amount)} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary-500 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Sales History */}
        <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl overflow-hidden col-span-1 lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-bold text-white font-jakarta">Vendas Recentes</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-white/60 font-medium text-sm">ID</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Data/Hora</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Cliente (RE)</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Método</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Total</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Status</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/80">#{sale.id}</td>
                    <td className="p-4 text-white/80">{formatDate(sale.created_at)}</td>
                    <td className="p-4">
                      {sale.customerRe ? (
                        <span className="bg-primary-500/20 text-primary-300 border border-primary-500/30 px-2 py-1 rounded-md text-xs font-medium">
                          RE: {sale.customerRe}
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs font-medium">Caixa Avulso</span>
                      )}
                    </td>
                    <td className="p-4 text-white/80">{sale.payment_method ? paymentMethodLabels[sale.payment_method] : '-'}</td>
                    <td className="p-4 text-white font-medium">{formatCurrency(sale.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${sale.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                        {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        className="px-3 py-1 rounded-lg bg-white/10 text-white/80 hover:bg-white/20 transition-colors text-sm"
                      >
                        Ver Itens
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/50">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sale Items Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-effect bg-white/10 border border-white/20 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-jakarta">
                  Venda #{selectedSale.id}
                </h2>
                <p className="text-sm text-white/60">{formatDate(selectedSale.created_at)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col flex-1 overflow-auto gap-4">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{item.product.name}</span>
                    <span className="text-sm text-white/60">{item.quantity}x {formatCurrency(item.product.price)}</span>
                  </div>
                  <span className="text-white font-bold">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              {selectedSale.items.length === 0 && (
                <p className="text-white/50 text-center py-4">Nenhum item encontrado.</p>
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-between items-center bg-black/20">
              <span className="text-white/60 font-medium">Total:</span>
              <span className="text-2xl font-bold text-white">{formatCurrency(selectedSale.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
