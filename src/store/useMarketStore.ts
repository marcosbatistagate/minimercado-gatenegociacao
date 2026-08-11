import { create } from 'zustand';
import type { UserCustomer } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  category: string;
  categoryId?: string;
  cost_price: number;
  stock: number;
  min_stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = 'money' | 'credit_card' | 'debit_card' | 'pix' | 'DEBIT' | null;

export interface Sale {
  id: string;
  created_at: string;
  payment_method: PaymentMethod;
  total_amount: number;
  status: 'completed' | 'cancelled';
  items: CartItem[];
  customerRe?: string;
  payment_status: 'PAID' | 'PENDING';
}

interface MarketState {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  paymentMethod: PaymentMethod;
  receivedAmount: number;
  currentCustomer: UserCustomer | null;
  customers: UserCustomer[];
  dbCategories: {id: string, name: string}[];
  activeInstance: 'client' | 'admin';
  stockAudits: { id: string, created_at: string, product_id?: string, product_name: string, real_stock: number, expected_stock: number }[];
  currentCycleStart: string;
  lastStockUpdate: string;
  initData: () => Promise<void>;
  addToCartByCode: (codeOrName: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setReceivedAmount: (amount: number) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>, categoryId?: string) => Promise<void>;
  updateProduct: (id: string, updatedProduct: Partial<Product>, categoryId?: string) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  registerCustomer: (re: string, name: string, password?: string) => Promise<boolean>;
  loginCustomer: (re: string, password?: string) => Promise<boolean>;
  logoutCustomer: () => void;
  switchInstance: (instance: 'client' | 'admin') => void;
  completePixSale: () => Promise<void>;
  completeDebitSale: () => Promise<void>;
  settleDebts: (customerRe: string) => Promise<void>;
  addStockAudit: (productId: string, productName: string, expectedStock: number, realStock: number) => Promise<void>;
  startNewMonth: () => void;
  updateStockTimestamp: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  products: [],
  cart: [],
  sales: [],
  paymentMethod: null,
  receivedAmount: 0,
  currentCustomer: null,
  customers: [],
  dbCategories: [],
  activeInstance: 'client',
  stockAudits: [],
  currentCycleStart: localStorage.getItem('current_cycle_start') || (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    const iso = d.toISOString();
    localStorage.setItem('current_cycle_start', iso);
    return iso;
  })(),
  lastStockUpdate: localStorage.getItem('last_stock_update') || (() => {
    const iso = new Date().toISOString();
    localStorage.setItem('last_stock_update', iso);
    return iso;
  })(),

  initData: async () => {
    try {
      const [fetchedProducts, fetchedCustomers, fetchedCategories, fetchedSales, fetchedAudits] = await Promise.all([
        supabaseService.fetchProducts(),
        supabaseService.fetchCustomers(),
        supabaseService.fetchCategories(),
        supabaseService.fetchSales(),
        supabaseService.fetchStockAudits()
      ]);
      
      set({ 
        products: fetchedProducts, 
        customers: fetchedCustomers,
        dbCategories: fetchedCategories,
        sales: fetchedSales,
        stockAudits: fetchedAudits
      });

      // Setup Realtime for products
      supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
          // Quando houver mudança na tabela products, buscamos novamente para atualizar o estado
          const updatedProducts = await supabaseService.fetchProducts();
          set({ products: updatedProducts });
          get().updateStockTimestamp();
        })
        .subscribe();
        
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  },

  addToCartByCode: (codeOrName) => {
    const state = get();
    const product = state.products.find(
      p => p.code === codeOrName || p.name.toLowerCase() === codeOrName.toLowerCase()
    );

    if (product) {
      if (product.stock <= 0) {
        alert('Produto fora de estoque!');
        return;
      }
      
      const existingItem = state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          alert('Quantidade máxima em estoque atingida!');
          return;
        }
        
        set({
          cart: state.cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.product.price }
              : item
          )
        });
      } else {
        set({
          cart: [...state.cart, { product, quantity: 1, subtotal: product.price }]
        });
      }
    }
  },

  updateQuantity: (productId, delta) => {
    const state = get();
    set({
      cart: state.cart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(1, Math.min(item.quantity + delta, item.product.stock));
          return { ...item, quantity: newQuantity, subtotal: newQuantity * item.product.price };
        }
        return item;
      })
    });
  },

  removeFromCart: (productId) => {
    set(state => ({
      cart: state.cart.filter(item => item.product.id !== productId)
    }));
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setReceivedAmount: (amount) => set({ receivedAmount: amount }),

  clearCart: () => set({ cart: [], paymentMethod: null, receivedAmount: 0 }),

  checkout: async () => {
    const state = get();
    if (state.cart.length === 0 || !state.paymentMethod) {
      alert('Carrinho vazio ou método de pagamento não selecionado!');
      return;
    }
    
    const total_amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    try {
      const saleId = await supabaseService.createSale(
        total_amount,
        state.paymentMethod,
        state.currentCustomer?.re,
        state.cart
      );
      
      const newSale: Sale = {
        id: saleId || Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        payment_method: state.paymentMethod,
        total_amount,
        status: 'completed',
        items: [...state.cart],
        customerRe: state.currentCustomer?.re,
        payment_status: 'PAID'
      };

      set({
        sales: [newSale, ...state.sales],
        cart: [],
        paymentMethod: null,
        receivedAmount: 0
      });
      
      alert('Venda finalizada com sucesso!');
    } catch (err) {
      alert('Erro ao finalizar venda.');
    }
  },

  addProduct: async (product, categoryId) => {
    try {
      const saved = await supabaseService.saveProduct(product, categoryId);
      if (saved) {
        const state = get();
        set({ products: [...state.products, saved] });
        get().updateStockTimestamp();
      }
    } catch (err) {
      throw err;
    }
  },

  updateProduct: async (id, updatedProduct, categoryId) => {
    try {
      const state = get();
      const productToUpdate = state.products.find(p => p.id === id);
      if (productToUpdate) {
        const payload = { ...productToUpdate, ...updatedProduct };
        const saved = await supabaseService.saveProduct(payload, categoryId);
        if (saved) {
          set({
            products: state.products.map(p => p.id === id ? saved : p)
          });
          get().updateStockTimestamp();
        }
      }
    } catch (err) {
      throw err;
    }
  },

  deleteProduct: async (id) => {
    const success = await supabaseService.deleteProduct(id);
    if (success) {
      set(state => ({
        products: state.products.filter(p => p.id !== id)
      }));
      get().updateStockTimestamp();
    }
  },

  registerCustomer: async (re, name, password) => {
    try {
      const saved = await supabaseService.saveCustomer(re, name, password);
      if (saved) {
        set(state => ({
          customers: [...state.customers.filter(c => c.re !== re), saved]
        }));
        alert('Cliente cadastrado com sucesso!');
        return true;
      }
      return false;
    } catch (error: any) {
      alert('Erro do Supabase: ' + (error.message || JSON.stringify(error)));
      throw error;
    }
  },

  loginCustomer: async (re, password) => {
    if (re.trim().length >= 1) {
      const customer = await supabaseService.fetchCustomerByRe(re.trim());
      if (customer) {
        // If a password exists on the DB, we must validate it.
        if (customer.password && customer.password !== password) {
          return false;
        }
        set({ currentCustomer: customer });
        return true;
      }
      return false;
    } else {
      alert('Por favor, digite um RE válido.');
      return false;
    }
  },

  logoutCustomer: () => set({ currentCustomer: null }),

  switchInstance: (instance) => set({ activeInstance: instance }),

  completePixSale: async () => {
    const state = get();
    if (state.cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }
    
    const total_amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    try {
      const saleId = await supabaseService.createSale(
        total_amount,
        'pix',
        state.currentCustomer?.re,
        state.cart
      );
      
      const newSale: Sale = {
        id: saleId || Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        payment_method: 'pix',
        total_amount,
        status: 'completed',
        items: [...state.cart],
        customerRe: state.currentCustomer?.re,
        payment_status: 'PAID'
      };

      set({
        sales: [newSale, ...state.sales],
        cart: [],
        paymentMethod: null,
        receivedAmount: 0
      });
      
      alert('Venda PIX finalizada com sucesso!');
    } catch (err) {
      alert('Erro ao processar venda PIX.');
    }
  },

  completeDebitSale: async () => {
    const state = get();
    if (state.cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }
    
    const total_amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    try {
      const saleId = await supabaseService.createSale(
        total_amount,
        'DEBIT',
        state.currentCustomer?.re,
        state.cart,
        'PENDING'
      );
      
      const newSale: Sale = {
        id: saleId || Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        payment_method: 'DEBIT',
        total_amount,
        status: 'completed',
        items: [...state.cart],
        customerRe: state.currentCustomer?.re,
        payment_status: 'PENDING'
      };

      set({
        sales: [newSale, ...state.sales],
        cart: [],
        paymentMethod: null,
        receivedAmount: 0
      });
      
      alert('Débito registrado com sucesso no seu RE!');
    } catch (err) {
      alert('Erro ao processar venda em débito.');
    }
  },

  settleDebts: async (customerRe) => {
    const success = await supabaseService.updatePaymentStatus(customerRe, 'PAID');
    if (success) {
      const updatedSales = await supabaseService.fetchSales();
      set({ sales: updatedSales });
      alert('Débitos quitados com sucesso!');
    } else {
      alert('Erro ao quitar débitos.');
    }
  },

  addStockAudit: async (productId, productName, expectedStock, realStock) => {
    try {
      const saved = await supabaseService.createStockAudit(productId, productName, expectedStock, realStock);
      if (saved) {
        set(state => ({
          stockAudits: [saved, ...state.stockAudits]
        }));
      }
    } catch (err) {
      console.error('Error saving stock audit:', err);
    }
  },

  startNewMonth: () => {
    const nowIso = new Date().toISOString();
    localStorage.setItem('current_cycle_start', nowIso);
    localStorage.setItem('last_stock_update', nowIso);
    set({
      currentCycleStart: nowIso,
      lastStockUpdate: nowIso
    });
  },

  updateStockTimestamp: () => {
    const nowIso = new Date().toISOString();
    localStorage.setItem('last_stock_update', nowIso);
    set({ lastStockUpdate: nowIso });
  }
}));
