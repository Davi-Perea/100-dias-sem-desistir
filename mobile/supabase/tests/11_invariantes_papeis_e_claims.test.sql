-- =============================================================================
-- EXECUTADO em 2026-09-21 no PGlite (mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- Invariantes que os arquivos 01–10 não cobriam, trocando de papel e de claims:
--   A. ninguém entra (nem põe outra pessoa) em grupo alheio; líder de outro grupo não age;
--   B. COLEGA de grupo (não líder) não lê a linha nem a faixa etária do outro;
--   C. anon não chama RPC nenhuma; authenticated não chama as funções só de servidor
--      nem lê tabelas de private;
--   D. em análise, só o autor vê (post e comentário), sem oráculo por Amém/denúncia/bloqueio;
--   E. ninguém lê contagem de Amém, nem a moderação;
--   F. denúncia urgente de comentário tira do ar na hora (risco à vida só prioriza);
--   G. Amém, comentário e upload exigem consentimento VIGENTE (versão atual);
--   H. revogar o consentimento apaga o conteúdo e MANTÉM os bloqueios;
--   I. exclusão de conta pelo caminho real (service_prepare_account_deletion +
--      delete em auth.users) apaga em cascata, dos dois lados do bloqueio.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(58);

-- ---------------------------------------------------------------------------
-- Preparação (como postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000011a1', 'lider1@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011a2', 'membro1@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011a3', 'colega@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011b1', 'lider2@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011b2', 'membro3@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011c1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011c2', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011c3', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011c5', 'edu@exemplo.test'),
  ('00000000-0000-4000-8000-0000000011c9', 'moderadora@exemplo.test');

update public.profiles set age_band = '16_17' where user_id = '00000000-0000-4000-8000-0000000011a2';
insert into public.groups (id, name) values
  ('10000000-0000-4000-8000-0000000011a1', 'Grupo A'),
  ('10000000-0000-4000-8000-0000000011b1', 'Grupo B');
select set_config('app.role_change_authorized', 'on', true);
insert into public.group_memberships (group_id, user_id, role) values
  ('10000000-0000-4000-8000-0000000011a1', '00000000-0000-4000-8000-0000000011a1', 'leader'),
  ('10000000-0000-4000-8000-0000000011a1', '00000000-0000-4000-8000-0000000011a2', 'member'),
  ('10000000-0000-4000-8000-0000000011a1', '00000000-0000-4000-8000-0000000011a3', 'member'),
  ('10000000-0000-4000-8000-0000000011b1', '00000000-0000-4000-8000-0000000011b1', 'leader'),
  ('10000000-0000-4000-8000-0000000011b1', '00000000-0000-4000-8000-0000000011b2', 'member');
select set_config('app.role_change_authorized', 'off', true);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000011c1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000011c2', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000011c3', 'Carla', now()),
  ('00000000-0000-4000-8000-0000000011c5', 'Edu',   now()),   -- membro SEM consentimento
  ('00000000-0000-4000-8000-0000000011c9', 'Mara',  now());
-- Perfil completo para publicar (C4, 2026-09-22): foto enviada, ministério respondido, 16+ declarado.
update public.community_profiles set ministry_answered = true, avatar_status = 'in_review', avatar_path = user_id::text || '.jpg';
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000011c9');

insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000011c1'::uuid,
                  '00000000-0000-4000-8000-0000000011c2'::uuid,
                  '00000000-0000-4000-8000-0000000011c3'::uuid,
                  '00000000-0000-4000-8000-0000000011c9'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

insert into public.community_posts (id, author_id, body, status, hold_reason, published_at) values
  ('20000000-0000-4000-8000-0000000011f1', '00000000-0000-4000-8000-0000000011c1', 'Post da Ana', 'published', null, now()),
  ('20000000-0000-4000-8000-0000000011f2', '00000000-0000-4000-8000-0000000011c1', 'Post segurado', 'in_review', 'link', null),
  ('20000000-0000-4000-8000-0000000011f3', '00000000-0000-4000-8000-0000000011c2', 'Post do Bruno', 'published', null, now());
insert into public.community_comments (id, post_id, author_id, body, status, hold_reason, published_at) values
  ('30000000-0000-4000-8000-0000000011f1', '20000000-0000-4000-8000-0000000011f1',
   '00000000-0000-4000-8000-0000000011c2', 'Comentário segurado do Bruno', 'in_review', 'termo', null),
  ('30000000-0000-4000-8000-0000000011f2', '20000000-0000-4000-8000-0000000011f1',
   '00000000-0000-4000-8000-0000000011c3', 'Comentário da Carla', 'published', null, now());

-- ---------------------------------------------------------------------------
-- A/B. Grupos: colega (membro1 e colega no Grupo A), líder do Grupo B
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a3","role":"authenticated"}', true);
set local role authenticated;
select is_empty($$ select user_id from public.profiles where user_id = '00000000-0000-4000-8000-0000000011a2' $$,
  'B: colega de grupo (não líder) não alcança a linha do perfil do outro');
select throws_ok($$ select age_band from public.profiles where user_id = '00000000-0000-4000-8000-0000000011a2' $$,
  '42501', null, 'B: colega de grupo não lê age_band (privilégio por coluna)');
select is((select count(*)::int from public.group_memberships), 1,
  'B: colega vê só a própria membership, não a lista do grupo');
select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id) values
       ('10000000-0000-4000-8000-0000000011b1', '00000000-0000-4000-8000-0000000011a3') $$,
  '42501', null, 'A: membro não entra sozinho em grupo alheio');
