-- =============================================================================
-- COMUNIDADE (V2) — 4/4: o que as Edge Functions precisam do banco
--
-- NÃO EXECUTADO: não há banco nem Supabase CLI nesta máquina (2026-09-21).
-- Rodar com: supabase db reset && supabase test db
--
-- Edge Functions (mobile/supabase/functions/): delete-account, drain-storage-deletions
-- e moderate-text. Passo a passo de deploy: docs/technical/COMUNIDADE_V2_DEPLOY.md.
--
-- Padrão igual ao das migrations 1–3: implementação SECURITY DEFINER em `private`
-- com search_path = '' e invólucro SECURITY INVOKER em `public` com o mesmo nome.
--   * service_*  → SÓ a chave de serviço (as Edge Functions). authenticated NÃO executa.
--   * admin_*    → administradores do app (app_admins), auditado em admin_audit_log.
-- Nenhuma tabela nova, nenhuma policy nova, nenhum GRANT de tabela para o app.
-- =============================================================================

-- pg_net: o banco chama as Edge Functions (segunda passada do filtro, cron).
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Lista de termos: de onde veio cada termo. 'base' = lista versionada da Edge
-- Function moderate-text (sincronizada por ela); 'igreja' = acrescentado pela
-- igreja (admin_set_filter_term). A sincronização nunca toca termo da igreja.
-- ---------------------------------------------------------------------------
alter table private.community_filter_terms
  add column if not exists source text not null default 'igreja' check (source in ('igreja', 'base'));

