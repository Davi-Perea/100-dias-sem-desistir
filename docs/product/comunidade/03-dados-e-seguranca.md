# Comunidade — frente 03: dados e segurança

- **Data:** 2026-09-21
- **Autor:** Claude (Principal Mobile Engineer + Technical Architect)
- **Status:** INSUMO PARA DECISÃO. Nada aqui foi implementado. Nenhuma migration foi criada, e o SQL abaixo é
  **esboço para comparar opções**, não código pronto para aplicar.
- **Pergunta que este documento ajuda a responder:** *quem vê os posts?*
  - **(a)** a igreja inteira, com um mecanismo de entrada (convite/código);
  - **(b)** só o grupo da pessoa;
  - **(c)** qualquer um que baixar o app.
- **O que li antes:** `mobile/supabase/migrations/20260907120000_foundation.sql`, `…120100_rls.sql`,
  `docs/technical/SECURITY_V0.md`, `docs/technical/ADR-002-backend.md`, `docs/design/00-DECISAO-FEED.md`,
  `design_handoff_100_dias/REGRAS.md` §3, `TELAS.md` grupo C, `LACUNAS.md` B3–B12,
  `docs/technical/MOBILE_STORE_REQUIREMENTS.md` e `docs/research/STORES_LEGAL_RESEARCH.md` (trechos de UGC, ECA Digital e Marco Civil).
- **Convenção:** FATO (fonte + data de acesso) · INFERÊNCIA (dedução minha a partir de fatos) · HIPÓTESE (não verificado,
  precisa de teste ou de decisão) · RECOMENDAÇÃO. Fontes numeradas `[Sn]` no fim.

---

## 0. Resumo para quem decide

1. **O que muda o risco não é a tabela, é quem consegue uma sessão.** O banco e as políticas são quase idênticos nas
   três opções; o que muda é uma única função (`private.can_see_community()`) e o caminho de entrada. Em (c), qualquer
   pessoa consegue uma sessão com a chave pública do app, então **tudo o que o feed mostra é, na prática, público na
   internet**, e raspável por script. (INFERÊNCIA a partir de [S1] e [S4].)
2. **(a) com código é a opção que cabe na promessa da tela C3** ("Vai aparecer para toda a igreja"). A tela C4 hoje diz
   outra coisa ("Qualquer pessoa que baixar o app vê"). **As duas cópias se contradizem**, e a escolhida aqui decide qual
   das duas está certa. O consentimento (LGPD art. 11, I) só vale se disser a verdade sobre o alcance.
3. **(b) tem um furo já no schema existente:** a policy `"entro em grupo ativo como membro"` deixa **qualquer usuário
   autenticado entrar em qualquer grupo ativo** sozinho, e o catálogo de grupos é legível por todos. Com (b) do jeito que
   está, "só o meu grupo" significaria "qualquer um que se inscrever no meu grupo". Precisa ser trocada por entrada via
   código ou aprovação do líder antes de qualquer post existir.
4. **A regra "ninguém vê quantos Amém" só existe se o banco negar.** Com a política certa (cada pessoa lê só a própria
   reação) e sem coluna de contagem, a API REST não tem como devolver o total. Com a política do schema antigo (membro lê
   as reações do grupo), um `HEAD` com `Prefer: count=exact` devolve o número em um cabeçalho. (FATO sobre o mecanismo
   [S2]; INFERÊNCIA sobre o efeito.)
5. **A exclusão de conta não apaga fotos sozinha.** O Supabase avisa que apagar linha de `storage.objects` por SQL deixa
   o arquivo órfão [S6]; a cascata de chave estrangeira não alcança o Storage. Precisa de Edge Function + fila de
   exclusão. Isso vale nas três opções.
6. **Remoção do EXIF (GPS) não está confirmada** pela documentação do `expo-image-manipulator` [S10]. É preciso testar com
   arquivo real antes de prometer "sem localização".
7. **Custo de infraestrutura é praticamente igual** nas três (Supabase Pro US$ 25/mês cobre com folga o volume estimado
   [S7][S8]). **O custo que muda é o humano (moderação) e o jurídico (LGPD)**, e ambos crescem de (b) para (a) para (c).

**RECOMENDAÇÃO:** (a), com códigos por líder/ministério, revogáveis e com validade; bucket **privado** com URL assinada;
acesso **só por RPC** (o cliente nunca lê as tabelas de conteúdo direto e nunca vê o `user_id` de outra pessoa).
Justificativa e condições na §6.

---

## 1. Premissas de segurança que valem para as três opções

| # | Premissa | Classificação |
|---|---|---|
| P1 | A chave do app (`anon`, ou a nova `publishable`) está dentro do binário e é **pública por definição**. O Supabase a descreve como segura para expor, e diz que quem decide o que ela alcança é a RLS [S1]. | FATO [S1] |
| P2 | O Supabase está **descontinuando as chaves `anon` e `service_role` até o fim de 2026**, em favor de `sb_publishable_…` e `sb_secret_…` [S1]. O `config.ts` do app lê `EXPO_PUBLIC_SUPABASE_ANON_KEY`. O projeto, quando for criado, já deve nascer com a publishable key. | FATO [S1]; INFERÊNCIA sobre o impacto |
| P3 | RLS vale para toda consulta que chega pelo Postgres, inclusive via API [S3]. **Views ignoram RLS por padrão** (criadas pelo dono `postgres`), a menos que tenham `security_invoker = true` [S3]. | FATO [S3] |
| P4 | Função `security definer` num schema exposto é **chamável pela API com os privilégios do criador**; o Supabase recomenda não criá-las em schemas expostos [S3]. As migrations atuais põem `is_app_admin()`, `is_group_member()` e `is_group_leader()` em `public`. Elas só respondem sobre o próprio chamador, então o risco é baixo, mas o padrão novo deve usar um schema `private` não exposto para funções auxiliares, e deixar em `public` só as RPCs que **devem** ser chamadas pelo app, cada uma com verificação própria. | FATO [S3]; INFERÊNCIA sobre o risco atual |
| P5 | A contagem exata da API REST sai por `Prefer: count=exact` (inclusive em `HEAD`, só cabeçalho `Content-Range: 0-24/N`) [S2]. A contagem é um `count(*)` executado com o papel do chamador, portanto **respeita a RLS**: conta só as linhas que a política deixa ver. | FATO sobre o mecanismo [S2]; INFERÊNCIA sobre a RLS (decorre de [S3]) — **testar** |
| P6 | Funções de agregação (`count()`, `sum()` no `select`) vêm **desligadas por padrão** no PostgREST (`db-aggregates-enabled`) [S5]. Não ligar. | FATO [S5] |
| P7 | Bucket **público**: qualquer pessoa com a URL baixa o arquivo, sem RLS no download. Bucket **privado**: todo download passa pela RLS; só com JWT ou URL assinada [S4]. Gerar URL assinada exige policy de `SELECT` em `storage.objects` [S9]. | FATO [S4][S9] |
| P8 | Apagar objeto por SQL **não** remove o arquivo do bucket e o deixa órfão; deve-se usar a Storage API [S6]. | FATO [S6] |
| P9 | Sessão anônima (`signInAnonymously`) gera um JWT com `is_anonymous`; a policy pode diferenciar anônimo de permanente; o Supabase **recomenda fortemente CAPTCHA/Turnstile** para ela; limite padrão de 30 pedidos/hora por IP, ajustável [S11]. | FATO [S11] |
| P10 | Apple 1.2 exige: filtro de material objetável **antes** de ser postado, denúncia com resposta tempestiva, bloqueio de usuário abusivo e contato publicado [S12]. Google Play exige aceite de termos antes de criar UGC, denúncia e bloqueio dentro do app [S13]. | FATO [S12][S13] |
| P11 | Convicção religiosa é dado sensível; tratamento só com consentimento "de forma específica e destacada, para finalidades específicas" (art. 11, I), e o art. 11 vale para "qualquer tratamento de dados pessoais que revele dados pessoais sensíveis" (§1º) [S14]. Isso alcança o rosto de terceiro numa foto de culto. | FATO [S14]; INFERÊNCIA sobre a foto |
| P12 | **Não existe limite de requisições por usuário na API REST do Supabase que eu tenha confirmado.** Não achei na documentação consultada. Se for preciso limitar raspagem, o limite tem de ser escrito dentro das RPCs (contador) ou num proxy. | NÃO CONFIRMADO |

