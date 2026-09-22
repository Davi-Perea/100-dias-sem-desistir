-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- D9: os triggers de guarda rodam como quem faz a escrita e chamam
-- private.role_change_is_authorized(). A chave de serviço (painel admin, Edge
-- Function) precisa conseguir escrever em profiles e group_memberships.
-- Os outros testes preparam os dados como postgres e não pegam isso.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'servico@exemplo.test');
insert into public.groups (id, name) values ('10000000-0000-4000-8000-0000000000c1', 'Grupo T5');

set local role service_role;
select lives_ok(
  $$ update public.profiles set display_name = 'Nome pelo servidor'
     where user_id = '00000000-0000-4000-8000-0000000000c1' $$,
  'D9: service_role edita profiles (trigger de guarda não bloqueia por falta de USAGE em private)'
);
select lives_ok(
  $$ insert into public.group_memberships (group_id, user_id, role)
     values ('10000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1', 'member') $$,
  'D9: service_role cria membership comum'
);
select throws_ok(
  $$ update public.profiles set account_status = 'deletion_requested'
     where user_id = '00000000-0000-4000-8000-0000000000c1' $$,
  '42501', null,
  'D9: mesmo o servidor só muda account_status com a chave de autorização ligada'
);
select lives_ok(
  $$ select set_config('app.role_change_authorized', 'on', true);
     update public.profiles set account_status = 'deletion_requested'
     where user_id = '00000000-0000-4000-8000-0000000000c1' $$,
  'D9: servidor marca deletion_requested com a chave ligada na própria transação'
);
reset role;

select * from finish();
rollback;
