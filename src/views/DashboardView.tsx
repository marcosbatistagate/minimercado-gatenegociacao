import React, { useMemo, useState } from 'react';
import { useMarketStore, type Sale, type Product } from '../store/useMarketStore';
import { TrendingUp, ShoppingBag, AlertTriangle, Receipt, X, Award, Percent, Eye, EyeOff } from 'lucide-react';
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

const formatCostDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

type DashboardPeriod = 'current_month' | 'previous_month' | '2_months' | '3_months';

export const DashboardView: React.FC = () => {
  const { sales, products, customers, settleDebts, stockAudits, currentCycleStart, startNewMonth, costEntries } = useMarketStore();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('current_month');

  // Debt Clear Modal State
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<{ re: string; name: string; total: number } | null>(null);
  const [showDebtClearModal, setShowDebtClearModal] = useState(false);
  const [debtAdminPassword, setDebtAdminPassword] = useState('');
  const [showDebtAdminPassword, setShowDebtAdminPassword] = useState(false);
  const [debtPasswordError, setDebtPasswordError] = useState<string | null>(null);
  const [isSubmittingDebtClear, setIsSubmittingDebtClear] = useState(false);

  const handleOpenDebtClearModal = (debtCustomer: { re: string; name: string; total: number }) => {
    setSelectedDebtCustomer(debtCustomer);
    setDebtAdminPassword('');
    setShowDebtAdminPassword(false);
    setDebtPasswordError(null);
    setShowDebtClearModal(true);
  };

  const handleCloseDebtClearModal = () => {
    setShowDebtClearModal(false);
    setSelectedDebtCustomer(null);
    setDebtAdminPassword('');
    setShowDebtAdminPassword(false);
    setDebtPasswordError(null);
  };

  const handleConfirmDebtClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtCustomer) return;

    if (debtAdminPassword !== 'delta0309') {
      setDebtPasswordError('Senha de administrador incorreta.');
      return;
    }

    setIsSubmittingDebtClear(true);
    setDebtPasswordError(null);
    try {
      await settleDebts(selectedDebtCustomer.re);
      alert(`Débito de ${selectedDebtCustomer.name} (RE: ${selectedDebtCustomer.re}) quitado com sucesso!`);
      handleCloseDebtClearModal();
    } catch (err: any) {
      console.error('Erro ao baixar débito no Supabase:', err);
      const errorMessage = err?.message || 'Erro ao processar a baixa manual no banco de dados.';
      setDebtPasswordError(errorMessage);
      alert('Erro ao baixar débito: ' + errorMessage);
    } finally {
      setIsSubmittingDebtClear(false);
    }
  };

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
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

    if (period === 'current_month') {
      const cycleDate = currentCycleStart ? new Date(currentCycleStart) : startOfCurrentMonth;
      const effectiveStart = cycleDate > startOfCurrentMonth ? cycleDate : startOfCurrentMonth;
      return {
        startDate: effectiveStart,
        endDate: null
      };
    }
    if (period === 'previous_month') {
      const cycleDate = currentCycleStart ? new Date(currentCycleStart) : startOfCurrentMonth;
      const effectiveEnd = cycleDate > startOfCurrentMonth ? cycleDate : new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      return {
        startDate: new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0),
        endDate: effectiveEnd
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
    return {
      startDate: startOfCurrentMonth,
      endDate: null
    };
  };

  const activeSales = useMemo(() => {
    const { startDate, endDate } = getPeriodRange(selectedPeriod);
    return sales.filter(s => {
      if (s.status === 'cancelled') return false;
      const saleDate = new Date(s.created_at);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }, [sales, selectedPeriod, currentCycleStart]);

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

  const filteredCostEntries = useMemo(() => {
    const { startDate, endDate } = getPeriodRange(selectedPeriod);
    return (costEntries || []).filter(entry => {
      const entryDate = new Date(entry.created_at);
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }, [costEntries, selectedPeriod, currentCycleStart]);

  const totalPeriodCost = useMemo(() => {
    return filteredCostEntries.reduce((sum, entry) => sum + (Number(entry.total_cost) || 0), 0);
  }, [filteredCostEntries]);

  const chartData = useMemo(() => {
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

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product?.id && productStats[item.product.id]) {
          productStats[item.product.id].amount += item.subtotal;
          productStats[item.product.id].quantity += item.quantity;
        }
      });
    });

    // Return all products sorted by name
    return Object.values(productStats).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSales, products]);

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

  const topProductsBySales = useMemo(() => {
    const counts: Record<string, { product: typeof products[0]; qty: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product?.id) {
          if (!counts[item.product.id]) {
            counts[item.product.id] = { product: item.product, qty: 0 };
          }
          counts[item.product.id].qty += item.quantity;
        }
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);
  }, [filteredSales, products]);

  const topProductsByMargin = useMemo(() => {
    const soldProductsMap = new Map<string, Product>();

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product?.id) {
          soldProductsMap.set(item.product.id, item.product);
        }
      });
    });

    return Array.from(soldProductsMap.values())
      .map(p => {
        const margin = p.cost_price > 0 ? ((p.price - p.cost_price) / p.cost_price) * 100 : 0;
        return { product: p, margin };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 3);
  }, [filteredSales]);

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

    const isSaleDebit = (s: Sale) => {
      const rawPaymentStatus = (s.payment_status || '').toLowerCase();
      const rawStatus = (s.status || '').toLowerCase();
      const rawMethod = (s.payment_method || '').toUpperCase();

      if (rawPaymentStatus === 'paid' || rawStatus === 'completed' || rawMethod === 'PIX' || rawMethod === 'DEBIT_PAID') {
        return false;
      }

      return (
        rawPaymentStatus === 'pending' ||
        rawPaymentStatus === 'debit' ||
        rawStatus === 'pending' ||
        rawStatus === 'debit' ||
        rawMethod === 'DEBIT'
      );
    };

    filteredSales.forEach(s => {
      if (s.status !== 'cancelled') {
        if (isSaleDebit(s)) {
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
    const isSaleDebit = (s: Sale) => {
      const rawPaymentStatus = (s.payment_status || '').toLowerCase();
      const rawStatus = (s.status || '').toLowerCase();
      const rawMethod = (s.payment_method || '').toUpperCase();

      if (rawPaymentStatus === 'paid' || rawStatus === 'completed' || rawMethod === 'PIX' || rawMethod === 'DEBIT_PAID') {
        return false;
      }

      return (
        rawPaymentStatus === 'pending' ||
        rawPaymentStatus === 'debit' ||
        rawStatus === 'pending' ||
        rawStatus === 'debit' ||
        rawMethod === 'DEBIT'
      );
    };

    // 1. Scan customers with positive debt from table
    customers.forEach(c => {
      const cDebt = (c as any).debt ? Number((c as any).debt) : 0;
      if (cDebt > 0) {
        debtsMap[c.re] = { re: c.re, name: c.name, total: cDebt };
      }
    });

    // 2. Aggregate all pending sales across all time
    sales.forEach(s => {
      if (isSaleDebit(s) && s.status !== 'cancelled' && s.customerRe) {
        const customer = customers.find(c => c.re === s.customerRe);
        const name = customer ? customer.name : 'Policial';
        if (!debtsMap[s.customerRe]) {
          debtsMap[s.customerRe] = { re: s.customerRe, name, total: 0 };
        }
        debtsMap[s.customerRe].total += s.total_amount;
      }
    });

    return Object.values(debtsMap)
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [sales, customers]);

  return (
    <div className="flex flex-col h-full gap-5 sm:gap-6 p-4 sm:p-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-jakarta">Dashboard & Métricas</h1>
          <p className="text-xs text-white/50">Visão analítica de faturamento, estoque e modalidades de pagamento</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={async () => {
              if (confirm('Esta ação inicia um novo ciclo contábil e de faturamento mensal. Os saldos e débitos pendentes dos clientes NÃO serão afetados e continuarão em aberto até a quitação.')) {
                await startNewMonth();
                alert('Novo ciclo mensal iniciado com sucesso! Métricas do mês atual reiniciadas.');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs sm:text-sm font-medium text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition-all duration-300"
          >
            Iniciar Novo Mês
          </button>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm shadow-sm">
            <span className="text-white/60 font-medium">Período:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as DashboardPeriod)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs sm:text-sm"
            >
              <option value="current_month" className="bg-slate-900 text-white">Mês Atual</option>
              <option value="previous_month" className="bg-slate-900 text-white">Mês Anterior</option>
              <option value="2_months" className="bg-slate-900 text-white">Últimos 2 Meses</option>
              <option value="3_months" className="bg-slate-900 text-white">Últimos 3 Meses</option>
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
            <div className="flex items-center gap-2 text-white/80 relative z-10">
              <Award size={20} className="text-amber-400" />
              <span className="font-bold text-sm sm:text-base text-white">Top 3 Mais Vendidos</span>
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
            <div className="flex items-center gap-2 text-white/80 relative z-10">
              <Percent size={20} className="text-violet-400" />
              <span className="font-bold text-sm sm:text-base text-white">Top 3 Maior Margem</span>
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
                <p className="text-white/40 text-xs sm:text-sm py-3 text-center">Nenhuma venda registrada no período.</p>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* 1ª Dobra: Vendas Recentes (Largura total w-full) */}
      <FadeIn delay="300">
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden w-full flex flex-col shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
          <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-jakarta">Vendas Realizadas</h2>
              <p className="text-xs text-white/50">Histórico detalhado de transações realizadas no período selecionado</p>
            </div>
            <span className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
              {filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'}
            </span>
          </div>
          <div className="overflow-x-auto w-full shadow-inner">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase tracking-wider">
                  <th className="p-3 sm:p-4 font-semibold">Data/Hora</th>
                  <th className="p-3 sm:p-4 font-semibold">Cliente</th>
                  <th className="p-3 sm:p-4 font-semibold">Produto(s)</th>
                  <th className="p-3 sm:p-4 text-center font-semibold">Qtd.</th>
                  <th className="p-3 sm:p-4 text-right font-semibold">Preço Un.</th>
                  <th className="p-3 sm:p-4 text-right font-semibold">Subtotal</th>
                  <th className="p-3 sm:p-4 text-center font-semibold">Status Pagamento</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm divide-y divide-white/5">
                {filteredSales.map(sale => {
                  const customerName = sale.customerRe 
                    ? (customers.find(c => c.re === sale.customerRe)?.name || 'Cliente')
                    : 'Caixa Avulso';
                  const isDebit = ((sale.payment_status || '').toLowerCase() === 'pending' || 
                                  (sale.payment_status || '').toLowerCase() === 'debit' ||
                                  (sale.payment_method || '').toUpperCase() === 'DEBIT' ||
                                  (sale.status || '').toLowerCase() === 'pending') &&
                                  (sale.payment_status || '').toLowerCase() !== 'paid' &&
                                  (sale.status || '').toLowerCase() !== 'completed' &&
                                  (sale.payment_method || '').toUpperCase() !== 'PIX' &&
                                  (sale.payment_method || '').toUpperCase() !== 'DEBIT_PAID';

                  return sale.items.map((item, idx) => (
                    <tr key={`${sale.id}-${idx}`} className="hover:bg-white/5 transition-colors">
                      {idx === 0 && (
                        <>
                          <td className="p-3 sm:p-4 text-white/80 whitespace-nowrap align-top" rowSpan={sale.items.length}>
                            {formatDate(sale.created_at)}
                          </td>
                          <td className="p-3 sm:p-4 text-white/80 align-top" rowSpan={sale.items.length}>
                            {sale.customerRe ? (
                              <span className="font-medium text-white">
                                {customerName} <span className="text-white/50 text-xs">(RE: {sale.customerRe})</span>
                              </span>
                            ) : (
                              <span className="text-white/60 italic">Caixa Avulso</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="p-3 sm:p-4 text-white font-medium">{item.product.name}</td>
                      <td className="p-3 sm:p-4 text-white/80 text-center">{item.quantity}</td>
                      <td className="p-3 sm:p-4 text-white/80 text-right">{formatCurrency(item.product.price)}</td>
                      <td className="p-3 sm:p-4 text-white font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                      {idx === 0 && (
                        <td className="p-3 sm:p-4 text-center align-top" rowSpan={sale.items.length}>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${
                            isDebit 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {isDebit ? 'Em Débito' : 'Pago (PIX)'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ));
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium text-sm">
                      Nenhuma venda encontrada no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeIn>

      {/* 2ª Dobra: Métodos de Pagamento (Destaque Horizontal w-full) */}
      <FadeIn delay="500">
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-7 flex flex-col gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-jakarta">Métodos de Pagamento</h2>
              <p className="text-xs text-white/50">Proporção e volume entre transações imediatas (PIX) e compras em débito</p>
            </div>
            <span className="text-xs font-semibold text-white/70 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
              {paymentSummary.totalCount} transações totais
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Donut Chart (Colunas 1 a 4) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-2">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center">
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
                  <span className="text-[10px] sm:text-xs text-white/50 uppercase font-semibold tracking-wider">Total</span>
                  <span className="text-sm sm:text-base font-bold text-white leading-tight">
                    {formatCurrency(paymentSummary.grandTotal).replace(',00', '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Cards Informativos Lado a Lado (Colunas 5 a 12) */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pagamento Imediato (PIX) */}
              <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-3 hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    Pagamento Imediato (PIX)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {paymentSummary.immediatePct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
                    {formatCurrency(paymentSummary.immediateTotal)}
                  </span>
                  <span className="text-xs text-white/60 font-medium">
                    {paymentSummary.immediateCount} {paymentSummary.immediateCount === 1 ? 'transação realizada' : 'transações realizadas'}
                  </span>
                </div>

                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mt-1">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${paymentSummary.immediatePct}%` }}
                  />
                </div>
              </div>

              {/* Pagar Depois (Débito) */}
              <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-3 hover:bg-white/10 hover:border-violet-500/30 transition-all duration-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
                    Pagar Depois (Débito)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    {paymentSummary.debitPct.toFixed(1)}%
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-violet-400">
                    {formatCurrency(paymentSummary.debitTotal)}
                  </span>
                  <span className="text-xs text-white/60 font-medium">
                    {paymentSummary.debitCount} {paymentSummary.debitCount === 1 ? 'transação em aberto' : 'transações em aberto'}
                  </span>
                </div>

                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mt-1">
                  <div 
                    className="bg-gradient-to-r from-violet-500 to-purple-400 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${paymentSummary.debitPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Gráfico de Evolução de Vendas por Produto */}
      <FadeIn delay="300">
        <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 relative shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Evolução do Faturamento por Produto</h2>
              <p className="text-xs sm:text-sm text-white/60">Comparativo de receita (BRL) e volume (unidades) dos produtos</p>
            </div>
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
              {pendingDebts.map(debtCustomer => (
                <tr key={debtCustomer.re} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 sm:p-4 text-white font-medium">{debtCustomer.name}</td>
                  <td className="p-3 sm:p-4 text-white/80">{debtCustomer.re}</td>
                  <td className="p-3 sm:p-4 text-rose-400 font-bold text-right">{formatCurrency(debtCustomer.total)}</td>
                  <td className="p-3 sm:p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenDebtClearModal(debtCustomer)}
                      className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium py-1.5 px-4 rounded-lg text-sm shadow-md transition-all duration-150"
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

      {/* Registro Detalhado de Custos (Entradas / Mercadorias) */}
      <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 transition-colors duration-200 w-full">
        {/* Cabeçalho da Seção com Card de Resumo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta flex items-center gap-2">
              <Receipt size={22} className="text-emerald-400 shrink-0" />
              Registro Detalhado de Custos (Entradas / Mercadorias)
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Histórico discriminado de aquisição e reposição de itens no período selecionado
            </p>
          </div>

          {/* Card de Resumo no Cabeçalho da Seção */}
          <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl flex flex-col items-start sm:items-end justify-center shrink-0">
            <span className="text-white/60 text-xs font-medium">Custo Total Acumulado</span>
            <span className="text-lg sm:text-2xl font-bold text-emerald-400 font-jakarta">
              {formatCurrency(totalPeriodCost)}
            </span>
          </div>
        </div>

        {/* Tabela de Detalhamento dos Registros de Custo */}
        <div className="overflow-x-auto w-full shadow-inner border border-white/10 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 uppercase">
                <th className="p-3 sm:p-4 font-medium">DATA/HORA</th>
                <th className="p-3 sm:p-4 font-medium">PRODUTO</th>
                <th className="p-3 sm:p-4 font-medium text-center">QUANTIDADE</th>
                <th className="p-3 sm:p-4 font-medium text-right">CUSTO UNITÁRIO</th>
                <th className="p-3 sm:p-4 font-medium text-right">CUSTO TOTAL</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {filteredCostEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 sm:p-4 text-white/80 whitespace-nowrap font-mono text-xs">
                    {formatCostDate(entry.created_at)}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{entry.product_name}</span>
                      <span className="text-[11px] text-white/50 font-mono">{entry.product_code}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4 text-center font-medium text-white/90 whitespace-nowrap">
                    {entry.quantity} un.
                  </td>
                  <td className="p-3 sm:p-4 text-right text-white/80 whitespace-nowrap">
                    {formatCurrency(entry.unit_cost)}
                  </td>
                  <td className="p-3 sm:p-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                    {formatCurrency(entry.total_cost)}
                  </td>
                </tr>
              ))}
              {filteredCostEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium text-sm">
                    Nenhum registro de custo cadastrado no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Divergências de Estoque Registradas */}
      <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 transition-colors duration-200">
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

      {/* Debt Clear Confirmation Modal with Admin Password */}
      {showDebtClearModal && selectedDebtCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl shadow-black/80">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-jakarta">
                    Baixa Manual de Débito
                  </h3>
                  <p className="text-xs text-white/50">Confirmação de Quitação Administrativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDebtClearModal}
                className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleConfirmDebtClear} className="p-4 sm:p-6 flex flex-col gap-4">
              {/* Warning Alert Banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-amber-200">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">
                  A quitação prioritária deve ser feita pelo policial via QR Code PIX no Totem. Esta baixa manual é uma exceção administrativa.
                </p>
              </div>

              {/* Customer and Debt Details */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Policial:</span>
                  <span className="text-white font-semibold text-sm">{selectedDebtCustomer.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">RE:</span>
                  <span className="text-white/90 font-mono font-medium">{selectedDebtCustomer.re}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                  <span className="text-xs text-white/60">Valor Total a Baixar:</span>
                  <span className="text-base sm:text-lg font-bold text-rose-400">
                    {formatCurrency(selectedDebtCustomer.total)}
                  </span>
                </div>
              </div>

              {/* Password Input with Eye Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">
                  Senha do Administrador:
                </label>
                <div className="relative">
                  <input
                    type={showDebtAdminPassword ? 'text' : 'password'}
                    value={debtAdminPassword}
                    onChange={e => {
                      setDebtAdminPassword(e.target.value);
                      if (debtPasswordError) setDebtPasswordError(null);
                    }}
                    placeholder="Digite a senha de admin"
                    autoFocus
                    required
                    className="w-full bg-slate-950 border border-white/20 rounded-xl py-2.5 pl-3.5 pr-11 text-sm text-white placeholder-white/40 focus:outline-none focus:border-red-500 transition-colors font-sans"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowDebtAdminPassword(!showDebtAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/90 transition-colors p-1"
                  >
                    {showDebtAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {debtPasswordError && (
                  <span className="text-xs text-rose-400 font-medium animate-in fade-in">
                    {debtPasswordError}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 mt-1">
                <button
                  type="button"
                  onClick={handleCloseDebtClearModal}
                  disabled={isSubmittingDebtClear}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDebtClear}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-900/30 transition-all duration-150 flex items-center gap-2"
                >
                  {isSubmittingDebtClear ? 'Baixando...' : 'Confirmar Baixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
