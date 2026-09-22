#!/usr/bin/env node
/**
 * TESTE DE CARGA da Comunidade ("Juntos") — pergunta do fundador em 2026-09-22:
 * "se muita gente publicar, dá problema?"
 *
 * Monta um dia inteiro de campanha num Postgres local (PGlite, o mesmo harness de
 * run-supabase-sql.mjs) com o tamanho do primeiro ambiente real:
 *   - 3.000 pessoas na comunidade (o número da Lagoinha), todas com nome, 16+,
 *     consentimento e regras aceitos;
 *   - 1.000 publicações num único dia, espalhadas pelas últimas 24 h;
 *   - ~30.000 Améns (10 por pessoa) e ~6.000 comentários;
 *   - 600 bloqueios (blocked_between entra em toda leitura).
 *
 * E MEDE, pelas MESMAS funções que o app chama:
 *   - primeira página do feed (public.community_feed());
 *   - paginação (páginas 2 a 6, com o cursor);
 *   - Amém (public.set_amen) e a contagem que o feed devolve;
 *   - EXPLAIN (ANALYZE) de cada consulta que o feed dispara, para ver se os
 *     índices cobrem ou se sobrou Seq Scan.
 *
 * LIMITE DESTA MEDIÇÃO (não esconder isto no relatório): PGlite é Postgres
 * compilado para WebAssembly, num processo Node, sem disco de verdade e sem
 * concorrência. Os TEMPOS são um sinal RELATIVO (que consulta é caríssima, qual é
 * barata) e o PLANO (índice x varredura) é o mesmo do Postgres 17 do Supabase. A
 * latência absoluta do projeto hospedado precisa ser medida lá, depois do
 * primeiro `supabase db reset`.
 *
 * Uso:
 *   node scripts/sql/carga-comunidade.mjs [--pessoas 3000] [--posts 1000] [--log caminho.md]
 *   (PGLITE_DIR aponta para um node_modules com @electric-sql/pglite, como no outro script)
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const supabaseDir = resolve(here, '..', '..', 'supabase');
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
}
const PESSOAS = arg('pessoas', 3000);
const POSTS = arg('posts', 1000);
const AMENS_POR_PESSOA = arg('amens', 10);
const COMENTARIOS = arg('comentarios', 6000);
const BLOQUEIOS = arg('bloqueios', 600);
const REPETICOES = arg('repeticoes', 15);
const logPath = args.includes('--log') ? args[args.indexOf('--log') + 1] : null;
/**
 * SQL aplicado depois de semear e antes de medir. Serve para testar um índice
 * candidato sem entrar em migration: mede-se com e sem, e só o que ganha vira
 * migration. `--extra-sql caminho.sql`.
 */
const extraSql = args.includes('--extra-sql') ? args[args.indexOf('--extra-sql') + 1] : null;
/**
 * `--comparar caminho.sql`: mede tudo, aplica o SQL, mede tudo de novo e imprime
 * antes/depois. É assim que se decide se um índice ou uma reescrita vale — e não
 * comparando dois processos (o relógio do WebAssembly varia demais entre eles).
 */
const compararSql = args.includes('--comparar') ? args[args.indexOf('--comparar') + 1] : null;

const out = [];
function log(line = '') {
  out.push(line);
  console.log(line);
}

async function loadPglite() {
  const base = process.env.PGLITE_DIR ? join(resolve(process.env.PGLITE_DIR), 'package.json') : join(here, 'x.js');
  const req = createRequire(base);
  const { PGlite } = await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href);
  const { pgcrypto } = await import(pathToFileURL(req.resolve('@electric-sql/pglite/contrib/pgcrypto')).href);
  return { PGlite, pgcrypto };
}

