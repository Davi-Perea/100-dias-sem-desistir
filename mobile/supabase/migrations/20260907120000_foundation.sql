-- =============================================================================
-- EXECUTION 02 — Fundação de identidade, grupos e papéis
-- MASTER PRODUCT SPEC v1.1 §12, §13, §19, §20, §21, §24
--
-- ESCOPO DELIBERADAMENTE MÍNIMO. Só existe aqui o necessário para provar
-- identidade + membership + papéis. NÃO estão neste schema, de propósito:
--   group_posts, reactions, reports, blocks, push, progresso na nuvem.
-- Eles entram quando a execução correspondente começar.
--
-- LOCAL-ONLY por decisão de produto (nunca virão para cá): jejum diário,
-- reflexões privadas, posição de leitura e preferências (spec §9, §11, §21).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema privado: funções auxiliares e SECURITY DEFINER moram aqui.
-- NÃO entra em "db_schemas" do PostgREST (config.toml / painel), então nada daqui
-- é chamável pela API. "authenticated" recebe USAGE só para que as policies
-- consigam chamar as funções auxiliares; EXECUTE é concedido função a função.
-- (Correção de segurança 2026-09-21, ver docs/technical/SEGURANCA_MIGRATIONS_CORRECOES.md)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
-- service_role (chave de serviço: painel admin, Edge Functions) ignora RLS mas NÃO é
-- superusuário: sem USAGE aqui, todo UPDATE em profiles/group_memberships feito pelo
-- servidor falharia nos triggers de guarda com "permission denied for schema private".
grant usage on schema private to service_role;

-- ATENÇÃO: por schema, isto só remove o grant a anon que o Supabase configura em
-- public. O EXECUTE de PUBLIC é padrão GLOBAL do Postgres e NÃO sai daqui: a doc do
-- ALTER DEFAULT PRIVILEGES diz que o padrão por schema só soma ao global, não tira.
-- Toda função nova precisa de `revoke all ... from public, anon` explícito e de
-- grant explícito a quem usa. O teste 03 confere que nenhuma tem EXECUTE para PUBLIC.
-- (Não trocado pela forma global "for role postgres ... from public": também valeria
-- para extensões criadas depois, como o pgtap, e não foi testado.)
alter default privileges in schema public  revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.group_status as enum ('active', 'archived');
create type public.group_role as enum ('member', 'leader');
create type public.membership_status as enum ('active', 'left', 'removed');
create type public.account_status as enum ('active', 'suspended', 'deletion_requested');

-- ---------------------------------------------------------------------------
-- profiles — 1:1 com auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null check (char_length(trim(display_name)) between 1 and 60),
  -- Preenchido apenas quando/se o launch gate de menores for definido (spec §25).
  -- Nada neste schema decide a questão jurídica; o campo só existe para não exigir
  -- migração quando a regra chegar.
  age_band       text check (age_band in ('under_13', '13_15', '16_17', '18_plus')),
  account_status public.account_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.profiles.account_status is
  'Protegido: o cliente não pode alterar (ver trigger guard_profile_protected_columns).';

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 80),
  description text check (char_length(description) <= 280),
  status      public.group_status not null default 'active',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- group_memberships — a autoridade sobre `role` é do servidor
