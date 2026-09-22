-- =============================================================================
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase test db
--
-- D3: nenhuma SECURITY DEFINER em public; as de private têm search_path = '' e
-- não são executáveis por anon nem por PUBLIC.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef $$,
  'D3: nenhuma função SECURITY DEFINER no schema public (exposto pela API)'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.prosecdef
        and not coalesce(p.proconfig @> array['search_path=""'], false) $$,
  'D3: toda SECURITY DEFINER em private fixa search_path vazio'
);

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private')
        and has_function_privilege('anon', p.oid, 'EXECUTE') $$,
  'D3: anon não executa nenhuma função de public nem de private'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  'D3: anon não tem USAGE no schema private'
);

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname in ('public', 'private') and a.grantee = 0 and a.privilege_type = 'EXECUTE' $$,
  'D3: nenhuma função de public/private tem EXECUTE para PUBLIC'
);

-- Membro comum chamando a ação de admin é recusado pela verificação interna.
insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'membro@exemplo.test');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ select public.admin_set_group_role('00000000-0000-4000-8000-00000000000a',
                                        '10000000-0000-4000-8000-000000000001', 'leader') $$,
  '42501', null,
  'membro comum não muda papel pelo invólucro público'
);
reset role;

select * from finish();
rollback;