/** As mesmas substituições do harness de testes (PGlite não tem pg_net nem pgtap). */
function preprocess(sql) {
  return sql
    .replace(
      /create extension if not exists pg_net with schema extensions;/g,
      '-- [carga] pg_net indisponível no PGlite',
    )
    .replace(/create extension if not exists pgtap with schema extensions;/g, '-- [carga] pgtap indisponível no PGlite');
}

/** Mede uma consulta N vezes e devolve mediana, p95 e pior caso, em ms. */
async function medir(db, sql, repeticoes = REPETICOES) {
  const tempos = [];
  let linhas = 0;
  for (let i = 0; i < repeticoes; i += 1) {
    const t = performance.now();
    const r = await db.query(sql);
    tempos.push(performance.now() - t);
    linhas = r.rows.length;
  }
  tempos.sort((a, b) => a - b);
  const at = (q) => tempos[Math.min(tempos.length - 1, Math.floor(q * tempos.length))];
  return { mediana: at(0.5), p95: at(0.95), pior: tempos[tempos.length - 1], linhas };
}

function ms(n) {
  return `${n.toFixed(1)} ms`;
}

/**
 * EXPLAIN do CORPO REAL de uma função `language sql` de private (lido do
 * pg_proc, com os parâmetros trocados por literais). Assim o plano medido é o
 * plano da função que o app usa, e não de uma consulta parecida escrita à mão —
 * que é como se erra um teste de carga.
 */
async function explicarFuncao(db, nome, parametros) {
  const r = await db.query(`
    select p.prosrc from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = '${nome}' and p.prolang =
           (select oid from pg_catalog.pg_language where lanname = 'sql')
  `);
  if (r.rows.length === 0) throw new Error(`private.${nome} não é uma função SQL (ou não existe)`);
  let sql = r.rows[0].prosrc;
  for (const [param, valor] of Object.entries(parametros)) {
    sql = sql.replace(new RegExp(`\\b${param}\\b`, 'g'), valor);
  }
  return sql.trim().replace(/;\s*$/, '');
}

/** EXPLAIN (ANALYZE): devolve o plano e se sobrou varredura sequencial em tabela grande. */
async function explicar(db, titulo, sql, tabelasGrandes = []) {
  const r = await db.query(`explain (analyze, buffers, verbose false) ${sql}`);
  const plano = r.rows.map((row) => Object.values(row)[0]).join('\n');
  const seqScans = [...plano.matchAll(/Seq Scan on (?:\w+\.)?(\w+)/g)].map((m) => m[1]);
  const preocupante = seqScans.filter((t) => tabelasGrandes.includes(t));
  return { titulo, plano, seqScans, preocupante };
}

