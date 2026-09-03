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
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      re: c.re,
      name: c.name,
      password: c.password,
      debt: c.debt ? Number(c.debt) : 0
    }));
  },

  async fetchCustomerByRe(re: string): Promise<UserCustomer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('re', re)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching customer by RE:', error);
      return null;
    }
    if (!data) return null;
    return {
      id: data.id,
      re: data.re,
      name: data.name,
      password: data.password,
      debt: data.debt ? Number(data.debt) : 0
    };
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
        }, { onConflict: 're' })
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
    paymentStatus: 'paid' | 'pending' | 'PAID' | 'PENDING' = 'paid'
  ) {
    const formattedItems = items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.subtotal
    }));

    const isDebit = paymentMethod === 'DEBIT' || paymentStatus.toLowerCase() === 'pending';
    const finalMethod = isDebit ? 'DEBIT' : 'PIX';
    const finalStatus = isDebit ? 'pending' : 'paid';

    const { data, error } = await supabase.rpc('process_sale', {
      p_total_amount: totalAmount,
      p_payment_method: finalMethod,
      p_customer_re: customerRe || null,
      p_items: formattedItems,
      p_payment_status: finalStatus
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

    return (data as any[]).map(s => {
      const rawStatus = (s.status || '').toLowerCase();
      const rawPaymentStatus = (s.payment_status || '').toLowerCase();
      const rawMethod = (s.payment_method || '').toUpperCase();

      const isPaid = 
        rawPaymentStatus === 'paid' || 
        rawPaymentStatus === 'completed' ||
        rawStatus === 'completed' || 
        rawStatus === 'paid' ||
        rawMethod === 'PIX' ||
        rawMethod === 'DEBIT_PAID';

      const isDebit = !isPaid && (
        rawPaymentStatus === 'pending' || 
        rawPaymentStatus === 'debit' ||
        rawStatus === 'pending' || 
        rawStatus === 'debit' || 
        rawMethod === 'DEBIT'
      );

      return {
        id: s.id,
        created_at: s.created_at,
        payment_method: isDebit ? 'DEBIT' : (rawMethod === 'DEBIT_PAID' ? 'DEBIT_PAID' : 'PIX'),
        total_amount: Number(s.total_amount),
        status: isDebit ? 'pending' : (s.status || 'completed'),
        customerRe: s.customer_re,
        payment_status: isDebit ? 'PENDING' : 'PAID',
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
      };
    });
  },

  async updatePaymentStatus(customerRe: string): Promise<boolean> {
    try {
      // 1. Zerar o débito na tabela customers (por RE e por ID se existir)
      const { data: customer, error: findCustError } = await supabase
        .from('customers')
        .select('id, re')
        .eq('re', customerRe)
        .maybeSingle();

      if (findCustError) {
        console.warn('Aviso ao localizar cliente por RE:', findCustError);
      }

      if (customer?.id) {
        const { error: customerErrorById } = await supabase
          .from('customers')
          .update({ debt: 0 })
          .eq('id', customer.id);

        if (customerErrorById) {
          console.error('Erro ao zerar debt por id:', customerErrorById);
          throw customerErrorById;
        }
      }

      const { error: customerErrorByRe } = await supabase
        .from('customers')
        .update({ debt: 0 })
        .eq('re', customerRe);

      if (customerErrorByRe) {
        console.error('Erro ao zerar debt por re:', customerErrorByRe);
        throw customerErrorByRe;
      }

      // 2. Atualizar todas as vendas desse cliente para 'completed' / 'paid'
      const { error: salesErrorByRe } = await supabase
        .from('sales')
        .update({ 
          status: 'completed',
          payment_status: 'paid',
          payment_method: 'DEBIT_PAID'
        })
        .eq('customer_re', customerRe)
        .neq('status', 'cancelled');

      if (salesErrorByRe) {
        console.error('Erro ao atualizar vendas por customer_re:', salesErrorByRe);
        throw salesErrorByRe;
      }

      if (customer?.id) {
        const { error: salesErrorById } = await supabase
          .from('sales')
          .update({ 
            status: 'completed',
            payment_status: 'paid',
            payment_method: 'DEBIT_PAID'
          })
          .eq('customer_id', customer.id)
          .neq('status', 'cancelled');

        if (salesErrorById) {
          console.warn('Aviso ao atualizar vendas por customer_id:', salesErrorById);
        }
      }

      return true;
    } catch (err: any) {
      console.error('Erro crítico em updatePaymentStatus:', err);
      throw err;
    }
  },

  async fetchStockAudits(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('stock_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.warn('Supabase fetchStockAudits failed or table does not exist. Using localStorage fallback.', err);
      const local = localStorage.getItem('local_stock_audits');
      return local ? JSON.parse(local) : [];
    }
  },

  async createStockAudit(product_id: string, product_name: string, expected_stock: number, real_stock: number): Promise<any | null> {
    const payload = {
      product_id: product_id || null,
      product_name,
      expected_stock,
      real_stock,
      created_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase
        .from('stock_audits')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('Supabase createStockAudit failed or table does not exist. Saving to localStorage fallback.', err);
      const local = localStorage.getItem('local_stock_audits');
      const audits = local ? JSON.parse(local) : [];
      const newAudit = {
        id: Math.random().toString(36).substring(2, 9),
        ...payload
      };
      audits.unshift(newAudit);
      localStorage.setItem('local_stock_audits', JSON.stringify(audits));
      return newAudit;
    }
  },

  async fetchCostEntries(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cost_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) return data;

      const local = localStorage.getItem('local_cost_entries');
      if (local) {
        return JSON.parse(local);
      }
      
      // Default initial seed entries across periods
      const now = new Date();
      const defaultSeed = [
        {
          id: 'cost-init-1',
          product_name: 'Trento',
          product_code: '7896306625329',
          quantity: 16,
          unit_cost: 1.80,
          total_cost: 28.80,
          created_at: new Date(now.getFullYear(), now.getMonth(), 2, 10, 30).toISOString()
        },
        {
          id: 'cost-init-2',
          product_name: 'Snikers',
          product_code: '7896423438994',
          quantity: 12,
          unit_cost: 2.50,
          total_cost: 30.00,
          created_at: new Date(now.getFullYear(), now.getMonth(), 1, 14, 15).toISOString()
        },
        {
          id: 'cost-init-3',
          product_name: 'DADINHO',
          product_code: '7898530842688',
          quantity: 50,
          unit_cost: 1.00,
          total_cost: 50.00,
          created_at: new Date(now.getFullYear(), now.getMonth() - 1, 28, 15, 13).toISOString()
        },
        {
          id: 'cost-init-4',
          product_name: 'KITKAT',
          product_code: '7891000248775',
          quantity: 24,
          unit_cost: 0.96,
          total_cost: 23.04,
          created_at: new Date(now.getFullYear(), now.getMonth() - 1, 25, 18, 34).toISOString()
        },
        {
          id: 'cost-init-5',
          product_name: 'REFRI LATA',
          product_code: 'BEB-001',
          quantity: 36,
          unit_cost: 2.00,
          total_cost: 72.00,
          created_at: new Date(now.getFullYear(), now.getMonth() - 2, 15, 11, 20).toISOString()
        },
        {
          id: 'cost-init-6',
          product_name: 'H2O',
          product_code: 'BEB-006',
          quantity: 24,
          unit_cost: 2.00,
          total_cost: 48.00,
          created_at: new Date(now.getFullYear(), now.getMonth() - 2, 10, 9, 45).toISOString()
        }
      ];
      localStorage.setItem('local_cost_entries', JSON.stringify(defaultSeed));
      return defaultSeed;
    } catch (err: any) {
      console.warn('Supabase fetchCostEntries failed or table does not exist. Using localStorage fallback.', err);
      const local = localStorage.getItem('local_cost_entries');
      if (local) {
        return JSON.parse(local);
      }
      return [];
    }
  },

  async createCostEntry(entry: { product_id?: string; product_name: string; product_code: string; quantity: number; unit_cost: number; total_cost: number }): Promise<any> {
    const payload = {
      product_id: entry.product_id || null,
      product_name: entry.product_name,
      product_code: entry.product_code,
      quantity: entry.quantity,
      unit_cost: entry.unit_cost,
      total_cost: entry.total_cost,
      created_at: new Date().toISOString()
    };
    try {
      const { data, error } = await supabase
        .from('cost_entries')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.warn('Supabase createCostEntry failed or table does not exist. Saving to localStorage fallback.', err);
      const local = localStorage.getItem('local_cost_entries');
      const entries = local ? JSON.parse(local) : [];
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        ...payload
      };
      entries.unshift(newEntry);
      localStorage.setItem('local_cost_entries', JSON.stringify(entries));
      return newEntry;
    }
  },

  async fetchMarketSettings(): Promise<any | null> {
    const { data, error } = await supabase
      .from('market_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching market settings:', error);
      return null;
    }
    return data;
  },

  async saveCycleReset(timestamp: string): Promise<string> {
    localStorage.setItem('current_cycle_start', timestamp);
    try {
      const currentSettings = await this.fetchMarketSettings();
      const payload: any = {
        ...(currentSettings || {}),
        last_cycle_reset: timestamp,
        updated_at: new Date().toISOString()
      };
      if (currentSettings?.id) {
        payload.id = currentSettings.id;
      }
      await supabase.from('market_settings').upsert(payload);
    } catch (err) {
      console.warn('Aviso: Não foi possível sincronizar last_cycle_reset no Supabase, mantido em localStorage:', err);
    }
    return timestamp;
  },

  async saveMarketSettings(settings: { id?: string; pix_key_type: string; pix_key: string; merchant_name: string; merchant_city: string }): Promise<any | null> {
    const { data, error } = await supabase
      .from('market_settings')
      .upsert(settings)
      .select('*')
      .single();

    if (error) {
      console.error('Error saving market settings:', error);
      throw error;
    }
    return data;
  }
};
