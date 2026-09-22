-- =============================================================================
-- EXECUTADO em 2026-09-22 no PGlite (mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- Perfil v2 (feedback do fundador de 2026-09-22):
--   C2  conta ligada ao aparelho (sessão anônima) entra, aceita e publica;
--   C1  sem idade na entrada; "16 anos ou mais" exigido para publicar;
--   C4  nome, foto e ministério (ou "Nenhum") para publicar; bio opcional;
--       foto de perfil só aparece para os outros depois da moderação;
--   N3  e-mail opcional com aceite separado de novidades.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000014a1', null),                   -- conta do aparelho (anônima)
  ('00000000-0000-4000-8000-0000000014b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000014c1', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000014d1', 'moderadora@exemplo.test'),
  ('00000000-0000-4000-8000-0000000014e1', 'fora@exemplo.test');

-- Bruno e Carla já estão dentro, com perfil completo e aprovado; a moderadora também.
insert into public.community_profiles (user_id, display_name, adult_attested_at, ministry, ministry_answered,
                                       avatar_path, avatar_status) values
  ('00000000-0000-4000-8000-0000000014b1', 'Bruno', now(), 'Louvor', true,
   'b1b10000-0000-4000-8000-000000000014.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000014c1', 'Carla', now(), null, true,
   'c1c10000-0000-4000-8000-000000000014.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000014d1', 'Mara', now(), null, true,
   'd1d10000-0000-4000-8000-000000000014.jpg', 'approved');
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000014d1');
insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000014b1'::uuid, '00000000-0000-4000-8000-0000000014c1'::uuid,
                  '00000000-0000-4000-8000-0000000014d1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);
insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-0000000014b1', '00000000-0000-4000-8000-0000000014b1', 'Post do Bruno', 'published', now());

-- ---------------------------------------------------------------------------
-- C2 + C1 + C3: a conta do aparelho entra sem código, sem nome e sem idade
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000014a1","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is(public.join_community(), true, 'C2/C3: conta do aparelho entra sem código');
select results_eq(
  $$ select is_member, display_name, age_confirmed, ministry_answered, avatar_status, profile_complete
       from public.my_community_status() $$,
  $$ values (true, null::text, false, false, 'none'::text, false) $$,
  'C1/C4: entra sem nome, sem idade, sem ministério e sem foto');
select lives_ok($$ select public.set_amen('20000000-0000-4000-8000-0000000014b1', false) $$,
  'desmarcar Amém não exige nada');
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-0000000014b1', true) $$, 'CM002', null,
  'marcar Amém continua exigindo o consentimento');
select lives_ok($$ select public.accept_community_terms('community_rules', 'v-teste', repeat('b', 64), 't') $$,
  'C2: conta do aparelho aceita as regras');
select lives_ok($$ select public.accept_community_terms('community_publish', 'v-teste', repeat('a', 64), 't') $$,
  'C2: conta do aparelho consente');
select is(public.set_amen('20000000-0000-4000-8000-0000000014b1', true), true,
  'Amém não exige perfil completo (ninguém vê quem deu Amém)');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM007', null,
  'C4: sem nome, foto, ministério e 16+ não publica');
select throws_ok($$ select * from public.create_community_comment('20000000-0000-4000-8000-0000000014b1', 'Amém') $$,
  'CM007', null, 'C4: nem comenta (o comentário aparece com o nome)');

-- Perfil em partes (nulo = não mexe)
select throws_ok($$ select public.set_community_profile(new_name => repeat('x', 41)) $$, '22023', null,
  'nome com mais de 40 caracteres é recusado');
select throws_ok($$ select public.set_community_profile(new_ministry => 'Louvor', no_ministry => true) $$, '22023', null,
  'ministério e "Nenhum" ao mesmo tempo é recusado');
select throws_ok($$ select public.set_community_profile(new_bio => repeat('b', 161)) $$, '22023', null,
  'bio com mais de 160 caracteres é recusada');
select lives_ok($$ select public.set_community_profile(new_name => '  Davi  ') $$, 'passo do nome');
select lives_ok($$ select public.set_community_profile(new_ministry => 'Comunicação') $$, 'passo do ministério');
select lives_ok($$ select public.set_community_profile(new_bio => 'Aprendendo a ler todo dia.') $$, 'passo da bio');
select lives_ok($$ select public.set_community_profile(new_name => '') $$, 'nome vazio não apaga o nome');
select results_eq($$ select display_name, ministry, bio from public.my_community_status() $$,
  $$ values ('Davi'::text, 'Comunicação'::text, 'Aprendendo a ler todo dia.'::text) $$,
  'o perfil guarda nome aparado, ministério e bio; nome vazio foi ignorado');