-- =============================================================================
-- Chamada do banco para uma Edge Function (pg_net, assíncrona).
-- A URL das funções e o segredo ficam no Vault (nunca em migration):
--   community_functions_url  = https://<ref>.supabase.co/functions/v1
--   community_cron_secret    = o mesmo valor do segredo COMMUNITY_CRON_SECRET
-- Sem os dois segredos, não chama nada. Qualquer erro é engolido: publicar nunca
-- pode falhar porque a função está fora do ar.
-- =============================================================================
create or replace function private.community_call_function(fn_name text, payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
  v_request bigint;
begin
  if fn_name is null or fn_name !~ '^[a-z0-9-]{1,63}$' then
    return null;
  end if;
  select ds.decrypted_secret into v_url
    from vault.decrypted_secrets ds where ds.name = 'community_functions_url';
  select ds.decrypted_secret into v_secret
    from vault.decrypted_secrets ds where ds.name = 'community_cron_secret';
  if v_url is null or v_secret is null or char_length(v_secret) < 32 then
    return null;
  end if;
  select net.http_post(
    url := rtrim(v_url, '/') || '/' || fn_name,
    body := coalesce(payload, '{}'::jsonb),
    headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 5000
  ) into v_request;
  return v_request;
exception when others then
  raise warning 'community_call_function(%) falhou: %', fn_name, sqlstate;
  return null;
end $$;
revoke all on function private.community_call_function(text, jsonb) from public, anon, authenticated;

-- Segunda passada do filtro: texto que acabou de aparecer vai para moderate-text,
-- que pega disfarces (letra repetida, número no lugar de letra, letras separadas)
-- e, se pegar, devolve para "Em análise". Manda SÓ o tipo e o id, nunca o texto.
create or replace function private.community_request_text_recheck()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.community_call_function(
    'moderate-text',
    pg_catalog.jsonb_build_object('action', 'recheck', 'kind', tg_argv[0], 'id', new.id)
  );
  return new;
end $$;
revoke all on function private.community_request_text_recheck() from public, anon, authenticated;

create trigger community_posts_text_recheck
  after insert on public.community_posts
  for each row when (new.status = 'published' and new.body is not null)
  execute function private.community_request_text_recheck('post');

create trigger community_comments_text_recheck
  after insert on public.community_comments
  for each row when (new.status = 'published')
  execute function private.community_request_text_recheck('comment');

-- =============================================================================
-- delete-account
-- =============================================================================

-- Apaga tudo o que a pessoa fez na Comunidade (a mesma limpeza de "sair") e põe
-- na fila do Storage TODAS as fotos dela: as de posts e os uploads soltos (que não
-- viraram post e não seriam achados de outro jeito depois da exclusão). Devolve a
-- lista para a Edge Function apagar na hora; o que falhar, o cron termina.
-- Depois disto a Edge Function chama auth.admin.deleteUser (cascata no resto).
create or replace function private.service_prepare_account_deletion(target uuid)
returns table (bucket_id text, object_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_names text[];
begin
  if target is null then
    raise exception 'conta ausente' using errcode = '22023';
  end if;
  select coalesce(pg_catalog.array_agg(distinct x.name), '{}') into v_names
    from (
      select o.name from storage.objects o
       where o.bucket_id = 'community-photos' and o.owner_id = target::text
      union
      select p.photo_path from public.community_posts p
       where p.author_id = target and p.photo_path is not null
    ) x;

  perform private.purge_community_member(target, true);

  insert into private.storage_deletion_queue (bucket_id, object_name)
  select 'community-photos', n from pg_catalog.unnest(v_names) n
  on conflict do nothing;

  return query select 'community-photos'::text, n from pg_catalog.unnest(v_names) n;
end $$;
revoke all on function private.service_prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function private.service_prepare_account_deletion(uuid) to service_role;

create or replace function public.service_prepare_account_deletion(target uuid)
returns table (bucket_id text, object_name text)
language sql security invoker set search_path = '' as $$
  select * from private.service_prepare_account_deletion(target);
$$;
revoke all on function public.service_prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.service_prepare_account_deletion(uuid) to service_role;

-- =============================================================================
-- drain-storage-deletions
-- =============================================================================

-- Uploads soltos (sem post) mais velhos que N horas vão para a fila.
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
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function private.service_enqueue_orphan_photos(int) from public, anon, authenticated;
grant execute on function private.service_enqueue_orphan_photos(int) to service_role;

create or replace function public.service_enqueue_orphan_photos(max_age_hours int default 24)
returns int language sql security invoker set search_path = '' as $$
  select private.service_enqueue_orphan_photos(max_age_hours);
$$;
revoke all on function public.service_enqueue_orphan_photos(int) from public, anon, authenticated;
grant execute on function public.service_enqueue_orphan_photos(int) to service_role;

-- Quais destes arquivos ainda são foto de um post (corrida entre a varredura de
-- órfãos e alguém publicando): a Edge Function tira da fila SEM apagar.
create or replace function private.service_photos_in_use(names text[])
returns setof text language sql stable security definer set search_path = '' as $$
  select distinct p.photo_path
    from public.community_posts p
   where p.photo_path = any (coalesce(names, '{}'));
$$;
revoke all on function private.service_photos_in_use(text[]) from public, anon, authenticated;
grant execute on function private.service_photos_in_use(text[]) to service_role;

create or replace function public.service_photos_in_use(names text[])
returns setof text language sql stable security invoker set search_path = '' as $$
  select * from private.service_photos_in_use(names);
$$;
revoke all on function public.service_photos_in_use(text[]) from public, anon, authenticated;
grant execute on function public.service_photos_in_use(text[]) to service_role;

-- =============================================================================
-- moderate-text
-- =============================================================================

-- Grava a lista base (já normalizada pela Edge Function) como source = 'base':
-- acrescenta o que falta e tira o que saiu da base. Termo da igreja fica como está.
create or replace function private.service_sync_filter_terms(base_terms text[])
returns table (added int, removed int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_clean text[];
  v_added int;
  v_removed int;
begin
  select coalesce(pg_catalog.array_agg(distinct t), '{}') into v_clean
    from pg_catalog.unnest(coalesce(base_terms, '{}')) t
   where t ~ '^[a-z0-9]+( [a-z0-9]+)*$' and char_length(t) between 2 and 80;
  -- Lista vazia apagaria a base inteira: quase sempre é configuração errada.
  if pg_catalog.cardinality(v_clean) = 0 or pg_catalog.cardinality(v_clean) > 5000 then
    raise exception 'lista base vazia ou grande demais' using errcode = '22023';
  end if;
  delete from private.community_filter_terms f
   where f.source = 'base' and not (f.term = any (v_clean));
  get diagnostics v_removed = row_count;
  insert into private.community_filter_terms (term, source)
  select t, 'base' from pg_catalog.unnest(v_clean) t
  on conflict (term) do nothing;
  get diagnostics v_added = row_count;
  return query select v_added, v_removed;
end $$;
revoke all on function private.service_sync_filter_terms(text[]) from public, anon, authenticated;
grant execute on function private.service_sync_filter_terms(text[]) to service_role;

create or replace function public.service_sync_filter_terms(base_terms text[])
returns table (added int, removed int)
language sql security invoker set search_path = '' as $$
  select * from private.service_sync_filter_terms(base_terms);
$$;
revoke all on function public.service_sync_filter_terms(text[]) from public, anon, authenticated;
grant execute on function public.service_sync_filter_terms(text[]) to service_role;

create or replace function private.service_list_filter_terms()
returns setof text language sql stable security definer set search_path = '' as $$
  select f.term from private.community_filter_terms f order by f.term;
$$;
revoke all on function private.service_list_filter_terms() from public, anon, authenticated;
grant execute on function private.service_list_filter_terms() to service_role;

create or replace function public.service_list_filter_terms()
returns setof text language sql stable security invoker set search_path = '' as $$
  select * from private.service_list_filter_terms();
$$;
revoke all on function public.service_list_filter_terms() from public, anon, authenticated;
grant execute on function public.service_list_filter_terms() to service_role;

-- O que o filtro SÍNCRONO diria deste texto (a ação check compara as duas camadas).
create or replace function private.service_text_verdict(input text)
returns text language sql stable security definer set search_path = '' as $$
  select private.community_text_verdict(input);
$$;
revoke all on function private.service_text_verdict(text) from public, anon, authenticated;
grant execute on function private.service_text_verdict(text) to service_role;

create or replace function public.service_text_verdict(input text)
returns text language sql stable security invoker set search_path = '' as $$
  select private.service_text_verdict(input);
$$;
revoke all on function public.service_text_verdict(text) from public, anon, authenticated;
grant execute on function public.service_text_verdict(text) to service_role;

-- Texto e estado de um post ou comentário, para a segunda passada. O gatilho
-- manda só o id; o texto não trafega pelo pg_net.
create or replace function private.service_community_text(content_kind text, target uuid)
returns table (body text, status text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if content_kind = 'post' then
    return query select p.body, p.status::text from public.community_posts p where p.id = target;
  elsif content_kind = 'comment' then
    return query select c.body, c.status::text from public.community_comments c where c.id = target;
  else
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
end $$;
revoke all on function private.service_community_text(text, uuid) from public, anon, authenticated;
grant execute on function private.service_community_text(text, uuid) to service_role;

create or replace function public.service_community_text(content_kind text, target uuid)
returns table (body text, status text)
language sql stable security invoker set search_path = '' as $$
  select * from private.service_community_text(content_kind, target);
$$;
revoke all on function public.service_community_text(text, uuid) from public, anon, authenticated;
grant execute on function public.service_community_text(text, uuid) to service_role;

-- A segunda passada pegou algo: o conteúdo PUBLICADO volta para "Em análise",
-- com decided_by = 'automatico' (o autor vê o motivo em "Minhas publicações").
-- Não mexe em nada que uma pessoa da moderação já tenha decidido depois.
create or replace function private.service_hold_community_text(content_kind text, target uuid, hold text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_author uuid;
begin
  if hold is null or hold not in ('termo', 'link', 'contato') then
    raise exception 'motivo inválido' using errcode = '22023';
  end if;
  if content_kind = 'post' then
    update public.community_posts p
       set status = 'in_review', hold_reason = hold
     where p.id = target and p.status = 'published' and p.decided_at is null
    returning p.author_id into v_author;
    if v_author is null then
      return false;
    end if;
    insert into public.community_moderation_actions (decided_by, kind, post_id, target_user_id)
    values ('automatico', 'auto_hold', target, v_author);
  elsif content_kind = 'comment' then
    update public.community_comments c
       set status = 'in_review', hold_reason = hold
     where c.id = target and c.status = 'published' and c.decided_at is null
    returning c.author_id into v_author;
    if v_author is null then
      return false;
    end if;
    insert into public.community_moderation_actions (decided_by, kind, comment_id, target_user_id)
    values ('automatico', 'auto_hold', target, v_author);
  else
    raise exception 'tipo inválido' using errcode = '22023';
  end if;
  return true;
end $$;
revoke all on function private.service_hold_community_text(text, uuid, text) from public, anon, authenticated;
grant execute on function private.service_hold_community_text(text, uuid, text) to service_role;

create or replace function public.service_hold_community_text(content_kind text, target uuid, hold text)
returns boolean language sql security invoker set search_path = '' as $$
  select private.service_hold_community_text(content_kind, target, hold);
$$;
revoke all on function public.service_hold_community_text(text, uuid, text) from public, anon, authenticated;
grant execute on function public.service_hold_community_text(text, uuid, text) to service_role;

-- =============================================================================
-- Lista da igreja (administradores do app; auditado). Para a página de moderação.
-- =============================================================================
create or replace function private.admin_list_filter_terms()
returns table (term text, source text, added_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.term, f.source, f.added_at
    from private.community_filter_terms f
   where (select private.is_app_admin())
   order by f.term;
$$;
revoke all on function private.admin_list_filter_terms() from public, anon;
grant execute on function private.admin_list_filter_terms() to authenticated;

create or replace function public.admin_list_filter_terms()
returns table (term text, source text, added_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.admin_list_filter_terms();
$$;
revoke all on function public.admin_list_filter_terms() from public, anon;
grant execute on function public.admin_list_filter_terms() to authenticated;

-- Acrescenta (present = true) ou tira (false) um termo da igreja. Devolve o termo
-- na forma em que foi gravado (minúsculas, sem acento, só letras e números).
-- Termo da BASE não se tira por aqui (voltaria na próxima sincronização): para
-- isso existe o segredo FILTER_DISABLED_TERMS da Edge Function.
create or replace function private.admin_set_filter_term(raw_term text, present boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_term text := trim(regexp_replace(private.community_normalize(raw_term), '[^a-z0-9]+', ' ', 'g'));
begin
  if v_uid is null or not private.is_app_admin() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if v_term is null or char_length(v_term) not between 2 and 80 then
    raise exception 'termo inválido' using errcode = '22023';
  end if;
  if present is true then
    insert into private.community_filter_terms (term, source) values (v_term, 'igreja')
    on conflict (term) do update set source = 'igreja';
  else
    if exists (select 1 from private.community_filter_terms f where f.term = v_term and f.source = 'base') then
      raise exception 'termo da lista base: desligue em FILTER_DISABLED_TERMS' using errcode = '22023';
    end if;
    delete from private.community_filter_terms f where f.term = v_term;
  end if;
  insert into public.admin_audit_log (actor_id, action, meta)
  values (v_uid, 'set_filter_term', pg_catalog.jsonb_build_object('term', v_term, 'present', present is true));
  return v_term;
end $$;
revoke all on function private.admin_set_filter_term(text, boolean) from public, anon;
grant execute on function private.admin_set_filter_term(text, boolean) to authenticated;

create or replace function public.admin_set_filter_term(raw_term text, present boolean)
returns text language sql security invoker set search_path = '' as $$
  select private.admin_set_filter_term(raw_term, present);
$$;
revoke all on function public.admin_set_filter_term(text, boolean) from public, anon;
grant execute on function public.admin_set_filter_term(text, boolean) to authenticated;

-- =============================================================================
-- Histórico da moderação (pedido da tela de moderação no app). Só moderação.
-- Mostra O QUE foi decidido, por pessoa ou filtro, com motivo e nota; nunca QUEM
-- da moderação decidiu, nem ids de pessoa. Últimos 30 dias, no máximo 200 linhas.
-- =============================================================================
create or replace function private.community_moderation_history()
returns table (
  action_id bigint, kind text, decided_by text, reason text, note_for_author text,
  created_at timestamptz, target_name text, excerpt text
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.kind::text, a.decided_by, a.reason::text, a.note_for_author, a.created_at,
         tp.display_name,
         left(coalesce(c.body, p.body), 140)
    from public.community_moderation_actions a
    left join public.community_profiles tp on tp.user_id = a.target_user_id
    left join public.community_posts p on p.id = a.post_id
    left join public.community_comments c on c.id = a.comment_id
   where (select private.is_community_moderator())
     and a.created_at > now() - interval '30 days'
   order by a.created_at desc, a.id desc
   limit 200;
$$;
revoke all on function private.community_moderation_history() from public, anon;
grant execute on function private.community_moderation_history() to authenticated;

create or replace function public.community_moderation_history()
returns table (
  action_id bigint, kind text, decided_by text, reason text, note_for_author text,
  created_at timestamptz, target_name text, excerpt text
)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_moderation_history();
$$;
revoke all on function public.community_moderation_history() from public, anon;
grant execute on function public.community_moderation_history() to authenticated;
