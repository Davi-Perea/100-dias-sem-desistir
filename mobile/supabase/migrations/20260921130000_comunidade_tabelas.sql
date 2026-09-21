-- =============================================================================
-- COMUNIDADE (V2) — 1/3: tipos, tabelas, RLS e privilégios
--
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase db reset && supabase test db
--
-- Nada disto vai para a V1: o app só chama estas RPCs com COMMUNITY_ENABLED ligado
-- (mobile/src/config/features.ts). Arquitetura: docs/technical/COMUNIDADE_V2_ARQUITETURA.md
-- Base de decisão: docs/product/comunidade/00-DECISOES.md (decisões do fundador em 2026-09-21).
--
-- PRINCÍPIO: o cliente NUNCA lê nem escreve as tabelas de conteúdo direto. Toda a
-- superfície é RPC (private.* SECURITY DEFINER + invólucro public.* SECURITY INVOKER,
-- mesmo padrão da fundação, D3). Por isso:
--   * anon e authenticated não têm privilégio de tabela (revoke all), a não ser nas
--     duas exceções abaixo (Amém próprio e consentimentos próprios);
--   * RLS ligada em todas; sem policy = nega tudo, mesmo que alguém conceda um GRANT
--     por engano no futuro (defesa em profundidade);
--   * o cliente nunca recebe o user_id de outra pessoa: bloquear e denunciar partem
--     do id do post ou do comentário.
-- =============================================================================

-- digest() e gen_random_bytes() do pgcrypto (no Supabase ele mora em "extensions").
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
-- Fluxo: (enviado, só no aparelho) -> in_review -> published | not_published.
-- 'removed' = estava publicado e a moderação tirou do ar.
create type public.community_content_status as enum ('in_review', 'published', 'not_published', 'removed');
create type public.community_member_status  as enum ('active', 'suspended', 'removed');
create type public.community_report_target  as enum ('post', 'comment', 'person');
create type public.community_report_status  as enum ('open', 'actioned', 'dismissed');
create type public.community_report_reason  as enum (
  'ofensivo', 'assedio', 'spam', 'rosto_de_terceiro', 'crianca_exposta',
  'dado_pessoal', 'falso_ou_enganoso', 'risco_a_vida', 'outro'
);
create type public.community_moderation_kind as enum (
  'auto_hold',        -- filtro automático segurou para análise humana
  'urgent_hide',      -- denúncia urgente tirou do ar antes da análise
  'approve', 'reject', 'remove', 'restore',
  'dismiss_report', 'action_report',
  'suspend_member', 'remove_member', 'reinstate_member'
);

-- ---------------------------------------------------------------------------
-- Configuração (só o servidor lê). Versões e hashes dos textos que a pessoa
-- aceita. 'PENDENTE' = o texto ainda não foi aprovado (advogado + igreja): enquanto
-- estiver assim, NINGUÉM consegue aceitar, e portanto ninguém publica.
-- ---------------------------------------------------------------------------
create table private.community_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
insert into private.community_settings (key, value) values
  ('publish_consent_version', 'PENDENTE'),   -- consentimento específico (LGPD art. 11, I)
  ('publish_consent_sha256',  'PENDENTE'),
  ('rules_version',           'PENDENTE'),   -- regras da comunidade (Google Play UGC)
  ('rules_sha256',            'PENDENTE'),
  ('campaign_start',          '2026-09-23'), -- dia 1 dos 100 Dias
  ('feed_window_days',        '7'),          -- feed com fim: só a última semana
  ('report_due_hours',        '24'),         -- Apple 1.2: denúncia tratada em até 24 h; a tela só promete prazo com REVIEW_HOURS
  ('urgent_report_due_hours', '4'),          -- criança, rosto de terceiro, risco à vida (PROPOSTA)
  ('max_posts_per_day',       '10'),
  ('max_comments_per_day',    '60'),
  ('max_reports_per_day',     '20');

