-- =============================================================================
-- EXECUTADO em 2026-09-21 no PGlite (mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- PL/pgSQL só é validado de verdade quando roda. Este arquivo executa, com o papel
-- certo, as RPCs que os arquivos 01–11 nunca chamavam: lista de termos (igreja e
-- base), segunda passada do filtro, moderação de comentário, denúncia de pessoa,
-- suspender/reativar, nome na comunidade, apagar o próprio conteúdo, códigos,
-- moderadores, ciclo da foto (recusa → fila → claim/confirm), órfãos, apagar
-- upload solto e sair da comunidade.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(61);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000012a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000012b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000012e1', 'edu@exemplo.test'),
  ('00000000-0000-4000-8000-0000000012d1', 'moderadora@exemplo.test'),
  ('00000000-0000-4000-8000-0000000012f1', 'admin@exemplo.test');
insert into public.app_admins (user_id) values ('00000000-0000-4000-8000-0000000012f1');
insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000012a1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000012b1', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000012e1', 'Edu',   now()),
  ('00000000-0000-4000-8000-0000000012d1', 'Mara',  now());
-- Perfil completo para publicar (C4, 2026-09-22): foto enviada, ministério respondido, 16+ declarado.
update public.community_profiles set ministry_answered = true, avatar_status = 'in_review', avatar_path = user_id::text || '.jpg';
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000012d1');
insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000012a1'::uuid, '00000000-0000-4000-8000-0000000012b1'::uuid,
                  '00000000-0000-4000-8000-0000000012e1'::uuid, '00000000-0000-4000-8000-0000000012d1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

-- ---------------------------------------------------------------------------
-- Lista de termos da igreja (admin) e lista base (service_role)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012f1","role":"authenticated"}', true);
set local role authenticated;
select is(public.admin_set_filter_term('  Palavrão   FEIO! ', true), 'palavrao feio',
  'admin grava termo normalizado (minúsculas, sem acento, só letras e números)');
select ok(exists (select 1 from public.admin_list_filter_terms() where term = 'palavrao feio' and source = 'igreja'),
  'admin lista o termo da igreja');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.admin_set_filter_term('x y', true) $$, '42501', null, 'quem não é admin não mexe na lista');
select is_empty($$ select * from public.admin_list_filter_terms() $$, 'quem não é admin recebe a lista vazia');
select is((select status from public.create_community_post(post_body => 'Isso é PALAVRÃO feio demais')), 'in_review',
  'termo da igreja segura o texto (com acento e maiúsculas)');
select is((select status from public.create_community_post(post_body => 'Bom dia, igreja')), 'published',
  'texto limpo publica');
reset role;

set local role service_role;
select results_eq($$ select added, removed from public.service_sync_filter_terms(array['abc', 'def', 'ABC inválido']) $$,
  $$ values (2, 0) $$, 'service_role sincroniza a base (ignora termo fora do formato)');
select ok(exists (select 1 from public.service_list_filter_terms() t where t = 'abc'), 'a base aparece na lista do serviço');
select results_eq($$ select added, removed from public.service_sync_filter_terms(array['abc']) $$,
  $$ values (0, 1) $$, 'termo que saiu da base é removido; o da igreja fica');
select throws_ok($$ select * from public.service_sync_filter_terms('{}') $$, '22023', null,
  'lista base vazia é recusada (configuração errada)');
select is(public.service_text_verdict('veja www.exemplo.com'), 'link', 'o serviço consulta o veredito síncrono');
select results_eq(
  $$ select body, status from public.service_community_text('post',
       (select p.id from public.community_posts p where p.body = 'Bom dia, igreja')) $$,
  $$ values ('Bom dia, igreja'::text, 'published'::text) $$, 'o serviço lê o texto pelo id (segunda passada)');
select is(public.service_hold_community_text('post',
            (select p.id from public.community_posts p where p.body = 'Bom dia, igreja'), 'termo'),
  true, 'a segunda passada devolve o post para análise');
select is(public.service_hold_community_text('post',
            (select p.id from public.community_posts p where p.body = 'Bom dia, igreja'), 'termo'),
  false, 'repetir não faz nada (já está em análise)');
select throws_ok($$ select public.service_hold_community_text('post', gen_random_uuid(), 'foto') $$, '22023', null,
  'a segunda passada só segura por termo, link ou contato');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012f1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.admin_set_filter_term('abc', false) $$, '22023', null,
  'termo da base não sai pela lista da igreja');
select lives_ok($$ select public.admin_set_filter_term('palavrão feio', false) $$, 'admin tira o termo da igreja');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select status, hold_reason, decided_by from public.my_community_posts() where body = 'Bom dia, igreja' $$,
  $$ values ('in_review'::text, 'termo'::text, 'automatico'::text) $$,
  'a autora vê que o filtro automático segurou o post');
