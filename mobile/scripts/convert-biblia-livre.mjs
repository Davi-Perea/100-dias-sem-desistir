#!/usr/bin/env node
/**
 * Converte a Bíblia Livre (eBible.org, porbr2018, USFM, CC BY 4.0 BR) em um JSON
 * por livro, de forma DETERMINÍSTICA: a mesma fonte produz sempre os mesmos bytes.
 *
 *   node scripts/convert-biblia-livre.mjs          gera content/biblia-livre/livros/<CÓDIGO>.json
 *                                                  e content/biblia-livre/manifest.json
 *   node scripts/convert-biblia-livre.mjs --check  falha se algum JSON versionado não
 *                                                  corresponder à fonte (ou se sobrar arquivo)
 *
 * Fonte: content/biblia-livre/source/porbr2018_usfm.zip (cópia byte a byte do
 * download; SHA-256 conferido abaixo). Origem, licença e atribuição em
 * content/biblia-livre/source/README.md.
 *
 * O que sai (e o que NÃO sai) do USFM:
 * - \v n texto   -> versículo n (a numeração tem de ser 1..N contígua, senão é ERRO).
 * - \add...\add* -> o marcador sai, as palavras ficam (são parte do texto lido).
 * - \f...\f*     -> nota de rodapé: REMOVIDA inteira (não exibida no app).
 * - \x...\x*     -> referência cruzada: REMOVIDA inteira (a fonte atual não tem nenhuma).
 * - \rq...\rq*   -> referência da citação (ex.: "Isaías 7:14" em Mateus): REMOVIDA
 *                   inteira, é referência cruzada embutida.
 * - \d texto     -> título do salmo, guardado em "titulo" do capítulo.
 * - \s texto     -> título de seção, guardado em "titulo" do capítulo se vier antes do
 *                   primeiro versículo (a fonte atual não tem nenhum).
 * - \id \ide \h \toc* \mt* \c \p -> estrutura; não viram texto.
 * Qualquer outro marcador é ERRO: não se descarta texto em silêncio.
 *
 * O texto NUNCA é corrigido: só se tiram marcadores e se juntam espaços repetidos.
 * Remover notas e referências é alteração da obra; a licença exige indicá-la, e o
 * aviso de copyright do provedor (src/reader/bibliaLivreProvider.ts) o faz.
 *
 * Sem dependências: o leitor de ZIP abaixo usa só zlib (mesmo do convert-100-dias.mjs).
 */
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = join(ROOT, 'content', 'biblia-livre');
const SOURCE = join(BASE, 'source', 'porbr2018_usfm.zip');
const SOURCE_SHA256 = 'f8b806c312e07c283baadb2394fe9fdc2d9a2fbe48410fd5298358511af8ae57';
const OUT_DIR = join(BASE, 'livros');
const MANIFEST = join(BASE, 'manifest.json');
const BOOKS_TS = join(ROOT, 'src', 'bible', 'books.ts');

/** Contagens esperadas do cânon protestante de 66 livros (versificação KJV/TR). */
const EXPECTED = { books: 66, chapters: 1189, verses: 31102 };

/* ------------------------------------------------------------ leitor de ZIP */

function readZip(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('ZIP inválido: sem diretório central.');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('ZIP inválido: entrada corrompida.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) entries.set(name, Buffer.from(data));
    else if (method === 8) entries.set(name, inflateRawSync(data));
    else throw new Error(`ZIP: método de compressão não suportado (${method}) em ${name}.`);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/* --------------------------------------------------------------- cânon */

/** Lê a ordem, os nomes e as contagens de capítulos de src/bible/books.ts (fonte única). */
function readCanon() {
  const ts = readFileSync(BOOKS_TS, 'utf8');
  const books = [...ts.matchAll(/\{ id: '([0-9A-Z]{3})', name: '([^']+)', chapters: (\d+) \}/g)].map((m) => ({
    id: m[1],
    name: m[2],
    chapters: Number(m[3]),
  }));
  if (books.length !== EXPECTED.books) throw new Error(`books.ts: esperava ${EXPECTED.books} livros, li ${books.length}.`);
  return books;
}

/* ------------------------------------------------------------- USFM */

const STRUCTURAL = new Set(['id', 'ide', 'h', 'toc1', 'toc2', 'toc3', 'mt', 'mt1', 'mt2', 'c', 'p', 'v', 'd', 's', 's1', 's2']);
const KEEP_TEXT_CHAR = new Set(['add', 'nd', 'wj', 'it', 'bd', 'em', 'sc', 'qs', 'tl']);
const DROP_WHOLE = ['f', 'fe', 'x', 'rq'];

