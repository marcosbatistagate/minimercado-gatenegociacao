-- 6. Tabela de Registros Detalhados de Custos (Entradas / Mercadorias)
CREATE TABLE IF NOT EXISTS public.cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para todos" ON public.cost_entries FOR SELECT USING (true);
CREATE POLICY "Permitir insercao para todos" ON public.cost_entries FOR INSERT WITH CHECK (true);
