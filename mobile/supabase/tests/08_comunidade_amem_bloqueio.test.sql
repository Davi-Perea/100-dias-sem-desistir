-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- Amém: MUDANÇA DE REGRA em 2026-09-22 (decisão do fundador, F3; migration
-- 20260922180000_comunidade_diario.sql). Antes: "ninguém (nem o autor) lê contagem".
-- Agora o feed mostra o número e até 3 rostinhos (nome + foto aprovada), nunca o
-- user_id; a TABELA continua fechada (cada um lê só a própria linha, sem user_id).
-- Bloqueio: esconde nos DOIS sentidos (posts, comentários, Amém, comentar).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000008a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000008b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000008c1', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000008d1', 'dora@exemplo.test');

insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000008a1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000008b1', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000008c1', 'Carla', now()),
  ('00000000-0000-4000-8000-0000000008d1', 'Dora',  now()); -- membro SEM consentimento

insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000008a1'::uuid,
                  '00000000-0000-4000-8000-0000000008b1'::uuid,
                  '00000000-0000-4000-8000-0000000008c1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);
-- Perfil completo para publicar (C4, 2026-09-22): foto enviada, ministério respondido, 16+ declarado.
update public.community_profiles set ministry_answered = true, avatar_status = 'in_review', avatar_path = user_id::text || '.jpg';

insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-0000000008a1', 'Post da Ana',   'published', now()),
  ('20000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-0000000008c1', 'Post da Carla', 'published', now()),
  ('20000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-0000000008b1', 'Post do Bruno', 'published', now());
insert into public.community_comments (id, post_id, author_id, body, status, published_at) values
  ('30000000-0000-4000-8000-000000000801', '20000000-0000-4000-8000-000000000804',
   '00000000-0000-4000-8000-0000000008c1', 'Comentário da Carla', 'published', now());

-- ---------------------------------------------------------------------------
-- Amém
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008b1","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_amen('20000000-0000-4000-8000-000000000801', true), true, 'Bruno dá Amém');
select is(public.set_amen('20000000-0000-4000-8000-000000000801', true), true, 'Amém repetido é idempotente');
select is((select i_said_amen from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  true, 'Bruno sabe que ele deu Amém');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008a1","role":"authenticated"}', true);
set local role authenticated;
select is((select i_said_amen from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  false, 'a autora não herda o Amém de outra pessoa');
select is((select count(*)::int from public.community_amens where post_id = '20000000-0000-4000-8000-000000000801'),
  0, 'pela TABELA a autora continua sem ler os Amém dos outros (RLS: cada um lê só o seu)');
select throws_ok($$ select user_id from public.community_amens $$, '42501', null,
  'ninguém lê a coluna user_id dos Amém');
select throws_ok($$ insert into public.community_amens (user_id, post_id)
                    values ('00000000-0000-4000-8000-0000000008a1', '20000000-0000-4000-8000-000000000803') $$,
  '42501', null, 'Amém só pela RPC, nunca por INSERT direto');
reset role;

-- Amém é dado de convicção religiosa: sem consentimento vigente, nem pela RPC direta.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008d1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-000000000801', true) $$, 'CM002', null,
  'membro sem consentimento não marca Amém (LGPD art. 11)');
select is(public.set_amen('20000000-0000-4000-8000-000000000801', false), false,
  'desmarcar continua livre, mesmo sem consentimento');
reset role;

-- F3 (2026-09-22): o número e os rostinhos aparecem no feed, para a autora e para todos.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008a1","role":"authenticated"}', true);
set local role authenticated;
select is((select amen_count from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  1, 'F3: a autora vê QUANTAS pessoas disseram Amém (Dora desmarcou; Bruno marcou uma vez só)');
select is((select amen_faces -> 0 ->> 'name' from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  'Bruno', 'F3: e o rostinho de quem disse Amém, pelo nome');
select is((select array_agg(k order by k) from jsonb_object_keys(
            (select amen_faces -> 0 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801')) k),
  array['avatar_path', 'is_mine', 'name'], 'F3: o rostinho tem só nome, foto e se é o meu (nenhum identificador)');
reset role;
select ok(
  not exists (
    select 1 from pg_proc p cross join lateral unnest(p.proargnames) as a(name)
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('community_feed', 'my_community_posts', 'my_community_activity')
      and a.name in ('user_id', 'author_id', 'actor_id')
  ),
  'F3: o feed mostra quem disse Amém sem devolver user_id de ninguém'
);
select ok(
  not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'community_posts' and column_name ilike '%amen%'),
  'community_posts não tem coluna de contagem de Amém (o número é calculado na leitura)'
);

-- ---------------------------------------------------------------------------
-- Bloqueio: Carla bloqueia a autora do post 801 (Ana), a partir do post.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008c1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.block_community_author(target_post => '20000000-0000-4000-8000-000000000801') $$,
  'Carla bloqueia a autora pelo post, sem conhecer o user_id dela');
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  'quem bloqueou não vê mais os posts da bloqueada');
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-000000000801', true) $$, 'P0002', null,
  'quem bloqueou não dá Amém no post da bloqueada');
select throws_ok($$ select * from public.create_community_comment('20000000-0000-4000-8000-000000000801', 'oi') $$,
  'P0002', null, 'quem bloqueou não comenta no post da bloqueada');
select is((select display_name from public.my_community_blocks()), 'Ana',
  'Carla vê quem ela bloqueou (para desbloquear)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008a1","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000803'),
  'NO OUTRO SENTIDO: a bloqueada também não vê os posts de quem a bloqueou');
select ok(not exists (select 1 from public.community_post_comments('20000000-0000-4000-8000-000000000804')
                      where comment_id = '30000000-0000-4000-8000-000000000801'),
  'a bloqueada não vê o comentário de quem a bloqueou, nem no post de um terceiro');
select is_empty($$ select * from public.my_community_blocks() $$,
  'a bloqueada não fica sabendo quem a bloqueou');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008b1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_post_comments('20000000-0000-4000-8000-000000000804')
                  where comment_id = '30000000-0000-4000-8000-000000000801'),
  'um terceiro continua vendo tudo');
reset role;

-- Desbloquear devolve a visibilidade.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008c1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.unblock_community_member((select block_id from public.my_community_blocks())) $$,
  'desbloqueio pelo id do bloqueio');
select ok(exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000801'),
  'depois de desbloquear, o post volta a aparecer');
reset role;

select * from finish();
rollback;
