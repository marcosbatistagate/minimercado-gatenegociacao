import React, { useState, useMemo, useRef } from 'react';
import { useMarketStore, type Product } from '../store/useMarketStore';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useMarketStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Modal form state
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    barcode: '',
    name: '',
    category: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    minStock: 0,
  });

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (product) {
      setEditingProduct(product);
      setFormData({
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        costPrice: product.costPrice,
        price: product.price,
        stock: product.stock,
        minStock: product.minStock,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        barcode: '',
        name: '',
        category: '',
        costPrice: 0,
        price: 0,
        stock: 0,
        minStock: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }
    handleCloseModal();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white font-jakarta">Gestão de Estoque</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-primary-300 font-medium glow bg-primary-500/30 hover:bg-primary-500/40 transition-colors"
        >
          <Plus size={20} />
          Novo Produto
        </button>
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
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-primary-500/50 appearance-none min-w-[200px]"
        >
          <option value="">Todas Categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-auto glass-effect bg-white/5 border border-white/10 rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-white/60 font-medium text-sm">Código</th>
              <th className="p-4 text-white/60 font-medium text-sm">Nome</th>
              <th className="p-4 text-white/60 font-medium text-sm">Categoria</th>
              <th className="p-4 text-white/60 font-medium text-sm">Pr. Custo</th>
              <th className="p-4 text-white/60 font-medium text-sm">Pr. Venda</th>
              <th className="p-4 text-white/60 font-medium text-sm">Margem (%)</th>
              <th className="p-4 text-white/60 font-medium text-sm">Estoque</th>
              <th className="p-4 text-white/60 font-medium text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const margin = calculateMargin(product.price, product.costPrice);
              return (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white/80">{product.barcode}</td>
                  <td className="p-4 text-white font-medium">{product.name}</td>
                  <td className="p-4 text-white/80">{product.category}</td>
                  <td className="p-4 text-white/80">R$ {product.costPrice.toFixed(2)}</td>
                  <td className="p-4 text-white/80">R$ {product.price.toFixed(2)}</td>
                  <td className="p-4 text-white/80">{margin.toFixed(2)}%</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStockBadgeClass(product.stock, product.minStock)}`}>
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
                <td colSpan={8} className="p-8 text-center text-white/50">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-effect bg-white/10 border border-white/20 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                  <input autoFocus required type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} onKeyDown={handleCodeKeyDown} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Nome do Produto</label>
                  <input ref={nameInputRef} required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Categoria</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Estoque Atual</label>
                  <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Estoque Mínimo</label>
                  <input required type="number" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Preço de Custo (R$)</label>
                  <input required type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Preço de Venda (R$)</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-500/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-white/60">Margem (%)</label>
                  <div className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white/60 cursor-not-allowed">
                    {calculateMargin(formData.price, formData.costPrice).toFixed(2)}%
                  </div>
                </div>
              </div>
              
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
