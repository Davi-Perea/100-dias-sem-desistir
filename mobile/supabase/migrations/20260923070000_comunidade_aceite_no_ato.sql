-- =============================================================================
-- COMUNIDADE ("Juntos") — ACEITE NO ATO DE PUBLICAR (decisão do fundador em
-- 2026-09-22, prévia do Dia 23): a TELA de aceite antes de participar SAI.
--
-- No lugar dela, uma linha embaixo do botão:
--   "Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do
--    Juntos."  (com link para as regras)
-- e o aceite é registrado NESSE TOQUE, na MESMA chamada que publica / comenta /
-- diz Amém. Sem tela no meio, sem ida e volta, sem post perdido porque a pessoa
-- voltou de uma tela de termos.
--
-- O QUE NÃO MUDA (e é o ponto):
--   * o registro continua existindo, com FINALIDADE, VERSÃO, HASH DO TEXTO EXATO
--     que a tela mostrou, versão do app e DATA/HORA (public.consent_records).
--     LGPD art. 8º, §6º: o controlador tem de conseguir provar como o
--     consentimento foi obtido — a prova é a mesma de antes, o que mudou é onde
--     a pessoa toca;
--   * o consentimento de convicção religiosa (art. 11) continua específico e
--     destacado: o texto está na tela, acima do botão, com link para o completo;
--   * o texto ainda PENDENTE (versão 'PENDENTE') continua impedindo tudo: sem
--     texto aprovado ninguém aceita e ninguém publica (CM005);
--   * a declaração de 16+ continua guardada em community_profiles.adult_attested_at
--     (Google Play exige aceite ANTES de criar conteúdo; Apple 1.2 idem — é
--     exatamente o que este caminho faz: nada é criado sem o aceite na mesma
--     transação).
--
-- ATOMICIDADE: tudo numa transação só. Se a publicação for recusada (texto longo,
-- limite diário, foto de outra pessoa), o aceite ROLA JUNTO: não fica registro de
-- consentimento de um toque que não publicou nada. E não existe o contrário —
-- conteúdo criado sem o aceite registrado.
--
-- ORDEM dentro de cada função: aceite primeiro, barreira depois. As barreiras
-- (assert_can_publish) são STABLE, mas rodam como comandos SEPARADOS do plpgsql,
-- então já veem o que o aceite acabou de gravar. O teste 19 prova isso no banco.
--
-- Compatibilidade: o parâmetro novo é o ÚLTIMO e tem default null. Chamada sem
-- ele = comportamento anterior (quem já aceitou continua publicando sem reenviar
-- nada). O PostgREST resolve por nome de argumento, então cliente antigo não quebra.
--
-- EXECUTADO em 2026-09-22 no PGlite local (mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro
-- `supabase db reset && supabase test db` continua obrigatório.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- O aceite embutido
-- ---------------------------------------------------------------------------
-- Formato de `accept_terms` (jsonb; null = nada a registrar):
--   {
--     "confirms_16": true,          -- OBRIGATÓRIO: é o que a linha do botão diz
--     "name": "Ana",                -- opcional, só usado se a pessoa ainda não tem nome
--     "rules_version": "r-1",       -- par versão + sha256 do texto das REGRAS
--     "rules_sha256": "…64 hex…",
--     "consent_version": "c-1",     -- par versão + sha256 do CONSENTIMENTO
--     "consent_sha256": "…64 hex…",
--     "app_version": "1.0.0 (12)"
--   }
-- Cada par vai para private.accept_community_terms, que é quem confere versão e
-- hash contra o que o servidor tem configurado (CM005 se estiver desatualizado)
-- e não duplica registro de uma versão já aceita.
create or replace function private.apply_inline_accept(accept_terms jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
begin
  if accept_terms is null or pg_catalog.jsonb_typeof(accept_terms) = 'null' then
    return;  -- quem já aceitou não reenvia nada
  end if;
  if pg_catalog.jsonb_typeof(accept_terms) <> 'object' then
    raise exception 'aceite inválido' using errcode = '22023';
  end if;
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  -- A linha embaixo do botão diz "você confirma que tem 16 anos ou mais": sem
  -- essa confirmação explícita no corpo, o toque não vale como aceite.
  if accept_terms -> 'confirms_16' is distinct from 'true'::jsonb then
    raise exception 'confirmação de 16 anos ou mais obrigatória' using errcode = '22023';
  end if;

  v_name := nullif(trim(coalesce(accept_terms ->> 'name', '')), '');
  if v_name is not null and char_length(v_name) > 40 then
    raise exception 'nome inválido' using errcode = '22023';
  end if;

  -- Quem ainda não é membro entra neste mesmo toque (C3: entrar é criar o perfil).
  -- join_community recusa quem está suspenso ou removido (CM004).
  if not exists (select 1 from public.community_profiles cp where cp.user_id = v_uid) then
    perform private.join_community(v_name);
  end if;
  perform private.assert_member();

  update public.community_profiles cp set
    -- Nome já escolhido NUNCA é trocado por este caminho: o toque de publicar não
    -- renomeia ninguém (o nome vem no corpo só para quem ainda não tem).
    display_name      = coalesce(cp.display_name, v_name),
    adult_attested_at = coalesce(cp.adult_attested_at, now())
  where cp.user_id = v_uid;

  if accept_terms ? 'rules_version' then
    perform private.accept_community_terms(
      'community_rules',
      accept_terms ->> 'rules_version',
      accept_terms ->> 'rules_sha256',
      accept_terms ->> 'app_version'
    );
  end if;
  if accept_terms ? 'consent_version' then
    perform private.accept_community_terms(
      'community_publish',
      accept_terms ->> 'consent_version',
      accept_terms ->> 'consent_sha256',
      accept_terms ->> 'app_version'
    );
  end if;
end $$;
revoke all on function private.apply_inline_accept(jsonb) from public, anon, authenticated;

-- private.accept_community_terms exige sha256 no formato certo; o app manda o
-- hash do texto que MOSTROU. Um corpo sem o hash (chave ausente) cai em CM005 /
-- 22023 lá dentro, não aqui: a conferência é de quem já a fazia.

-- ---------------------------------------------------------------------------
-- Publicar (F1) com o aceite no mesmo toque
-- ---------------------------------------------------------------------------
-- Mesma função de 20260923060000_comunidade_igreja_inteira.sql. As duas únicas
-- mudanças: o parâmetro `accept_terms` e a ordem (aceite → barreira).
drop function public.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text);
drop function private.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text);

