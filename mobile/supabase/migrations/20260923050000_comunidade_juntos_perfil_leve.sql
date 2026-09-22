-- =============================================================================
-- Juntos (2026-09-23): para participar bastam nome e 16+ declarado.
-- Foto de perfil e ministério deixam de ser obrigatórios (decisão do fundador,
-- entrada direta no feed). Continuam as outras travas: membro ativo,
-- consentimento (LGPD art. 11) e aceite das regras vigentes (assert_consents).
-- EXECUTADO no PGlite local (mobile/scripts/sql/run-supabase-sql.mjs). Ainda NÃO EXECUTADO no Supabase real.
-- =============================================================================

create or replace function private.community_profile_complete(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_profiles cp
    where cp.user_id = target
      and cp.display_name is not null
      and cp.adult_attested_at is not null
  );
$$;
revoke all on function private.community_profile_complete(uuid) from public, anon, authenticated;

create or replace function private.assert_can_publish()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_consents();
begin
  if not private.community_profile_complete(v_uid) then
    raise exception 'diga o seu nome e confirme 16 anos ou mais para participar'
      using errcode = 'CM007';
  end if;
  return v_uid;
end $$;
revoke all on function private.assert_can_publish() from public, anon, authenticated;

-- Revisão final (2026-09-23): o Amém do post mostra o NOME de quem deu
-- (private.amen_faces_for, os rostinhos). É exposição, então marcar Amém passa
-- a exigir o mesmo que publicar: consentimento + regras + nome + 16+
-- (assert_can_publish), como a tela única de aceite já pede no app. O Amém de
-- comentário segue a mesma regra, para a trava do servidor ser uma só.
-- Desmarcar continua livre (só assert_member): a pessoa sempre pode retirar.
create or replace function private.set_amen(target_post uuid, amen boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if amen is not true then
    delete from public.community_amens am where am.user_id = v_uid and am.post_id = target_post;
    return false;
  end if;
  perform private.assert_can_publish();
  if not private.can_view_post(target_post, v_uid) then
    raise exception 'publicação não encontrada' using errcode = 'P0002';
  end if;
  insert into public.community_amens (user_id, post_id) values (v_uid, target_post)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_amen(uuid, boolean) from public, anon;
grant execute on function private.set_amen(uuid, boolean) to authenticated;

create or replace function private.set_comment_amen(target_comment uuid, amen boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if amen is not true then
    delete from public.community_comment_amens ca where ca.user_id = v_uid and ca.comment_id = target_comment;
    return false;
  end if;
  perform private.assert_can_publish();
  if not private.can_amen_comment(target_comment, v_uid) then
    raise exception 'comentário não encontrado' using errcode = 'P0002';
  end if;
  insert into public.community_comment_amens (user_id, comment_id) values (v_uid, target_comment)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_comment_amen(uuid, boolean) from public, anon;
grant execute on function private.set_comment_amen(uuid, boolean) to authenticated;
