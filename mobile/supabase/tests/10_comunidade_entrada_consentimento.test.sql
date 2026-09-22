-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- Entrada SEM código (C3, decisão do fundador de 2026-09-22: quem cria o perfil entra;
-- conta ligada ao aparelho vale; sem declaração de idade na entrada),
-- códigos gerados por admin (tabela legada, nada mais os exige), consentimento específico e aceite das regras com
-- versão e hash, revogação que tira do ar o que foi publicado.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000a01', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-000000000a02', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-000000000a03', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-000000000a04', 'davi@exemplo.test'),
  ('00000000-0000-4000-8000-000000000a0c', 'admin@exemplo.test');
insert into public.app_admins (user_id) values ('00000000-0000-4000-8000-000000000a0c');

-- Código conhecido (o hash é do código normalizado: maiúsculas, sem hífen).
insert into private.invite_codes (id, code_sha256, label, max_uses, expires_at) values
  ('40000000-0000-4000-8000-000000000a01', encode(extensions.digest('ABCDE23456', 'sha256'), 'hex'),
   'Ministério de teste', 2, now() + interval '7 days'),
  ('40000000-0000-4000-8000-000000000a02', encode(extensions.digest('REVOG23456', 'sha256'), 'hex'),
   'Código revogado', 100, now() + interval '7 days');
update private.invite_codes set revoked_at = now() where id = '40000000-0000-4000-8000-000000000a02';

-- ---------------------------------------------------------------------------
-- Códigos: só admin gera; o código sai uma vez, no formato XXXXX-XXXXX.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.admin_create_invite_code('Qualquer', 10, 30) $$, '42501', null,
  'quem não é admin não gera código');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a0c","role":"authenticated"}', true);
set local role authenticated;
select matches(public.admin_create_invite_code('Ministério de intercessão', 50, 30),
  '^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$', 'admin gera código legível, sem 0/O/1/I');
reset role;
select ok(not exists (select 1 from private.invite_codes where code_sha256 !~ '^[0-9a-f]{64}$'),
  'o banco guarda só o hash do código');

-- ---------------------------------------------------------------------------
-- Entrada sem código (C3)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000a02","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is(public.join_community(), true, 'C2/C3: conta do aparelho entra sem código e sem nome');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}', true);
set local role authenticated;
select is(public.join_community('Ana'), true, 'C3: quem cria o perfil entra, sem código');
select is(public.join_community('Ana'), true, 'entrar de novo não dá erro');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM002', null,
  'membro sem consentimento não publica');
select is((select display_name from public.my_community_status()), 'Ana', 'o nome escolhido na entrada fica no perfil');
reset role;
select is((select uses from private.invite_codes where id = '40000000-0000-4000-8000-000000000a01'), 0,
  'entrar não mexe nos códigos legados');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a03","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM001',
  'crie seu perfil para entrar na comunidade', 'quem não criou o perfil não publica (e a mensagem não fala em código)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a04","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.join_community(repeat('x', 41)) $$, '22023', null, 'nome acima de 40 é recusado');
reset role;

-- ---------------------------------------------------------------------------
-- Consentimento e regras (versão + hash do texto exibido)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.accept_community_terms('community_publish', 'PENDENTE', repeat('a', 64), '1.0.0') $$,
  'CM005', null, 'enquanto o texto não for aprovado, ninguém consente');
reset role;

update private.community_settings set value = 'c4-2026-10' where key = 'publish_consent_version';
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = 'regras-2026-10' where key = 'rules_version';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

set local role authenticated;
select throws_ok($$ select public.accept_community_terms('community_publish', 'c4-2026-10', repeat('f', 64), '1.0.0') $$,
  'CM005', null, 'hash de outro texto é recusado');
select lives_ok($$ select public.accept_community_terms('community_publish', 'c4-2026-10', repeat('a', 64), '1.0.0') $$,
  'consentimento específico registrado');
select lives_ok($$ select public.accept_community_terms('community_rules', 'regras-2026-10', repeat('b', 64), '1.0.0') $$,
  'aceite das regras registrado');
select is((select can_publish from public.my_community_status()), false,
  'C4: com os aceites mas sem foto, ministério e 16+, ainda não publica');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM007', null,
  'C4: perfil incompleto é recusado com o motivo próprio');
reset role;
insert into storage.objects (bucket_id, name, owner_id)
  values ('community-photos', 'a0a00000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-000000000a01');
set local role authenticated;
select lives_ok($$ select public.set_community_avatar('a0a00000-0000-4000-8000-000000000001.jpg') $$, 'foto de perfil enviada');
select lives_ok($$ select public.set_community_profile(no_ministry => true, confirms_16 => true) $$, 'ministério Nenhum e 16+');
select is((select can_publish from public.my_community_status()), true,
  'com os dois aceites vigentes e o perfil completo, pode publicar');
select is((select count(*)::int from public.consent_records), 2,
  'a pessoa lê só os próprios registros de consentimento');
select is((select status from public.create_community_post(post_body => 'Graças a Deus')), 'published',
  'publica depois do consentimento');
select lives_ok($$ select public.revoke_community_publish_consent() $$, 'revoga o consentimento');
select is_empty($$ select * from public.my_community_posts() $$,
  'revogar o consentimento tira do ar (apaga) o que foi publicado');
reset role;

select * from finish();
rollback;
