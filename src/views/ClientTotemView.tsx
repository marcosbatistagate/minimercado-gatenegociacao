import React, { useState, useMemo, useEffect } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { QrCode, Search, Trash2, Shield, History, X } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload } from '../utils/pixGenerator';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ClientTotemView: React.FC = () => {
  const { currentCustomer, loginCustomer, registerCustomer, cart, addToCartByCode, removeFromCart, completePixSale, completeDebitSale, logoutCustomer, switchInstance, sales, currentCycleStart, products, pixSettings, settleDebts } = useMarketStore();

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showSettleDebtModal, setShowSettleDebtModal] = useState(false);
  const [settleDebtPayload, setSettleDebtPayload] = useState('');

  const handleOpenSettleDebtModal = () => {
    if (!pixSettings || !pixSettings.pix_key) {
      alert('Chave PIX não configurada no sistema. Por favor, contate o administrador.');
      return;
    }
    const payload = generatePixPayload(pixSettings.pix_key, pixSettings.merchant_name, pixSettings.merchant_city, userMetrics.totalDebt);
    setSettleDebtPayload(payload);
    setShowSettleDebtModal(true);
  };

  const handleConfirmSettleDebt = async () => {
    if (!currentCustomer) return;
    const success = await settleDebts(currentCustomer.re);
    if (success) {
      setToast({ message: 'Débito quitado com sucesso!', type: 'success' });
      playBeep('success');
      setShowSettleDebtModal(false);
    } else {
      setToast({ message: 'Erro ao processar quitação do débito.', type: 'error' });
      playBeep('error');
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('AudioContext error:', e);
    }
  };

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!currentCustomer) return;

      const now = Date.now();
      const isFast = now - lastKeyTime < 100;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length > 0 && isFast) {
          e.preventDefault();
          const scannedCode = buffer;
          buffer = '';

          const product = products.find(p => p.code.trim() === scannedCode.trim());
          if (product) {
            if (product.stock <= 0) {
              setToast({ message: 'Produto fora de estoque!', type: 'error' });
              playBeep('error');
            } else {
              addToCartByCode(product.code);
              setToast({ message: `${product.name} adicionado ao carrinho!`, type: 'success' });
              playBeep('success');
            }
          } else {
            setToast({ message: 'Produto não cadastrado', type: 'error' });
            playBeep('error');
          }
        } else {
          buffer = '';
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        if (isFast || buffer === '') {
          buffer += e.key;
        } else {
          buffer = e.key;
        }
      } else {
        buffer = '';
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [currentCustomer, products, addToCartByCode]);

  const totalCart = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  const pixPayload = useMemo(() => {
    if (!pixSettings || !pixSettings.pix_key) return '';
    return generatePixPayload(pixSettings.pix_key, pixSettings.merchant_name, pixSettings.merchant_city, totalCart);
  }, [pixSettings, totalCart]);

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
    const query = barcodeInput.trim();
    if (query) {
      const product = products.find(p => p.code.trim() === query);
      if (product) {
        if (product.stock <= 0) {
          setToast({ message: 'Produto fora de estoque!', type: 'error' });
          playBeep('error');
        } else {
          addToCartByCode(product.code);
          setToast({ message: `${product.name} adicionado ao carrinho!`, type: 'success' });
          playBeep('success');
        }
      } else {
        setToast({ message: 'Produto não cadastrado', type: 'error' });
        playBeep('error');
      }
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
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'F4' && currentCustomer && cart.length > 0) {
        e.preventDefault();
        const success = await completePixSale();
        if (success) {
          setToast({ message: 'Venda registrada com sucesso!', type: 'success' });
          playBeep('success');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCustomer, cart, completePixSale]);

  const handleFinalizeDebit = async () => {
    if (cart.length > 0) {
      const success = await completeDebitSale();
      if (success) {
        setToast({ message: 'Venda registrada com sucesso!', type: 'success' });
        playBeep('success');
      }
    }
  };

  const handleFinalize = async () => {
    if (cart.length > 0) {
      const success = await completePixSale();
      if (success) {
        setToast({ message: 'Venda registrada com sucesso!', type: 'success' });
        playBeep('success');
      }
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

        <div className="flex-none p-4 sm:p-6 relative z-20">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start text-center sm:text-left gap-3 px-6 py-4 w-full max-w-md sm:max-w-xl mx-auto bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg shadow-black/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
            <img src="/negociacao.png" alt="Logo Negociação" className="w-12 h-12 sm:w-14 sm:h-14 object-contain mx-auto sm:mx-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white text-center sm:text-left font-jakarta">
              Minimercado Gremio Negociação
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative z-10">
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 w-11/12 max-w-md flex flex-col gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
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
                  className={`${showPasswordInput ? 'w-2/3' : 'w-full'} py-3 bg-black/60 border border-violet-500 rounded-xl font-bold text-white hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 mt-2`}
                >
                  {showPasswordInput ? 'Confirmar Senha' : 'Acessar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex justify-between items-center relative z-10 w-full mt-auto">
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
            <div className="glass-effect bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl w-11/12 max-w-md overflow-hidden flex flex-col p-6 gap-6 shadow-2xl shadow-black/40 hover:border-emerald-500/40 transition-all duration-300">
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
    <div className="flex flex-col min-h-screen bg-slate-900 pb-20 sm:pb-0">
      {/* Header */}
      <header className="glass-effect bg-white/5 border-b border-white/10 px-4 py-3 md:px-8 md:py-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-jakarta">Olá, {currentCustomer.name}</h1>
          <p className="text-sm text-white/60">RE: {currentCustomer.re}</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-white/80 hover:text-white transition-all duration-300 text-xs md:text-sm"
          >
            <History size={16} />
            <span>Extrato / Histórico</span>
          </button>
          <div className="text-right shrink-0">
            <p className="text-white/60 text-[10px] md:text-sm">Total Comprado (Mês)</p>
            <p className="text-base md:text-xl font-bold text-emerald-400">{formatCurrency(userMetrics.totalMonth)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-auto lg:overflow-hidden">
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

          <div className="flex-1 glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
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
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-6 flex-1 justify-center shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
            <div className="text-center">
              <span className="text-white/60 font-medium text-sm">Total da Compra</span>
              <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400 py-2">
                {formatCurrency(totalCart)}
              </h2>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-lg">Pague com PIX</h3>
              <p className="text-white/60 text-sm">Escaneie o QR Code abaixo</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl flex items-center justify-center shadow-lg">
              {cart.length === 0 ? (
                <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-slate-500 text-xs text-center p-2 font-medium">
                  <QrCode size={48} className="mb-3 text-slate-400" />
                  Adicione produtos para gerar o QR Code
                </div>
              ) : !pixSettings || !pixSettings.pix_key ? (
                <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-rose-500 text-xs text-center p-2 font-medium">
                  <QrCode size={48} className="mb-3 text-rose-300" />
                  Chave PIX não configurada
                </div>
              ) : (
                <QRCodeSVG value={pixPayload} size={220} />
              )}
            </div>
            {cart.length > 0 && pixPayload && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixPayload);
                  setToast({ message: 'Código PIX Copia e Cola copiado!', type: 'success' });
                  playBeep('success');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1.5 -mt-2 transition-all"
              >
                Copiar código PIX (Copia e Cola)
              </button>
            )}            <button 
              disabled={cart.length === 0}
              onClick={handleFinalize}
              className="w-full py-4 mt-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-lg glow border border-transparent"
            >
              Finalizar Compra (PIX Realizado)
            </button>
            <button 
              disabled={cart.length === 0}
              onClick={handleFinalizeDebit}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 border border-transparent hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base"
            >
              Pagar Depois (Registrar em Débito)
            </button>
            <button
              onClick={() => logoutCustomer()}
              className="w-full py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.99] transition-all duration-300"
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
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-11/12 max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
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
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-white/60 font-medium">Total em Débito</span>
                    <span className="text-lg font-bold text-rose-400">{formatCurrency(userMetrics.totalDebt)}</span>
                  </div>
                  {userMetrics.totalDebt > 0 ? (
                    <button
                      onClick={handleOpenSettleDebtModal}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 px-3 rounded-lg text-[10px] md:text-xs transition-all mt-1"
                    >
                      Quitar Débito via PIX
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mt-1 self-start">
                      Em Dia
                    </span>
                  )}
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
                <div className="overflow-x-auto -mx-4 sm:mx-0 border border-white/10 rounded-xl">
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
      {showSettleDebtModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-11/12 max-w-md overflow-hidden flex flex-col shadow-2xl shadow-black/60 p-6 gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white font-jakarta">
                Quitar Débito via PIX
              </h2>
              <button onClick={() => setShowSettleDebtModal(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="text-center">
              <span className="text-white/60 font-medium text-sm">Valor do Débito</span>
              <h3 className="text-4xl font-bold text-rose-400 py-1">
                {formatCurrency(userMetrics.totalDebt)}
              </h3>
            </div>

            <div className="bg-white p-4 rounded-xl flex items-center justify-center shadow-lg self-center">
              <QRCodeSVG value={settleDebtPayload} size={200} />
            </div>

            {settleDebtPayload && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(settleDebtPayload);
                  setToast({ message: 'Código PIX Copia e Cola copiado!', type: 'success' });
                  playBeep('success');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1.5 justify-center transition-all"
              >
                Copiar código PIX (Copia e Cola)
              </button>
            )}

            <button
              onClick={handleConfirmSettleDebt}
              className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.99] transition-all duration-300 text-base"
            >
              Confirmar Pagamento Realizado
            </button>
            <button
              onClick={() => setShowSettleDebtModal(false)}
              className="w-full py-2.5 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.99] transition-all duration-300 text-sm"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg font-bold text-white transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 border border-emerald-400' : 'bg-rose-600 border border-rose-400'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
