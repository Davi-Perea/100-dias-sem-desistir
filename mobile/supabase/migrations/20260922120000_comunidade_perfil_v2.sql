-- =============================================================================
-- COMUNIDADE (V2) — perfil v2 (feedback do fundador de 2026-09-22: C1, C2, C4, N3)
--
-- EXECUTADO em 2026-09-22 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase db reset && supabase test db
--
-- O que muda (docs/product/FEEDBACK_DAVI_2026-09-22.md):
--   C3  SEM código da igreja (decisão do fundador, 2026-09-22): quem cria o perfil
--       no app entra na comunidade. redeem_invite_code sai; entra join_community.
--       As tabelas de código ficam (dados antigos, exclusão), mas nada as exige.
--   C2  Entrada SEM e-mail: a conta fica ligada ao aparelho (sessão anônima do
--       Supabase Auth; exige "Allow anonymous sign-ins" ligado no projeto). As
--       barreiras de "conta permanente" (CM006 por is_anonymous) saem de todas as
--       funções da comunidade. O e-mail vira opcional (N3).
--   C1  Sem declaração de 18+ na entrada. No perfil, "Tenho 16 anos ou mais",
--       obrigatória para PUBLICAR (ECA Digital: menor de 16 exige conta ligada a
--       um responsável, o que este app não faz). A coluna adult_attested_at passa
--       a guardar ESSA declaração (16+); o nome ficou por compatibilidade.
--   C4  Perfil em passos que podem ser pulados: foto, nome, ministério (ou
--       "Nenhum") e bio opcional. Para publicar (post e comentário) exige nome,
--       foto e ministério respondido, além da declaração de 16+ (CM007).
--       A foto de perfil segue a regra de toda foto: JPEG reencodado sem EXIF no
--       aparelho, bucket privado, e só aparece para os OUTROS depois de uma
--       pessoa da moderação aprovar. Enquanto isso, só o dono a vê.
--   N3  E-mail de contato opcional, com aceite SEPARADO de novidades (desmarcado
--       por padrão; LGPD art. 8º, §4º: finalidade determinada). Ninguém na
--       comunidade vê o e-mail.
--
-- Amém continua exigindo só o consentimento vigente (não aparece para ninguém,
-- então não pede foto nem nome): set_amen passa a usar assert_consents().
--
-- Novo código de erro: CM007 perfil incompleto para publicar.
-- =============================================================================

