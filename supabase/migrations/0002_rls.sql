-- ===========================================================================
-- Casa em Ordem - Row Level Security
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

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Tabelas de uso compartilhado
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- app_settings: linha unica, so leitura e atualizacao
-- ---------------------------------------------------------------------------
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
