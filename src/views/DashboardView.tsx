import React, { useMemo, useState } from 'react';
import { useMarketStore, type Sale, type PaymentMethod } from '../store/useMarketStore';
import { TrendingUp, ShoppingBag, AlertTriangle, Receipt, X, ClipboardList, Search, Award, Percent } from 'lucide-react';
import { FadeIn } from '../components/ui/FadeIn';
import { supabaseService } from '../services/supabaseService';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (isoString: string) => {
  return new Intl.DateTimeFormat('pt-BR', { 
    dateStyle: 'short', 
    timeStyle: 'short' 
  }).format(new Date(isoString));
};

const paymentMethodLabels: Partial<Record<NonNullable<PaymentMethod>, string>> = {
  pix: 'PIX',
  DEBIT: 'Débito (Pagar Depois)'
};

export const DashboardView: React.FC = () => {
  const { sales, products, customers, settleDebts } = useMarketStore();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredSales = useMemo(() => {
    if (!searchFilter) return sales;
    const lowerSearch = searchFilter.toLowerCase();
    return sales.filter(s => {
      const matchRe = s.customerRe?.toLowerCase().includes(lowerSearch);
      const customer = customers.find(c => c.re === s.customerRe);
      const matchName = customer?.name.toLowerCase().includes(lowerSearch);
      return matchRe || matchName;
    });
  }, [sales, searchFilter, customers]);

  const [auditSearch, setAuditSearch] = useState('');

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

  const topProductsBySales = useMemo(() => {
    const counts: Record<string, { product: typeof products[0]; qty: number }> = {};
    filteredSales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        sale.items.forEach(item => {
          if (item.product?.id) {
            if (!counts[item.product.id]) {
              counts[item.product.id] = { product: item.product, qty: 0 };
            }
            counts[item.product.id].qty += item.quantity;
          }
        });
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [filteredSales, products]);

  const topProductsByMargin = useMemo(() => {
    const soldProductIds = new Set<string>();
    filteredSales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        sale.items.forEach(item => {
          if (item.product?.id) {
            soldProductIds.add(item.product.id);
          }
        });
      }
    });

    const targetProducts = searchFilter 
      ? products.filter(p => soldProductIds.has(p.id))
      : products;

    return [...targetProducts]
      .map(p => {
        const margin = p.cost_price > 0 ? ((p.price - p.cost_price) / p.cost_price) * 100 : 0;
        return { product: p, margin };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);
  }, [products, filteredSales, searchFilter]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0), [filteredSales]);
  
  const totalCost = useMemo(() => filteredSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => itemSum + ((item.product?.cost_price || 0) * item.quantity), 0);
  }, 0), [filteredSales]);

  const totalProfit = totalRevenue - totalCost;

  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  const criticalStockItems = useMemo(() => products.filter(p => p.stock <= p.min_stock).length, [products]);

  const paymentDistribution = useMemo(() => {
    const dist: Record<string, number> = { money: 0, credit_card: 0, debit_card: 0, pix: 0, DEBIT: 0 };
    filteredSales.forEach(s => {
      if (s.payment_method) {
        dist[s.payment_method] = (dist[s.payment_method] || 0) + s.total_amount;
      }
    });
    return dist;
  }, [filteredSales]);

  // Aggregate pending debts per client
  const pendingDebts = useMemo(() => {
    const debtsMap: Record<string, { re: string, name: string, total: number }> = {};
    sales.forEach(s => {
      if (s.payment_status === 'PENDING' && s.customerRe) {
        const customer = customers.find(c => c.re === s.customerRe);
        const name = customer ? customer.name : 'Desconhecido';
        if (!debtsMap[s.customerRe]) {
          debtsMap[s.customerRe] = { re: s.customerRe, name, total: 0 };
        }
        debtsMap[s.customerRe].total += s.total_amount;
      }
    });
    return Object.values(debtsMap);
  }, [sales, customers]);

  return (
    <div className="flex flex-col h-full gap-6 p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white font-jakarta">Dashboard & Métricas</h1>
        <input 
          type="text" 
          placeholder="Filtrar por RE ou Nome..." 
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 min-w-[240px]"
        />
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* Preço de Venda (Faturamento) */}
        <FadeIn delay="100">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} className="text-violet-500" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <TrendingUp size={20} />
              <span className="font-medium">Total Vendido (Preço de Venda)</span>
            </div>
            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 relative z-10">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        </FadeIn>

        {/* Custo Total */}
        <FadeIn delay="200">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Receipt size={64} className="text-rose-500" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <Receipt size={20} className="text-rose-400" />
              <span className="font-medium">Custo Total das Vendas</span>
            </div>
            <span className="text-3xl font-bold text-rose-400 relative z-10">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </FadeIn>

        {/* Lucro Bruto */}
        <FadeIn delay="200">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={64} className="text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <TrendingUp size={20} className="text-emerald-400" />
              <span className="font-medium">Lucro Bruto Estimado</span>
            </div>
            <span className="text-3xl font-bold text-emerald-400 relative z-10">
              {formatCurrency(totalProfit)}
            </span>
          </div>
        </FadeIn>

        {/* Total de Vendas */}
        <FadeIn delay="200">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShoppingBag size={64} className="text-white" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <ShoppingBag size={20} />
              <span className="font-medium">Total de Vendas</span>
            </div>
            <span className="text-3xl font-bold text-white relative z-10">
              {totalSales}
            </span>
          </div>
        </FadeIn>

        {/* Ticket Médio */}
        <FadeIn delay="300">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Receipt size={64} className="text-white" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <Receipt size={20} />
              <span className="font-medium">Ticket Médio</span>
            </div>
            <span className="text-3xl font-bold text-white relative z-10">
              {formatCurrency(averageTicket)}
            </span>
          </div>
        </FadeIn>

        {/* Itens em Estoque Crítico */}
        <FadeIn delay="500">
          <div className={`glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 relative overflow-hidden group ${criticalStockItems > 0 ? 'bg-amber-500/10 border-amber-500/30 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]' : 'hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle size={64} className={criticalStockItems > 0 ? 'text-amber-500' : 'text-white'} />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <AlertTriangle size={20} className={criticalStockItems > 0 ? 'text-amber-400' : ''} />
            <span className="font-medium">Estoque Crítico</span>
          </div>
          <span className={`text-3xl font-bold relative z-10 ${criticalStockItems > 0 ? 'text-amber-400' : 'text-white'}`}>
            {criticalStockItems}
          </span>
        </div>
        </FadeIn>
      </div>

      {/* Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mais Vendidos */}
        <FadeIn delay="300">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Award size={64} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <Award size={20} className="text-amber-400" />
              <span className="font-medium text-white/80">Top 3 Produtos Mais Vendidos</span>
            </div>
            <div className="flex flex-col gap-3 mt-2 relative z-10">
              {topProductsBySales.map((item, idx) => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl px-4 py-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-400 text-black' :
                      idx === 1 ? 'bg-slate-300 text-black' :
                      'bg-amber-700 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium text-sm">{item.product.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-sm">{item.qty} un.</span>
                </div>
              ))}
              {topProductsBySales.length === 0 && (
                <p className="text-white/40 text-sm py-2">Nenhuma venda registrada ainda.</p>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Maior Margem de Lucro */}
        <FadeIn delay="500">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Percent size={64} className="text-violet-500" />
            </div>
            <div className="flex items-center gap-2 text-white/60 relative z-10">
              <Percent size={20} className="text-violet-400" />
              <span className="font-medium text-white/80">Top 3 Maior Margem de Lucro</span>
            </div>
            <div className="flex flex-col gap-3 mt-2 relative z-10">
              {topProductsByMargin.map((item, idx) => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl px-4 py-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-amber-400 text-black' :
                      idx === 1 ? 'bg-slate-300 text-black' :
                      'bg-amber-700 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium text-sm">{item.product.name}</span>
                  </div>
                  <span className="text-violet-400 font-bold text-sm">{item.margin.toFixed(0)}%</span>
                </div>
              ))}
              {topProductsByMargin.length === 0 && (
                <p className="text-white/40 text-sm py-2">Nenhum produto cadastrado.</p>
              )}
            </div>
          </div>
        </FadeIn>
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-white/60 font-medium text-sm">Data/Hora</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Cliente</th>
                  <th className="p-4 text-white/60 font-medium text-sm">Produto(s) Comprado(s)</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Qtd.</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-right">Valor Unitário</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-right">Valor Total Pago</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => {
                  const customerName = sale.customerRe 
                    ? (customers.find(c => c.re === sale.customerRe)?.name || 'Cliente')
                    : 'Caixa Avulso';

                  return sale.items.map((item, idx) => (
                    <tr key={`${sale.id}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {idx === 0 && (
                        <>
                          <td className="p-4 text-white/80" rowSpan={sale.items.length}>
                            {formatDate(sale.created_at)}
                          </td>
                          <td className="p-4 text-white/80" rowSpan={sale.items.length}>
                            {sale.customerRe ? `${customerName} (RE: ${sale.customerRe})` : 'Caixa Avulso'}
                          </td>
                        </>
                      )}
                      <td className="p-4 text-white font-medium">{item.product.name}</td>
                      <td className="p-4 text-white/80 text-center">{item.quantity}</td>
                      <td className="p-4 text-white/80 text-right">{formatCurrency(item.product.price)}</td>
                      <td className="p-4 text-white font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ));
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/50">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Conferência Diária de Estoque */}
      <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white font-jakarta flex items-center gap-2">
              <ClipboardList className="text-violet-400" />
              Conferência Diária de Estoque
            </h2>
            <p className="text-sm text-white/60">Auditoria física matutina do mercado baseada nas vendas de ontem</p>
          </div>
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Buscar produto por nome..." 
              value={auditSearch}
              onChange={e => setAuditSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 w-full text-sm"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10">
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

      {/* Debits management section */}
      <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-white font-jakarta">Controle de Débitos (Clientes com Contas Pendentes)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-white/60 font-medium text-sm">Cliente</th>
                <th className="p-4 text-white/60 font-medium text-sm">RE</th>
                <th className="p-4 text-white/60 font-medium text-sm text-right">Total Devido</th>
                <th className="p-4 text-white/60 font-medium text-sm text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingDebts.map(debt => (
                <tr key={debt.re} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">{debt.name}</td>
                  <td className="p-4 text-white/80">{debt.re}</td>
                  <td className="p-4 text-rose-400 font-bold text-right">{formatCurrency(debt.total)}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => settleDebts(debt.re)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all duration-300 text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      Quitar Débito
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDebts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/50">
                    Nenhum débito pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clientes e Redefinição de Senhas */}
      <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-white font-jakarta">Gestão de Clientes e Senhas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-white/60 font-medium text-sm">Policial / Cliente</th>
                <th className="p-4 text-white/60 font-medium text-sm">RE</th>
                <th className="p-4 text-white/60 font-medium text-sm">Status Acesso</th>
                <th className="p-4 text-white/60 font-medium text-sm text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.re} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">{customer.name}</td>
                  <td className="p-4 text-white/80">{customer.re}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      customer.password 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {customer.password ? 'Senha Ativa' : 'Sem Senha Configurada'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={async () => {
                        const newPass = prompt(`Digite a nova senha para o RE ${customer.re} (mínimo 4 dígitos):`);
                        if (newPass === null) return;
                        if (newPass.length < 4) {
                          alert('A senha precisa ter no mínimo 4 dígitos!');
                          return;
                        }
                        const success = await supabaseService.updateCustomerPassword(customer.re, newPass);
                        if (success) {
                          alert(`Senha do RE ${customer.re} redefinida com sucesso!`);
                          // Reload page/state
                          window.location.reload();
                        } else {
                          alert('Erro ao atualizar senha.');
                        }
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all duration-300 text-xs border border-white/10"
                    >
                      Redefinir Senha
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/50">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
