-- =============================================================================
-- COMUNIDADE (V2) — 2/3: regras de visibilidade e a superfície de RPC
--
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase db reset && supabase test db
--
-- Padrão (igual à fundação, D3/D5): implementação SECURITY DEFINER em `private`
-- (fora da API) com search_path = '' e nomes qualificados; em `public` só um
-- invólucro SECURITY INVOKER com o mesmo nome. Toda função tem revoke explícito de
-- PUBLIC e anon. Funções auxiliares que só são chamadas por outras funções de
-- private não têm EXECUTE para authenticated.
--
-- Códigos de erro (o cliente traduz em mobile/src/community/errors.ts):
--   42501  sem permissão (moderação/admin, ou sessão ausente)
--   P0002  não encontrado OU não visível para quem pede (mesma resposta, sem oráculo)
--   22023  entrada inválida
--   CM001  não entrou na comunidade (precisa do código)
--   CM002  consentimento ou aceite das regras pendente
--   CM003  limite de tentativas / de publicações atingido
--   CM004  participação suspensa ou removida
--   CM005  texto de consentimento/regras não aprovado ou versão desatualizada
--   CM006  conta anônima ou sem declaração de maioridade (a comunidade é só 18+)
-- =============================================================================

-- =============================================================================
-- Auxiliares (sem EXECUTE para o app, salvo onde dito)
-- =============================================================================
create or replace function private.community_setting(setting_key text)
returns text language sql stable security definer set search_path = '' as $$
  select s.value from private.community_settings s where s.key = setting_key;
$$;
revoke all on function private.community_setting(text) from public, anon, authenticated;

create or replace function private.is_anonymous_session()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;
revoke all on function private.is_anonymous_session() from public, anon, authenticated;

create or replace function private.is_community_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_profiles cp
    where cp.user_id = target and cp.status = 'active'
  );
$$;
revoke all on function private.is_community_member(uuid) from public, anon, authenticated;

-- Moderador da comunidade ou administrador do app.
create or replace function private.is_community_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.community_moderators m where m.user_id = (select auth.uid()))
    or private.is_app_admin()
  );
$$;
revoke all on function private.is_community_moderator() from public, anon, authenticated;

-- Bloqueio nos DOIS sentidos: A bloqueou B ou B bloqueou A, nenhum vê o outro.
create or replace function private.blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;
revoke all on function private.blocked_between(uuid, uuid) from public, anon, authenticated;