select lives_ok($$ select public.set_community_profile(clear_bio => true) $$, 'bio pode ser apagada');
select is((select bio from public.my_community_status()), null::text, 'bio apagada');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM007', null,
  'ainda falta a foto e o 16+');

-- Foto de perfil: só arquivo do próprio chamador
reset role;
insert into storage.objects (bucket_id, name, owner_id) values
  ('community-photos', 'e1e10000-0000-4000-8000-000000000014.jpg', '00000000-0000-4000-8000-0000000014e1');
set local role authenticated;
select throws_ok($$ select public.set_community_avatar('e1e10000-0000-4000-8000-000000000014.jpg') $$, '22023', null,
  'não dá para usar como foto de perfil o arquivo de outra pessoa');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('community-photos', 'a1a10000-0000-4000-8000-000000000014.jpg', '00000000-0000-4000-8000-0000000014a1') $$,
  'membro sobe a própria foto de perfil (policy do Storage)');
select is(public.set_community_avatar('a1a10000-0000-4000-8000-000000000014.jpg'), 'in_review',
  'foto de perfil entra em análise');
select lives_ok($$ select public.set_community_profile(confirms_16 => true) $$, 'C1: declara 16 anos ou mais');
select is((select profile_complete from public.my_community_status()), true, 'perfil completo');
select is((select status from public.create_community_post(post_body => 'Primeira publicação')), 'published',
  'C4: com nome, foto (em análise), ministério e 16+, publica');
select results_eq(
  $$ select author_name, author_ministry, author_avatar_path from public.community_feed() where is_mine $$,
  $$ values ('Davi'::text, 'Comunicação'::text, 'a1a10000-0000-4000-8000-000000000014.jpg'::text) $$,
  'no próprio feed a pessoa vê a própria foto, mesmo em análise');

-- N3: e-mail opcional, novidades só com aceite separado
select throws_ok($$ select public.set_community_contact(null, true) $$, '22023', null,
  'N3: novidades sem e-mail é recusado');
select throws_ok($$ select public.set_community_contact('nao-e-email', false) $$, '22023', null,
  'N3: e-mail inválido é recusado');
select lives_ok($$ select public.set_community_contact(' Davi@Exemplo.test ', false) $$, 'N3: e-mail sem novidades');
select results_eq($$ select contact_email, news_opt_in from public.my_community_status() $$,
  $$ values ('davi@exemplo.test'::text, false) $$, 'N3: e-mail guardado; novidades continuam desmarcadas');
reset role;

-- ---------------------------------------------------------------------------
-- Visibilidade da foto de perfil para os outros
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000014c1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select author_name, author_ministry, author_avatar_path from public.community_feed()
      where author_name in ('Davi', 'Bruno') order by author_name $$,
  $$ values ('Bruno'::text, 'Louvor'::text, 'b1b10000-0000-4000-8000-000000000014.jpg'::text),
            ('Davi'::text, 'Comunicação'::text, null::text) $$,
  'C4: os outros veem "Nome · Ministério"; a foto em análise não aparece');
select is(private.can_view_community_photo('a1a10000-0000-4000-8000-000000000014.jpg'), false,
  'foto de perfil em análise: outro membro não consegue abrir');
reset role;

-- Moderação: sem user_id, só o ticket; ninguém modera a própria foto
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000014d1","role":"authenticated"}', true);
set local role authenticated;
select is((select display_name from public.community_avatar_queue()), 'Davi', 'a foto em análise está na fila');
select lives_ok(
  $$ select public.moderate_community_avatar((select ticket from public.community_avatar_queue() limit 1), true) $$,
  'a moderadora aprova');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000014c1","role":"authenticated"}', true);
set local role authenticated;
select is(private.can_view_community_photo('a1a10000-0000-4000-8000-000000000014.jpg'), true,
  'aprovada: outro membro abre a foto');
select lives_ok($$ select public.block_community_author(target_post => '20000000-0000-4000-8000-0000000014b1') $$,
  'Carla bloqueia Bruno');
select is(private.can_view_community_photo('b1b10000-0000-4000-8000-000000000014.jpg'), false,
  'com bloqueio, nem a foto de perfil aparece');
select is_empty($$ select * from public.community_avatar_queue() $$, 'quem não modera recebe a fila vazia');
reset role;

-- Varredura de órfãos não leva a foto de perfil; sair da comunidade leva.
update storage.objects set created_at = now() - interval '2 days';
set local role service_role;
select is(public.service_enqueue_orphan_photos(24), 1, 'a varredura pega só o upload solto');
reset role;
select ok(not exists (
  select 1 from private.storage_deletion_queue where object_name = 'a1a10000-0000-4000-8000-000000000014.jpg'),
  'a foto de perfil em uso não é tratada como órfã');

select * from finish();
rollback;