create or replace function private.create_community_post(
  post_body text, post_photo_paths text[], post_day smallint, post_activity text,
  post_verse_book text, post_verse_chapter smallint, post_verse_start smallint, post_verse_end smallint,
  post_audience text, accept_terms jsonb
)
returns table (post_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid;
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
  -- O toque que publica é o toque que aceita (2026-09-22). Vem antes da barreira,
  -- e a barreira já o enxerga (comando separado, mesma transação).
  perform private.apply_inline_accept(accept_terms);
  v_uid := private.assert_can_publish();

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
revoke all on function private.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text, jsonb) from public, anon;
grant execute on function private.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text, jsonb) to authenticated;

create or replace function public.create_community_post(
  post_body text default null, post_photo_paths text[] default null, post_day smallint default null,
  post_activity text default 'livre',
  post_verse_book text default null, post_verse_chapter smallint default null,
  post_verse_start smallint default null, post_verse_end smallint default null,
  post_audience text default 'igreja', accept_terms jsonb default null
)
returns table (post_id uuid, status text)
language sql security invoker set search_path = '' as $$
  select * from private.create_community_post(
    post_body, post_photo_paths, post_day, post_activity,
    post_verse_book, post_verse_chapter, post_verse_start, post_verse_end, post_audience, accept_terms
  );