select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id) values
       ('10000000-0000-4000-8000-0000000011a1', '00000000-0000-4000-8000-0000000011b2') $$,
  '42501', null, 'A: membro não põe outra pessoa no próprio grupo');
select throws_ok(
  $$ update public.group_memberships set role = 'leader'
      where user_id = '00000000-0000-4000-8000-0000000011a3' $$,
  '42501', null, 'A: membro não se promove por UPDATE');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id) values
       ('10000000-0000-4000-8000-0000000011a1', '00000000-0000-4000-8000-0000000011b2') $$,
  '42501', null, 'A: nem o líder insere gente no próprio grupo (só admin)');
select throws_ok(
  $$ select public.admin_set_group_role('00000000-0000-4000-8000-0000000011a2',
                                        '10000000-0000-4000-8000-0000000011a1', 'leader') $$,
  '42501', null, 'A: líder não promove membro');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011b1","role":"authenticated"}', true);
set local role authenticated;
select is_empty($$ select user_id from public.profiles where user_id = '00000000-0000-4000-8000-0000000011a2' $$,
  'B: líder de OUTRO grupo não vê o perfil do membro');
select throws_ok(
  $$ select public.remove_group_member('00000000-0000-4000-8000-0000000011a2', '10000000-0000-4000-8000-0000000011a1') $$,
  '42501', null, 'A: líder de outro grupo não remove ninguém do Grupo A');
select is_empty(
  $$ select 1 from public.group_memberships where group_id = '10000000-0000-4000-8000-0000000011a1' $$,
  'A: líder de outro grupo não lista as memberships do Grupo A');
reset role;

-- ---------------------------------------------------------------------------
-- C. anon e funções de servidor
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok($$ select * from public.community_feed() $$, '42501', null, 'C: anon não lê o feed');
select throws_ok($$ select * from public.my_profile() $$, '42501', null, 'C: anon não chama my_profile');
select throws_ok($$ select public.join_community('X') $$, '42501', null,
  'C: anon não entra na comunidade');
select throws_ok($$ select user_id from public.profiles $$, '42501', null, 'C: anon não lê profiles');
select throws_ok($$ select private.is_app_admin() $$, '42501', null, 'C: anon não alcança o schema private');
select throws_ok($$ select * from public.claim_storage_deletions(10) $$, '42501', null,
  'C: anon não chama função de serviço');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.service_prepare_account_deletion('00000000-0000-4000-8000-0000000011c2') $$,
  '42501', null, 'C: usuário não dispara a exclusão de conta de outra pessoa');
select throws_ok($$ select private.purge_community_member('00000000-0000-4000-8000-0000000011c2', true) $$,
  '42501', null, 'C: usuário não chama a limpeza interna');
select throws_ok($$ select * from public.claim_storage_deletions(10) $$, '42501', null,
  'C: usuário não drena a fila do Storage');
select throws_ok($$ select * from private.invite_codes $$, '42501', null, 'C: usuário não lê os códigos (nem o hash)');
select throws_ok($$ select * from private.community_settings $$, '42501', null, 'C: usuário não lê a configuração');
reset role;

-- ---------------------------------------------------------------------------
-- D. Em análise: só o autor vê
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-0000000011f2'),
  'D: post em análise não aparece para outro membro');
select is_empty($$ select * from public.community_post_comments('20000000-0000-4000-8000-0000000011f2') $$,
  'D: comentários de post em análise não abrem para outro membro');
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-0000000011f2', true) $$, 'P0002', null,
  'D: Amém em post em análise responde "não encontrado" (sem oráculo)');