**Consequência de desenho (RECOMENDAÇÃO, vale para as três):**

- **O cliente não lê `posts`, `comments`, `reactions` nem `profiles` de outra pessoa diretamente.** Toda leitura de
  conteúdo alheio passa por RPC `security definer` que devolve só as colunas necessárias. As tabelas continuam com RLS
  (defesa em profundidade), mas **sem `grant select`** para `anon`/`authenticated` nas tabelas de conteúdo.
- **O cliente nunca recebe o `user_id` de outra pessoa.** Bloquear, denunciar e ver o autor são feitos **a partir do
  `post_id` ou `comment_id`**. Sem UUID de usuário na resposta, não há o que enumerar nem como correlacionar pessoas entre
  bases.
- **A tabela `profiles` continua fechada** exatamente como hoje. O nome e a foto do autor saem da RPC do feed, e só para
  autores com post visível para quem pergunta.

---

## 2. Núcleo comum (igual nas três opções)

### 2.1 Tabelas

```sql
-- =============================================================================
-- ESBOÇO. NÃO É MIGRATION. Serve para comparar (a), (b) e (c).
-- =============================================================================

-- Funções auxiliares ficam fora da API (P4). O schema `private` NÃO entra na lista
-- de schemas expostos do PostgREST; `authenticated` precisa de USAGE só para que as
-- policies consigam chamar as funções.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.content_status   as enum ('pending', 'visible', 'rejected', 'removed');
create type public.report_target    as enum ('post', 'comment', 'user');
create type public.report_reason    as enum (
  'ofensivo', 'assedio', 'spam', 'rosto_de_terceiro', 'crianca_exposta',
  'dado_pessoal', 'falso_ou_enganoso', 'outro'
);
create type public.report_status    as enum ('open', 'actioned', 'dismissed');
create type public.moderation_kind  as enum (
  'approve', 'reject', 'remove', 'restore', 'dismiss_report',
  'suspend_user', 'unsuspend_user', 'appeal_upheld', 'appeal_reversed'
);
create type public.appeal_status    as enum ('none', 'requested', 'upheld', 'reversed');

-- Foto de perfil: coluna nova em profiles (a tabela continua fechada pela RLS atual).
alter table public.profiles add column avatar_path text
  check (avatar_path ~ '^[0-9a-f-]{36}\.jpg$');

-- -----------------------------------------------------------------------------
-- consents — versão do texto aceito. Ver decisão de retenção em 2.4.
-- -----------------------------------------------------------------------------
create table public.consents (
  id            bigserial primary key,
  user_id       uuid not null,            -- sem FK de propósito: ver 2.4
  purpose       text not null check (purpose in ('community_publish', 'community_rules')),
  text_version  text not null,            -- ex.: 'c4-2026-09-21'
  text_sha256   text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  app_version   text,
  accepted_at   timestamptz not null default now(),
  revoked_at    timestamptz
);
create index consents_active_idx on public.consents (user_id, purpose) where revoked_at is null;

-- -----------------------------------------------------------------------------
-- posts
-- -----------------------------------------------------------------------------
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references auth.users(id) on delete cascade,
  audience_group_id uuid references public.groups(id) on delete cascade, -- só em (b); nulo em (a)/(c)
  body          text check (char_length(body) <= 5000),
  photo_path    text unique check (photo_path ~ '^[0-9a-f-]{36}\.jpg$'),
  day_number    smallint not null check (day_number between 1 and 100),
  status        public.content_status not null default 'pending',
  consent_id    bigint not null references public.consents(id),
  created_at    timestamptz not null default now(),
  visible_at    timestamptz,
  constraint post_has_content check (
    (body is not null and char_length(trim(body)) > 0) or photo_path is not null
  )
);
create index posts_feed_idx   on public.posts (visible_at desc) where status = 'visible';
create index posts_author_idx on public.posts (author_id);
create index posts_queue_idx  on public.posts (created_at) where status = 'pending';

-- -----------------------------------------------------------------------------
-- comments — mesma máquina de estado dos posts (decisão 6 do REGRAS: dentro, com custo)
-- -----------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 1000),  -- limite: HIPÓTESE, produto decide
  status      public.content_status not null default 'pending',  -- ou 'visible' se o produto aceitar pós-moderação
  created_at  timestamptz not null default now(),
  visible_at  timestamptz
);
create index comments_post_idx on public.comments (post_id, visible_at) where status = 'visible';

-- -----------------------------------------------------------------------------
-- reactions — "Amém". Um por pessoa por alvo. SEM coluna de contagem em lugar nenhum.
-- -----------------------------------------------------------------------------
create table public.reactions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  post_id     uuid references public.posts(id) on delete cascade,
  comment_id  uuid references public.comments(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint reaction_one_target check (num_nonnulls(post_id, comment_id) = 1)
);
create unique index reactions_user_post_uq    on public.reactions (user_id, post_id)    where post_id is not null;
create unique index reactions_user_comment_uq on public.reactions (user_id, comment_id) where comment_id is not null;

-- -----------------------------------------------------------------------------
-- blocks — a linha é unidirecional; o EFEITO é bidirecional (ver private.blocked_between)
-- -----------------------------------------------------------------------------
create table public.blocks (
  id          uuid primary key default gen_random_uuid(),  -- o cliente desbloqueia por este id
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

-- -----------------------------------------------------------------------------
-- reports — alvo post, comentário ou usuário. Denúncia externa (quem não tem o app,
-- ex.: rosto de terceiro) entra por Edge Function com reporter_id nulo.
-- -----------------------------------------------------------------------------
create table public.reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_id        uuid references auth.users(id) on delete set null,
  target_type        public.report_target not null,
  target_post_id     uuid references public.posts(id) on delete set null,
  target_comment_id  uuid references public.comments(id) on delete set null,
  target_user_id     uuid references auth.users(id) on delete set null,
  reason             public.report_reason not null,
  details            text check (char_length(details) <= 1000),
  external_contact   text check (char_length(external_contact) <= 200), -- só denúncia externa; opcional
  status             public.report_status not null default 'open',
  created_at         timestamptz not null default now(),
  due_at             timestamptz not null default now() + interval '24 hours', -- promessa de C5
  resolved_at        timestamptz
);
create index reports_open_idx on public.reports (due_at) where status = 'open';

-- -----------------------------------------------------------------------------
-- moderation: quem modera e o que foi feito
-- -----------------------------------------------------------------------------
create table public.community_moderators (       -- sem policy de escrita: só service_role popula
  user_id     uuid primary key references auth.users(id) on delete cascade,
  scope_group uuid references public.groups(id) on delete cascade,  -- nulo = igreja inteira; usado em (b)
  granted_at  timestamptz not null default now(),
  granted_by  uuid references auth.users(id) on delete set null
);

create table public.moderation_actions (
  id                   bigserial primary key,
  actor_id             uuid references auth.users(id) on delete set null,
  kind                 public.moderation_kind not null,
  target_post_id       uuid references public.posts(id) on delete set null,
  target_comment_id    uuid references public.comments(id) on delete set null,
  target_user_id       uuid references auth.users(id) on delete set null,
  report_id            uuid references public.reports(id) on delete set null,
  reason_code          public.report_reason,
  reason_for_author    text check (char_length(reason_for_author) <= 500), -- o que o autor lê (Tema 987: motivo)
  author_notified_at   timestamptz,
  appeal               public.appeal_status not null default 'none',
  appeal_text          text check (char_length(appeal_text) <= 1000),
  created_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- fila de exclusão de arquivos (P8). Preenchida por trigger; drenada por Edge Function.
-- -----------------------------------------------------------------------------
create table private.storage_deletion_queue (
  bucket_id    text not null,
  object_name  text not null,
  enqueued_at  timestamptz not null default now(),
  attempts     int not null default 0,
  primary key (bucket_id, object_name)
);
```

