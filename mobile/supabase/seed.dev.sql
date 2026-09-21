-- =============================================================================
-- SEED DE DESENVOLVIMENTO — NÃO É MIGRATION
--
-- Este arquivo vive FORA de supabase/migrations/ de propósito: `supabase db push`
-- nunca o aplica. Além disso ele se recusa a rodar sem uma chave explícita.
--
-- Como usar (ambiente local ou de desenvolvimento, nunca produção):
--   1. Crie três contas pelo app (e-mail + código): membro, líder e admin.
--   2. psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -c "set app.allow_dev_seed = 'on';" -f supabase/seed.dev.sql
--
-- Não existe caminho de aplicativo que chegue aqui: as funções abaixo exigem
-- service_role/superusuário e a chave de autorização de seed.
-- =============================================================================

do $$
begin
  if coalesce(current_setting('app.allow_dev_seed', true), 'off') <> 'on' then
    raise exception
      'SEED DE DESENVOLVIMENTO BLOQUEADO. Rode explicitamente com: set app.allow_dev_seed = ''on'';';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Dois grupos de exemplo (idempotente)
-- ---------------------------------------------------------------------------
insert into public.groups (id, name, description, status)
values
  ('11111111-1111-4111-8111-111111111111', 'Intercessão', 'Grupo de oração da igreja (DEV)', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Louvor', 'Ministério de louvor e adoração (DEV)', 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: liga contas já criadas pelo app aos papéis de teste.
-- Uso: select * from private.dev_seed_roles('membro@exemplo.test', 'lider@exemplo.test', 'admin@exemplo.test');
-- (e-mails de contas DE TESTE; nunca rode com contas de pessoas reais)
-- Não cria usuários — o cadastro real passa pelo fluxo de OTP do app.
-- ---------------------------------------------------------------------------
create or replace function private.dev_seed_roles(
  member_email text,
  leader_email text,
  admin_email  text
)
returns table (papel text, email text, resultado text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid;
  leader_id uuid;
  admin_id  uuid;
  intercessao constant uuid := '11111111-1111-4111-8111-111111111111';
  louvor      constant uuid := '22222222-2222-4222-8222-222222222222';
begin
  if coalesce(pg_catalog.current_setting('app.allow_dev_seed', true), 'off') <> 'on' then
    raise exception 'dev_seed_roles bloqueado fora de desenvolvimento' using errcode = '42501';
  end if;

  select id into member_id from auth.users where pg_catalog.lower(auth.users.email) = pg_catalog.lower(member_email);
  select id into leader_id from auth.users where pg_catalog.lower(auth.users.email) = pg_catalog.lower(leader_email);
  select id into admin_id  from auth.users where pg_catalog.lower(auth.users.email) = pg_catalog.lower(admin_email);

  if member_id is null or leader_id is null or admin_id is null then
    raise exception 'crie as três contas pelo app antes de rodar o seed';
  end if;

  -- Abre a janela para escrever papéis diretamente (o trigger normalmente recusa).
  perform pg_catalog.set_config('app.role_change_authorized', 'on', true);

  insert into public.group_memberships (group_id, user_id, role, status)
  values (intercessao, member_id, 'member', 'active'),
         (intercessao, leader_id, 'leader', 'active'),
         (louvor,      admin_id,  'member', 'active')
  on conflict (group_id, user_id) do update set role = excluded.role, status = 'active';

  insert into public.app_admins (user_id, granted_by) values (admin_id, admin_id)
  on conflict (user_id) do nothing;

  perform pg_catalog.set_config('app.role_change_authorized', 'off', true);

  insert into public.admin_audit_log (actor_id, action, meta)
  values (admin_id, 'dev_seed_roles', pg_catalog.jsonb_build_object('ambiente', 'desenvolvimento'));

  return query
    select 'member'::text, member_email, 'membro de Intercessão'::text
    union all select 'leader', leader_email, 'líder de Intercessão'
    union all select 'admin',  admin_email,  'admin global + membro de Louvor';
end $$;

-- Em private (fora da API) e sem EXECUTE para PUBLIC: o revoke só de anon/authenticated
-- não bastava, porque as duas herdam o EXECUTE padrão que o Postgres dá a PUBLIC.
revoke all on function private.dev_seed_roles(text, text, text) from public, anon, authenticated;

comment on function private.dev_seed_roles(text, text, text) is
  'DEV ONLY. Sem GRANT para anon/authenticated: inalcançável pelo aplicativo. '
  'Antes de ir para produção, rode: drop function if exists private.dev_seed_roles(text,text,text);';
