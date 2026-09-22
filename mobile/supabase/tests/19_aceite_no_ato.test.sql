-- =============================================================================
-- Aceite NO ATO de publicar (decisão do fundador de 2026-09-22): não há tela de
-- aceite. A linha embaixo do botão diz o que a pessoa confirma, e o toque que
-- publica / comenta / diz Amém registra o aceite na MESMA chamada.
--
-- O que este arquivo prova no banco:
--   * uma chamada só cria o membro, guarda nome + 16+, registra as DUAS
--     finalidades (regras e consentimento) com versão, hash e data, e publica;
--   * a barreira (assert_can_publish, STABLE) já enxerga o aceite gravado uma
--     linha antes — é isto que faz "sem tela no meio" funcionar;
--   * atomicidade nos dois sentidos: publicação recusada não deixa consentimento
--     registrado, e nada é criado sem o aceite;
--   * nada de aceite implícito: sem "confirms_16" no corpo, 22023;
--   * texto desatualizado ou ainda PENDENTE continua barrando (CM005);
--   * desmarcar Amém continua livre e NUNCA registra aceite;
--   * nome já escolhido não é trocado pelo toque de publicar;
--   * quem está suspenso não entra por aqui (CM004) e não deixa consentimento.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

update private.community_settings set value = 'v-aceite' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('c', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('d', 64) where key = 'rules_sha256';

-- O corpo que a tela manda junto com o toque. `extra` serve para estragar uma
-- chave de propósito (hash errado, sem confirms_16).
create function pg_temp.aceite(named text default null, extra jsonb default '{}'::jsonb)
returns jsonb language sql as $fn$
  select jsonb_strip_nulls(jsonb_build_object(
    'confirms_16',     true,
    'name',            named,
    'rules_version',   'v-aceite',
    'rules_sha256',    repeat('d', 64),
    'consent_version', 'v-aceite',
    'consent_sha256',  repeat('c', 64),
    'app_version',     '1.0.0 (7)'
  )) || extra;
$fn$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000019a1', null),  -- Ana: ninguém ainda (sem perfil)
  ('00000000-0000-4000-8000-0000000019b1', 'bruno19@exemplo.test'),
  ('00000000-0000-4000-8000-0000000019c1', null),  -- Carla: suspensa
  ('00000000-0000-4000-8000-0000000019d1', null),  -- Dora: nome e 16+, sem consentimento
  ('00000000-0000-4000-8000-0000000019e1', null),  -- Elias: ninguém ainda
  ('00000000-0000-4000-8000-0000000019f1', null);  -- Fábio: membro sem consentimento

insert into public.community_profiles (user_id, display_name, adult_attested_at, status) values
  ('00000000-0000-4000-8000-0000000019b1', 'Bruno', now(), 'active'),
  ('00000000-0000-4000-8000-0000000019c1', 'Carla', now(), 'suspended'),
  ('00000000-0000-4000-8000-0000000019d1', 'Dora',  now(), 'active'),
  ('00000000-0000-4000-8000-0000000019f1', 'Fábio', now(), 'active');

-- Post e comentário do Bruno, para o Amém e o comentário terem onde cair.
insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-0000000019b1', '00000000-0000-4000-8000-0000000019b1',
   'Comecei Gênesis hoje', 'published', now());
insert into public.community_comments (id, post_id, author_id, body, status, published_at) values
  ('30000000-0000-4000-8000-0000000019b1', '20000000-0000-4000-8000-0000000019b1',
   '00000000-0000-4000-8000-0000000019b1', 'Vamos juntos', 'published', now());
-- Fábio já tinha dito Amém (para poder DESMARCAR sem consentimento).
insert into public.community_amens (user_id, post_id) values
  ('00000000-0000-4000-8000-0000000019f1', '20000000-0000-4000-8000-0000000019b1');

-- ---------------------------------------------------------------------------
-- Ana: um toque só = entrar + nome + 16+ + regras + consentimento + publicar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019a1","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;

select is(
  (select status from public.create_community_post(post_body => 'Primeiro dia', accept_terms => pg_temp.aceite('Ana'))),
  'published',
  'um toque só: entra, aceita e publica (sem tela de aceite no meio)');

select is((select profile_complete from public.my_community_status()), true,
  'o mesmo toque deixou o perfil pronto (nome e 16+)');
select is((select display_name from public.my_community_status()), 'Ana',
  'o nome que veio no corpo do aceite ficou gravado');

select results_eq(
  $$ select purpose, text_version, text_sha256 = repeat(case purpose when 'community_rules' then 'd' else 'c' end, 64),
            app_version, accepted_at is not null
       from public.consent_records order by purpose $$,
  $$ values ('community_publish', 'v-aceite', true, '1.0.0 (7)', true),
            ('community_rules',   'v-aceite', true, '1.0.0 (7)', true) $$,
  'as DUAS finalidades ficaram registradas com versão, hash do texto, versão do app e data (LGPD art. 8º, §6º)');

