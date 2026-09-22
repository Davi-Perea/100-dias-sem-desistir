-- =============================================================================
-- EXECUTADO em 2026-09-23 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- Amém em COMENTÁRIO (migration 20260923040000_comunidade_amem_comentario.sql):
-- mesmas regras do Amém no post — consentimento para marcar, desmarcar livre,
-- número visível sem user_id, bloqueio nos dois sentidos, tabela fechada, e
-- sair/revogar apaga.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000016a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000016b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000016c1', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000016d1', 'dora@exemplo.test');

insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000016a1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000016b1', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000016c1', 'Carla', now()),
  ('00000000-0000-4000-8000-0000000016d1', 'Dora',  now()); -- membro SEM consentimento

insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000016a1'::uuid,
                  '00000000-0000-4000-8000-0000000016b1'::uuid,
                  '00000000-0000-4000-8000-0000000016c1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

-- Post da Ana; comentário publicado da Carla; comentário em análise do Bruno.
insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-0000000016a1', 'Post da Ana', 'published', now());
insert into public.community_comments (id, post_id, author_id, body, status, published_at) values
  ('30000000-0000-4000-8000-000000001601', '20000000-0000-4000-8000-000000001601',
   '00000000-0000-4000-8000-0000000016c1', 'Comentário da Carla', 'published', now()),
  ('30000000-0000-4000-8000-000000001602', '20000000-0000-4000-8000-000000001601',
   '00000000-0000-4000-8000-0000000016b1', 'Comentário do Bruno em análise', 'in_review', null);

-- ---------------------------------------------------------------------------
-- Marcar, repetir, contar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016b1","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_comment_amen('30000000-0000-4000-8000-000000001601', true), true, 'Bruno diz Amém no comentário da Carla');
select is(public.set_comment_amen('30000000-0000-4000-8000-000000001601', true), true, 'Amém repetido é idempotente');
select is((select i_said_amen from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001601'), true, 'Bruno sabe que disse Amém');
select is((select amen_count from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001601'), 1, 'um Amém por pessoa');
select is((select count(*)::int from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001602'), 1,
  'o meu comentário em análise aparece para mim (com número zero)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016a1","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_comment_amen('30000000-0000-4000-8000-000000001601', true), true, 'Ana também diz Amém');
select is((select amen_count from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001601'), 2, 'o número aparece para todos');
select ok(not exists (select 1 from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
                      where comment_id = '30000000-0000-4000-8000-000000001602'),
  'comentário em análise de outra pessoa não aparece');
select throws_ok($$ select public.set_comment_amen('30000000-0000-4000-8000-000000001602', true) $$, 'P0002', null,
  'não dá Amém em comentário em análise');
select throws_ok($$ select * from public.community_comment_amens $$, '42501', null,
  'a tabela é fechada: nem SELECT direto');
select throws_ok($$ insert into public.community_comment_amens (user_id, comment_id)
                    values ('00000000-0000-4000-8000-0000000016a1', '30000000-0000-4000-8000-000000001602') $$,
  '42501', null, 'Amém em comentário só pela RPC, nunca por INSERT direto');
reset role;
select ok(
  not exists (
    select 1 from pg_proc p cross join lateral unnest(p.proargnames) as a(name)
    where p.pronamespace = 'public'::regnamespace
      and p.proname = 'community_comment_amens'
      and a.name in ('user_id', 'author_id', 'actor_id')
  ),
  'o número vem sem user_id de ninguém'
);

-- ---------------------------------------------------------------------------
-- Consentimento (LGPD art. 11)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016d1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.set_comment_amen('30000000-0000-4000-8000-000000001601', true) $$, 'CM002', null,
  'membro sem consentimento não marca Amém em comentário');
select is(public.set_comment_amen('30000000-0000-4000-8000-000000001601', false), false,
  'desmarcar continua livre, mesmo sem consentimento');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.set_comment_amen('30000000-0000-4000-8000-000000001601', true) $$, 'CM001', null,
  'quem não é da comunidade não marca');
reset role;

-- ---------------------------------------------------------------------------
-- Bloqueio: Ana bloqueia a Carla, a partir do comentário dela.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.block_community_author(target_comment => '30000000-0000-4000-8000-000000001601') $$,
  'Ana bloqueia a Carla pelo comentário');
select throws_ok($$ select public.set_comment_amen('30000000-0000-4000-8000-000000001601', true) $$, 'P0002', null,
  'quem bloqueou não dá Amém no comentário da bloqueada');
select ok(not exists (select 1 from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
                      where comment_id = '30000000-0000-4000-8000-000000001601'),
  'nem vê o número dele');
reset role;

-- Bloqueio no número: Dora vê o Amém do Bruno; depois de bloquear o Bruno, não conta mais.
insert into public.community_comments (id, post_id, author_id, body, status, published_at) values
  ('30000000-0000-4000-8000-000000001603', '20000000-0000-4000-8000-000000001601',
   '00000000-0000-4000-8000-0000000016c1', 'Outro comentário da Carla', 'published', now());
insert into public.community_comment_amens (user_id, comment_id) values
  ('00000000-0000-4000-8000-0000000016b1', '30000000-0000-4000-8000-000000001603');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016d1","role":"authenticated"}', true);
set local role authenticated;
select is((select amen_count from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001603'), 1, 'sem bloqueio, Dora vê o Amém do Bruno');
reset role;
insert into public.community_blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-8000-0000000016d1', '00000000-0000-4000-8000-0000000016b1');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016d1","role":"authenticated"}', true);
set local role authenticated;
select is((select amen_count from public.community_comment_amens('20000000-0000-4000-8000-000000001601')
            where comment_id = '30000000-0000-4000-8000-000000001603'), 0,
  'quem bloqueou não conta o Amém de quem foi bloqueado');
reset role;

-- ---------------------------------------------------------------------------
-- Revogar ("Apagar tudo o que publiquei") apaga os Amém da pessoa em comentários
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000016b1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.revoke_community_publish_consent() $$, 'Bruno revoga o consentimento');
reset role;
select is((select count(*)::int from public.community_comment_amens
            where user_id = '00000000-0000-4000-8000-0000000016b1'), 0, 'os Amém dele em comentários saíram');

select * from finish();
rollback;
