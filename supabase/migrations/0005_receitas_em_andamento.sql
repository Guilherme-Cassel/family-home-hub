-- ===========================================================================
-- Casa em Ordem - receitas em andamento
--
-- Cole no SQL Editor e execute. Idempotente.
--
-- A receita e copiada para ca no momento em que e iniciada, em vez de guardar
-- so uma referencia: a sugestao veio da IA e nao existe em lugar nenhum. Se o
-- passo a passo nao fosse materializado, sair da tela perderia a receita no
-- meio do preparo.
-- ===========================================================================

create table if not exists public.recipe_sessions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  prep_minutes integer,
  servings     integer,

  -- Um passo por posicao do array, na ordem do preparo.
  steps jsonb not null default '[]'::jsonb,

  -- Indices dos passos ja concluidos. Array em vez de contador porque quem
  -- cozinha pula de passo (deixa a agua fervendo e vai picar cebola).
  done_steps integer[] not null default '{}',

  -- [{ "stock_item_id": uuid|null, "nome": text, "quantidade": num, "unidade": text }]
  -- A quantidade ja vem na unidade em que o item esta cadastrado, porque e
  -- isso que a IA recebe e devolve - assim nao existe conversao de g para kg
  -- na hora de dar baixa.
  ingredients jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),

  constraint recipe_sessions_name_nao_vazio check (length(trim(name)) > 0)
);

create index if not exists recipe_sessions_recentes_idx
  on public.recipe_sessions (created_at desc);

alter table public.recipe_sessions enable row level security;

drop policy if exists "recipe_sessions: acesso da casa" on public.recipe_sessions;
create policy "recipe_sessions: acesso da casa"
  on public.recipe_sessions for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Concluir a receita: baixa no estoque e encerramento, numa transacao so
--
-- Recebe os consumos ja conferidos pela tela, e nao os que foram salvos ao
-- iniciar: quem cozinha ajusta quantidade no meio do caminho, e o que vale e
-- o que saiu de verdade da despensa.
--
-- Formato de cada consumo:
--   { "stock_item_id": "uuid", "quantidade": 0.4 }
--
-- Consumo sem stock_item_id, ou com quantidade zero, e ignorado: e o caso do
-- ingrediente que foi comprado na hora e nunca entrou no estoque.
-- ---------------------------------------------------------------------------
create or replace function public.finish_recipe_session(
  p_session_id uuid,
  p_consumos   jsonb default '[]'::jsonb
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_consumo jsonb;
  v_item_id uuid;
  v_qtd     numeric;
  v_total   integer := 0;
begin
  if jsonb_typeof(p_consumos) <> 'array' then
    raise exception 'finish_recipe_session espera um array JSON';
  end if;

  for v_consumo in select value from jsonb_array_elements(p_consumos)
  loop
    v_item_id := nullif(v_consumo ->> 'stock_item_id', '')::uuid;
    v_qtd := coalesce((nullif(v_consumo ->> 'quantidade', ''))::numeric, 0);

    if v_item_id is null or v_qtd <= 0 then
      continue;
    end if;

    -- Negativo: e saida. O trigger em stock_movements ajusta o saldo, entao a
    -- baixa aparece no historico do item como qualquer outro consumo.
    insert into public.stock_movements (stock_item_id, quantity_change, reason)
    values (v_item_id, -v_qtd, 'consumo');

    v_total := v_total + 1;
  end loop;

  delete from public.recipe_sessions where id = p_session_id;

  return v_total;
end;
$$;
