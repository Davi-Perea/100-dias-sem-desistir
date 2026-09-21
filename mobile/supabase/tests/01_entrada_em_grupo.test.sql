-- =============================================================================
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase test db   (pgTAP; cada arquivo roda numa transação desfeita)
--
-- D1: ninguém entra sozinho em grupo. D4: removido/que saiu não volta sozinho.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Contas de teste (UUIDs fixos, e-mails .test: nenhum dado real).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'membro@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000b', 'lider@exemplo.test'),
  ('00000000-0000-4000-8000-00000000000c', 'admin@exemplo.test');
insert into public.groups (id, name, status) values
  ('10000000-0000-4000-8000-000000000001', 'Grupo T1', 'active');
insert into public.app_admins (user_id) values ('00000000-0000-4000-8000-00000000000c');
select set_config('app.role_change_authorized', 'on', true);
insert into public.group_memberships (group_id, user_id, role, status) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'leader', 'active');
select set_config('app.role_change_authorized', 'off', true);

-- Sessão do membro comum (autenticado, sem grupo).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$ insert into public.group_memberships (group_id, user_id, role, status)
     values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'member', 'active') $$,
  '42501', null,
  'D1: usuário autenticado NÃO entra sozinho em grupo ativo'
);
reset role;

select is_empty(
  $$ select 1 from pg_policies where schemaname = 'public' and tablename = 'group_memberships'
       and cmd in ('INSERT', 'ALL') and policyname <> 'admin gerencia memberships' $$,
  'D1: não existe policy de INSERT em group_memberships além da do admin'
);

-- Admin põe o membro no grupo (caminho que continua existindo).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ insert into public.group_memberships (group_id, user_id, role, status)
     values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'member', 'active') $$,
  'admin consegue incluir membro'
);
reset role;

-- Líder remove o membro.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ select public.remove_group_member('00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001') $$,
  'líder remove membro do próprio grupo'
);
reset role;

-- Membro removido tenta voltar sozinho.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
update public.group_memberships set status = 'active'
 where group_id = '10000000-0000-4000-8000-000000000001' and user_id = '00000000-0000-4000-8000-00000000000a';
reset role;
select is(
  (select status::text from public.group_memberships
    where group_id = '10000000-0000-4000-8000-000000000001' and user_id = '00000000-0000-4000-8000-00000000000a'),
  'removed',
  'D4: membro REMOVIDO não se reativa por UPDATE (a linha nem é alcançável pela policy)'
);

-- Líder sai do grupo (active -> left) e tenta voltar (left -> active).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$ update public.group_memberships set status = 'left'
      where group_id = '10000000-0000-4000-8000-000000000001' and user_id = '00000000-0000-4000-8000-00000000000b' $$,
  'sair do grupo continua funcionando'
);
update public.group_memberships set status = 'active'
 where group_id = '10000000-0000-4000-8000-000000000001' and user_id = '00000000-0000-4000-8000-00000000000b';
reset role;
select is(
  (select status::text from public.group_memberships
    where group_id = '10000000-0000-4000-8000-000000000001' and user_id = '00000000-0000-4000-8000-00000000000b'),
  'left',
  'D4: quem saiu não reentra sozinho'
);

-- Cliente não troca joined_at/role por UPDATE (grant só na coluna status).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$ update public.group_memberships set joined_at = now()
      where user_id = '00000000-0000-4000-8000-00000000000b' $$,
  '42501', null,
  'D4: UPDATE de coluna diferente de status é negado por privilégio'
);
reset role;

select * from finish();
rollback;
