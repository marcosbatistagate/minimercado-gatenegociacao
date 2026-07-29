import { create } from 'zustand';
import type { UserCustomer } from '../types';

export interface Product {
  id: string;
  code: string;
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
  addToCartByCode: (codeOrName: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setReceivedAmount: (amount: number) => void;
  clearCart: () => void;
  checkout: () => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updatedProduct: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  registerCustomer: (re: string, name: string) => void;
  loginCustomer: (re: string) => void;
  logoutCustomer: () => void;
  switchInstance: (instance: 'client' | 'admin') => void;
  completePixSale: () => void;
}

// Temporary mock products
const mockProducts: Product[] = [
  { id: '1', code: '123', name: 'Arroz 5kg', price: 25.90, category: 'Alimentos', costPrice: 18.00, stock: 50, minStock: 20 },
  { id: '2', code: '456', name: 'Feijão 1kg', price: 8.50, category: 'Alimentos', costPrice: 5.00, stock: 15, minStock: 20 },
  { id: '3', code: '789', name: 'Óleo de Soja', price: 7.20, category: 'Alimentos', costPrice: 5.50, stock: 0, minStock: 10 },
];

const mockSales: Sale[] = [
  { 
    id: 's1', 
    created_at: new Date(Date.now() - 86400000).toISOString(), 
    payment_method: 'credit_card', 
    total_amount: 34.40, 
    status: 'completed', 
    items: [
      { product: mockProducts[0], quantity: 1, subtotal: 25.90 },
      { product: mockProducts[1], quantity: 1, subtotal: 8.50 }
    ] 
  },
  { 
    id: 's2', 
    created_at: new Date(Date.now() - 3600000).toISOString(), 
    payment_method: 'pix', 
    total_amount: 25.90, 
    status: 'completed', 
    items: [
      { product: mockProducts[0], quantity: 1, subtotal: 25.90 }
    ] 
  },
];

export const useMarketStore = create<MarketState>((set, get) => ({
  products: mockProducts,
  cart: [],
  sales: mockSales,
  paymentMethod: null,
  receivedAmount: 0,
  currentCustomer: null,
  customers: [{ re: '123456', name: 'João Silva' }],
  activeInstance: 'client',

  addToCartByCode: (codeOrName) => {
    const state = get();
    const product = state.products.find(
      p => p.code === codeOrName || p.name.toLowerCase() === codeOrName.toLowerCase()
    );

    if (product) {
      const existingItem = state.cart.find(item => item.product.id === product.id);
      
      if (existingItem) {
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
          const newQuantity = Math.max(1, item.quantity + delta);
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

  checkout: () => {
    const state = get();
    if (state.cart.length === 0 || !state.paymentMethod) {
      alert('Carrinho vazio ou método de pagamento não selecionado!');
      return;
    }
    
    const total_amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    const newSale: Sale = {
      id: Math.random().toString(36).substring(2, 9),
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
  },

  addProduct: (product) => {
    const id = Math.random().toString(36).substring(2, 9);
    set(state => ({
      products: [...state.products, { ...product, id }]
    }));
  },

  updateProduct: (id, updatedProduct) => {
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, ...updatedProduct } : p)
    }));
  },

  deleteProduct: (id) => {
    set(state => ({
      products: state.products.filter(p => p.id !== id)
    }));
  },

  registerCustomer: (re, name) => {
    set(state => ({
      customers: [...state.customers, { re, name }]
    }));
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

  completePixSale: () => {
    const state = get();
    if (state.cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }
    
    const total_amount = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    const newSale: Sale = {
      id: Math.random().toString(36).substring(2, 9),
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
  }
}));