### 2.2 Funções auxiliares e guardas

```sql
create or replace function private.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function private.is_moderator(target_group uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_moderators m
    where m.user_id = auth.uid()
      and (m.scope_group is null or m.scope_group = target_group)
  );
$$;

-- Bloqueio nos DOIS sentidos: se A bloqueou B ou B bloqueou A, nenhum vê o outro.
create or replace function private.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function private.has_publish_consent()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.consents c
    where c.user_id = auth.uid() and c.purpose = 'community_publish'
      and c.revoked_at is null
      and c.text_version = (select current_setting('app.consent_version_c4', true))
  );
$$;
-- app.consent_version_c4 = parâmetro do banco (alter database … set). Trocar o texto de C4
-- troca a versão e obriga novo aceite antes da próxima publicação.

-- Publicar exige: conta permanente (não anônima), faixa 18+ autodeclarada (S-11),
-- conta ativa e consentimento vigente.
create or replace function private.can_publish()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
     and exists (
       select 1 from public.profiles p
       where p.user_id = auth.uid() and p.account_status = 'active' and p.age_band = '18_plus'
     )
     and private.has_publish_consent();
$$;

-- A ÚNICA função que muda entre (a), (b) e (c). Definida na §3.
-- create or replace function private.can_see_community() ...
-- create or replace function private.can_see_post(p public.posts) ...

-- Dia oficial da campanha, calculado no servidor (o post das 23h50 que sobe às 00h10
-- não pode "adiantar" o dia; nem ser marcado num dia futuro).
create or replace function private.official_day() returns smallint
language sql stable as $$
  select least(100, greatest(1,
    ((now() at time zone 'America/Sao_Paulo')::date - date '2026-09-23') + 1
  ))::smallint;
$$;

-- Guarda de INSERT: o cliente não escolhe status, autor, data de visibilidade nem dia futuro.
create or replace function private.guard_post_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.author_id  := auth.uid();
  new.status     := 'pending';        -- filtro ANTES de aparecer (Apple 1.2, P10)
  new.visible_at := null;
  if new.day_number > private.official_day() then
    raise exception 'dia futuro' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger posts_guard_insert before insert on public.posts
  for each row execute function private.guard_post_insert();

-- Autor não edita post (apaga e escreve de novo); status só muda por RPC de moderação,
-- que liga app.moderation_authorized dentro da própria transação (mesmo padrão de
-- role_change_is_authorized() da fundação).
create or replace function private.guard_post_update()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('app.moderation_authorized', true), 'off') <> 'on' then
    raise exception 'post não é editável pelo cliente' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger posts_guard_update before update on public.posts
  for each row execute function private.guard_post_update();

-- Foto vai para a fila quando o post some (apagado pelo autor, pela moderação ou pela
-- CASCATA da exclusão de conta: trigger de linha também dispara em delete em cascata).
create or replace function private.enqueue_post_photo()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if old.photo_path is not null then
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('post-photos', old.photo_path) on conflict do nothing;
  end if;
  return old;
end $$;
create trigger posts_enqueue_photo after delete on public.posts
  for each row execute function private.enqueue_post_photo();
-- idem para profiles.avatar_path (after delete e after update of avatar_path).
```

### 2.3 RLS e privilégios

```sql
alter table public.posts                enable row level security;
alter table public.comments             enable row level security;
alter table public.reactions            enable row level security;
alter table public.blocks               enable row level security;
alter table public.reports              enable row level security;
alter table public.consents             enable row level security;
alter table public.community_moderators enable row level security;
alter table public.moderation_actions   enable row level security;

-- Nada de conteúdo para anon, em nenhuma opção. Em (c) o acesso de quem não tem conta
-- é por RPC concedida a anon (ou por sessão anônima), nunca por tabela.
revoke all on public.posts, public.comments, public.reactions, public.blocks,
              public.reports, public.consents, public.community_moderators,
              public.moderation_actions
  from anon;

-- Leitura de conteúdo ALHEIO não passa por SELECT em tabela: só pelas RPCs da 2.5.
revoke select on public.posts, public.comments from authenticated;

-- posts: o autor cria (guardas acima) e apaga o que é dele.
create policy "publico se posso" on public.posts
  for insert to authenticated
  with check (private.can_publish() and private.can_see_community());
create policy "apago o meu post" on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- comments: mesmo desenho. Não comento em post de quem me bloqueou (nem de quem eu bloqueei).
create policy "comento se posso" on public.comments
  for insert to authenticated
  with check (
    private.can_publish()
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'visible'
        and private.can_see_post(p)
        and not private.blocked_between((select auth.uid()), p.author_id)
    )
  );
create policy "apago o meu comentário" on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- reactions: A REGRA "NINGUÉM VÊ QUANTOS" MORA AQUI.
-- Cada pessoa lê SÓ as próprias linhas. Nem o autor do post lê as reações do post dele.
-- Assim, `HEAD /reactions?post_id=eq.X` com `Prefer: count=exact` devolve 0 ou 1: o próprio
-- Amém de quem pergunta, e nada mais (P5). Não existe coluna de contagem em posts/comments.
create policy "vejo só o meu amém" on public.reactions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dou amém onde posso ver" on public.reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and (
      exists (select 1 from public.posts p
              where p.id = post_id and p.status = 'visible' and private.can_see_post(p)
                and not private.blocked_between((select auth.uid()), p.author_id))
      or exists (select 1 from public.comments c join public.posts p on p.id = c.post_id
                 where c.id = comment_id and c.status = 'visible' and private.can_see_post(p)
                   and not private.blocked_between((select auth.uid()), c.author_id))
    )
  );
create policy "tiro o meu amém" on public.reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));
-- Sem UPDATE. Sem policy de moderador: se precisar investigar abuso, é service_role
-- em Edge Function auditada, nunca pelo app.

-- blocks: vejo quem EU bloqueei (para desbloquear). Não vejo quem me bloqueou.
-- INSERT só pela RPC block_author_of(...) (o cliente não conhece o user_id do outro).
create policy "vejo meus bloqueios" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "desbloqueio" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- reports: vejo as minhas (recibo e estado, C5); moderador vê as do escopo dele.
-- INSERT só pela RPC report_content(...).
create policy "vejo minhas denúncias" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_moderator());

-- consents: registro append-only do próprio usuário. Revogar = RPC que preenche revoked_at.
create policy "registro meu consentimento" on public.consents
  for insert to authenticated
  with check (user_id = (select auth.uid()) and revoked_at is null);
create policy "vejo meus consentimentos" on public.consents
  for select to authenticated using (user_id = (select auth.uid()));

-- moderation_actions: o autor vê as ações sobre o conteúdo dele (aviso + contestação);
-- moderador vê tudo do escopo. Escrita só por RPC de moderação.
create policy "vejo ações sobre mim" on public.moderation_actions
  for select to authenticated
  using (target_user_id = (select auth.uid()) or private.is_moderator());

create policy "sei se sou moderador" on public.community_moderators
  for select to authenticated using (user_id = (select auth.uid()));
```

