#!/usr/bin/env node
/**
 * Aplica TODAS as migrations de mobile/supabase/migrations num Postgres local
 * (PGlite 0.5.x = Postgres 18 em WebAssembly; o projeto hospedado é 17, ver
 * config.toml) e roda os testes de mobile/supabase/tests.
 *
 * Por que existe: nesta máquina não há Docker nem Supabase CLI, então
 * `supabase db reset && supabase test db` não roda. O PGlite roda em Node puro.
 *
 * Fidelidade (o que o harness reproduz do Supabase, ver supabase-stubs.sql):
 *   - papéis anon / authenticated / service_role e os grants padrão em public;
 *   - migrations e testes rodam CONECTADOS como um "postgres" NÃO superusuário
 *     (supa_postgres: BYPASSRLS, dono dos objetos), como no projeto hospedado;
 *   - auth.uid()/auth.jwt() leem request.jwt.claims; storage.objects com RLS.
 * Diferenças conhecidas (registradas na saída):
 *   - pg_net não existe no PGlite: `create extension pg_net` vira no-op e
 *     net.http_post é um stub que só grava em net.http_request_log;
 *   - Postgres 18 aqui, 17 no projeto: nada nas migrations depende da diferença,
 *     mas a primeira execução real (supabase db reset) continua obrigatória;
 *   - pgTAP não existe no PGlite: os testes rodam sobre mini-pgtap.sql (mesmos
 *     nomes e semântica das asserções usadas), e `create extension pgtap` vira no-op.
 *
 * Uso:
 *   npm i --no-save @electric-sql/pglite   (ou aponte PGLITE_DIR para um node_modules com ele)
 *   node scripts/sql/run-supabase-sql.mjs [--only 07,08] [--log caminho.txt]
 * Sai com código 1 se alguma migration falhar ou algum teste não passar.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// SUPABASE_DIR: aponta para outra cópia (usado no teste de mutação do próprio harness).
const supabaseDir = process.env.SUPABASE_DIR ? resolve(process.env.SUPABASE_DIR) : resolve(here, '..', '..', 'supabase');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const logPath = args.includes('--log') ? args[args.indexOf('--log') + 1] : null;

async function loadPglite() {
  const base = process.env.PGLITE_DIR ? join(resolve(process.env.PGLITE_DIR), 'package.json') : join(here, 'x.js');
  const req = createRequire(base);
  const main = pathToFileURL(req.resolve('@electric-sql/pglite')).href;
  const crypto = pathToFileURL(req.resolve('@electric-sql/pglite/contrib/pgcrypto')).href;
  const { PGlite } = await import(main);
  const { pgcrypto } = await import(crypto);
  return { PGlite, pgcrypto };
}

const out = [];
function log(line = '') {
  out.push(line);
  console.log(line);
}

/** Substituições explícitas (e registradas) do que o PGlite não tem. */
const SUBSTITUTIONS = [
  {
    re: /create extension if not exists pg_net with schema extensions;/g,
    to: '-- [harness] pg_net indisponível no PGlite: stub net.http_post em supabase-stubs.sql',
    note: 'pg_net → stub net.http_post',
  },
  {
    re: /create extension if not exists pgtap with schema extensions;/g,
    to: '-- [harness] pgtap indisponível no PGlite: mini-pgtap.sql no schema tap',
    note: 'pgtap → mini-pgtap (schema tap)',
  },
];
function preprocess(sql, notes) {
  let s = sql;
  for (const sub of SUBSTITUTIONS) {
    if (sub.re.test(s)) notes.add(sub.note);
    sub.re.lastIndex = 0;
    s = s.replace(sub.re, sub.to);
  }
  return s;
}

function describeError(err, sql) {
  const parts = [`${err.code ?? '?????'} ${err.message}`];
  if (err.detail) parts.push(`detail: ${err.detail}`);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  if (err.where) parts.push(`where: ${err.where}`);
  if (err.position && sql) {
    const pos = Number(err.position);
    const line = sql.slice(0, pos).split('\n').length;
    parts.push(`linha ${line}: ${sql.split('\n')[line - 1]?.trim()}`);
  }
  return parts.join('\n    ');
}

