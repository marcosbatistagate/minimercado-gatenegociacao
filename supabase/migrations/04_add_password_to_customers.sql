-- Adiciona a coluna password na tabela de customers se ela não existir
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS password VARCHAR(255);
