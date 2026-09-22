-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- Comunidade: quem vê o quê.
--   * o app não lê as tabelas de conteúdo direto (só RPC);
--   * em análise, só o autor vê; publicado, todo membro ativo vê;
--   * quem não entrou com código não vê nada;
--   * o feed não devolve o user_id de ninguém;
--   * autor suspenso some do feed.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Textos aprovados (versões fictícias de teste).
update private.community_settings set value = 'v-teste' where key in ('publish_consent_version', 'rules_version');
update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000007a1', 'ana@exemplo.test'),
  ('00000000-0000-4000-8000-0000000007b1', 'bruno@exemplo.test'),
  ('00000000-0000-4000-8000-0000000007c1', 'carla@exemplo.test'),
  ('00000000-0000-4000-8000-0000000007d1', 'fora@exemplo.test');

insert into public.community_profiles (user_id, display_name, adult_attested_at) values
  ('00000000-0000-4000-8000-0000000007a1', 'Ana',   now()),
  ('00000000-0000-4000-8000-0000000007b1', 'Bruno', now()),
  ('00000000-0000-4000-8000-0000000007c1', 'Carla', now());

insert into public.consent_records (user_id, purpose, text_version, text_sha256)
select u, p.purpose, 'v-teste', p.sha
from unnest(array['00000000-0000-4000-8000-0000000007a1'::uuid,
                  '00000000-0000-4000-8000-0000000007b1'::uuid,
                  '00000000-0000-4000-8000-0000000007c1'::uuid]) as u
cross join (values ('community_publish', repeat('a', 64)), ('community_rules', repeat('b', 64))) as p(purpose, sha);

insert into public.community_posts (id, author_id, body, status, hold_reason, published_at) values
  ('20000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-0000000007a1', 'Orando pela família', 'published', null, now()),
  ('20000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-0000000007a1', 'Texto segurado',      'in_review', 'link', null),
  ('20000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-0000000007c1', 'Post da Carla',       'published', null, now()),
  ('20000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-0000000007a1', 'Post antigo',         'published', null, now() - interval '30 days');

-- ---------------------------------------------------------------------------
-- Bruno (membro)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007b1","role":"authenticated"}', true);
set local role authenticated;

select throws_ok($$ select * from public.community_posts $$, '42501', null,
  'o app não lê community_posts direto');
select throws_ok($$ select * from public.community_comments $$, '42501', null,
  'o app não lê community_comments direto');
select throws_ok($$ select * from public.community_profiles $$, '42501', null,
  'o app não lê community_profiles direto (nome alheio só pelas RPCs)');

select ok(exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000701'),
  'membro vê post publicado de outra pessoa');
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000702'),
  'membro NÃO vê post em análise de outra pessoa');
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000704'),
  'feed com fim: post fora da janela de dias não aparece');
select is((select author_name from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000701'),
  'Ana', 'o feed mostra o nome de exibição da comunidade');
reset role;

-- ---------------------------------------------------------------------------
-- Ana (autora)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}', true);
set local role authenticated;

select is((select status from public.my_community_posts() where post_id = '20000000-0000-4000-8000-000000000702'),
  'in_review', 'a autora vê o próprio post em análise em Minhas publicações');
select is((select status from public.create_community_post(post_body => 'Deus é fiel')),
  'published', 'texto limpo aparece na hora');
select is((select status from public.create_community_post(post_body => 'Veja www.golpe.com agora')),
  'in_review', 'texto com link vai para análise');
select is((select status from public.create_community_post(post_body => 'Me liga 11 91234-5678')),
  'in_review', 'texto com telefone vai para análise (dado pessoal)');
reset role;

-- Bruno de novo
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007b1","role":"authenticated"}', true);
set local role authenticated;
select ok(exists (select 1 from public.community_feed() where body = 'Deus é fiel'),
  'o post limpo recém-criado aparece para os outros');
select ok(not exists (select 1 from public.community_feed() where body like 'Veja www%'),
  'o post segurado pelo filtro não aparece para os outros');
reset role;

-- ---------------------------------------------------------------------------
-- Quem não entrou com código
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007d1","role":"authenticated"}', true);
set local role authenticated;
select is_empty($$ select * from public.community_feed() $$,
  'sem código de entrada, o feed vem vazio');
reset role;

-- ---------------------------------------------------------------------------
-- O feed não carrega user_id; autor suspenso some.
-- ---------------------------------------------------------------------------
select ok(
  not exists (
    select 1 from pg_proc p cross join lateral unnest(p.proargnames) as a(name)
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('community_feed', 'community_post_comments', 'my_community_blocks')
      and a.name in ('author_id', 'user_id', 'blocked_id')
  ),
  'feed, comentários e bloqueios não devolvem identificador de outra pessoa'
);

update public.community_profiles set status = 'suspended' where user_id = '00000000-0000-4000-8000-0000000007c1';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007b1","role":"authenticated"}', true);
set local role authenticated;
select ok(not exists (select 1 from public.community_feed() where post_id = '20000000-0000-4000-8000-000000000703'),
  'post de autor suspenso sai do feed');
reset role;

select * from finish();
rollback;
