import { supabase } from '../lib/supabase';
import type { Product, CartItem, PaymentMethod, Sale } from '../store/useMarketStore';
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
        code, 
        name, 
        cost_price, 
        price, 
        stock, 
        min_stock, 
        category_id,
        categories (id, name)
      `);

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      cost_price: p.cost_price,
      price: p.price,
      stock: p.stock,
      min_stock: p.min_stock,
      category: p.categories?.name || 'Sem Categoria',
      categoryId: p.category_id || (p.categories ? p.categories.id : undefined)
    }));
  },

  async fetchCategories(): Promise<{id: string, name: string}[]> {
    const { data, error } = await supabase.from('categories').select('id, name');
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data;
  },

  async saveProduct(product: Omit<Product, 'id'> | Product, categoryId?: string): Promise<Product | null> {
    try {
      // Usa categoryId passado ou cria/busca a categoria se apenas o nome for passado (fallback)
      const finalCategoryId = categoryId || await this.getOrCreateCategory(product.category);
      
      const payload: any = {
        code: product.code,
        name: product.name,
        cost_price: product.cost_price,
        price: product.price,
        stock: product.stock,
        min_stock: product.min_stock,
        category_id: finalCategoryId,
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
          code, 
          name, 
          cost_price, 
          price, 
          stock, 
          min_stock, 
          category_id,
          categories (id, name)
        `)
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        cost_price: data.cost_price,
        price: data.price,
        stock: data.stock,
        min_stock: data.min_stock,
        category: (data as any).categories?.name || 'Sem Categoria',
        categoryId: data.category_id
      };
    } catch (err: any) {
      console.error('Error saving product:', err);
      // Propaga o erro para o componente UI tratar
      throw err;
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
    const { data, error } = await supabase.from('customers').select('re, name, password');
    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return data;
  },

  async fetchCustomerByRe(re: string): Promise<UserCustomer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('re, name, password')
      .eq('re', re)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching customer by RE:', error);
      return null;
    }
    return data;
  },

  async saveCustomer(re: string, name: string, password?: string): Promise<UserCustomer | null> {
    try {
      const sanitizedRe = re.trim();
      const sanitizedName = name.trim();
      const sanitizedPassword = password ? password.trim() : undefined;

      const { data, error } = await supabase
        .from('customers')
        .upsert({ 
          re: sanitizedRe, 
          name: sanitizedName, 
          password: sanitizedPassword 
        })
        .select('re, name, password')
        .single();

      if (error) {
        throw error;
      }
      return data;
    } catch (err: any) {
      console.error('Error saving customer:', err);
      throw err;
    }
  },

  async updateCustomerPassword(re: string, password?: string): Promise<boolean> {
    const { error } = await supabase
      .from('customers')
      .update({ password })
      .eq('re', re);

    if (error) {
      console.error('Error updating customer password:', error);
      return false;
    }
    return true;
  },

  async createSale(
    totalAmount: number, 
    paymentMethod: PaymentMethod, 
    customerRe: string | undefined, 
    items: CartItem[],
    paymentStatus: 'PAID' | 'PENDING' = 'PAID'
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
      p_items: formattedItems,
      p_payment_status: paymentStatus
    });

    if (error) {
      console.error('Error creating sale via RPC:', error);
      throw error;
    }
    
    return data;
  },

  async fetchSales(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        created_at,
        payment_method,
        total_amount,
        status,
        customer_re,
        payment_status,
        sale_items (
          id,
          quantity,
          unit_price,
          total_price,
          product_id,
          products (
            id,
            code,
            name,
            cost_price,
            price,
            stock,
            min_stock
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      return [];
    }

    return (data as any[]).map(s => ({
      id: s.id,
      created_at: s.created_at,
      payment_method: s.payment_method,
      total_amount: Number(s.total_amount),
      status: s.status,
      customerRe: s.customer_re,
      payment_status: s.payment_status || 'PAID',
      items: (s.sale_items || []).map((item: any) => ({
        product: {
          id: item.products?.id || item.product_id,
          code: item.products?.code || '',
          name: item.products?.name || 'Produto Removido',
          price: Number(item.unit_price),
          category: '',
          cost_price: Number(item.products?.cost_price || 0),
          stock: Number(item.products?.stock || 0),
          min_stock: Number(item.products?.min_stock || 0)
        },
        quantity: Number(item.quantity),
        subtotal: Number(item.total_price)
      }))
    }));
  },

  async updatePaymentStatus(customerRe: string, newStatus: 'PAID' | 'PENDING'): Promise<boolean> {
    const { error } = await supabase
      .from('sales')
      .update({ payment_status: newStatus })
      .eq('customer_re', customerRe)
      .eq('payment_status', 'PENDING');

    if (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
    return true;
  }
};