select is((select status from public.create_community_post(post_body => 'Post para comentar')), 'published',
  'post novo da Ana');
reset role;

-- ---------------------------------------------------------------------------
-- Comentário: moderação, nome na comunidade, apagar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012b1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_comment(
            (select post_id from public.community_feed() where body = 'Post para comentar'), 'Amém, irmã')),
  'published', 'Bruno comenta');
select lives_ok($$ select public.set_community_display_name('  Bruno S.  ') $$, 'Bruno muda o nome na comunidade');
select throws_ok($$ select public.set_community_display_name('   ') $$, '22023', null, 'nome vazio é recusado');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012d1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.moderate_community_comment((select c.id from public.community_comments c limit 1), 'remove') $$,
  '42501', null, 'o app não lê community_comments nem para achar o id');
reset role;
-- (o id do comentário vem da tela, que o recebe de community_post_comments)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ select public.moderate_community_comment(
       (select comment_id from public.community_post_comments(
          (select post_id from public.community_feed() where body = 'Post para comentar'))), 'remove', 'ofensivo') $$,
  'a moderadora remove o comentário com motivo');
select ok(exists (select 1 from public.community_moderation_history()
                  where kind = 'remove' and decided_by = 'pessoa' and excerpt = 'Amém, irmã' and target_name = 'Bruno S.'),
  'o histórico mostra a decisão, o trecho e o nome (sem ids)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select is_empty($$ select * from public.community_post_comments(
                   (select post_id from public.community_feed() where body = 'Post para comentar')) $$,
  'comentário removido some para os outros');
select is_empty($$ select * from public.community_moderation_history() $$, 'quem não modera não vê o histórico');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012b1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select status, author_name from public.community_post_comments(
       (select post_id from public.community_feed() where body = 'Post para comentar')) $$,
  $$ values ('removed'::text, 'Bruno S.'::text) $$, 'o autor vê o próprio comentário como removido, com o nome novo');
reset role;


-- ---------------------------------------------------------------------------
-- Denúncia de pessoa, fechar denúncia, suspender e reativar pelo conteúdo
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_post(post_body => 'Post do Edu? não, da Ana')), 'published', 'mais um post');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012e1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_post(post_body => 'Post do Edu')), 'published', 'Edu publica');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select isnt(public.report_community_content(
              target_post => (select post_id from public.community_feed() where body = 'Post do Edu'),
              report_person => true, report_reason => 'assedio', report_details => 'insiste em mensagens'),
            null, 'Ana denuncia a PESSOA que escreveu, a partir do post');
select ok(exists (select 1 from public.community_feed() where body = 'Post do Edu'),
  'denúncia de pessoa não tira o post do ar sozinha');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012d1","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$ select target_kind, reported_name, reason from public.community_open_reports() where target_kind = 'person' $$,
  $$ values ('person'::text, 'Edu'::text, 'assedio'::text) $$, 'a moderação vê a denúncia de pessoa, sem user_id');
select lives_ok(
  $$ select public.suspend_community_author(
       target_report => (select report_id from public.community_open_reports() where target_kind = 'person'),
       new_status => 'suspended', decision_reason => 'assedio', note_for_author => 'Suspenso por 7 dias.') $$,
  'a moderadora suspende o denunciado pela denúncia');
select lives_ok(
  $$ select public.resolve_community_report((select report_id from public.community_open_reports() where target_kind = 'person'),
                                            'actioned') $$,
  'e fecha a denúncia');
select throws_ok(
  $$ select public.resolve_community_report(gen_random_uuid(), 'actioned') $$, 'P0002', null,
  'fechar denúncia que não está aberta dá "não encontrado"');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012e1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select * from public.create_community_post(post_body => 'Voltei') $$, 'CM004', null,
  'suspenso não publica');
select results_eq($$ select is_member, member_status from public.my_community_status() $$,
  $$ values (false, 'suspended'::text) $$, 'o suspenso vê o próprio estado');
select lives_ok($$ select public.leave_community() $$, 'o suspenso pode sair (apaga o que fez)');
select throws_ok($$ select public.join_community('Edu') $$, 'CM004', null,
  'suspenso que saiu não volta criando o perfil de novo (fica a linha mínima)');
reset role;
select is((select display_name from public.community_profiles where user_id = '00000000-0000-4000-8000-0000000012e1'),
  'Participante', 'da linha mínima sai o nome');

-- ---------------------------------------------------------------------------
-- Apagar o próprio conteúdo
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012b1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.delete_my_community_post((select post_id from public.community_feed() where body = 'Post para comentar')) $$,
  'P0002', null, 'ninguém apaga post de outra pessoa');
