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
  granted_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- admin_audit_log — toda ação administrativa deixa rastro
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id              bigserial primary key,
  actor_id        uuid references auth.users(id),
  action          text not null,
  target_user_id  uuid references auth.users(id),
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
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
 */
create or replace function public.role_change_is_authorized()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.role_change_authorized', true), 'off') = 'on';
$$;

create or replace function public.guard_membership_role()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    -- Entrar num grupo é sempre como membro comum.
    if new.role <> 'member' and not public.role_change_is_authorized() then
      raise exception 'membership só pode ser criada com role "member"'
        using errcode = '42501';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role and not public.role_change_is_authorized() then
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
  if new.account_status is distinct from old.account_status and not public.role_change_is_authorized() then
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