$$;
revoke all on function public.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text, jsonb) from public, anon;
grant execute on function public.create_community_post(text, text[], smallint, text, text, smallint, smallint, smallint, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Comentar com o aceite no mesmo toque ("Ao comentar, você confirma…")
-- ---------------------------------------------------------------------------
drop function public.create_community_comment(uuid, text);
drop function private.create_community_comment(uuid, text);

create or replace function private.create_community_comment(target_post uuid, comment_body text, accept_terms jsonb)
returns table (comment_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid;
  v_body text := nullif(trim(comment_body), '');
  v_hold text;
  v_status public.community_content_status;
  v_id uuid;
begin
  perform private.apply_inline_accept(accept_terms);
  v_uid := private.assert_can_publish();

  if v_body is null or char_length(v_body) > 1000 then
    raise exception 'comentário inválido' using errcode = '22023';
  end if;
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  if (select count(*) from public.community_comments c
      where c.author_id = v_uid and c.created_at > now() - interval '1 day')
     >= private.community_setting('max_comments_per_day')::int then
    raise exception 'limite diário de comentários' using errcode = 'CM003';
  end if;

  v_hold := private.community_text_verdict(v_body);
  v_status := case when v_hold is null then 'published'::public.community_content_status
                     else 'in_review'::public.community_content_status end;

  insert into public.community_comments (post_id, author_id, body, status, hold_reason, published_at)
  values (target_post, v_uid, v_body, v_status, v_hold, case when v_status = 'published' then now() end)
  returning id into v_id;

  if v_status = 'in_review' then
    insert into public.community_moderation_actions (decided_by, kind, comment_id, target_user_id)
    values ('automatico', 'auto_hold', v_id, v_uid);
  end if;

  return query select v_id, v_status::text;
end $$;
revoke all on function private.create_community_comment(uuid, text, jsonb) from public, anon;
grant execute on function private.create_community_comment(uuid, text, jsonb) to authenticated;

create or replace function public.create_community_comment(
  target_post uuid, comment_body text, accept_terms jsonb default null
)
returns table (comment_id uuid, status text)
language sql security invoker set search_path = '' as $$
  select * from private.create_community_comment(target_post, comment_body, accept_terms);
$$;
revoke all on function public.create_community_comment(uuid, text, jsonb) from public, anon;
grant execute on function public.create_community_comment(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Amém (post e comentário) com o aceite no mesmo toque
-- ---------------------------------------------------------------------------
-- O rostinho do Amém mostra o NOME de quem deu, então marcar exige o mesmo que
-- publicar (20260923050000). Agora o primeiro Amém também pode trazer o aceite.
-- DESMARCAR continua livre e NUNCA registra aceite: sai antes de tudo.
drop function public.set_amen(uuid, boolean);
drop function private.set_amen(uuid, boolean);

create or replace function private.set_amen(target_post uuid, amen boolean, accept_terms jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
begin
  if amen is not true then
    v_uid := private.assert_member();
    delete from public.community_amens am where am.user_id = v_uid and am.post_id = target_post;
    return false;
  end if;
  -- O aceite vem ANTES de assert_member: o primeiro Amém pode ser de quem ainda
  -- não é membro (apply_inline_accept entra na comunidade nesse mesmo toque).
  perform private.apply_inline_accept(accept_terms);
  v_uid := private.assert_can_publish();
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  insert into public.community_amens (user_id, post_id) values (v_uid, target_post)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_amen(uuid, boolean, jsonb) from public, anon;
grant execute on function private.set_amen(uuid, boolean, jsonb) to authenticated;

create or replace function public.set_amen(target_post uuid, amen boolean, accept_terms jsonb default null)
returns boolean language sql security invoker set search_path = '' as $$
  select private.set_amen(target_post, amen, accept_terms);
$$;
revoke all on function public.set_amen(uuid, boolean, jsonb) from public, anon;
grant execute on function public.set_amen(uuid, boolean, jsonb) to authenticated;

drop function public.set_comment_amen(uuid, boolean);
drop function private.set_comment_amen(uuid, boolean);

create or replace function private.set_comment_amen(target_comment uuid, amen boolean, accept_terms jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
begin
  if amen is not true then
    v_uid := private.assert_member();
    delete from public.community_comment_amens ca where ca.user_id = v_uid and ca.comment_id = target_comment;
    return false;
  end if;
  perform private.apply_inline_accept(accept_terms);
  v_uid := private.assert_can_publish();
  if not private.can_amen_comment(target_comment, v_uid) then
    raise exception 'comentário não encontrado' using errcode = 'P0002';
  end if;
  insert into public.community_comment_amens (user_id, comment_id) values (v_uid, target_comment)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_comment_amen(uuid, boolean, jsonb) from public, anon;
grant execute on function private.set_comment_amen(uuid, boolean, jsonb) to authenticated;

create or replace function public.set_comment_amen(target_comment uuid, amen boolean, accept_terms jsonb default null)
returns boolean language sql security invoker set search_path = '' as $$
  select private.set_comment_amen(target_comment, amen, accept_terms);
$$;
revoke all on function public.set_comment_amen(uuid, boolean, jsonb) from public, anon;
grant execute on function public.set_comment_amen(uuid, boolean, jsonb) to authenticated;

-- ===========================================================================
-- CARGA: o que o teste de 3.000 pessoas e 1.000 posts num dia encontrou
-- (mobile/scripts/sql/carga-comunidade.mjs; números em
--  docs/technical/COMUNIDADE_V2_CARGA.md)
-- ===========================================================================
-- Pergunta do fundador: "se muita gente publicar, dá problema?" Resposta curta:
-- não, mas a tela do feed estava gastando 40% do tempo dela à toa, e o motivo é
-- este:
--
-- private.amen_count_for e private.amen_faces_for juntavam community_amens com
-- community_profiles (`join ... on ap.user_id = am.user_id and ap.status =
-- 'active'`). Com 3.000 membros, a tabela de perfis tem 43 páginas — pequena o
-- bastante para o planejador preferir HASH JOIN, varrendo os 3.000 perfis
-- INTEIROS a cada chamada. E cada chamada é por post: 20 posts por página × 3
-- funções = até 60 varreduras completas da tabela de membros para desenhar UMA
-- página do feed. Medido: 55 ms por página, dos quais ~50 ms são só isto.
--
-- A correção não é índice (a PK de community_profiles já existe e é a certa): é
-- tirar do planejador a opção de varrer. Com o perfil consultado por SUBCONSULTA
-- ESCALAR — um por linha de Amém, pela PK — o plano passa a ser Index Scan em
-- qualquer tamanho de tabela. Medido no mesmo processo, antes/depois:
--   feed 1ª página      55,7 ms → 34,1 ms  (-39%)
--   feed 2ª página      55,2 ms → 33,1 ms  (-40%)
--   contagens+rostinhos 52,7 ms → 31,9 ms  (-39%)
--   5 páginas seguidas 284,6 ms → 169,6 ms (-40%)
--
-- Detalhe honesto: com 30.000 membros o planejador escolhe o índice SOZINHO (a
-- varredura fica cara), e aí as duas versões empatam. Ou seja, isto não era um
-- precipício de escala — era desperdício EXATAMENTE no tamanho que a igreja tem
-- hoje. A reescrita também deixa o plano estável: não depende mais de quantos
-- membros existem nem do humor do planejador.
--
-- SEMÂNTICA INALTERADA (é o que os pgTAP 15 e 16 provam, sem mudança nenhuma
-- neles): só Amém de perfil ATIVO conta, bloqueio vale nos dois sentidos, o
-- rostinho traz nome + foto APROVADA (a minha sempre), no máximo 3, o meu
-- primeiro e depois os mais recentes, e quem não escolheu nome conta no número
-- mas não tem rosto.
--
-- Índices: NENHUM novo. O EXPLAIN (ANALYZE) do corpo real de cada função do feed
-- (página, amen_count_for, amen_faces_for, comment_count_for, post_photo_paths,
-- blocked_between, limite diário) sai coberto pelos índices que já existem
-- desde 20260921130000 e 20260922180000. Índice que não paga a escrita que
-- custa não entra.

create or replace function private.amen_count_for(target_post uuid, viewer uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.community_amens am
   where am.post_id = target_post
     -- Subconsulta escalar (não junção): uma busca pela PK por Amém, sempre.
     and (select ap.status from public.community_profiles ap where ap.user_id = am.user_id) = 'active'
     and not private.blocked_between(viewer, am.user_id);
$$;
revoke all on function private.amen_count_for(uuid, uuid) from public, anon, authenticated;

create or replace function private.amen_faces_for(target_post uuid, viewer uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('name', f.display_name, 'avatar_path', f.avatar, 'is_mine', f.mine)
      order by f.mine desc, f.created_at desc
    ),
    '[]'::jsonb)
  from (
    -- Sem nome, a pessoa conta no número (acima) mas não tem rosto: por isso o
    -- filtro de display_name vem DEPOIS da busca e ANTES do limite de 3.
    select g.display_name, g.avatar, g.mine, g.created_at
      from (
        select (select ap.display_name from public.community_profiles ap
                 where ap.user_id = am.user_id and ap.status = 'active') as display_name,
               (select case when ap.avatar_status = 'approved' or ap.user_id = viewer then ap.avatar_path end
                  from public.community_profiles ap
                 where ap.user_id = am.user_id and ap.status = 'active') as avatar,
               am.user_id = viewer as mine,
               am.created_at
          from public.community_amens am
         where am.post_id = target_post
           and not private.blocked_between(viewer, am.user_id)
      ) g
     where g.display_name is not null
     order by g.mine desc, g.created_at desc
     limit 3
  ) f;
$$;
revoke all on function private.amen_faces_for(uuid, uuid) from public, anon, authenticated;

-- private.comment_count_for tem o MESMO problema, e ele só aparece no post que
-- viraliza: com 18 comentários o planejador usa o índice, com 518 ele volta a
-- varrer os 3.000 perfis. Mesma correção, pelo mesmo motivo.
create or replace function private.comment_count_for(target_post uuid, viewer uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int
    from public.community_comments c
   where c.post_id = target_post
     and c.status = 'published'
     and (select ca.status from public.community_profiles ca where ca.user_id = c.author_id) = 'active'
     and not private.blocked_between(viewer, c.author_id);
$$;
revoke all on function private.comment_count_for(uuid, uuid) from public, anon, authenticated;
