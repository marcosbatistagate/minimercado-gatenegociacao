import React, { useState, useMemo, useEffect } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { QrCode, Search, Trash2, Shield, History, X } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ClientTotemView: React.FC = () => {
  const { currentCustomer, loginCustomer, registerCustomer, cart, addToCartByCode, removeFromCart, completePixSale, completeDebitSale, logoutCustomer, switchInstance, sales, currentCycleStart } = useMarketStore();

  const [reInput, setReInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [newRe, setNewRe] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  const totalCart = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  // User Specific Metrics
  const userMetrics = useMemo(() => {
    if (!currentCustomer) return { totalPaid: 0, totalDebt: 0, totalMonth: 0, totalThreeMonths: 0, itemsList: [] as any[] };
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const cycleStart = new Date(currentCycleStart);
    const userSales = sales.filter(s => s.customerRe === currentCustomer.re && s.status === 'completed' && new Date(s.created_at) >= cycleStart);

    let totalPaid = 0;
    let totalDebt = 0;
    let totalMonth = 0;
    let totalThreeMonths = 0;
    const itemsList: any[] = [];

    userSales.forEach(s => {
      const saleDate = new Date(s.created_at);
      const saleAmount = s.total_amount;

      // 1. Payment status totals
      if (s.payment_status === 'PENDING') {
        totalDebt += saleAmount;
      } else {
        totalPaid += saleAmount;
      }

      // 2. Monthly total
      if (saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear) {
        totalMonth += saleAmount;
      }

      // 3. Last 3 months total
      if (saleDate >= ninetyDaysAgo) {
        totalThreeMonths += saleAmount;
      }

      // 4. Products mapping
      s.items.forEach(item => {
        itemsList.push({
          date: s.created_at,
          productName: item.product.name,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          paymentStatus: s.payment_status
        });
      });
    });

    // Sort products history by date descending
    itemsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { totalPaid, totalDebt, totalMonth, totalThreeMonths, itemsList };
  }, [sales, currentCustomer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (reInput.trim().length >= 1) {
      // First check if customer exists to know if we need password or first registration
      const existing = await supabaseService.fetchCustomerByRe(reInput.trim());

      if (!existing) {
        // No client found -> First access register
        setNewRe(reInput);
        setNewName('');
        setNewPassword('');
        setConfirmPassword('');
        setShowRegisterModal(true);
        setShowPasswordInput(false);
      } else if (!existing.password) {
        // Client exists but has no password set yet (e.g. legacy data) -> Register password
        setNewRe(reInput);
        setNewName(existing.name);
        setNewPassword('');
        setConfirmPassword('');
        setShowRegisterModal(true);
        setShowPasswordInput(false);
      } else {
        // Client has password -> Prompt password field if not shown yet
        if (!showPasswordInput) {
          setShowPasswordInput(true);
          setPasswordInput('');
        } else {
          const logged = await loginCustomer(reInput, passwordInput);
          if (logged) {
            setReInput('');
            setPasswordInput('');
            setShowPasswordInput(false);
            setLoginError('');
          } else {
            setLoginError('Senha incorreta. Tente novamente.');
          }
        }
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      alert('A senha deve ter no mínimo 4 dígitos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem!');
      return;
    }

    if (newRe && newName) {
      try {
        const registered = await registerCustomer(newRe, newName, newPassword);
        if (registered) {
          await loginCustomer(newRe, newPassword);
          setShowRegisterModal(false);
        }
      } catch (err) {
        // Error already alerted in registerCustomer, do not close modal or log in
      }
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

  const handleFinalizeDebit = async () => {
    if (cart.length > 0) {
      await completeDebitSale();
      logoutCustomer();
    }
  };

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
          backgroundImage: 'url(/bg.png)',
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
              <p className="text-white/80">A Equipe de Negociação agradece</p>
            </div>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/80">Número de Registro (RE)</label>
                <input 
                  autoFocus
                  disabled={showPasswordInput}
                  type="text" 
                  value={reInput} 
                  onChange={e => {
                    setReInput(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="Digite seu RE" 
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-lg text-white text-center focus:outline-none focus:border-primary-500/50 transition-colors disabled:opacity-50"
                />
              </div>

              {showPasswordInput && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Senha de Acesso</label>
                  <input 
                    autoFocus
                    type="password" 
                    value={passwordInput} 
                    onChange={e => {
                      setPasswordInput(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Digite sua senha" 
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-lg text-white text-center focus:outline-none focus:border-primary-500/50 transition-colors"
                  />
                </div>
              )}

              {loginError && (
                <p className="text-rose-400 text-sm text-center font-medium">{loginError}</p>
              )}

              <div className="flex gap-2">
                {showPasswordInput && (
                  <button 
                    type="button"
                    onClick={() => {
                      setShowPasswordInput(false);
                      setLoginError('');
                    }}
                    className="w-1/3 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all duration-300 mt-2"
                  >
                    Voltar
                  </button>
                )}
                <button 
                  type="submit"
                  className={`${showPasswordInput ? 'w-2/3' : 'w-full'} py-3 bg-black/60 border border-violet-500 rounded-xl font-bold text-white hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.5),inset_0_0_15px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300 mt-2`}
                >
                  {showPasswordInput ? 'Confirmar Senha' : 'Acessar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex justify-between items-center relative z-10 w-full mt-auto">
          <span className="text-xs text-white/30 font-medium">
            Desenvolvido por: Delta Negociação - 2026
          </span>
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
            <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md overflow-hidden flex flex-col p-6 gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white font-jakarta">Primeiro Acesso / Configurar Senha</h2>
                <button onClick={() => setShowRegisterModal(false)} className="text-white/60 hover:text-white">
                  <span className="text-xl">X</span>
                </button>
              </div>
              <p className="text-white/80 text-sm">Configure seu acesso para o RE <strong>{newRe}</strong>.</p>
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Nome Completo</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nome do Policial" 
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Senha de Acesso (Mínimo 4 dígitos)</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Digite a Senha" 
                    required
                    minLength={4}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Confirme a Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a Senha" 
                    required
                    minLength={4}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 transition-colors mt-2">
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
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-white/80 hover:text-white transition-all duration-300"
          >
            <History size={18} />
            <span>Extrato / Histórico</span>
          </button>
          <div className="text-right">
            <p className="text-white/60 text-sm">Total Comprado (Mês)</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(userMetrics.totalMonth)}</p>
          </div>
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
            </div>            <button 
              disabled={cart.length === 0}
              onClick={handleFinalize}
              className="w-full py-4 mt-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg glow"
            >
              Pagar com PIX [F4]
            </button>
            <button 
              disabled={cart.length === 0}
              onClick={handleFinalizeDebit}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            >
              Pagar Depois (Registrar em Débito)
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
      <footer className="text-center py-4 text-xs text-white/30 font-medium w-full">
        Desenvolvido por: Delta Negociação - 2026
      </footer>

      {/* History and Dashboard Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-bold text-white font-jakarta">
                  Extrato e Histórico de Compras
                </h2>
                <p className="text-sm text-white/60">RE: {currentCustomer.re} | {currentCustomer.name}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1 flex flex-col gap-6">
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-white/60 font-medium">Total Pago</span>
                  <span className="text-lg font-bold text-emerald-400">{formatCurrency(userMetrics.totalPaid)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-white/60 font-medium">Total em Débito</span>
                  <span className="text-lg font-bold text-rose-400">{formatCurrency(userMetrics.totalDebt)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-white/60 font-medium">Total do Mês</span>
                  <span className="text-lg font-bold text-slate-300">{formatCurrency(userMetrics.totalMonth)}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-white/60 font-medium">Últimos 3 Meses</span>
                  <span className="text-lg font-bold text-white">{formatCurrency(userMetrics.totalThreeMonths)}</span>
                </div>
              </div>

              {/* History Table */}
              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-white text-lg">Produtos Adquiridos</h3>
                <div className="overflow-x-auto border border-white/10 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-xs text-white/60 font-semibold uppercase">
                        <th className="p-3">Data/Hora</th>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-right">Valor Unitário</th>
                        <th className="p-3 text-center">Qtd.</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {userMetrics.itemsList.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white/80">
                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date))}
                          </td>
                          <td className="p-3 text-white font-medium">{item.productName}</td>
                          <td className="p-3 text-white/80 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3 text-white/80 text-center">{item.quantity}</td>
                          <td className="p-3 text-white font-semibold text-right">{formatCurrency(item.subtotal)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              item.paymentStatus === 'PENDING' 
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {item.paymentStatus === 'PENDING' ? 'Em Débito' : 'Pago'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {userMetrics.itemsList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-white/50">
                            Nenhum produto adquirido ainda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/10 flex justify-end bg-black/20">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
