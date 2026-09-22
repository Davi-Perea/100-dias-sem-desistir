-- =============================================================================
-- EXECUTADO em 2026-09-22 no PGlite (mobile/scripts/sql/run-supabase-sql.mjs).
-- Ainda NÃO EXECUTADO no `supabase test db` (sem Docker/CLI nesta máquina).
--
-- Diário compartilhado (feedback do fundador de 2026-09-22; migration
-- 20260922180000_comunidade_diario.sql):
--   F1  tipo da atividade, anexos (dia, referência de versículo), até 4 fotos em ordem;
--   F5  foto na hora com filtro automático (service_record_photo_checks); sem
--       resultado limpo, continua em análise; texto segurado nunca é publicado pela foto;
--   F6  SUPERADO em 2026-09-22: acabou o público por ministério e o escopo do
--       feed; todo post vai para a igreja inteira (20260923060000_comunidade_igreja_inteira.sql);
--   F3  Amém VISÍVEL: número e até 3 rostinhos, sem user_id, com bloqueio nos dois sentidos;
--   F8  atividade no app (Amém e comentário de outras pessoas nos meus posts), visto.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(61);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000015a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000015b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000015c1', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000015d1', 'dora@exemplo.test'),
  ('00000000-0000-4000-8000-0000000015e1', 'edu@exemplo.test'),
  ('00000000-0000-4000-8000-0000000015f1', null);

-- Ana e Bruno: Louvor. Carla: Intercessão. Dora: modera, sem ministério. Edu: Louvor,
-- foto de perfil ainda em análise. Fábio (f1): sem nome (dá Amém, não publica).
insert into public.community_profiles (user_id, display_name, adult_attested_at, ministry, ministry_answered,
                                       avatar_path, avatar_status) values
  ('00000000-0000-4000-8000-0000000015a1', 'Ana',   now(), 'Louvor',      true, 'a15a0000-0000-4000-8000-000000000015.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000015b1', 'Bruno', now(), 'Louvor',      true, 'b15b0000-0000-4000-8000-000000000015.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000015c1', 'Carla', now(), 'Intercessão', true, 'c15c0000-0000-4000-8000-000000000015.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000015d1', 'Dora',  now(), null,          true, 'd15d0000-0000-4000-8000-000000000015.jpg', 'approved'),
  ('00000000-0000-4000-8000-0000000015e1', 'Edu',   now(), 'Louvor',      true, 'e15e0000-0000-4000-8000-000000000015.jpg', 'in_review'),
  ('00000000-0000-4000-8000-0000000015f1', null,    null,  null,          false, null, 'none');
insert into public.community_moderators (user_id) values ('00000000-0000-4000-8000-0000000015d1');
insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000015a1'::uuid, '00000000-0000-4000-8000-0000000015b1'::uuid,
                  '00000000-0000-4000-8000-0000000015c1'::uuid, '00000000-0000-4000-8000-0000000015d1'::uuid,
                  '00000000-0000-4000-8000-0000000015e1'::uuid, '00000000-0000-4000-8000-0000000015f1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

-- Fotos que a Ana já subiu (o upload real passa pela policy do Storage) e uma do Bruno.
insert into storage.objects (bucket_id, name, owner_id) values
  ('community-photos', 'f1500000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'f1500000-0000-4000-8000-000000000002.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'f1500000-0000-4000-8000-000000000003.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'f1500000-0000-4000-8000-000000000004.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'f1500000-0000-4000-8000-000000000005.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'f1500000-0000-4000-8000-000000000006.jpg', '00000000-0000-4000-8000-0000000015a1'),
  ('community-photos', 'b1500000-0000-4000-8000-000000000001.jpg', '00000000-0000-4000-8000-0000000015b1');

create temporary table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- F1: tipo da atividade e anexos
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
insert into ids select 'leitura', post_id from public.create_community_post(
  post_body => 'Li o dia de hoje antes do trabalho.', post_day => 1::smallint, post_activity => 'leitura');
select is((select status from public.my_community_posts() where post_id = (select id from ids where name = 'leitura')),
  'published', 'F1: leitura do dia com texto limpo aparece na hora');
select is((select activity || ':' || day_number from public.my_community_posts()
            where post_id = (select id from ids where name = 'leitura')),
  'leitura:1', 'F1: o tipo e o dia anexado ficam gravados');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_activity => 'corrida') $$,
  '22023', null, 'F1: tipo de atividade fora da lista é recusado');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_activity => 'versiculo') $$,
  '22023', null, 'F1: "Versículo" sem a referência é recusado');
