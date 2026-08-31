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
  const { products, sales, addProduct, updateProduct, deleteProduct, dbCategories, initData, lastStockUpdate, currentCycleStart, startNewMonth } = useMarketStore();

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
    return new Date(saleDateStr) >= new Date(currentCycleStart);
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  
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
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (product) {
      setEditingProduct(product);
      setFormData({
        code: product.code,
        name: product.name,
        category: product.category,
        cost_price: product.cost_price,
        price: product.price,
        stock: product.stock,
        min_stock: product.min_stock,
      });
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
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      // Find category ID
      const categoryId = dbCategories.find(c => c.name === formData.category)?.id;
      
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category,
        stock: Number(formData.stock) || 0,
        min_stock: Number(formData.min_stock) || 0,
        cost_price: Number(formData.cost_price) || 0,
        price: Number(formData.price) || 0,
      };

      console.log('Enviando produto:', payload);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload, categoryId);
        alert('Produto atualizado com sucesso!');
      } else {
        await addProduct(payload, categoryId);
        alert('Produto cadastrado com sucesso!');
      }
      
      handleCloseModal();
      await initData();
    } catch (err: any) {
      alert('Erro ao cadastrar produto: ' + err.message);
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
    <div className="flex flex-col h-full gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-jakarta">Gestão de Estoque</h1>
          <p className="text-xs text-white/50 mt-1">
            Última atualização do estoque: {formatUpdateTimestamp(lastStockUpdate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja zerar os indicadores do mês e reiniciar a planilha de estoque?')) {
                startNewMonth();
                alert('Planilha de estoque reiniciada para o novo mês!');
              }
            }}
            className="flex items-center gap-2 pl-4 pr-4 py-2.5 bg-rose-950/40 border border-rose-500/50 rounded-full text-sm font-medium text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 transition-all duration-300"
          >
            Iniciar Novo Mês
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 pl-4 pr-4 py-2.5 bg-black/60 border border-violet-500 rounded-full text-sm font-medium text-white hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.4),inset_0_0_10px_rgba(139,92,246,0.2)] hover:scale-105 transition-all duration-300"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[200px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-primary-500/50 appearance-none w-full"
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
        <div className="flex-1 overflow-auto -mx-4 sm:mx-0 glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-white/60 font-medium text-sm">Código</th>
              <th className="p-4 text-white/60 font-medium text-sm">Nome</th>
              <th className="p-4 text-left font-medium text-white/60">Categoria</th>
              <th className="p-4 text-left font-medium text-white/60">Pr. Custo</th>
              <th className="p-4 text-left font-medium text-white/60">Pr. Venda</th>
              <th className="p-4 text-left font-medium text-white/60">Margem (%)</th>
              <th className="p-4 text-left font-medium text-white/60">Lucro Un.</th>
              <th className="p-4 text-left font-medium text-white/60">Qtd. Vendida</th>
              <th className="p-4 text-left font-medium text-white/60">Qtd. Paga</th>
              <th className="p-4 text-left font-medium text-white/60">Qtd. a Receber</th>
              <th className="p-4 text-left font-medium text-white/60">Estoque</th>
              <th className="p-4 text-left font-medium text-white/60">Ações</th>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-effect bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-11/12 max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-black/40 hover:border-emerald-500/40 transition-all duration-300">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white font-jakarta">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={handleCloseModal} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-auto">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Código</label>
                  <input autoFocus required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} onKeyDown={handleCodeKeyDown} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Nome do Produto</label>
                  <input ref={nameInputRef} required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
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
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Estoque Atual</label>
                  <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Estoque Mínimo</label>
                  <input required type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Preço de Custo (R$)</label>
                  <input required type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Preço de Venda (R$)</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Margem (%)</label>
                  <div className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white/60 cursor-not-allowed">
                    {calculateMargin(formData.price, formData.cost_price).toFixed(2)}%
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Lucro Un. Estimado (R$)</label>
                  <div className="w-full bg-black/20 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 font-medium cursor-not-allowed">
                    R$ {(formData.price - formData.cost_price).toFixed(2)}
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="px-6 py-3 mx-6 mt-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                  {saveError}
                </div>
              )}
              
              <div className="p-6 border-t border-white/10 flex justify-end gap-3 mt-auto">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors font-medium">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl text-white bg-primary-600 hover:bg-primary-500 transition-colors font-medium">
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