select is(
  (select count(*)::int from public.consent_records where revoked_at is null),
  2,
  'nenhum registro revogado: o aceite valeu');

-- Reenviar o mesmo aceite (a linha continua embaixo do botão) não duplica prova.
select is(
  (select status from public.create_community_post(post_body => 'Segundo post do dia', accept_terms => pg_temp.aceite('Ana'))),
  'published',
  'o segundo post do dia também vai com a linha embaixo do botão');
select is((select count(*)::int from public.consent_records), 2,
  'o mesmo aceite reenviado não vira registro novo');

-- Quem já aceitou continua publicando sem mandar nada (cliente antigo / próximos dias).
select is(
  (select status from public.create_community_post(post_body => 'Terceiro post', accept_terms => null)),
  'published',
  'sem accept_terms continua funcionando para quem já aceitou');

-- ---------------------------------------------------------------------------
-- Nada de aceite implícito nem de texto errado
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select * from public.create_community_post(post_body => 'Oi', accept_terms => pg_temp.aceite('Zé') - 'confirms_16') $$,
  '22023', null,
  'sem a confirmação de 16+ no corpo, o toque não vale como aceite');
select throws_ok(
  $$ select * from public.create_community_post(post_body => 'Oi', accept_terms => '"sim"'::jsonb) $$,
  '22023', null,
  'aceite que não é objeto é recusado');

-- ---------------------------------------------------------------------------
-- Dora: nome já escolhido, sem consentimento. Hash errado e atomicidade.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019d1","role":"authenticated","is_anonymous":true}', true);

select throws_ok(
  $$ select * from public.create_community_post(
       post_body => 'Oi',
       accept_terms => pg_temp.aceite(null, jsonb_build_object('rules_sha256', repeat('e', 64)))) $$,
  'CM005', null,
  'hash de outro texto (tela desatualizada) não registra aceite nenhum');

-- Aceite válido, publicação recusada pelo tamanho: o registro rola junto.
select throws_ok(
  format($$ select * from public.create_community_post(post_body => %L, accept_terms => pg_temp.aceite('Outra')) $$,
         repeat('x', 2001)),
  '22023', null,
  'texto longo demais é recusado depois do aceite');
select is((select count(*)::int from public.consent_records), 0,
  'ATOMICIDADE: publicação recusada não deixa consentimento registrado');

select is(
  (select status from public.create_community_post(post_body => 'Agora sim', accept_terms => pg_temp.aceite('Outra'))),
  'published',
  'com o texto no tamanho, o mesmo toque aceita e publica');
select is((select display_name from public.my_community_status()), 'Dora',
  'nome já escolhido NÃO é trocado pelo toque de publicar');

-- ---------------------------------------------------------------------------
-- Amém e comentário no mesmo toque; desmarcar continua livre
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019e1","role":"authenticated","is_anonymous":true}', true);
select is(public.set_amen('20000000-0000-4000-8000-0000000019b1', true, pg_temp.aceite('Elias')), true,
  'o primeiro Amém de quem nunca participou já traz o aceite (o rostinho mostra o nome)');
select is(
  (select status from public.create_community_comment('20000000-0000-4000-8000-0000000019b1', 'Amém!', pg_temp.aceite())),
  'published',
  'comentar também aceita no mesmo toque');
select is(public.set_comment_amen('30000000-0000-4000-8000-0000000019b1', true, pg_temp.aceite()), true,
  'Amém em comentário idem');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019f1","role":"authenticated","is_anonymous":true}', true);
select is(public.set_amen('20000000-0000-4000-8000-0000000019b1', false, null), false,
  'DESMARCAR continua livre e sem aceite: a pessoa sempre pode retirar');

-- ---------------------------------------------------------------------------
-- Suspensa não entra pelo toque de publicar
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019c1","role":"authenticated","is_anonymous":true}', true);
select throws_ok(
  $$ select * from public.create_community_post(post_body => 'Oi', accept_terms => pg_temp.aceite('Carla')) $$,
  'CM004', null,
  'quem está suspenso não volta pelo aceite no ato');

-- ---------------------------------------------------------------------------
-- Texto ainda não aprovado (Launch Gate): a linha embaixo do botão não salva ninguém
-- ---------------------------------------------------------------------------
reset role;
update private.community_settings set value = 'PENDENTE'
  where key in ('publish_consent_version', 'publish_consent_sha256', 'rules_version', 'rules_sha256');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000019e1","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select throws_ok(
  $$ select * from public.create_community_post(post_body => 'Oi', accept_terms => pg_temp.aceite()) $$,
  'CM005', null,
  'com o texto ainda PENDENTE ninguém aceita no ato (nem publica)');
select is((select count(*)::int from public.my_community_posts()), 0, 'e nada foi publicado');

select * from finish();
rollback;
