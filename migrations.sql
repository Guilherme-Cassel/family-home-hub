-- ===========================================================================
-- Casa em Ordem - migration consolidada
--
-- Cole este arquivo inteiro no SQL Editor de um projeto Supabase novo e
-- execute uma vez. E o resultado de concatenar, na ordem, tudo que existe em
-- supabase/migrations/ (0001 a 0006) - cada arquivo continua existindo
-- separado ali para quem preferir rodar passo a passo. Idempotente: rodar de
-- novo nao quebra nada.
-- ===========================================================================


-- ===========================================================================
-- 0001_schema.sql - tabelas, colunas geradas e triggers
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Perfis
--
-- auth.users nao e legivel pelo cliente, entao espelhamos o nome de exibicao
-- aqui para conseguir mostrar "manutencao feita por Ana" na interface.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'alguem@casa'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Utilitarios compartilhados
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------------------
create table if not exists public.stock_items (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null default 'outros',
  unit             text not null default 'un',
  current_quantity numeric(12, 3) not null default 0,
  minimum_quantity numeric(12, 3) not null default 0,
  expiration_date  date,
  last_price       numeric(12, 2),
  notes            text,

  -- Coluna gerada: permite filtrar a lista de compras direto na query, sem
  -- precisar de view nem de comparacao entre colunas no PostgREST.
  is_below_minimum boolean
    generated always as (current_quantity < minimum_quantity) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),

  constraint stock_items_name_nao_vazio check (length(trim(name)) > 0),
  constraint stock_items_quantidades_nao_negativas
    check (current_quantity >= 0 and minimum_quantity >= 0)
);

create index if not exists stock_items_name_idx on public.stock_items (lower(name));
create index if not exists stock_items_category_idx on public.stock_items (category);
create index if not exists stock_items_below_minimum_idx
  on public.stock_items (is_below_minimum) where is_below_minimum;
create index if not exists stock_items_expiration_idx
  on public.stock_items (expiration_date) where expiration_date is not null;

drop trigger if exists stock_items_set_updated_at on public.stock_items;
create trigger stock_items_set_updated_at
  before update on public.stock_items
  for each row execute function public.set_updated_at();

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  stock_item_id   uuid not null references public.stock_items (id) on delete cascade,
  quantity_change numeric(12, 3) not null,
  price_at_time   numeric(12, 2),

  -- consumo | reposicao | compra | ajuste
  reason     text not null default 'ajuste',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),

  constraint stock_movements_quantidade_nao_zero check (quantity_change <> 0)
);

create index if not exists stock_movements_item_idx
  on public.stock_movements (stock_item_id, created_at desc);

-- Toda movimentacao ajusta o saldo do item. Centralizar isso num trigger
-- garante que consumo manual, entrada rapida e entrada por foto nunca saiam
-- de sincronia com o historico.
--
-- O greatest(..., 0) e uma rede de seguranca: a interface ja impede consumir
-- mais do que existe, mas o saldo nunca deve ficar negativo.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.stock_items
     set current_quantity = greatest(current_quantity + new.quantity_change, 0),
         last_price = coalesce(new.price_at_time, last_price)
   where id = new.stock_item_id;

  return new;
end;
$$;

drop trigger if exists stock_movements_apply on public.stock_movements;
create trigger stock_movements_apply
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();

-- ---------------------------------------------------------------------------
-- Lista de compras - itens avulsos que nao fazem parte do estoque de rotina
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_list_extras (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  quantity   numeric(12, 3),
  unit       text,
  is_done    boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),

  constraint shopping_list_extras_name_nao_vazio check (length(trim(name)) > 0)
);

create index if not exists shopping_list_extras_pendentes_idx
  on public.shopping_list_extras (created_at) where not is_done;

-- ---------------------------------------------------------------------------
-- Manutencao
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_items (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text,
  frequency_days integer not null,
  last_done_date date not null default current_date,

  -- date + integer e imutavel no Postgres, entao da para materializar o
  -- vencimento e ordenar a lista por urgencia com um order by simples.
  next_due_date date
    generated always as (last_done_date + frequency_days) stored,

  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),

  constraint maintenance_items_name_nao_vazio check (length(trim(name)) > 0),
  constraint maintenance_items_frequencia_positiva check (frequency_days > 0)
);

create index if not exists maintenance_items_due_idx
  on public.maintenance_items (next_due_date);

drop trigger if exists maintenance_items_set_updated_at on public.maintenance_items;
create trigger maintenance_items_set_updated_at
  before update on public.maintenance_items
  for each row execute function public.set_updated_at();