select throws_ok($$ select public.report_community_content(target_post => '20000000-0000-4000-8000-0000000011f2',
                                                          report_reason => 'spam') $$, 'P0002', null,
  'D: denúncia de post em análise responde "não encontrado"');
select lives_ok($$ select public.block_community_author(target_post => '20000000-0000-4000-8000-0000000011f2') $$,
  'D: bloquear pelo post em análise não dá erro (mesma resposta)...');
select is_empty($$ select * from public.my_community_blocks() $$, '... e não bloqueia ninguém');
select is((select status from public.community_post_comments('20000000-0000-4000-8000-0000000011f1')
            where comment_id = '30000000-0000-4000-8000-0000000011f1'),
  'in_review', 'D: o autor vê o próprio comentário em análise');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c3","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_post_comments('20000000-0000-4000-8000-0000000011f1')
                      where comment_id = '30000000-0000-4000-8000-0000000011f1'),
  'D: comentário em análise não aparece para os outros');
reset role;

-- ---------------------------------------------------------------------------
-- E. Contagem de Amém: ninguém, nem a moderação
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_amen('20000000-0000-4000-8000-0000000011f1', true), true, 'E: Bruno dá Amém');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c3","role":"authenticated"}', true);
set local role authenticated;
select is(public.set_amen('20000000-0000-4000-8000-0000000011f1', true), true, 'E: Carla dá Amém');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c9","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from public.community_amens where post_id = '20000000-0000-4000-8000-0000000011f1'),
  0, 'E: a moderação não conta os Amém de ninguém');
reset role;

-- ---------------------------------------------------------------------------
-- F. Denúncia urgente de COMENTÁRIO tira do ar; risco à vida só prioriza
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated"}', true);
set local role authenticated;
select isnt(public.report_community_content(target_comment => '30000000-0000-4000-8000-0000000011f2',
                                            report_reason => 'rosto_de_terceiro'),
            null, 'F: denúncia de "apareço nesta foto/texto" no comentário devolve recibo');
select ok(not exists (select 1 from public.community_post_comments('20000000-0000-4000-8000-0000000011f1')
                      where comment_id = '30000000-0000-4000-8000-0000000011f2'),
  'F: o comentário sai do ar na hora para quem denunciou');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c1","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_post_comments('20000000-0000-4000-8000-0000000011f1')
                      where comment_id = '30000000-0000-4000-8000-0000000011f2'),
  'F: e para todo mundo (a dona do post também não vê)');
select isnt(public.report_community_content(target_post => '20000000-0000-4000-8000-0000000011f3',
                                            report_reason => 'risco_a_vida'),
            null, 'F: denúncia de risco à vida registrada');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c9","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select item_kind, urgent from public.community_moderation_queue()
      where item_id in ('30000000-0000-4000-8000-0000000011f2', '20000000-0000-4000-8000-0000000011f3')
      order by item_kind $$,
  $$ values ('comment'::text, true), ('post'::text, true) $$,
  'F: as duas denúncias urgentes estão na fila, marcadas como urgentes');
reset role;

-- ---------------------------------------------------------------------------
-- G. Consentimento vigente para Amém, comentário e upload
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c5","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.create_community_comment('20000000-0000-4000-8000-0000000011f1', 'Amém!') $$,
  'CM002', null, 'G: sem consentimento não comenta');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('community-photos', 'e5e50000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000011c5') $$,
  'G: membro sem consentimento sobe foto de PERFIL (só vira foto de post com consentimento e perfil completo)');
select lives_ok($$ select public.block_community_author(target_post => '20000000-0000-4000-8000-0000000011f3') $$,
  'G: bloquear não exige consentimento (Edu bloqueia Bruno)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('community-photos', 'b2c20000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000011c2') $$,
  'G: com consentimento sobe a foto (upload solto, ainda sem post)');
reset role;

-- C2 (2026-09-22): a mesma conta com claim de sessão anônima (conta ligada ao aparelho)
-- publica e sobe foto como qualquer conta; o que vale é ser membro, consentir e ter o perfil.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is((select status from public.create_community_post(post_body => 'Oi da conta do aparelho')), 'published',
  'G: sessão anônima publica com consentimento e perfil completo');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('community-photos', 'b2c20000-0000-4000-8000-000000000002.jpg', '00000000-0000-4000-8000-0000000011c2') $$,
  'G: sessão anônima sobe foto');
reset role;