### 2.4 Decisão de retenção que o jurídico precisa tomar (bloqueia o SQL final)

**Conflito já registrado:** `SECURITY_V0.md` §1 guarda `consents` por 5 anos após a exclusão; §3.4 e §5 dizem que a
exclusão de conta é *hard delete* em cascata. Com FK `on delete cascade`, o consentimento some junto; sem FK, fica um
registro com `user_id` de quem pediu para ser esquecido.

- LGPD art. 16 permite conservar após o término do tratamento para "cumprimento de obrigação legal ou regulatória" (I)
  ou para "uso exclusivo do controlador… desde que anonimizados os dados" (IV) [S15]. (FATO)
- Marco Civil art. 15 obriga a guardar **registros de acesso a aplicações por 6 meses**, mas só para provedor
  "constituído na forma de pessoa jurídica" que exerça a atividade "com fins econômicos" [S16]. Se isso alcança uma
  igreja sem fins lucrativos é pergunta para advogado. (FATO sobre o texto, por fonte secundária; **não confirmei no
  Planalto**, que recusou a conexão nesta data. Enquadramento: NÃO CONFIRMADO.)
- O Tema 987 (STF) exige devido processo na remoção (motivo e contestação) — já registrado em
  `STORES_LEGAL_RESEARCH.md`. Contestação exige guardar *algo* do conteúdo removido por algum tempo. (INFERÊNCIA)

**Opções técnicas** (o esboço usa a 2):

1. FK com cascata em tudo: mais simples, zero retenção, e perde a prova do consentimento.
2. `consents.user_id` sem FK; a Edge Function de exclusão troca `user_id` por um HMAC com chave no Vault
   (pseudonimização, não anonimização) e o job de retenção apaga depois do prazo que o jurídico definir.
3. Conteúdo removido por moderação: guardar por N dias (proposta: 90) só o necessário para contestação, em tabela
   separada sem acesso do app, apagada por `pg_cron`. **Sem decisão, a recomendação é não guardar o texto** e guardar
   só `reason_code` + hash do conteúdo.

### 2.5 RPCs (a superfície inteira que o app enxerga)

```sql
-- Feed: devolve SÓ o necessário. Sem user_id do autor. Com fim (ECA Digital: pontos de parada).
create or replace function public.community_feed(before_ts timestamptz default null)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, visible_at timestamptz,
  author_name text, author_avatar_path text, is_mine boolean, i_said_amen boolean
)
language sql stable security definer set search_path = public, private as $$
  select p.id, p.body, p.photo_path, p.day_number, p.visible_at,
         pr.display_name, pr.avatar_path,
         p.author_id = auth.uid(),
         exists (select 1 from public.reactions r where r.post_id = p.id and r.user_id = auth.uid())
  from public.posts p
  join public.profiles pr on pr.user_id = p.author_id and pr.account_status = 'active'
  where private.can_see_community()
    and p.status = 'visible'
    and private.can_see_post(p)
    and not private.blocked_between(auth.uid(), p.author_id)
    and p.visible_at > now() - interval '7 days'          -- janela finita: HIPÓTESE, produto decide
    and (before_ts is null or p.visible_at < before_ts)
  order by p.visible_at desc
  limit 20;                                               -- teto fixo: o cliente não escolhe
$$;
revoke execute on function public.community_feed(timestamptz) from public, anon;
grant  execute on function public.community_feed(timestamptz) to authenticated;
-- Em (c) com leitura sem conta: grant também para anon (ver 3.3).

-- Comentários de um post, mesma lógica (sem user_id, sem contagem, com bloqueio).
-- public.post_comments(post_id uuid, before_ts timestamptz) ...

-- Meus posts, inclusive os pendentes e rejeitados (estado "em análise" e motivo).
-- public.my_posts() ...

-- Amém: liga/desliga. Devolve só o novo estado do PRÓPRIO usuário. Nunca um total.
create or replace function public.toggle_amen(target_post uuid)
returns boolean language plpgsql security invoker as $$
begin
  delete from public.reactions where user_id = auth.uid() and post_id = target_post;
  if found then return false; end if;
  insert into public.reactions (user_id, post_id) values (auth.uid(), target_post); -- policy valida
  return true;
end $$;

-- Bloquear a partir do conteúdo: o cliente nunca vê o user_id do autor.
create or replace function public.block_author_of(target_post uuid default null, target_comment uuid default null)
returns void language plpgsql security definer set search_path = public, private as $$
declare other uuid;
begin
  if auth.uid() is null then raise exception 'sessão obrigatória' using errcode = '42501'; end if;
  -- Só resolve o autor de conteúdo que eu poderia ver (sem isso a RPC vira oráculo de
  -- "este post existe?"). Resposta idêntica (void) quando não acha.
  select coalesce(
    (select p.author_id from public.posts p
      where p.id = target_post and p.status = 'visible' and private.can_see_post(p)),
    (select c.author_id from public.comments c join public.posts p on p.id = c.post_id
      where c.id = target_comment and c.status = 'visible' and private.can_see_post(p))
  ) into other;
  if other is null or other = auth.uid() then return; end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), other)
  on conflict do nothing;
end $$;

-- Denunciar: mesma ideia, alvo por id de conteúdo. Recibo = id da denúncia.
-- public.report_content(target_post uuid, target_comment uuid, reason report_reason, details text) returns uuid

-- Moderação (só moderador; liga app.moderation_authorized na transação e grava moderation_actions):
-- public.moderate_post(post uuid, kind moderation_kind, reason report_reason, reason_for_author text)
-- public.moderation_queue()  -- pendentes + denúncias abertas por due_at

-- Revogar consentimento de publicar (SECURITY_V0 §4.2). Oferece, no app, "apagar tudo o que publiquei".
-- public.revoke_publish_consent()
```

