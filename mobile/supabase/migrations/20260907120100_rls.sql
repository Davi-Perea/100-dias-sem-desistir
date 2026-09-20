-- =============================================================================
-- EXECUTION 02 — Row Level Security
--
-- Princípio (spec §13/§24): "Role não é client-controlled." Esconder botão não é
-- segurança. Toda tabela nasce fechada; o acesso é concedido linha a linha.
--
-- Matriz que estas políticas precisam provar:
--   MEMBER  lê o próprio perfil · edita só o próprio nome · lê grupos ativos ·
--           lê a própria membership · NÃO muda o próprio papel · NÃO cria
--           membership como leader · NÃO altera outro usuário
--   LEADER  poderes apenas nos grupos onde é líder · NÃO se promove ·
--           NÃO promove outro · NÃO administra outro grupo
--   ADMIN   age por função protegida (SECURITY DEFINER), com auditoria
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

-- ---------------------------------------------------------------------------
-- Funções auxiliares. SECURITY DEFINER + search_path fixo: sem elas, a policy
-- de membership consultaria a própria tabela e entraria em recursão de RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_group_leader(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'leader'
  );
$$;

revoke execute on function public.role_change_is_authorized() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- O próprio perfil sempre; o de outra pessoa apenas se dividirem um grupo ativo
-- (o líder precisa ver quem são os membros dele). Admin vê todos.
create policy "perfil próprio ou de colega de grupo" on public.profiles
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_app_admin()
    or exists (
      select 1
      from public.group_memberships mine
      join public.group_memberships theirs on theirs.group_id = mine.group_id
      where mine.user_id = (select auth.uid())
        and mine.status = 'active'
        and theirs.user_id = profiles.user_id
        and theirs.status = 'active'
    )
  );

create policy "edito apenas o meu perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- INSERT fica com o trigger de auth.users; o cliente não cria perfis.
-- DELETE acompanha a exclusão da conta em auth.users (on delete cascade).

-- ---------------------------------------------------------------------------
-- groups — catálogo legível por qualquer usuário autenticado; escrita só admin
-- ---------------------------------------------------------------------------
create policy "grupos ativos são legíveis" on public.groups
  for select to authenticated
  using (status = 'active' or public.is_app_admin());

create policy "admin gerencia grupos" on public.groups
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- group_memberships
-- ---------------------------------------------------------------------------
-- Vejo a minha; líder e admin veem as do grupo que administram.
create policy "vejo minha membership e a do meu grupo se for líder" on public.group_memberships
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_app_admin()
    or public.is_group_leader(group_id)
  );

-- Entro em grupo ativo, por mim mesmo, como membro comum e ativo.
-- O trigger guard_membership_role() recusa qualquer role diferente de 'member'.
create policy "entro em grupo ativo como membro" on public.group_memberships
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'member'
    and status = 'active'
    and exists (select 1 from public.groups g where g.id = group_id and g.status = 'active')
  );

-- Saio do grupo. O papel é protegido pelo trigger, não por esta policy.
create policy "saio do meu grupo" on public.group_memberships
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status in ('active', 'left'));

create policy "admin gerencia memberships" on public.group_memberships
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

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
  using (public.is_app_admin());

-- =============================================================================
-- Ação administrativa protegida: único caminho para mudar papel.
-- =============================================================================
create or replace function public.admin_set_group_role(
  target_user  uuid,
  target_group uuid,
  new_role     public.group_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if not public.is_app_admin() then
    raise exception 'apenas administradores podem alterar papéis' using errcode = '42501';
  end if;

  -- Abre a janela de autorização apenas dentro desta transação.
  perform set_config('app.role_change_authorized', 'on', true);

  update public.group_memberships
     set role = new_role
   where user_id = target_user
     and group_id = target_group
     and status = 'active';

  if not found then
    perform set_config('app.role_change_authorized', 'off', true);
    raise exception 'membership ativa não encontrada' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (actor_id, action, target_user_id, target_group_id, meta)
  values (actor, 'set_group_role', target_user, target_group, jsonb_build_object('role', new_role));

  perform set_config('app.role_change_authorized', 'off', true);
end $$;

revoke execute on function public.admin_set_group_role(uuid, uuid, public.group_role) from anon;
grant  execute on function public.admin_set_group_role(uuid, uuid, public.group_role) to authenticated;

/** Remove um membro do grupo (ação de líder do próprio grupo ou de admin). */
create or replace function public.remove_group_member(target_user uuid, target_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if not (public.is_app_admin() or public.is_group_leader(target_group)) then
    raise exception 'apenas líder do grupo ou administrador' using errcode = '42501';
  end if;
  if target_user = actor then
    raise exception 'use a saída do grupo para remover a si mesmo' using errcode = '42501';
  end if;

  perform set_config('app.role_change_authorized', 'on', true);
  update public.group_memberships
     set status = 'removed'
   where user_id = target_user and group_id = target_group and status = 'active';
  perform set_config('app.role_change_authorized', 'off', true);

  insert into public.admin_audit_log (actor_id, action, target_user_id, target_group_id)
  values (actor, 'remove_group_member', target_user, target_group);
end $$;

revoke execute on function public.remove_group_member(uuid, uuid) from anon;
grant  execute on function public.remove_group_member(uuid, uuid) to authenticated;