insert into ids select 'versiculo', post_id from public.create_community_post(
  post_activity => 'versiculo', post_verse_book => 'JHN', post_verse_chapter => 3::smallint,
  post_verse_start => 16::smallint, post_verse_end => 17::smallint);
select is((select verse_book || ' ' || verse_chapter || ':' || verse_start || '-' || verse_end
             from public.my_community_posts() where post_id = (select id from ids where name = 'versiculo')),
  'JHN 3:16-17', 'F1: o versículo anexado é SÓ a referência (livro, capítulo, versículos), sem texto');
select throws_ok($$ select * from public.create_community_post(post_activity => 'versiculo', post_verse_book => 'XYZ',
                      post_verse_chapter => 1::smallint, post_verse_start => 1::smallint) $$,
  '22023', null, 'F1: livro que não existe é recusado');
select throws_ok($$ select * from public.create_community_post(post_activity => 'versiculo', post_verse_book => 'PSA',
                      post_verse_chapter => 23::smallint, post_verse_start => 4::smallint, post_verse_end => 2::smallint) $$,
  '22023', null, 'F1: versículo final antes do inicial é recusado');
select throws_ok($$ select * from public.create_community_post(post_body => '   ') $$,
  '22023', null, 'F1: publicação totalmente vazia é recusada');
select is((select status from public.create_community_post(post_activity => 'jejum')),
  'published', 'F1: "Jejum" sem texto é um post válido (compartilhar o processo do dia)');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_day => 2::smallint) $$,
  '22023', null, 'F1: não se marca dia da campanha que ainda não chegou');

-- ---------------------------------------------------------------------------
-- F1: até 4 fotos, em ordem, só arquivos próprios e não usados
-- ---------------------------------------------------------------------------
select throws_ok($$ select * from public.create_community_post(post_photo_paths => array[
    'f1500000-0000-4000-8000-000000000001.jpg', 'f1500000-0000-4000-8000-000000000002.jpg',
    'f1500000-0000-4000-8000-000000000003.jpg', 'f1500000-0000-4000-8000-000000000004.jpg',
    'f1500000-0000-4000-8000-000000000005.jpg']) $$,
  '22023', null, 'F1: cinco fotos é mais que o limite de 4');
select throws_ok($$ select * from public.create_community_post(post_photo_paths => array[
    'f1500000-0000-4000-8000-000000000001.jpg', 'f1500000-0000-4000-8000-000000000001.jpg']) $$,
  '22023', null, 'F1: a mesma foto duas vezes é recusada');
insert into ids select 'fotos', post_id from public.create_community_post(
  post_body => 'Culto de hoje', post_activity => 'livre', post_photo_paths => array[
    'f1500000-0000-4000-8000-000000000003.jpg', 'f1500000-0000-4000-8000-000000000001.jpg',
    'f1500000-0000-4000-8000-000000000002.jpg']);
select results_eq(
  $$ select status, hold_reason, photo_path, photo_paths from public.my_community_posts()
      where post_id = (select id from ids where name = 'fotos') $$,
  $$ values ('in_review'::text, 'foto'::text, 'f1500000-0000-4000-8000-000000000003.jpg'::text,
             array['f1500000-0000-4000-8000-000000000003.jpg', 'f1500000-0000-4000-8000-000000000001.jpg',
                   'f1500000-0000-4000-8000-000000000002.jpg']) $$,
  'F1/F5: post com 3 fotos guarda a ordem do carrossel e espera o filtro de imagem (em análise, "foto")');
select throws_ok($$ select * from public.create_community_post(post_photo_paths => array['b1500000-0000-4000-8000-000000000001.jpg']) $$,
  'P0002', null, 'ninguém publica a foto que outra pessoa subiu');
select throws_ok($$ select * from public.create_community_post(post_photo_paths => array['f1500000-0000-4000-8000-000000000001.jpg']) $$,
  'P0002', null, 'a foto que já está num post não entra em outro');
insert into ids select 'link', post_id from public.create_community_post(
  post_body => 'veja www.exemplo.com', post_photo_paths => array['f1500000-0000-4000-8000-000000000004.jpg']);
