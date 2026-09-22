-- =============================================================================
-- COMUNIDADE ("Juntos") — a igreja inteira (decisão do fundador em 2026-09-22,
-- prévia do Dia 23): FIM DO PÚBLICO POR MINISTÉRIO.
--
-- Todo post vai para a igreja inteira. A coluna `audience` (e `audience_ministry`)
-- CONTINUA na tabela — ninguém apaga dado por causa de uma decisão de produto —
-- mas o app não a usa mais e a RPC RECUSA qualquer público que não seja 'igreja'
-- com 22023 (invalid_input no cliente). O feed perde o parâmetro `feed_scope`:
-- passa a existir um feed só.
--
-- Linha antiga com audience = 'ministerio' continua restrita ao ministério dela
-- (private.audience_allows, inalterada): decisão nova não torna público o que já
-- foi publicado como restrito.
--
-- O que NÃO muda aqui: foto de post continua esperando o filtro automático de
-- imagem (submit-post) ou uma pessoa, e foto de perfil continua aparecendo para
-- os outros só depois da moderação. As duas outras decisões de 2026-09-22
-- (publicar foto sem filtro configurado; foto de perfil sem conferência antes de
-- aparecer) NÃO estão implementadas: ver "pedidos" no relatório e
-- docs/technical/COMUNIDADE_V2_ARQUITETURA.md §6.
--
-- EXECUTADO em 2026-09-22 no PGlite local (mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro
-- `supabase db reset && supabase test db` continua obrigatório.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Publicar: só para a igreja inteira
-- ---------------------------------------------------------------------------
-- Mesma função de 20260922180000_comunidade_diario.sql, com uma mudança: o
-- público 'ministerio' (e qualquer outro valor) é recusado com 22023. O
-- parâmetro continua existindo para o cliente antigo não quebrar; ele só aceita
-- 'igreja' (ou vazio, que vira 'igreja').
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
  -- Público: só a igreja inteira (2026-09-22). "Meu ministério" acabou.
  if v_audience <> 'igreja' then
    raise exception 'todo post vai para a igreja inteira' using errcode = '22023';
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
    'igreja', null
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

-- ---------------------------------------------------------------------------
-- Feed: sem escopo. Um feed só, da igreja inteira.
-- ---------------------------------------------------------------------------
drop function public.community_feed(timestamptz, uuid, text);
drop function private.community_feed(timestamptz, uuid, text);

-- 20 por página, só a última semana (o feed tem fim). photo_path = a primeira foto.
-- A cláusula de público continua aqui só por causa das linhas antigas
-- (audience = 'ministerio'), que continuam restritas; post novo é sempre 'igreja'.
create or replace function private.community_feed(before_published_at timestamptz, before_post uuid)
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
revoke all on function private.community_feed(timestamptz, uuid) from public, anon;
grant execute on function private.community_feed(timestamptz, uuid) to authenticated;

create or replace function public.community_feed(
  before_published_at timestamptz default null, before_post uuid default null
)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean, author_ministry text, author_avatar_path text,
  activity text, verse_book text, verse_chapter smallint, verse_start smallint, verse_end smallint,
  photo_paths text[], audience text, audience_ministry text,
  amen_count int, amen_faces jsonb, comment_count int
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_feed(before_published_at, before_post);
$$;
revoke all on function public.community_feed(timestamptz, uuid) from public, anon;
grant execute on function public.community_feed(timestamptz, uuid) to authenticated;
