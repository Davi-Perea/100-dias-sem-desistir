-- =============================================================================
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase test db
--
-- Entrada com código da igreja (só conta permanente, só 18+, 5 tentativas/hora),
-- códigos gerados por admin, consentimento específico e aceite das regras com
-- versão e hash, revogação que tira do ar o que foi publicado.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

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
-- Entrada
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select throws_ok($$ select public.redeem_invite_code('ABCDE-23456', 'Ana', true) $$, 'CM006', null,
  'sessão anônima não entra na comunidade');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.redeem_invite_code('ABCDE-23456', 'Ana', false) $$, 'CM006', null,
  'sem declarar 18+ não entra');
select is(public.redeem_invite_code('ZZZZZ-99999', 'Ana', true), false, 'código errado não entra');
select is(public.redeem_invite_code('REVOG-23456', 'Ana', true), false, 'código revogado não entra');
select is(public.redeem_invite_code(' abcde-23456 ', 'Ana', true), true,
  'código certo entra (minúsculas, espaços e hífen são normalizados)');
select is(public.redeem_invite_code('ABCDE-23456', 'Ana', true), true, 'entrar de novo não dá erro');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM002', null,
  'membro sem consentimento não publica');
reset role;
select is((select uses from private.invite_codes where id = '40000000-0000-4000-8000-000000000a01'), 1,
  'entrar de novo não gasta outro uso do código');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a02","role":"authenticated"}', true);
set local role authenticated;
select is(public.redeem_invite_code('ABCDE23456', 'Bruno', true), true, 'segundo uso do código');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a03","role":"authenticated"}', true);
set local role authenticated;
select is(public.redeem_invite_code('ABCDE23456', 'Carla', true), false, 'código esgotado (max_uses) não entra');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM001', null,
  'quem não entrou não publica');
reset role;

-- Força bruta: 5 tentativas por hora.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000a04","role":"authenticated"}', true);
set local role authenticated;
select is((select bool_or(public.redeem_invite_code('AAAAA-AAAA' || n::text, 'Davi', true))
            from generate_series(1, 5) as n),
  false, 'cinco códigos errados seguidos');
select throws_ok($$ select public.redeem_invite_code('ABCDE-23456', 'Davi', true) $$, 'CM003', null,
  'a sexta tentativa na mesma hora é recusada');
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
select is((select can_publish from public.my_community_status()), true,
  'com os dois aceites vigentes, pode publicar');
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
