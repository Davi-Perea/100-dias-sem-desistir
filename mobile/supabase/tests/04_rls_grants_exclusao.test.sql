-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- RLS em toda tabela; anon sem privilégio de tabela; nenhuma policy aberta;
-- exclusão de conta apaga em cascata e não é bloqueada pelo log de auditoria
-- (LGPD art. 18, VI).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'toda tabela de public tem RLS habilitada'
);

select is_empty(
  $$ select table_name, privilege_type from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon' $$,
  'anon não tem nenhum privilégio de tabela em public'
);

select is_empty(
  $$ select policyname from pg_policies
      where schemaname = 'public' and (qual = 'true' or with_check = 'true') $$,
  'nenhuma policy com using (true) / with check (true)'
);

select is_empty(
  $$ select policyname from pg_policies
      where schemaname = 'public' and cmd = 'UPDATE' and with_check is null $$,
  'toda policy de UPDATE tem WITH CHECK'
);

-- Exclusão de conta de um admin que agiu (antes: FK sem on delete travava).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'membro@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'admin@exemplo.test');
insert into public.groups (id, name) values ('10000000-0000-4000-8000-000000000001', 'Grupo T1');
insert into public.app_admins (user_id, granted_by)
  values ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000000c');
insert into public.group_memberships (group_id, user_id)
  values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a');
insert into public.admin_audit_log (actor_id, action, target_user_id, target_group_id)
  values ('00000000-0000-4000-8000-00000000000c', 'teste', '00000000-0000-4000-8000-00000000000a',
          '10000000-0000-4000-8000-000000000001');

select lives_ok(
  $$ delete from auth.users where id in ('00000000-0000-4000-8000-00000000000a',
                                        '00000000-0000-4000-8000-00000000000c') $$,
  'LGPD art. 18: excluir conta de admin/alvo de auditoria não é bloqueado por FK'
);
select is_empty(
  $$ select 1 from public.profiles where user_id in ('00000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-00000000000c')
     union all select 1 from public.group_memberships where user_id = '00000000-0000-4000-8000-00000000000a'
     union all select 1 from public.app_admins where user_id = '00000000-0000-4000-8000-00000000000c' $$,
  'perfil, memberships e papel de admin somem em cascata'
);
select is(
  (select count(*)::int from public.admin_audit_log
    where action = 'teste' and actor_id is null and target_user_id is null),
  1,
  'log de auditoria fica, sem o identificador de quem foi excluído'
);

select * from finish();
rollback;
