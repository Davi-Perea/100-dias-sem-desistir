-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- Moderar exige conta ativa: moderador suspenso ou removido na comunidade, ou com
-- a conta do app suspensa, não modera nem vê a fila. O admin do app sem perfil na
-- comunidade continua moderando. Só a administração muda o estado de quem
-- modera (um moderador não desarma os outros nem o admin), e o admin com perfil
-- suspenso na comunidade continua moderando. E o Amém exige as regras aceitas além do
-- consentimento de publicar (CM002 com só um dos dois).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000013a1', 'mod-suspenso@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a2', 'mod-conta-suspensa@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a3', 'admin-sem-perfil@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a4', 'mod-ativo@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a5', 'mod-removido@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a6', 'admin-com-perfil@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013a7', 'mod-b@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013b1', 'autora@exemplo.test'),
  ('00000000-0000-4000-8000-0000000013c1', 'eva@exemplo.test');

insert into public.community_profiles (user_id, display_name, adult_attested_at, status) values
  ('00000000-0000-4000-8000-0000000013a1', 'Saulo', now(), 'suspended'),
  ('00000000-0000-4000-8000-0000000013a2', 'Rita',  now(), 'active'),
  ('00000000-0000-4000-8000-0000000013a4', 'Lia',   now(), 'active'),
  ('00000000-0000-4000-8000-0000000013a5', 'Remo',  now(), 'removed'),
  ('00000000-0000-4000-8000-0000000013a6', 'Ari',   now(), 'active'),
  ('00000000-0000-4000-8000-0000000013a7', 'Beto',  now(), 'active'),
  ('00000000-0000-4000-8000-0000000013b1', 'Ana',   now(), 'active'),
  ('00000000-0000-4000-8000-0000000013c1', 'Eva',   now(), 'active');
-- Perfil completo para publicar (C4, 2026-09-22): foto enviada, ministério respondido, 16+ declarado.
update public.community_profiles set ministry_answered = true, avatar_status = 'in_review', avatar_path = user_id::text || '.jpg';

insert into public.community_moderators (user_id) values
  ('00000000-0000-4000-8000-0000000013a1'),
  ('00000000-0000-4000-8000-0000000013a2'),
  ('00000000-0000-4000-8000-0000000013a4'),
  ('00000000-0000-4000-8000-0000000013a5'),
  ('00000000-0000-4000-8000-0000000013a7');
insert into public.app_admins (user_id) values
  ('00000000-0000-4000-8000-0000000013a3'),
  ('00000000-0000-4000-8000-0000000013a6');

-- Conta do app suspensa (mudança de status só com a autorização explícita).
select set_config('app.role_change_authorized', 'on', true);
update public.profiles set account_status = 'suspended' where user_id = '00000000-0000-4000-8000-0000000013a2';
select set_config('app.role_change_authorized', 'off', true);

-- Autora com consentimento e regras; Eva só com o consentimento de publicar.
insert into public.consent_records (user_id, purpose, text_version, text_sha256) values
  ('00000000-0000-4000-8000-0000000013b1', 'community_publish', 'v-teste', repeat('a', 64)),
  ('00000000-0000-4000-8000-0000000013b1', 'community_rules',   'v-teste', repeat('b', 64)),
  ('00000000-0000-4000-8000-0000000013c1', 'community_publish', 'v-teste', repeat('a', 64));

insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-0000000013b1', 'Em análise', 'in_review', null),
  ('20000000-0000-4000-8000-000000001302', '00000000-0000-4000-8000-0000000013b1', 'Publicado',  'published', now()),
  ('20000000-0000-4000-8000-000000001303', '00000000-0000-4000-8000-0000000013b1', 'Outro em análise', 'in_review', null),
  ('20000000-0000-4000-8000-000000001304', '00000000-0000-4000-8000-0000000013a7', 'Post do moderador B', 'published', now()),
  ('20000000-0000-4000-8000-000000001305', '00000000-0000-4000-8000-0000000013a6', 'Post do admin', 'published', now()),
  ('20000000-0000-4000-8000-000000001306', '00000000-0000-4000-8000-0000000013a1', 'Post do moderador suspenso', 'published', now());

-- ---------------------------------------------------------------------------
-- Moderador suspenso na comunidade
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.moderate_community_post('20000000-0000-4000-8000-000000001301', 'approve') $$,
  '42501', null, 'moderador suspenso na comunidade não modera');
select is_empty($$ select * from public.community_moderation_queue() $$, 'moderador suspenso não vê a fila');
reset role;

-- Moderador removido da comunidade
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a5","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.moderate_community_post('20000000-0000-4000-8000-000000001301', 'approve') $$,
  '42501', null, 'moderador removido da comunidade não modera');
reset role;

-- Moderador com a conta do app suspensa
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.moderate_community_post('20000000-0000-4000-8000-000000001301', 'approve') $$,
  '42501', null, 'moderador com a conta do app suspensa não modera');
select is_empty($$ select * from public.community_moderation_queue() $$, 'conta suspensa não vê a fila');
reset role;

-- Moderador ativo: controle, a fila aparece
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a4","role":"authenticated"}', true);
set local role authenticated;
select ok((select count(*) from public.community_moderation_queue()) > 0, 'moderador ativo vê a fila');
reset role;

-- Admin do app sem perfil na comunidade continua moderando
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a3","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.moderate_community_post('20000000-0000-4000-8000-000000001301', 'approve') $$,
  'admin do app sem perfil na comunidade modera');
reset role;
select is((select status::text from public.community_posts where id = '20000000-0000-4000-8000-000000001301'),
  'published', 'a decisão do admin valeu');

-- ---------------------------------------------------------------------------
-- Quem pode tirar o poder de um moderador: só a administração
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a4","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000001304',
                                            new_status => 'suspended', decision_reason => 'ofensivo') $$,
  '42501', null, 'moderador não suspende outro moderador');
select throws_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000001305',
                                            new_status => 'suspended', decision_reason => 'ofensivo') $$,
  '42501', null, 'moderador não suspende o admin que tem perfil na comunidade');
select throws_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000001306',
                                            new_status => 'active', decision_reason => 'ofensivo') $$,
  '42501', null, 'moderador não reativa outro moderador suspenso');
reset role;
select is((select status::text from public.community_profiles where user_id = '00000000-0000-4000-8000-0000000013a7'),
  'active', 'o moderador B continua ativo');

-- Admin com perfil suspenso (pela service role) continua moderando
set local role service_role;
update public.community_profiles set status = 'suspended' where user_id = '00000000-0000-4000-8000-0000000013a6';
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013a6","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.moderate_community_post('20000000-0000-4000-8000-000000001303', 'approve') $$,
  'admin com perfil suspenso na comunidade continua moderando');
select lives_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000001304',
                                            new_status => 'suspended', decision_reason => 'ofensivo') $$,
  'a administração suspende um moderador');
reset role;
select is((select status::text from public.community_profiles where user_id = '00000000-0000-4000-8000-0000000013a7'),
  'suspended', 'a suspensão dada pelo admin valeu');

-- ---------------------------------------------------------------------------
-- Amém: consentimento de publicar SEM as regras aceitas
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000013c1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-000000001302', true) $$,
  'CM002', null, 'consentimento sem as regras aceitas: Amém recusado');
select lives_ok($$ select public.set_amen('20000000-0000-4000-8000-000000001302', false) $$,
  'desmarcar continua livre');
reset role;

select * from finish();
rollback;