/** Tira do texto de um versículo/título os marcadores de caractere, mantendo o texto. */
function cleanInline(raw, where) {
  let text = raw;
  // 1. Notas, referências cruzadas e referências de citação saem INTEIRAS.
  for (const tag of DROP_WHOLE) {
    const re = new RegExp(`\\\\${tag} [\\s\\S]*?\\\\${tag}\\*`, 'g');
    text = text.replace(re, ' ');
  }
  // 2. Marcadores de caractere que embrulham texto: sai o marcador, fica o texto.
  text = text.replace(/\\\+?([a-z]+\d*)\*?/g, (whole, tag) => {
    if (KEEP_TEXT_CHAR.has(tag)) return '';
    throw new Error(`${where}: marcador USFM desconhecido "${whole}". Trate-o no conversor antes de gerar.`);
  });
  // 3. Espaços: só colapsa espaço/tab repetidos, que sobram onde a nota saiu
  //    ("toda carne \f...\f* havia" -> "toda carne havia"). Nada de pontuação é mexido.
  text = text.replace(/[ \t]+/g, ' ').trim();
  if (text.includes('\\')) throw new Error(`${where}: sobrou barra invertida no texto.`);
  return text;
}

function parseBook(usfm, code, file) {
  const chapters = [];
  let current = null;
  let pendingTitle = null;
  let lastVerse = null;
  for (const line of usfm.split('\n')) {
    const trimmed = line.replace(/\s+$/, '');
    if (!trimmed) continue;
    const m = /^\\([a-z]+\d*)(?:\s+([\s\S]*))?$/.exec(trimmed);
    if (!m) {
      // Linha de continuação: pertence ao último versículo.
      if (!lastVerse) throw new Error(`${file}: texto fora de versículo: ${JSON.stringify(trimmed.slice(0, 60))}`);
      lastVerse.raw += ` ${trimmed}`;
      continue;
    }
    const [, tag, rest = ''] = m;
    if (!STRUCTURAL.has(tag)) throw new Error(`${file}: marcador de parágrafo desconhecido "\\${tag}".`);
    if (tag === 'id') {
      const id = rest.split(/\s+/)[0];
      if (id !== code) throw new Error(`${file}: \\id ${id} não bate com ${code}.`);
    } else if (tag === 'c') {
      const n = Number(rest.trim());
      if (n !== chapters.length + 1) throw new Error(`${file}: capítulo ${n} fora de ordem (esperava ${chapters.length + 1}).`);
      current = { capitulo: n, titulo: null, versos: [] };
      chapters.push(current);
      pendingTitle = null;
      lastVerse = null;
    } else if (tag === 'd' || tag.startsWith('s')) {
      if (!current) throw new Error(`${file}: título antes do primeiro capítulo.`);
      if (current.versos.length > 0) {
        throw new Error(`${file} ${current.capitulo}: título no meio do capítulo; o formato só guarda título no início.`);
      }
      pendingTitle = pendingTitle ? `${pendingTitle} ${rest}` : rest;
      current.titulo = cleanInline(pendingTitle, `${file} ${current.capitulo} (título)`);
    } else if (tag === 'v') {
      if (!current) throw new Error(`${file}: versículo antes do primeiro capítulo.`);
      const vm = /^(\d+)\s+([\s\S]*)$/.exec(rest);
      if (!vm) throw new Error(`${file} ${current.capitulo}: versículo sem número ou sem texto: ${JSON.stringify(rest.slice(0, 40))}`);
      const n = Number(vm[1]);
      if (n !== current.versos.length + 1) {
        throw new Error(`${file} ${current.capitulo}:${n}: versículo fora de sequência (esperava ${current.versos.length + 1}).`);
      }
      lastVerse = { n, raw: vm[2] };
      current.versos.push(lastVerse);
    }
    // id/ide/h/toc/mt/p: estrutura, sem texto de leitura.
  }
  return chapters.map((ch) => ({
    capitulo: ch.capitulo,
    titulo: ch.titulo,
    versiculos: ch.versos.map((v) => {
      const text = cleanInline(v.raw, `${file} ${ch.capitulo}:${v.n}`);
      if (!text) throw new Error(`${file} ${ch.capitulo}:${v.n}: versículo vazio depois da limpeza.`);
      return text;
    }),
  }));
}

/* ------------------------------------------------------------- build */

