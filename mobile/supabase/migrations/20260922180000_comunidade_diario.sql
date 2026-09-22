-- =============================================================================
-- COMUNIDADE (V2) — diário compartilhado (feedback do fundador de 2026-09-22, F1, F3, F5, F6, F8)
--
-- EXECUTADO em 2026-09-22 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase db reset && supabase test db
--
-- Referência (docs/product/FEEDBACK_DAVI_2026-09-22.md, "Comunidade no formato de
-- diário compartilhado"): a ESTRUTURA de um app social de treino — cada pessoa
-- compartilha todo dia o seu processo, aqui com a Bíblia.
--
--   F1  Post do dia: tipo da atividade ('leitura', 'oracao', 'jejum', 'versiculo',
--       'livre'), anexos opcionais (dia da campanha, referência de versículo — SÓ a
--       referência, nunca o texto bíblico), até 4 fotos em ordem (tabela
--       community_post_photos; a coluna photo_path sai de community_posts).
--   F6  Sem seguidores: público 'igreja' (toda a igreja) ou 'ministerio' (o
--       ministério do perfil de quem publica, gravado no post). O feed tem escopo
--       'igreja' (tudo o que eu posso ver) ou 'ministerio' (só o que foi para o
--       meu ministério). A regra de visibilidade (private.can_view_post) passa a
--       conferir o público: quem é de outro ministério não vê, não comenta, não dá
--       Amém, não abre a foto.
--   F3  MUDANÇA DE REGRA (decisão do fundador, 2026-09-22): o Amém fica VISÍVEL.
--       Antes: "ninguém, nem o autor, lê contagem" (migration 1/3, pgTAP 08). Agora
--       o feed devolve a contagem e até 3 rostinhos (nome + foto de perfil
--       APROVADA; a própria sempre) de quem disse Amém. Continua valendo:
--         * nunca user_id de ninguém (rostinho = nome, foto e se é o meu);
--         * bloqueio nos dois sentidos: quem eu bloqueei ou quem me bloqueou não
--           entra na contagem nem nos rostinhos que EU vejo;
--         * a tabela continua fechada (cada um lê só a própria linha, sem user_id);
--         * marcar exige o consentimento vigente (dado de convicção religiosa,
--           LGPD art. 11). PENDENTE: o texto do consentimento precisa dizer que o
--           Amém aparece com nome e foto para a comunidade (ver "pedidos").
--   F5  Fotos na hora com filtro automático: toda foto nasce 'pendente' e o post
--       fica em análise ('foto'). A Edge Function submit-post (mobile/supabase/
--       functions/submit-post) cria o post com o token da pessoa e, SE houver
--       provedor configurado por segredo (AWS Rekognition DetectModerationLabels),
--       manda cada foto ao filtro: tudo limpo → publicado na hora
--       (decided_by = 'automatico'); algo suspeito ou erro → continua em análise
--       para uma pessoa. Sem segredo, nada muda: aprovação humana (padrão seguro).
--       Texto que o filtro de texto segura nunca é publicado pelo filtro de imagem.
--   F8  Atividade dentro do app (sem push): Amém e comentário de OUTRAS pessoas nos
--       meus posts (community_activity, alimentada por gatilho), "visto" e o ponto
--       de novidade em my_community_status.has_new_activity.
--
-- Nada de dado de fé local (marcas, anotações, metas, jejum, dias lidos) chega
-- aqui, a não ser o que a pessoa ANEXA ao post que ela mesma publica.
-- =============================================================================

-- =============================================================================
-- Livros da Bíblia (códigos USFM, iguais a mobile/src/bible/books.ts). Só códigos:
-- o servidor guarda a REFERÊNCIA do versículo, nunca o texto.
-- =============================================================================
create or replace function private.is_bible_book(book_code text)
returns boolean language sql immutable set search_path = '' as $$
  select book_code = any (array[
    'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST',
    'JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM',
    'HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL',
    '1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'
  ]);
$$;
revoke all on function private.is_bible_book(text) from public, anon, authenticated;

-- =============================================================================
-- F1 / F6: colunas novas do post
-- =============================================================================
alter table public.community_posts
  add column activity text not null default 'livre'
    check (activity in ('leitura', 'oracao', 'jejum', 'versiculo', 'livre')),
  add column verse_book text check (verse_book is null or private.is_bible_book(verse_book)),
  add column verse_chapter smallint check (verse_chapter is null or verse_chapter between 1 and 150),
  add column verse_start smallint check (verse_start is null or verse_start between 1 and 176),
  add column verse_end smallint check (verse_end is null or verse_end between 1 and 176),
  add column audience text not null default 'igreja' check (audience in ('igreja', 'ministerio')),
  add column audience_ministry text
    check (audience_ministry is null or char_length(trim(audience_ministry)) between 1 and 80),
  add constraint community_post_verse_whole check (
    (verse_book is null and verse_chapter is null and verse_start is null and verse_end is null)
    or (verse_book is not null and verse_chapter is not null and verse_start is not null
        and (verse_end is null or verse_end >= verse_start))
  ),
  add constraint community_post_versiculo_has_verse check (activity <> 'versiculo' or verse_book is not null),
  add constraint community_post_audience_ministry check ((audience = 'ministerio') = (audience_ministry is not null));

create index community_posts_ministry_feed_idx on public.community_posts (audience_ministry, published_at desc, id desc)
  where status = 'published' and audience = 'ministerio';

-- =============================================================================
-- F1: até 4 fotos por post, em ordem. Nome do arquivo continua '<uuid>.jpg' (sem
-- user_id). auto_check = resultado do filtro automático de imagem (F5); os rótulos
-- do provedor ficam SÓ para a moderação (nunca vão para o autor nem para o feed).
-- =============================================================================
create table public.community_post_photos (
  post_id       uuid not null references public.community_posts(id) on delete cascade,
  sort_order    smallint not null check (sort_order between 0 and 3),
  photo_path    text not null unique
    check (photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
  auto_check    text not null default 'pendente' check (auto_check in ('pendente', 'limpa', 'suspeita', 'erro')),
  auto_labels   text[] check (auto_labels is null or pg_catalog.cardinality(auto_labels) <= 20),
  auto_provider text check (auto_provider is null or auto_provider ~ '^[a-z0-9-]{1,40}$'),
  checked_at    timestamptz,
  created_at    timestamptz not null default now(),
  primary key (post_id, sort_order)
);
create index community_post_photos_pending_idx on public.community_post_photos (post_id) where auto_check = 'pendente';

-- A foto que já existia (uma por post) vira a primeira da lista.
insert into public.community_post_photos (post_id, sort_order, photo_path)
select p.id, 0, p.photo_path from public.community_posts p where p.photo_path is not null;

-- A coluna antiga sai (uma só fonte da verdade). O gatilho e o check que a usavam
-- saem antes; o conteúdo mínimo passa a ser conferido em create_community_post.
drop trigger community_posts_enqueue_photo on public.community_posts;
drop function private.enqueue_post_photo();
alter table public.community_posts drop constraint community_post_has_content;
alter table public.community_posts drop column photo_path;

-- Foto sai do post (post apagado, recusado, removido, cascata da exclusão de conta):
-- vai para a fila do Storage. Gatilho de linha também dispara no delete em cascata.
create or replace function private.enqueue_post_photo_row()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.storage_deletion_queue (bucket_id, object_name)
  values ('community-photos', old.photo_path)
  on conflict do nothing;
  return old;
end $$;
revoke all on function private.enqueue_post_photo_row() from public, anon, authenticated;

create trigger community_post_photos_enqueue
  after delete on public.community_post_photos
  for each row execute function private.enqueue_post_photo_row();

-- =============================================================================
-- F8: atividade no app. Só Amém e comentário de OUTRA pessoa num post meu.
-- actor_id nunca sai do servidor (a leitura devolve nome e foto aprovada).
-- =============================================================================
create table public.community_activity (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id     uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('amen', 'comentario')),
  post_id      uuid not null references public.community_posts(id) on delete cascade,
  comment_id   uuid references public.community_comments(id) on delete cascade,
  created_at   timestamptz not null default now(),
  seen_at      timestamptz,
  constraint community_activity_comment_kind check ((kind = 'comentario') = (comment_id is not null)),
  constraint community_activity_not_self check (recipient_id <> actor_id)
);
create unique index community_activity_amen_uq    on public.community_activity (post_id, actor_id) where kind = 'amen';
create unique index community_activity_comment_uq on public.community_activity (comment_id) where comment_id is not null;
create index community_activity_recipient_idx     on public.community_activity (recipient_id, created_at desc);
create index community_activity_unseen_idx        on public.community_activity (recipient_id) where seen_at is null;
create index community_activity_actor_idx         on public.community_activity (actor_id);

-- RLS ligada e NENHUMA policy nem GRANT: o app só lê pelas RPCs.
alter table public.community_post_photos enable row level security;
alter table public.community_activity    enable row level security;
revoke all on public.community_post_photos, public.community_activity from anon, authenticated;

-- Amém de outra pessoa num post meu → atividade. Retirar o Amém apaga a atividade.
create or replace function private.activity_from_amen()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.community_activity ac
     where ac.kind = 'amen' and ac.post_id = old.post_id and ac.actor_id = old.user_id;
    return old;
  end if;
  select p.author_id into v_author from public.community_posts p where p.id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.community_activity (recipient_id, actor_id, kind, post_id)
    values (v_author, new.user_id, 'amen', new.post_id)
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.activity_from_amen() from public, anon, authenticated;

create trigger community_amens_activity
  after insert or delete on public.community_amens
  for each row execute function private.activity_from_amen();

-- Comentário de outra pessoa que APARECEU (na hora ou depois da análise) → atividade.
-- Comentário apagado some junto (cascata); removido depois deixa de aparecer na leitura.
create or replace function private.activity_from_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then
    return new;
  end if;
  select p.author_id into v_author from public.community_posts p where p.id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.community_activity (recipient_id, actor_id, kind, post_id, comment_id)
    values (v_author, new.author_id, 'comentario', new.post_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.activity_from_comment() from public, anon, authenticated;

create trigger community_comments_activity
  after insert or update of status on public.community_comments
  for each row execute function private.activity_from_comment();

-- =============================================================================
-- F6: A regra de visibilidade, agora com o público do post
-- =============================================================================

-- Público do post permite este leitor? Toda a igreja; ou o ministério do post é o
-- ministério do perfil de quem lê; ou é o próprio autor.
create or replace function private.audience_allows(post_audience text, post_ministry text, author uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select post_audience = 'igreja'
      or author = viewer
      or exists (
        select 1 from public.community_profiles v
        where v.user_id = viewer and v.ministry is not null and v.ministry = post_ministry
      );
$$;
revoke all on function private.audience_allows(text, text, uuid, uuid) from public, anon, authenticated;

-- Publicado, autor ativo, leitor ativo, sem bloqueio entre os dois E público que
-- inclui o leitor. É A regra; comentários, Amém, fotos e denúncia passam por ela.
create or replace function private.can_view_post(target_post uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select viewer is not null
     and private.is_community_member(viewer)
     and exists (
       select 1 from public.community_posts p
       join public.community_profiles a on a.user_id = p.author_id and a.status = 'active'
       where p.id = target_post
         and p.status = 'published'
         and not private.blocked_between(viewer, p.author_id)
         and private.audience_allows(p.audience, p.audience_ministry, p.author_id, viewer)
     );
$$;
revoke all on function private.can_view_post(uuid, uuid) from public, anon, authenticated;

-- =============================================================================
-- Fotos: tudo o que olhava community_posts.photo_path passa a olhar a tabela nova
-- =============================================================================
create or replace function private.can_view_community_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    private.is_community_moderator()
    or exists (
      select 1 from public.community_post_photos ph
      join public.community_posts p on p.id = ph.post_id
      where ph.photo_path = object_name
        and (p.author_id = (select auth.uid()) or private.can_view_post(p.id, (select auth.uid())))
    )
    or exists (
      select 1 from public.community_profiles cp
      where cp.avatar_path = object_name
        and (
          cp.user_id = (select auth.uid())
          or (cp.avatar_status = 'approved' and cp.status = 'active'
              and private.is_community_member((select auth.uid()))
              and not private.blocked_between((select auth.uid()), cp.user_id))
        )
    )
  );
$$;
revoke all on function private.can_view_community_photo(text) from public, anon;
grant execute on function private.can_view_community_photo(text) to authenticated;

create or replace function private.community_photo_in_use(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_post_photos ph where ph.photo_path = object_name)
      or exists (select 1 from public.community_profiles cp where cp.avatar_path = object_name);
$$;
revoke all on function private.community_photo_in_use(text) from public, anon;
grant execute on function private.community_photo_in_use(text) to authenticated;

create or replace function private.service_enqueue_orphan_photos(max_age_hours int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  insert into private.storage_deletion_queue (bucket_id, object_name)
  select o.bucket_id, o.name
    from storage.objects o
   where o.bucket_id = 'community-photos'
     and o.created_at < now() - pg_catalog.make_interval(hours => greatest(coalesce(max_age_hours, 24), 1))
     and not exists (select 1 from public.community_post_photos ph where ph.photo_path = o.name)
     and not exists (select 1 from public.community_profiles cp where cp.avatar_path = o.name)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function private.service_enqueue_orphan_photos(int) from public, anon, authenticated;
grant execute on function private.service_enqueue_orphan_photos(int) to service_role;

create or replace function private.service_photos_in_use(names text[])
returns setof text language sql stable security definer set search_path = '' as $$
  select ph.photo_path
    from public.community_post_photos ph
   where ph.photo_path = any (coalesce(names, '{}'))
  union
  select cp.avatar_path
    from public.community_profiles cp
   where cp.avatar_path = any (coalesce(names, '{}'));
$$;
revoke all on function private.service_photos_in_use(text[]) from public, anon, authenticated;
grant execute on function private.service_photos_in_use(text[]) to service_role;

create or replace function private.service_prepare_account_deletion(target uuid)
returns table (bucket_id text, object_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_names text[];
begin
  if target is null then
    raise exception 'conta ausente' using errcode = '22023';
  end if;
  select coalesce(pg_catalog.array_agg(distinct x.name), '{}') into v_names
    from (
      select o.name from storage.objects o
       where o.bucket_id = 'community-photos' and o.owner_id = target::text
      union
      select ph.photo_path from public.community_post_photos ph
        join public.community_posts p on p.id = ph.post_id
       where p.author_id = target
    ) x;
  -- A foto de perfil vai para a fila dentro de purge_community_member (perfil v2).

  perform private.purge_community_member(target, true);

  insert into private.storage_deletion_queue (bucket_id, object_name)
  select 'community-photos', n from pg_catalog.unnest(v_names) n
  on conflict do nothing;

  return query select 'community-photos'::text, n from pg_catalog.unnest(v_names) n;
end $$;
revoke all on function private.service_prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function private.service_prepare_account_deletion(uuid) to service_role;

-- Foto de perfil: igual à do perfil v2, só que "já é foto de post" olha a tabela nova.
create or replace function private.set_community_avatar(new_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_old text;
begin
  if new_path is null
     or new_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' then
    raise exception 'foto inválida' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'community-photos' and o.name = new_path and o.owner_id = v_uid::text
  ) or exists (select 1 from public.community_post_photos ph where ph.photo_path = new_path)
     or exists (select 1 from public.community_profiles cp where cp.avatar_path = new_path and cp.user_id <> v_uid) then
    raise exception 'foto inválida' using errcode = '22023';
  end if;
  select cp.avatar_path into v_old from public.community_profiles cp where cp.user_id = v_uid;
  update public.community_profiles cp set
    avatar_path = new_path,
    avatar_status = 'in_review',
    avatar_ticket = gen_random_uuid(),
    avatar_submitted_at = now()
  where cp.user_id = v_uid;
  if v_old is not null and v_old <> new_path then
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('community-photos', v_old)
    on conflict do nothing;
  end if;
  return 'in_review';
end $$;
revoke all on function private.set_community_avatar(text) from public, anon;
grant execute on function private.set_community_avatar(text) to authenticated;

-- =============================================================================
-- F1 / F5 / F6: publicar
-- =============================================================================
drop function public.create_community_post(text, text, smallint);
drop function private.create_community_post(text, text, smallint);

-- Texto limpo sem foto aparece na hora. Texto que o filtro segura vai para análise
-- (e nenhum filtro de imagem o publica). Com foto e texto limpo, fica em análise
-- ('foto') até o filtro de imagem liberar (submit-post) ou uma pessoa aprovar.
create or replace function private.create_community_post(
  post_body text, post_photo_paths text[], post_day smallint, post_activity text,
  post_verse_book text, post_verse_chapter smallint, post_verse_start smallint, post_verse_end smallint,
  post_audience text
)
returns table (post_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := private.assert_can_publish();
  v_body text := nullif(trim(post_body), '');
  v_activity text := coalesce(nullif(trim(post_activity), ''), 'livre');
  v_audience text := coalesce(nullif(trim(post_audience), ''), 'igreja');
  v_photos text[] := coalesce(post_photo_paths, '{}');
  v_count int;
  v_ministry text;
  v_status public.community_content_status;
  v_hold text;
  v_id uuid;
  v_consent bigint;
begin
  if v_activity not in ('leitura', 'oracao', 'jejum', 'versiculo', 'livre') then
    raise exception 'tipo de atividade inválido' using errcode = '22023';
  end if;
  v_count := coalesce(pg_catalog.cardinality(v_photos), 0);
  if v_count > 4 then
    raise exception 'no máximo 4 fotos' using errcode = '22023';
  end if;
  if exists (select 1 from pg_catalog.unnest(v_photos) x where x is null)
     or (select count(distinct x) from pg_catalog.unnest(v_photos) x) <> v_count then
    raise exception 'foto repetida ou vazia' using errcode = '22023';
  end if;
  if v_body is not null and char_length(v_body) > 2000 then
    raise exception 'texto longo demais' using errcode = '22023';
  end if;
  if post_day is not null and (post_day < 1 or post_day > private.campaign_day()) then
    raise exception 'dia inválido' using errcode = '22023';
  end if;
  -- Versículo: só a referência (livro, capítulo, versículo inicial e, se houver, final).
  if num_nonnulls(post_verse_book, post_verse_chapter, post_verse_start, post_verse_end) > 0 then
    if post_verse_book is null or not private.is_bible_book(post_verse_book)
       or post_verse_chapter is null or post_verse_chapter not between 1 and 150
       or post_verse_start is null or post_verse_start not between 1 and 176
       or (post_verse_end is not null and post_verse_end not between post_verse_start and 176) then
      raise exception 'referência de versículo inválida' using errcode = '22023';
    end if;
  end if;
  if v_activity = 'versiculo' and post_verse_book is null then
    raise exception 'versículo sem referência' using errcode = '22023';
  end if;
  if v_body is null and v_count = 0 and post_day is null and post_verse_book is null and v_activity = 'livre' then
    raise exception 'publicação vazia' using errcode = '22023';
  end if;
  -- Público: toda a igreja, ou o ministério do MEU perfil (não dá para escolher outro).
  if v_audience = 'ministerio' then
    select cp.ministry into v_ministry from public.community_profiles cp where cp.user_id = v_uid;
    if v_ministry is null then
      raise exception 'sem ministério no perfil' using errcode = '22023';
    end if;
  elsif v_audience <> 'igreja' then
    raise exception 'público inválido' using errcode = '22023';
  end if;
  if (select count(*) from public.community_posts p
      where p.author_id = v_uid and p.created_at > now() - interval '1 day')
     >= private.community_setting('max_posts_per_day')::int then
    raise exception 'limite diário de publicações' using errcode = 'CM003';
  end if;

  -- Cada foto precisa ser um arquivo que ESTA pessoa subiu e que ainda não é foto
  -- de nada (post ou perfil).
  if exists (
    select 1 from pg_catalog.unnest(v_photos) x
    where not exists (
            select 1 from storage.objects o
            where o.bucket_id = 'community-photos' and o.name = x and o.owner_id = v_uid::text
          )
       or exists (select 1 from public.community_post_photos ph where ph.photo_path = x)
       or exists (select 1 from public.community_profiles cp where cp.avatar_path = x)
  ) then
    raise exception 'foto não encontrada' using errcode = 'P0002';
  end if;

  v_hold := private.community_text_verdict(v_body);
  if v_hold is null and v_count > 0 then
    v_hold := 'foto';   -- espera o filtro de imagem (submit-post) ou uma pessoa
  end if;
  v_status := case when v_hold is null then 'published'::public.community_content_status
                   else 'in_review'::public.community_content_status end;

  select c.id into v_consent
    from public.consent_records c
   where c.user_id = v_uid and c.purpose = 'community_publish' and c.revoked_at is null
   order by c.accepted_at desc
   limit 1;

  insert into public.community_posts (
    author_id, body, day_number, status, hold_reason, consent_id, published_at,
    activity, verse_book, verse_chapter, verse_start, verse_end, audience, audience_ministry
  ) values (
    v_uid, v_body, post_day, v_status, v_hold, v_consent, case when v_status = 'published' then now() end,
    v_activity, post_verse_book, post_verse_chapter, post_verse_start, post_verse_end,
    v_audience, case when v_audience = 'ministerio' then v_ministry end
  )
  returning id into v_id;

  insert into public.community_post_photos (post_id, sort_order, photo_path)
  select v_id, (x.n - 1)::smallint, x.path
    from pg_catalog.unnest(v_photos) with ordinality as x(path, n);

  if v_status = 'in_review' then
    insert into public.community_moderation_actions (decided_by, kind, post_id, target_user_id)
    values ('automatico', 'auto_hold', v_id, v_uid);
  end if;

  return query select v_id, v_status::text;
end $$;
revoke all on function private.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text) from public, anon;
grant execute on function private.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text) to authenticated;

create or replace function public.create_community_post(
  post_body text default null, post_photo_paths text[] default null, post_day smallint default null,
  post_activity text default 'livre', post_verse_book text default null, post_verse_chapter smallint default null,
  post_verse_start smallint default null, post_verse_end smallint default null, post_audience text default 'igreja'
)
returns table (post_id uuid, status text)
language sql security invoker set search_path = '' as $$
  select * from private.create_community_post(post_body, post_photo_paths, post_day, post_activity,
                                              post_verse_book, post_verse_chapter, post_verse_start, post_verse_end,
                                              post_audience);
$$;
revoke all on function public.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text) to authenticated;

-- =============================================================================
-- F3: quem disse Amém, do ponto de vista de quem lê (auxiliares sem EXECUTE para o app)
-- =============================================================================

-- Quantas pessoas ATIVAS disseram Amém, sem contar quem tem bloqueio com o leitor.
create or replace function private.amen_count_for(target_post uuid, viewer uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.community_amens am
    join public.community_profiles ap on ap.user_id = am.user_id and ap.status = 'active'
   where am.post_id = target_post
     and not private.blocked_between(viewer, am.user_id);
$$;
revoke all on function private.amen_count_for(uuid, uuid) from public, anon, authenticated;

-- Até 3 rostinhos: o meu primeiro, depois os mais recentes. Nome e foto de perfil
-- APROVADA (a minha sempre). Sem nome, a pessoa conta no número mas não tem rosto.
-- Nunca o user_id.
create or replace function private.amen_faces_for(target_post uuid, viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('name', f.display_name, 'avatar_path', f.avatar, 'is_mine', f.mine)
      order by f.mine desc, f.created_at desc
    ),
    '[]'::jsonb)
  from (
    select ap.display_name,
           case when ap.avatar_status = 'approved' or ap.user_id = viewer then ap.avatar_path end as avatar,
           am.user_id = viewer as mine,
           am.created_at
      from public.community_amens am
      join public.community_profiles ap on ap.user_id = am.user_id and ap.status = 'active'
     where am.post_id = target_post
       and ap.display_name is not null
       and not private.blocked_between(viewer, am.user_id)
     order by (am.user_id = viewer) desc, am.created_at desc
     limit 3
  ) f;
$$;
revoke all on function private.amen_faces_for(uuid, uuid) from public, anon, authenticated;

-- Comentários publicados que o leitor enxerga (autor ativo, sem bloqueio).
create or replace function private.comment_count_for(target_post uuid, viewer uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.community_comments c
    join public.community_profiles ca on ca.user_id = c.author_id and ca.status = 'active'
   where c.post_id = target_post
     and c.status = 'published'
     and not private.blocked_between(viewer, c.author_id);
$$;
revoke all on function private.comment_count_for(uuid, uuid) from public, anon, authenticated;

create or replace function private.post_photo_paths(target_post uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(ph.photo_path order by ph.sort_order), '{}')
    from public.community_post_photos ph
   where ph.post_id = target_post;
$$;
revoke all on function private.post_photo_paths(uuid) from public, anon, authenticated;

-- =============================================================================
-- Feed (F1, F3, F6)
-- =============================================================================
drop function public.community_feed(timestamptz, uuid);
drop function private.community_feed(timestamptz, uuid);

-- 20 por página, só a última semana (o feed tem fim). feed_scope:
--   'igreja'     tudo o que eu posso ver (toda a igreja + o que foi para o meu ministério);
--   'ministerio' só o que foi publicado para o meu ministério.
-- photo_path = a primeira foto (compatível com a versão anterior).
create or replace function private.community_feed(before_published_at timestamptz, before_post uuid, feed_scope text)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean, author_ministry text, author_avatar_path text,
  activity text, verse_book text, verse_chapter smallint, verse_start smallint, verse_end smallint,
  photo_paths text[], audience text, audience_ministry text,
  amen_count int, amen_faces jsonb, comment_count int
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select (select auth.uid()) as uid,
           (select cp.ministry from public.community_profiles cp where cp.user_id = (select auth.uid())) as ministry
  ),
  page as (
    select p.id, p.body, p.day_number, p.published_at, p.author_id, p.activity,
           p.verse_book, p.verse_chapter, p.verse_start, p.verse_end, p.audience, p.audience_ministry,
           a.display_name, a.ministry as author_ministry,
           case when a.avatar_status = 'approved' or p.author_id = me.uid then a.avatar_path end as author_avatar
      from public.community_posts p
      join public.community_profiles a on a.user_id = p.author_id and a.status = 'active'
      cross join me
     where private.is_community_member(me.uid)
       and p.status = 'published'
       and p.published_at > now() - pg_catalog.make_interval(days => private.community_setting('feed_window_days')::int)
       and not private.blocked_between(me.uid, p.author_id)
       and (p.audience = 'igreja' or p.author_id = me.uid or p.audience_ministry = me.ministry)
       and (coalesce(feed_scope, 'igreja') <> 'ministerio'
            or (p.audience = 'ministerio' and p.audience_ministry = me.ministry))
       and (
         before_published_at is null
         or (p.published_at, p.id) < (before_published_at,
                                      coalesce(before_post, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
       )
     order by p.published_at desc, p.id desc
     limit 20
  )
  select pg.id, pg.body,
         (private.post_photo_paths(pg.id))[1],
         pg.day_number, pg.published_at,
         pg.display_name,
         pg.author_id = me.uid,
         exists (
           select 1 from public.community_amens am
           where am.post_id = pg.id and am.user_id = me.uid
         ),
         pg.author_ministry,
         pg.author_avatar,
         pg.activity, pg.verse_book, pg.verse_chapter, pg.verse_start, pg.verse_end,
         private.post_photo_paths(pg.id),
         pg.audience, pg.audience_ministry,
         private.amen_count_for(pg.id, me.uid),
         private.amen_faces_for(pg.id, me.uid),
         private.comment_count_for(pg.id, me.uid)
    from page pg
   cross join me
   order by pg.published_at desc, pg.id desc;
$$;
revoke all on function private.community_feed(timestamptz, uuid, text) from public, anon;
grant execute on function private.community_feed(timestamptz, uuid, text) to authenticated;

create or replace function public.community_feed(
  before_published_at timestamptz default null, before_post uuid default null, feed_scope text default 'igreja'
)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean, author_ministry text, author_avatar_path text,
  activity text, verse_book text, verse_chapter smallint, verse_start smallint, verse_end smallint,
  photo_paths text[], audience text, audience_ministry text,
  amen_count int, amen_faces jsonb, comment_count int
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_feed(before_published_at, before_post, feed_scope);
$$;
revoke all on function public.community_feed(timestamptz, uuid, text) from public, anon;
grant execute on function public.community_feed(timestamptz, uuid, text) to authenticated;

-- =============================================================================
-- "Minhas publicações" com os campos novos
-- =============================================================================
drop function public.my_community_posts();
drop function private.my_community_posts();

create or replace function private.my_community_posts()
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, status text, hold_reason text,
  created_at timestamptz, published_at timestamptz,
  decided_by text, reason text, note_for_author text,
  activity text, verse_book text, verse_chapter smallint, verse_start smallint, verse_end smallint,
  photo_paths text[], audience text, audience_ministry text, amen_count int, comment_count int,
  amen_faces jsonb
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.body, (private.post_photo_paths(p.id))[1], p.day_number, p.status::text, p.hold_reason,
         p.created_at, p.published_at,
         la.decided_by, la.reason::text, la.note_for_author,
         p.activity, p.verse_book, p.verse_chapter, p.verse_start, p.verse_end,
         private.post_photo_paths(p.id), p.audience, p.audience_ministry,
         private.amen_count_for(p.id, (select auth.uid())),
         private.comment_count_for(p.id, (select auth.uid())),
         private.amen_faces_for(p.id, (select auth.uid()))
  from public.community_posts p
  left join lateral (
    select m.decided_by, m.reason, m.note_for_author
    from public.community_moderation_actions m
    where m.post_id = p.id
    order by m.created_at desc, m.id desc
    limit 1
  ) la on true
  where p.author_id = (select auth.uid())
  order by p.created_at desc
  limit 100;
$$;
revoke all on function private.my_community_posts() from public, anon;
grant execute on function private.my_community_posts() to authenticated;

create or replace function public.my_community_posts()
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, status text, hold_reason text,
  created_at timestamptz, published_at timestamptz,
  decided_by text, reason text, note_for_author text,
  activity text, verse_book text, verse_chapter smallint, verse_start smallint, verse_end smallint,
  photo_paths text[], audience text, audience_ministry text, amen_count int, comment_count int,
  amen_faces jsonb
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_posts();
$$;
revoke all on function public.my_community_posts() from public, anon;
grant execute on function public.my_community_posts() to authenticated;

-- =============================================================================
-- Moderação: recusar/remover apaga as fotos (a tabela nova); a fila mostra todas
-- as fotos, o resultado do filtro automático e os rótulos (só para a moderação)
-- =============================================================================
create or replace function private.moderate_community_post(
  target_post uuid, decision text, decision_reason text, note_for_author text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_author uuid;
  v_status public.community_content_status;
  v_has_content boolean;
  v_reason public.community_report_reason;
begin
  if v_uid is null or not private.is_community_moderator() then
    raise exception 'apenas moderação' using errcode = '42501';
  end if;
  if note_for_author is not null and char_length(note_for_author) > 500 then
    raise exception 'nota longa demais' using errcode = '22023';
  end if;
  begin
    v_reason := decision_reason::public.community_report_reason;
  exception when invalid_text_representation then
    raise exception 'motivo inválido' using errcode = '22023';
  end;
  if decision in ('reject', 'remove') and v_reason is null then
    raise exception 'recusar ou remover exige motivo' using errcode = '22023';
  end if;

  -- Conteúdo que sobra sem as fotos: texto, dia, versículo ou o tipo da atividade.
  select p.author_id, p.status,
         p.body is not null or p.day_number is not null or p.verse_book is not null or p.activity <> 'livre'
    into v_author, v_status, v_has_content
    from public.community_posts p where p.id = target_post for update;
  if not found then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  if v_author = v_uid then
    raise exception 'ninguém modera o próprio conteúdo' using errcode = '42501';
  end if;

  if decision = 'approve' and v_status = 'in_review' then
    update public.community_posts p
       set status = 'published', published_at = coalesce(p.published_at, now()),
           hold_reason = null, decided_at = now()
     where p.id = target_post;
    update public.community_reports r set status = 'dismissed', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'reject' and v_status = 'in_review' then
    update public.community_posts p set status = 'not_published', decided_at = now() where p.id = target_post;
    delete from public.community_post_photos ph where ph.post_id = target_post;   -- vão para a fila
    update public.community_reports r set status = 'actioned', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'remove' and v_status in ('published', 'in_review') then
    update public.community_posts p set status = 'removed', decided_at = now() where p.id = target_post;
    delete from public.community_post_photos ph where ph.post_id = target_post;
    update public.community_reports r set status = 'actioned', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'restore' and v_status in ('removed', 'not_published') then
    -- As fotos já foram apagadas; só volta se sobrou outro conteúdo.
    if not v_has_content then
      raise exception 'não há mais conteúdo para restaurar' using errcode = '22023';
    end if;
    update public.community_posts p
       set status = 'published', published_at = coalesce(p.published_at, now()),
           hold_reason = null, decided_at = now()
     where p.id = target_post;
  else
    raise exception 'decisão inválida para o estado atual' using errcode = '22023';
  end if;

  insert into public.community_moderation_actions (actor_id, decided_by, kind, post_id, target_user_id, reason, note_for_author)
  values (v_uid, 'pessoa', decision::public.community_moderation_kind, target_post, v_author, v_reason,
          nullif(trim(note_for_author), ''));
end $$;
revoke all on function private.moderate_community_post(uuid, text, text, text) from public, anon;
grant execute on function private.moderate_community_post(uuid, text, text, text) to authenticated;

drop function public.community_moderation_queue();
drop function private.community_moderation_queue();

-- Resultado do filtro de imagem do post inteiro: suspeita > erro > pendente > limpa.
create or replace function private.post_photo_check(target_post uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from public.community_post_photos ph where ph.post_id = target_post) then null
    when exists (select 1 from public.community_post_photos ph where ph.post_id = target_post and ph.auto_check = 'suspeita') then 'suspeita'
    when exists (select 1 from public.community_post_photos ph where ph.post_id = target_post and ph.auto_check = 'erro') then 'erro'
    when exists (select 1 from public.community_post_photos ph where ph.post_id = target_post and ph.auto_check = 'pendente') then 'pendente'
    else 'limpa'
  end;
$$;
revoke all on function private.post_photo_check(uuid) from public, anon, authenticated;

create or replace function private.community_moderation_queue()
returns table (
  item_kind text, item_id uuid, post_id uuid, body text, photo_path text, hold_reason text,
  item_status text, author_known boolean, author_name text, author_status text, created_at timestamptz,
  open_reports int, urgent boolean, due_at timestamptz,
  photo_paths text[], photo_check text, photo_labels text[], activity text, audience_ministry text
)
language sql stable security definer set search_path = '' as $$
  with open_r as (
    select r.target_kind, coalesce(r.comment_id, r.post_id) as target_id,
           count(*)::int as n, bool_or(r.urgent) as urgent, min(r.due_at) as due
    from public.community_reports r
    where r.status = 'open' and r.target_kind in ('post', 'comment')
    group by r.target_kind, coalesce(r.comment_id, r.post_id)
  ),
  items as (
    select 'post'::text as kind, p.id as item_id, p.id as post_id, p.body, p.hold_reason,
           p.status, p.author_id, p.created_at, p.activity, p.audience_ministry
    from public.community_posts p
    where p.status = 'in_review'
       or exists (select 1 from open_r o where o.target_kind = 'post' and o.target_id = p.id)
    union all
    select 'comment'::text, c.id, c.post_id, c.body, c.hold_reason,
           c.status, c.author_id, c.created_at, null::text, null::text
    from public.community_comments c
    where c.status = 'in_review'
       or exists (select 1 from open_r o where o.target_kind = 'comment' and o.target_id = c.id)
  )
  select i.kind, i.item_id, i.post_id, i.body,
         case when i.kind = 'post' then (private.post_photo_paths(i.item_id))[1] end,
         i.hold_reason, i.status::text,
         i.author_id is not null, a.display_name, a.status::text, i.created_at,
         coalesce(o.n, 0), coalesce(o.urgent, false), o.due,
         case when i.kind = 'post' then private.post_photo_paths(i.item_id) else '{}'::text[] end,
         case when i.kind = 'post' then private.post_photo_check(i.item_id) end,
         case when i.kind = 'post' then (
           select coalesce(pg_catalog.array_agg(distinct l), '{}')
             from public.community_post_photos ph
             cross join lateral pg_catalog.unnest(coalesce(ph.auto_labels, '{}')) l
            where ph.post_id = i.item_id
         ) else '{}'::text[] end,
         i.activity, i.audience_ministry
  from items i
  left join public.community_profiles a on a.user_id = i.author_id
  left join open_r o on o.target_kind::text = i.kind and o.target_id = i.item_id
  where (select private.is_community_moderator())
  order by coalesce(o.urgent, false) desc, coalesce(o.due, i.created_at) asc
  limit 200;
$$;
revoke all on function private.community_moderation_queue() from public, anon;
grant execute on function private.community_moderation_queue() to authenticated;

create or replace function public.community_moderation_queue()
returns table (
  item_kind text, item_id uuid, post_id uuid, body text, photo_path text, hold_reason text,
  item_status text, author_known boolean, author_name text, author_status text, created_at timestamptz,
  open_reports int, urgent boolean, due_at timestamptz,
  photo_paths text[], photo_check text, photo_labels text[], activity text, audience_ministry text
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_moderation_queue();
$$;
revoke all on function public.community_moderation_queue() from public, anon;
grant execute on function public.community_moderation_queue() to authenticated;

-- =============================================================================
-- F8: atividade no app (sem push)
-- =============================================================================

-- O que EU posso ver da minha atividade: quem agiu está ativo, sem bloqueio nos
-- dois sentidos, e o comentário ainda está publicado. Últimos 30 dias.
create or replace function private.my_visible_activity()
returns table (id uuid, kind text, post_id uuid, comment_id uuid, actor_id uuid, created_at timestamptz, seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select ac.id, ac.kind, ac.post_id, ac.comment_id, ac.actor_id, ac.created_at, ac.seen_at
    from public.community_activity ac
    join public.community_profiles actor on actor.user_id = ac.actor_id and actor.status = 'active'
    left join public.community_comments c on c.id = ac.comment_id
   where ac.recipient_id = (select auth.uid())
     and private.is_community_member((select auth.uid()))
     and ac.created_at > now() - interval '30 days'
     and not private.blocked_between((select auth.uid()), ac.actor_id)
     and (ac.kind = 'amen' or c.status = 'published');
$$;
revoke all on function private.my_visible_activity() from public, anon, authenticated;

create or replace function private.my_community_activity()
returns table (
  activity_id uuid, kind text, post_id uuid, actor_name text, actor_avatar_path text,
  created_at timestamptz, preview text, unread boolean
)
language sql stable security definer set search_path = '' as $$
  select v.id, v.kind, v.post_id, actor.display_name,
         case when actor.avatar_status = 'approved' then actor.avatar_path end,
         v.created_at,
         left(c.body, 140),
         v.seen_at is null
    from private.my_visible_activity() v
    join public.community_profiles actor on actor.user_id = v.actor_id
    left join public.community_comments c on c.id = v.comment_id
   order by v.created_at desc, v.id desc
   limit 100;
$$;
revoke all on function private.my_community_activity() from public, anon;
grant execute on function private.my_community_activity() to authenticated;

create or replace function public.my_community_activity()
returns table (
  activity_id uuid, kind text, post_id uuid, actor_name text, actor_avatar_path text,
  created_at timestamptz, preview text, unread boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_activity();
$$;
revoke all on function public.my_community_activity() from public, anon;
grant execute on function public.my_community_activity() to authenticated;

-- Marca como vista toda a MINHA atividade. Devolve quantas mudaram.
create or replace function private.mark_community_activity_seen()
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count int;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  update public.community_activity ac set seen_at = now()
   where ac.recipient_id = v_uid and ac.seen_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function private.mark_community_activity_seen() from public, anon;
grant execute on function private.mark_community_activity_seen() to authenticated;

create or replace function public.mark_community_activity_seen()
returns int language sql security invoker set search_path = '' as $$
  select private.mark_community_activity_seen();
$$;
revoke all on function public.mark_community_activity_seen() from public, anon;
grant execute on function public.mark_community_activity_seen() to authenticated;

-- Estado da pessoa com o ponto de novidade no sino (has_new_activity).
drop function public.my_community_status();
drop function private.my_community_status();

create or replace function private.my_community_status()
returns table (
  is_member boolean, member_status text, display_name text, can_publish boolean,
  needs_publish_consent boolean, needs_rules boolean,
  publish_consent_version text, rules_version text, is_moderator boolean,
  ministry text, ministry_answered boolean, bio text, avatar_path text, avatar_status text,
  age_confirmed boolean, contact_email text, news_opt_in boolean, profile_complete boolean,
  has_new_activity boolean
)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(cp.status = 'active', false),
    cp.status::text,
    cp.display_name,
    private.can_publish(),
    not exists (
      select 1 from public.consent_records c
      where c.user_id = (select auth.uid()) and c.purpose = 'community_publish' and c.revoked_at is null
        and c.text_version = private.community_setting('publish_consent_version')
    ),
    not exists (
      select 1 from public.consent_records c
      where c.user_id = (select auth.uid()) and c.purpose = 'community_rules' and c.revoked_at is null
        and c.text_version = private.community_setting('rules_version')
    ),
    private.community_setting('publish_consent_version'),
    private.community_setting('rules_version'),
    private.is_community_moderator(),
    cp.ministry,
    coalesce(cp.ministry_answered, false),
    cp.bio,
    cp.avatar_path,
    coalesce(cp.avatar_status, 'none'),
    cp.adult_attested_at is not null,
    cp.contact_email,
    cp.news_opt_in_at is not null,
    private.community_profile_complete((select auth.uid())),
    exists (select 1 from private.my_visible_activity() v where v.seen_at is null)
  from (select 1) as one
  left join public.community_profiles cp on cp.user_id = (select auth.uid())
  where (select auth.uid()) is not null;
$$;
revoke all on function private.my_community_status() from public, anon;
grant execute on function private.my_community_status() to authenticated;

create or replace function public.my_community_status()
returns table (
  is_member boolean, member_status text, display_name text, can_publish boolean,
  needs_publish_consent boolean, needs_rules boolean,
  publish_consent_version text, rules_version text, is_moderator boolean,
  ministry text, ministry_answered boolean, bio text, avatar_path text, avatar_status text,
  age_confirmed boolean, contact_email text, news_opt_in boolean, profile_complete boolean,
  has_new_activity boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_status();
$$;
revoke all on function public.my_community_status() from public, anon;
grant execute on function public.my_community_status() to authenticated;

-- =============================================================================
-- F5: filtro automático de imagem — só a chave de serviço (Edge Function submit-post)
-- =============================================================================

-- Fotos do post que ainda esperam o filtro. Vazio se o post não está mais
-- esperando (uma pessoa já decidiu, o filtro de texto segurou, foi apagado).
create or replace function private.service_post_photos_for_check(target_post uuid)
returns table (photo_path text)
language sql stable security definer set search_path = '' as $$
  select ph.photo_path
    from public.community_post_photos ph
    join public.community_posts p on p.id = ph.post_id
   where p.id = target_post
     and p.status = 'in_review' and p.hold_reason = 'foto' and p.decided_at is null
     and ph.auto_check = 'pendente'
   order by ph.sort_order;
$$;
revoke all on function private.service_post_photos_for_check(uuid) from public, anon, authenticated;
grant execute on function private.service_post_photos_for_check(uuid) to service_role;

create or replace function public.service_post_photos_for_check(target_post uuid)
returns table (photo_path text)
language sql stable security invoker set search_path = '' as $$
  select * from private.service_post_photos_for_check(target_post);
$$;
revoke all on function public.service_post_photos_for_check(uuid) from public, anon, authenticated;
grant execute on function public.service_post_photos_for_check(uuid) to service_role;

-- Grava o resultado do filtro de cada foto: [{photo_path, verdict: limpa|suspeita|erro, labels: [...]}].
-- Tudo limpo e o post ainda esperando SÓ a foto → publicado na hora, com
-- decided_by = 'automatico' (o autor vê "decidido pelo filtro automático").
-- decided_at fica nulo: a segunda passada do texto (moderate-text) ainda pode segurar.
-- Qualquer suspeita ou erro → continua em análise para uma pessoa. Devolve o estado.
create or replace function private.service_record_photo_checks(target_post uuid, provider text, results jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_verdict text;
  v_author uuid;
  v_status public.community_content_status;
  v_hold text;
  v_decided timestamptz;
  v_body text;
  v_open int;
begin
  if provider is null or provider !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'provedor inválido' using errcode = '22023';
  end if;
  if results is null or pg_catalog.jsonb_typeof(results) <> 'array' then
    raise exception 'resultado inválido' using errcode = '22023';
  end if;

  select p.author_id, p.status, p.hold_reason, p.decided_at, p.body
    into v_author, v_status, v_hold, v_decided, v_body
    from public.community_posts p where p.id = target_post for update;
  if not found then
    return null;
  end if;

  for v_item in select * from pg_catalog.jsonb_array_elements(results) loop
    v_verdict := v_item ->> 'verdict';
    if v_verdict is null or v_verdict not in ('limpa', 'suspeita', 'erro') then
      raise exception 'veredito inválido' using errcode = '22023';
    end if;
    update public.community_post_photos ph set
      auto_check = v_verdict,
      auto_provider = provider,
      checked_at = now(),
      auto_labels = (
        select pg_catalog.array_agg(left(l.value, 80))
          from (
            select x.value
              from pg_catalog.jsonb_array_elements_text(
                     case when pg_catalog.jsonb_typeof(v_item -> 'labels') = 'array' then v_item -> 'labels'
                          else '[]'::jsonb end) as x(value)
             limit 20
          ) l
      )
    where ph.post_id = target_post and ph.photo_path = (v_item ->> 'photo_path') and ph.auto_check = 'pendente';
  end loop;

  select count(*)::int into v_open
    from public.community_post_photos ph
   where ph.post_id = target_post and ph.auto_check <> 'limpa';

  if v_status = 'in_review' and v_hold = 'foto' and v_decided is null and v_open = 0
     and exists (select 1 from public.community_post_photos ph where ph.post_id = target_post) then
    update public.community_posts p
       set status = 'published', published_at = now(), hold_reason = null
     where p.id = target_post;
    insert into public.community_moderation_actions (decided_by, kind, post_id, target_user_id)
    values ('automatico', 'approve', target_post, v_author);
    -- Segunda passada do texto (disfarces), como no texto que aparece na hora.
    if v_body is not null then
      perform private.community_call_function(
        'moderate-text',
        pg_catalog.jsonb_build_object('action', 'recheck', 'kind', 'post', 'id', target_post)
      );
    end if;
    return 'published';
  end if;
  return v_status::text;
end $$;
revoke all on function private.service_record_photo_checks(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function private.service_record_photo_checks(uuid, text, jsonb) to service_role;

create or replace function public.service_record_photo_checks(target_post uuid, provider text, results jsonb)
returns text language sql security invoker set search_path = '' as $$
  select private.service_record_photo_checks(target_post, provider, results);
$$;
revoke all on function public.service_record_photo_checks(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.service_record_photo_checks(uuid, text, jsonb) to service_role;

-- Posts que ficaram esperando o filtro (a função caiu no meio, o provedor ficou
-- fora do ar): a varredura (submit-post, ação sweep, com o segredo do cron) retoma.
create or replace function private.service_pending_photo_posts(max_items int, min_age_seconds int)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id
    from public.community_posts p
   where p.status = 'in_review' and p.hold_reason = 'foto' and p.decided_at is null
     and p.created_at <= now() - pg_catalog.make_interval(secs => greatest(coalesce(min_age_seconds, 120), 0))
     and exists (
       select 1 from public.community_post_photos ph where ph.post_id = p.id and ph.auto_check = 'pendente'
     )
   order by p.created_at
   limit least(greatest(coalesce(max_items, 20), 1), 100);
$$;
revoke all on function private.service_pending_photo_posts(int, int) from public, anon, authenticated;
grant execute on function private.service_pending_photo_posts(int, int) to service_role;

create or replace function public.service_pending_photo_posts(max_items int default 20, min_age_seconds int default 120)
returns setof uuid language sql stable security invoker set search_path = '' as $$
  select * from private.service_pending_photo_posts(max_items, min_age_seconds);
$$;
revoke all on function public.service_pending_photo_posts(int, int) from public, anon, authenticated;
grant execute on function public.service_pending_photo_posts(int, int) to service_role;