select lives_ok(
  $$ select public.delete_my_community_comment(
       (select comment_id from public.community_post_comments(
          (select post_id from public.community_feed() where body = 'Post para comentar')))) $$,
  'o autor apaga o próprio comentário (mesmo removido)');
select throws_ok($$ select public.delete_my_community_comment(gen_random_uuid()) $$, 'P0002', null,
  'apagar comentário inexistente dá "não encontrado"');
reset role;

-- ---------------------------------------------------------------------------
-- Códigos e moderadores (admin)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012f1","role":"authenticated"}', true);
set local role authenticated;
select matches(public.admin_create_invite_code('Ministério 12', 10, 30), '^[A-Z2-9]{5}-[A-Z2-9]{5}$', 'admin gera código');
select results_eq($$ select label, uses, max_uses, active_members from public.admin_list_invite_codes() $$,
  $$ values ('Ministério 12'::text, 0, 10, 0) $$, 'admin lista códigos com uso, limite e membros ativos');
select lives_ok($$ select public.admin_revoke_invite_code((select code_id from public.admin_list_invite_codes())) $$,
  'admin revoga o código');
select throws_ok($$ select public.admin_revoke_invite_code((select code_id from public.admin_list_invite_codes())) $$,
  'P0002', null, 'revogar de novo dá "não encontrado"');
select lives_ok($$ select public.admin_set_community_moderator('00000000-0000-4000-8000-0000000012b1', true) $$,
  'admin torna Bruno moderador');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012b1","role":"authenticated"}', true);
set local role authenticated;
select is((select is_moderator from public.my_community_status()), true, 'Bruno agora modera');
select throws_ok($$ select public.admin_set_community_moderator('00000000-0000-4000-8000-0000000012a1', true) $$,
  '42501', null, 'moderador não nomeia moderador');
reset role;

-- ---------------------------------------------------------------------------
-- Foto: upload → post → recusa → fila → claim/confirm; órfão; apagar upload solto
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
insert into storage.objects (bucket_id, name, owner_id)
  values ('community-photos', 'a1a10000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000012a1'),
         ('community-photos', 'a1a10000-0000-4000-8000-000000000002.jpg', '00000000-0000-4000-8000-0000000012a1');
select is((select status from public.create_community_post(post_photo_paths => array['a1a10000-0000-4000-8000-000000000001.jpg'])),
  'in_review', 'post só com foto vai para análise');
delete from storage.objects where name = 'a1a10000-0000-4000-8000-000000000001.jpg';
delete from storage.objects where name = 'a1a10000-0000-4000-8000-000000000002.jpg';
reset role;
select results_eq($$ select name from storage.objects where bucket_id = 'community-photos' order by name $$,
  $$ values ('a1a10000-0000-4000-8000-000000000001.jpg'::text) $$,
  'a dona apaga o upload solto, mas não a foto que já está num post');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012d1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ select public.moderate_community_post(
       (select item_id from public.community_moderation_queue() where hold_reason = 'foto'), 'reject', 'dado_pessoal') $$,
  'a moderadora recusa a foto');
reset role;

set local role service_role;
select results_eq($$ select bucket_id, object_name from public.claim_storage_deletions(10) $$,
  -- A foto de perfil do Edu (que saiu da comunidade acima) também foi para a fila (C4, 2026-09-22).
  $$ values ('community-photos'::text, '00000000-0000-4000-8000-0000000012e1.jpg'::text),
            ('community-photos'::text, 'a1a10000-0000-4000-8000-000000000001.jpg'::text) $$,
  'a foto recusada entra na fila e o serviço a pega');
select lives_ok($$ select public.confirm_storage_deletion('community-photos', 'a1a10000-0000-4000-8000-000000000001.jpg') $$,
  'o serviço confirma a exclusão');
reset role;
insert into storage.objects (bucket_id, name, owner_id, created_at)
  values ('community-photos', 'a1a10000-0000-4000-8000-000000000003.jpg', '00000000-0000-4000-8000-0000000012a1',
          now() - interval '2 days');
set local role service_role;
select is(public.service_enqueue_orphan_photos(24), 1,
  'o serviço põe na fila só o upload solto com mais de 24 h');
select is_empty($$ select * from public.service_photos_in_use(array['a1a10000-0000-4000-8000-000000000003.jpg']) $$,
  'e confirma que não estão em uso');
reset role;

-- ---------------------------------------------------------------------------
-- Sair da comunidade
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000012a1","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ select public.leave_community() $$, 'Ana sai da comunidade');
select results_eq($$ select is_member, member_status from public.my_community_status() $$,
  $$ values (false, null::text) $$, 'e deixa de ser membro, sem linha nenhuma');
select is_empty($$ select * from public.my_community_posts() $$, 'as publicações dela foram apagadas');
reset role;

select * from finish();
rollback;