select is((select hold_reason from public.my_community_posts() where post_id = (select id from ids where name = 'link')),
  'link', 'texto que o filtro segura manda no motivo, mesmo com foto');
insert into ids select 'suspeita', post_id from public.create_community_post(
  post_photo_paths => array['f1500000-0000-4000-8000-000000000005.jpg']);
insert into ids select 'pendente', post_id from public.create_community_post(
  post_photo_paths => array['f1500000-0000-4000-8000-000000000006.jpg']);
select throws_ok($$ select public.service_record_photo_checks((select id from ids where name = 'fotos'), 'teste', '[]'::jsonb) $$,
  '42501', null, 'F5: o app não grava resultado de filtro (só a chave de serviço)');
select throws_ok($$ select * from public.community_post_photos $$, '42501', null,
  'a tabela de fotos não é lida direto pelo app');
reset role;

-- ---------------------------------------------------------------------------
-- F5: filtro automático de imagem (a Edge Function submit-post usa a chave de serviço)
-- ---------------------------------------------------------------------------
set local role service_role;
select results_eq(
  $$ select photo_path from public.service_post_photos_for_check((select id from ids where name = 'fotos')) $$,
  $$ values ('f1500000-0000-4000-8000-000000000003.jpg'::text), ('f1500000-0000-4000-8000-000000000001.jpg'),
            ('f1500000-0000-4000-8000-000000000002.jpg') $$,
  'F5: o serviço recebe as fotos que esperam o filtro, na ordem');
select is_empty($$ select * from public.service_post_photos_for_check((select id from ids where name = 'link')) $$,
  'F5: post com texto segurado não vai para o filtro de imagem (uma pessoa decide)');
select ok(exists (select 1 from public.service_pending_photo_posts(20, 0) x where x = (select id from ids where name = 'pendente')),
  'F5: a varredura acha o post que ficou esperando o filtro');
select is(public.service_record_photo_checks((select id from ids where name = 'fotos'), 'aws-rekognition',
    '[{"photo_path":"f1500000-0000-4000-8000-000000000003.jpg","verdict":"limpa","labels":[]},
      {"photo_path":"f1500000-0000-4000-8000-000000000001.jpg","verdict":"limpa","labels":[]},
      {"photo_path":"f1500000-0000-4000-8000-000000000002.jpg","verdict":"limpa","labels":[]}]'::jsonb),
  'published', 'F5: todas as fotos limpas → publicado na hora');
select is(public.service_record_photo_checks((select id from ids where name = 'suspeita'), 'aws-rekognition',
    '[{"photo_path":"f1500000-0000-4000-8000-000000000005.jpg","verdict":"suspeita","labels":["Violence","Graphic Violence"]}]'::jsonb),
  'in_review', 'F5: foto suspeita → continua em análise para uma pessoa');
select is(public.service_record_photo_checks((select id from ids where name = 'link'), 'aws-rekognition',
    '[{"photo_path":"f1500000-0000-4000-8000-000000000004.jpg","verdict":"limpa","labels":[]}]'::jsonb),
  'in_review', 'F5: foto limpa NÃO publica texto que o filtro de texto segurou');
select throws_ok($$ select public.service_record_photo_checks((select id from ids where name = 'pendente'), 'aws-rekognition',
    '[{"photo_path":"f1500000-0000-4000-8000-000000000006.jpg","verdict":"talvez"}]'::jsonb) $$,
  '22023', null, 'F5: veredito fora da lista é recusado');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
select is((select decided_by from public.my_community_posts() where post_id = (select id from ids where name = 'fotos')),
  'automatico', 'F5: a autora vê que foi o filtro automático que liberou');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015b1","role":"authenticated"}', true);
set local role authenticated;
select is((select photo_paths from public.community_feed() where post_id = (select id from ids where name = 'fotos')),
  array['f1500000-0000-4000-8000-000000000003.jpg', 'f1500000-0000-4000-8000-000000000001.jpg',
        'f1500000-0000-4000-8000-000000000002.jpg'],
  'F1: o feed traz as fotos na ordem do carrossel');
select is((select count(*)::int from storage.objects where name = 'f1500000-0000-4000-8000-000000000001.jpg'),
  1, 'foto publicada: outro membro alcança o arquivo (URL assinada)');
