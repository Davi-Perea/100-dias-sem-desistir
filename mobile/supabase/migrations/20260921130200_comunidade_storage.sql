-- =============================================================================
-- COMUNIDADE (V2) — 3/3: bucket de fotos
--
-- EXECUTADO em 2026-09-21 num Postgres local (PGlite, mobile/scripts/sql/run-supabase-sql.mjs): passa.
-- Ainda NÃO EXECUTADO no Supabase real (sem Docker/CLI nesta máquina): o primeiro db reset continua obrigatório.
-- Rodar com: supabase db reset && supabase test db
--
-- Bucket PRIVADO: todo download passa pela RLS de storage.objects, só com JWT ou
-- URL assinada (curta, 1 h, gerada pelo app em lote). Em bucket público a foto de
-- um post em análise ou recusado ficaria acessível a quem tivesse a URL, e a
-- aprovação humana da foto perderia o sentido.
--
-- Nome do arquivo: '<uuid aleatório>.jpg', sem user_id (o caminho aparece na URL).
-- O app reencoda no aparelho (≤ 1600 px, JPEG) e confere que não sobrou EXIF/GPS
-- antes de subir (mobile/src/community/photos.ts). A moderação olha de novo.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-photos', 'community-photos', false, 1572864, array['image/jpeg'])  -- 1,5 MB
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Arquivo já ligado a um post? (Apagar o arquivo de um post publicado deixaria o post
-- quebrado; para isso existe delete_my_community_post, que põe a foto na fila.)
create or replace function private.community_photo_in_use(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_posts p where p.photo_path = object_name);
$$;
revoke all on function private.community_photo_in_use(text) from public, anon;
grant execute on function private.community_photo_in_use(text) to authenticated;

-- Upload: só quem pode publicar agora (membro ativo, conta permanente, consentimentos
-- vigentes). O Storage grava owner_id = sub do JWT. Sem UPDATE: foto não é trocável
-- depois de enviada (evita trocar a imagem depois de aprovada).
create policy "comunidade: subo foto se posso publicar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (select private.can_publish())
  );

-- Ler / gerar URL assinada: o dono do arquivo; quem pode ver o post publicado (sem
-- bloqueio entre os dois); e a moderação (para aprovar foto em análise).
create policy "comunidade: vejo foto que posso ver" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'community-photos'
    and (
      owner_id = (select auth.uid())::text
      or private.can_view_community_photo(name)
    )
  );

-- Apagar: só o dono, e só arquivo solto (upload que não virou post).
create policy "comunidade: apago minha foto solta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'community-photos'
    and owner_id = (select auth.uid())::text
    and not private.community_photo_in_use(name)
  );
