-- =============================================================================
-- EXECUTION 02 — Row Level Security
--
-- Princípio (spec §13/§24): "Role não é client-controlled." Esconder botão não é
-- segurança. Toda tabela nasce fechada; o acesso é concedido linha a linha.
--
-- Matriz que estas políticas precisam provar:
--   MEMBER  lê o próprio perfil · edita só o próprio nome · lê grupos ativos ·
--           lê a própria membership · NÃO entra sozinho em grupo · NÃO volta
--           sozinho depois de removido · NÃO muda o próprio papel · NÃO altera
--           outro usuário · NÃO vê faixa etária nem status de conta de ninguém
--   LEADER  vê nome de exibição dos membros dos próprios grupos · remove membro
--           do próprio grupo · NÃO se promove · NÃO promove outro · NÃO
--           administra outro grupo
--   ADMIN   age por função protegida (SECURITY DEFINER em schema privado), com
--           auditoria; é quem põe pessoas em grupos enquanto não houver convite
--
-- CORREÇÕES DE SEGURANÇA 2026-09-21 (antes de o banco existir; por isso a própria
-- migration foi corrigida, sem migration de remendo). Detalhe e justificativa:
-- docs/technical/SEGURANCA_MIGRATIONS_CORRECOES.md
--   D1  removido o auto-ingresso em qualquer grupo ativo
--   D2  colegas de grupo não leem mais age_band / account_status (privilégio por coluna)
--   D3  SECURITY DEFINER saiu de public para private, search_path = '', EXECUTE revogado de PUBLIC/anon
--   D4  saída de grupo não permite mais reativar membership removida ou deixada
--   D11 remove_group_member recusa alvo sem membership ativa (não grava auditoria falsa)
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.groups            enable row level security;
alter table public.group_memberships enable row level security;
alter table public.app_admins        enable row level security;
alter table public.admin_audit_log   enable row level security;

-- Nenhuma tabela concede acesso a `anon`: a camada de nuvem exige sessão.
revoke all on public.profiles, public.groups, public.group_memberships,
              public.app_admins, public.admin_audit_log
  from anon;
revoke all on all sequences in schema public from anon;

-- ---------------------------------------------------------------------------
-- Privilégios por coluna (D2, D4). RLS decide QUAIS LINHAS; GRANT decide QUAIS
-- COLUNAS. Sem isto, qualquer linha visível entrega todas as colunas.
-- ---------------------------------------------------------------------------
-- profiles: da linha de outra pessoa, só o necessário para mostrar quem é.
-- age_band e account_status ficam legíveis apenas pelo dono, via public.my_profile().
revoke select, insert, update, delete on public.profiles from authenticated;
grant  select (user_id, display_name) on public.profiles to authenticated;
grant  update (display_name)          on public.profiles to authenticated;

-- group_memberships: o cliente só escreve a coluna status (sair do grupo) e o
-- admin insere/apaga. role, user_id, group_id e joined_at nunca por UPDATE do cliente.
revoke update on public.group_memberships from authenticated;
grant  update (status) on public.group_memberships to authenticated;

-- app_admins e admin_audit_log: só leitura pelo cliente (a policy decide qual linha).
revoke insert, update, delete, truncate on public.app_admins, public.admin_audit_log from authenticated;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (D3). SECURITY DEFINER porque a policy de membership
-- consultaria a própria tabela e entraria em recursão de RLS. Moram em `private`
-- (fora da API), com search_path vazio e nomes totalmente qualificados, e só
-- `authenticated` pode executá-las (as policies rodam como o usuário).
-- Todas respondem apenas sobre o próprio chamador.
-- ---------------------------------------------------------------------------
create or replace function private.is_app_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

create or replace function private.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function private.is_group_leader(target_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'leader'
  );
$$;

