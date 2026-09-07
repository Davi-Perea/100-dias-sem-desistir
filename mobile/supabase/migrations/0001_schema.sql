-- =============================================================================
-- Bible Study App — schema V1 (MASTER PRODUCT SPEC v1.1 §21)
-- Status: ARTEFATO NÃO APLICADO. Requer projeto Supabase em sa-east-1 (São Paulo).
-- Fases 5–8 do handoff. Rode com `supabase db push` após criar o projeto.
--
-- NÃO ESTÁ AQUI, DE PROPÓSITO (local-only por decisão de produto, spec §9/§11/§21):
--   * jejum diário            -> local_fasting_status (só no aparelho)
--   * reflexões privadas      -> local_private_reflections (só no aparelho)
--   * posição de leitura      -> local_reader_position
--   * preferências            -> local settings
-- Qualquer PR que adicione essas tabelas está violando o spec.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Campanha e conteúdo editorial da Jornada
-- ---------------------------------------------------------------------------
create type campaign_status as enum ('draft', 'active', 'archived');
create type publish_status as enum ('draft', 'published');
create type rights_status as enum ('dev_fixture', 'pending_authorization', 'partially_authorized', 'authorized');

create table campaigns (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  start_date         date not null,
  timezone           text not null default 'America/Sao_Paulo',
  utc_offset_minutes int  not null default -180,
  total_days         int  not null default 100 check (total_days = 100),
  status             campaign_status not null default 'draft',
  created_at         timestamptz not null default now()
);

create table journey_days (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  day_number          int  not null check (day_number between 1 and 100),

  -- Conteúdo editorial. Nulo é válido: a autorização pode ser parcial (spec §29).
  title               text,
  theme               text,
  key_verse_reference text,
  official_direction  text,
  prayer_focus        text,
  milestone           text,
  next_day_teaser     text,
  publish_status      publish_status not null default 'draft',

  -- Proveniência e direitos (spec §17). Rastreabilidade operacional, não um CMS.
  source_name         text not null,
  source_external_id  text,
  source_provider     text,
  rights_status       rights_status not null default 'pending_authorization',
  rights_reference    text,
  content_version     text not null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (campaign_id, day_number),

  -- Gate 2 no banco: conteúdo publicado exige direitos documentados.
  constraint published_requires_rights check (
    publish_status = 'draft'
    or (rights_status = 'authorized' and rights_reference is not null)
  )
);

create table day_readings (
  id                  uuid primary key default gen_random_uuid(),
  journey_day_id      uuid not null references journey_days(id) on delete cascade,
  sort_order          int  not null,
  -- Referência canônica portável, ex.: "GEN 1-3". Independente de tradução.
  canonical_reference text not null,
  unique (journey_day_id, sort_order)
);

-- ---------------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------------
create type account_status as enum ('active', 'suspended', 'deletion_requested');
create type age_band as enum ('under_13', '13_15', '16_17', '18_plus');

create table profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 1 and 60),
  age_band       age_band,
  account_status account_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Consentimento LGPD versionado (dado sensível: convicção religiosa).
create table consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  purpose        text not null,
  policy_version text not null,
  granted        boolean not null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz
);

-- Progresso agregável na nuvem. A fonte de verdade offline continua sendo o aparelho.
create table user_day_completions (
  user_id      uuid not null references auth.users(id) on delete cascade,
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  day_number   int  not null check (day_number between 1 and 100),
  completed_at timestamptz not null default now(),
  primary key (user_id, campaign_id, day_number)
);

-- ---------------------------------------------------------------------------
-- Grupos e papéis (spec §12, §13). Papéis são server-side: ninguém se autopromove.
-- ---------------------------------------------------------------------------
create type group_status as enum ('active', 'archived');
create type group_role as enum ('member', 'leader');
create type membership_status as enum ('active', 'left', 'removed');

create table groups (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete set null,
  name        text not null,
  description text,
  status      group_status not null default 'active',
  created_at  timestamptz not null default now()
);

create table group_memberships (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       group_role not null default 'member',
  status     membership_status not null default 'active',
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Admin global. Nunca editável pelo cliente (ver policies).
create table app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- Social mínimo (spec §14): sem DM, sem comentários, sem seguidores.
-- ---------------------------------------------------------------------------
create type post_type as enum ('insight', 'direction', 'announcement');
create type moderation_status as enum ('visible', 'hidden', 'removed');

create table group_posts (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references groups(id) on delete cascade,
  author_id         uuid not null references auth.users(id) on delete cascade,
  type              post_type not null default 'insight',
  day_number        int check (day_number between 1 and 100),
  body              text not null check (char_length(body) between 1 and 500),
  pinned            boolean not null default false,
  moderation_status moderation_status not null default 'visible',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table reactions (
  post_id       uuid not null references group_posts(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'amen',
  created_at    timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Segurança e moderação (spec §24; exigências de UGC das lojas)
-- ---------------------------------------------------------------------------
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'user')),
  target_id   uuid not null,
  reason      text not null,
  status      report_status not null default 'open',
  reviewed_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table blocks (
  blocker_id      uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table device_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null check (platform in ('ios', 'android')),
  expo_token  text,
  native_token text,
  app_version text,
  last_seen_at timestamptz not null default now(),
  unique (user_id, native_token)
);

create table notification_preferences (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  group_push_enabled boolean not null default false,
  church_push_enabled boolean not null default false,
  updated_at         timestamptz not null default now()
);

create table admin_audit_log (
  id         bigserial primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,
  target     text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- Limite de 1 push por grupo a cada 24h e 1 comunicação geral por dia (spec §15).
create table push_dispatch_log (
  id          bigserial primary key,
  group_id    uuid references groups(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  scope       text not null check (scope in ('group', 'church')),
  sent_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index on journey_days (campaign_id, day_number);
create index on day_readings (journey_day_id, sort_order);
create index on user_day_completions (campaign_id, day_number);
create index on group_memberships (user_id) where status = 'active';
create index on group_posts (group_id, created_at desc) where moderation_status = 'visible';
create index on reactions (post_id);
create index on reports (status, created_at desc);
create index on device_push_tokens (user_id);
create index on push_dispatch_log (group_id, sent_at desc);
