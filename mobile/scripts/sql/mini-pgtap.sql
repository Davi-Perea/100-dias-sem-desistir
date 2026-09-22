-- =============================================================================
-- MINI pgTAP — o subconjunto do pgTAP que mobile/supabase/tests usa, para rodar
-- os MESMOS arquivos de teste no PGlite (que não tem a extensão pgtap).
--
-- Semântica copiada do pgTAP 1.3 (https://pgtap.org/documentation.html):
--   plan(n) · ok · is · isnt · matches · throws_ok · lives_ok · is_empty ·
--   results_eq · finish()
-- Cada asserção devolve uma linha TAP ("ok N - ..." / "not ok N - ...").
-- Tudo SECURITY INVOKER: o SQL testado roda com o papel e as claims do momento
-- (set local role / request.jwt.claims), exatamente como no pgTAP.
-- O contador fica em GUC local da transação (cada arquivo roda em begin/rollback).
-- Não é migration; o harness instala como superusuário no schema "tap".
-- =============================================================================
create schema if not exists tap;
grant usage on schema tap to public;

create or replace function tap._next() returns int language sql as $$
  select set_config('tap.n', (coalesce(nullif(current_setting('tap.n', true), ''), '0')::int + 1)::text, true)::int;
$$;

create or replace function tap._emit(passed boolean, descr text, diag text default null)
returns text language plpgsql as $$
declare n int := tap._next();
begin
  if not coalesce(passed, false) then
    perform set_config('tap.failed',
      (coalesce(nullif(current_setting('tap.failed', true), ''), '0')::int + 1)::text, true);
    return 'not ok ' || n || ' - ' || coalesce(descr, '') || coalesce(E'\n# ' || diag, '');
  end if;
  return 'ok ' || n || ' - ' || coalesce(descr, '');
end $$;

create or replace function tap.plan(n int) returns text language sql as $$
  select set_config('tap.plan', n::text, true), set_config('tap.n', '0', true),
         set_config('tap.failed', '0', true);
  select '1..' || n;
$$;

create or replace function tap.ok(passed boolean, descr text default null) returns text
language sql as $$ select tap._emit(passed, descr); $$;

create or replace function tap.is(got anyelement, want anyelement, descr text default null) returns text
language sql as $$
  select tap._emit(got is not distinct from want, descr,
                   'have: ' || coalesce(got::text, 'NULL') || ' / want: ' || coalesce(want::text, 'NULL'));
$$;

create or replace function tap.isnt(got anyelement, want anyelement, descr text default null) returns text
language sql as $$
  select tap._emit(got is distinct from want, descr, 'have: ' || coalesce(got::text, 'NULL'));
$$;

create or replace function tap.matches(got text, pattern text, descr text default null) returns text
language sql as $$
  select tap._emit(got ~ pattern, descr, coalesce(got, 'NULL') || ' !~ ' || pattern);
$$;

create or replace function tap.throws_ok(code text, errcode text, errmsg text default null, descr text default null)
returns text language plpgsql as $$
declare
  v_state text;
  v_msg text;
begin
  begin
    execute code;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    return tap._emit(
      (errcode is null or v_state = errcode) and (errmsg is null or v_msg = errmsg),
      descr, 'caught: ' || v_state || ' ' || v_msg || ' / wanted: ' || coalesce(errcode, '*'));
  end;
  return tap._emit(false, descr, 'no exception thrown / wanted: ' || coalesce(errcode, '*'));
end $$;

create or replace function tap.lives_ok(code text, descr text default null)
returns text language plpgsql as $$
declare
  v_state text;
  v_msg text;
begin
  begin
    execute code;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text;
    return tap._emit(false, descr, 'died: ' || v_state || ' ' || v_msg);
  end;
  return tap._emit(true, descr);
end $$;

create or replace function tap.is_empty(code text, descr text default null)
returns text language plpgsql as $$
declare
  r record;
  v_rows text[] := '{}';
begin
  for r in execute code loop
    v_rows := v_rows || r::text;
    exit when cardinality(v_rows) >= 5;
  end loop;
  return tap._emit(cardinality(v_rows) = 0, descr, 'unexpected rows: ' || array_to_string(v_rows, ', '));
end $$;

create or replace function tap.results_eq(have text, want text, descr text default null)
returns text language plpgsql as $$
declare
  r record;
  v_have text[] := '{}';
  v_want text[] := '{}';
begin
  for r in execute have loop v_have := v_have || r::text; end loop;
  for r in execute want loop v_want := v_want || r::text; end loop;
  return tap._emit(v_have = v_want, descr,
    'have: ' || array_to_string(v_have, ', ') || ' / want: ' || array_to_string(v_want, ', '));
end $$;

create or replace function tap.finish() returns setof text language plpgsql as $$
declare
  v_plan int := nullif(current_setting('tap.plan', true), '')::int;
  v_n int := coalesce(nullif(current_setting('tap.n', true), ''), '0')::int;
  v_failed int := coalesce(nullif(current_setting('tap.failed', true), ''), '0')::int;
begin
  if v_plan is not null and v_plan <> v_n then
    return next '# Looks like you planned ' || v_plan || ' tests but ran ' || v_n;
  end if;
  if v_failed > 0 then
    return next '# Looks like you failed ' || v_failed || ' test' || case when v_failed > 1 then 's' else '' end
                || ' of ' || v_n;
  end if;
  return;
end $$;