async function main() {
  const { PGlite, pgcrypto } = await loadPglite();
  const t0 = Date.now();

  // Fase 1 — superusuário do PGlite: papéis, stubs do Supabase, mini-pgtap.
  const boot = new PGlite({ extensions: { pgcrypto } });
  const ver = await boot.query('select version() as v');
  log(`# ${ver.rows[0].v}`);
  await boot.exec(readFileSync(join(here, 'supabase-stubs.sql'), 'utf8'));
  await boot.exec(readFileSync(join(here, 'mini-pgtap.sql'), 'utf8'));
  const image = await boot.dumpDataDir('none');
  await boot.close();

  // Fase 2 — conectado como o "postgres" não superusuário do Supabase.
  const db = new PGlite({ extensions: { pgcrypto }, loadDataDir: image, username: 'supa_postgres' });
  const who = await db.query('select current_user as u, (select rolsuper from pg_roles where rolname = current_user) as s');
  log(`# conectado como ${who.rows[0].u} (superusuário: ${who.rows[0].s})`);
  await db.exec('set search_path to public, extensions, tap');

  const notes = new Set();
  const migDir = join(supabaseDir, 'migrations');
  const migrations = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
  log('');
  log(`## Migrations (${migrations.length})`);
  let migFailed = false;
  for (const file of migrations) {
    const sql = preprocess(readFileSync(join(migDir, file), 'utf8'), notes);
    const t = Date.now();
    try {
      await db.exec(sql);
      log(`ok   ${file} (${Date.now() - t} ms)`);
    } catch (err) {
      log(`FAIL ${file}\n    ${describeError(err, sql)}`);
      migFailed = true;
      break;
    }
  }
  if (migFailed) {
    await db.close();
    finish(1, notes, t0);
    return;
  }

  const testDir = join(supabaseDir, 'tests');
  const tests = readdirSync(testDir)
    .filter((f) => f.endsWith('.test.sql'))
    .filter((f) => !only || only.some((p) => f.startsWith(p)))
    .sort();
  log('');
  log(`## Testes (${tests.length} arquivos)`);
  let total = 0;
  let failed = 0;
  let broken = 0;
  for (const file of tests) {
    const sql = preprocess(readFileSync(join(testDir, file), 'utf8'), notes);
    log(`# ${file}`);
    let results;
    try {
      results = await db.exec(sql);
    } catch (err) {
      log(`  ERRO fora de asserção (o arquivo parou aqui)\n    ${describeError(err, sql)}`);
      broken++;
      try { await db.exec('rollback'); } catch { /* já fora de transação */ }
      await db.exec('reset role');
      continue;
    }
    let plan = null;
    let ran = 0;
    for (const r of results) {
      for (const row of r.rows ?? []) {
        for (const v of Object.values(row)) {
          if (typeof v !== 'string') continue;
          if (/^1\.\.\d+$/.test(v)) plan = Number(v.slice(3));
          else if (/^(not )?ok \d+/.test(v)) {
            ran++;
            total++;
            if (v.startsWith('not ok')) failed++;
            log(`  ${v.replace(/\n/g, '\n  ')}`);
          } else if (v.startsWith('# ')) log(`  ${v}`);
        }
      }
    }
    if (plan !== null && plan !== ran) {
      log(`  # plano ${plan}, rodou ${ran}`);
      broken++;
    }
  }
  log('');
  log(`## Resultado: ${total - failed}/${total} asserções passaram; ${failed} falharam; ${broken} arquivo(s) quebrado(s)`);
  await db.close();
  finish(failed || broken ? 1 : 0, notes, t0);
}

function finish(code, notes, t0) {
  if (notes.size) log(`# substituições do harness: ${[...notes].join('; ')}`);
  log(`# tempo total: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (logPath) writeFileSync(logPath, out.join('\n') + '\n');
  process.exitCode = code;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