-- O chamador lidera algum grupo ativo em que `target_user` é membro ativo?
-- Substitui o join que a policy de profiles fazia (e que, por rodar sob a RLS de
-- group_memberships, já só funcionava para líder — agora isso é explícito).
create or replace function private.leads_group_of(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.group_memberships mine
    join public.group_memberships theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and mine.role = 'leader'
      and theirs.user_id = target_user
      and theirs.status = 'active'
  );
$$;

revoke all on function private.is_app_admin()          from public, anon;
revoke all on function private.is_group_member(uuid)   from public, anon;
revoke all on function private.is_group_leader(uuid)   from public, anon;
revoke all on function private.leads_group_of(uuid)    from public, anon;
grant execute on function private.is_app_admin()        to authenticated;
grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_leader(uuid) to authenticated;
grant execute on function private.leads_group_of(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- A LINHA: a própria sempre; a de outra pessoa só para o líder de um grupo dela
-- (o líder precisa ver quem são os membros dele) e para admin.
-- AS COLUNAS: fora a própria linha via my_profile(), só user_id e display_name.
-- Funções sem argumento vão dentro de (select ...) para o Postgres avaliar uma
-- vez por consulta (initPlan), não uma vez por linha.
create policy "perfil próprio, de membro que lidero, ou admin" on public.profiles
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_app_admin())
    or private.leads_group_of(user_id)
  );

create policy "edito apenas o meu perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- INSERT fica com o trigger de auth.users; o cliente não cria perfis.
-- DELETE acompanha a exclusão da conta em auth.users (on delete cascade).