### 2.6 Bucket de fotos

**RECOMENDAÇÃO nas três opções: bucket privado + URL assinada curta.** Motivos:

- Em bucket público o download não passa por RLS [S4]: **a foto de um post pendente ou rejeitado fica acessível** a
  quem tiver a URL. A pré-moderação (Apple 1.2) perde o sentido para a foto.
- Com bucket privado, a própria RLS de `storage.objects` decide **quem consegue gerar a URL assinada** [S9]: só quem
  pode ver o post, e só se ninguém bloqueou ninguém.
- O custo é uma chamada `createSignedUrls` por página do feed (em lote) e cache de CDN menos eficiente que o de bucket
  público [S4]. Para ~3.000 pessoas é irrelevante (§5).

**Nome do arquivo sem `user_id`** (`<uuid-aleatório>.jpg`): o caminho aparece na URL assinada; com
`{user_id}/{post_id}.jpg` (o exemplo típico do Supabase [S9]) cada foto vazaria o identificador do autor.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-photos', 'post-photos', false, 1048576, array['image/jpeg']),  -- 1 MB, SECURITY_V0 §3.3
  ('avatars',     'avatars',     false,  262144, array['image/jpeg']);

-- Upload: só quem pode publicar; nome aleatório; dono gravado pelo Storage (owner_id).
create policy "subo foto se posso publicar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-photos'
    and name ~ '^[0-9a-f-]{36}\.jpg$'
    and private.can_publish()
  );

-- Download / URL assinada: o dono sempre (para ver o próprio pendente); os outros só
-- se o post estiver visível para eles e sem bloqueio entre os dois.
create policy "vejo foto de post que posso ver" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'post-photos'
    and (
      owner_id = (select auth.uid()::text)
      or exists (
        select 1 from public.posts p
        where p.photo_path = storage.objects.name
          and p.status = 'visible'
          and private.can_see_post(p)
          and not private.blocked_between((select auth.uid()), p.author_id)
      )
    )
  );

-- Apagar: só o dono (o resto é Edge Function com service_role drenando a fila).
create policy "apago minha foto" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-photos' and owner_id = (select auth.uid()::text));

-- Sem UPDATE: foto não é substituível (evita trocar a imagem depois de aprovada).

-- E no INSERT de posts: photo_path precisa ser um objeto do próprio autor.
--   check (photo_path is null or exists (select 1 from storage.objects o
--          where o.bucket_id = 'post-photos' and o.name = photo_path
--            and o.owner_id = auth.uid()::text))
```

**EXIF / GPS — NÃO CONFIRMADO.**

- `expo-image-picker` devolve o EXIF no objeto de resultado só com `exif: true` (padrão `false`), mas isso diz respeito
  ao que o JS recebe, não ao que fica **dentro do arquivo** [S17]. (FATO sobre a opção; INFERÊNCIA sobre o arquivo.)
- A documentação do `expo-image-manipulator` **não diz** se o `saveAsync` preserva ou remove metadados [S10]. Não
  confirmei.
- As transformações de imagem do Supabase exigem plano Pro e cobram US$ 5 por 1.000 imagens de origem acima de 100/mês
  [S18]; a documentação **também não diz** se removem EXIF. Não confirmei, e o custo não compensa.

**RECOMENDAÇÃO:** (1) reencodar no aparelho (redimensionar para ≤ 1600 px, JPEG ~0,8) e **provar com um teste** que o
arquivo de saída não tem segmento APP1/Exif (iOS e Android, foto de câmera com GPS ligado); (2) validar de novo no
servidor antes de aprovar: a moderação já é uma etapa entre "enviei" e "apareceu", então uma Edge Function pode recusar
JPEG com marcador `0xFFE1` (Exif) enquanto o post está `pending`. Só depois disso a tela pode prometer "sem localização".

### 2.7 Exclusão em cascata com Storage (vale nas três)

Ordem na Edge Function de exclusão (`service_role`), estendendo `SECURITY_V0.md` §5:

1. Reautenticação recente. 2. Revogar token Apple. 3. **Listar objetos do usuário por `owner_id`** em `post-photos` e
`avatars` e apagar pela Storage API (P8). 4. `auth.admin.deleteUser` → cascata em `profiles`, `posts`, `comments`,
`reactions`, `blocks` (os dois lados), `church_members`/`group_memberships`; `reports.reporter_id` e
`moderation_actions.*` viram `null`. 5. Pseudonimizar `consents.user_id` (opção 2 da §2.4). 6. Registrar
`deletion_requests`. 7. **Drenar a fila**: os triggers da cascata já enfileiraram os `photo_path`; um job (`pg_cron` +
Edge Function) apaga o que o passo 3 não pegou e registra falhas. Isso também cobre "apagar tudo o que publiquei"
(RPC que apaga posts/comentários/reações do próprio usuário e deixa a fila cuidar das fotos) e o autor que apaga um post.

**Efeito colateral que ninguém pediu mas acontece:** apagar a conta de A apaga os comentários que A fez nos posts de B, e
os Amém de A. Isso é o correto pela LGPD; o texto de C4/D1 deve dizer.

**HIPÓTESE a testar:** URL assinada já emitida continua válida até expirar, mas o arquivo apagado devolve 404. Validade
curta (proposta: 1 h) limita a janela.

---

## 3. O que muda em cada opção

### 3.1 Opção (a) — a igreja inteira, com código de entrada

**Ideia:** existe uma lista `church_members`. Só quem está nela vê e publica. Entra-se com um código distribuído por
líderes/ministérios (no culto, no grupo), e o código tem dono, validade, limite de usos e pode ser revogado.

```sql
create table private.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code_sha256 text not null unique,                 -- nunca o código em claro
  label       text not null,                        -- ex.: 'Ministério de intercessão — set/2026'
  created_by  uuid references auth.users(id) on delete set null,
  max_uses    int not null default 200 check (max_uses > 0),
  uses        int not null default 0,
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);

create table public.church_members (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  via_code    uuid references private.invite_codes(id) on delete set null,
  status      public.membership_status not null default 'active',
  joined_at   timestamptz not null default now()
);
alter table public.church_members enable row level security;
revoke all on public.church_members from anon;
create policy "vejo a minha entrada" on public.church_members
  for select to authenticated using (user_id = (select auth.uid()));
-- Sem INSERT/UPDATE para o cliente: só a RPC abaixo e a moderação.

create table private.code_attempts (
  user_id uuid not null, attempted_at timestamptz not null default now()
);
create index on private.code_attempts (user_id, attempted_at desc);

create or replace function public.redeem_church_code(code text)
returns boolean language plpgsql security definer set search_path = public, private, extensions as $$
declare c private.invite_codes;
begin
  if auth.uid() is null then raise exception 'sessão obrigatória' using errcode = '42501'; end if;
  -- Força bruta: 5 tentativas por hora por usuário. Código com ≥ 40 bits (8 caracteres base32).
  if (select count(*) from private.code_attempts
      where user_id = auth.uid() and attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'muitas tentativas' using errcode = '54000';
  end if;
  insert into private.code_attempts (user_id) values (auth.uid());

  select * into c from private.invite_codes
  where code_sha256 = encode(digest(upper(trim(code)), 'sha256'), 'hex')
    and revoked_at is null and expires_at > now() and uses < max_uses
  for update;
  if not found then return false; end if;

  update private.invite_codes set uses = uses + 1 where id = c.id;
  insert into public.church_members (user_id, via_code) values (auth.uid(), c.id)
  on conflict (user_id) do nothing;
  insert into public.admin_audit_log (actor_id, action, meta)
  values (auth.uid(), 'redeem_church_code', jsonb_build_object('code_id', c.id));
  return true;
end $$;

create or replace function private.can_see_community()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.church_members m
                 where m.user_id = auth.uid() and m.status = 'active');
