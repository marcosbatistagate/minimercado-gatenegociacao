import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tdrvgpwqfosysrhooqzp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkcnZncHdxZm9zeXNyaG9vcXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjI1MTUsImV4cCI6MjEwMDg5ODUxNX0.8AiPExODoERUQuEe6SGsiXUmIZnXHhbVBGoja1ouFN4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function resetTestData() {
  console.log('Iniciando limpeza e reset da base de testes...');

  // 1. Limpeza da tabela sale_items
  try {
    console.log('1. Limpando sale_items...');
    const { data, error } = await supabase.from('sale_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn('Aviso ao deletar sale_items:', error.message);
    } else {
      console.log('✓ sale_items limpos com sucesso.');
    }
  } catch (err) {
    console.warn('Erro ao limpar sale_items:', err);
  }

  // 2. Limpeza da tabela sales
  try {
    console.log('2. Limpando sales...');
    const { data, error } = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn('Aviso ao deletar sales:', error.message);
    } else {
      console.log('✓ sales limpos com sucesso.');
    }
  } catch (err) {
    console.warn('Erro ao limpar sales:', err);
  }

  // 3. Limpeza da tabela products
  try {
    console.log('3. Limpando products...');
    const { data, error } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn('Aviso ao deletar products:', error.message);
    } else {
      console.log('✓ products limpos com sucesso.');
    }
  } catch (err) {
    console.warn('Erro ao limpar products:', err);
  }

  // 4. Limpeza da tabela stock_audits
  try {
    console.log('4. Limpando stock_audits...');
    const { data, error } = await supabase.from('stock_audits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn('Aviso ao deletar stock_audits (pode não existir):', error.message);
    } else {
      console.log('✓ stock_audits limpos com sucesso.');
    }
  } catch (err) {
    console.warn('Erro ao limpar stock_audits:', err);
  }

  // 5. Garantir categorias padrão
  const standardCategories = [
    'Bebidas',
    'Doces & Chocolates',
    'Salgados & Snacks',
    'Fitness & Proteicos',
    'Diversos'
  ];

  console.log('5. Assegurando categorias padrão...');
  for (const catName of standardCategories) {
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('id, name')
        .eq('name', catName)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase
          .from('categories')
          .insert({ name: catName });
        if (insertErr) {
          console.warn(`Aviso ao criar categoria ${catName}:`, insertErr.message);
        } else {
          console.log(`✓ Categoria criada: ${catName}`);
        }
      } else {
        console.log(`✓ Categoria existente: ${catName}`);
      }
    } catch (err) {
      console.warn(`Erro ao verificar categoria ${catName}:`, err);
    }
  }

  // 6. Reiniciar ciclo de fechamento em market_settings
  const nowIso = new Date().toISOString();
  console.log(`6. Reiniciando last_cycle_reset para ${nowIso}...`);
  try {
    const { data: currentSettings } = await supabase
      .from('market_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const payload = {
      ...(currentSettings || {}),
      last_cycle_reset: nowIso,
      updated_at: nowIso
    };

    if (currentSettings?.id) {
      payload.id = currentSettings.id;
    }

    const { error: settingsErr } = await supabase
      .from('market_settings')
      .upsert(payload);

    if (settingsErr) {
      console.warn('Aviso ao atualizar market_settings:', settingsErr.message);
    } else {
      console.log('✓ market_settings.last_cycle_reset atualizado.');
    }
  } catch (err) {
    console.warn('Erro ao atualizar market_settings:', err);
  }

  console.log('\n=============================================');
  console.log('Limpeza e Reset concluídos com sucesso!');
  console.log('=============================================');
}

resetTestData();
