-- =============================================================================
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase test db
--
-- Moderação híbrida: foto só aparece depois de aprovação humana; denúncia de
-- criança ou de rosto de terceiro tira do ar na hora; só moderação decide; o autor
-- vê o motivo. Exclusão de conta: cascata + foto na fila do Storage.
--
-- SUPOSIÇÃO a conferir no primeiro `supabase test db`: o papel postgres consegue
-- inserir em storage.objects (preparação do teste) e ler a tabela nas funções.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000009a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000009b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000009e1', 'moderadora@exemplo.test');

insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000009a1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000009b1', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000009e1', 'Mara',  now());
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000009e1');

insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000009a1'::uuid,
                  '00000000-0000-4000-8000-0000000009b1'::uuid,
                  '00000000-0000-4000-8000-0000000009e1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-0000000009a1', 'Post da Ana', 'published', now()),
  ('20000000-0000-4000-8000-000000000909', '00000000-0000-4000-8000-0000000009e1', 'Post da Mara', 'in_review', null);

-- Foto já enviada pela Ana (o upload real passa pela policy de Storage).
insert into storage.objects (bucket_id, name, owner_id) values
  ('community-photos', '9a1f0000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000009a1');

-- ---------------------------------------------------------------------------
-- Foto: só aparece depois da aprovação humana.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_post(
            post_body => 'Culto de hoje', post_photo_path => '9a1f0000-0000-4000-8000-000000000001.jpg')),
  'in_review', 'post com foto vai SEMPRE para análise humana');
select is((select hold_reason from public.my_community_posts() where photo_path = '9a1f0000-0000-4000-8000-000000000001.jpg'),
  'foto', 'a autora vê que está em análise por causa da foto');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009b1","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_feed() where body = 'Culto de hoje'),
  'foto em análise não aparece no feed');
select is((select count(*)::int from storage.objects where name = '9a1f0000-0000-4000-8000-000000000001.jpg'),
  0, 'outro membro não alcança o arquivo da foto em análise (nem para URL assinada)');
select throws_ok(
  $$ select * from public.create_community_post(post_photo_path => '9a1f0000-0000-4000-8000-000000000001.jpg') $$,
  'P0002', null, 'ninguém publica a foto que outra pessoa subiu');
select is_empty($$ select * from public.community_moderation_queue() $$,
  'quem não modera recebe a fila vazia');
select throws_ok(
  $$ select public.moderate_community_post('20000000-0000-4000-8000-000000000901', 'remove', 'ofensivo') $$,
  '42501', null, 'quem não modera não decide');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009e1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from storage.objects where name = '9a1f0000-0000-4000-8000-000000000001.jpg'),
  1, 'a moderação alcança a foto em análise');
select ok(exists (select 1 from public.community_moderation_queue() where hold_reason = 'foto'),
  'a foto está na fila de moderação');
select throws_ok(
  $$ select public.moderate_community_post('20000000-0000-4000-8000-000000000909', 'approve') $$,
  '42501', null, 'ninguém modera o próprio post');
select lives_ok(
  $$ select public.moderate_community_post(
       (select item_id from public.community_moderation_queue() where hold_reason = 'foto'), 'approve') $$,
  'a moderadora aprova a foto');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009b1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_feed() where body = 'Culto de hoje'),
  'aprovada, a foto aparece no feed');
select is((select count(*)::int from storage.objects where name = '9a1f0000-0000-4000-8000-000000000001.jpg'),
  1, 'e o arquivo fica alcançável para gerar a URL assinada');

-- ---------------------------------------------------------------------------
-- Denúncia urgente: sai do ar na hora, antes da análise.
-- ---------------------------------------------------------------------------
select isnt(public.report_community_content(
              target_post => '20000000-0000-4000-8000-000000000901', report_reason => 'crianca_exposta'),
            null, 'a denúncia devolve um recibo');
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000901'),
  'denúncia de criança exposta tira o post do ar na hora');
select throws_ok(
  $$ select public.report_community_content(target_post => '20000000-0000-4000-8000-000000000901',
                                            report_reason => 'inexistente') $$,
  '22023', null, 'motivo fora da lista é recusado');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009e1","role":"authenticated"}', true);
set local role authenticated;
select is((select urgent from public.community_moderation_queue()
            where item_id = '20000000-0000-4000-8000-000000000901'),
  true, 'a denúncia urgente vai para o topo da fila');
select throws_ok(
  $$ select public.moderate_community_post('20000000-0000-4000-8000-000000000901', 'remove') $$,
  '22023', null, 'remover exige motivo (o autor é avisado)');
select lives_ok(
  $$ select public.moderate_community_post('20000000-0000-4000-8000-000000000901', 'remove', 'crianca_exposta',
                                           'Fotos de crianças não podem ser publicadas.') $$,
  'a moderadora remove com motivo');
-- Nem a moderação recebe o user_id de outra pessoa: suspender vai pelo conteúdo.
select ok(
  not exists (
    select 1 from pg_proc p cross join lateral unnest(p.proargnames) as a(name)
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('community_moderation_queue', 'community_open_reports')
      and a.name in ('author_id', 'reported_user_id')
  ),
  'fila e denúncias não devolvem user_id'
);
select throws_ok(
  $$ select private.set_community_member_status('00000000-0000-4000-8000-0000000009b1', 'suspended', 'ofensivo', null) $$,
  '42501', null, 'o app não chama a função que recebe user_id');
select throws_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000000901',
                                            target_report => gen_random_uuid(), decision_reason => 'ofensivo') $$,
  '22023', null, 'suspender exige exatamente um alvo');
select throws_ok(
  $$ select public.suspend_community_author(target_post => '20000000-0000-4000-8000-000000000909',
                                            decision_reason => 'ofensivo') $$,
  '42501', null, 'ninguém suspende a si mesmo (o servidor resolve o autor pelo post)');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select status, decided_by, reason, note_for_author from public.my_community_posts()
      where post_id = '20000000-0000-4000-8000-000000000901' $$,
  $$ values ('removed'::text, 'pessoa'::text, 'crianca_exposta'::text, 'Fotos de crianças não podem ser publicadas.'::text) $$,
  'a autora vê que foi removido, por uma pessoa, e o motivo (sem saber quem)');
reset role;

-- ---------------------------------------------------------------------------
-- Exclusão de conta: cascata em tudo e a foto vai para a fila do Storage.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-4000-8000-0000000009a1' $$,
  'excluir a conta da autora não é bloqueado por nenhuma chave estrangeira');
select is_empty(
  $$ select 1 from public.community_posts where author_id = '00000000-0000-4000-8000-0000000009a1'
     union all select 1 from public.community_profiles where user_id = '00000000-0000-4000-8000-0000000009a1'
     union all select 1 from public.consent_records where user_id = '00000000-0000-4000-8000-0000000009a1' $$,
  'posts, perfil da comunidade e consentimentos saem em cascata');
select ok(exists (select 1 from private.storage_deletion_queue
                  where bucket_id = 'community-photos' and object_name = '9a1f0000-0000-4000-8000-000000000001.jpg'),
  'a foto do post apagado entra na fila para a Edge Function apagar do Storage');
select is((select count(*)::int from public.community_reports
            where post_id is null and reported_user_id is null and reason = 'crianca_exposta'),
  1, 'a denúncia fica, sem apontar para a conta excluída');

select * from finish();
rollback;
