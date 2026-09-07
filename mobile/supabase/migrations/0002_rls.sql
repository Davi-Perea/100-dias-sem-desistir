-- =============================================================================
-- Row Level Security — Bible Study App V1
-- Status: ARTEFATO NÃO APLICADO (aguarda projeto Supabase).
--
-- Princípio do spec §13/§24: "Role não é client-controlled."
-- Nenhuma policy permite que o usuário escreva em app_admins nem altere o próprio
-- papel em group_memberships. Promoções só via service_role (Edge Function).
-- =============================================================================

alter table campaigns              enable row level security;
alter table journey_days           enable row level security;
alter table day_readings           enable row level security;
alter table profiles               enable row level security;
alter table consents               enable row level security;
alter table user_day_completions   enable row level security;
alter table groups                 enable row level security;
alter table group_memberships      enable row level security;
alter table app_admins             enable row level security;
alter table group_posts            enable row level security;
alter table reactions              enable row level security;
alter table reports                enable row level security;
alter table blocks                 enable row level security;
alter table device_push_tokens     enable row level security;
alter table notification_preferences enable row level security;
alter table admin_audit_log        enable row level security;
alter table push_dispatch_log      enable row level security;

-- ---------------------------------------------------------------------------
-- Funções auxiliares. SECURITY DEFINER + search_path fixo para evitar escalada.
-- ---------------------------------------------------------------------------
create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins a where a.user_id = (select auth.uid()));
$$;

create or replace function public.is_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_group_leader(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_memberships m
    where m.group_id = target_group
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'leader'
  );
$$;

-- ---------------------------------------------------------------------------
-- Conteúdo da jornada: leitura pública do que está publicado; escrita só admin.
-- ---------------------------------------------------------------------------
create policy "campanhas ativas são legíveis" on campaigns
  for select to anon, authenticated using (status = 'active');

create policy "dias publicados são legíveis" on journey_days
  for select to anon, authenticated
  using (publish_status = 'published'
         and exists (select 1 from campaigns c where c.id = campaign_id and c.status = 'active'));

create policy "leituras de dias publicados são legíveis" on day_readings
  for select to anon, authenticated
  using (exists (select 1 from journey_days d
                 where d.id = journey_day_id and d.publish_status = 'published'));

create policy "admin gerencia campanhas" on campaigns for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin gerencia dias" on journey_days for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());
create policy "admin gerencia leituras" on day_readings for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Perfil e dados pessoais
-- ---------------------------------------------------------------------------
create policy "leio meu perfil" on profiles for select to authenticated
  using ((select auth.uid()) = user_id or public.is_app_admin());
create policy "edito meu perfil" on profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "crio meu perfil" on profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "meus consentimentos" on consents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "registro meu consentimento" on consents for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "meu progresso" on user_day_completions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "meus dispositivos" on device_push_tokens for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "minhas preferências de notificação" on notification_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grupos. Papel NUNCA é escrito pelo cliente.
-- ---------------------------------------------------------------------------
create policy "grupos ativos são legíveis" on groups for select to authenticated
  using (status = 'active');
create policy "admin gerencia grupos" on groups for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

create policy "vejo membros do meu grupo" on group_memberships for select to authenticated
  using (public.is_group_member(group_id) or public.is_app_admin());

-- Entrar num grupo é permitido; escolher o próprio papel não é.
create policy "entro em um grupo como membro" on group_memberships for insert to authenticated
  with check ((select auth.uid()) = user_id and role = 'member' and status = 'active');

-- Sair do grupo: só posso mexer na minha linha e nunca alterar o papel.
create policy "saio do grupo" on group_memberships for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
              and status in ('left', 'active')
              and role = (select m.role from group_memberships m
                          where m.group_id = group_memberships.group_id
                            and m.user_id = (select auth.uid())));

create policy "admin gerencia membros e papéis" on group_memberships for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- app_admins: sem nenhuma policy de escrita. Só service_role escreve.
create policy "vejo se sou admin" on app_admins for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Posts, reações, moderação
-- ---------------------------------------------------------------------------
create policy "leio posts visíveis do meu grupo" on group_posts for select to authenticated
  using (
    moderation_status = 'visible'
    and public.is_group_member(group_id)
    and not exists (select 1 from blocks b
                    where b.blocker_id = (select auth.uid()) and b.blocked_user_id = author_id)
  );

create policy "publico insight no meu grupo" on group_posts for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and public.is_group_member(group_id)
    and (type = 'insight' or public.is_group_leader(group_id))
    and (pinned = false or public.is_group_leader(group_id))
  );

create policy "edito meu próprio post" on group_posts for update to authenticated
  using ((select auth.uid()) = author_id and moderation_status = 'visible')
  with check ((select auth.uid()) = author_id);

create policy "excluo meu próprio post" on group_posts for delete to authenticated
  using ((select auth.uid()) = author_id);

create policy "líder modera o próprio grupo" on group_posts for update to authenticated
  using (public.is_group_leader(group_id)) with check (public.is_group_leader(group_id));

create policy "admin modera tudo" on group_posts for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

create policy "leio reações do meu grupo" on reactions for select to authenticated
  using (exists (select 1 from group_posts p where p.id = post_id and public.is_group_member(p.group_id)));
create policy "reajo como eu mesmo" on reactions for insert to authenticated
  with check ((select auth.uid()) = user_id
              and exists (select 1 from group_posts p
                          where p.id = post_id and public.is_group_member(p.group_id)));
create policy "removo minha reação" on reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "crio denúncia" on reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);
create policy "vejo minhas denúncias" on reports for select to authenticated
  using ((select auth.uid()) = reporter_id or public.is_app_admin());
create policy "admin resolve denúncias" on reports for update to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

create policy "gerencio meus bloqueios" on blocks for all to authenticated
  using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);

-- Logs: leitura só admin; escrita só service_role.
create policy "admin lê auditoria" on admin_audit_log for select to authenticated
  using (public.is_app_admin());
create policy "líder e admin leem envios de push" on push_dispatch_log for select to authenticated
  using (public.is_app_admin() or (group_id is not null and public.is_group_leader(group_id)));
