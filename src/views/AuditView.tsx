import React, { useMemo, useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { ClipboardCheck, Search, RefreshCw, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { FadeIn } from '../components/ui/FadeIn';

export const AuditView: React.FC = () => {
  const { sales, products, initData, addStockAudit, currentCycleStart } = useMarketStore();
  const [auditSearch, setAuditSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State to hold user input for counted quantities
  const [countedStock, setCountedStock] = useState<Record<string, string>>({});
  // Track registered product IDs in this session to prevent duplicate registrations
  const [registeredIds, setRegisteredIds] = useState<Record<string, boolean>>({});

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

    const cycleStart = new Date(currentCycleStart);

    return sales.filter(sale => {
      const d = new Date(sale.created_at);
      return d >= start && d <= end && sale.status !== 'cancelled' && d >= cycleStart;
    });
  }, [sales, currentCycleStart]);

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

  const handleInputChange = (productId: string, value: string) => {
    setCountedStock(prev => ({
      ...prev,
      [productId]: value
    }));
    // Reset registered state for this product if they change the input
    if (registeredIds[productId]) {
      setRegisteredIds(prev => ({
        ...prev,
        [productId]: false
      }));
    }
  };

  const autofillAllExpected = () => {
    const autofills: Record<string, string> = {};
    products.forEach(p => {
      autofills[p.id] = p.stock.toString();
    });
    setCountedStock(autofills);
  };

  const handleRegisterSingle = async (productId: string, productName: string, expected: number) => {
    const countedVal = countedStock[productId];
    if (countedVal === undefined || countedVal === '') {
      alert('Por favor, insira o valor contado primeiro.');
      return;
    }

    const countedNum = parseInt(countedVal, 10);
    if (isNaN(countedNum)) {
      alert('Por favor, insira um número válido.');
      return;
    }

    await addStockAudit(productId, productName, expected, countedNum);
    setRegisteredIds(prev => ({
      ...prev,
      [productId]: true
    }));
    alert(`Divergência registrada para ${productName}!`);
  };

  const handleRegisterAllDiscrepancies = async () => {
    let registeredCount = 0;
    for (const p of products) {
      const countedVal = countedStock[p.id];
      if (countedVal !== undefined && countedVal !== '') {
        const countedNum = parseInt(countedVal, 10);
        if (!isNaN(countedNum) && countedNum !== p.stock && !registeredIds[p.id]) {
          await addStockAudit(p.id, p.name, p.stock, countedNum);
          setRegisteredIds(prev => ({
            ...prev,
            [p.id]: true
          }));
          registeredCount++;
        }
      }
    }

    if (registeredCount > 0) {
      alert(`${registeredCount} divergência(s) registrada(s) com sucesso!`);
    } else {
      alert('Nenhuma nova divergência encontrada para registrar.');
    }
  };

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
          <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
            <button
              onClick={autofillAllExpected}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium text-sm transition-all duration-300"
            >
              Preencher com Esperado
            </button>
            <button
              onClick={handleRegisterAllDiscrepancies}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
            >
              <Save size={16} />
              Registrar Todas Divergências
            </button>
            <div className="relative flex-1 md:w-80 min-w-[200px]">
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-4 text-white/60 font-medium text-sm">Produto</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Estoque Inicial</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Vendas de Ontem</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Estoque Esperado</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Total Contado</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Status</th>
                  <th className="p-4 text-white/60 font-medium text-sm text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditProducts.map(p => {
                  const salesYesterday = yesterdayProductConsumption[p.id] || 0;
                  const maxStock = p.stock + salesYesterday;
                  const countedValue = countedStock[p.id] || '';
                  const hasInput = countedValue !== '';
                  const countedNum = parseInt(countedValue, 10);
                  const isOk = hasInput && !isNaN(countedNum) && countedNum === p.stock;
                  const isDifferent = hasInput && !isNaN(countedNum) && countedNum !== p.stock;
                  const isAlreadyRegistered = registeredIds[p.id];

                  // CSS classes depending on match status
                  const inputBorderClass = isDifferent
                    ? 'border-rose-500/50 focus:border-rose-500'
                    : isOk
                    ? 'border-emerald-500/50 focus:border-emerald-500'
                    : 'border-white/10 focus:border-primary-500/50';

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
                      <td className="p-4 text-center font-medium">
                        {salesYesterday > 0 ? (
                          <span className="bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-full text-xs">
                            {salesYesterday} un.
                          </span>
                        ) : (
                          <span className="text-white/40 text-xs">0 un.</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-bold text-white text-base">
                        {p.stock} un.
                      </td>
                      <td className="p-4 text-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="Qtde"
                          value={countedValue}
                          onChange={e => handleInputChange(p.id, e.target.value)}
                          className={`bg-white/5 border rounded-xl py-1.5 px-3 text-white text-center w-24 text-sm focus:outline-none transition-colors ${inputBorderClass}`}
                        />
                      </td>
                      <td className="p-4 text-center">
                        {hasInput && !isNaN(countedNum) ? (
                          isOk ? (
                            <span className="flex items-center justify-center gap-1.5 text-emerald-400 text-sm font-semibold">
                              <CheckCircle2 size={18} />
                              OK
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-1.5 text-rose-400 text-sm font-semibold">
                              <AlertTriangle size={18} />
                              Divergente
                            </span>
                          )
                        ) : (
                          <span className="text-white/30 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isDifferent && (
                          <button
                            onClick={() => handleRegisterSingle(p.id, p.name, p.stock)}
                            disabled={isAlreadyRegistered}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-300 ${
                              isAlreadyRegistered 
                                ? 'bg-white/5 border border-white/10 text-white/40 cursor-default'
                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                            }`}
                          >
                            {isAlreadyRegistered ? 'Registrado' : 'Registrar'}
                          </button>
                        )}
                        {isOk && (
                          <span className="text-emerald-500/60 text-xs font-semibold">Sem divergências</span>
                        )}
                        {!hasInput && (
                          <span className="text-white/20 text-xs">Aguardando contagem</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredAuditProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/50">
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