-- ---------------------------------------------------------------------------
create table public.group_memberships (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      public.group_role not null default 'member',
  status    public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

comment on column public.group_memberships.role is
  'NUNCA definido pelo cliente. Só muda por admin_set_group_role() (SECURITY DEFINER).';

-- ---------------------------------------------------------------------------
-- app_admins — sem nenhuma policy de escrita; só service_role popula
-- ---------------------------------------------------------------------------
create table public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  -- set null: a exclusão de conta de quem concedeu não pode ser bloqueada (LGPD art. 18, VI).
  granted_by uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- admin_audit_log — toda ação administrativa deixa rastro
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id              bigserial primary key,
  -- set null: sem isso, apagar a conta de um admin (ou de alguém que sofreu ação
  -- administrativa) falharia por violação de FK, e a exclusão da conta travaria.
  actor_id        uuid references auth.users(id) on delete set null,
  action          text not null,
  target_user_id  uuid references auth.users(id) on delete set null,
  target_group_id uuid references public.groups(id) on delete set null,
  meta            jsonb,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index group_memberships_user_active_idx
  on public.group_memberships (user_id) where status = 'active';
create index group_memberships_group_active_idx
  on public.group_memberships (group_id) where status = 'active';
create index groups_active_idx on public.groups (status) where status = 'active';
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
-- Sem índice, cada exclusão de conta faria varredura completa do log para o set null.
create index admin_audit_log_actor_idx  on public.admin_audit_log (actor_id)       where actor_id is not null;
create index admin_audit_log_target_idx on public.admin_audit_log (target_user_id) where target_user_id is not null;
create index app_admins_granted_by_idx  on public.app_admins (granted_by)          where granted_by is not null;

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil criado automaticamente no cadastro. SECURITY DEFINER porque roda no
-- contexto do trigger de auth.users, onde o usuário ainda não tem sessão.
-- Fica em "private" (fora da API) com search_path vazio.
--
-- Nome padrão NÃO usa mais o e-mail: (1) sessão anônima não tem e-mail e o
-- display_name NOT NULL derrubava o cadastro; (2) parte local com > 60 caracteres
-- violava o check e derrubava o cadastro; (3) o prefixo do e-mail é dado pessoal
-- que o líder passaria a ver sem necessidade.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 60), ''), 'Participante')
  )
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- =============================================================================
-- GUARDAS DE ESCALADA DE PRIVILÉGIO
--
-- RLS decide QUAIS LINHAS o usuário alcança; não sabe comparar valor antigo com
-- novo numa UPDATE. Estes triggers cobrem exatamente essa lacuna: mesmo que uma
-- policy futura seja afrouxada por engano, o papel continua imutável pelo cliente.
-- =============================================================================

/**
 * Só a função administrativa liga esta chave, e apenas dentro da própria
 * transação (set_config com is_local = true). Nenhum caminho de cliente a liga.
 *
 * Fica em "private". Os triggers abaixo rodam como o usuário que fez a UPDATE
 * (security invoker), então "authenticated" precisa de EXECUTE nesta função;
 * ela só lê uma configuração da própria transação e não expõe nada.
 */
create or replace function private.role_change_is_authorized()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(pg_catalog.current_setting('app.role_change_authorized', true), 'off') = 'on';
$$;
revoke all on function private.role_change_is_authorized() from public, anon;
grant execute on function private.role_change_is_authorized() to authenticated;
grant execute on function private.role_change_is_authorized() to service_role;

create or replace function public.guard_membership_role()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    -- Entrar num grupo é sempre como membro comum.
    if new.role <> 'member' and not private.role_change_is_authorized() then
      raise exception 'membership só pode ser criada com role "member"'
        using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not private.role_change_is_authorized() then
      raise exception 'role só muda por ação administrativa autorizada'
        using errcode = '42501';
    end if;
    -- Trocar a linha de dono também seria escalada.
    if new.user_id is distinct from old.user_id or new.group_id is distinct from old.group_id then
      raise exception 'membership não pode trocar de usuário ou de grupo'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger group_memberships_guard_role
  before insert or update on public.group_memberships
  for each row execute function public.guard_membership_role();

create or replace function public.guard_profile_protected_columns()
returns trigger language plpgsql as $$
begin
  -- O usuário edita o próprio nome; status da conta é decisão do servidor.
  if new.account_status is distinct from old.account_status and not private.role_change_is_authorized() then
    raise exception 'account_status não pode ser alterado pelo cliente'
      using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id é imutável' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_protected_columns
  before update on public.profiles
  for each row execute function public.guard_profile_protected_columns();

-- Funções de trigger não são chamáveis como RPC e o Postgres não confere EXECUTE
-- ao disparar trigger (só ao criá-lo). Tirar o EXECUTE é só higiene.
revoke all on function public.touch_updated_at()                from public, anon, authenticated;
revoke all on function public.guard_membership_role()           from public, anon, authenticated;
revoke all on function public.guard_profile_protected_columns() from public, anon, authenticated;
