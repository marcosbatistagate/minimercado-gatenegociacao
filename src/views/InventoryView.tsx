import React, { useState, useMemo, useRef } from 'react';
import { useMarketStore, type Product } from '../store/useMarketStore';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { FadeIn } from '../components/ui/FadeIn';

const categoryDescriptions: Record<string, string> = {
  'Bebidas': 'Refrigerantes, sucos, águas, energéticos e outras bebidas.',
  'Snacks e doces': 'Chocolates, salgadinhos, biscoitos, barras de cereal e doces variados.',
  'Salgadinho': 'Batata frita, nachos, amendoins e petiscos salgados.',
  'Barra de proteína': 'Barras de proteína de diversos sabores e marcas para pré/pós treino.',
  'Balas': 'Balas de goma, balas mastigáveis, balas duras e pastilhas.',
  'Bombons': 'Bombons recheados, trufas e chocolates finos.',
};

export const InventoryView: React.FC = () => {
  const { products, sales, addProduct, updateProduct, deleteProduct, dbCategories, initData, lastStockUpdate, currentCycleStart, startNewMonth, pixSettings, updatePixSettings } = useMarketStore();

  const formatUpdateTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch (e) {
      return 'Data inválida';
    }
  };

  const isSaleInCurrentCycle = (saleDateStr: string) => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const cycleStart = new Date(currentCycleStart);
    const effectiveStart = cycleStart > startOfCurrentMonth ? cycleStart : startOfCurrentMonth;
    return new Date(saleDateStr) >= effectiveStart;
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    id: undefined as string | undefined,
    pix_key_type: 'random',
    pix_key: '',
    merchant_name: '',
    merchant_city: '',
  });

  const handleOpenConfigModal = () => {
    setConfigForm({
      id: pixSettings.id,
      pix_key_type: pixSettings.pix_key_type || 'random',
      pix_key: pixSettings.pix_key || '',
      merchant_name: pixSettings.merchant_name || '',
      merchant_city: pixSettings.merchant_city || '',
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePixSettings(configForm);
      alert('Configurações salvas com sucesso!');
      setIsConfigModalOpen(false);
    } catch (err) {
      alert('Erro ao salvar configurações.');
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Modal form state
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    code: '',
    name: '',
    category: '',
    cost_price: 0,
    price: 0,
    stock: 0,
    min_stock: 0,
  });

  // Box / Pack / Display entry state
  const [entryType, setEntryType] = useState<'unit' | 'box'>('unit');
  const [boxCount, setBoxCount] = useState<number>(1);
  const [unitsPerBox, setUnitsPerBox] = useState<number>(1);
  const [boxCost, setBoxCost] = useState<number>(0);
  const [addStockToExisting, setAddStockToExisting] = useState<boolean>(true);

  // Derived calculations for Box mode
  const calculatedUnitCost = useMemo(() => {
    if (entryType === 'box') {
      if (unitsPerBox > 0 && boxCost > 0) {
        return Number((boxCost / unitsPerBox).toFixed(2));
      }
      return 0;
    }
    return formData.cost_price;
  }, [entryType, boxCost, unitsPerBox, formData.cost_price]);

  const currentExistingProduct = useMemo(() => {
    if (editingProduct) return editingProduct;
    if (formData.code.trim()) {
      return products.find(p => p.code.trim().toLowerCase() === formData.code.trim().toLowerCase()) || null;
    }
    return null;
  }, [editingProduct, formData.code, products]);

  const boxAddedUnits = useMemo(() => {
    return (Number(boxCount) || 0) * (Number(unitsPerBox) || 0);
  }, [boxCount, unitsPerBox]);

  const totalCalculatedStock = useMemo(() => {
    const target = currentExistingProduct;
    if (entryType === 'box') {
      if (target && addStockToExisting) {
        return (Number(target.stock) || 0) + boxAddedUnits;
      }
      return boxAddedUnits;
    }
    if (target) {
      return (Number(target.stock) || 0) + (Number(formData.stock) || 0);
    }
    return Number(formData.stock) || 0;
  }, [entryType, currentExistingProduct, addStockToExisting, boxAddedUnits, formData.stock]);

  const fallbackCategories = ['Bebidas', 'Doces & Chocolates', 'Salgados & Snacks', 'Fitness & Proteicos', 'Diversos'];
  
  const modalCategories = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map(c => c.name);
    }
    return fallbackCategories;
  }, [dbCategories]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().trim().includes(searchTerm.toLowerCase().trim()) || 
                          p.code.toLowerCase().trim().includes(searchTerm.toLowerCase().trim());
      const matchCategory = categoryFilter ? p.category === categoryFilter : true;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const calculateMargin = (salePrice: number, costPrice: number) => {
    if (!costPrice || costPrice === 0) return 0;
    return ((salePrice - costPrice) / costPrice) * 100;
  };

  const getStockBadgeClass = (stock: number, minStock: number) => {
    if (stock === 0) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (stock <= minStock) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  const handleOpenModal = (product?: Product) => {
    setShowCustomCategory(false);
    setCustomCategory('');
    setEntryType('unit');
    setBoxCount(1);
    setUnitsPerBox(1);
    setBoxCost(0);
    setAddStockToExisting(true);
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category,
        cost_price: product.cost_price,
        price: product.price,
        stock: 0, // Entrada incremental padrão 0
        min_stock: product.min_stock,
      });
      if (product.cost_price > 0) {
        setBoxCost(product.cost_price);
      }
    } else {
      setEditingProduct(null);
      setFormData({
        code: '',
        name: '',
        category: '',
        cost_price: 0,
        price: 0,
        stock: 0,
        min_stock: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSaveError(null);
    setShowCustomCategory(false);
    setCustomCategory('');
    setEntryType('unit');
    setBoxCount(1);
    setUnitsPerBox(1);
    setBoxCost(0);
    setAddStockToExisting(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      // Find category ID
      const categoryId = dbCategories.find(c => c.name === formData.category)?.id;
      
      const finalCostPrice = entryType === 'box'
        ? calculatedUnitCost
        : Number(formData.cost_price) || 0;

      const targetExisting = editingProduct || products.find(p => p.code.trim().toLowerCase() === formData.code.trim().toLowerCase());

      const finalStock = entryType === 'box'
        ? (targetExisting && addStockToExisting
            ? (Number(targetExisting.stock) || 0) + boxAddedUnits
            : boxAddedUnits)
        : (targetExisting
            ? (Number(targetExisting.stock) || 0) + (Number(formData.stock) || 0)
            : Number(formData.stock) || 0);

      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        stock: finalStock,
        min_stock: Number(formData.min_stock) || 0,
        cost_price: finalCostPrice,
        price: Number(formData.price) || 0,
      };

      console.log('Enviando produto:', payload);

      if (targetExisting) {
        await updateProduct(targetExisting.id, payload, categoryId);
        alert('Produto atualizado com sucesso!');
      } else {
        await addProduct(payload, categoryId);
        alert('Produto cadastrado com sucesso!');
      }
      
      handleCloseModal();
      await initData();
    } catch (err: any) {
      alert('Erro ao salvar produto: ' + err.message);
      setSaveError(err.message || 'Erro ao salvar produto no banco de dados.');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      deleteProduct(id);
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full gap-5 sm:gap-6 p-4 sm:p-6 overflow-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/10 pb-4 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-jakarta">Gestão de Estoque</h1>
          <p className="text-xs text-white/50 mt-1">
            Última atualização do estoque: {formatUpdateTimestamp(lastStockUpdate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={async () => {
              if (confirm('Esta ação inicia um novo ciclo contábil e de faturamento mensal. Os saldos e débitos pendentes dos clientes NÃO serão afetados e continuarão em aberto até a quitação.')) {
                await startNewMonth();
                alert('Novo ciclo mensal iniciado com sucesso! Métricas do mês atual reiniciadas.');
              }
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-950/40 border border-rose-500/50 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition-all duration-300"
          >
            Iniciar Novo Mês
          </button>
          <button
            onClick={handleOpenConfigModal}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-800 border border-slate-700 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 transition-all duration-300"
          >
            Configurar PIX
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-black/60 border border-violet-500 rounded-xl sm:rounded-full text-xs sm:text-sm font-medium text-white hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.4),inset_0_0_10px_rgba(139,92,246,0.2)] hover:scale-105 transition-all duration-300"
          >
            <Plus size={16} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 sm:py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <div className="flex flex-col gap-1 sm:w-64 min-w-[180px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 sm:py-2.5 px-3 sm:px-4 text-xs sm:text-sm text-white focus:outline-none focus:border-primary-500/50 appearance-none w-full"
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {categoryFilter && categoryDescriptions[categoryFilter] && (
            <span className="text-[10px] text-white/40 px-1 italic">
              {categoryDescriptions[categoryFilter]}
            </span>
          )}
        </div>
      </div>

      <FadeIn delay="100" className="flex-1 min-h-0 flex flex-col w-full">
        <div className="flex-1 overflow-x-auto overflow-y-auto w-full shadow-inner border border-white/10 rounded-2xl glass-effect bg-white/5 backdrop-blur-md">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs text-white/60 font-semibold uppercase">
              <th className="p-3 sm:p-4 font-medium">Código</th>
              <th className="p-3 sm:p-4 font-medium">Nome</th>
              <th className="p-3 sm:p-4 text-left font-medium">Categoria</th>
              <th className="p-3 sm:p-4 text-left font-medium">Pr. Custo</th>
              <th className="p-3 sm:p-4 text-left font-medium">Pr. Venda</th>
              <th className="p-3 sm:p-4 text-left font-medium">Margem (%)</th>
              <th className="p-3 sm:p-4 text-left font-medium">Lucro Un.</th>
              <th className="p-3 sm:p-4 text-center font-medium">Qtd. Vendida</th>
              <th className="p-3 sm:p-4 text-center font-medium">Qtd. Paga</th>
              <th className="p-3 sm:p-4 text-center font-medium">Qtd. a Receber</th>
              <th className="p-3 sm:p-4 text-center font-medium">Estoque</th>
              <th className="p-3 sm:p-4 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const margin = calculateMargin(product.price, product.cost_price);
              const profit = product.price - product.cost_price;
              const qtySold = sales.reduce((sum, sale) => {
                if (sale.status === 'cancelled' || !isSaleInCurrentCycle(sale.created_at)) return sum;
                const item = sale.items.find(i => i.product.id === product.id);
                return sum + (item ? item.quantity : 0);
              }, 0);

              const qtyPaid = sales.reduce((sum, sale) => {
                if (sale.payment_status === 'PAID' && sale.status !== 'cancelled' && isSaleInCurrentCycle(sale.created_at)) {
                  const item = sale.items.find(i => i.product.id === product.id);
                  return sum + (item ? item.quantity : 0);
                }
                return sum;
              }, 0);

              const qtyPending = sales.reduce((sum, sale) => {
                if (sale.payment_status === 'PENDING' && sale.status !== 'cancelled' && isSaleInCurrentCycle(sale.created_at)) {
                  const item = sale.items.find(i => i.product.id === product.id);
                  return sum + (item ? item.quantity : 0);
                }
                return sum;
              }, 0);
 
              return (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white/80">{product.code}</td>
                  <td className="p-4 text-white font-medium">{product.name}</td>
                  <td className="p-4 text-white/80">{product.category}</td>
                  <td className="p-4 text-white/80">R$ {product.cost_price.toFixed(2)}</td>
                  <td className="p-4 text-white/80">R$ {product.price.toFixed(2)}</td>
                  <td className="p-4 text-white/80">{margin.toFixed(2)}%</td>
                  <td className="p-4 text-emerald-400/90 font-medium">R$ {profit.toFixed(2)}</td>
                  <td className="p-4 text-white/80 text-center font-medium">{qtySold}</td>
                  <td className="p-4 text-emerald-400 text-center font-medium">{qtyPaid}</td>
                  <td className="p-4 text-rose-400 text-center font-medium">{qtyPending}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStockBadgeClass(product.stock, product.min_stock)}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenModal(product)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={12} className="p-8 text-center text-white/50">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </FadeIn>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-lg md:max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-black/40 hover:border-emerald-500/40 transition-all duration-300 m-3 sm:m-4">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={handleCloseModal} className="text-white/60 hover:text-white transition-colors p-1">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-auto">
              <div className="p-4 sm:p-6 flex flex-col gap-4">
                {/* Entry Type Toggle */}
                <div className="flex items-center gap-2 p-1 bg-black/40 border border-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEntryType('unit')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                      entryType === 'unit'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Unidade Avulsa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('box');
                      if (formData.cost_price > 0 && boxCost === 0) {
                        setBoxCost(Number((formData.cost_price * (unitsPerBox || 1)).toFixed(2)));
                      }
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      entryType === 'box'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>📦 Caixa / Display</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Barcode of unit */}
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">
                      {entryType === 'box' ? 'Código de Barras da Unidade (Venda no Totem)' : 'Código de Barras (Unidade)'}
                    </label>
                    <input 
                      autoFocus 
                      required 
                      type="text" 
                      value={formData.code} 
                      onChange={e => setFormData({...formData, code: e.target.value})} 
                      onKeyDown={handleCodeKeyDown} 
                      placeholder="Bipe ou digite o código..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                    />
                  </div>

                  {/* Product Name */}
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Nome do Produto</label>
                    <input 
                      ref={nameInputRef} 
                      required 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="Ex: Chocolate KitKat 41.5g"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm text-white/60">Categoria</label>
                    <select 
                      required 
                      value={showCustomCategory ? 'NEW_CUSTOM' : formData.category} 
                      onChange={e => {
                        if (e.target.value === 'NEW_CUSTOM') {
                          setShowCustomCategory(true);
                          setFormData({...formData, category: customCategory});
                        } else {
                          setShowCustomCategory(false);
                          setFormData({...formData, category: e.target.value});
                        }
                      }} 
                      className="w-full bg-slate-800 text-white border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 text-white focus:outline-none"
                    >
                      <option value="" className="bg-slate-800 text-white">Selecione uma categoria...</option>
                      {modalCategories.map(catName => (
                        <option key={catName} value={catName} className="bg-slate-800 text-white">{catName}</option>
                      ))}
                      <option value="NEW_CUSTOM" className="bg-slate-800 text-white">+ Nova Categoria...</option>
                    </select>
                    {showCustomCategory && (
                      <div className="mt-2 space-y-1">
                        <label className="text-xs text-white/60">Nome da Nova Categoria</label>
                        <input 
                          required 
                          type="text" 
                          value={customCategory} 
                          onChange={e => {
                            setCustomCategory(e.target.value);
                            setFormData({...formData, category: e.target.value});
                          }} 
                          placeholder="Digite o nome da categoria"
                          className="w-full bg-slate-800 text-white placeholder-slate-400 border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                        />
                      </div>
                    )}
                    {formData.category && categoryDescriptions[formData.category] && (
                      <p className="text-xs text-white/40 mt-1 italic">
                        {categoryDescriptions[formData.category]}
                      </p>
                    )}
                  </div>

                  {/* Minimum Stock */}
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Estoque Mínimo (Unidades)</label>
                    <input 
                      required 
                      type="number" 
                      min="0"
                      value={formData.min_stock} 
                      onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} 
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                    />
                  </div>

                  {/* Mode specific stock inputs */}
                  {entryType === 'unit' ? (
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label className="text-sm text-white/60 font-medium">Quantidade (Entrada / Adicionar)</label>
                        {currentExistingProduct && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            Estoque remanescente atual: {currentExistingProduct.stock} un
                          </span>
                        )}
                      </div>
                      <input 
                        required 
                        type="number" 
                        min="0"
                        value={formData.stock} 
                        onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
                        placeholder="Qtd de itens entrando"
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                      />
                      {currentExistingProduct && (
                        <p className="text-[11px] text-white/50">
                          Novo estoque total resultante será: <strong className="text-emerald-400 font-semibold">{currentExistingProduct.stock + (Number(formData.stock) || 0)} un</strong>
                          {formData.stock === 0 && ' (nenhuma nova unidade será somada)'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-sm text-white/60 font-medium">Quantidade de Caixas Recebidas</label>
                        <input 
                          required 
                          type="number" 
                          min="1"
                          value={boxCount} 
                          onChange={e => setBoxCount(Math.max(1, Number(e.target.value)))} 
                          placeholder="Ex: 2"
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm text-white/60 font-medium">Unidades por Caixa / Display</label>
                        <input 
                          required 
                          type="number" 
                          min="1"
                          value={unitsPerBox} 
                          onChange={e => setUnitsPerBox(Math.max(1, Number(e.target.value)))} 
                          placeholder="Ex: 16"
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                        />
                      </div>

                      {/* Highlighted Resulting Stock Card */}
                      <div className="sm:col-span-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-emerald-300 font-medium">Estoque Total Resultante</span>
                          <span className="text-xl font-bold text-emerald-400">
                            📦 Total: {totalCalculatedStock} unidades em estoque
                          </span>
                          <span className="text-[11px] text-white/50">
                            ({boxCount} {boxCount === 1 ? 'caixa' : 'caixas'} × {unitsPerBox} un. = {boxAddedUnits} novas unidades
                            {currentExistingProduct && addStockToExisting ? ` + ${currentExistingProduct.stock} un. atuais` : ''})
                          </span>
                        </div>
                        {currentExistingProduct && (
                          <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/40 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={addStockToExisting} 
                              onChange={e => setAddStockToExisting(e.target.checked)}
                              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500" 
                            />
                            <span>Somar ao estoque atual ({currentExistingProduct.stock} un.)</span>
                          </label>
                        )}
                      </div>
                    </>
                  )}

                  {/* Mode specific cost inputs */}
                  {entryType === 'unit' ? (
                    <div className="space-y-1">
                      <label className="text-sm text-white/60">Preço de Custo Unitário (R$)</label>
                      <input 
                        required 
                        type="number" 
                        step="0.01" 
                        min="0"
                        value={formData.cost_price} 
                        onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-sm text-white/60 font-medium">Custo da Caixa (R$)</label>
                        <input 
                          required 
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={boxCost} 
                          onChange={e => setBoxCost(Number(e.target.value))} 
                          placeholder="Ex: 24.00"
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm text-white/60 font-medium">Custo Unitário (Calculado)</label>
                        <div className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-emerald-400 font-semibold cursor-not-allowed flex items-center justify-between">
                          <span>R$ {calculatedUnitCost.toFixed(2)}</span>
                          <span className="text-[10px] text-white/40 font-normal">
                            (R$ {boxCost.toFixed(2)} / {unitsPerBox} un.)
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sale Price */}
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Preço de Venda Unitário (R$)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                      placeholder="Ex: 3.50"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" 
                    />
                  </div>

                  {/* Margin & Profit */}
                  <div className="space-y-1">
                    <label className="text-sm text-white/60">Margem (%)</label>
                    <div className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white/60 cursor-not-allowed">
                      {calculateMargin(formData.price, entryType === 'box' ? calculatedUnitCost : formData.cost_price).toFixed(2)}%
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm text-white/60">Lucro Un. Estimado (R$)</label>
                    <div className="w-full bg-black/20 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 font-medium cursor-not-allowed">
                      R$ {(formData.price - (entryType === 'box' ? calculatedUnitCost : formData.cost_price)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="px-6 py-3 mx-6 mt-2 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                  {saveError}
                </div>
              )}
              
              <div className="p-4 sm:p-6 border-t border-white/10 flex justify-end gap-3 mt-auto bg-black/20">
                <button type="button" onClick={handleCloseModal} className="px-4 sm:px-5 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium text-xs sm:text-sm">
                  Cancelar
                </button>
                <button type="submit" className="px-4 sm:px-5 py-2 rounded-xl text-white bg-primary-600 hover:bg-primary-500 transition-colors font-medium shadow-lg shadow-emerald-600/20 text-xs sm:text-sm">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto m-3 sm:m-4 shadow-2xl shadow-black/40 flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">
                Configurações do Mercado (PIX)
              </h2>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-white/60 hover:text-white transition-colors p-1">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSaveConfig} className="flex flex-col p-4 sm:p-6 gap-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-white/60 font-medium">Tipo de Chave PIX</label>
                <select
                  value={configForm.pix_key_type}
                  onChange={e => setConfigForm({...configForm, pix_key_type: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="CPF" className="bg-slate-800 text-white">CPF</option>
                  <option value="CNPJ" className="bg-slate-800 text-white">CNPJ</option>
                  <option value="email" className="bg-slate-800 text-white">E-mail</option>
                  <option value="phone" className="bg-slate-800 text-white">Telefone</option>
                  <option value="random" className="bg-slate-800 text-white">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-white/60 font-medium">Chave PIX</label>
                <input
                  required
                  type="text"
                  value={configForm.pix_key}
                  onChange={e => setConfigForm({...configForm, pix_key: e.target.value})}
                  placeholder="Ex: 123.456.789-00 ou email@domain.com"
                  className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-white/60 font-medium">Nome do Beneficiário/Titular</label>
                <input
                  required
                  type="text"
                  value={configForm.merchant_name}
                  onChange={e => setConfigForm({...configForm, merchant_name: e.target.value})}
                  placeholder="Ex: Gremio Negociacao"
                  className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm text-white/60 font-medium">Cidade do Beneficiário</label>
                <input
                  required
                  type="text"
                  value={configForm.merchant_city}
                  onChange={e => setConfigForm({...configForm, merchant_city: e.target.value})}
                  placeholder="Ex: Sao Paulo"
                  className="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 sm:px-5 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 sm:px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 transition-colors font-medium text-xs sm:text-sm"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