select ok(not exists (select 1 from public.community_feed() where post_id = (select id from ids where name = 'suspeita')),
  'foto suspeita não aparece no feed');
select is((select count(*)::int from storage.objects where name = 'f1500000-0000-4000-8000-000000000005.jpg'),
  0, 'nem o arquivo da foto suspeita');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015d1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select photo_check, photo_labels from public.community_moderation_queue()
      where item_id = (select id from ids where name = 'suspeita') $$,
  $$ values ('suspeita'::text, array['Graphic Violence', 'Violence']) $$,
  'F5: a moderação vê o resultado do filtro e os rótulos do provedor');
select lives_ok($$ select public.moderate_community_post((select id from ids where name = 'suspeita'), 'reject', 'ofensivo') $$,
  'a moderadora recusa a foto suspeita');
reset role;
select ok(exists (select 1 from private.storage_deletion_queue where object_name = 'f1500000-0000-4000-8000-000000000005.jpg'),
  'a foto recusada vai para a fila de exclusão do Storage');

-- ---------------------------------------------------------------------------
-- F6 SUPERADO (2026-09-22): o público por ministério acabou; todo post vai para
-- a igreja inteira (20260923060000_comunidade_igreja_inteira.sql)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.create_community_post(post_body => 'Ensaio com oração.', post_audience => 'ministerio') $$,
  '22023', null, 'o público "Meu ministério" acabou: a RPC recusa');
select throws_ok($$ select * from public.create_community_post(post_body => 'oi', post_audience => 'Intercessão') $$,
  '22023', null, 'nem um ministério qualquer pelo nome');
insert into ids select 'louvor', post_id from public.create_community_post(
  post_body => 'Ensaio com oração hoje.', post_activity => 'oracao');
select results_eq(
  $$ select audience, audience_ministry from public.my_community_posts()
      where post_id = (select id from ids where name = 'louvor') $$,
  $$ values ('igreja'::text, null::text) $$,
  'todo post nasce para a igreja inteira, sem ministério gravado');
reset role;

-- Carla é de outro ministério (Intercessão) e vê assim mesmo.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015c1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_feed() where post_id = (select id from ids where name = 'louvor')),
  'quem é de outro ministério vê o post no feed');
select ok(public.set_amen((select id from ids where name = 'louvor'), true), 'e dá Amém');
select lives_ok($$ select public.set_amen((select id from ids where name = 'louvor'), false) $$, 'e pode retirar');
insert into ids select 'carla', post_id from public.create_community_post(post_body => 'Orando pela cidade.');
reset role;

-- Dora não tem ministério no perfil e publica igual.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015d1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_post(post_body => 'Sem ministério, mesma igreja.')), 'published',
  'sem ministério no perfil publica igual');
reset role;

-- ---------------------------------------------------------------------------
-- F3: Amém visível — número e até 3 rostinhos, sem user_id, com bloqueio
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015b1","role":"authenticated"}', true);
set local role authenticated;
select public.set_amen((select id from ids where name = 'leitura'), true);
insert into ids select 'bruno', post_id from public.create_community_post(post_body => 'Meu dia 1.');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015e1","role":"authenticated"}', true);
set local role authenticated;
select public.set_amen((select id from ids where name = 'leitura'), true);
reset role;
-- Fábio (sem nome) tem um Amém de antes da trava de nome + 16+ (20260923050000):
-- gravado direto, para conferir que quem não tem nome conta no número sem rosto.
insert into public.community_amens (user_id, post_id)
values ('00000000-0000-4000-8000-0000000015f1', (select id from ids where name = 'leitura'));
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015c1","role":"authenticated"}', true);
set local role authenticated;
select public.set_amen((select id from ids where name = 'leitura'), true);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
select is((select amen_count from public.community_feed() where post_id = (select id from ids where name = 'leitura')),
  4, 'F3: a autora vê que 4 pessoas disseram Amém');
select is((select jsonb_array_length(amen_faces) from public.community_feed()
            where post_id = (select id from ids where name = 'leitura')),
  3, 'F3: no máximo 3 rostinhos (quem não tem nome conta no número, sem rosto)');
select is((select f ->> 'avatar_path' from public.community_feed() c, jsonb_array_elements(c.amen_faces) f
            where c.post_id = (select id from ids where name = 'leitura') and f ->> 'name' = 'Bruno'),
  'b15b0000-0000-4000-8000-000000000015.jpg', 'F3: rostinho com a foto de perfil aprovada');
