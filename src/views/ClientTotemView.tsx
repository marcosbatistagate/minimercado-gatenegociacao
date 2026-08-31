import React, { useState, useMemo, useEffect } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { QrCode, Search, Trash2, Shield, History, X, Eye, EyeOff } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixPayload } from '../utils/pixGenerator';
import { findProductByBarcode } from '../utils/productSearch';
import { CustomerHistoryModal } from '../components/CustomerHistoryModal';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ClientTotemView: React.FC = () => {
  const { currentCustomer, loginCustomer, registerCustomer, cart, addToCartByCode, removeFromCart, completePixSale, completeDebitSale, logoutCustomer, switchInstance, sales, products, pixSettings, settleDebts } = useMarketStore();

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

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

          const product = findProductByBarcode(products, scannedCode);
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
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    // All valid non-cancelled sales for the customer regardless of month cycle (preserves all pending debits)
    const allUserSales = sales.filter(s => s.customerRe === currentCustomer.re && s.status !== 'cancelled');

    let totalPaid = 0;
    let totalDebt = 0;
    let totalMonth = 0;
    let totalThreeMonths = 0;
    const itemsList: any[] = [];

    allUserSales.forEach(s => {
      const saleDate = new Date(s.created_at);
      const saleAmount = s.total_amount;

      // 1. Payment status totals (ALL accumulated pending debits are strictly preserved)
      if (s.payment_status === 'PENDING') {
        totalDebt += saleAmount;
      } else {
        totalPaid += saleAmount;
      }

      // 2. Monthly total - strictly filtered by current civil month (created_at >= primeiro dia do mês)
      if (saleDate >= startOfCurrentMonth) {
        totalMonth += saleAmount;
      }

      // 3. Last 3 months total
      if (saleDate >= ninetyDaysAgo) {
        totalThreeMonths += saleAmount;
      }

      // 4. Products mapping for extrato / history
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
      const product = findProductByBarcode(products, query) || 
                      products.find(p => p.name.toLowerCase().trim().includes(query.toLowerCase()));
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

  const handleOpenAdminModal = () => {
    setAdminPassword('');
    setShowPassword(false);
    setAdminError('');
    setShowAdminModal(true);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'delta0309') {
      setShowAdminModal(false);
      setAdminPassword('');
      setShowPassword(false);
      setAdminError('');
      switchInstance('admin');
    } else {
      setAdminError('Senha incorreta! Tente novamente.');
      playBeep('error');
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
        className="flex flex-col min-h-screen w-full relative overflow-x-hidden bg-black"
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

        <div className="flex-none p-4 sm:p-6 relative z-20 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start text-center sm:text-left gap-3 px-4 sm:px-6 py-3 sm:py-4 w-full max-w-md sm:max-w-xl mx-auto bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg shadow-black/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300">
            <img src="/negociacao.png" alt="Logo Negociação" className="w-10 h-10 sm:w-14 sm:h-14 object-contain mx-auto sm:mx-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white text-center sm:text-left font-jakarta">
              Minimercado Gremio Negociação
            </h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 w-full">
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-8 w-full max-w-md flex flex-col gap-5 sm:gap-6 shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-jakarta mb-2">Autoatendimento</h2>
              <p className="text-sm sm:text-base text-white/80">Identifique-se para começar suas compras</p>
              <p className="text-xs sm:text-sm text-white/60">A Equipe de Negociação agradece</p>
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
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-lg text-white text-center focus:outline-none focus:border-primary-500/50 transition-colors disabled:opacity-50"
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
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-lg text-white text-center focus:outline-none focus:border-primary-500/50 transition-colors"
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
                    className="w-1/3 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all duration-300 mt-2 text-sm sm:text-base"
                  >
                    Voltar
                  </button>
                )}
                <button 
                  type="submit"
                  className={`${showPasswordInput ? 'w-2/3' : 'w-full'} py-3 bg-black/60 border border-violet-500 rounded-xl font-bold text-white hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 mt-2 text-sm sm:text-base`}
                >
                  {showPasswordInput ? 'Confirmar Senha' : 'Acessar Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-3 relative z-10 w-full mt-auto">
          <span className="text-xs text-white/30 font-medium text-center sm:text-left">
            Desenvolvido por: Delta Negociação - 2026
          </span>
          <button 
            onClick={handleOpenAdminModal}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-black/40 border border-white/10 rounded-xl text-white/80 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/20 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300 text-xs sm:text-sm"
          >
            <Shield size={18} />
            <span className="font-medium">Área de Gestão</span>
          </button>
        </div>

        {/* Modal de Acesso à Área de Gestão / Admin */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="glass-effect bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-2xl shadow-black/40 hover:border-violet-500/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Área de Gestão</h2>
                    <p className="text-[11px] sm:text-xs text-white/60">Acesso restrito ao painel administrativo</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAdminModal(false)} 
                  className="text-white/60 hover:text-white transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Senha de Acesso</label>
                  <div className="relative">
                    <input 
                      autoFocus
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={e => {
                        setAdminPassword(e.target.value);
                        setAdminError('');
                      }}
                      placeholder="Digite a senha de administrador" 
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors text-sm sm:text-base"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {adminError && (
                    <p className="text-rose-400 text-sm font-medium">{adminError}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="w-1/3 py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-white hover:bg-white/10 transition-all duration-300 text-sm sm:text-base"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="w-2/3 py-3 bg-black/60 border border-violet-500 rounded-xl font-bold text-white hover:bg-violet-500/20 hover:border-violet-400 hover:shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 text-sm sm:text-base"
                  >
                    Acessar Gestão
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Register Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="glass-effect bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-2xl w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto m-4 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-2xl shadow-black/40 hover:border-emerald-500/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">Primeiro Acesso / Configurar Senha</h2>
                <button onClick={() => setShowRegisterModal(false)} className="text-white/60 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <p className="text-white/80 text-xs sm:text-sm">Configure seu acesso para o RE <strong>{newRe}</strong>.</p>
              <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-white/60 font-medium">Nome Completo</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Nome do Policial" 
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs text-white/60 font-medium">Senha (Mín. 4 dígitos)</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Digite a Senha" 
                    required
                    minLength={4}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50 text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs text-white/60 font-medium">Confirme a Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a Senha" 
                    required
                    minLength={4}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50 text-sm sm:text-base"
                  />
                </div>
                <button type="submit" className="sm:col-span-2 w-full py-3 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 transition-colors mt-2 text-sm sm:text-base">
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
    <div className="flex flex-col min-h-screen w-full bg-slate-900 pb-20 sm:pb-0 overflow-x-hidden">
      {/* Header */}
      <header className="glass-effect bg-white/5 border-b border-white/10 px-4 py-3 md:px-8 md:py-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white font-jakarta truncate">Olá, {currentCustomer.name}</h1>
          <p className="text-xs sm:text-sm text-white/60">RE: {currentCustomer.re}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 ml-auto">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-white/80 hover:text-white transition-all duration-300 text-xs sm:text-sm"
          >
            <History size={16} />
            <span>Extrato / Histórico</span>
          </button>
          <div className="text-right shrink-0 bg-white/5 border border-white/10 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl">
            <p className="text-white/60 text-[10px] sm:text-xs">Total Comprado (Mês)</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-emerald-400">{formatCurrency(userMetrics.totalMonth)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
        {/* Left Column - Scanning and Cart */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-[340px] lg:min-h-0">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={22} />
            <input 
              autoFocus
              type="text" 
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Bipe ou digite o código do produto..." 
              className="w-full bg-white/5 border border-white/20 rounded-2xl py-3.5 sm:py-4 pl-12 pr-4 text-base sm:text-xl text-white placeholder-white/40 focus:outline-none focus:border-primary-500/50 shadow-lg"
            />
          </form>

          <div className="flex-1 glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out min-h-[220px]">
            <div className="p-3.5 sm:p-4 border-b border-white/10">
              <h2 className="font-bold text-white/80 text-sm sm:text-base">Carrinho de Compras</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2 max-h-[380px] lg:max-h-none">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between items-center bg-white/5 border border-white/10 p-2.5 sm:p-3 rounded-xl gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-medium text-sm sm:text-base truncate">{item.product.name}</span>
                    <span className="text-xs sm:text-sm text-white/60">{item.quantity}x {formatCurrency(item.product.price)}</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <span className="text-base sm:text-lg font-bold text-white">{formatCurrency(item.subtotal)}</span>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1.5 sm:p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
                      title="Remover item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-white/40 py-8">
                  <p className="text-sm sm:text-base text-center">Bipe um produto para adicionar ao carrinho</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Totals and PIX */}
        <div className="w-full lg:w-96 lg:max-w-md flex flex-col gap-4 shrink-0 min-w-0">
          <div className="glass-effect bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4 sm:gap-6 flex-1 justify-center shadow-lg shadow-black/20 hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] transition-all duration-300 ease-in-out w-full max-w-sm mx-auto lg:max-w-none">
            <div className="text-center">
              <span className="text-white/60 font-medium text-xs sm:text-sm">Total da Compra</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400 py-1 sm:py-2">
                {formatCurrency(totalCart)}
              </h2>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base sm:text-lg">Pague com PIX</h3>
              <p className="text-white/60 text-xs sm:text-sm">Escaneie o QR Code abaixo</p>
            </div>
            
            <div className="bg-white p-3 sm:p-4 rounded-xl flex items-center justify-center shadow-lg w-full max-w-[220px] sm:max-w-[260px] mx-auto aspect-square">
              {cart.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-2 font-medium">
                  <QrCode size={40} className="mb-2 text-slate-400" />
                  Adicione produtos para gerar o QR Code
                </div>
              ) : !pixSettings || !pixSettings.pix_key ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-rose-500 text-xs text-center p-2 font-medium">
                  <QrCode size={40} className="mb-2 text-rose-300" />
                  Chave PIX não configurada
                </div>
              ) : (
                <QRCodeSVG value={pixPayload} size={isMobile ? 180 : 220} className="max-w-full max-h-full" />
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
            )}
            <button 
              disabled={cart.length === 0}
              onClick={handleFinalize}
              className="w-full py-3.5 sm:py-4 mt-2 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-500 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base sm:text-lg glow border border-transparent"
            >
              Finalizar Compra (PIX Realizado)
            </button>
            <button 
              disabled={cart.length === 0}
              onClick={handleFinalizeDebit}
              className="w-full py-3 sm:py-3.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-500 border border-transparent hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base"
            >
              Pagar Depois (Registrar em Débito)
            </button>
            <button
              onClick={() => logoutCustomer()}
              className="w-full py-2.5 sm:py-3 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.99] transition-all duration-300 text-xs sm:text-sm"
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
      {showHistoryModal && currentCustomer && (
        <CustomerHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          customer={currentCustomer}
          sales={sales}
          onOpenSettleDebtModal={handleOpenSettleDebtModal}
        />
      )}

      {showSettleDebtModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="glass-effect bg-slate-900 border border-white/20 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-white font-jakarta">
                Quitar Débito via PIX
              </h2>
              <button onClick={() => setShowSettleDebtModal(false)} className="text-white/60 hover:text-white transition-colors p-1">
                <X size={22} />
              </button>
            </div>

            <div className="text-center">
              <span className="text-white/60 font-medium text-xs sm:text-sm">Valor do Débito</span>
              <h3 className="text-3xl sm:text-4xl font-bold text-rose-400 py-1">
                {formatCurrency(userMetrics.totalDebt)}
              </h3>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-xl flex items-center justify-center shadow-lg self-center max-w-[200px] sm:max-w-[240px]">
              <QRCodeSVG value={settleDebtPayload} size={isMobile ? 160 : 200} />
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
              className="w-full py-3 sm:py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.99] transition-all duration-300 text-sm sm:text-base"
            >
              Confirmar Pagamento Realizado
            </button>
            <button
              onClick={() => setShowSettleDebtModal(false)}
              className="w-full py-2 sm:py-2.5 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/10 active:scale-[0.99] transition-all duration-300 text-xs sm:text-sm"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-lg font-bold text-white text-xs sm:text-sm transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 border border-emerald-400' : 'bg-rose-600 border border-rose-400'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
