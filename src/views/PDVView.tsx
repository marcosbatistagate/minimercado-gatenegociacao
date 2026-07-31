import { useEffect, useRef, useState } from 'react';
import { Barcode, Search, Plus, Minus, Trash2, CreditCard, Banknote, Landmark } from 'lucide-react';
import { useMarketStore } from '../store/useMarketStore';
import { FadeIn } from '../components/ui/FadeIn';

export function PDVView() {
  const { cart, addToCartByCode, updateQuantity, removeFromCart, paymentMethod, setPaymentMethod, receivedAmount, setReceivedAmount, checkout } = useMarketStore();
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const change = receivedAmount > total ? receivedAmount - total : 0;

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      addToCartByCode(searchInput.trim());
      setSearchInput('');
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Coluna Esquerda: Produtos */}
      <div className="flex-1 flex flex-col gap-6">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/50">
            <Barcode size={24} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Código ou nome do produto [F2]"
            className="w-full bg-black/20 border border-white/10 focus:border-violet-500/50 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/30 font-mono text-lg outline-none transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] focus:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          />
        </form>

        <div className="flex-1 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(0,0,0,0.1)]">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 text-white/60 font-inter text-sm font-medium uppercase tracking-wider">
            <div className="col-span-1">Cod</div>
            <div className="col-span-5">Produto</div>
            <div className="col-span-2 text-center">Qtd</div>
            <div className="col-span-2 text-right">Preço</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="font-inter">Nenhum produto adicionado</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <FadeIn key={item.product.id} delay={index < 3 ? `${(index + 1) * 100}` as any : '300'}>
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl items-center transition-colors border border-transparent hover:border-white/5">
                    <div className="col-span-1 font-mono text-white/60">{item.product.code}</div>
                    <div className="col-span-5 font-inter font-medium truncate">{item.product.name}</div>
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors active:scale-95">
                        <Minus size={14} />
                      </button>
                      <span className="font-mono w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 bg-white/5 hover:bg-white/10 rounded text-white/60 hover:text-white transition-colors active:scale-95">
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="col-span-2 text-right font-mono text-white/80">
                      {item.product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <span className="font-mono font-medium">
                        {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-400/60 hover:text-red-400 p-1.5 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </FadeIn>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Checkout */}
      <div className="w-[380px] flex flex-col gap-6">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.1)]">
          <span className="text-white/60 font-inter font-medium uppercase tracking-widest text-sm mb-2">Total a Pagar</span>
          <div className="text-5xl font-jakarta font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] price-value gradient-text tracking-tight">
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 flex-1 flex flex-col">
          <h3 className="font-inter font-medium text-white/80 mb-4">Forma de Pagamento</h3>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => setPaymentMethod('money')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 ${paymentMethod === 'money' ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
            >
              <Banknote size={24} className={paymentMethod === 'money' ? 'text-violet-400' : 'text-white/60'} />
              <span className="font-inter text-sm">Dinheiro</span>
            </button>
            <button 
              onClick={() => setPaymentMethod('pix')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 ${paymentMethod === 'pix' ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
            >
              <Landmark size={24} className={paymentMethod === 'pix' ? 'text-violet-400' : 'text-white/60'} />
              <span className="font-inter text-sm">PIX</span>
            </button>
            <button 
              onClick={() => setPaymentMethod('credit_card')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 ${paymentMethod === 'credit_card' ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
            >
              <CreditCard size={24} className={paymentMethod === 'credit_card' ? 'text-violet-400' : 'text-white/60'} />
              <span className="font-inter text-sm">Crédito</span>
            </button>
            <button 
              onClick={() => setPaymentMethod('debit_card')}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 ${paymentMethod === 'debit_card' ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
            >
              <CreditCard size={24} className={paymentMethod === 'debit_card' ? 'text-violet-400' : 'text-white/60'} />
              <span className="font-inter text-sm">Débito</span>
            </button>
          </div>

          {paymentMethod === 'money' && (
            <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div>
                <label className="text-white/60 text-sm font-inter mb-1 block">Valor Recebido</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-mono">R$</span>
                  <input 
                    type="number" 
                    value={receivedAmount || ''}
                    onChange={(e) => setReceivedAmount(Number(e.target.value))}
                    className="w-full bg-black/20 border border-white/10 focus:border-violet-500/50 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-lg outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-black/30 rounded-xl border border-white/5">
                <span className="text-white/60 font-inter">Troco</span>
                <span className={`font-mono text-xl font-medium ${change > 0 ? 'text-emerald-400' : 'text-white/80'}`}>
                  {change.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <button 
              onClick={checkout}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl font-jakarta font-bold text-lg text-white bg-black/60 border border-violet-500 hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_35px_rgba(139,92,246,0.6),inset_0_0_20px_rgba(139,92,246,0.4)] hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none shadow-[0_0_20px_rgba(139,92,246,0.5),inset_0_0_10px_rgba(139,92,246,0.2)] flex items-center justify-center gap-2 group"
            >
              <span className="group-hover:text-white transition-colors">Finalizar Venda</span>
              <span className="bg-white/20 text-white/90 text-xs px-2 py-0.5 rounded-md ml-2 font-mono border border-white/10 backdrop-blur-md">F4</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
