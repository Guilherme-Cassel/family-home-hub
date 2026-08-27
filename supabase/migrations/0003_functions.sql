-- ===========================================================================
-- Casa em Ordem - operacoes que precisam ser atomicas
--
-- As duas funcoes abaixo rodam como SECURITY INVOKER (padrao), entao a RLS
-- continua valendo: quem nao esta autenticado nao consegue executa-las de
-- forma util.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Marcar manutencao como feita
--
-- Grava no historico E atualiza last_done_date numa transacao so, para os dois
-- nunca discordarem. next_due_date se recalcula sozinho (coluna gerada).
-- ---------------------------------------------------------------------------
create or replace function public.mark_maintenance_done(
  p_item_id   uuid,
  p_done_date date default current_date,
  p_notes     text default null
)
returns public.maintenance_items
language plpgsql
set search_path = ''
as $$
declare
  v_item public.maintenance_items;
begin
  insert into public.maintenance_log (maintenance_item_id, done_date, notes)
  values (p_item_id, coalesce(p_done_date, current_date), nullif(trim(p_notes), ''));

  update public.maintenance_items
     set last_done_date = coalesce(p_done_date, current_date)
   where id = p_item_id
  returning * into v_item;

  if v_item.id is null then
    raise exception 'Item de manutencao % nao encontrado', p_item_id;
  end if;

  return v_item;
end;
$$;

-- ---------------------------------------------------------------------------
-- Aplicar varias entradas de estoque de uma vez
--
-- Usada pela entrada rapida (digitada) e pela entrada em massa por foto: o
-- usuario revisa tudo na tela e so entao uma unica chamada grava o lote
-- inteiro. Se qualquer linha falhar, nenhuma e gravada.
--
-- Formato esperado de cada elemento do array:
--   {
--     "stock_item_id": "uuid",        -- ou null, se for item novo
--     "new_item": {                   -- so quando stock_item_id e null
--       "name": "Arroz branco",
--       "category": "alimento",
--       "unit": "kg",
--       "minimum_quantity": 2
--     },
--     "quantity_change": 1,
--     "price_at_time": 24.90,         -- opcional
--     "reason": "compra"              -- opcional
--   }
-- ---------------------------------------------------------------------------
create or replace function public.apply_stock_entries(p_entries jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_entry   jsonb;
  v_item_id uuid;
  v_count   integer := 0;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'apply_stock_entries espera um array JSON';
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries)
  loop
    v_item_id := nullif(v_entry ->> 'stock_item_id', '')::uuid;

    -- Item ainda nao cadastrado: cria na hora, com os dados que vieram da
    -- tela de revisao.
    if v_item_id is null then
      insert into public.stock_items (name, category, unit, minimum_quantity)
      values (
        trim(v_entry -> 'new_item' ->> 'name'),
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
