-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- D2: líder vê só user_id e display_name do membro. age_band e account_status só o dono.
-- D6: cadastro sem e-mail (sessão anônima) cria perfil (bug do handle_new_user).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'membro@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'lider@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000d', 'fora@exemplo.test');
update public.profiles set age_band = '16_17' where user_id = '00000000-0000-4000-8000-00000000000a';
insert into public.groups (id, name) values ('10000000-0000-4000-8000-000000000001', 'Grupo T1');
select set_config('app.role_change_authorized', 'on', true);
insert into public.group_memberships (group_id, user_id, role) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'member'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'leader');
select set_config('app.role_change_authorized', 'off', true);

-- Líder
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select display_name from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a'),
  'Participante',
  'líder vê o nome de exibição do membro (nome padrão, sem prefixo de e-mail)'
);
select throws_ok(
  $$ select age_band from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501', null,
  'D2: líder NÃO lê age_band do membro'
);
select throws_ok(
  $$ select account_status from public.profiles $$,
  '42501', null,
  'D2: ninguém lê account_status pela tabela'
);
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'D2: select * em profiles é negado (obriga a lista de colunas permitidas)'
);
reset role;

-- Quem não lidera o grupo da pessoa não vê a linha.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000d","role":"authenticated"}', true);
set local role authenticated;
select is_empty(
  $$ select user_id from public.profiles where user_id = '00000000-0000-4000-8000-00000000000a' $$,
  'quem não lidera o grupo da pessoa não vê o perfil dela'
);
reset role;

-- O próprio dono lê a linha inteira via RPC.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select is((select age_band from public.my_profile()), '16_17', 'dono lê a própria faixa etária via my_profile()');
select throws_ok(
  $$ update public.profiles set age_band = '18_plus' where user_id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501', null,
  'cliente não grava age_band por UPDATE direto (só display_name)'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Novo nome' where user_id = '00000000-0000-4000-8000-00000000000a' $$,
  'cliente continua editando o próprio nome'
);
reset role;

-- Cadastro sem e-mail (como signInAnonymously) não pode quebrar.
select lives_ok(
  $$ insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000ee', null) $$,
  'D6: usuário sem e-mail recebe perfil com nome padrão (antes: NOT NULL quebrava o cadastro)'
);

select * from finish();
rollback;
