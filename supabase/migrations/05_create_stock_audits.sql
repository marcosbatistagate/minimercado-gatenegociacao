-- 5. Tabela de Auditorias / Conferências de Estoque com divergência
CREATE TABLE IF NOT EXISTS public.stock_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    expected_stock INT NOT NULL,
    real_stock INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.stock_audits ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir leitura para todos" ON public.stock_audits FOR SELECT USING (true);
CREATE POLICY "Permitir insercao para todos" ON public.stock_audits FOR INSERT WITH CHECK (true);
