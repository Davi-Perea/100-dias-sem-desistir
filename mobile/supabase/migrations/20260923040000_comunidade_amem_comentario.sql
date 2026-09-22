-- =============================================================================
-- COMUNIDADE ("Juntos") — Amém em comentário (pedido do fundador de 2026-09-23:
-- "tem que dar pra curtir tudo")
--
-- EXECUTADO em 2026-09-23 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase db reset && supabase test db
--
-- O Amém no comentário segue as MESMAS regras do Amém no post (F3,
-- 20260922180000_comunidade_diario.sql):
--   * um por pessoa por comentário; a tabela é fechada (RLS sem policy: nem a
--     própria linha é lida direto; tudo passa pelas funções abaixo);
--   * contagem visível, nunca o user_id de ninguém;
--   * bloqueio nos dois sentidos: não dá Amém em comentário de quem tem bloqueio
--     comigo, e quem tem bloqueio comigo não entra no número que EU vejo;
--   * marcar exige o consentimento vigente (LGPD art. 11, assert_consents);
--     desmarcar continua livre (só assert_member);
--   * só comentário PUBLICADO, de autor ativo, num post que eu posso ver
--     (private.can_view_post: público, bloqueio e ministério).
-- Sair da comunidade / "Apagar tudo o que publiquei" / exclusão de conta apagam
-- os Amém da pessoa também aqui (purge_community_member e cascade de auth.users).
--
-- Sem rostinhos no comentário (o cartão do post já tem): só o número.
-- Sem aviso na Atividade (F8) para Amém em comentário: fica para decisão de produto.
-- =============================================================================

create table public.community_comment_amens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index community_comment_amens_comment_idx on public.community_comment_amens (comment_id);

alter table public.community_comment_amens enable row level security;
revoke all on public.community_comment_amens from anon, authenticated;

-- Comentário em que o leitor pode dizer Amém (e cujo número ele vê).
create or replace function private.can_amen_comment(target_comment uuid, viewer uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select viewer is not null
     and exists (
       select 1 from public.community_comments c
       join public.community_profiles a on a.user_id = c.author_id and a.status = 'active'
       where c.id = target_comment
         and c.status = 'published'
         and not private.blocked_between(viewer, c.author_id)
         and private.can_view_post(c.post_id, viewer)
     );
$$;
revoke all on function private.can_amen_comment(uuid, uuid) from public, anon, authenticated;

create or replace function private.set_comment_amen(target_comment uuid, amen boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.assert_member();
begin
  if amen is not true then
    delete from public.community_comment_amens ca where ca.user_id = v_uid and ca.comment_id = target_comment;
    return false;
  end if;
  perform private.assert_consents();
  if not private.can_amen_comment(target_comment, v_uid) then
    raise exception 'comentário não encontrado' using errcode = 'P0002';
  end if;
  insert into public.community_comment_amens (user_id, comment_id) values (v_uid, target_comment)
  on conflict do nothing;
  return true;
end $$;
revoke all on function private.set_comment_amen(uuid, boolean) from public, anon;
grant execute on function private.set_comment_amen(uuid, boolean) to authenticated;

create or replace function public.set_comment_amen(target_comment uuid, amen boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select private.set_comment_amen(target_comment, amen);
$$;
revoke all on function public.set_comment_amen(uuid, boolean) from public, anon;
grant execute on function public.set_comment_amen(uuid, boolean) to authenticated;

-- Número e o meu Amém de cada comentário de um post, do ponto de vista de quem lê.
-- Mesmo recorte de community_post_comments (os meus em qualquer estado; os dos
-- outros só publicados, de autor ativo, sem bloqueio). Separada daquela para não
-- mudar o formato que o app já lê: o app junta as duas por comment_id.
create or replace function private.community_comment_amens(target_post uuid)
returns table (comment_id uuid, amen_count int, i_said_amen boolean)
language sql stable security definer set search_path = '' as $$
  select c.id,
         (select count(*)::int
            from public.community_comment_amens ca
            join public.community_profiles ap on ap.user_id = ca.user_id and ap.status = 'active'
           where ca.comment_id = c.id
             and not private.blocked_between((select auth.uid()), ca.user_id)),
         exists (
           select 1 from public.community_comment_amens ca
           where ca.comment_id = c.id and ca.user_id = (select auth.uid())
         )
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
revoke all on function private.community_comment_amens(uuid) from public, anon;
grant execute on function private.community_comment_amens(uuid) to authenticated;

create or replace function public.community_comment_amens(target_post uuid)
returns table (comment_id uuid, amen_count int, i_said_amen boolean)
language sql stable security invoker set search_path = '' as $$
  select * from private.community_comment_amens(target_post);
$$;
revoke all on function public.community_comment_amens(uuid) from public, anon;
grant execute on function public.community_comment_amens(uuid) to authenticated;

-- Sair / revogar / exclusão: igual a 20260922120000_comunidade_perfil_v2.sql, mais
-- os Amém da pessoa em comentários (os dos outros nos comentários DELA saem pelo
-- cascade de community_comments).
create or replace function private.purge_community_member(target uuid, drop_profile boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.community_posts    p  where p.author_id = target;   -- fotos vão para a fila
  delete from public.community_comments c  where c.author_id = target;
  delete from public.community_amens    am where am.user_id  = target;
  delete from public.community_comment_amens ca where ca.user_id = target;
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
