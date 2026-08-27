-- ===========================================================================
-- Casa em Ordem - schema inicial
--
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute. E idempotente:
-- rodar de novo nao quebra nada.
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
