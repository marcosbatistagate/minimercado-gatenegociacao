import React, { useMemo, useState } from 'react';
import { useMarketStore, type Sale } from '../store/useMarketStore';
import { TrendingUp, ShoppingBag, AlertTriangle, Receipt, X, Award, Percent } from 'lucide-react';
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

type DashboardPeriod = 'current_month' | 'previous_month' | '2_months' | '3_months' | 'all';

export const DashboardView: React.FC = () => {
  const { sales, products, customers, settleDebts, stockAudits } = useMarketStore();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const [globalPeriod, setGlobalPeriod] = useState<DashboardPeriod>('current_month');
  const [chartPeriod, setChartPeriod] = useState<DashboardPeriod>('current_month');
  const [topSalesPeriod, setTopSalesPeriod] = useState<DashboardPeriod>('current_month');
  const [topMarginPeriod, setTopMarginPeriod] = useState<DashboardPeriod>('current_month');

  const [hoveredBar, setHoveredBar] = useState<{ 
    name: string; 
    amount: number; 
    quantity: number; 
    x: number; 
    y: number;
  } | null>(null);

  const getPeriodRange = (period: DashboardPeriod) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    if (period === 'all') {
      return { startDate: null, endDate: null };
    }
    if (period === 'current_month') {
      return {
        startDate: new Date(currentYear, currentMonth, 1, 0, 0, 0, 0),
        endDate: null
      };
    }
    if (period === 'previous_month') {
      return {
        startDate: new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0),
        endDate: new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
      };
    }
    if (period === '2_months') {
      return {
        startDate: new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0),
        endDate: null
      };
    }
    if (period === '3_months') {
      return {
        startDate: new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0),
        endDate: null
      };
    }
    return { startDate: null, endDate: null };
  };

  const activeSales = useMemo(() => {
    const { startDate, endDate } = getPeriodRange(globalPeriod);
    return sales.filter(s => {
      if (s.status === 'cancelled') return false;
      const saleDate = new Date(s.created_at);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }, [sales, globalPeriod]);

  const chartData = useMemo(() => {
    const today = new Date();
    const { startDate, endDate } = getPeriodRange(chartPeriod);

    const productStats: Record<string, { id: string; name: string; amount: number; quantity: number }> = {};
    
    // Initialize stats for all active products
    products.forEach(p => {
      productStats[p.id] = {
        id: p.id,
        name: p.name,
        amount: 0,
        quantity: 0
      };
    });

    sales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        const saleDate = new Date(sale.created_at);
        const afterStart = !startDate || saleDate >= startDate;
        const beforeEnd = !endDate || saleDate <= endDate;
        if (afterStart && beforeEnd && saleDate <= today) {
          sale.items.forEach(item => {
            if (item.product?.id && productStats[item.product.id]) {
              productStats[item.product.id].amount += item.subtotal;
              productStats[item.product.id].quantity += item.quantity;
            }
          });
        }
      }
    });

    // Return all products sorted by name or amount
    return Object.values(productStats).sort((a, b) => a.name.localeCompare(b.name));
  }, [sales, products, chartPeriod]);

  const chartHeight = 320;
  const paddingLeft = 55;
  const paddingBottom = 80;
  const paddingTop = 10;
  const paddingRight = 45;
  const svgWidth = 700;
  
  const chartContentWidth = svgWidth - paddingLeft - paddingRight;
  const step = useMemo(() => {
    return chartData.length > 0 ? chartContentWidth / chartData.length : 60;
  }, [chartData.length, chartContentWidth]);

  const barWidth = useMemo(() => {
    return Math.max(6, step * 0.44);
  }, [step]);

  const innerGap = useMemo(() => {
    return Math.max(1, step * 0.08);
  }, [step]);

  const maxAmount = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.amount), 0);
    return max === 0 ? 100 : max * 1.1;
  }, [chartData]);

  const maxQuantity = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.quantity), 0);
    return max === 0 ? 10 : max * 1.1;
  }, [chartData]);

  const yTicks = 4;
  const yAxisTicksAmount = Array.from({ length: yTicks }, (_, i) => (maxAmount / (yTicks - 1)) * i);
  const yAxisTicksQuantity = Array.from({ length: yTicks }, (_, i) => (maxQuantity / (yTicks - 1)) * i);

  const filteredSales = useMemo(() => {
    if (!searchFilter) return activeSales;
    const lowerSearch = searchFilter.toLowerCase();
    return activeSales.filter(s => {
      const matchRe = s.customerRe?.toLowerCase().includes(lowerSearch);
      const customer = customers.find(c => c.re === s.customerRe);
      const matchName = customer?.name.toLowerCase().includes(lowerSearch);
      return matchRe || matchName;
    });
  }, [activeSales, searchFilter, customers]);

  const topProductsBySales = useMemo(() => {
    const { startDate, endDate } = getPeriodRange(topSalesPeriod);
    const counts: Record<string, { product: typeof products[0]; qty: number }> = {};
    sales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        const saleDate = new Date(sale.created_at);
        const afterStart = !startDate || saleDate >= startDate;
        const beforeEnd = !endDate || saleDate <= endDate;
        if (afterStart && beforeEnd) {
          if (searchFilter) {
            const lowerSearch = searchFilter.toLowerCase();
            const matchRe = sale.customerRe?.toLowerCase().includes(lowerSearch);
            const customer = customers.find(c => c.re === sale.customerRe);
            const matchName = customer?.name.toLowerCase().includes(lowerSearch);
            if (!matchRe && !matchName) return;
          }
          sale.items.forEach(item => {
            if (item.product?.id) {
              if (!counts[item.product.id]) {
                counts[item.product.id] = { product: item.product, qty: 0 };
              }
              counts[item.product.id].qty += item.quantity;
            }
          });
        }
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [sales, products, topSalesPeriod, searchFilter, customers]);

  const topProductsByMargin = useMemo(() => {
    const { startDate, endDate } = getPeriodRange(topMarginPeriod);
    const soldProductIds = new Set<string>();
    sales.forEach(sale => {
      if (sale.status !== 'cancelled') {
        const saleDate = new Date(sale.created_at);
        const afterStart = !startDate || saleDate >= startDate;
        const beforeEnd = !endDate || saleDate <= endDate;
        if (afterStart && beforeEnd) {
          if (searchFilter) {
            const lowerSearch = searchFilter.toLowerCase();
            const matchRe = sale.customerRe?.toLowerCase().includes(lowerSearch);
            const customer = customers.find(c => c.re === sale.customerRe);
            const matchName = customer?.name.toLowerCase().includes(lowerSearch);
            if (!matchRe && !matchName) return;
          }
          sale.items.forEach(item => {
            if (item.product?.id) {
              soldProductIds.add(item.product.id);
            }
          });
        }
      }
    });

    const targetProducts = searchFilter || soldProductIds.size > 0
      ? products.filter(p => soldProductIds.has(p.id))
      : products;

    return [...targetProducts]
      .map(p => {
        const margin = p.cost_price > 0 ? ((p.price - p.cost_price) / p.cost_price) * 100 : 0;
        return { product: p, margin };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);
  }, [products, sales, topMarginPeriod, searchFilter, customers]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0), [filteredSales]);
  
  const totalCost = useMemo(() => filteredSales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => itemSum + ((item.product?.cost_price || 0) * item.quantity), 0);
  }, 0), [filteredSales]);

  const totalProfit = totalRevenue - totalCost;

  const totalSales = filteredSales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  const criticalStockItems = useMemo(() => products.filter(p => p.stock <= p.min_stock).length, [products]);

  const paymentSummary = useMemo(() => {
    let immediateCount = 0;
    let immediateTotal = 0;
    let debitCount = 0;
    let debitTotal = 0;

    filteredSales.forEach(s => {
      if (s.status !== 'cancelled') {
        if (s.payment_status === 'PENDING' || s.payment_method === 'DEBIT') {
          debitCount++;
          debitTotal += s.total_amount;
        } else {
          immediateCount++;
          immediateTotal += s.total_amount;
        }
      }
    });

    const grandTotal = immediateTotal + debitTotal;
    const totalCount = immediateCount + debitCount;
    const immediatePct = grandTotal > 0 ? (immediateTotal / grandTotal) * 100 : 0;
    const debitPct = grandTotal > 0 ? (debitTotal / grandTotal) * 100 : 0;

    return {
      immediateCount,
      immediateTotal,
      immediatePct,
      debitCount,
      debitTotal,
      debitPct,
      grandTotal,
      totalCount
    };
  }, [filteredSales]);

  // Aggregate pending debts per client across ALL time (never reset by monthly cycle)
  const pendingDebts = useMemo(() => {
    const debtsMap: Record<string, { re: string, name: string, total: number }> = {};
    sales.forEach(s => {
      if (s.payment_status === 'PENDING' && s.status !== 'cancelled' && s.customerRe) {
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
    <div className="flex flex-col h-full gap-5 sm:gap-6 p-4 sm:p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-jakarta">Dashboard & Métricas</h1>
          <p className="text-xs text-white/50">Visão analítica de faturamento, estoque e modalidades de pagamento</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm shadow-sm">
            <span className="text-white/60 font-medium">Período:</span>
            <select
              value={globalPeriod}
              onChange={e => setGlobalPeriod(e.target.value as DashboardPeriod)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs sm:text-sm"
            >
              <option value="current_month" className="bg-slate-900 text-white">Mês Atual</option>
              <option value="previous_month" className="bg-slate-900 text-white">Mês Anterior</option>
              <option value="2_months" className="bg-slate-900 text-white">Últimos 2 Meses</option>
              <option value="3_months" className="bg-slate-900 text-white">Últimos 3 Meses</option>
              <option value="all" className="bg-slate-900 text-white">Geral (Todo o Período)</option>
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Filtrar por RE ou Nome..." 
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 flex-1 sm:flex-initial sm:min-w-[220px]"
          />
        </div>
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Preço de Venda (Faturamento) */}
        <FadeIn delay="100">
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
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
          <div className={`glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-2 shadow-lg shadow-black/20 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group ${criticalStockItems > 0 ? 'bg-amber-500/10 border-amber-500/30 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:border-amber-400/40' : 'hover:shadow-emerald-500/10 hover:border-emerald-500/40'}`}>
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Award size={64} className="text-amber-500" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2 text-white/80">
                <Award size={20} className="text-amber-400" />
                <span className="font-bold text-sm sm:text-base text-white">Top 3 Mais Vendidos</span>
              </div>
              <select
                value={topSalesPeriod}
                onChange={e => setTopSalesPeriod(e.target.value as DashboardPeriod)}
                className="bg-slate-900/90 border border-white/10 text-white rounded-xl py-1 px-2.5 focus:outline-none focus:border-amber-500/50 text-xs cursor-pointer font-medium"
              >
                <option value="current_month" className="bg-slate-900 text-white">Mês Atual</option>
                <option value="previous_month" className="bg-slate-900 text-white">Mês Anterior</option>
                <option value="2_months" className="bg-slate-900 text-white">Últimos 2 Meses</option>
                <option value="3_months" className="bg-slate-900 text-white">Últimos 3 Meses</option>
                <option value="all" className="bg-slate-900 text-white">Geral (Todo o Período)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2.5 mt-1 relative z-10">
              {topProductsBySales.map((item, idx) => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl px-3 sm:px-4 py-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' :
                      idx === 1 ? 'bg-slate-300 text-black' :
                      'bg-amber-700 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium text-xs sm:text-sm truncate">{item.product.name}</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-xs sm:text-sm whitespace-nowrap pl-2">{item.qty} un.</span>
                </div>
              ))}
              {topProductsBySales.length === 0 && (
                <p className="text-white/40 text-xs sm:text-sm py-3 text-center">Nenhuma venda registrada no período.</p>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Maior Margem de Lucro */}
        <FadeIn delay="500">
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Percent size={64} className="text-violet-500" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2 text-white/80">
                <Percent size={20} className="text-violet-400" />
                <span className="font-bold text-sm sm:text-base text-white">Top 3 Maior Margem</span>
              </div>
              <select
                value={topMarginPeriod}
                onChange={e => setTopMarginPeriod(e.target.value as DashboardPeriod)}
                className="bg-slate-900/90 border border-white/10 text-white rounded-xl py-1 px-2.5 focus:outline-none focus:border-violet-500/50 text-xs cursor-pointer font-medium"
              >
                <option value="current_month" className="bg-slate-900 text-white">Mês Atual</option>
                <option value="previous_month" className="bg-slate-900 text-white">Mês Anterior</option>
                <option value="2_months" className="bg-slate-900 text-white">Últimos 2 Meses</option>
                <option value="3_months" className="bg-slate-900 text-white">Últimos 3 Meses</option>
                <option value="all" className="bg-slate-900 text-white">Geral (Todo o Período)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2.5 mt-1 relative z-10">
              {topProductsByMargin.map((item, idx) => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl px-3 sm:px-4 py-2 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' :
                      idx === 1 ? 'bg-slate-300 text-black' :
                      'bg-amber-700 text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium text-xs sm:text-sm truncate">{item.product.name}</span>
                  </div>
                  <span className="text-violet-400 font-bold text-xs sm:text-sm whitespace-nowrap pl-2">{item.margin.toFixed(0)}%</span>
                </div>
              ))}
              {topProductsByMargin.length === 0 && (
                <p className="text-white/40 text-xs sm:text-sm py-3 text-center">Nenhum produto cadastrado ou vendido no período.</p>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Payment Methods Panel */}
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white font-jakarta">Métodos de Pagamento</h2>
            <span className="text-[11px] text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              {paymentSummary.totalCount} transações
            </span>
          </div>

          {/* Donut Chart (innerRadius: 35, outerRadius: 55, r: 45, strokeWidth: 20) */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
              <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                <defs>
                  <linearGradient id="immediateDonutGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="debitDonutGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r="45"
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="20"
                />
                {paymentSummary.grandTotal > 0 && (
                  <>
                    {/* Immediate Payment Segment */}
                    {paymentSummary.immediateTotal > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="45"
                        fill="transparent"
                        stroke="url(#immediateDonutGrad)"
                        strokeWidth="20"
                        strokeDasharray={`${(paymentSummary.immediatePct / 100) * 282.74} 282.74`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {/* Debit Payment Segment */}
                    {paymentSummary.debitTotal > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="45"
                        fill="transparent"
                        stroke="url(#debitDonutGrad)"
                        strokeWidth="20"
                        strokeDasharray={`${(paymentSummary.debitPct / 100) * 282.74} 282.74`}
                        strokeDashoffset={-((paymentSummary.immediatePct / 100) * 282.74)}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </>
                )}
              </svg>
              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] text-white/50 uppercase font-medium tracking-wider">Total</span>
                <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {formatCurrency(paymentSummary.grandTotal).replace(',00', '')}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Items with Badges, Currency and Percentages */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
            {/* Pagamento Imediato (PIX) */}
            <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {paymentSummary.immediateCount} transações
                  </span>
                  <span className="text-white/90 font-medium">Pagamento Imediato (PIX)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(paymentSummary.immediateTotal)}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {paymentSummary.immediatePct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mt-1">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${paymentSummary.immediatePct}%` }}
                />
              </div>
            </div>

            {/* Pagar Depois (Débito) */}
            <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {paymentSummary.debitCount} transações
                  </span>
                  <span className="text-white/90 font-medium">Pagar Depois (Débito)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-violet-400">
                    {formatCurrency(paymentSummary.debitTotal)}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {paymentSummary.debitPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mt-1">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-purple-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${paymentSummary.debitPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sales History */}
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden col-span-1 lg:col-span-2 flex flex-col shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <h2 className="text-base sm:text-lg font-bold text-white font-jakarta">Vendas Recentes</h2>
          </div>
          <div className="overflow-x-auto flex-1 w-full shadow-inner border-t border-white/5">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase">
                  <th className="p-3 sm:p-4 font-medium">Data/Hora</th>
                  <th className="p-3 sm:p-4 font-medium">Cliente</th>
                  <th className="p-3 sm:p-4 font-medium">Produto(s)</th>
                  <th className="p-3 sm:p-4 text-center font-medium">Qtd.</th>
                  <th className="p-3 sm:p-4 text-right font-medium">Preço Un.</th>
                  <th className="p-3 sm:p-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                {filteredSales.map(sale => {
                  const customerName = sale.customerRe 
                    ? (customers.find(c => c.re === sale.customerRe)?.name || 'Cliente')
                    : 'Caixa Avulso';

                  return sale.items.map((item, idx) => (
                    <tr key={`${sale.id}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {idx === 0 && (
                        <>
                          <td className="p-3 sm:p-4 text-white/80 whitespace-nowrap" rowSpan={sale.items.length}>
                            {formatDate(sale.created_at)}
                          </td>
                          <td className="p-3 sm:p-4 text-white/80" rowSpan={sale.items.length}>
                            {sale.customerRe ? `${customerName} (RE: ${sale.customerRe})` : 'Caixa Avulso'}
                          </td>
                        </>
                      )}
                      <td className="p-3 sm:p-4 text-white font-medium">{item.product.name}</td>
                      <td className="p-3 sm:p-4 text-white/80 text-center">{item.quantity}</td>
                      <td className="p-3 sm:p-4 text-white/80 text-right">{formatCurrency(item.product.price)}</td>
                      <td className="p-3 sm:p-4 text-white font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ));
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-sm">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução de Vendas por Produto */}
      <FadeIn delay="300">
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 relative shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Evolução do Faturamento por Produto</h2>
              <p className="text-xs sm:text-sm text-white/60">Comparativo de receita (BRL) e volume (unidades) dos produtos</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Legenda do Gráfico */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                  <span className="text-white/70">Faturamento (R$)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
                  <span className="text-white/70">Qtde Vendida (un)</span>
                </div>
              </div>
              <select
                value={chartPeriod}
                onChange={e => setChartPeriod(e.target.value as DashboardPeriod)}
                className="bg-white/5 border border-white/10 text-white rounded-xl py-1.5 px-3 focus:outline-none focus:border-primary-500/50 text-xs sm:text-sm cursor-pointer ml-auto sm:ml-0"
              >
                <option value="current_month" className="bg-slate-900 text-white">Mês Atual</option>
                <option value="previous_month" className="bg-slate-900 text-white">Mês Anterior</option>
                <option value="2_months" className="bg-slate-900 text-white">Últimos 2 Meses</option>
                <option value="3_months" className="bg-slate-900 text-white">Últimos 3 Meses</option>
                <option value="all" className="bg-slate-900 text-white">Geral (Todo o Período)</option>
              </select>
            </div>
          </div>

          <div className="w-full overflow-x-auto min-w-full flex-1 min-h-[320px] p-0 m-0">
            <svg 
              viewBox={`0 0 ${svgWidth} ${chartHeight}`}
              width="100%"
              height="100%"
              className="w-full h-full min-w-[500px]"
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.05)" />
                </linearGradient>
                <linearGradient id="quantityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
                </linearGradient>
                <filter id="revenueGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10B981" floodOpacity="0.3"/>
                </filter>
                <filter id="quantityGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#8B5CF6" floodOpacity="0.3"/>
                </filter>
              </defs>
              {/* Grid Lines and Y-Axis (Left - Revenue BRL) */}
              {yAxisTicksAmount.map((tick, idx) => {
                const y = chartHeight - paddingBottom - ((tick / maxAmount) * (chartHeight - paddingBottom - paddingTop));
                return (
                  <g key={`rev-grid-${idx}`}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={svgWidth - paddingRight} 
                      y2={y} 
                      className="stroke-white/5" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      textAnchor="end" 
                      className="fill-[#94a3b8] text-[10px] font-mono font-medium"
                    >
                      {formatCurrency(tick).replace(',00', '')}
                    </text>
                  </g>
                );
              })}

              {/* Right Y-Axis (Quantity - Units) */}
              {yAxisTicksQuantity.map((tick, idx) => {
                const y = chartHeight - paddingBottom - ((tick / maxQuantity) * (chartHeight - paddingBottom - paddingTop));
                return (
                  <g key={`qty-axis-${idx}`}>
                    <text 
                      x={svgWidth - paddingRight + 10} 
                      y={y + 4} 
                      textAnchor="start" 
                      className="fill-[#94a3b8] text-[10px] font-mono font-medium"
                    >
                      {Math.round(tick)} un
                    </text>
                  </g>
                );
              })}

              {/* Double Bars per Product */}
              {chartData.map((d, idx) => {
                const xGroup = paddingLeft + (idx * step);
                const groupWidth = (barWidth * 2) + innerGap;
                const xRevenue = xGroup + (step - groupWidth) / 2;
                const xQuantity = xRevenue + barWidth + innerGap;

                const revenueHeight = (d.amount / maxAmount) * (chartHeight - paddingBottom - paddingTop);
                const quantityHeight = (d.quantity / maxQuantity) * (chartHeight - paddingBottom - paddingTop);

                const yRevenue = chartHeight - paddingBottom - revenueHeight;
                const yQuantity = chartHeight - paddingBottom - quantityHeight;

                const midX = xRevenue + barWidth + innerGap / 2;

                return (
                  <g key={d.id} className="group">
                    {/* Revenue Bar (Emerald Gradient) */}
                    <rect
                      x={xRevenue}
                      y={yRevenue}
                      width={barWidth}
                      height={Math.max(revenueHeight, 2)}
                      rx={3}
                      fill="url(#revenueGradient)"
                      filter="url(#revenueGlow)"
                      className="transition-all duration-300 cursor-pointer hover:fill-emerald-400"
                      onMouseEnter={(e) => {
                        const containerRect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                        if (containerRect) {
                          setHoveredBar({
                            name: d.name,
                            amount: d.amount,
                            quantity: d.quantity,
                            x: midX,
                            y: Math.min(yRevenue, yQuantity)
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    {/* Quantity Bar (Violet Gradient) */}
                    <rect
                      x={xQuantity}
                      y={yQuantity}
                      width={barWidth}
                      height={Math.max(quantityHeight, 2)}
                      rx={3}
                      fill="url(#quantityGradient)"
                      filter="url(#quantityGlow)"
                      className="transition-all duration-300 cursor-pointer hover:fill-violet-400"
                      onMouseEnter={(e) => {
                        const containerRect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                        if (containerRect) {
                          setHoveredBar({
                            name: d.name,
                            amount: d.amount,
                            quantity: d.quantity,
                            x: midX,
                            y: Math.min(yRevenue, yQuantity)
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    {/* Product Name Label */}
                    <text
                      x={midX - 4}
                      y={chartHeight - paddingBottom + 12}
                      textAnchor="end"
                      transform={`rotate(-45, ${midX - 4}, ${chartHeight - paddingBottom + 12})`}
                      className="fill-[#94a3b8] text-[8px] font-sans group-hover:fill-white font-medium transition-colors"
                    >
                      {d.name.length > 18 ? d.name.substring(0, 15) + '...' : d.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Glassmorphic Hover Tooltip with Dual Metrics relationship */}
            {hoveredBar && (
              <div 
                className="absolute z-10 bg-slate-950/90 border border-emerald-500/20 backdrop-blur-md rounded-xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-xs flex flex-col gap-2 pointer-events-none transition-all duration-150"
                style={{ 
                  left: hoveredBar.x, 
                  top: hoveredBar.y - 85,
                  transform: 'translateX(-50%)',
                  minWidth: '180px'
                }}
              >
                <div className="font-bold text-white border-b border-white/10 pb-1.5 mb-1">
                  {hoveredBar.name}
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-white/60">Faturamento:</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(hoveredBar.amount)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-white/60">Vendas:</span>
                  <span className="text-violet-400 font-bold">{hoveredBar.quantity} un.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Debits management section */}
      <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
        <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Controle de Débitos (Policiais com Contas Pendentes)</h2>
        <div className="overflow-x-auto w-full shadow-inner border border-white/10 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase">
                <th className="p-3 sm:p-4 font-medium">Policial</th>
                <th className="p-3 sm:p-4 font-medium">RE</th>
                <th className="p-3 sm:p-4 font-medium text-right">Total Devido</th>
                <th className="p-3 sm:p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {pendingDebts.map(debt => (
                <tr key={debt.re} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 sm:p-4 text-white font-medium">{debt.name}</td>
                  <td className="p-3 sm:p-4 text-white/80">{debt.re}</td>
                  <td className="p-3 sm:p-4 text-rose-400 font-bold text-right">{formatCurrency(debt.total)}</td>
                  <td className="p-3 sm:p-4 text-center">
                    <button
                      onClick={async () => {
                        const ok = await settleDebts(debt.re);
                        if (ok) alert('Débitos quitados com sucesso!');
                        else alert('Erro ao quitar débitos.');
                      }}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition-all duration-300 text-xs sm:text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      Quitar Débito
                    </button>
                  </td>
                </tr>
              ))}
              {pendingDebts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-medium text-sm">
                    Nenhum débito pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Divergências de Estoque Registradas */}
      <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta flex items-center gap-2">
            Divergências de Estoque Registradas
          </h2>
          <p className="text-xs sm:text-sm text-white/60">Histórico de conflitos identificados na conferência diária de estoque</p>
        </div>
        <div className="overflow-x-auto w-full shadow-inner border border-white/10 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase">
                <th className="p-3 sm:p-4 font-medium">Data do Registro</th>
                <th className="p-3 sm:p-4 font-medium">Produto</th>
                <th className="p-3 sm:p-4 font-medium text-center">Esperado</th>
                <th className="p-3 sm:p-4 font-medium text-center">Real</th>
                <th className="p-3 sm:p-4 font-medium text-center">Diferença</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {stockAudits.map(audit => {
                const diff = audit.real_stock - audit.expected_stock;
                const diffText = diff > 0 ? `+${diff}` : diff;
                const diffClass = diff > 0 ? 'text-emerald-400' : 'text-rose-400';
                return (
                  <tr key={audit.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 sm:p-4 text-white/80 whitespace-nowrap">{formatDate(audit.created_at)}</td>
                    <td className="p-3 sm:p-4 text-white font-medium">{audit.product_name}</td>
                    <td className="p-3 sm:p-4 text-center text-white/80">{audit.expected_stock} un.</td>
                    <td className="p-3 sm:p-4 text-center text-white font-bold">{audit.real_stock} un.</td>
                    <td className={`p-3 sm:p-4 text-center font-bold ${diffClass}`}>{diffText} un.</td>
                  </tr>
                );
              })}
              {stockAudits.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium text-sm">
                    Nenhuma divergência de estoque registrada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clientes e Redefinição de Senhas */}
      <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
        <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Gestão de Policiais cadastrados e Senhas</h2>
        <div className="overflow-x-auto w-full shadow-inner border border-white/10 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase">
                <th className="p-3 sm:p-4 font-medium">Policial / Cliente</th>
                <th className="p-3 sm:p-4 font-medium">RE</th>
                <th className="p-3 sm:p-4 font-medium">Status Acesso</th>
                <th className="p-3 sm:p-4 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {customers.map(customer => (
                <tr key={customer.re} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 sm:p-4 text-white font-medium">{customer.name}</td>
                  <td className="p-3 sm:p-4 text-white/80">{customer.re}</td>
                  <td className="p-3 sm:p-4">
                    <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${
                      customer.password 
                         ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                         : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {customer.password ? 'Senha Ativa' : 'Sem Senha Configurada'}
                    </span>
                  </td>
                  <td className="p-3 sm:p-4 text-center">
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
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-all duration-300 text-xs border border-white/10"
                    >
                      Redefinir Senha
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 font-medium text-sm">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col m-3 sm:m-4 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">
                  Venda #{selectedSale.id}
                </h2>
                <p className="text-xs sm:text-sm text-white/60">{formatDate(selectedSale.created_at)}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-white/60 hover:text-white transition-colors p-1">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 flex flex-col flex-1 overflow-y-auto gap-3 sm:gap-4">
              {selectedSale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-xs sm:text-sm">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-medium truncate">{item.product.name}</span>
                    <span className="text-xs text-white/60">{item.quantity}x {formatCurrency(item.product.price)}</span>
                  </div>
                  <span className="text-white font-bold shrink-0">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              {selectedSale.items.length === 0 && (
                <p className="text-white/50 text-center py-4 text-xs sm:text-sm">Nenhum item encontrado.</p>
              )}
            </div>
            
            <div className="p-4 sm:p-6 border-t border-white/10 flex justify-between items-center bg-black/20">
              <span className="text-white/60 font-medium text-xs sm:text-sm">Total:</span>
              <span className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(selectedSale.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
