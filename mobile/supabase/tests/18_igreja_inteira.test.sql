-- =============================================================================
-- EXECUTADO em 2026-09-22 no PGlite (mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- A igreja inteira (decisão do fundador de 2026-09-22,
-- 20260923060000_comunidade_igreja_inteira.sql):
--   * create_community_post recusa qualquer público que não seja 'igreja';
--   * o feed perde o parâmetro feed_scope (assinatura de 2 argumentos);
--   * a coluna audience CONTINUA na tabela, e a linha antiga de ministério
--     continua restrita a quem é daquele ministério (nada vira público sozinho).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000018a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000018b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000018c1', 'carla@exemplo.test');

-- Ana e Bruno: Louvor. Carla: Intercessão.
insert into public.community_profiles (user_id, display_name, adult_attested_at, ministry, ministry_answered) values
  ('00000000-0000-4000-8000-0000000018a1', 'Ana',   now(), 'Louvor',      true),
  ('00000000-0000-4000-8000-0000000018b1', 'Bruno', now(), 'Louvor',      true),
  ('00000000-0000-4000-8000-0000000018c1', 'Carla', now(), 'Intercessão', true);
insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000018a1'::uuid, '00000000-0000-4000-8000-0000000018b1'::uuid,
                  '00000000-0000-4000-8000-0000000018c1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

-- Linha ANTIGA, de antes da decisão: post do Louvor, gravado direto na tabela.
insert into public.community_posts (id, author_id, body, status, published_at, audience, audience_ministry) values
  ('20000000-0000-4000-8000-0000000018a1', '00000000-0000-4000-8000-0000000018a1',
   'Post antigo, só para o Louvor', 'published', now(), 'ministerio', 'Louvor');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Publicar: só a igreja inteira
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_audience => 'ministerio') $$,
  '22023', null, 'o público "Meu ministério" acabou');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_audience => 'Louvor') $$,
  '22023', null, 'nem pelo nome do ministério');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_audience => 'todo mundo') $$,
  '22023', null, 'nem um público inventado');
select lives_ok($$ select * from public.create_community_post(post_body => 'oi', post_audience => '  ') $$,
  'público vazio continua virando "igreja"');
insert into ids select 'ana', post_id from public.create_community_post(post_body => 'Lendo com vocês hoje.');
select results_eq(
  $$ select audience, audience_ministry from public.my_community_posts()
      where post_id = (select id from ids where name = 'ana') $$,
  $$ values ('igreja'::text, null::text) $$,
  'o post novo nasce para a igreja inteira, sem ministério gravado');
reset role;

-- ---------------------------------------------------------------------------
-- Ler: um feed só, sem escopo
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018c1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_feed() where post_id = (select id from ids where name = 'ana')),
  'quem é de outro ministério vê o post novo');
select ok(public.set_amen((select id from ids where name = 'ana'), true), 'e dá Amém');
select is((select status from public.create_community_comment((select id from ids where name = 'ana'), 'Orando junto!')),
  'published', 'e comenta');
-- A linha antiga continua restrita: decisão nova não abre o que já foi restrito.
select ok(not exists (select 1 from public.community_feed()
                      where post_id = '20000000-0000-4000-8000-0000000018a1'),
  'o post ANTIGO de ministério continua fora do feed de quem é de outro ministério');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018b1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_feed()
                  where post_id = '20000000-0000-4000-8000-0000000018a1'),
  'e continua visível para quem é daquele ministério');
reset role;

-- ---------------------------------------------------------------------------
-- A assinatura do feed: dois argumentos, sem feed_scope
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'community_feed'),
  1, 'existe uma só community_feed em public');
select is(
  (select pg_catalog.pg_get_function_identity_arguments(p.oid) from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'community_feed'),
  'before_published_at timestamp with time zone, before_post uuid',
  'o feed não tem mais feed_scope');

select * from finish();
rollback;
