-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db   (pgTAP; cada arquivo roda numa transação desfeita)
--
-- D11 (SEC-05): remover quem não tem membership ativa no grupo falha com P0002 e
-- NÃO grava linha em admin_audit_log.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000d1', 'lider-d11@exemplo.test'),
  ('00000000-0000-4000-8000-0000000000d2', 'estranho-d11@exemplo.test');
insert into public.groups (id, name, status) values
  ('10000000-0000-4000-8000-0000000000d1', 'Grupo D11', 'active');
select set_config('app.role_change_authorized', 'on', true);
insert into public.group_memberships (group_id, user_id, role, status) values
  ('10000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000d1', 'leader', 'active');
select set_config('app.role_change_authorized', 'off', true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.remove_group_member('00000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-0000000000d1') $$,
  'P0002', null,
  'D11: líder não "remove" conta que não está no grupo dele'
);
reset role;

select is(
  (select count(*)::int from public.admin_audit_log
    where target_user_id = '00000000-0000-4000-8000-0000000000d2'),
  0,
  'D11: a tentativa não deixa linha falsa na auditoria'
);

select is(
  (select count(*)::int from public.group_memberships
    where user_id = '00000000-0000-4000-8000-0000000000d2'),
  0,
  'D11: nenhuma membership é criada para o alvo'
);

select * from finish();
rollback;
