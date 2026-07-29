import { create } from 'zustand';
import type { UserCustomer } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  category: string;
  costPrice: number;
  stock: number;
  minStock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = 'money' | 'credit_card' | 'debit_card' | 'pix' | null;

export interface Sale {
  id: string;
  created_at: string;
  payment_method: PaymentMethod;
  total_amount: number;
  status: 'completed' | 'cancelled';
  items: CartItem[];
  customerRe?: string;
}

interface MarketState {
  products: Product[];
  cart: CartItem[];
  sales: Sale[];
  paymentMethod: PaymentMethod;
  receivedAmount: number;
  currentCustomer: UserCustomer | null;
  customers: UserCustomer[];
  activeInstance: 'client' | 'admin';
  initData: () => Promise<void>;
  addToCartByCode: (codeOrName: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setReceivedAmount: (amount: number) => void;
  clearCart: () => void;
  checkout: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updatedProduct: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  registerCustomer: (re: string, name: string) => Promise<void>;
  loginCustomer: (re: string) => void;
  logoutCustomer: () => void;
  switchInstance: (instance: 'client' | 'admin') => void;
  completePixSale: () => Promise<void>;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  products: [],
  cart: [],
  sales: [],
  paymentMethod: null,
  receivedAmount: 0,
  currentCustomer: null,
  customers: [],
  activeInstance: 'client',

  initData: async () => {
    try {
      const [fetchedProducts, fetchedCustomers] = await Promise.all([
        supabaseService.fetchProducts(),
        supabaseService.fetchCustomers()
      ]);
      
      set({ 
        products: fetchedProducts, 
        customers: fetchedCustomers 
      });

      // Setup Realtime for products
      supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
          // Quando houver mudança na tabela products, buscamos novamente para atualizar o estado
          const updatedProducts = await supabaseService.fetchProducts();
          set({ products: updatedProducts });
        })
        .subscribe();
        
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  },

  addToCartByCode: (codeOrName) => {
    const state = get();
    const product = state.products.find(
      p => p.barcode === codeOrName || p.name.toLowerCase() === codeOrName.toLowerCase()
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
        customerRe: state.currentCustomer?.re
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

  addProduct: async (product) => {
    // Optimistic UI could be done here, but we'll wait for the real result or realtime
    const saved = await supabaseService.saveProduct(product);
    if (saved) {
      const state = get();
      set({ products: [...state.products.filter(p => p.id !== saved.id), saved] });
    }
  },

  updateProduct: async (id, updatedProduct) => {
    const state = get();
    const current = state.products.find(p => p.id === id);
    if (!current) return;
    
    const saved = await supabaseService.saveProduct({ ...current, ...updatedProduct });
    if (saved) {
      set({ products: get().products.map(p => p.id === id ? saved : p) });
    }
  },

  deleteProduct: async (id) => {
    const success = await supabaseService.deleteProduct(id);
    if (success) {
      set(state => ({
        products: state.products.filter(p => p.id !== id)
      }));
    }
  },

  registerCustomer: async (re, name) => {
    const saved = await supabaseService.saveCustomer(re, name);
    if (saved) {
      set(state => ({
        customers: [...state.customers.filter(c => c.re !== re), saved]
      }));
      alert('Cliente cadastrado com sucesso!');
    } else {
      alert('Erro ao cadastrar cliente.');
    }
  },

  loginCustomer: (re) => {
    const state = get();
    const customer = state.customers.find(c => c.re === re);
    if (customer) {
      set({ currentCustomer: customer });
      alert(`Bem-vindo, ${customer.name}!`);
    } else {
      alert('RE não encontrado. Por favor, cadastre-se.');
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
        customerRe: state.currentCustomer?.re
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
  }
}));