-- Consentimento de publicar E aceite das regras, ambos na versão vigente.
-- Com a versão 'PENDENTE' (texto não aprovado) ninguém tem consentimento válido.
create or replace function private.has_current_consents(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.community_setting('publish_consent_version') <> 'PENDENTE'
     and private.community_setting('rules_version') <> 'PENDENTE'
     and exists (
       select 1 from public.consent_records c
       where c.user_id = target and c.purpose = 'community_publish' and c.revoked_at is null
         and c.text_version = private.community_setting('publish_consent_version')
     )
     and exists (
       select 1 from public.consent_records c
       where c.user_id = target and c.purpose = 'community_rules' and c.revoked_at is null
         and c.text_version = private.community_setting('rules_version')
     );
$$;
revoke all on function private.has_current_consents(uuid) from public, anon, authenticated;

-- Pode publicar (post, comentário, foto)? Conta permanente, membro ativo, conta do app
-- ativa e consentimentos vigentes. Usada também pela policy de upload do Storage,
-- por isso authenticated tem EXECUTE (ela só responde sobre o próprio chamador).
create or replace function private.can_publish()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and not private.is_anonymous_session()
     and private.is_community_member((select auth.uid()))
     and exists (
       select 1 from public.profiles p
       where p.user_id = (select auth.uid()) and p.account_status = 'active'
     )
     and private.has_current_consents((select auth.uid()));
$$;
revoke all on function private.can_publish() from public, anon;
grant execute on function private.can_publish() to authenticated;

-- A mesma verificação, com o motivo exato da recusa. Devolve o uid.
create or replace function private.assert_can_publish()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.community_member_status;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if private.is_anonymous_session() then
    raise exception 'a comunidade exige conta permanente' using errcode = 'CM006';
  end if;
  select cp.status into v_status from public.community_profiles cp where cp.user_id = v_uid;
  if not found then
    raise exception 'entre na comunidade com o código da sua igreja' using errcode = 'CM001';
  end if;
  if v_status <> 'active' or not exists (
    select 1 from public.profiles p where p.user_id = v_uid and p.account_status = 'active'
  ) then
    raise exception 'participação na comunidade suspensa' using errcode = 'CM004';
  end if;
  if not private.has_current_consents(v_uid) then
    raise exception 'consentimento ou aceite das regras pendente' using errcode = 'CM002';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_can_publish() from public, anon, authenticated;

-- Membro ativo com conta permanente (para Amém, denunciar, bloquear). Devolve o uid.
create or replace function private.assert_member()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_status public.community_member_status;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if private.is_anonymous_session() then
    raise exception 'a comunidade exige conta permanente' using errcode = 'CM006';
  end if;
  select cp.status into v_status from public.community_profiles cp where cp.user_id = v_uid;
  if not found then
    raise exception 'entre na comunidade com o código da sua igreja' using errcode = 'CM001';
  end if;
  if v_status <> 'active' then
    raise exception 'participação na comunidade suspensa' using errcode = 'CM004';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_member() from public, anon, authenticated;

-- Dia oficial da campanha no fuso de São Paulo (1..100). Post não marca dia futuro.
create or replace function private.campaign_day()
returns smallint language sql stable security definer set search_path = '' as $$
  select least(100, greatest(1,
    ((now() at time zone 'America/Sao_Paulo')::date
      - private.community_setting('campaign_start')::date) + 1
  ))::smallint;
$$;
revoke all on function private.campaign_day() from public, anon, authenticated;

-- Minúsculas e sem acento, para o filtro.
create or replace function private.community_normalize(input text)
returns text language sql immutable set search_path = '' as $$
  select lower(translate(coalesce(input, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
$$;
revoke all on function private.community_normalize(text) from public, anon, authenticated;

-- Filtro automático ANTES de aparecer (Apple 1.2). NULL = limpo, aparece na hora.
-- Qualquer outro valor segura o texto para uma pessoa olhar (não recusa sozinho):
--   'link'    endereço de site (spam, golpe)
--   'contato' e-mail ou telefone (dado pessoal; e "chegar na pessoa" é pelo comentário)
--   'termo'   termo da lista da igreja (e, depois, do ToxiBR numa Edge Function)
create or replace function private.community_text_verdict(input text)
returns text language sql stable security definer set search_path = '' as $$
  with n as (select private.community_normalize(input) as t)
  select case
    when n.t ~ '(https?://|www\.|[a-z0-9-]+\.(com|br|net|org|me|ly|io|app|link)(/|\M))' then 'link'
    when n.t ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then 'contato'
    when regexp_replace(n.t, '[\s().-]', '', 'g') ~ '\d{8,}' then 'contato'
    when exists (
      select 1 from private.community_filter_terms f
      where position(' ' || f.term || ' ' in ' ' || regexp_replace(n.t, '[^a-z0-9]+', ' ', 'g') || ' ') > 0
    ) then 'termo'
    else null
  end
  from n;
$$;
revoke all on function private.community_text_verdict(text) from public, anon, authenticated;

-- O post está publicado, o autor é membro ativo, quem vê é membro ativo e não há
-- bloqueio entre os dois. É A regra de visibilidade; tudo passa por ela.
create or replace function private.can_view_post(target_post uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select viewer is not null
     and private.is_community_member(viewer)
     and exists (
       select 1 from public.community_posts p
       join public.community_profiles a on a.user_id = p.author_id and a.status = 'active'
       where p.id = target_post
         and p.status = 'published'
         and not private.blocked_between(viewer, p.author_id)
     );
$$;
revoke all on function private.can_view_post(uuid, uuid) from public, anon, authenticated;

-- Policy de leitura do bucket: foto de post que eu posso ver, a minha, ou moderação.
-- (O dono do arquivo solto, ainda sem post, é coberto na própria policy por owner_id.)
create or replace function private.can_view_community_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    private.is_community_moderator()
    or exists (
      select 1 from public.community_posts p
      where p.photo_path = object_name
        and (p.author_id = (select auth.uid()) or private.can_view_post(p.id, (select auth.uid())))
    )
  );
$$;
revoke all on function private.can_view_community_photo(text) from public, anon;
grant execute on function private.can_view_community_photo(text) to authenticated;

-- Foto sai do post (apagado, recusado, removido, ou cascata da exclusão de conta):
-- vai para a fila. Trigger de linha também dispara no delete em cascata.
create or replace function private.enqueue_post_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.photo_path is not null
     and (tg_op = 'DELETE' or new.photo_path is distinct from old.photo_path) then
    insert into private.storage_deletion_queue (bucket_id, object_name)
    values ('community-photos', old.photo_path)
    on conflict do nothing;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;
revoke all on function private.enqueue_post_photo() from public, anon, authenticated;

create trigger community_posts_enqueue_photo
  after delete or update of photo_path on public.community_posts
  for each row execute function private.enqueue_post_photo();

-- Apaga TUDO o que a pessoa fez na comunidade (sair, revogar ou exclusão de conta).
-- Quem foi suspenso/removido fica com uma linha mínima (status), para não voltar
-- com outro código. A exclusão da CONTA apaga até essa linha, por cascata.
create or replace function private.purge_community_member(target uuid, drop_profile boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.community_posts    p  where p.author_id = target;   -- fotos vão para a fila
  delete from public.community_comments c  where c.author_id = target;
  delete from public.community_amens    am where am.user_id  = target;
  delete from public.community_blocks   bl where bl.blocker_id = target;
  update public.community_reports r set reporter_id = null where r.reporter_id = target;
  if drop_profile then
    delete from public.consent_records cr where cr.user_id = target;
    delete from private.invite_code_attempts att where att.user_id = target;
    delete from public.community_profiles cp where cp.user_id = target and cp.status = 'active';
    update public.community_profiles cp set display_name = 'Participante'
     where cp.user_id = target and cp.status <> 'active';
  end if;
end $$;
revoke all on function private.purge_community_member(uuid, boolean) from public, anon, authenticated;

-- =============================================================================
-- Entrada, consentimento e perfil
-- =============================================================================

-- Estado da pessoa na comunidade (o app decide qual tela mostrar).
create or replace function private.my_community_status()
returns table (
  is_member boolean, member_status text, display_name text, can_publish boolean,
  needs_publish_consent boolean, needs_rules boolean,
  publish_consent_version text, rules_version text, is_moderator boolean
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
    private.is_community_moderator()
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
  publish_consent_version text, rules_version text, is_moderator boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_status();
$$;
revoke all on function public.my_community_status() from public, anon;
grant execute on function public.my_community_status() to authenticated;

-- Registra o consentimento específico (community_publish) ou o aceite das regras
-- (community_rules). O servidor confere a versão E o hash do texto que o app mostrou.
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
  if private.is_anonymous_session() then
    raise exception 'a comunidade exige conta permanente' using errcode = 'CM006';
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

create or replace function public.accept_community_terms(
  terms_purpose text, terms_version text, terms_sha256 text, client_app_version text
)
returns void language sql security invoker set search_path = '' as $$
  select private.accept_community_terms(terms_purpose, terms_version, terms_sha256, client_app_version);
$$;
revoke all on function public.accept_community_terms(text, text, text, text) from public, anon;
grant execute on function public.accept_community_terms(text, text, text, text) to authenticated;

-- Entrar na comunidade com o código da igreja. Devolve false para código inválido,
-- vencido, revogado ou esgotado (mesma resposta, sem dizer qual). 5 tentativas/hora.
create or replace function private.redeem_invite_code(invite_code text, chosen_name text, confirms_adult boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_existing public.community_member_status;
  v_code_id uuid;
  v_normalized text;
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  if private.is_anonymous_session() then
    raise exception 'a comunidade exige conta permanente' using errcode = 'CM006';
  end if;
  if confirms_adult is not true then
    raise exception 'a comunidade é para maiores de 18 anos' using errcode = 'CM006';
  end if;
  if chosen_name is null or char_length(trim(chosen_name)) not between 1 and 40 then
    raise exception 'nome inválido' using errcode = '22023';
  end if;

  select cp.status into v_existing from public.community_profiles cp where cp.user_id = v_uid;
  if found then
    if v_existing = 'active' then
      return true;  -- já está dentro; não gasta uso do código
    end if;
    raise exception 'entrada na comunidade bloqueada' using errcode = 'CM004';
  end if;

  if (select count(*) from private.invite_code_attempts a
      where a.user_id = v_uid and a.attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'muitas tentativas' using errcode = 'CM003';
  end if;
  insert into private.invite_code_attempts (user_id) values (v_uid);

  v_normalized := upper(regexp_replace(coalesce(invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  select c.id into v_code_id
    from private.invite_codes c
   where c.code_sha256 = encode(extensions.digest(v_normalized, 'sha256'), 'hex')
     and c.revoked_at is null and c.expires_at > now() and c.uses < c.max_uses
   for update;
  if not found then
    return false;
  end if;

  update private.invite_codes c set uses = c.uses + 1 where c.id = v_code_id;
  insert into public.community_profiles (user_id, display_name, invite_code_id, adult_attested_at)
  values (v_uid, trim(chosen_name), v_code_id, now());
  return true;
end $$;
revoke all on function private.redeem_invite_code(text, text, boolean) from public, anon;
grant execute on function private.redeem_invite_code(text, text, boolean) to authenticated;

create or replace function public.redeem_invite_code(invite_code text, chosen_name text, confirms_adult boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select private.redeem_invite_code(invite_code, chosen_name, confirms_adult);
$$;
revoke all on function public.redeem_invite_code(text, text, boolean) from public, anon;
grant execute on function public.redeem_invite_code(text, text, boolean) to authenticated;

create or replace function private.set_community_display_name(new_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if new_name is null or char_length(trim(new_name)) not between 1 and 40 then
    raise exception 'nome inválido' using errcode = '22023';
  end if;
  update public.community_profiles cp set display_name = trim(new_name) where cp.user_id = v_uid;
end $$;
revoke all on function private.set_community_display_name(text) from public, anon;
grant execute on function private.set_community_display_name(text) to authenticated;

create or replace function public.set_community_display_name(new_name text)
returns void language sql security invoker set search_path = '' as $$
  select private.set_community_display_name(new_name);
$$;
revoke all on function public.set_community_display_name(text) from public, anon;
grant execute on function public.set_community_display_name(text) to authenticated;

-- Revogar o consentimento de publicar TIRA DO AR o que foi publicado (02-lei.md §6):
-- apaga posts, comentários e Amém da pessoa. Continua membro (pode ler).
create or replace function private.revoke_community_publish_consent()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  update public.consent_records c set revoked_at = now()
   where c.user_id = v_uid and c.purpose = 'community_publish' and c.revoked_at is null;
  perform private.purge_community_member(v_uid, false);
end $$;
revoke all on function private.revoke_community_publish_consent() from public, anon;
grant execute on function private.revoke_community_publish_consent() to authenticated;

create or replace function public.revoke_community_publish_consent()
returns void language sql security invoker set search_path = '' as $$
  select private.revoke_community_publish_consent();
$$;
revoke all on function public.revoke_community_publish_consent() from public, anon;
grant execute on function public.revoke_community_publish_consent() to authenticated;

-- Sair da comunidade e apagar tudo o que fiz nela (sem apagar a conta do app).
create or replace function private.leave_community()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  perform private.purge_community_member(v_uid, true);
end $$;
revoke all on function private.leave_community() from public, anon;
grant execute on function private.leave_community() to authenticated;

create or replace function public.leave_community()
returns void language sql security invoker set search_path = '' as $$
  select private.leave_community();
$$;
revoke all on function public.leave_community() from public, anon;
grant execute on function public.leave_community() to authenticated;

-- =============================================================================
-- Leitura: feed com fim, comentários, minhas publicações
-- =============================================================================

-- Feed da igreja: 20 por página, só a última semana (feed_window_days). Quando a
-- página vem com menos de 20, acabou: o app mostra o fim, sem rolagem infinita.
-- Sem user_id do autor, sem contagem de nada. Só diz se EU dei Amém.
create or replace function private.community_feed(before_published_at timestamptz, before_post uuid)
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, published_at timestamptz,
  author_name text, is_mine boolean, i_said_amen boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.body, p.photo_path, p.day_number, p.published_at,
         a.display_name,
         p.author_id = (select auth.uid()),
         exists (
           select 1 from public.community_amens am
           where am.post_id = p.id and am.user_id = (select auth.uid())
         )
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
  author_name text, is_mine boolean, i_said_amen boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_feed(before_published_at, before_post);
$$;
revoke all on function public.community_feed(timestamptz, uuid) from public, anon;
grant execute on function public.community_feed(timestamptz, uuid) to authenticated;

-- Comentários de um post que eu posso ver. Os meus aparecem em qualquer estado
-- (em análise, não publicado), os dos outros só publicados e sem bloqueio.
create or replace function private.community_post_comments(target_post uuid)
returns table (
  comment_id uuid, body text, status text, created_at timestamptz, author_name text, is_mine boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.body, c.status::text, c.created_at, a.display_name,
         c.author_id = (select auth.uid())
  from public.community_comments c
  join public.community_profiles a on a.user_id = c.author_id
  where (select private.can_view_post(target_post, (select auth.uid())))
    and c.post_id = target_post
    and (
      c.author_id = (select auth.uid())
      or (c.status = 'published' and a.status = 'active'
          and not private.blocked_between((select auth.uid()), c.author_id))
    )
  order by c.created_at asc, c.id asc
  limit 200;
$$;
revoke all on function private.community_post_comments(uuid) from public, anon;
grant execute on function private.community_post_comments(uuid) to authenticated;

create or replace function public.community_post_comments(target_post uuid)
returns table (
  comment_id uuid, body text, status text, created_at timestamptz, author_name text, is_mine boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_post_comments(target_post);
$$;
revoke all on function public.community_post_comments(uuid) from public, anon;
grant execute on function public.community_post_comments(uuid) to authenticated;

-- "Minhas publicações": todos os meus posts, com o estado e, se houve decisão, o
-- motivo e se foi pessoa ou filtro automático (nunca QUEM decidiu).
create or replace function private.my_community_posts()
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, status text, hold_reason text,
  created_at timestamptz, published_at timestamptz,
  decided_by text, reason text, note_for_author text
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.body, p.photo_path, p.day_number, p.status::text, p.hold_reason,
         p.created_at, p.published_at,
         la.decided_by, la.reason::text, la.note_for_author
  from public.community_posts p
  left join lateral (
    select m.decided_by, m.reason, m.note_for_author
    from public.community_moderation_actions m
    where m.post_id = p.id
    order by m.created_at desc, m.id desc
    limit 1
  ) la on true
  where p.author_id = (select auth.uid())
  order by p.created_at desc
  limit 100;
$$;
revoke all on function private.my_community_posts() from public, anon;
grant execute on function private.my_community_posts() to authenticated;

create or replace function public.my_community_posts()
returns table (
  post_id uuid, body text, photo_path text, day_number smallint, status text, hold_reason text,
  created_at timestamptz, published_at timestamptz,
  decided_by text, reason text, note_for_author text
)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_posts();
$$;
revoke all on function public.my_community_posts() from public, anon;
grant execute on function public.my_community_posts() to authenticated;

-- =============================================================================
-- Escrita: publicar, comentar, apagar, Amém
-- =============================================================================

-- Texto limpo aparece na hora; texto que o filtro segura e TODA foto vão para análise.
create or replace function private.create_community_post(post_body text, post_photo_path text, post_day smallint)
returns table (post_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := private.assert_can_publish();
  v_body text := nullif(trim(post_body), '');
  v_status public.community_content_status;
  v_hold text;
  v_id uuid;
  v_consent bigint;
begin
  if v_body is null and post_photo_path is null then
    raise exception 'publicação vazia' using errcode = '22023';
  end if;
  if v_body is not null and char_length(v_body) > 2000 then
    raise exception 'texto longo demais' using errcode = '22023';
  end if;
  if post_day is not null and (post_day < 1 or post_day > private.campaign_day()) then
    raise exception 'dia inválido' using errcode = '22023';
  end if;
  if (select count(*) from public.community_posts p
      where p.author_id = v_uid and p.created_at > now() - interval '1 day')
     >= private.community_setting('max_posts_per_day')::int then
    raise exception 'limite diário de publicações' using errcode = 'CM003';
  end if;

  if post_photo_path is not null then
    -- A foto precisa ser um arquivo que ESTA pessoa subiu, e ainda não usado.
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'community-photos' and o.name = post_photo_path
        and o.owner_id = v_uid::text
    ) or exists (select 1 from public.community_posts p where p.photo_path = post_photo_path) then
      raise exception 'foto não encontrada' using errcode = 'P0002';
    end if;
    v_status := 'in_review'::public.community_content_status;
    v_hold := 'foto';      -- foto só aparece depois de uma pessoa aprovar
  else
    v_hold := private.community_text_verdict(v_body);
    v_status := case when v_hold is null then 'published'::public.community_content_status
                     else 'in_review'::public.community_content_status end;
  end if;

  select c.id into v_consent
    from public.consent_records c
   where c.user_id = v_uid and c.purpose = 'community_publish' and c.revoked_at is null
   order by c.accepted_at desc
   limit 1;

  insert into public.community_posts (author_id, body, photo_path, day_number, status, hold_reason, consent_id, published_at)
  values (v_uid, v_body, post_photo_path, post_day, v_status, v_hold, v_consent,
          case when v_status = 'published' then now() end)
  returning id into v_id;

  if v_status = 'in_review' then
    insert into public.community_moderation_actions (decided_by, kind, post_id, target_user_id)
    values ('automatico', 'auto_hold', v_id, v_uid);
  end if;

  return query select v_id, v_status::text;
end $$;
revoke all on function private.create_community_post(text, text, smallint) from public, anon;
grant execute on function private.create_community_post(text, text, smallint) to authenticated;

create or replace function public.create_community_post(
  post_body text default null, post_photo_path text default null, post_day smallint default null
)
returns table (post_id uuid, status text)
language sql security invoker set search_path = '' as $$
  select * from private.create_community_post(post_body, post_photo_path, post_day);
$$;
revoke all on function public.create_community_post(text, text, smallint) from public, anon;
grant execute on function public.create_community_post(text, text, smallint) to authenticated;

create or replace function private.delete_my_community_post(target_post uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  delete from public.community_posts p where p.id = target_post and p.author_id = (select auth.uid());
  if not found then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
end $$;
revoke all on function private.delete_my_community_post(uuid) from public, anon;
grant execute on function private.delete_my_community_post(uuid) to authenticated;

create or replace function public.delete_my_community_post(target_post uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.delete_my_community_post(target_post);
$$;
revoke all on function public.delete_my_community_post(uuid) from public, anon;
grant execute on function public.delete_my_community_post(uuid) to authenticated;

-- Comentar no post de outra pessoa ("chegar na pessoa"). Mesmo filtro do post.
create or replace function private.create_community_comment(target_post uuid, comment_body text)
returns table (comment_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := private.assert_can_publish();
  v_body text := nullif(trim(comment_body), '');
  v_hold text;
  v_status public.community_content_status;
  v_id uuid;
begin
  if v_body is null or char_length(v_body) > 1000 then
    raise exception 'comentário inválido' using errcode = '22023';
  end if;
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  if (select count(*) from public.community_comments c
      where c.author_id = v_uid and c.created_at > now() - interval '1 day')
     >= private.community_setting('max_comments_per_day')::int then
    raise exception 'limite diário de comentários' using errcode = 'CM003';
  end if;

  v_hold := private.community_text_verdict(v_body);
  v_status := case when v_hold is null then 'published'::public.community_content_status
                     else 'in_review'::public.community_content_status end;

  insert into public.community_comments (post_id, author_id, body, status, hold_reason, published_at)
  values (target_post, v_uid, v_body, v_status, v_hold, case when v_status = 'published' then now() end)
  returning id into v_id;

  if v_status = 'in_review' then
    insert into public.community_moderation_actions (decided_by, kind, comment_id, target_user_id)
    values ('automatico', 'auto_hold', v_id, v_uid);
  end if;

  return query select v_id, v_status::text;
end $$;
revoke all on function private.create_community_comment(uuid, text) from public, anon;
grant execute on function private.create_community_comment(uuid, text) to authenticated;

create or replace function public.create_community_comment(target_post uuid, comment_body text)
returns table (comment_id uuid, status text)
language sql security invoker set search_path = '' as $$
  select * from private.create_community_comment(target_post, comment_body);
$$;
revoke all on function public.create_community_comment(uuid, text) from public, anon;
grant execute on function public.create_community_comment(uuid, text) to authenticated;

create or replace function private.delete_my_community_comment(target_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  delete from public.community_comments c where c.id = target_comment and c.author_id = (select auth.uid());
  if not found then
    raise exception 'comentário não encontrado' using errcode = 'P0002';
  end if;
end $$;
revoke all on function private.delete_my_community_comment(uuid) from public, anon;
grant execute on function private.delete_my_community_comment(uuid) to authenticated;

create or replace function public.delete_my_community_comment(target_comment uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.delete_my_community_comment(target_comment);
$$;
revoke all on function public.delete_my_community_comment(uuid) from public, anon;
grant execute on function public.delete_my_community_comment(uuid) to authenticated;

-- Amém: liga ou desliga, idempotente (toque duplo ou reenvio offline não quebra).
-- Devolve só o MEU novo estado. Nunca um total.
create or replace function private.set_amen(target_post uuid, amen boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if amen is not true then
    delete from public.community_amens am where am.user_id = v_uid and am.post_id = target_post;
    return false;
  end if;
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  insert into public.community_amens (user_id, post_id) values (v_uid, target_post)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_amen(uuid, boolean) from public, anon;
grant execute on function private.set_amen(uuid, boolean) to authenticated;

create or replace function public.set_amen(target_post uuid, amen boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select private.set_amen(target_post, amen);
$$;
revoke all on function public.set_amen(uuid, boolean) from public, anon;
grant execute on function public.set_amen(uuid, boolean) to authenticated;

-- =============================================================================
-- Denunciar e bloquear (sempre a partir do conteúdo: o app não conhece user_id alheio)
-- =============================================================================

-- Denuncia a publicação, o comentário ou a PESSOA que escreveu (report_person).
-- Criança exposta ou "apareço nesta foto" tira o conteúdo do ar NA HORA, antes da
-- análise (00-DECISOES §4). Devolve o id da denúncia (recibo). Idempotente enquanto aberta.
create or replace function private.report_community_content(
  target_post uuid, target_comment uuid, report_person boolean, report_reason text, report_details text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_reason public.community_report_reason;
  v_author uuid;
  v_kind public.community_report_target;
  v_urgent boolean;
  v_hide boolean;
  v_id uuid;
begin
  if num_nonnulls(target_post, target_comment) <> 1 then
    raise exception 'informe a publicação ou o comentário' using errcode = '22023';
  end if;
  if report_details is not null and char_length(report_details) > 500 then
    raise exception 'detalhes longos demais' using errcode = '22023';
  end if;
  begin
    v_reason := report_reason::public.community_report_reason;
  exception when invalid_text_representation then
    raise exception 'motivo inválido' using errcode = '22023';
  end;

  if target_post is not null then
    select p.author_id into v_author from public.community_posts p
     where p.id = target_post and private.can_view_post(p.id, v_uid);
  else
    select c.author_id into v_author from public.community_comments c
     where c.id = target_comment and c.status = 'published'
       and private.can_view_post(c.post_id, v_uid)
       and not private.blocked_between(v_uid, c.author_id);
  end if;
  if v_author is null or v_author = v_uid then
    raise exception 'conteúdo não encontrado' using errcode = 'P0002';
  end if;

  if (select count(*) from public.community_reports r
      where r.reporter_id = v_uid and r.created_at > now() - interval '1 day')
     >= private.community_setting('max_reports_per_day')::int then
    raise exception 'limite diário de denúncias' using errcode = 'CM003';
  end if;

  v_kind := case when report_person is true then 'person'::public.community_report_target
                 when target_post is not null then 'post'::public.community_report_target
                 else 'comment'::public.community_report_target end;
  v_urgent := v_reason in ('crianca_exposta', 'rosto_de_terceiro', 'risco_a_vida');
  v_hide := v_kind <> 'person' and v_reason in ('crianca_exposta', 'rosto_de_terceiro');

  insert into public.community_reports (
    reporter_id, target_kind, post_id, comment_id, reported_user_id, reason, details, urgent, due_at
  ) values (
    v_uid, v_kind, target_post, target_comment, v_author, v_reason, nullif(trim(report_details), ''),
    v_urgent,
    now() + pg_catalog.make_interval(hours => private.community_setting(
      case when v_urgent then 'urgent_report_due_hours' else 'report_due_hours' end)::int)
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- Já existe denúncia aberta minha para este alvo: devolve o mesmo recibo.
    select r.id into v_id from public.community_reports r
     where r.reporter_id = v_uid and r.status = 'open' and r.target_kind = v_kind
       and (case v_kind when 'post' then r.post_id = target_post
                        when 'comment' then r.comment_id = target_comment
                        else r.reported_user_id = v_author end)
     limit 1;
    return v_id;
  end if;

  if v_hide then
    if target_post is not null then
      update public.community_posts p set status = 'in_review', hold_reason = 'denuncia'
       where p.id = target_post and p.status = 'published';
    else
      update public.community_comments c set status = 'in_review', hold_reason = 'denuncia'
       where c.id = target_comment and c.status = 'published';
    end if;
    insert into public.community_moderation_actions (decided_by, kind, post_id, comment_id, target_user_id, report_id, reason)
    values ('automatico', 'urgent_hide', target_post, target_comment, v_author, v_id, v_reason);
  end if;

  return v_id;
end $$;
revoke all on function private.report_community_content(uuid, uuid, boolean, text, text) from public, anon;
grant execute on function private.report_community_content(uuid, uuid, boolean, text, text) to authenticated;

create or replace function public.report_community_content(
  target_post uuid default null, target_comment uuid default null, report_person boolean default false,
  report_reason text default null, report_details text default null
)
returns uuid language sql security invoker set search_path = '' as $$
  select private.report_community_content(target_post, target_comment, report_person, report_reason, report_details);
$$;
revoke all on function public.report_community_content(uuid, uuid, boolean, text, text) from public, anon;
grant execute on function public.report_community_content(uuid, uuid, boolean, text, text) to authenticated;

-- Bloquear quem escreveu. Mesma resposta (void) se o conteúdo não existe ou não é
-- visível: a RPC não vira oráculo de "este post existe?".
create or replace function private.block_community_author(target_post uuid, target_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
  v_other uuid;
begin
  if num_nonnulls(target_post, target_comment) <> 1 then
    raise exception 'informe a publicação ou o comentário' using errcode = '22023';
  end if;
  if target_post is not null then
    select p.author_id into v_other from public.community_posts p
     where p.id = target_post and private.can_view_post(p.id, v_uid);
  else
    select c.author_id into v_other from public.community_comments c
     where c.id = target_comment and c.status = 'published' and private.can_view_post(c.post_id, v_uid);
  end if;
  if v_other is null or v_other = v_uid then
    return;
  end if;
  insert into public.community_blocks (blocker_id, blocked_id) values (v_uid, v_other)
  on conflict do nothing;
end $$;
revoke all on function private.block_community_author(uuid, uuid) from public, anon;
grant execute on function private.block_community_author(uuid, uuid) to authenticated;

create or replace function public.block_community_author(target_post uuid default null, target_comment uuid default null)
returns void language sql security invoker set search_path = '' as $$
  select private.block_community_author(target_post, target_comment);
$$;
revoke all on function public.block_community_author(uuid, uuid) from public, anon;
grant execute on function public.block_community_author(uuid, uuid) to authenticated;

create or replace function private.unblock_community_member(target_block uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'sessão obrigatória' using errcode = '42501';
  end if;
  delete from public.community_blocks bl where bl.id = target_block and bl.blocker_id = (select auth.uid());
end $$;
revoke all on function private.unblock_community_member(uuid) from public, anon;
grant execute on function private.unblock_community_member(uuid) to authenticated;

create or replace function public.unblock_community_member(target_block uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.unblock_community_member(target_block);
$$;
revoke all on function public.unblock_community_member(uuid) from public, anon;
grant execute on function public.unblock_community_member(uuid) to authenticated;

-- Quem EU bloqueei (para desbloquear). Quem me bloqueou nunca aparece.
create or replace function private.my_community_blocks()
returns table (block_id uuid, display_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select bl.id, coalesce(cp.display_name, 'Participante'), bl.created_at
  from public.community_blocks bl
  left join public.community_profiles cp on cp.user_id = bl.blocked_id
  where bl.blocker_id = (select auth.uid())
  order by bl.created_at desc;
$$;
revoke all on function private.my_community_blocks() from public, anon;
grant execute on function private.my_community_blocks() to authenticated;

create or replace function public.my_community_blocks()
returns table (block_id uuid, display_name text, created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_community_blocks();
$$;
revoke all on function public.my_community_blocks() from public, anon;
grant execute on function public.my_community_blocks() to authenticated;

-- =============================================================================
-- Moderação (moderador da comunidade ou admin). Usada pela página web interna.
-- =============================================================================

-- Fila: tudo em análise + tudo publicado com denúncia aberta. Urgente primeiro,
-- depois o prazo mais apertado.
create or replace function private.community_moderation_queue()
returns table (
  item_kind text, item_id uuid, post_id uuid, body text, photo_path text, hold_reason text,
  item_status text, author_id uuid, author_name text, author_status text, created_at timestamptz,
  open_reports int, urgent boolean, due_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with open_r as (
    select r.target_kind, coalesce(r.comment_id, r.post_id) as target_id,
           count(*)::int as n, bool_or(r.urgent) as urgent, min(r.due_at) as due
    from public.community_reports r
    where r.status = 'open' and r.target_kind in ('post', 'comment')
    group by r.target_kind, coalesce(r.comment_id, r.post_id)
  ),
  items as (
    select 'post'::text as kind, p.id as item_id, p.id as post_id, p.body, p.photo_path, p.hold_reason,
           p.status, p.author_id, p.created_at
    from public.community_posts p
    where p.status = 'in_review'
       or exists (select 1 from open_r o where o.target_kind = 'post' and o.target_id = p.id)
    union all
    select 'comment'::text, c.id, c.post_id, c.body, null::text, c.hold_reason,
           c.status, c.author_id, c.created_at
    from public.community_comments c
    where c.status = 'in_review'
       or exists (select 1 from open_r o where o.target_kind = 'comment' and o.target_id = c.id)
  )
  select i.kind, i.item_id, i.post_id, i.body, i.photo_path, i.hold_reason, i.status::text,
         i.author_id, a.display_name, a.status::text, i.created_at,
         coalesce(o.n, 0), coalesce(o.urgent, false), o.due
  from items i
  left join public.community_profiles a on a.user_id = i.author_id
  left join open_r o on o.target_kind::text = i.kind and o.target_id = i.item_id
  where (select private.is_community_moderator())
  order by coalesce(o.urgent, false) desc, coalesce(o.due, i.created_at) asc
  limit 200;
$$;
revoke all on function private.community_moderation_queue() from public, anon;
grant execute on function private.community_moderation_queue() to authenticated;

create or replace function public.community_moderation_queue()
returns table (
  item_kind text, item_id uuid, post_id uuid, body text, photo_path text, hold_reason text,
  item_status text, author_id uuid, author_name text, author_status text, created_at timestamptz,
  open_reports int, urgent boolean, due_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_moderation_queue();
$$;
revoke all on function public.community_moderation_queue() from public, anon;
grant execute on function public.community_moderation_queue() to authenticated;

-- Denúncias abertas (inclusive de pessoa), para quem modera.
create or replace function private.community_open_reports()
returns table (
  report_id uuid, target_kind text, post_id uuid, comment_id uuid, reported_user_id uuid,
  reported_name text, reason text, details text, urgent boolean, created_at timestamptz, due_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.target_kind::text, r.post_id, r.comment_id, r.reported_user_id,
         cp.display_name, r.reason::text, r.details, r.urgent, r.created_at, r.due_at
  from public.community_reports r
  left join public.community_profiles cp on cp.user_id = r.reported_user_id
  where (select private.is_community_moderator()) and r.status = 'open'
  order by r.urgent desc, r.due_at asc
  limit 500;
$$;
revoke all on function private.community_open_reports() from public, anon;
grant execute on function private.community_open_reports() to authenticated;

create or replace function public.community_open_reports()
returns table (
  report_id uuid, target_kind text, post_id uuid, comment_id uuid, reported_user_id uuid,
  reported_name text, reason text, details text, urgent boolean, created_at timestamptz, due_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_open_reports();
$$;
revoke all on function public.community_open_reports() from public, anon;
grant execute on function public.community_open_reports() to authenticated;

-- Decisão sobre um post: approve | reject | remove | restore.
-- Recusar e remover exigem motivo (o autor é avisado com ele) e apagam a foto.
create or replace function private.moderate_community_post(
  target_post uuid, decision text, decision_reason text, note_for_author text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_author uuid;
  v_status public.community_content_status;
  v_has_body boolean;
  v_reason public.community_report_reason;
begin
  if v_uid is null or not private.is_community_moderator() then
    raise exception 'apenas moderação' using errcode = '42501';
  end if;
  if note_for_author is not null and char_length(note_for_author) > 500 then
    raise exception 'nota longa demais' using errcode = '22023';
  end if;
  begin
    v_reason := decision_reason::public.community_report_reason;
  exception when invalid_text_representation then
    raise exception 'motivo inválido' using errcode = '22023';
  end;
  if decision in ('reject', 'remove') and v_reason is null then
    raise exception 'recusar ou remover exige motivo' using errcode = '22023';
  end if;

  select p.author_id, p.status, p.body is not null into v_author, v_status, v_has_body
    from public.community_posts p where p.id = target_post for update;
  if not found then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  if v_author = v_uid then
    raise exception 'ninguém modera o próprio conteúdo' using errcode = '42501';
  end if;

  if decision = 'approve' and v_status = 'in_review' then
    update public.community_posts p
       set status = 'published', published_at = coalesce(p.published_at, now()),
           hold_reason = null, decided_at = now()
     where p.id = target_post;
    update public.community_reports r set status = 'dismissed', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'reject' and v_status = 'in_review' then
    update public.community_posts p
       set status = 'not_published', photo_path = null, decided_at = now()
     where p.id = target_post;
    update public.community_reports r set status = 'actioned', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'remove' and v_status in ('published', 'in_review') then
    update public.community_posts p
       set status = 'removed', photo_path = null, decided_at = now()
     where p.id = target_post;
    update public.community_reports r set status = 'actioned', resolved_at = now(), resolved_by = v_uid
     where r.post_id = target_post and r.target_kind = 'post' and r.status = 'open';
  elsif decision = 'restore' and v_status in ('removed', 'not_published') then
    -- A foto já foi apagada; só volta se sobrou texto.
    if not v_has_body then
      raise exception 'não há mais conteúdo para restaurar' using errcode = '22023';
    end if;
    update public.community_posts p
       set status = 'published', published_at = coalesce(p.published_at, now()),
           hold_reason = null, decided_at = now()
     where p.id = target_post;
  else
    raise exception 'decisão inválida para o estado atual' using errcode = '22023';
  end if;

  insert into public.community_moderation_actions (actor_id, decided_by, kind, post_id, target_user_id, reason, note_for_author)
  values (v_uid, 'pessoa', decision::public.community_moderation_kind, target_post, v_author, v_reason,
          nullif(trim(note_for_author), ''));
end $$;
revoke all on function private.moderate_community_post(uuid, text, text, text) from public, anon;
grant execute on function private.moderate_community_post(uuid, text, text, text) to authenticated;

create or replace function public.moderate_community_post(
  target_post uuid, decision text, decision_reason text default null, note_for_author text default null
)
returns void language sql security invoker set search_path = '' as $$
  select private.moderate_community_post(target_post, decision, decision_reason, note_for_author);
$$;
revoke all on function public.moderate_community_post(uuid, text, text, text) from public, anon;
grant execute on function public.moderate_community_post(uuid, text, text, text) to authenticated;

create or replace function private.moderate_community_comment(
  target_comment uuid, decision text, decision_reason text, note_for_author text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_author uuid;
  v_status public.community_content_status;
  v_reason public.community_report_reason;
begin
  if v_uid is null or not private.is_community_moderator() then
    raise exception 'apenas moderação' using errcode = '42501';
  end if;
  if note_for_author is not null and char_length(note_for_author) > 500 then
    raise exception 'nota longa demais' using errcode = '22023';
  end if;
  begin
    v_reason := decision_reason::public.community_report_reason;
  exception when invalid_text_representation then
    raise exception 'motivo inválido' using errcode = '22023';
  end;
  if decision in ('reject', 'remove') and v_reason is null then
    raise exception 'recusar ou remover exige motivo' using errcode = '22023';
  end if;

  select c.author_id, c.status into v_author, v_status
    from public.community_comments c where c.id = target_comment for update;
  if not found then
    raise exception 'comentário não encontrado' using errcode = 'P0002';
  end if;
  if v_author = v_uid then
    raise exception 'ninguém modera o próprio conteúdo' using errcode = '42501';
  end if;

  if decision in ('approve', 'restore') and v_status in ('in_review', 'removed', 'not_published')
     and (decision = 'approve') = (v_status = 'in_review') then
    update public.community_comments c
       set status = 'published', published_at = coalesce(c.published_at, now()),
           hold_reason = null, decided_at = now()
     where c.id = target_comment;
    update public.community_reports r set status = 'dismissed', resolved_at = now(), resolved_by = v_uid
     where r.comment_id = target_comment and r.target_kind = 'comment' and r.status = 'open';
  elsif (decision = 'reject' and v_status = 'in_review')
     or (decision = 'remove' and v_status in ('published', 'in_review')) then
    update public.community_comments c
       set status = case when decision = 'reject' then 'not_published'::public.community_content_status
                         else 'removed'::public.community_content_status end,
           decided_at = now()
     where c.id = target_comment;
    update public.community_reports r set status = 'actioned', resolved_at = now(), resolved_by = v_uid
     where r.comment_id = target_comment and r.target_kind = 'comment' and r.status = 'open';
  else
    raise exception 'decisão inválida para o estado atual' using errcode = '22023';
  end if;

  insert into public.community_moderation_actions (actor_id, decided_by, kind, comment_id, target_user_id, reason, note_for_author)
  values (v_uid, 'pessoa', decision::public.community_moderation_kind, target_comment, v_author, v_reason,
          nullif(trim(note_for_author), ''));
end $$;
revoke all on function private.moderate_community_comment(uuid, text, text, text) from public, anon;
grant execute on function private.moderate_community_comment(uuid, text, text, text) to authenticated;

create or replace function public.moderate_community_comment(
  target_comment uuid, decision text, decision_reason text default null, note_for_author text default null
)
returns void language sql security invoker set search_path = '' as $$
  select private.moderate_community_comment(target_comment, decision, decision_reason, note_for_author);
$$;
revoke all on function public.moderate_community_comment(uuid, text, text, text) from public, anon;
grant execute on function public.moderate_community_comment(uuid, text, text, text) to authenticated;

-- Fecha uma denúncia sem decidir o conteúdo (ex.: denúncia de pessoa já tratada).
create or replace function private.resolve_community_report(target_report uuid, outcome text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.is_community_moderator() then
    raise exception 'apenas moderação' using errcode = '42501';
  end if;
  if outcome not in ('actioned', 'dismissed') then
    raise exception 'resultado inválido' using errcode = '22023';
  end if;
  update public.community_reports r
     set status = outcome::public.community_report_status, resolved_at = now(), resolved_by = v_uid
   where r.id = target_report and r.status = 'open';
  if not found then
    raise exception 'denúncia aberta não encontrada' using errcode = 'P0002';
  end if;
  insert into public.community_moderation_actions (actor_id, decided_by, kind, report_id)
  values (v_uid, 'pessoa',
          case when outcome = 'actioned' then 'action_report'::public.community_moderation_kind
               else 'dismiss_report'::public.community_moderation_kind end,
          target_report);
end $$;
revoke all on function private.resolve_community_report(uuid, text) from public, anon;
grant execute on function private.resolve_community_report(uuid, text) to authenticated;

create or replace function public.resolve_community_report(target_report uuid, outcome text)
returns void language sql security invoker set search_path = '' as $$
  select private.resolve_community_report(target_report, outcome);
$$;
revoke all on function public.resolve_community_report(uuid, text) from public, anon;
grant execute on function public.resolve_community_report(uuid, text) to authenticated;

-- Suspender, remover ou reativar alguém na comunidade. O conteúdo de quem não está
-- ativo some do feed (a regra de visibilidade exige autor ativo).
create or replace function private.set_community_member_status(
  target_user uuid, new_status text, decision_reason text, note_for_author text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_reason public.community_report_reason;
  v_kind public.community_moderation_kind;
begin
  if v_uid is null or not private.is_community_moderator() then
    raise exception 'apenas moderação' using errcode = '42501';
  end if;
  if target_user = v_uid then
    raise exception 'ninguém modera a si mesmo' using errcode = '42501';
  end if;
  begin
    v_reason := decision_reason::public.community_report_reason;
  exception when invalid_text_representation then
    raise exception 'motivo inválido' using errcode = '22023';
  end;
  v_kind := case new_status
    when 'suspended' then 'suspend_member'::public.community_moderation_kind
    when 'removed'   then 'remove_member'::public.community_moderation_kind
    when 'active'    then 'reinstate_member'::public.community_moderation_kind
  end;
  if v_kind is null then
    raise exception 'estado inválido' using errcode = '22023';
  end if;
  if new_status <> 'active' and v_reason is null then
    raise exception 'suspender ou remover exige motivo' using errcode = '22023';
  end if;
  update public.community_profiles cp set status = new_status::public.community_member_status
   where cp.user_id = target_user;
  if not found then
    raise exception 'participante não encontrado' using errcode = 'P0002';
  end if;
  insert into public.community_moderation_actions (actor_id, decided_by, kind, target_user_id, reason, note_for_author)
  values (v_uid, 'pessoa', v_kind, target_user, v_reason, nullif(trim(note_for_author), ''));
end $$;
revoke all on function private.set_community_member_status(uuid, text, text, text) from public, anon;
grant execute on function private.set_community_member_status(uuid, text, text, text) to authenticated;

create or replace function public.set_community_member_status(
  target_user uuid, new_status text, decision_reason text default null, note_for_author text default null
)
returns void language sql security invoker set search_path = '' as $$
  select private.set_community_member_status(target_user, new_status, decision_reason, note_for_author);
$$;
revoke all on function public.set_community_member_status(uuid, text, text, text) from public, anon;
grant execute on function public.set_community_member_status(uuid, text, text, text) to authenticated;

-- =============================================================================
-- Administração (app_admins): códigos de entrada e moderadores. Tudo auditado.
-- =============================================================================

-- Gera um código de 10 caracteres (≈ 50 bits) sem letras ambíguas, formato XXXXX-XXXXX.
-- O código em claro só aparece AQUI, uma vez; o banco guarda o hash.
create or replace function private.admin_create_invite_code(code_label text, code_max_uses int, valid_days int)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32 símbolos: byte % 32 sem viés
  v_bytes bytea := extensions.gen_random_bytes(10);
  v_raw text := '';
  i int;
begin
  if v_uid is null or not private.is_app_admin() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if valid_days is null or valid_days not between 1 and 120 then
    raise exception 'validade inválida' using errcode = '22023';
  end if;
  if code_max_uses is null or code_max_uses not between 1 and 5000 then
    raise exception 'limite de usos inválido' using errcode = '22023';
  end if;
  if code_label is null or char_length(trim(code_label)) not between 1 and 120 then
    raise exception 'identificação inválida' using errcode = '22023';
  end if;
  for i in 0..9 loop
    v_raw := v_raw || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;
  insert into private.invite_codes (code_sha256, label, created_by, max_uses, expires_at)
  values (encode(extensions.digest(v_raw, 'sha256'), 'hex'), trim(code_label), v_uid, code_max_uses,
          now() + pg_catalog.make_interval(days => valid_days));
  insert into public.admin_audit_log (actor_id, action, meta)
  values (v_uid, 'create_invite_code',
          pg_catalog.jsonb_build_object('label', trim(code_label), 'max_uses', code_max_uses, 'valid_days', valid_days));
  return substr(v_raw, 1, 5) || '-' || substr(v_raw, 6, 5);
end $$;
revoke all on function private.admin_create_invite_code(text, int, int) from public, anon;
grant execute on function private.admin_create_invite_code(text, int, int) to authenticated;

create or replace function public.admin_create_invite_code(code_label text, code_max_uses int, valid_days int)
returns text language sql security invoker set search_path = '' as $$
  select private.admin_create_invite_code(code_label, code_max_uses, valid_days);
$$;
revoke all on function public.admin_create_invite_code(text, int, int) from public, anon;
grant execute on function public.admin_create_invite_code(text, int, int) to authenticated;

-- Revogar NÃO expulsa quem já entrou (decisão pendente da igreja: ver arquitetura).
create or replace function private.admin_revoke_invite_code(target_code uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.is_app_admin() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  update private.invite_codes c set revoked_at = now() where c.id = target_code and c.revoked_at is null;
  if not found then
    raise exception 'código não encontrado' using errcode = 'P0002';
  end if;
  insert into public.admin_audit_log (actor_id, action, meta)
  values (v_uid, 'revoke_invite_code', pg_catalog.jsonb_build_object('code_id', target_code));
end $$;
revoke all on function private.admin_revoke_invite_code(uuid) from public, anon;
grant execute on function private.admin_revoke_invite_code(uuid) to authenticated;

create or replace function public.admin_revoke_invite_code(target_code uuid)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_revoke_invite_code(target_code);
$$;
revoke all on function public.admin_revoke_invite_code(uuid) from public, anon;
grant execute on function public.admin_revoke_invite_code(uuid) to authenticated;

create or replace function private.admin_list_invite_codes()
returns table (
  code_id uuid, label text, uses int, max_uses int, active_members int,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.label, c.uses, c.max_uses,
         (select count(*)::int from public.community_profiles cp
           where cp.invite_code_id = c.id and cp.status = 'active'),
         c.expires_at, c.revoked_at, c.created_at
  from private.invite_codes c
  where (select private.is_app_admin())
  order by c.created_at desc;
$$;
revoke all on function private.admin_list_invite_codes() from public, anon;
grant execute on function private.admin_list_invite_codes() to authenticated;

create or replace function public.admin_list_invite_codes()
returns table (
  code_id uuid, label text, uses int, max_uses int, active_members int,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_list_invite_codes();
$$;
revoke all on function public.admin_list_invite_codes() from public, anon;
grant execute on function public.admin_list_invite_codes() to authenticated;

create or replace function private.admin_set_community_moderator(target_user uuid, make_moderator boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.is_app_admin() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if make_moderator is true then
    insert into public.community_moderators (user_id, granted_by) values (target_user, v_uid)
    on conflict (user_id) do nothing;
  else
    delete from public.community_moderators m where m.user_id = target_user;
  end if;
  insert into public.admin_audit_log (actor_id, action, target_user_id, meta)
  values (v_uid, 'set_community_moderator', target_user,
          pg_catalog.jsonb_build_object('moderator', make_moderator is true));
end $$;
revoke all on function private.admin_set_community_moderator(uuid, boolean) from public, anon;
grant execute on function private.admin_set_community_moderator(uuid, boolean) to authenticated;

create or replace function public.admin_set_community_moderator(target_user uuid, make_moderator boolean)
returns void language sql security invoker set search_path = '' as $$
  select private.admin_set_community_moderator(target_user, make_moderator);
$$;
revoke all on function public.admin_set_community_moderator(uuid, boolean) from public, anon;
grant execute on function public.admin_set_community_moderator(uuid, boolean) to authenticated;

-- =============================================================================
-- Só a chave de serviço (Edge Functions). authenticated NÃO executa.
-- =============================================================================

-- Pega um lote da fila de arquivos a apagar (a Edge Function apaga pela Storage API
-- e confirma). skip locked: duas execuções simultâneas não pegam o mesmo arquivo.
create or replace function private.claim_storage_deletions(max_items int)
returns table (bucket_id text, object_name text)
language sql security definer set search_path = '' as $$
  update private.storage_deletion_queue q
     set attempts = q.attempts + 1, last_try_at = now()
   where (q.bucket_id, q.object_name) in (
     select q2.bucket_id, q2.object_name from private.storage_deletion_queue q2
      where q2.last_try_at is null or q2.last_try_at < now() - interval '10 minutes'
      order by q2.enqueued_at
      limit least(greatest(coalesce(max_items, 50), 1), 500)
      for update skip locked
   )
  returning q.bucket_id, q.object_name;
$$;
revoke all on function private.claim_storage_deletions(int) from public, anon, authenticated;
grant execute on function private.claim_storage_deletions(int) to service_role;

create or replace function public.claim_storage_deletions(max_items int default 50)
returns table (bucket_id text, object_name text)
language sql security invoker set search_path = '' as $$
  select * from private.claim_storage_deletions(max_items);
$$;
revoke all on function public.claim_storage_deletions(int) from public, anon, authenticated;
grant execute on function public.claim_storage_deletions(int) to service_role;

create or replace function private.confirm_storage_deletion(target_bucket text, target_object text)
returns void language sql security definer set search_path = '' as $$
  delete from private.storage_deletion_queue q
   where q.bucket_id = target_bucket and q.object_name = target_object;
$$;
revoke all on function private.confirm_storage_deletion(text, text) from public, anon, authenticated;
grant execute on function private.confirm_storage_deletion(text, text) to service_role;

create or replace function public.confirm_storage_deletion(target_bucket text, target_object text)
returns void language sql security invoker set search_path = '' as $$
  select private.confirm_storage_deletion(target_bucket, target_object);
$$;
revoke all on function public.confirm_storage_deletion(text, text) from public, anon, authenticated;
grant execute on function public.confirm_storage_deletion(text, text) to service_role;
