import React, { useState, useMemo, useEffect } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { QrCode, Search, Trash2, Shield, X } from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ClientTotemView: React.FC = () => {
  const { 
    currentCustomer, 
    customers, 
    loginCustomer, 
    registerCustomer, 
    switchInstance,
    sales,
    cart,
    addToCartByCode,
    removeFromCart,
    completePixSale,
    logoutCustomer
  } = useMarketStore();

  const [reInput, setReInput] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newRe, setNewRe] = useState('');
  const [newName, setNewName] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');

  const totalCart = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  const currentMonthTotal = useMemo(() => {
    if (!currentCustomer) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return sales
      .filter(s => {
        if (s.customerRe !== currentCustomer.re || s.status !== 'completed') return false;
        const d = new Date(s.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, s) => sum + s.total_amount, 0);
  }, [sales, currentCustomer]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reInput.trim()) return;
    
    const exists = customers.some(c => c.re === reInput);
    if (exists) {
      loginCustomer(reInput);
    } else {
      setNewRe(reInput);
      setNewName('');
      setShowRegisterModal(true);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRe && newName) {
      registerCustomer(newRe, newName);
      loginCustomer(newRe);
      setShowRegisterModal(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      addToCartByCode(barcodeInput.trim());
      setBarcodeInput('');
    }
  };

  const handleAdminAccess = () => {
    const password = prompt('Digite a senha administrativa:');
    if (password === 'admin') {
      switchInstance('admin');
    } else if (password !== null) {
      alert('Senha incorreta!');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4' && currentCustomer && cart.length > 0) {
        e.preventDefault();
        completePixSale();
        logoutCustomer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCustomer, cart, completePixSale, logoutCustomer]);

  const handleFinalize = () => {
    if (cart.length > 0) {
      completePixSale();
      logoutCustomer();
    }
  };

  if (!currentCustomer) {
    return (
      <div 
        className="flex flex-col min-h-screen relative overflow-hidden bg-black"
        style={{
          backgroundImage: 'url(/mobile.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Degradê preto nas bordas (Vignette) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>
        {/* Degradê extra na parte inferior para garantir contraste */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>

        <div className="flex-none p-6 sm:p-8 relative z-20">
          <div className="inline-flex items-center gap-5 glass-effect bg-slate-900/40 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-3xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300">
            <img src="/negociacao.png" alt="Logo Negociação" className="h-12 sm:h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 font-jakarta drop-shadow-md pr-2">
              Minimercado Gremio Negociação
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <div className="glass-effect bg-slate-900/50 backdrop-blur-md border border-white/20 rounded-3xl p-8 max-w-md w-full flex flex-col gap-6 shadow-2xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white font-jakarta mb-2">Autoatendimento</h2>
              <p className="text-white/80">Identifique-se para começar suas compras</p>
            </div>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Número de Registro (RE)</label>
                <input 
                  autoFocus
                  type="text" 
                  value={reInput} 
                  onChange={e => setReInput(e.target.value)}
                  placeholder="Digite seu RE" 
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-lg text-white text-center focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-black/60 border border-violet-500 rounded-xl font-bold text-white hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.5),inset_0_0_15px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300 mt-2"
              >
                Acessar Terminal
              </button>
            </form>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex justify-end relative z-10">
          <button 
            onClick={handleAdminAccess}
            className="flex items-center gap-2 px-5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white/80 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300"
          >
            <Shield size={18} />
            <span className="font-medium">Área de Gestão</span>
          </button>
        </div>

        {/* Register Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-effect bg-white/10 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden flex flex-col p-6 gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white font-jakarta">Primeiro Acesso</h2>
                <button onClick={() => setShowRegisterModal(false)} className="text-white/60 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <p className="text-white/80 text-sm">Seu RE ({newRe}) não foi encontrado. Por favor, informe seu nome para cadastro.</p>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <input 
                  autoFocus
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome Completo" 
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
                />
                <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 transition-colors">
                  Cadastrar e Acessar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="glass-effect bg-white/5 border-b border-white/10 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-jakarta">Olá, {currentCustomer.name}</h1>
          <p className="text-white/60">RE: {currentCustomer.re}</p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-sm">Total Comprado (Mês)</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(currentMonthTotal)}</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
        {/* Left Column - Scanning and Cart */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={24} />
            <input 
              autoFocus
              type="text" 
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Bipe ou digite o código do produto..." 
              className="w-full bg-white/5 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 shadow-lg"
            />
          </form>

          <div className="flex-1 glass-effect bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-bold text-white/80">Carrinho de Compras</h2>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">{item.product.name}</span>
                    <span className="text-sm text-white/60">{item.quantity}x {formatCurrency(item.product.price)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-white">{formatCurrency(item.subtotal)}</span>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-white/40">
                  <p>Bipe um produto para adicionar ao carrinho</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Totals and PIX */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-2">
            <span className="text-white/60 font-medium">Total da Compra</span>
            <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400 py-2">
              {formatCurrency(totalCart)}
            </span>
          </div>

          <div className="glass-effect bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-6 flex-1 justify-center">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-lg">Pague com PIX</h3>
              <p className="text-white/60 text-sm">Escaneie o QR barcode abaixo</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl flex items-center justify-center">
              <QrCode size={180} className="text-black" />
            </div>



            <button 
              disabled={cart.length === 0}
              onClick={handleFinalize}
              className="w-full py-4 mt-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg glow"
            >
              Finalizar Pagamento [F4]
            </button>
            <button
              onClick={() => logoutCustomer()}
              className="w-full py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancelar e Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
