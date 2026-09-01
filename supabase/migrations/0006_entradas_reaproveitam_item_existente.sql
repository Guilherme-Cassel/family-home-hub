-- ===========================================================================
-- Casa em Ordem - entradas reaproveitam o item que ja existe
--
-- Cole no SQL Editor e execute. Idempotente.
--
-- Antes, toda linha sem stock_item_id criava um cadastro novo. Fotografar
-- cinco pacotes iguais de um produto ainda nao cadastrado gerava cinco itens
-- chamados "Milho para pipoca", cada um com 1 un. O mesmo acontecia quando a
-- IA nao reconhecia o vinculo e o usuario digitava um nome que ja existia no
-- estoque.
--
-- Agora a funcao procura o item pelo nome antes de criar. A busca usa
-- lower(name), a mesma expressao do indice stock_items_name_idx. Como o INSERT
-- acontece dentro da mesma transacao, a segunda linha do lote com o mesmo nome
-- ja encontra o item que a primeira criou - o agrupamento vale dentro do lote
-- e entre compras diferentes.
--
-- A tela agrupa as linhas antes de chamar aqui; esta funcao e a rede de
-- seguranca, porque a Server Action e um endpoint publico.
-- ===========================================================================

create or replace function public.apply_stock_entries(p_entries jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_entry   jsonb;
  v_item_id uuid;
  v_name    text;
  v_count   integer := 0;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'apply_stock_entries espera um array JSON';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    v_item_id := nullif(v_entry ->> 'stock_item_id', '')::uuid;

    if v_item_id is null then
      v_name := trim(v_entry -> 'new_item' ->> 'name');

      if v_name is null or v_name = '' then
        raise exception 'Ha entrada sem item vinculado nem nome para criar';
      end if;

      -- Ja existe um item com esse nome? Entao a compra e dele. Categoria e
      -- unidade do cadastro atual mandam: quem cadastrou escolheu com mais
      -- contexto do que a sugestao da IA.
      select id into v_item_id
        from public.stock_items
       where lower(name) = lower(v_name)
       order by created_at
       limit 1;
    end if;

    -- Item realmente novo: cria na hora, com os dados que vieram da tela de
    -- revisao.
    if v_item_id is null then
      insert into public.stock_items (name, category, unit, minimum_quantity)
      values (
        v_name,
        coalesce(nullif(v_entry -> 'new_item' ->> 'category', ''), 'outros'),
        coalesce(nullif(v_entry -> 'new_item' ->> 'unit', ''), 'un'),
        coalesce((nullif(v_entry -> 'new_item' ->> 'minimum_quantity', ''))::numeric, 0)
      )
      returning id into v_item_id;
    end if;

    insert into public.stock_movements
      (stock_item_id, quantity_change, price_at_time, reason)
    values (
      v_item_id,
      (v_entry ->> 'quantity_change')::numeric,
      (nullif(v_entry ->> 'price_at_time', ''))::numeric,
      coalesce(nullif(v_entry ->> 'reason', ''), 'compra')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