$$;
create or replace function private.can_see_post(p public.posts)
returns boolean language sql stable as $$ select private.can_see_community() $$;
```

**Quem não tem conta:** para ver o feed, precisa de sessão + código. Duas saídas, a decidir:
(i) exigir conta permanente para ver (mais simples; a maioria nunca vê o feed); (ii) aceitar sessão anônima com código
só para **ler** (a policy já exclui anônimo de publicar e reagir). A (ii) perde a entrada ao reinstalar o app (P9) e
cria um registro de membro sem e-mail. Em qualquer uma, **a aba Comunidade vira uma tela de "entre com o código da sua
igreja"** para quem não entrou — isso bate de frente com "o feed é a primeira tela" (`00-DECISAO-FEED.md`).

**Vazamento de código:** um código postado no Instagram transforma (a) em (c) até ser revogado. Mitigações: código por
líder/ministério (o `label` diz de onde vazou), validade curta, `max_uses`, revogação que **não** expulsa quem já entrou
(ou que expulsa, a decidir), e remoção de membro pela moderação (`church_members.status = 'removed'`). Aprovação manual
de cada entrada é possível (status `pending`), mas custa trabalho humano de ~3.000 aprovações.

### 3.2 Opção (b) — só o grupo da pessoa

```sql
-- posts.audience_group_id passa a ser obrigatório e precisa ser um grupo do autor.
alter table public.posts alter column audience_group_id set not null;
-- (no insert: check private.is_group_member_active(audience_group_id))

create or replace function private.can_see_community()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_memberships m
                 where m.user_id = auth.uid() and m.status = 'active');
$$;
create or replace function private.can_see_post(p public.posts)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_memberships m
                 where m.user_id = auth.uid() and m.group_id = p.audience_group_id
                   and m.status = 'active');
$$;

-- OBRIGATÓRIO em (b): fechar a entrada livre em grupos que a fundação permite hoje.
drop policy "entro em grupo ativo como membro" on public.group_memberships;
-- Substituir por public.redeem_group_code(code) (mesmo desenho do 3.1, código por grupo)
-- ou por convite do líder aprovado.
```

**Problemas específicos de (b), todos verificados no código existente:**

1. **Entrada livre em grupo** (`20260907120100_rls.sql`, policy `"entro em grupo ativo como membro"`): qualquer usuário
   autenticado insere a própria membership em qualquer grupo ativo, e `"grupos ativos são legíveis"` mostra o catálogo
   a todos. Com (b), isso é leitura do feed de qualquer grupo. (FATO — lido no arquivo.)
2. **A policy de perfis entrega a colegas de grupo a linha inteira de `profiles`**, inclusive `age_band` e
   `account_status`. Num grupo de 7 pessoas, todos saberiam a faixa etária de todos. Com o feed via RPC isso não
   piora, mas é uma exposição que (b) torna mais visível. (FATO sobre a policy; INFERÊNCIA sobre o impacto.) Corrigir com
   privilégio por coluna ou mover `age_band` para tabela própria.
3. **Pessoa em mais de um grupo:** o schema permite; o post precisa de um público escolhido na hora de publicar, e C3
   não tem esse seletor. (FATO sobre o schema; INFERÊNCIA sobre o desenho.)
4. **Quem não tem grupo não tem comunidade.** Grupos hoje não são geridos por ninguém no app (`LACUNAS.md` B13).
5. **Moderação por líder de grupo** é tentadora (`community_moderators.scope_group`), mas coloca a denúncia sobre um
   membro nas mãos de alguém que convive com ele, e líder não é moderador treinado. Recomendo central, com o líder como
   no máximo segunda linha.
6. **Bloqueio em grupo pequeno** funciona tecnicamente, mas socialmente é visível: num grupo de 7, sumir um post é
   notado. Nada a fazer no banco; é custo de produto.
7. **D4 pede Amém com nome no grupo** (`TELAS.md`), o que é outro regime de visibilidade para a mesma tabela. Se (b)
   vier com Amém nominal, a policy "vejo só o meu amém" deixa de valer só dentro do grupo, e a regra 19 do REGRAS passa a
   ter exceção. **Não misturar**: se existir, é outra tabela ou outra RPC, decidida à parte.

### 3.3 Opção (c) — qualquer um que baixar o app

```sql
create or replace function private.can_see_community() returns boolean
language sql stable as $$ select true $$;
create or replace function private.can_see_post(p public.posts) returns boolean
language sql stable as $$ select true $$;

-- Leitura sem conta, variante 1: a RPC é concedida a anon. Qualquer um com a chave
-- pública lê o feed com um curl.
grant execute on function public.community_feed(timestamptz) to anon;
-- + policy SELECT em storage.objects para anon (senão não há foto), o que equivale a
--   bucket público com filtro de status.