-- =============================================================================
-- Colunas novas do perfil
-- =============================================================================
alter table public.community_profiles
  alter column display_name drop not null,
  alter column adult_attested_at drop not null,
  add column ministry text
    check (ministry is null or char_length(trim(ministry)) between 1 and 80),
  add column ministry_answered boolean not null default false,
  add column bio text
    check (bio is null or char_length(trim(bio)) between 1 and 160),
  add column avatar_path text
    check (avatar_path is null
           or avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
  add column avatar_status text not null default 'none'
    check (avatar_status in ('none', 'in_review', 'approved', 'rejected')),
  -- Identificador da foto na fila da moderação: a moderação nunca recebe o user_id.
  add column avatar_ticket uuid unique,
  add column avatar_submitted_at timestamptz,
  add column contact_email text
    check (contact_email is null
           or (char_length(contact_email) <= 254 and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column news_opt_in_at timestamptz,
  add constraint community_profiles_news_needs_email check (news_opt_in_at is null or contact_email is not null),
  add constraint community_profiles_ministry_answered check (ministry is null or ministry_answered),
  add constraint community_profiles_avatar_state check (
    (avatar_path is null and avatar_status in ('none', 'rejected'))
    or (avatar_path is not null and avatar_status in ('in_review', 'approved'))
  );

comment on column public.community_profiles.adult_attested_at is
  'Desde 2026-09-22 (C1): momento da declaração "Tenho 16 anos ou mais", exigida para publicar. Nulo = ainda não declarou.';
comment on column public.community_profiles.ministry_answered is
  'true com ministry nulo = a pessoa escolheu "Nenhum".';

-- =============================================================================
-- Barreiras: sem exigência de conta permanente (C2) e com perfil completo (C4)
-- =============================================================================

-- Membro ativo (para Amém, denunciar, bloquear, editar o perfil). Devolve o uid.
-- Sessão anônima (conta ligada ao aparelho) agora é aceita.
create or replace function private.assert_member()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.community_member_status;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  select cp.status into v_status from public.community_profiles cp where cp.user_id = v_uid;
  if not found then
    raise exception 'crie seu perfil para entrar na comunidade' using errcode = 'CM001';
  end if;
  if v_status <> 'active' then
    raise exception 'participação na comunidade suspensa' using errcode = 'CM004';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_member() from public, anon, authenticated;

-- Membro ativo, conta do app ativa e consentimentos vigentes (o que o Amém exige).
create or replace function private.assert_consents()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if not exists (
    select 1 from public.profiles p where p.user_id = v_uid and p.account_status = 'active'
  ) then
    raise exception 'participação na comunidade suspensa' using errcode = 'CM004';
  end if;
  if not private.has_current_consents(v_uid) then
    raise exception 'consentimento ou aceite das regras pendente' using errcode = 'CM002';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_consents() from public, anon, authenticated;

-- Perfil pronto para aparecer ao lado de uma publicação: nome, foto enviada (em
-- análise ou aprovada), ministério respondido (pode ser "Nenhum") e 16+ declarado.
create or replace function private.community_profile_complete(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_profiles cp
    where cp.user_id = target
      and cp.display_name is not null
      and cp.ministry_answered
      and cp.avatar_path is not null
      and cp.avatar_status in ('in_review', 'approved')
      and cp.adult_attested_at is not null
  );
$$;
revoke all on function private.community_profile_complete(uuid) from public, anon, authenticated;

-- Publicar (post, comentário, foto de post): consentimentos + perfil completo.
create or replace function private.assert_can_publish()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_consents();
begin
  -- private.has_current_consents(v_uid) já foi conferido em assert_consents().
  if not private.community_profile_complete(v_uid) then
    raise exception 'complete o perfil (nome, foto, ministério e 16 anos ou mais) para publicar'
      using errcode = 'CM007';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_can_publish() from public, anon, authenticated;

-- A mesma regra em booleano: my_community_status e a policy de upload de foto de post.
create or replace function private.can_publish()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and private.is_community_member((select auth.uid()))
     and exists (
       select 1 from public.profiles p
       where p.user_id = (select auth.uid()) and p.account_status = 'active'
     )
     and private.has_current_consents((select auth.uid()))
     and private.community_profile_complete((select auth.uid()));
$$;
revoke all on function private.can_publish() from public, anon;
grant execute on function private.can_publish() to authenticated;

-- Amém: marcar exige o consentimento vigente (dado de convicção religiosa, LGPD
-- art. 11), mas não o perfil completo: ninguém vê quem deu Amém.
create or replace function private.set_amen(target_post uuid, amen boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if amen is not true then
    delete from public.community_amens am where am.user_id = v_uid and am.post_id = target_post;
    return false;
  end if;
  -- Desmarcar continua livre (só assert_member), para a pessoa sempre poder retirar.
  perform private.assert_consents();
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  insert into public.community_amens (user_id, post_id) values (v_uid, target_post)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_amen(uuid, boolean) from public, anon;
grant execute on function private.set_amen(uuid, boolean) to authenticated;

-- Aceite de regras/consentimento: igual à versão anterior, sem a barreira de conta permanente.
create or replace function private.accept_community_terms(
  terms_purpose text, terms_version text, terms_sha256 text, client_app_version text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_version text;
  v_sha text;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if terms_purpose = 'community_publish' then
    v_version := private.community_setting('publish_consent_version');
    v_sha     := private.community_setting('publish_consent_sha256');
  elsif terms_purpose = 'community_rules' then
    v_version := private.community_setting('rules_version');
    v_sha     := private.community_setting('rules_sha256');
  else
    raise exception 'finalidade inválida' using errcode = '22023';
  end if;
  if v_version = 'PENDENTE' or v_sha = 'PENDENTE' then
    raise exception 'texto ainda não aprovado' using errcode = 'CM005';
  end if;
  if terms_version is distinct from v_version or lower(terms_sha256) is distinct from v_sha then
    raise exception 'versão do texto desatualizada' using errcode = 'CM005';
  end if;
  if exists (
    select 1 from public.consent_records c
    where c.user_id = v_uid and c.purpose = terms_purpose
      and c.text_version = terms_version and c.revoked_at is null
  ) then
    return;  -- já aceitou esta versão
  end if;
  insert into public.consent_records (user_id, purpose, text_version, text_sha256, app_version)
  values (v_uid, terms_purpose, terms_version, lower(terms_sha256), left(client_app_version, 40));
end $$;
revoke all on function private.accept_community_terms(text, text, text, text) from public, anon;
grant execute on function private.accept_community_terms(text, text, text, text) to authenticated;

-- =============================================================================
-- Entrada SEM código (C3, decisão do fundador de 2026-09-22): quem cria o perfil
-- no app entra. Exige sessão (a conta ligada ao aparelho serve). O nome vem
-- depois, no perfil (pode ser pulado). Bloqueio e suspensão continuam valendo:
-- quem já tem perfil que não está ativo não volta por aqui (CM004).
-- O abuso de criar contas em massa é contido na criação da sessão anônima
-- (limite de taxa/CAPTCHA do Supabase Auth, config.toml), não aqui.
-- =============================================================================
drop function public.redeem_invite_code(text, text, boolean);
drop function private.redeem_invite_code(text, text, boolean);

create or replace function private.join_community(chosen_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing public.community_member_status;
  v_name text := nullif(trim(coalesce(chosen_name, '')), '');
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if v_name is not null and char_length(v_name) > 40 then
    raise exception 'nome inválido' using errcode = '22023';
  end if;

  select cp.status into v_existing from public.community_profiles cp where cp.user_id = v_uid;
  if found then
    if v_existing = 'active' then
      return true;  -- já está dentro
    end if;
    raise exception 'entrada na comunidade bloqueada' using errcode = 'CM004';
  end if;

  insert into public.community_profiles (user_id, display_name, status)
  values (v_uid, v_name, 'active')
  on conflict (user_id) do nothing;
  return true;
end $$;
revoke all on function private.join_community(text) from public, anon;
grant execute on function private.join_community(text) to authenticated;

create or replace function public.join_community(chosen_name text default null)
returns boolean language sql security invoker set search_path = '' as $$
  select private.join_community(chosen_name);
$$;
revoke all on function public.join_community(text) from public, anon;
grant execute on function public.join_community(text) to authenticated;

-- =============================================================================
-- Perfil: nome, ministério, bio e 16+ (atualização parcial: nulo = não mexe)
-- =============================================================================
create or replace function private.set_community_profile(
  new_name text, new_ministry text, no_ministry boolean, new_bio text, clear_bio boolean, confirms_16 boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_name text := nullif(trim(coalesce(new_name, '')), '');
  v_ministry text := nullif(trim(coalesce(new_ministry, '')), '');
  v_bio text := nullif(trim(coalesce(new_bio, '')), '');
begin
  if v_name is not null and char_length(v_name) > 40 then
    raise exception 'nome inválido' using errcode = '22023';
  end if;
  if v_ministry is not null and (char_length(v_ministry) > 80 or no_ministry is true) then
    raise exception 'ministério inválido' using errcode = '22023';
  end if;
  if v_bio is not null and (char_length(v_bio) > 160 or clear_bio is true) then
    raise exception 'bio inválida' using errcode = '22023';
  end if;
  update public.community_profiles cp set
    -- O nome não volta a ficar vazio depois de escolhido (apareceria em branco no que já publicou).
    display_name      = coalesce(v_name, cp.display_name),
    ministry          = case when no_ministry is true then null else coalesce(v_ministry, cp.ministry) end,
    ministry_answered = cp.ministry_answered or no_ministry is true or v_ministry is not null,
    bio               = case when clear_bio is true then null else coalesce(v_bio, cp.bio) end,
    adult_attested_at = case when confirms_16 is true then coalesce(cp.adult_attested_at, now())
                             else cp.adult_attested_at end
  where cp.user_id = v_uid;
end $$;
revoke all on function private.set_community_profile(text, text, boolean, text, boolean, boolean) from public, anon;
grant execute on function private.set_community_profile(text, text, boolean, text, boolean, boolean) to authenticated;

create or replace function public.set_community_profile(
  new_name text default null, new_ministry text default null, no_ministry boolean default false,
  new_bio text default null, clear_bio boolean default false, confirms_16 boolean default false
)
returns void language sql security invoker set search_path = '' as $$
  select private.set_community_profile(new_name, new_ministry, no_ministry, new_bio, clear_bio, confirms_16);
$$;
revoke all on function public.set_community_profile(text, text, boolean, text, boolean, boolean) from public, anon;
grant execute on function public.set_community_profile(text, text, boolean, text, boolean, boolean) to authenticated;

-- Foto de perfil: o arquivo já subiu (policy de upload abaixo) e é do chamador.
-- Volta sempre 'in_review': só depois da moderação a foto aparece para os outros.
create or replace function private.set_community_avatar(new_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_old text;
begin
  if new_path is null
     or new_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$' then
    raise exception 'foto inválida' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'community-photos' and o.name = new_path and o.owner_id = v_uid::text
  ) or exists (select 1 from public.community_posts p where p.photo_path = new_path)
     or exists (select 1 from public.community_profiles cp where cp.avatar_path = new_path and cp.user_id <> v_uid) then
    raise exception 'foto inválida' using errcode = '22023';
  end if;
  select cp.avatar_path into v_old from public.community_profiles cp where cp.user_id = v_uid;
  update public.community_profiles cp set
    avatar_path = new_path,
    avatar_status = 'in_review',
    avatar_ticket = gen_random_uuid(),
    avatar_submitted_at = now()
  where cp.user_id = v_uid;
  if v_old is not null and v_old <> new_path then
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('community-photos', v_old)
    on conflict do nothing;
  end if;
  return 'in_review';
end $$;
revoke all on function private.set_community_avatar(text) from public, anon;
grant execute on function private.set_community_avatar(text) to authenticated;

create or replace function public.set_community_avatar(new_path text)
returns text language sql security invoker set search_path = '' as $$
  select private.set_community_avatar(new_path);
$$;
revoke all on function public.set_community_avatar(text) from public, anon;
grant execute on function public.set_community_avatar(text) to authenticated;

create or replace function private.remove_community_avatar()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_old text;
begin
  select cp.avatar_path into v_old from public.community_profiles cp where cp.user_id = v_uid;
  update public.community_profiles cp set
    avatar_path = null, avatar_status = 'none', avatar_ticket = null, avatar_submitted_at = null
  where cp.user_id = v_uid;
  if v_old is not null then
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('community-photos', v_old)
    on conflict do nothing;
  end if;
end $$;
revoke all on function private.remove_community_avatar() from public, anon;
grant execute on function private.remove_community_avatar() to authenticated;

create or replace function public.remove_community_avatar()
returns void language sql security invoker set search_path = '' as $$
  select private.remove_community_avatar();
$$;
revoke all on function public.remove_community_avatar() from public, anon;
grant execute on function public.remove_community_avatar() to authenticated;

-- E-mail opcional (N3) e aceite SEPARADO de novidades. Sem e-mail, sem novidades.
create or replace function private.set_community_contact(new_email text, wants_news boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_email text := nullif(lower(trim(coalesce(new_email, ''))), '');
begin
  if v_email is null and wants_news is true then
    raise exception 'novidades exigem e-mail' using errcode = '22023';
  end if;
  if v_email is not null and (char_length(v_email) > 254
      or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
    raise exception 'e-mail inválido' using errcode = '22023';
  end if;
  update public.community_profiles cp set
    contact_email = v_email,
    news_opt_in_at = case when wants_news is true then coalesce(cp.news_opt_in_at, now()) else null end
  where cp.user_id = v_uid;
end $$;
revoke all on function private.set_community_contact(text, boolean) from public, anon;
grant execute on function private.set_community_contact(text, boolean) to authenticated;

create or replace function public.set_community_contact(new_email text, wants_news boolean default false)
returns void language sql security invoker set search_path = '' as $$
  select private.set_community_contact(new_email, wants_news);
$$;
revoke all on function public.set_community_contact(text, boolean) from public, anon;
grant execute on function public.set_community_contact(text, boolean) to authenticated;

-- =============================================================================
-- Estado da pessoa (o app decide qual tela mostrar), agora com o perfil
-- =============================================================================
drop function public.my_community_status();
drop function private.my_community_status();

create or replace function private.my_community_status()
returns table (
  is_member boolean, member_status text, display_name text, can_publish boolean,
  needs_publish_consent boolean, needs_rules boolean,
  publish_consent_version text, rules_version text, is_moderator boolean,
  ministry text, ministry_answered boolean, bio text, avatar_path text, avatar_status text,
  age_confirmed boolean, contact_email text, news_opt_in boolean, profile_complete boolean
)
language sql stable security definer set search_path = '' as $$
  select
    coalesce(cp.status = 'active', false),
    cp.status::text,
    cp.display_name,
    private.can_publish(),
    not exists (
      select 1 from public.consent_records c
      where c.user_id = (select auth.uid()) and c.purpose = 'community_publish' and c.revoked_at is null
        and c.text_version = private.community_setting('publish_consent_version')
    ),
    not exists (
      select 1 from public.consent_records c
      where c.user_id = (select auth.uid()) and c.purpose = 'community_rules' and c.revoked_at is null
        and c.text_version = private.community_setting('rules_version')
    ),
    private.community_setting('publish_consent_version'),
    private.community_setting('rules_version'),
    private.is_community_moderator(),
    cp.ministry,
    coalesce(cp.ministry_answered, false),
    cp.bio,
    cp.avatar_path,
    coalesce(cp.avatar_status, 'none'),
    cp.adult_attested_at is not null,
    cp.contact_email,
    cp.news_opt_in_at is not null,
    private.community_profile_complete((select auth.uid()))
  from (select 1) as one
  left join public.community_profiles cp on cp.user_id = (select auth.uid())
  where (select auth.uid()) is not null;
$$;
revoke all on function private.my_community_status() from public, anon;
grant execute on function private.my_community_status() to authenticated;

create or replace function public.my_community_status()
returns table (
  is_member boolean, member_status text, display_name text, can_publish boolean,
  needs_publish_consent boolean, needs_rules boolean,
  publish_consent_version text, rules_version text, is_moderator boolean,
  ministry text, ministry_answered boolean, bio text, avatar_path text, avatar_status text,
  age_confirmed boolean, contact_email text, news_opt_in boolean, profile_complete boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_status();
$$;
revoke all on function public.my_community_status() from public, anon;
grant execute on function public.my_community_status() to authenticated;

-- =============================================================================
-- Feed: "Nome · Ministério" e a foto de perfil (aprovada; a própria, sempre)
-- =============================================================================
drop function public.community_feed(timestamptz, uuid);
drop function private.community_feed(timestamptz, uuid);

create or replace function private.community_feed(before_published_at timestamptz, before_post uuid)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean, author_ministry text, author_avatar_path text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.body, p.photo_path, p.day_number, p.published_at,
         a.display_name,
         p.author_id = (select auth.uid()),
         exists (
           select 1 from public.community_amens am
           where am.post_id = p.id and am.user_id = (select auth.uid())
         ),
         a.ministry,
         case when a.avatar_status = 'approved' or p.author_id = (select auth.uid()) then a.avatar_path end
  from public.community_posts p
  join public.community_profiles a on a.user_id = p.author_id and a.status = 'active'
  where (select private.is_community_member((select auth.uid())))
    and p.status = 'published'
    and p.published_at > now() - pg_catalog.make_interval(days => private.community_setting('feed_window_days')::int)
    and not private.blocked_between((select auth.uid()), p.author_id)
    and (
      before_published_at is null
      or (p.published_at, p.id) < (before_published_at,
                                   coalesce(before_post, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by p.published_at desc, p.id desc
  limit 20;
$$;
revoke all on function private.community_feed(timestamptz, uuid) from public, anon;
grant execute on function private.community_feed(timestamptz, uuid) to authenticated;

create or replace function public.community_feed(before_published_at timestamptz default null, before_post uuid default null)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean, author_ministry text, author_avatar_path text
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_feed(before_published_at, before_post);
$$;
revoke all on function public.community_feed(timestamptz, uuid) from public, anon;
grant execute on function public.community_feed(timestamptz, uuid) to authenticated;

-- =============================================================================
-- Fotos: a de perfil conta como "em uso" e segue a mesma visibilidade
-- =============================================================================

-- Foto de post que eu posso ver, a minha, a de perfil APROVADA de um membro ativo
-- sem bloqueio comigo (sendo eu membro), ou moderação.
create or replace function private.can_view_community_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    private.is_community_moderator()
    or exists (
      select 1 from public.community_posts p
      where p.photo_path = object_name
        and (p.author_id = (select auth.uid()) or private.can_view_post(p.id, (select auth.uid())))
    )
    or exists (
      select 1 from public.community_profiles cp
      where cp.avatar_path = object_name
        and (
          cp.user_id = (select auth.uid())
          or (cp.avatar_status = 'approved' and cp.status = 'active'
              and private.is_community_member((select auth.uid()))
              and not private.blocked_between((select auth.uid()), cp.user_id))
        )
    )
  );
$$;
revoke all on function private.can_view_community_photo(text) from public, anon;
grant execute on function private.can_view_community_photo(text) to authenticated;

create or replace function private.community_photo_in_use(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_posts p where p.photo_path = object_name)
      or exists (select 1 from public.community_profiles cp where cp.avatar_path = object_name);
$$;
revoke all on function private.community_photo_in_use(text) from public, anon;
grant execute on function private.community_photo_in_use(text) to authenticated;

-- Upload da foto de PERFIL: basta ser membro ativo (a foto de perfil vem antes do
-- consentimento de publicar, e sem ela não se publica). O arquivo só vira foto de
-- perfil por set_community_avatar e só aparece para os outros depois da moderação.
-- Upload solto que não virar nada sai pela varredura de órfãos.
create or replace function private.can_upload_community_avatar()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and private.is_community_member((select auth.uid()))
     and exists (
       select 1 from public.profiles p
       where p.user_id = (select auth.uid()) and p.account_status = 'active'
     );
$$;
revoke all on function private.can_upload_community_avatar() from public, anon;
grant execute on function private.can_upload_community_avatar() to authenticated;

create policy "comunidade: membro sobe foto de perfil" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (select private.can_upload_community_avatar())
  );

create or replace function private.service_enqueue_orphan_photos(max_age_hours int)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  insert into private.storage_deletion_queue (bucket_id, object_name)
  select o.bucket_id, o.name
    from storage.objects o
   where o.bucket_id = 'community-photos'
     and o.created_at < now() - pg_catalog.make_interval(hours => greatest(coalesce(max_age_hours, 24), 1))
     and not exists (select 1 from public.community_posts p where p.photo_path = o.name)
     and not exists (select 1 from public.community_profiles cp where cp.avatar_path = o.name)
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function private.service_enqueue_orphan_photos(int) from public, anon, authenticated;
grant execute on function private.service_enqueue_orphan_photos(int) to service_role;

create or replace function private.service_photos_in_use(names text[])
returns setof text language sql stable security definer set search_path = '' as $$
  select distinct p.photo_path
    from public.community_posts p
   where p.photo_path = any (coalesce(names, '{}'))
  union
  select cp.avatar_path
    from public.community_profiles cp
   where cp.avatar_path = any (coalesce(names, '{}'));
$$;
revoke all on function private.service_photos_in_use(text[]) from public, anon, authenticated;
grant execute on function private.service_photos_in_use(text[]) to service_role;

-- Sair / exclusão: a foto de perfil vai para a fila junto com o resto. Quem fica
-- com a linha mínima (suspenso/removido) perde nome, foto, bio, ministério e e-mail.
create or replace function private.purge_community_member(target uuid, drop_profile boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.community_posts    p  where p.author_id = target;   -- fotos vão para a fila
  delete from public.community_comments c  where c.author_id = target;
  delete from public.community_amens    am where am.user_id  = target;
  update public.community_reports r set reporter_id = null where r.reporter_id = target;
  if drop_profile then
    -- Bloqueios só saem quando a pessoa deixa a comunidade ou a conta. Na revogação
    -- ("Apagar tudo o que publiquei") ela continua lendo, e o bloqueio continua a
    -- protegê-la de quem ela bloqueou.
    delete from public.community_blocks bl where bl.blocker_id = target;
    delete from public.consent_records cr where cr.user_id = target;
    delete from private.invite_code_attempts att where att.user_id = target;
    insert into private.storage_deletion_queue (bucket_id, object_name)
    select 'community-photos', cp.avatar_path
      from public.community_profiles cp
     where cp.user_id = target and cp.avatar_path is not null
    on conflict do nothing;
    delete from public.community_profiles cp where cp.user_id = target and cp.status = 'active';
    update public.community_profiles cp set
      display_name = 'Participante', avatar_path = null, avatar_status = 'none', avatar_ticket = null,
      avatar_submitted_at = null, bio = null, ministry = null, contact_email = null, news_opt_in_at = null
     where cp.user_id = target and cp.status <> 'active';
  end if;
end $$;
revoke all on function private.purge_community_member(uuid, boolean) from public, anon, authenticated;

-- =============================================================================
-- Moderação da foto de perfil (sem user_id: só o ticket)
-- =============================================================================
create or replace function private.community_avatar_queue()
returns table (ticket uuid, avatar_path text, display_name text, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select cp.avatar_ticket, cp.avatar_path, cp.display_name, cp.avatar_submitted_at
  from public.community_profiles cp
  where (select private.is_community_moderator())
    and cp.avatar_status = 'in_review'
    and cp.status = 'active'
    and cp.avatar_ticket is not null
  order by cp.avatar_submitted_at asc nulls last
  limit 100;
$$;
revoke all on function private.community_avatar_queue() from public, anon;
grant execute on function private.community_avatar_queue() to authenticated;

create or replace function public.community_avatar_queue()
returns table (ticket uuid, avatar_path text, display_name text, submitted_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_avatar_queue();
$$;
revoke all on function public.community_avatar_queue() from public, anon;
grant execute on function public.community_avatar_queue() to authenticated;

-- Aprovar mostra a foto para a comunidade; recusar apaga o arquivo e a pessoa
-- vê "sua foto não foi aprovada" e escolhe outra. Ninguém modera a própria foto.
create or replace function private.moderate_community_avatar(target_ticket uuid, approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_path text;
begin
  if not private.is_community_moderator() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if approve is null then
    raise exception 'decisão ausente' using errcode = '22023';
  end if;
  select cp.user_id, cp.avatar_path into v_owner, v_path
    from public.community_profiles cp
   where cp.avatar_ticket = target_ticket and cp.avatar_status = 'in_review'
   for update;
  if not found then
    raise exception 'foto não encontrada' using errcode = 'P0002';
  end if;
  if v_owner = v_uid then
    raise exception 'ninguém modera a própria foto' using errcode = '42501';
  end if;
  if approve then
    update public.community_profiles cp set avatar_status = 'approved' where cp.user_id = v_owner;
  else
    update public.community_profiles cp set
      avatar_path = null, avatar_status = 'rejected', avatar_ticket = null
    where cp.user_id = v_owner;
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('community-photos', v_path)
    on conflict do nothing;
  end if;
end $$;
revoke all on function private.moderate_community_avatar(uuid, boolean) from public, anon;
grant execute on function private.moderate_community_avatar(uuid, boolean) to authenticated;

create or replace function public.moderate_community_avatar(target_ticket uuid, approve boolean)
returns void language sql security invoker set search_path = '' as $$
  select private.moderate_community_avatar(target_ticket, approve);
$$;
revoke all on function public.moderate_community_avatar(uuid, boolean) from public, anon;
grant execute on function public.moderate_community_avatar(uuid, boolean) to authenticated;