-- Texto novo aprovado: o consentimento antigo deixa de valer.
update private.community_settings set value = 'v-nova' where key = 'publish_consent_version';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM002', null,
  'G: versão nova do texto: quem aceitou a antiga não publica');
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-0000000011f1', true) $$, 'CM002', null,
  'G: nem marca Amém');
reset role;
update private.community_settings set value = 'v-teste' where key = 'publish_consent_version';

-- ---------------------------------------------------------------------------
-- H. Revogar apaga o conteúdo e MANTÉM os bloqueios
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000011c3","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.block_community_author(target_post => '20000000-0000-4000-8000-0000000011f1') $$,
  'H: Carla bloqueia Ana');
select lives_ok($$ select public.revoke_community_publish_consent() $$, 'H: Carla revoga o consentimento');
select is((select display_name from public.my_community_blocks()), 'Ana', 'H: o bloqueio continua depois de revogar');
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-0000000011f1'),
  'H: e continua protegendo (o post da Ana segue escondido para a Carla)');
select results_eq($$ select is_member, can_publish from public.my_community_status() $$,
  $$ values (true, false) $$, 'H: continua membro (lê), mas não publica');
reset role;
select is((select count(*)::int from public.community_comments where author_id = '00000000-0000-4000-8000-0000000011c3')
        + (select count(*)::int from public.community_amens where user_id = '00000000-0000-4000-8000-0000000011c3'),
  0, 'H: comentários e Amém da Carla foram apagados');

-- ---------------------------------------------------------------------------
-- I. Exclusão da conta do Bruno pelo caminho real da Edge Function delete-account
-- ---------------------------------------------------------------------------
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000011c2');
set local role service_role;
select results_eq(
  $$ select object_name from public.service_prepare_account_deletion('00000000-0000-4000-8000-0000000011c2') $$,
  $$ values ('b2c20000-0000-4000-8000-000000000001.jpg'::text), ('b2c20000-0000-4000-8000-000000000002.jpg'::text) $$,
  'I: a preparação devolve também os uploads soltos (que não viraram post)');
reset role;
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-8000-0000000011c2' $$,
  'I: auth.admin.deleteUser (delete em auth.users) não é bloqueado');
select is_empty(
  $$ select 'post' from public.community_posts where author_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'comentario' from public.community_comments where author_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'amem' from public.community_amens where user_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'bloqueio' from public.community_blocks
                where '00000000-0000-4000-8000-0000000011c2' in (blocker_id, blocked_id)
     union all select 'perfil_comunidade' from public.community_profiles where user_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'consentimento' from public.consent_records where user_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'moderador' from public.community_moderators where user_id = '00000000-0000-4000-8000-0000000011c2'
     union all select 'perfil' from public.profiles where user_id = '00000000-0000-4000-8000-0000000011c2' $$,
  'I: posts, comentários, Amém, bloqueios (feitos E recebidos), perfis, consentimentos e papel de moderador somem');
select results_eq(
  -- (o comentário denunciado já saiu quando a Carla revogou: comment_id virou null)
  $$ select reporter_id is null, reason::text from public.community_reports
      where target_kind = 'comment' and reported_user_id = '00000000-0000-4000-8000-0000000011c3' $$,
  $$ values (true, 'rosto_de_terceiro'::text) $$,
  'I: a denúncia feita por ele fica, sem apontar para a conta excluída');

-- ---------------------------------------------------------------------------
-- J. Exclusão DIRETA (painel do Supabase, sem a Edge Function): a cascata sozinha
-- não pode travar, mesmo com Amém, comentário e bloqueio vivos.
-- ---------------------------------------------------------------------------
insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-0000000011f9', '00000000-0000-4000-8000-0000000011c9', 'Post da Mara', 'published', now());
insert into public.community_amens (user_id, post_id) values
  ('00000000-0000-4000-8000-0000000011c1', '20000000-0000-4000-8000-0000000011f9');
insert into public.community_comments (post_id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-0000000011f9', '00000000-0000-4000-8000-0000000011c1', 'Amém, Mara', 'published', now());
insert into public.community_blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-8000-0000000011c1', '00000000-0000-4000-8000-0000000011c5');
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-8000-0000000011c1' $$,
  'J: excluir a conta direto em auth.users não é travado por Amém, comentário ou bloqueio');
select is_empty(
  $$ select 1 from public.community_amens where user_id = '00000000-0000-4000-8000-0000000011c1'
     union all select 1 from public.community_comments where author_id = '00000000-0000-4000-8000-0000000011c1'
     union all select 1 from public.community_blocks where blocker_id = '00000000-0000-4000-8000-0000000011c1' $$,
  'J: e a cascata leva tudo');

select * from finish();
rollback;