-- Variante 2: sessão anônima (P9). Mesmo resultado para um script, que chama
-- signInAnonymously() antes; o custo para o atacante é 1 requisição a mais, limitado a
-- 30/h por IP por padrão (P9), contornável com vários IPs. CAPTCHA recomendado pelo
-- Supabase (P9); em app nativo exige componente de CAPTCHA embutido (HIPÓTESE de esforço).
```

**Consequências de (c):**

- **Tudo o que o feed mostra é público.** Nome, foto de perfil, foto do post, texto sobre a fé, dia da jornada. RLS não
  protege dado que a regra manda mostrar para todos; só limita o formato. (INFERÊNCIA a partir de P1, P7, P9.)
- **Raspagem de identidade religiosa em escala.** Um script pagina o feed (20 por chamada, 7 dias de janela) e monta
  "lista de nomes + fotos + fé declarada" dos membros ativos da Lagoinha. Sem limite por usuário nativo (P12), só
  contador dentro da RPC ou proxy.
- **O consentimento de C4 precisa dizer isso com todas as letras**, e o de terceiros (rosto no culto) não existe. Risco
  LGPD art. 11 §1º no máximo aqui.
- **Público de qualquer idade lendo**: o ECA Digital trata "interação social/compartilhamento em larga escala" como
  indício de acesso provável por adolescentes (já em `STORES_LEGAL_RESEARCH.md`, art. 1º). Mais obrigação, não menos.
- **Volume de moderação imprevisível**: o público não é mais a igreja.

---

## 4. Modelo de ameaça por opção

Escala de risco: **baixo / médio / alto**, depois dos controles da §2. Todas as avaliações são INFERÊNCIA minha sobre
os fatos P1–P12, salvo indicação.

| Ameaça | Como acontece | Controle (comum) | (a) igreja + código | (b) grupo | (c) qualquer um |
|---|---|---|---|---|---|
| **Raspagem via anon key** | Script com a chave pública do binário chama a API | Nada de conteúdo para `anon`; leitura só por RPC com teto de 20 e janela de 7 dias; sem `user_id` na resposta | **Médio**: precisa de conta + código; um membro legítimo ainda consegue raspar o que vê | **Baixo**: só o que um grupo pequeno vê | **Alto**: sessão anônima ou `anon` direto; conteúdo é público de fato |
| **Enumeração dos ~3.000 membros** | Listar `profiles`, `church_members`, `group_memberships`, ou correlacionar `user_id` | `profiles` fechado (como hoje); `church_members` só a própria linha; nenhum `user_id` alheio sai de RPC; caminho de foto sem `user_id` | **Baixo** para quem nunca publicou; quem publica fica visível a todos os membros (é o produto) | **Baixo**, mas (FATO) a policy atual entrega o perfil inteiro a colegas de grupo | Quem publica fica visível ao mundo; quem não publica continua invisível |
| **Contagem de Amém pela API** | `HEAD /reactions?post_id=eq.X` + `Prefer: count=exact` [S2]; embed `posts?select=*,reactions(count)`; agregados | Policy "vejo só o meu amém"; sem coluna de contagem; agregados desligados [S5]; Realtime desligado; `toggle_amen` devolve só o próprio estado | **Baixo** (devolve 0/1) | **Baixo**, **se** D4 não trouxer Amém nominal | **Baixo** (mesma policy) |
| **Contagem de Amém pelo autor** | Autor consulta reações do próprio post | Mesma policy: nem o autor lê | Baixo | Baixo | Baixo |
| **Oráculo de existência** | RPC que responde diferente para post que existe e não posso ver | RPCs verificam visibilidade antes de agir e respondem igual nos dois casos | Baixo | Baixo | n/a (tudo visível) |
| **Furar bloqueio** | Bloqueado continua vendo, comentando, dando Amém ou vendo foto por URL | `blocked_between` nos dois sentidos em feed, comentários, reactions, insert de comentário e policy de Storage | Baixo | Baixo (socialmente visível) | **Médio**: o bloqueado sai da conta e lê como anônimo |
| **Foto pendente/rejeitada visível** | URL de bucket público | Bucket privado; URL assinada só para post `visible` | Baixo | Baixo | Médio se optar por bucket público para economizar |
| **Localização na foto** | EXIF com GPS | Reencode no aparelho + verificação no servidor | **Não confirmado** nas três até o teste da §2.6 | idem | idem, e com exposição pública |
| **Rosto de terceiro / criança** | Foto do culto | Motivo de denúncia próprio; aviso em C3; canal externo de retirada | Médio | Médio-baixo | **Alto** |
| **Exclusão incompleta** | Cascata apaga linhas, não arquivos [S6] | Edge Function por `owner_id` + fila por trigger + job de drenagem | Baixo se testado | Baixo | Baixo, mas cópias raspadas já saíram |
| **Escalada para moderador** | Cliente se insere em `community_moderators` | Sem policy de escrita (só `service_role`), igual `app_admins` | Baixo | **Médio** se líder vira moderador do grupo | Baixo |
| **Força bruta de código** | Tentar códigos até acertar | 5/h por usuário; ≥ 40 bits; rate limit de cadastro | Baixo | Baixo (se (b) adotar código) | n/a |
| **Vazamento de código** | Código publicado fora | Código por líder, validade, `max_uses`, revogação | **Médio** — (a) vira (c) até revogar | Médio | n/a |
| **Contas em massa (spam)** | Muitas contas publicando | Pré-moderação; 18+; consentimento; OTP com limite | Baixo (código filtra) | Baixo | **Alto** |

**Limite honesto que vale para todas:** nenhuma política impede um membro legítimo de fotografar a tela ou copiar o que
tem direito de ver. RLS controla **escala e formato**, não intenção. O texto de C3/C4 deve dizer quem vê, não prometer
que ninguém copia.

---

## 5. Comparação: custo, risco LGPD e esforço

### 5.1 Custo de infraestrutura (FATOS de preço, acesso em 2026-09-21; volumes são HIPÓTESE)

- Supabase Pro: **US$ 25/mês**, 8 GB de banco, **100 GB de Storage**, **250 GB de egress** (depois US$ 0,09/GB),
  100.000 MAU; projetos Free pausam após 1 semana de inatividade [S7]. Storage acima da cota: **US$ 0,0213/GB/mês** [S8].
  Edge Functions: 2 milhões de invocações/mês no Pro [S19].
- **Estimativa (HIPÓTESE):** 300 posts/dia com foto × 100 dias × 200 KB ≈ **6 GB** de Storage. 1.000 pessoas/dia vendo
  20 fotos de 200 KB ≈ 4 GB/dia ≈ **120 GB/mês** de egress. Cabe no Pro nas três opções.

| | (a) igreja + código | (b) grupo | (c) qualquer um |
|---|---|---|---|
| Supabase | US$ 25/mês | US$ 25/mês | US$ 25/mês + risco de egress por raspagem/bots |
| E-mail transacional (OTP) | igual | igual | maior (mais cadastros) |
| Anti-abuso | contador na RPC | contador na RPC | CAPTCHA/Turnstile na sessão anônima + contador; possivelmente proxy |
| **Custo humano de moderação** (o que realmente pesa) | proporcional a ~3.000 pessoas; SLA de 24 h exige escala de moderadores inclusive fim de semana | menor por moderador, mas distribuído entre líderes não treinados | imprevisível; público externo |

### 5.2 Risco LGPD (INFERÊNCIA, precisa de parecer jurídico)

| | (a) | (b) | (c) |
|---|---|---|---|
| Alcance do dado sensível publicado | ~3.000 membros identificados | 5–20 pessoas conhecidas | ilimitado, inclusive indexável por quem raspar |
| Consentimento (art. 11, I) consegue ser "específico" sobre o alcance? | Sim: "toda a igreja, cerca de 3.000 pessoas" | Sim: "o seu grupo" | Só se disser "qualquer pessoa, inclusive fora da igreja" — e o autor não controla o destino |
| Terceiros na foto (art. 11 §1º; art. 14 se criança) | Médio | Médio-baixo | Alto |
| Incidente (Res. CD/ANPD 15/2024, já em `SECURITY_V0.md`) | Vazamento de uma base de membros + fé | Vazamento restrito | "Vazamento" permanente por desenho |
| Adolescentes lendo (ECA Digital) | Controlável pelo código | Controlável pelo grupo | Não controlável |
| **Risco geral** | **Médio** | **Baixo** | **Alto** |

### 5.3 Esforço (HIPÓTESE; dias de engenharia de backend, sem telas)

| Bloco | (a) | (b) | (c) |
|---|---|---|---|
| Criar projeto, aplicar fundação, provar RLS com sessões A/B/anon (pré-requisito, `LACUNAS.md` B3) | 2 | 2 | 2 |
| Núcleo comum §2 (tabelas, guardas, RLS, RPCs, bucket, testes de autorização) | 6–8 | 6–8 | 6–8 |
| Exclusão/exportação/"apagar tudo" com Storage (Edge Functions) | 3–4 | 3–4 | 3–4 |
| Verificação de EXIF no servidor | 1–2 | 1–2 | 1–2 |
| Ferramenta mínima de moderação (RPCs + página interna ou Studio) | 3–4 | 4–6 (escopo por grupo) | 3–4 |
| Específico da opção | código, entrada, revogação: 2–3 | fechar entrada livre, código por grupo, seletor de público, corrigir exposição de `age_band`: 3–5 | leitura sem conta, CAPTCHA, limite de raspagem: 2–4 |
| **Total aproximado** | **17–23** | **19–27** | **17–24** |

O esforço de engenharia é parecido; **a diferença real está no risco e no custo humano**, não no código.

---

## 6. Recomendação

**RECOMENDAÇÃO: (a), a igreja inteira com código de entrada**, porque:

1. É a única que **bate com a cópia de C3** ("toda a igreja") e com a intenção declarada em `00-DECISAO-FEED.md`
   (a igreja lendo junto). Exige corrigir C4 ("qualquer pessoa que baixar o app").
2. Dá ao consentimento um alcance que se pode dizer com honestidade ("cerca de 3.000 pessoas da igreja").
3. Não depende de grupos, que hoje não existem de verdade no app (`LACUNAS.md` B13), nem herda o furo de entrada livre.
4. (c) transforma declaração de fé em dado público raspável; o controle técnico disponível não reduz isso.

**Condições para (a) valer:**

- Código **por líder/ministério**, com validade, `max_uses` e revogação; procedimento escrito para vazamento.
- Moderação central com escala real para o SLA de 24 h prometido em C5 (a decisão de quem modera é do fundador).
- Bucket privado, RPC-only, nenhum `user_id` alheio no cliente, policy "vejo só o meu amém".
- Teste automatizado das ameaças da §4 no CI antes de qualquer tela C ir para loja: sessão A, sessão B, sessão
  bloqueada, sessão anônima, `anon` puro, incluindo `HEAD … Prefer: count=exact` em `reactions` esperando 0/1.
- Parecer jurídico sobre retenção (§2.4) antes do SQL final.

**Se o fundador escolher (b):** fechar a policy de entrada livre **antes** de qualquer outra coisa. **Se escolher (c):**
tratar o feed como publicação na internet, reescrever C4 e o texto de consentimento nesses termos, e levar a decisão
ao Product Brain com este documento, porque ela muda o perfil de risco do produto.

---

## 7. O que não confirmei

- Se `expo-image-manipulator` remove EXIF ao salvar [S10] — **teste obrigatório**.
- Se as transformações de imagem do Supabase removem metadados [S18].
- Se há limite de requisições por usuário na API REST do Supabase (P12).
- Comportamento exato de `Prefer: count=exact` sob RLS: deduzido de [S2]+[S3], **não testado em banco real** (não existe
  banco).
- Aplicabilidade do Marco Civil art. 15 a uma igreja sem fins econômicos [S16]; texto lido em fonte secundária porque o
  Planalto recusou a conexão em 2026-09-21.
- Se o cache de CDN do Supabase serve arquivo apagado de bucket privado por algum tempo (HIPÓTESE: não, porque URL
  assinada passa pela API; testar).
- Esforço de CAPTCHA em app nativo Expo para sessão anônima.

---

## Fontes (todas acessadas em 2026-09-21)

- [S1] Supabase — API keys (publishable "safe to expose", RLS decide o alcance; descontinuação de `anon`/`service_role` até o fim de 2026): https://supabase.com/docs/guides/api/api-keys
- [S2] PostgREST v12 — Pagination and Count (`Prefer: count=exact`, `HEAD`, `Content-Range`): https://docs.postgrest.org/en/v12/references/api/pagination_count.html
- [S3] Supabase — Row Level Security (RLS em toda consulta; views ignoram RLS salvo `security_invoker`; `security definer` em schema exposto; desempenho): https://supabase.com/docs/guides/database/postgres/row-level-security
- [S4] Supabase — Storage buckets fundamentals (público vs privado; download sem RLS em bucket público; URLs assinadas): https://supabase.com/docs/guides/storage/buckets/fundamentals
- [S5] PostgREST v12 — Aggregate functions ("disabled by default", `db-aggregates-enabled`): https://docs.postgrest.org/en/v12/references/api/aggregate_functions.html
- [S6] Supabase — Delete objects (apagar por SQL deixa o arquivo órfão; usar a Storage API): https://supabase.com/docs/guides/storage/management/delete-objects
- [S7] Supabase — Pricing (Free/Pro, cotas, egress, MAU, pausa do Free): https://supabase.com/pricing
- [S8] Supabase — Storage size (US$ 0,0213/GB/mês acima da cota; 100 GB no Pro): https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
- [S9] Supabase — Storage access control (policies em `storage.objects`, `storage.foldername`, `owner_id`; SELECT para download/URL assinada): https://supabase.com/docs/guides/storage/security/access-control
- [S10] Expo — ImageManipulator (opções de `saveAsync`; documentação sem menção a EXIF): https://docs.expo.dev/versions/latest/sdk/imagemanipulator/
- [S11] Supabase — Anonymous sign-ins (`is_anonymous`, policy restritiva, CAPTCHA recomendado, 30/h por IP): https://supabase.com/docs/guides/auth/auth-anonymous
- [S12] Apple — App Review Guidelines 1.2 (UGC) e 5.1.1(v) (exclusão de conta): https://developer.apple.com/app-store/review/guidelines/
- [S13] Google Play — User Generated Content policy: https://support.google.com/googleplay/android-developer/answer/9876937?hl=en
- [S14] LGPD art. 11 (caput, I, §1º), texto reproduzido em: https://lgpd-brasil.info/capitulo_02/artigo_11 (o Planalto recusou a conexão nesta data; conferir no texto oficial https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm antes de citar em documento jurídico)
- [S15] LGPD art. 16 e art. 46: https://lgpd-brasil.info/capitulo_02/artigo_16 e https://lgpd-brasil.info/capitulo_07/artigo_46
- [S16] Marco Civil da Internet art. 15 (guarda de registros de acesso por 6 meses, pessoa jurídica com fins econômicos), fonte secundária: https://modeloinicial.com.br/lei/L-12965-2014/marco-civil-internet/art-15 (oficial: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm — não carregou)
- [S17] Expo — ImagePicker (opção `exif`, padrão `false`; seletor do sistema no Android): https://docs.expo.dev/versions/latest/sdk/imagepicker/
- [S18] Supabase — Image transformations (Pro+, US$ 5/1.000 imagens de origem acima de 100): https://supabase.com/docs/guides/storage/serving/image-transformations
- [S19] Supabase — Edge Functions pricing (2 M invocações/mês no Pro; US$ 2/milhão acima): https://supabase.com/docs/guides/functions/pricing

Fontes internas usadas (com as fontes primárias delas): `docs/technical/SECURITY_V0.md`,
`docs/technical/ADR-002-backend.md`, `docs/technical/MOBILE_STORE_REQUIREMENTS.md`,
`docs/research/STORES_LEGAL_RESEARCH.md` (ECA Digital, Tema 987/STF, Res. CD/ANPD 15/2024),
`design_handoff_100_dias/LACUNAS.md` (B3–B12), `design_handoff_100_dias/REGRAS.md` §3, `TELAS.md` grupo C.
