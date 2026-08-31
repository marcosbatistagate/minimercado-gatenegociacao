import React, { useState, useMemo } from 'react';
import type { UserCustomer } from '../types';
import type { Sale } from '../store/useMarketStore';
import { X, ShoppingBag } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export type HistoryPeriod = 'current_month' | 'previous_month' | '3_months' | 'all';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: UserCustomer;
  sales: Sale[];
  onOpenSettleDebtModal: () => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  onOpenSettleDebtModal
}) => {
  const [period, setPeriod] = useState<HistoryPeriod>('current_month');

  const historyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === 'current_month') {
      startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    } else if (period === 'previous_month') {
      startDate = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    } else if (period === '3_months') {
      startDate = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
    }

    const allUserSales = sales.filter(s => s.customerRe === customer.re && s.status !== 'cancelled');

    // Total em Débito SEMPRE reflete o saldo devedor real acumulado em aberto
    const totalDebt = allUserSales
      .filter(s => s.payment_status === 'PENDING')
      .reduce((sum, s) => sum + s.total_amount, 0);

    // Vendas filtradas pelo período selecionado
    const periodSales = allUserSales.filter(s => {
      const saleDate = new Date(s.created_at);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });

    let periodPaid = 0;
    let periodTotal = 0;
    let periodItemsQty = 0;
    const filteredItems: Array<{
      date: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      paymentStatus: 'PAID' | 'PENDING';
    }> = [];

    periodSales.forEach(s => {
      periodTotal += s.total_amount;
      if (s.payment_status === 'PAID') {
        periodPaid += s.total_amount;
      }
      s.items.forEach(item => {
        periodItemsQty += item.quantity;
        filteredItems.push({
          date: s.created_at,
          productName: item.product.name,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          paymentStatus: s.payment_status
        });
      });
    });

    filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      filteredItems,
      periodPaid,
      periodTotal,
      periodItemsQty,
      totalDebt
    };
  }, [sales, customer.re, period]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-lg md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">
              Extrato e Histórico de Compras
            </h2>
            <p className="text-xs sm:text-sm text-white/60">RE: {customer.re} | {customer.name}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
            <X size={22} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 sm:gap-6">
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Pago no Período */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-1">
              <span className="text-[11px] sm:text-xs text-white/60 font-medium">Total Pago (Período)</span>
              <span className="text-base sm:text-lg font-bold text-emerald-400">{formatCurrency(historyData.periodPaid)}</span>
            </div>

            {/* Total em Débito (Sempre Geral) */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-2 justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] sm:text-xs text-white/60 font-medium">Total em Débito</span>
                <span className="text-base sm:text-lg font-bold text-rose-400">{formatCurrency(historyData.totalDebt)}</span>
              </div>
              {historyData.totalDebt > 0 ? (
                <button
                  onClick={onOpenSettleDebtModal}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1 px-2 rounded-lg text-[10px] sm:text-xs transition-all mt-1 shadow-sm"
                >
                  Quitar PIX
                </button>
              ) : (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-1 self-start">
                  Em Dia
                </span>
              )}
            </div>

            {/* Total do Mês / Período Selecionado */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-1">
              <span className="text-[11px] sm:text-xs text-white/60 font-medium truncate">
                {period === 'current_month' ? 'Total do Mês Atual' :
                 period === 'previous_month' ? 'Total do Mês Anterior' :
                 period === '3_months' ? 'Total em 3 Meses' :
                 'Total do Período'}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-200">{formatCurrency(historyData.periodTotal)}</span>
            </div>

            {/* Itens Adquiridos */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col gap-1">
              <span className="text-[11px] sm:text-xs text-white/60 font-medium">Itens Adquiridos</span>
              <span className="text-base sm:text-lg font-bold text-white">{historyData.periodItemsQty} un.</span>
            </div>
          </div>

          {/* History Table with Period Selector */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h3 className="font-bold text-white text-base sm:text-lg">Produtos Adquiridos</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/60 font-medium hidden sm:inline">Período:</label>
                <select
                  value={period}
                  onChange={e => setPeriod(e.target.value as HistoryPeriod)}
                  className="bg-slate-950 border border-white/20 text-white rounded-xl py-1.5 px-3 text-xs sm:text-sm focus:outline-none focus:border-emerald-500/60 transition-colors cursor-pointer font-medium"
                >
                  <option value="current_month" className="bg-slate-950 text-white">Mês Atual</option>
                  <option value="previous_month" className="bg-slate-950 text-white">Mês Anterior</option>
                  <option value="3_months" className="bg-slate-950 text-white">Últimos 3 Meses</option>
                  <option value="all" className="bg-slate-950 text-white">Todo o Período</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full shadow-inner border border-white/10 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 font-semibold uppercase">
                    <th className="p-2.5 sm:p-3">Data/Hora</th>
                    <th className="p-2.5 sm:p-3">Produto</th>
                    <th className="p-2.5 sm:p-3 text-right">Valor Unitário</th>
                    <th className="p-2.5 sm:p-3 text-center">Qtd.</th>
                    <th className="p-2.5 sm:p-3 text-right">Subtotal</th>
                    <th className="p-2.5 sm:p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs sm:text-sm">
                  {historyData.filteredItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-2.5 sm:p-3 text-white/80 whitespace-nowrap">
                        {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date))}
                      </td>
                      <td className="p-2.5 sm:p-3 text-white font-medium">{item.productName}</td>
                      <td className="p-2.5 sm:p-3 text-white/80 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 sm:p-3 text-white/80 text-center">{item.quantity}</td>
                      <td className="p-2.5 sm:p-3 text-white font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                      <td className="p-2.5 sm:p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${
                          item.paymentStatus === 'PENDING' 
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {item.paymentStatus === 'PENDING' ? 'Em Débito' : 'Pago'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historyData.filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/50 text-xs sm:text-sm">
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <ShoppingBag size={36} className="text-white/20" />
                          <p className="font-medium text-white/70 text-sm sm:text-base">Nenhuma compra registrada neste período.</p>
                          <span className="text-xs text-white/40">Alterne o seletor acima para consultar outros meses ou todo o histórico.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-white/10 flex justify-end bg-black/20">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
