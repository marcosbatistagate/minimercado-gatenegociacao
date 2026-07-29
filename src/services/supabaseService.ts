import { supabase } from '../lib/supabase';
import type { Product, CartItem, PaymentMethod } from '../store/useMarketStore';
import type { UserCustomer } from '../types';

export const supabaseService = {
  async getOrCreateCategory(categoryName: string): Promise<string | null> {
    if (!categoryName) return null;
    
    // Check if exists
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName)
      .single();

    if (existing) return existing.id;

    // If not, insert
    const { data: inserted, error: insertErr } = await supabase
      .from('categories')
      .insert({ name: categoryName })
      .select('id')
      .single();
      
    if (insertErr) {
      console.error('Error creating category:', insertErr);
      return null;
    }
    
    return inserted.id;
  },

  async fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, 
        barcode, 
        name, 
        cost_price, 
        price, 
        stock, 
        min_stock, 
        categories (name)
      `);

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map(p => ({
      id: p.id,
      barcode: p.barcode,
      name: p.name,
      costPrice: p.cost_price,
      price: p.price,
      stock: p.stock,
      minStock: p.min_stock,
      category: p.categories?.name || 'Sem Categoria'
    }));
  },

  async saveProduct(product: Omit<Product, 'id'> | Product): Promise<Product | null> {
    try {
      const categoryId = await this.getOrCreateCategory(product.category);
      
      const payload: any = {
        barcode: product.barcode,
        name: product.name,
        cost_price: product.costPrice,
        price: product.price,
        stock: product.stock,
        min_stock: product.minStock,
        category_id: categoryId,
        updated_at: new Date().toISOString()
      };

      if ('id' in product && product.id) {
        payload.id = product.id;
      }

      const { data, error } = await supabase
        .from('products')
        .upsert(payload)
        .select(`
          id, 
          barcode, 
          name, 
          cost_price, 
          price, 
          stock, 
          min_stock, 
          categories (name)
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        barcode: data.barcode,
        name: data.name,
        costPrice: data.cost_price,
        price: data.price,
        stock: data.stock,
        minStock: data.min_stock,
        category: (data as any).categories?.name || product.category
      };
    } catch (err) {
      console.error('Error saving product:', err);
      return null;
    }
  },

  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }
    return true;
  },

  async fetchCustomers(): Promise<UserCustomer[]> {
    const { data, error } = await supabase.from('customers').select('re, name');
    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return data;
  },

  async saveCustomer(re: string, name: string): Promise<UserCustomer | null> {
    const { data, error } = await supabase
      .from('customers')
      .upsert({ re, name })
      .select('re, name')
      .single();

    if (error) {
      console.error('Error saving customer:', error);
      return null;
    }
    return data;
  },

  async createSale(
    totalAmount: number, 
    paymentMethod: PaymentMethod, 
    customerRe: string | undefined, 
    items: CartItem[]
  ) {
    const formattedItems = items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.subtotal
    }));

    const { data, error } = await supabase.rpc('process_sale', {
      p_total_amount: totalAmount,
      p_payment_method: paymentMethod,
      p_customer_re: customerRe || null,
      p_items: formattedItems
    });

    if (error) {
      console.error('Error creating sale via RPC:', error);
      throw error;
    }
    
    return data;
  }
};