-- Lista própria da igreja (e, depois, a do ToxiBR). Termos já normalizados
-- (minúsculas, sem acento). Quem mantém: o responsável pelas regras (04-moderacao.md).
create table private.community_filter_terms (
  term       text primary key check (term = lower(term) and char_length(term) between 2 and 80),
  added_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Códigos de entrada (opção (a): a igreja inteira, com código). Fora da API:
-- nunca o código em claro, só o hash. Um código por líder/ministério (label).
-- ---------------------------------------------------------------------------
create table private.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code_sha256 text not null unique check (code_sha256 ~ '^[0-9a-f]{64}$'),
  label       text not null check (char_length(trim(label)) between 1 and 120),
  created_by  uuid references auth.users(id) on delete set null,
  max_uses    int  not null check (max_uses between 1 and 5000),
  uses        int  not null default 0 check (uses >= 0),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Força bruta no código: tentativas por usuário (a RPC limita a 5 por hora).
create table private.invite_code_attempts (
  user_id      uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index invite_code_attempts_idx on private.invite_code_attempts (user_id, attempted_at desc);

-- Arquivos a apagar do Storage. Apagar linha de storage.objects por SQL deixa o
-- arquivo órfão; quem apaga de verdade é a Edge Function (service_role) pela API
-- do Storage, drenando esta fila.
create table private.storage_deletion_queue (
  bucket_id   text not null,
  object_name text not null,
  enqueued_at timestamptz not null default now(),
  attempts    int  not null default 0,
  last_try_at timestamptz,
  primary key (bucket_id, object_name)
);

-- ---------------------------------------------------------------------------
-- community_profiles — quem entrou na comunidade (com código) e o nome que usa
-- nela. Conta só 18+: a entrada exige a autodeclaração, registrada aqui.
-- ---------------------------------------------------------------------------
create table public.community_profiles (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null check (char_length(trim(display_name)) between 1 and 40),
  status            public.community_member_status not null default 'active',
  invite_code_id    uuid references private.invite_codes(id) on delete set null,
  adult_attested_at timestamptz not null,
  joined_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index community_profiles_code_idx on public.community_profiles (invite_code_id) where invite_code_id is not null;

create trigger community_profiles_touch_updated_at
  before update on public.community_profiles
  for each row execute function public.touch_updated_at();

-- Moderadores da igreja. Sem policy de escrita: entra por admin_set_community_moderator()
-- ou pela chave de serviço.
create table public.community_moderators (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);
create index community_moderators_granted_by_idx on public.community_moderators (granted_by) where granted_by is not null;

-- ---------------------------------------------------------------------------
-- consent_records — consentimento específico (publicar) e aceite das regras,
-- com versão e hash do texto exibido. Append-only pelo cliente (via RPC).
-- RETENÇÃO: on delete cascade = a prova some com a conta. Decisão jurídica
-- pendente (03-dados-e-seguranca.md §2.4); cascata é o lado conservador da LGPD.
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  purpose      text not null check (purpose in ('community_publish', 'community_rules')),
  text_version text not null check (char_length(text_version) between 1 and 60),
  text_sha256  text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  app_version  text check (char_length(app_version) <= 40),
  accepted_at  timestamptz not null default now(),
  revoked_at   timestamptz
);
create index consent_records_active_idx on public.consent_records (user_id, purpose) where revoked_at is null;

-- ---------------------------------------------------------------------------
-- community_posts — texto e/ou uma foto. O nome do arquivo NÃO leva user_id
-- (aparece na URL assinada): '<uuid aleatório>.jpg'.
-- ---------------------------------------------------------------------------
create table public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users(id) on delete cascade,
  body         text check (body is null or char_length(trim(body)) between 1 and 2000),
  photo_path   text unique check (photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
  day_number   smallint check (day_number between 1 and 100),
  status       public.community_content_status not null default 'in_review',
  -- Por que está em análise: 'foto' | 'termo' | 'link' | 'contato' | 'denuncia'.
  hold_reason  text check (hold_reason in ('foto', 'termo', 'link', 'contato', 'denuncia')),
  consent_id   bigint references public.consent_records(id) on delete set null,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  decided_at   timestamptz,
  -- Recusado/removido pode ter perdido a foto (apagada por nós); o resto precisa de conteúdo.
  constraint community_post_has_content check (
    status in ('not_published', 'removed') or body is not null or photo_path is not null
  ),
  constraint community_post_published_has_date check (status <> 'published' or published_at is not null)
);
create index community_posts_feed_idx   on public.community_posts (published_at desc, id desc) where status = 'published';
create index community_posts_author_idx on public.community_posts (author_id, created_at desc);
create index community_posts_queue_idx  on public.community_posts (created_at) where status = 'in_review';
create index community_posts_consent_idx on public.community_posts (consent_id) where consent_id is not null;

-- ---------------------------------------------------------------------------
-- community_comments — "chegar na pessoa" = comentar no post dela (sem mensagem privada).
-- ---------------------------------------------------------------------------
create table public.community_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.community_posts(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(trim(body)) between 1 and 1000),
  status       public.community_content_status not null default 'in_review',
  hold_reason  text check (hold_reason in ('termo', 'link', 'contato', 'denuncia')),
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  decided_at   timestamptz,
  constraint community_comment_published_has_date check (status <> 'published' or published_at is not null)
);
create index community_comments_post_idx   on public.community_comments (post_id, created_at);
create index community_comments_author_idx on public.community_comments (author_id, created_at desc);
create index community_comments_queue_idx  on public.community_comments (created_at) where status = 'in_review';

-- ---------------------------------------------------------------------------
-- community_amens — um Amém por pessoa por post. SEM coluna de contagem em lugar
-- nenhum; ninguém (nem o autor) lê as linhas dos outros.
-- ---------------------------------------------------------------------------
create table public.community_amens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index community_amens_post_idx on public.community_amens (post_id);

-- ---------------------------------------------------------------------------
-- community_blocks — a linha é unidirecional; o EFEITO é nos dois sentidos
-- (private.blocked_between).
-- ---------------------------------------------------------------------------
create table public.community_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index community_blocks_blocked_idx on public.community_blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- community_reports — publicação, comentário ou pessoa.
-- ---------------------------------------------------------------------------
create table public.community_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references auth.users(id) on delete set null,
  target_kind      public.community_report_target not null,
  post_id          uuid references public.community_posts(id) on delete set null,
  comment_id       uuid references public.community_comments(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason           public.community_report_reason not null,
  details          text check (char_length(details) <= 500),
  urgent           boolean not null default false,
  status           public.community_report_status not null default 'open',
  created_at       timestamptz not null default now(),
  due_at           timestamptz not null,
  resolved_at      timestamptz,
  resolved_by      uuid references auth.users(id) on delete set null
);
create index community_reports_open_idx     on public.community_reports (urgent desc, due_at) where status = 'open';
create index community_reports_post_idx     on public.community_reports (post_id) where post_id is not null;
create index community_reports_comment_idx  on public.community_reports (comment_id) where comment_id is not null;
create index community_reports_reporter_idx on public.community_reports (reporter_id, created_at desc) where reporter_id is not null;
create index community_reports_user_idx     on public.community_reports (reported_user_id) where reported_user_id is not null;
create index community_reports_resolver_idx on public.community_reports (resolved_by) where resolved_by is not null;
-- Mesma pessoa não denuncia o mesmo alvo duas vezes enquanto a denúncia está aberta.
create unique index community_reports_open_post_uq    on public.community_reports (reporter_id, post_id)
  where status = 'open' and target_kind = 'post';
create unique index community_reports_open_comment_uq on public.community_reports (reporter_id, comment_id)
  where status = 'open' and target_kind = 'comment';
create unique index community_reports_open_person_uq  on public.community_reports (reporter_id, reported_user_id)
  where status = 'open' and target_kind = 'person';

-- ---------------------------------------------------------------------------
-- community_moderation_actions — tudo o que a moderação (pessoa ou filtro) fez.
-- O autor lê o motivo das ações sobre o conteúdo dele (ECA Digital arts. 29–30;
-- Tema 987: motivo e se foi pessoa ou máquina).
-- ---------------------------------------------------------------------------
create table public.community_moderation_actions (
  id               bigserial primary key,
  actor_id         uuid references auth.users(id) on delete set null,
  decided_by       text not null check (decided_by in ('pessoa', 'automatico')),
  kind             public.community_moderation_kind not null,
  post_id          uuid references public.community_posts(id) on delete set null,
  comment_id       uuid references public.community_comments(id) on delete set null,
  target_user_id   uuid references auth.users(id) on delete set null,
  report_id        uuid references public.community_reports(id) on delete set null,
  reason           public.community_report_reason,
  note_for_author  text check (char_length(note_for_author) <= 500),
  created_at       timestamptz not null default now()
);
create index community_mod_actions_post_idx    on public.community_moderation_actions (post_id, created_at desc) where post_id is not null;
create index community_mod_actions_comment_idx on public.community_moderation_actions (comment_id, created_at desc) where comment_id is not null;
create index community_mod_actions_actor_idx   on public.community_moderation_actions (actor_id) where actor_id is not null;
create index community_mod_actions_target_idx  on public.community_moderation_actions (target_user_id) where target_user_id is not null;
create index community_mod_actions_report_idx  on public.community_moderation_actions (report_id) where report_id is not null;

-- =============================================================================
-- RLS e privilégios
-- =============================================================================
alter table public.community_profiles           enable row level security;
alter table public.community_moderators         enable row level security;
alter table public.consent_records              enable row level security;
alter table public.community_posts              enable row level security;
alter table public.community_comments           enable row level security;
alter table public.community_amens              enable row level security;
alter table public.community_blocks             enable row level security;
alter table public.community_reports            enable row level security;
alter table public.community_moderation_actions enable row level security;

-- O Supabase concede tudo a anon/authenticated em tabela nova de public. Tira.
revoke all on public.community_profiles, public.community_moderators, public.consent_records,
              public.community_posts, public.community_comments, public.community_amens,
              public.community_blocks, public.community_reports, public.community_moderation_actions
  from anon, authenticated;
revoke all on sequence public.consent_records_id_seq, public.community_moderation_actions_id_seq
  from anon, authenticated;

-- Tabelas de private: ninguém do app (o schema já não é exposto; isto é redundância).
revoke all on private.community_settings, private.community_filter_terms, private.invite_codes,
              private.invite_code_attempts, private.storage_deletion_queue
  from public, anon, authenticated;

-- EXCEÇÃO 1 — Amém: cada pessoa lê SÓ a própria linha, e sem a coluna user_id.
-- `HEAD /community_amens?post_id=eq.X` com `Prefer: count=exact` devolve 0 ou 1: o
-- Amém de quem pergunta. Nem o autor do post alcança o total. Escrita só por set_amen().
grant select (post_id, created_at) on public.community_amens to authenticated;
create policy "vejo só o meu amém" on public.community_amens
  for select to authenticated
  using (user_id = (select auth.uid()));

-- EXCEÇÃO 2 — consentimentos: a pessoa lê os próprios (recibo do que aceitou).
-- Escrita só por accept_community_terms() / revoke_community_publish_consent().
grant select (id, purpose, text_version, text_sha256, app_version, accepted_at, revoked_at)
  on public.consent_records to authenticated;
create policy "vejo meus consentimentos" on public.consent_records
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Todas as outras tabelas: RLS ligada e NENHUMA policy = nega tudo ao cliente.
-- Quem lê e escreve são as funções de private (dono da tabela), que aplicam as
-- regras de visibilidade explicitamente (migration 2/3).