create table if not exists public.maintenance_log (
  id                  uuid primary key default gen_random_uuid(),
  maintenance_item_id uuid not null references public.maintenance_items (id) on delete cascade,
  done_date           date not null default current_date,
  done_by             uuid references public.profiles (id) on delete set null default auth.uid(),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists maintenance_log_item_idx
  on public.maintenance_log (maintenance_item_id, done_date desc);

-- ---------------------------------------------------------------------------
-- Configuracoes do app (linha unica, compartilhada pela casa)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                  boolean primary key default true,
  expiry_warning_days integer not null default 5,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles (id) on delete set null,

  constraint app_settings_linha_unica check (id),
  constraint app_settings_janela_valida check (expiry_warning_days between 1 and 90)
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;


-- ===========================================================================
-- 0002_rls.sql - Row Level Security
--
-- Regra da casa: todo mundo que esta autenticado no projeto ve e edita tudo.
-- Nao ha permissao granular por usuario - e uso familiar, nao corporativo.
-- O que a RLS garante aqui e que ninguem *anonimo* alcance os dados.
--
-- A unica excecao e profiles: qualquer um da casa le todos os nomes (para
-- exibir "feito por Fulano"), mas so o dono edita o proprio nome.
-- ===========================================================================

alter table public.profiles enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.shopping_list_extras enable row level security;
alter table public.maintenance_items enable row level security;
alter table public.maintenance_log enable row level security;
alter table public.app_settings enable row level security;

-- profiles
drop policy if exists "profiles: a casa le todos" on public.profiles;
create policy "profiles: a casa le todos"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles: cada um edita o proprio" on public.profiles;
create policy "profiles: cada um edita o proprio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Tabelas de uso compartilhado
drop policy if exists "stock_items: acesso da casa" on public.stock_items;
create policy "stock_items: acesso da casa"
  on public.stock_items for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "stock_movements: acesso da casa" on public.stock_movements;
create policy "stock_movements: acesso da casa"
  on public.stock_movements for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "shopping_list_extras: acesso da casa" on public.shopping_list_extras;
create policy "shopping_list_extras: acesso da casa"
  on public.shopping_list_extras for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "maintenance_items: acesso da casa" on public.maintenance_items;
create policy "maintenance_items: acesso da casa"
  on public.maintenance_items for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "maintenance_log: acesso da casa" on public.maintenance_log;
create policy "maintenance_log: acesso da casa"
  on public.maintenance_log for all
  to authenticated
  using (true)
  with check (true);

-- app_settings: linha unica, so leitura e atualizacao
drop policy if exists "app_settings: a casa le" on public.app_settings;
create policy "app_settings: a casa le"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "app_settings: a casa ajusta" on public.app_settings;
create policy "app_settings: a casa ajusta"
  on public.app_settings for update
  to authenticated
  using (true)
  with check (true);


-- ===========================================================================
-- 0003_functions.sql - operacoes atomicas
--
-- As funcoes abaixo rodam como SECURITY INVOKER (padrao), entao a RLS
-- continua valendo: quem nao esta autenticado nao consegue executa-las de
-- forma util.
-- ===========================================================================

-- Marcar manutencao como feita
--
-- Grava no historico E atualiza last_done_date numa transacao so, para os dois
-- nunca discordarem. next_due_date se recalcula sozinho (coluna gerada).
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

-- Aplicar varias entradas de estoque de uma vez
--
-- Substituida por uma versao mais completa em 0006 (reaproveita item pelo
-- nome); mantida aqui so pela ordem historica das migrations.
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


-- ===========================================================================
-- 0004_perfis_resilientes.sql - garantir que todo usuario tenha perfil
--
-- Motivo: created_by/updated_by referenciam public.profiles, entao um usuario
-- sem perfil nao consegue gravar nada - o insert morre em violacao de chave
-- estrangeira. Depender so do trigger em auth.users se mostrou fragil:
--
--   - usuario criado pelo painel (Authentication > Users) ou pela admin API;
--   - usuario que ja existia antes das migrations rodarem;
--   - o Supabase restringindo permissao de criar trigger no schema auth.
-- ===========================================================================

-- 1) Backfill primeiro: se a criacao do trigger falhar por falta de permissao
-- no schema auth, quem ja tem conta continua desbloqueado.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(u.email, 'alguem@casa'), '@', 1)
  )
from auth.users u
on conflict (id) do nothing;

-- 2) Politica de INSERT em profiles: rede de seguranca de que o app precisa
-- quando o trigger nao existe.
drop policy if exists "profiles: cria o proprio" on public.profiles;
create policy "profiles: cria o proprio"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- 3) Funcao chamada pelo app quando o perfil ainda nao existe. SECURITY
-- DEFINER para conseguir ler auth.users e descobrir o nome.
create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.profiles;
  v_id uuid := auth.uid();
begin
  if v_id is null then
    raise exception 'Sem usuario autenticado';
  end if;

  select * into v_perfil from public.profiles where id = v_id;
  if found then
    return v_perfil;
  end if;

  insert into public.profiles (id, display_name)
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(u.email, 'alguem@casa'), '@', 1)
    )
  from auth.users u
  where u.id = v_id
  on conflict (id) do nothing;

  select * into v_perfil from public.profiles where id = v_id;
  return v_perfil;
end;
$$;

-- 4) Reinstalar o trigger, sem deixar a falta de permissao abortar o script
do $$
begin
  begin
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  exception
    when insufficient_privilege then
      raise warning 'Sem permissao para criar o trigger em auth.users. '
        'Nao tem problema: o app cria o perfil sozinho via ensure_profile().';
  end;
end;
$$;


-- ===========================================================================
-- 0005_receitas_em_andamento.sql
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

-- Concluir a receita: baixa no estoque e encerramento, numa transacao so.
--
-- Recebe os consumos ja conferidos pela tela, e nao os que foram salvos ao
-- iniciar: quem cozinha ajusta quantidade no meio do caminho, e o que vale e
-- o que saiu de verdade da despensa.
--
-- Formato de cada consumo: { "stock_item_id": "uuid", "quantidade": 0.4 }
--
-- Consumo sem stock_item_id, ou com quantidade zero, e ignorado: e o caso do
-- ingrediente que foi comprado na hora e nunca entrou no estoque.
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


-- ===========================================================================
-- 0006_entradas_reaproveitam_item_existente.sql
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
-- seguranca, porque a Server Action e um endpoint publico. Substitui a versao
-- de 0003.
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