function build() {
  if (!existsSync(SOURCE)) throw new Error(`Fonte ausente: ${SOURCE}`);
  const zip = readFileSync(SOURCE);
  const sha = createHash('sha256').update(zip).digest('hex');
  if (sha !== SOURCE_SHA256) {
    throw new Error(`SHA-256 da fonte mudou (${sha}). Fonte nova exige revisão humana: atualize o README e o hash aqui.`);
  }
  const entries = readZip(zip);
  const canon = readCanon();
  const usfmByCode = new Map();
  for (const [name, data] of entries) {
    const m = /^\d+-([0-9A-Z]{3})porbr2018\.usfm$/.exec(name);
    if (m) usfmByCode.set(m[1], { name, text: data.toString('utf8').replace(/\r\n/g, '\n') });
  }
  const missing = canon.filter((b) => !usfmByCode.has(b.id)).map((b) => b.id);
  if (missing.length) throw new Error(`PARE: livros ausentes na fonte: ${missing.join(', ')}.`);
  const extra = [...usfmByCode.keys()].filter((code) => !canon.some((b) => b.id === code));
  if (extra.length) throw new Error(`Livros na fonte fora do cânon de books.ts: ${extra.join(', ')}.`);

  const files = new Map();
  const perBook = [];
  let chapters = 0;
  let verses = 0;
  for (const book of canon) {
    const { name, text } = usfmByCode.get(book.id);
    const parsed = parseBook(text, book.id, name);
    if (parsed.length !== book.chapters) {
      throw new Error(`${book.id}: fonte tem ${parsed.length} capítulos; books.ts diz ${book.chapters}.`);
    }
    const bookVerses = parsed.reduce((sum, ch) => sum + ch.versiculos.length, 0);
    chapters += parsed.length;
    verses += bookVerses;
    const json = { livro: book.id, nome: book.name, capitulos: parsed };
    files.set(join(OUT_DIR, `${book.id}.json`), `${JSON.stringify(json)}\n`);
    perBook.push({ livro: book.id, capitulos: parsed.length, versiculos: bookVerses });
  }
  if (chapters !== EXPECTED.chapters) throw new Error(`Esperava ${EXPECTED.chapters} capítulos, li ${chapters}.`);
  if (verses !== EXPECTED.verses) throw new Error(`Esperava ${EXPECTED.verses} versículos, li ${verses}.`);

  const manifest = {
    traducao: 'Bíblia Livre',
    sigla: 'BLIVRE',
    fonte: {
      arquivo: 'source/porbr2018_usfm.zip',
      url: 'https://ebible.org/Scriptures/porbr2018_usfm.zip',
      sha256: SOURCE_SHA256,
    },
    licenca: 'CC BY 4.0 Brasil (https://creativecommons.org/licenses/by/4.0/br/)',
    alteracoes: 'Notas de rodapé (\\f), referências cruzadas (\\x) e referências de citação (\\rq) removidas; marcadores de caractere removidos mantendo o texto.',
    totais: { livros: canon.length, capitulos: chapters, versiculos: verses },
    livros: perBook,
  };
  files.set(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, totals: manifest.totais };
}

/* ------------------------------------------------------------------- CLI */

const check = process.argv.includes('--check');
try {
  const { files, totals } = build();
  if (check) {
    const stale = [];
    for (const [path, expected] of files) {
      const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
      if (current !== expected) stale.push(path);
    }
    const expectedNames = new Set([...files.keys()].filter((p) => p.startsWith(OUT_DIR)).map((p) => p.slice(OUT_DIR.length + 1)));
    const strays = existsSync(OUT_DIR) ? readdirSync(OUT_DIR).filter((f) => !expectedNames.has(f)) : [];
    if (stale.length || strays.length) {
      for (const p of stale) console.error(`DESATUALIZADO: ${p}`);
      for (const f of strays) console.error(`SOBRANDO: livros/${f} não vem da fonte.`);
      console.error('Rode: node scripts/convert-biblia-livre.mjs');
      process.exit(1);
    }
    console.log('OK: livros e manifest da Bíblia Livre correspondem à fonte.');
  } else {
    mkdirSync(OUT_DIR, { recursive: true });
    for (const [path, content] of files) writeFileSync(path, content);
    console.log(`Gerados ${files.size - 1} livros em ${OUT_DIR} e o manifest.`);
  }
  console.log(`${totals.livros} livros · ${totals.capitulos} capítulos · ${totals.versiculos} versículos`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