select ok((select (f -> 'avatar_path') = 'null'::jsonb from public.community_feed() c, jsonb_array_elements(c.amen_faces) f
            where c.post_id = (select id from ids where name = 'leitura') and f ->> 'name' = 'Edu'),
  'F3: foto de perfil ainda em análise não aparece no rostinho (só o nome)');
select is((select amen_count from public.my_community_posts() where post_id = (select id from ids where name = 'leitura')),
  4, 'F3: "Minhas publicações" também mostra o número');
select lives_ok($$ select public.block_community_author(target_post => (select id from ids where name = 'carla')) $$,
  'Ana bloqueia a Carla');
select is((select amen_count from public.community_feed() where post_id = (select id from ids where name = 'leitura')),
  3, 'F3: quem eu bloqueei sai da contagem que eu vejo');
select ok(not exists (select 1 from public.community_feed() c, jsonb_array_elements(c.amen_faces) f
                      where c.post_id = (select id from ids where name = 'leitura') and f ->> 'name' = 'Carla'),
  'F3: e dos rostinhos');
select public.set_amen((select id from ids where name = 'bruno'), true);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015b1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select f ->> 'name', (f ->> 'is_mine')::boolean from public.community_feed() c, jsonb_array_elements(c.amen_faces) f
      where c.post_id = (select id from ids where name = 'leitura') limit 1 $$,
  $$ values ('Bruno'::text, true) $$,
  'F3: o meu rostinho vem primeiro, marcado como meu');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015c1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select amen_count, amen_faces from public.community_feed() where post_id = (select id from ids where name = 'bruno') $$,
  $$ values (0, '[]'::jsonb) $$,
  'F3: NO OUTRO SENTIDO, quem me bloqueou não aparece no Amém do post de um terceiro');
reset role;

-- ---------------------------------------------------------------------------
-- F8: atividade no app (sem push)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015b1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_comment((select id from ids where name = 'leitura'), 'Que bom, Ana!')),
  'published', 'Bruno comenta na leitura da Ana');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
select is((select has_new_activity from public.my_community_status()), true, 'F8: o sino mostra novidade');
select results_eq(
  $$ select kind, actor_name, preview from public.my_community_activity() order by kind, actor_name nulls last $$,
  $$ values ('amen'::text, 'Bruno'::text, null::text), ('amen', 'Edu', null), ('amen', null, null),
            ('comentario', 'Bruno', 'Que bom, Ana!') $$,
  'F8: Amém e comentário de outras pessoas; quem eu bloqueei não aparece; sem nome vem sem nome');
select public.set_amen((select id from ids where name = 'leitura'), true);
select is((select count(*)::int from public.my_community_activity()), 4, 'F8: o meu Amém no meu post não vira atividade');
select ok((select mark_community_activity_seen from public.mark_community_activity_seen()) >= 4, 'F8: marcar como visto');
select is((select has_new_activity from public.my_community_status()), false, 'F8: depois de ver, o sino apaga');
select is((select count(*)::int from public.my_community_activity() where unread), 0, 'F8: e nada fica como não lido');
select throws_ok($$ select * from public.community_activity $$, '42501', null, 'F8: a tabela não é lida direto pelo app');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015b1","role":"authenticated"}', true);
set local role authenticated;
select public.set_amen((select id from ids where name = 'leitura'), false);
select results_eq($$ select kind, actor_name from public.my_community_activity() $$,
  $$ values ('amen'::text, 'Ana'::text) $$, 'F8: cada um vê só a própria atividade');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015e1","role":"authenticated"}', true);
set local role authenticated;
select is((select status from public.create_community_comment((select id from ids where name = 'leitura'), 'me chama no 11 99999 8888')),
  'in_review', 'Edu comenta com telefone: fica em análise');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000015a1","role":"authenticated"}', true);
set local role authenticated;
select results_eq(
  $$ select kind, actor_name from public.my_community_activity() order by kind, actor_name nulls last $$,
  $$ values ('amen'::text, 'Edu'::text), ('amen', null), ('comentario', 'Bruno') $$,
  'F8: Amém retirado some da atividade; comentário em análise não aparece');
reset role;

select * from finish();
rollback;
