-- ===========================================================================
-- Casa em Ordem - garantir que todo usuario tenha perfil
--
-- Motivo: created_by/updated_by referenciam public.profiles, entao um usuario
-- sem perfil nao consegue gravar nada - o insert morre em violacao de chave
-- estrangeira. Depender so do trigger em auth.users se mostrou fragil:
--
--   - usuario criado pelo painel (Authentication > Users) ou pela admin API;
--   - usuario que ja existia antes das migrations rodarem;
--   - o Supabase restringindo permissao de criar trigger no schema auth.
--
-- Este script e idempotente e roda na ordem certa: primeiro desbloqueia quem
-- ja existe, depois tenta reinstalar o trigger, e por ultimo mostra o estado.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1) Backfill primeiro
--
-- Vem antes do trigger de proposito: se a criacao do trigger falhar por falta
-- de permissao no schema auth, quem ja tem conta continua desbloqueado.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2) Politica de INSERT em profiles
--
-- A funcao do trigger roda como dona da tabela e normalmente ignora a RLS,
-- mas sem esta politica nao existe nenhum caminho para o proprio usuario
-- criar a linha dele. E a rede de seguranca de que o app precisa quando o
-- trigger nao existe.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: cria o proprio" on public.profiles;
create policy "profiles: cria o proprio"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Funcao chamada pelo app quando o perfil ainda nao existe
--
-- SECURITY DEFINER para conseguir ler auth.users e descobrir o nome. E o
-- caminho de auto-cura: qualquer pessoa que entre no app sem perfil ganha um
-- na hora, venha ela de onde vier.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4) Reinstalar o trigger, sem deixar a falta de permissao abortar o script
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5) Estado final
-- ---------------------------------------------------------------------------
select
  (select count(*) from auth.users)      as usuarios,
  (select count(*) from public.profiles) as perfis,
  (select count(*) from auth.users u
     left join public.profiles p on p.id = u.id
    where p.id is null)                  as sem_perfil,
  (select count(*) > 0 from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal)              as trigger_instalado;
