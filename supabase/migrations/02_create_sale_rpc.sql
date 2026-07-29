-- Função RPC para processar vendas de forma transacional e atômica
CREATE OR REPLACE FUNCTION public.process_sale(
    p_total_amount DECIMAL,
    p_payment_method VARCHAR,
    p_customer_re VARCHAR,
    p_items JSONB
) RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Inserir a venda na tabela sales
    INSERT INTO public.sales (total_amount, payment_method, customer_re)
    VALUES (p_total_amount, p_payment_method, NULLIF(p_customer_re, ''))
    RETURNING id INTO v_sale_id;

    -- 2. Processar cada item da venda
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Inserir na tabela sale_items
        INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, total_price)
        VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INT,
            (v_item->>'unit_price')::DECIMAL,
            (v_item->>'total_price')::DECIMAL
        );

        -- Decrementar a quantidade no estoque da tabela products
        UPDATE public.products
        SET stock = stock - (v_item->>'quantity')::INT
        WHERE id = (v_item->>'product_id')::UUID;
    END LOOP;

    -- Retorna o ID da venda recém-criada
    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
