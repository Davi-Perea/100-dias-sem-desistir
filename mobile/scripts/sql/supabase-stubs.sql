-- =============================================================================
-- STUBS MÍNIMOS DO SUPABASE para rodar as migrations num Postgres local (PGlite).
-- NÃO é migration e NÃO vai para o projeto hospedado: lá tudo isto já existe.
--
-- Reproduz só o que as migrations e os testes usam, com a MESMA semântica de
-- privilégio do Supabase (o que importa para as invariantes de segurança):
--   * papéis anon / authenticated / service_role (service_role com BYPASSRLS, sem superusuário);
--   * grants padrão do Supabase em public (tudo para anon/authenticated/service_role
--     em tabela, função e sequência novas: é isso que as migrations precisam revogar);
--   * auth.users + auth.uid() / auth.jwt() / auth.role() lendo request.jwt.claims;
--   * storage.buckets / storage.objects (RLS ligada, grants do Supabase) + storage.foldername();
--   * vault.decrypted_secrets vazio e net.http_post (pg_net não existe no PGlite).
-- Fonte das definições: supabase/postgres (migrations/db/init-scripts e auth/storage),
-- lidas em 2026-09-21; conferir de novo se o harness divergir do `supabase test db`.
-- =============================================================================

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- O "postgres" do Supabase NÃO é superusuário (quem é: supabase_admin). Ele tem
-- BYPASSRLS, é membro de anon/authenticated/service_role e é dono do que as
-- migrations criam. Aqui ele se chama supa_postgres (o postgres do PGlite é o
-- superusuário de bootstrap e não perde o atributo). O harness aplica as
-- migrations e roda os testes CONECTADO como supa_postgres, para que funções
-- SECURITY DEFINER tenham os mesmos limites de privilégio do projeto real.
create role supa_postgres login createrole bypassrls;
grant anon, authenticated, service_role to supa_postgres;
grant create on database postgres to supa_postgres;
alter schema public owner to supa_postgres;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role, supa_postgres;
-- No Supabase o pgcrypto já vem instalado em extensions.
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role supa_postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role supa_postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role supa_postgres in schema public grant all on sequences to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- auth
-- ---------------------------------------------------------------------------
create schema auth;
grant usage on schema auth to anon, authenticated, service_role, supa_postgres;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_anonymous       boolean not null default false,
  created_at         timestamptz not null default now()
);
grant all on auth.users to service_role, supa_postgres;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb;
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text;
$$;
grant execute on function auth.jwt(), auth.uid(), auth.role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- storage
-- ---------------------------------------------------------------------------
create schema storage;
grant usage on schema storage to anon, authenticated, service_role, supa_postgres;

create table storage.buckets (
  id                 text primary key,
  name               text not null unique,
  owner              uuid,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets(id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role, supa_postgres;
-- As tabelas do Storage são do supabase_storage_admin. No projeto hospedado o
-- postgres cria policy em storage.objects (é o caminho documentado) mas não faz
-- ALTER TABLE nela ("must be owner of table objects", supabase/cli#96, visto em
-- 2026-09-21). Aqui a posse é modelada por pertencimento ao papel dono. INFERÊNCIA:
-- o harness aceita um ALTER TABLE em storage.objects que o Supabase recusaria;
-- nenhuma migration nossa faz isso.
create role supabase_storage_admin nologin noinherit;
grant usage, create on schema storage to supabase_storage_admin;
alter table storage.buckets owner to supabase_storage_admin;
alter table storage.objects owner to supabase_storage_admin;
grant supabase_storage_admin to supa_postgres;

create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- vault (vazio: sem segredos, community_call_function não chama nada) e pg_net
-- ---------------------------------------------------------------------------
create schema vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);

create schema net;
create table net.http_request_log (
  id bigserial primary key, url text, body jsonb, headers jsonb, created_at timestamptz default now()
);
create function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds int default 5000
) returns bigint language sql as $$
  insert into net.http_request_log (url, body, headers) values (url, body, headers) returning id;
$$;
grant usage on schema vault, net to supa_postgres;
grant select on vault.decrypted_secrets to supa_postgres;
grant all on net.http_request_log to supa_postgres;
grant usage on sequence net.http_request_log_id_seq to supa_postgres;
grant execute on function net.http_post(text, jsonb, jsonb, jsonb, int) to supa_postgres;
