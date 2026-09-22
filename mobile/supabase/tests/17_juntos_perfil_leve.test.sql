-- =============================================================================
-- Juntos (2026-09-23): nome + 16+ bastam para publicar e comentar.
-- Sem foto de perfil e sem ministério. Consentimento e regras continuam.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000017a1', null),
  ('00000000-0000-4000-8000-0000000017b1', 'bruno17@exemplo.test');
-- Alguém já publicado, para o Amém ter onde cair.
insert into public.community_profiles (user_id, display_name, adult_attested_at, ministry_answered) values
  ('00000000-0000-4000-8000-0000000017b1', 'Bruno', now(), true);
insert into public.community_posts (id, author_id, body, status, published_at) values
  ('20000000-0000-4000-8000-0000000017b1', '00000000-0000-4000-8000-0000000017b1', 'Post do Bruno', 'published', now());

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000017a1","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is(public.join_community(), true, 'conta do aparelho entra direto');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi') $$, 'CM002', null,
  'sem consentimento e regras não publica');
select lives_ok($$ select public.accept_community_terms('community_rules', 'v-teste', repeat('b', 64), 't') $$,
  'aceita as regras');
select lives_ok($$ select public.accept_community_terms('community_publish', 'v-teste', repeat('a', 64), 't') $$,
  'consente');
select throws_ok($$ select * from public.create_community_post(post_body => 'Oi')$$, 'CM007', null,
  'sem nome e sem 16+ não publica');
select throws_ok($$ select public.set_amen('20000000-0000-4000-8000-0000000017b1', true)$$, 'CM007', null,
  'sem nome e sem 16+ não dá Amém (o rostinho mostra o nome)');
select lives_ok($$ select public.set_community_profile(new_name => 'Ana', confirms_16 => true) $$,
  'nome e 16+ na tela única');
select is((select profile_complete from public.my_community_status()), true,
  'sem foto e sem ministério o perfil já basta');
select is((select status from public.create_community_post(post_body => 'Primeiro dia')), 'published',
  'publica sem foto de perfil e sem ministério');
select is(public.set_amen('20000000-0000-4000-8000-0000000017b1', true), true,
  'com nome e 16+ dá Amém');

select * from finish();
rollback;