async function main() {
  const { PGlite, pgcrypto } = await loadPglite();
  const t0 = Date.now();

  const boot = new PGlite({ extensions: { pgcrypto } });
  const ver = await boot.query('select version() as v');
  await boot.exec(readFileSync(join(here, 'supabase-stubs.sql'), 'utf8'));
  await boot.exec(readFileSync(join(here, 'mini-pgtap.sql'), 'utf8'));
  const image = await boot.dumpDataDir('none');
  await boot.close();

  const db = new PGlite({ extensions: { pgcrypto }, loadDataDir: image, username: 'supa_postgres' });
  await db.exec('set search_path to public, extensions, tap');

  log('# Teste de carga da Comunidade — Juntos');
  log('');
  log(`- Motor: ${ver.rows[0].v} (PGlite/WebAssembly; o projeto hospedado é Postgres 17)`);
  log(`- Cenário: ${PESSOAS} pessoas · ${POSTS} posts num dia · ${AMENS_POR_PESSOA} Améns por pessoa · ${COMENTARIOS} comentários · ${BLOQUEIOS} bloqueios`);
  log(`- Cada medida é a mediana de ${REPETICOES} execuções (p95 e pior caso ao lado).`);
  log('');

  const migDir = join(supabaseDir, 'migrations');
  for (const file of readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(preprocess(readFileSync(join(migDir, file), 'utf8')));
  }
  log(`Migrations aplicadas em ${((Date.now() - t0) / 1000).toFixed(1)} s.`);

  // ---------------------------------------------------------------- semear
  const tSeed = Date.now();
  await db.exec(`
    update private.community_settings set value = 'carga-1'
      where key in ('publish_consent_version', 'rules_version');
    update private.community_settings set value = repeat('a', 64) where key = 'publish_consent_sha256';
    update private.community_settings set value = repeat('b', 64) where key = 'rules_sha256';

    -- 3.000 pessoas com nome, 16+ e os dois aceites (podem publicar e dar Amém).
    insert into auth.users (id, email, is_anonymous)
    select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, null, true
      from generate_series(1, ${PESSOAS}) n;

    insert into public.community_profiles (user_id, display_name, adult_attested_at, ministry, ministry_answered, status)
    select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
           'Pessoa ' || n,
           now() - interval '10 days',
           case when n % 7 = 0 then null else 'Ministério ' || (n % 12) end,
           true,
           'active'
      from generate_series(1, ${PESSOAS}) n;

    insert into public.consent_records (user_id, purpose, text_version, text_sha256, app_version, accepted_at)
    select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
           p.purpose,
           'carga-1',
           case p.purpose when 'community_rules' then repeat('b', 64) else repeat('a', 64) end,
           '1.0.0 (carga)',
           now() - interval '9 days'
      from generate_series(1, ${PESSOAS}) n
      cross join (values ('community_publish'), ('community_rules')) p(purpose);

    -- 1.000 posts publicados nas últimas 24 h (dentro da janela do feed).
    insert into public.community_posts (id, author_id, body, day_number, status, published_at, created_at, activity, audience)
    select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
           ('10000000-0000-4000-8000-' || lpad(((n % ${PESSOAS}) + 1)::text, 12, '0'))::uuid,
           'Publicação ' || n || ' — leitura do dia, oração pela família e gratidão.',
           null,
           'published',
           now() - (n || ' minutes')::interval * (1440.0 / ${POSTS}),
           now() - (n || ' minutes')::interval * (1440.0 / ${POSTS}),
           (array['leitura', 'oracao', 'jejum', 'livre'])[1 + (n % 4)],
           'igreja'
      from generate_series(1, ${POSTS}) n;

    -- Améns: cada pessoa dá ${AMENS_POR_PESSOA}, espalhados pelos posts.
    insert into public.community_amens (user_id, post_id, created_at)
    select ('10000000-0000-4000-8000-' || lpad(p::text, 12, '0'))::uuid,
           ('20000000-0000-4000-8000-' || lpad((1 + ((p * 37 + k * 101) % ${POSTS}))::text, 12, '0'))::uuid,
           now() - (((p + k) % 1440) || ' minutes')::interval
      from generate_series(1, ${PESSOAS}) p
      cross join generate_series(1, ${AMENS_POR_PESSOA}) k
    on conflict do nothing;

    -- Comentários publicados, concentrados nos posts mais recentes (como na vida real).
    insert into public.community_comments (post_id, author_id, body, status, published_at, created_at)
    select ('20000000-0000-4000-8000-' || lpad((1 + (n % (${POSTS} / 3)))::text, 12, '0'))::uuid,
           ('10000000-0000-4000-8000-' || lpad((1 + (n % ${PESSOAS}))::text, 12, '0'))::uuid,
           'Amém, estou orando com você.',
           case when n % 25 = 0 then 'in_review' else 'published' end::public.community_content_status,
           case when n % 25 = 0 then null else now() - ((n % 1440) || ' minutes')::interval end,
           now() - ((n % 1440) || ' minutes')::interval
      from generate_series(1, ${COMENTARIOS}) n;

    -- Bloqueios nos dois sentidos (blocked_between entra em toda leitura).
    insert into public.community_blocks (blocker_id, blocked_id)
    select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
           ('10000000-0000-4000-8000-' || lpad((1 + ((n * 13) % ${PESSOAS}))::text, 12, '0'))::uuid
      from generate_series(1, ${BLOQUEIOS}) n
     where (1 + ((n * 13) % ${PESSOAS})) <> n
    on conflict do nothing;
  `);
  if (extraSql) {
    await db.exec(readFileSync(resolve(extraSql), 'utf8'));
    log(`SQL extra aplicado: ${extraSql}`);
  }
  await db.exec('analyze');
  log(`Cenário semeado e ANALYZE em ${((Date.now() - tSeed) / 1000).toFixed(1)} s.`);
  log('');

  const contagens = await db.query(`
    select (select count(*) from public.community_profiles) as pessoas,
           (select count(*) from public.community_posts) as posts,
           (select count(*) from public.community_amens) as amens,
           (select count(*) from public.community_comments) as comentarios,
           (select count(*) from public.community_blocks) as bloqueios,
           pg_size_pretty(pg_database_size(current_database())) as tamanho
  `);
  const c = contagens.rows[0];
  log('## O que ficou no banco');
  log('');
  log('| linhas | quantidade |');
  log('| --- | --- |');
  log(`| pessoas na comunidade | ${c.pessoas} |`);
  log(`| publicações no dia | ${c.posts} |`);
  log(`| Améns | ${c.amens} |`);
  log(`| comentários | ${c.comentarios} |`);
  log(`| bloqueios | ${c.bloqueios} |`);
  log(`| banco inteiro (com as migrations) | ${c.tamanho} |`);
  log('');

  // Tamanho por tabela: é daqui que sai a conta de "quanto cabe no plano".
  const tamanhos = await db.query(`
    select c.relname as tabela,
           pg_total_relation_size(c.oid) as bytes,
           pg_size_pretty(pg_total_relation_size(c.oid)) as tamanho,
           (select count(*) from pg_catalog.pg_index i where i.indrelid = c.oid) as indices
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'community%'
       and pg_total_relation_size(c.oid) > 65536
     order by pg_total_relation_size(c.oid) desc
  `);
  log('## Espaço por tabela (um dia de campanha deste tamanho)');
  log('');
  log('| tabela | com índices | índices | bytes por linha |');
  log('| --- | --- | --- | --- |');
  const porLinha = { community_posts: c.posts, community_amens: c.amens, community_comments: c.comentarios, community_profiles: c.pessoas, community_blocks: c.bloqueios };
  for (const t of tamanhos.rows) {
    const linhas = porLinha[t.tabela];
    log(`| ${t.tabela} | ${t.tamanho} | ${t.indices} | ${linhas ? Math.round(Number(t.bytes) / Number(linhas)) : '—'} |`);
  }
  log('');

  // ------------------------------------------------ medir como uma pessoa
  const EU = '10000000-0000-4000-8000-000000000042';
  const claims = JSON.stringify({ sub: EU, role: 'authenticated', is_anonymous: true });
  await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);

  const primeira = await db.query('select * from public.community_feed()');
  const ultima = primeira.rows[primeira.rows.length - 1];
  const cursor = `'${new Date(ultima.published_at).toISOString()}'::timestamptz, '${ultima.post_id}'::uuid`;
  const alvo = primeira.rows[0].post_id;

  /**
   * Uma rodada completa de medição. Roda duas vezes quando há `--comparar`
   * (antes e depois do SQL), no MESMO processo: é a única forma de comparar com
   * alguma honestidade, porque o relógio do WebAssembly varia muito entre
   * execuções (vimos a mesma consulta, com o mesmo plano, medir 61 e 96 ms em
   * processos diferentes).
   */
  async function rodada() {
    const feed1 = await medir(db, 'select * from public.community_feed()');
    const feed2 = await medir(db, `select * from public.community_feed(${cursor})`);

    // Paginação de verdade: 5 páginas seguidas, com o cursor de cada uma.
    const tPag = performance.now();
    let cur = null;
    let paginas = 0;
    let vistos = 0;
    for (let i = 0; i < 5; i += 1) {
      const sql = cur
        ? `select * from public.community_feed('${cur.at}'::timestamptz, '${cur.id}'::uuid)`
        : 'select * from public.community_feed()';
      const page = await db.query(sql);
      paginas += 1;
      vistos += page.rows.length;
      if (page.rows.length < 20) break;
      const last = page.rows[page.rows.length - 1];
      cur = { at: new Date(last.published_at).toISOString(), id: last.post_id };
    }
    const paginacao = performance.now() - tPag;

    // Só as contagens e os rostinhos dos 20 posts da página: isola o custo que
    // cresce com o TAMANHO DA IGREJA, sem o resto do feed. As três funções são de
    // private (o app não as alcança), então esta medida sai do papel de dono.
    const vinte = primeira.rows.map((row) => `'${row.post_id}'::uuid`).join(', ');
    await db.exec('reset role');
    const contagens = await medir(
      db,
      `select sum(private.amen_count_for(p, '${EU}'::uuid) + private.comment_count_for(p, '${EU}'::uuid))
            + count(private.amen_faces_for(p, '${EU}'::uuid))
         from pg_catalog.unnest(array[${vinte}]) p`,
    );
    await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);

    return {
      feed1,
      feed2,
      paginacao,
      paginas,
      vistos,
      contagens,
      amemLiga: await medir(db, `select public.set_amen('${alvo}'::uuid, true)`, 5),
      amemDesliga: await medir(db, `select public.set_amen('${alvo}'::uuid, false)`, 5),
      comentarios: await medir(db, `select * from public.community_post_comments('${alvo}'::uuid)`),
      amemComentario: await medir(db, `select * from public.community_comment_amens('${alvo}'::uuid)`),
      status: await medir(db, 'select * from public.my_community_status()'),
      meusPosts: await medir(db, 'select * from public.my_community_posts()'),
      atividade: await medir(db, 'select * from public.my_community_activity()'),
    };
  }

  const r = await rodada();

  log('## Tempos medidos (PGlite, sinal relativo — ver a ressalva no topo)');
  log('');
  log('| ação do app | função | mediana | p95 | pior | linhas |');
  log('| --- | --- | --- | --- | --- | --- |');
  const linha = (nome, fn, m) =>
    log(`| ${nome} | \`${fn}\` | ${ms(m.mediana)} | ${ms(m.p95)} | ${ms(m.pior)} | ${m.linhas} |`);
  linha('abrir o feed (1ª página)', 'community_feed()', r.feed1);
  linha('rolar (2ª página)', 'community_feed(cursor)', r.feed2);
  linha('só as contagens e rostinhos da página', 'amen_count_for + comment_count_for × 20', r.contagens);
  linha('abrir a conversa de um post', 'community_post_comments()', r.comentarios);
  linha('número de Amém dos comentários', 'community_comment_amens()', r.amemComentario);
  linha('dar Amém', 'set_amen(true)', r.amemLiga);
  linha('retirar o Amém', 'set_amen(false)', r.amemDesliga);
  linha('estado da pessoa (abre a aba)', 'my_community_status()', r.status);
  linha('minhas publicações', 'my_community_posts()', r.meusPosts);
  linha('sino / atividade', 'my_community_activity()', r.atividade);
  log('');
  log(`Paginação completa: ${r.paginas} páginas, ${r.vistos} publicações, ${ms(r.paginacao)} no total.`);
  log('');
  log(
    'A contagem de Amém e os rostinhos NÃO são uma consulta à parte: `amen_count_for`, ' +
      '`amen_faces_for` e `comment_count_for` rodam DENTRO da página do feed (uma vez por post), ' +
      'então o tempo da 1ª página já é o tempo de "feed + contagens + rostinhos".',
  );
  log('');

  // -------------------------------------------------- publicar e o post viral
  // Publicar de verdade, pela RPC (com o aceite no ato, como o app faz desde
  // 2026-09-22): é o caminho de escrita completo — limite diário, filtro de
  // texto, insert e, se for o caso, registro do aceite.
  const publicar = await medir(
    db,
    `select * from public.create_community_post(post_body => 'Medindo a escrita ' || clock_timestamp())`,
    5,
  );

  // "E se um post viralizar?" Um post com Amém de TODA a igreja e 500 comentários.
  await db.exec('reset role');
  await db.exec(`
    insert into public.community_amens (user_id, post_id, created_at)
    select cp.user_id, '${alvo}'::uuid, now() - ((random() * 600)::int || ' minutes')::interval
      from public.community_profiles cp
    on conflict do nothing;
    insert into public.community_comments (post_id, author_id, body, status, published_at, created_at)
    select '${alvo}'::uuid,
           ('10000000-0000-4000-8000-' || lpad((1 + (n % ${PESSOAS}))::text, 12, '0'))::uuid,
           'Amém!', 'published', now() - (n || ' seconds')::interval, now() - (n || ' seconds')::interval
      from generate_series(1, 500) n;
    analyze public.community_amens, public.community_comments;
  `);
  const viral = await db.query(
    `select private.amen_count_for('${alvo}'::uuid, '${EU}'::uuid) as amens,
            private.comment_count_for('${alvo}'::uuid, '${EU}'::uuid) as comentarios`,
  );
  const viralContagem = await medir(
    db,
    `select private.amen_count_for('${alvo}'::uuid, '${EU}'::uuid)
          + private.comment_count_for('${alvo}'::uuid, '${EU}'::uuid)
          + pg_catalog.length(private.amen_faces_for('${alvo}'::uuid, '${EU}'::uuid)::text)`,
  );
  await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);
  const viralFeed = await medir(db, 'select * from public.community_feed()');
  const viralConversa = await medir(db, `select * from public.community_post_comments('${alvo}'::uuid)`);

  log('## Escrita e o "post que viralizou"');
  log('');
  log('| ação | mediana | p95 | pior |');
  log('| --- | --- | --- | --- |');
  log(`| publicar (RPC \`create_community_post\`) | ${ms(publicar.mediana)} | ${ms(publicar.p95)} | ${ms(publicar.pior)} |`);
  log(
    `| contar Amém + comentários + rostinhos de UM post com ${viral.rows[0].amens} Améns e ${viral.rows[0].comentarios} comentários | ${ms(viralContagem.mediana)} | ${ms(viralContagem.p95)} | ${ms(viralContagem.pior)} |`,
  );
  log(`| a página do feed COM esse post dentro | ${ms(viralFeed.mediana)} | ${ms(viralFeed.p95)} | ${ms(viralFeed.pior)} |`);
  log(
    `| abrir a conversa dele (${viral.rows[0].comentarios} comentários, sem paginação) | ${ms(viralConversa.mediana)} | ${ms(viralConversa.p95)} | ${ms(viralConversa.pior)} |`,
  );
  log('');

  if (compararSql) {
    await db.exec('reset role');
    await db.exec(readFileSync(resolve(compararSql), 'utf8'));
    await db.exec('analyze');
    await db.exec(`select set_config('request.jwt.claims', '${claims}', false); set role authenticated;`);
    const d = await rodada();
    log(`## Comparação: mesmo processo, depois de aplicar \`${compararSql}\``);
    log('');
    log('| medida | antes | depois | diferença |');
    log('| --- | --- | --- | --- |');
    const cmp = (nome, a, b) =>
      log(`| ${nome} | ${ms(a)} | ${ms(b)} | ${b < a ? '-' : '+'}${(Math.abs(b - a) / a * 100).toFixed(0)}% |`);
    cmp('feed, 1ª página', r.feed1.mediana, d.feed1.mediana);
    cmp('feed, 2ª página', r.feed2.mediana, d.feed2.mediana);
    cmp('contagens e rostinhos da página', r.contagens.mediana, d.contagens.mediana);
    cmp('paginação (5 páginas)', r.paginacao, d.paginacao);
    log('');
  }

  // --------------------------------------------------------------- EXPLAIN
  await db.exec('reset role');
  const GRANDES = ['community_amens', 'community_posts', 'community_comments', 'community_profiles', 'community_blocks'];
  const explicacoes = [];
  explicacoes.push(
    await explicar(
      db,
      'página do feed: escolher os 20 posts',
      `select p.id from public.community_posts p
         join public.community_profiles a on a.user_id = p.author_id and a.status = 'active'
        where p.status = 'published'
          and p.published_at > now() - interval '7 days'
          and not private.blocked_between('${EU}'::uuid, p.author_id)
          and (p.audience = 'igreja' or p.author_id = '${EU}'::uuid)
        order by p.published_at desc, p.id desc
        limit 20`,
      GRANDES,
    ),
  );
  const paramsPost = { target_post: `'${alvo}'::uuid`, viewer: `'${EU}'::uuid` };
  for (const [fn, titulo] of [
    ['amen_count_for', 'contagem de Amém de um post (corpo real de private.amen_count_for)'],
    ['amen_faces_for', 'rostinhos de um post (corpo real de private.amen_faces_for)'],
    ['comment_count_for', 'número de comentários de um post (corpo real de private.comment_count_for)'],
    ['post_photo_paths', 'fotos de um post (corpo real de private.post_photo_paths)'],
  ]) {
    explicacoes.push(await explicar(db, titulo, await explicarFuncao(db, fn, paramsPost), GRANDES));
  }
  explicacoes.push(
    await explicar(
      db,
      'bloqueio nos dois sentidos (blocked_between)',
      `select 1 from public.community_blocks bl
        where (bl.blocker_id = '${EU}'::uuid and bl.blocked_id = '10000000-0000-4000-8000-000000000043'::uuid)
           or (bl.blocker_id = '10000000-0000-4000-8000-000000000043'::uuid and bl.blocked_id = '${EU}'::uuid)`,
      GRANDES,
    ),
  );
  explicacoes.push(
    await explicar(
      db,
      'limite diário de publicações (10 por pessoa por dia)',
      `select count(*) from public.community_posts p
        where p.author_id = '${EU}'::uuid and p.created_at > now() - interval '1 day'`,
      GRANDES,
    ),
  );

  log('## Índices: o EXPLAIN (ANALYZE) de cada consulta do feed');
  log('');
  for (const e of explicacoes) {
    const usados = [...e.plano.matchAll(/Index (?:Only )?Scan using (\w+)/g)].map((m) => m[1]);
    const veredicto = e.preocupante.length > 0 ? `VARREDURA SEQUENCIAL em ${e.preocupante.join(', ')}` : 'coberta por índice';
    log(`### ${e.titulo}`);
    log('');
    log(`- veredicto: **${veredicto}**`);
    log(`- índices usados: ${usados.length > 0 ? usados.map((i) => `\`${i}\``).join(', ') : '(nenhum)'}`);
    log('');
    log('```');
    log(e.plano);
    log('```');
    log('');
  }

  const faltando = explicacoes.filter((e) => e.preocupante.length > 0);
  log(
    faltando.length === 0
      ? '**Nenhuma consulta do feed varre tabela grande.** Todos os índices necessários existem.'
      : `**Faltam índices:** ${faltando.map((e) => e.titulo).join('; ')}.`,
  );
  log('');
  log(`# tempo total do teste: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  await db.close();
  if (logPath) writeFileSync(logPath, out.join('\n') + '\n');
  process.exitCode = faltando.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