-- O dono lê a própria linha inteira (inclusive age_band e account_status).
-- Implementação SECURITY DEFINER em private; em public fica só um invólucro
-- SECURITY INVOKER, que é o que a API expõe.
create or replace function private.my_profile()
returns table (
  user_id uuid, display_name text, age_band text,
  account_status public.account_status, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.user_id, p.display_name, p.age_band, p.account_status, p.created_at, p.updated_at
  from public.profiles p
  where p.user_id = (select auth.uid());
$$;
revoke all on function private.my_profile() from public, anon;
grant execute on function private.my_profile() to authenticated;

create or replace function public.my_profile()
returns table (
  user_id uuid, display_name text, age_band text,
  account_status public.account_status, created_at timestamptz, updated_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_profile();
$$;
revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- groups — catálogo legível por qualquer usuário autenticado; escrita só admin
-- ---------------------------------------------------------------------------
create policy "grupos ativos são legíveis" on public.groups
  for select to authenticated
  using (status = 'active' or (select private.is_app_admin()));

create policy "admin gerencia grupos" on public.groups
  for all to authenticated
  using ((select private.is_app_admin()))
  with check ((select private.is_app_admin()));

-- ---------------------------------------------------------------------------
-- group_memberships
-- ---------------------------------------------------------------------------
-- Vejo a minha; líder e admin veem as do grupo que administram.
create policy "vejo minha membership e a do meu grupo se for líder" on public.group_memberships
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or (select private.is_app_admin())
    or private.is_group_leader(group_id)
  );

-- D1: NÃO existe mais policy de INSERT para o próprio usuário. A antiga
-- "entro em grupo ativo como membro" deixava qualquer conta autenticada (inclusive
-- sessão anônima) se inscrever em qualquer grupo ativo, e o catálogo é legível por
-- todos. O schema não tem convite nem código; até existir (decisão de produto),
-- a entrada em grupo é feita por admin (policy abaixo). O trigger
-- guard_membership_role() continua recusando role <> 'member' sem autorização.

-- D4: saio do grupo. Só a partir de 'active' e só para 'left'. A versão anterior
-- aceitava status in ('active','left') no WITH CHECK e não filtrava o estado
-- antigo no USING: quem tinha sido REMOVIDO pelo líder voltava sozinho para
-- 'active', e quem saiu reentrava — auto-ingresso por outra porta.
-- Só a coluna status é atualizável pelo cliente (grant por coluna acima).
create policy "saio do meu grupo" on public.group_memberships
  for update to authenticated
  using ((select auth.uid()) = user_id and status = 'active')
  with check ((select auth.uid()) = user_id and status = 'left');

create policy "admin gerencia memberships" on public.group_memberships
  for all to authenticated
  using ((select private.is_app_admin()))
  with check ((select private.is_app_admin()));

-- ---------------------------------------------------------------------------
-- app_admins — leitura só da própria linha; NENHUMA policy de escrita.
-- Conceder admin exige service_role (fora do alcance de qualquer cliente).
-- ---------------------------------------------------------------------------
create policy "vejo se eu sou admin" on public.app_admins
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- admin_audit_log — leitura só para admin; escrita só pela função protegida.
-- ---------------------------------------------------------------------------
create policy "admin lê a auditoria" on public.admin_audit_log
  for select to authenticated
  using ((select private.is_app_admin()));

-- =============================================================================
-- Ações protegidas. Implementação SECURITY DEFINER em `private`; em `public`
-- fica um invólucro SECURITY INVOKER com o MESMO nome e argumentos, para que o
-- app continue chamando supabase.rpc('admin_set_group_role' | 'remove_group_member').
-- O invólucro não tem privilégio próprio: quem decide é a verificação interna.
-- =============================================================================
create or replace function private.admin_set_group_role(
  target_user  uuid,
  target_group uuid,
  new_role     public.group_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if not private.is_app_admin() then
    raise exception 'apenas administradores podem alterar papéis' using errcode = '42501';
  end if;

  -- Abre a janela de autorização apenas dentro desta transação.
  perform pg_catalog.set_config('app.role_change_authorized', 'on', true);

  update public.group_memberships
     set role = new_role
   where user_id = target_user
     and group_id = target_group
     and status = 'active';

  if not found then
    perform pg_catalog.set_config('app.role_change_authorized', 'off', true);
    raise exception 'membership ativa não encontrada' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, target_group_id, meta)
  values (actor, 'set_group_role', target_user, target_group, pg_catalog.jsonb_build_object('role', new_role));

  perform pg_catalog.set_config('app.role_change_authorized', 'off', true);
end $$;

revoke all on function private.admin_set_group_role(uuid, uuid, public.group_role) from public, anon;
grant  execute on function private.admin_set_group_role(uuid, uuid, public.group_role) to authenticated;

create or replace function public.admin_set_group_role(
  target_user  uuid,
  target_group uuid,
  new_role     public.group_role
)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_group_role(target_user, target_group, new_role);
$$;
revoke all on function public.admin_set_group_role(uuid, uuid, public.group_role) from public, anon;
grant  execute on function public.admin_set_group_role(uuid, uuid, public.group_role) to authenticated;

/** Remove um membro do grupo (ação de líder do próprio grupo ou de admin). */
create or replace function private.remove_group_member(target_user uuid, target_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if not (private.is_app_admin() or private.is_group_leader(target_group)) then
    raise exception 'apenas líder do grupo ou administrador' using errcode = '42501';
  end if;
  if target_user = actor then
    raise exception 'use a saída do grupo para remover a si mesmo' using errcode = '42501';
  end if;

  update public.group_memberships
     set status = 'removed'
   where user_id = target_user and group_id = target_group and status = 'active';

  -- SEC-05: sem membership ativa, nada foi removido e nada vai para a auditoria.
  -- Antes, um líder gravava no log uma "remoção" contra qualquer uuid de conta
  -- (inclusive de quem nunca esteve no grupo dele), poluindo o registro.
  if not found then
    raise exception 'membership ativa não encontrada' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, target_group_id)
  values (actor, 'remove_group_member', target_user, target_group);
end $$;

revoke all on function private.remove_group_member(uuid, uuid) from public, anon;
grant  execute on function private.remove_group_member(uuid, uuid) to authenticated;

create or replace function public.remove_group_member(target_user uuid, target_group uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.remove_group_member(target_user, target_group);
$$;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
grant  execute on function public.remove_group_member(uuid, uuid) to authenticated;
