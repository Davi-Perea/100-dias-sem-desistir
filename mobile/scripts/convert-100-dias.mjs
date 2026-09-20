#!/usr/bin/env node
/**
 * Converte o material oficial dos 100 Dias (dois .docx da igreja) no dataset da
 * Jornada, de forma DETERMINÍSTICA: a mesma fonte produz sempre o mesmo JSON.
 *
 *   node scripts/convert-100-dias.mjs          gera content/100-dias-2026/dataset.json
 *   node scripts/convert-100-dias.mjs --check  falha se o JSON versionado estiver
 *                                              desatualizado em relação às fontes
 *
 * O que este script NÃO faz: não inventa dia, não corrige texto da igreja, não
 * reordena capítulos, não preenche lacunas. Qualquer inconsistência entre o
 * guia e a escala, ou entre o material e o cânon, é ERRO e interrompe a geração.
 *
 * Sem dependências: o .docx é um ZIP com XML; o leitor de ZIP abaixo usa só zlib.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'content', 'source');
const OUTPUT = join(ROOT, 'content', '100-dias-2026', 'dataset.json');
/** Texto da orientação (propósito, fluxo da reunião), extraído do terceiro .docx. */
const PROPOSITO_OUTPUT = join(ROOT, 'content', '100-dias-2026', 'proposito.json');
/** Estado dos direitos, mantido à mão e versionado: é aqui que a autorização da igreja entra. */
const RIGHTS = join(ROOT, 'content', '100-dias-2026', 'rights.json');

function readRights() {
  if (!existsSync(RIGHTS)) throw new Error(`Arquivo de direitos ausente: ${RIGHTS}`);
  const rights = JSON.parse(readFileSync(RIGHTS, 'utf8'));
  const allowed = ['pending_authorization', 'partially_authorized', 'authorized'];
  if (!allowed.includes(rights.rights_status)) {
    throw new Error(`rights.json: rights_status inválido "${rights.rights_status}" (use ${allowed.join(' | ')}).`);
  }
  if (rights.rights_status === 'authorized' && !rights.rights_reference) {
    throw new Error('rights.json: "authorized" exige rights_reference (quem autorizou, quando, por qual canal).');
  }
  if (rights.leader_names_authorized === true && rights.rights_status !== 'authorized') {
    throw new Error('rights.json: nomes de líderes só podem ser liberados com rights_status "authorized".');
  }
  return {
    rights_status: rights.rights_status,
    rights_reference: rights.rights_reference ?? null,
    leader_names_authorized: rights.leader_names_authorized === true,
  };
}

const SOURCES = {
  guide: '2026-08-28_guia-diario-de-intercessao.docx',
  schedule: '2026-08-28_escala-100-dias.docx',
  orientation: '2026-08-28_orientacao-aos-lideres.docx',
};

/* ------------------------------------------------------------ leitor de ZIP */

/** Lê todas as entradas de um ZIP (métodos "stored" e "deflate"). */
function readZip(buffer) {
  // End of Central Directory: assinatura 0x06054b50, varrendo do fim.
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

/* ------------------------------------------------------- extração do Word */

const unescapeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Texto de um trecho de XML do Word, preservando quebras de parágrafo e tabulações. */
function textOf(xml) {
  let out = '';
  const re = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<\/w:p>/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[0] === '<w:tab/>') out += '\t';
    else if (m[0] === '<w:br/>' || m[0] === '</w:p>') out += '\n';
    else out += unescapeXml(m[1]);
  }
  return out.replace(/\n+$/g, '').trim();
}

/** Todas as tabelas do documento como matrizes de células (texto). */
function tables(documentXml) {
  const result = [];
  const tableRe = /<w:tbl>([\s\S]*?)<\/w:tbl>/g;
  let t;
  while ((t = tableRe.exec(documentXml))) {
    const rows = [];
    const rowRe = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
    let r;
    while ((r = rowRe.exec(t[1]))) {
      const cells = [];
      const cellRe = /<w:tc>([\s\S]*?)<\/w:tc>/g;
      let c;
      while ((c = cellRe.exec(r[0]))) cells.push(textOf(c[1]));
      rows.push(cells);
    }
    result.push(rows);
  }
  return result;
}

/** Texto corrido do documento inteiro (usado só para achar o período da campanha). */
function bodyText(documentXml) {
  return textOf(documentXml.slice(documentXml.indexOf('<w:body')));
}

/* --------------------------------------------------------- cânon e nomes */

/** Fatos públicos: livros e contagem de capítulos. Precisa bater com src/bible/books.ts. */
const CHAPTERS = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4, '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25,
  '1CH': 29, '2CH': 36, EZR: 10, NEH: 13, EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8, ISA: 66, JER: 52,
  LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 3, AMO: 9, OBA: 1, JON: 4, MIC: 7, NAM: 3, HAB: 3, ZEP: 3, HAG: 2, ZEC: 14,
  MAL: 4, MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13, GAL: 6, EPH: 6, PHP: 4, COL: 4,
  '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4, TIT: 3, PHM: 1, HEB: 13, JAS: 5, '1PE': 5, '2PE': 3, '1JN': 5, '2JN': 1,
  '3JN': 1, JUD: 1, REV: 22,
};
const CANON_ORDER = Object.keys(CHAPTERS);

/** Abreviações do guia e nomes por extenso da escala → código USFM. */
const BOOK_NAMES = {
  gn: 'GEN', gênesis: 'GEN', êx: 'EXO', ex: 'EXO', êxodo: 'EXO', lv: 'LEV', levítico: 'LEV', nm: 'NUM', números: 'NUM',
  dt: 'DEU', deuteronômio: 'DEU', js: 'JOS', josué: 'JOS', jz: 'JDG', juízes: 'JDG', rt: 'RUT', rute: 'RUT',
  '1sm': '1SA', '1 samuel': '1SA', '2sm': '2SA', '2 samuel': '2SA', '1rs': '1KI', '1 reis': '1KI', '2rs': '2KI',
  '2 reis': '2KI', '1cr': '1CH', '1 crônicas': '1CH', '2cr': '2CH', '2 crônicas': '2CH', ed: 'EZR', esdras: 'EZR',
  ne: 'NEH', neemias: 'NEH', et: 'EST', ester: 'EST', jó: 'JOB', sl: 'PSA', salmos: 'PSA', pv: 'PRO',
  provérbios: 'PRO', ec: 'ECC', eclesiastes: 'ECC', ct: 'SNG', cantares: 'SNG', is: 'ISA', isaías: 'ISA', jr: 'JER',
  jeremias: 'JER', lm: 'LAM', lamentações: 'LAM', ez: 'EZK', ezequiel: 'EZK', dn: 'DAN', daniel: 'DAN', os: 'HOS',
  oseias: 'HOS', jl: 'JOL', joel: 'JOL', am: 'AMO', amós: 'AMO', ob: 'OBA', obadias: 'OBA', jn: 'JON', jonas: 'JON',
  mq: 'MIC', miqueias: 'MIC', na: 'NAM', naum: 'NAM', hc: 'HAB', habacuque: 'HAB', sf: 'ZEP', sofonias: 'ZEP',
  ag: 'HAG', ageu: 'HAG', zc: 'ZEC', zacarias: 'ZEC', ml: 'MAL', malaquias: 'MAL', mt: 'MAT', mateus: 'MAT',
  mc: 'MRK', marcos: 'MRK', lc: 'LUK', lucas: 'LUK', jo: 'JHN', joão: 'JHN', at: 'ACT', atos: 'ACT', rm: 'ROM',
  romanos: 'ROM', '1co': '1CO', '1 coríntios': '1CO', '2co': '2CO', '2 coríntios': '2CO', gl: 'GAL', gálatas: 'GAL',
  ef: 'EPH', efésios: 'EPH', fp: 'PHP', filipenses: 'PHP', cl: 'COL', colossenses: 'COL', '1ts': '1TH',
  '1 tessalonicenses': '1TH', '2ts': '2TH', '2 tessalonicenses': '2TH', '1tm': '1TI', '1 timóteo': '1TI',
  '2tm': '2TI', '2 timóteo': '2TI', tt: 'TIT', tito: 'TIT', fm: 'PHM', filemom: 'PHM', hb: 'HEB', hebreus: 'HEB',
  tg: 'JAS', tiago: 'JAS', '1pe': '1PE', '1 pedro': '1PE', '2pe': '2PE', '2 pedro': '2PE', '1jo': '1JN',
  '1 joão': '1JN', '2jo': '2JN', '2 joão': '2JN', '3jo': '3JN', '3 joão': '3JN', jd: 'JUD', judas: 'JUD', ap: 'REV',
  apocalipse: 'REV',
};

const SPHERES = {
  igreja: 'igreja',
  família: 'familia',
  educação: 'educacao',
  governo: 'governo',
  economia: 'economia',
  'mídia e comunicação': 'midia_comunicacao',
  'artes e entretenimento': 'artes_entretenimento',
};

/** Precisa bater com src/journey/milestones.ts (há um teste que confere). */
const MILESTONES = { 7: 'Primeira semana', 25: 'Um quarto da jornada', 50: 'Metade do caminho', 75: 'Reta final', 100: 'Jornada completa' };

const norm = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

function bookCode(name, context) {
  const code = BOOK_NAMES[norm(name)];
  if (!code) throw new Error(`${context}: livro não reconhecido "${name}".`);
  return code;
}

/** "Gn 49–50; Êx 1–10" → [{book:'GEN', from:49, to:50}, {book:'EXO', from:1, to:10}] */
function parseReadings(text, context) {
  return text.split(';').map((part) => {
    const t = part.normalize('NFC').trim();
    const m = t.match(/^(.+?)\s+(\d+)(?:\s*[–-]\s*(\d+))?$/);
    const book = bookCode(m ? m[1] : t, context);
    // Livro de um capítulo só pode vir sem número ("2 João", "Judas").
    const from = m ? Number(m[2]) : 1;
    const to = m && m[3] ? Number(m[3]) : from;
    if (from < 1 || to < from || to > CHAPTERS[book]) {
      throw new Error(`${context}: faixa inválida "${t}" para ${book} (${CHAPTERS[book]} capítulos).`);
    }
    return { book, from, to };
  });
}

const canonicalRange = ({ book, from, to }) => (from === to ? `${book} ${from}` : `${book} ${from}-${to}`);

/** "Gn 12:2-3" → "GEN 12:2-3"; "1Rs 3:9" → "1KI 3:9" */
function parseVerse(text, context) {
  const m = text.normalize('NFC').trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*[–-]\s*(\d+))?$/);
  if (!m) throw new Error(`${context}: versículo-base ilegível "${text}".`);
  const book = bookCode(m[1], context);
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > CHAPTERS[book]) throw new Error(`${context}: capítulo ${chapter} fora de ${book}.`);
  return { canonical: `${book} ${chapter}:${m[3]}${m[4] ? `-${m[4]}` : ''}`, book, chapter };
}

/** "Identidade e chamado; santidade; ... nações." → lista sem o ponto final da frase. */
function prayerPoints(text) {
  return text
    .split(';')
    .map((p) => p.trim().replace(/\.$/, '').trim())
    .filter(Boolean);
}

/* --------------------------------------------------------------- leitura */

function readSource(file) {
  const path = join(SOURCE_DIR, file);
  if (!existsSync(path)) throw new Error(`Fonte ausente: ${path}`);
  const buffer = readFileSync(path);
  const zip = readZip(buffer);
  const xml = zip.get('word/document.xml')?.toString('utf8');
  if (!xml) throw new Error(`${file}: não é um .docx (sem word/document.xml).`);
  return { file, sha256: createHash('sha256').update(buffer).digest('hex'), xml };
}

function parseGuide(source) {
  const text = bodyText(source.xml);
  const period = text.match(/(\d{2})\/(\d{2}) a (\d{2})\/(\d{2})\/(\d{4})/);
  if (!period) throw new Error('Guia: período da campanha ("dd/mm a dd/mm/aaaa") não encontrado.');
  const year = Number(period[5]);
  const startDate = `${year}-${period[2]}-${period[1]}`;

  const days = [];
  for (const table of tables(source.xml)) {
    for (const row of table) {
      if (row.length !== 6 || !/^\d+\s*—/.test(row[0])) continue;
      const [dayAndDate, sphere, reading, verse, emphasis, motives] = row.map((c) => c.replace(/\s+/g, ' ').trim());
      const [dayText, dateText] = dayAndDate.split('—').map((s) => s.trim());
      days.push({ day: Number(dayText), date: dateText, sphere, reading, verse, emphasis, motives });
    }
  }
  return { startDate, year, days };
}

function parseSchedule(source) {
  const rows = [];
  for (const table of tables(source.xml)) {
    for (const row of table) {
      if (row.length !== 6 || !/^\d+$/.test(row[0].trim())) continue;
      const [day, date, ministry, leaders, sphere, reading] = row.map((c) => c.replace(/\s+/g, ' ').trim());
      rows.push({ day: Number(day), date, ministry, leaders, sphere, reading });
    }
  }
  return rows;
}

/**
 * Parágrafos do documento, na ordem, com o que precisamos para reconhecer a
 * estrutura da orientação: numeração (título de seção, item, passo), negrito
 * integral e o texto.
 */
function paragraphs(documentXml) {
  const body = documentXml.slice(documentXml.indexOf('<w:body'));
  return body
    .split(/(?=<w:p[ >])/)
    .filter((p) => p.startsWith('<w:p'))
    .map((p) => {
      const runs = (p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []).filter((r) => /<w:t[ >]/.test(r));
      const bold = runs.length > 0 && runs.every((r) => /<w:b\/>|<w:b w:val="(?:1|true)"\/>/.test(r));
      return {
        numId: (p.match(/<w:numId w:val="(\d+)"\/>/) ?? [])[1] ?? null,
        bold,
        text: textOf(p).replace(/\s+/g, ' ').trim(),
      };
    })
    .filter((p) => p.text.length > 0);
}

/**
 * Seções da orientação que fazem sentido para qualquer participante. As demais
 * ("participação e responsabilidade dos ministérios", "responsabilidade do
 * líder") são instruções a líderes e ficam marcadas como não públicas — o app
 * decide o que mostrar; o arquivo derivado guarda o documento inteiro.
 */
const PUBLIC_SECTIONS = [
  'LEITURA DA BÍBLIA',
  'ENCONTRO DIÁRIO ÀS 12H30',
  'TODA REUNIÃO COMEÇARÁ PELO ARREPENDIMENTO',
  'COMO SERÁ A DIREÇÃO DE CADA DIA?',
  'FLUXO DA REUNIÃO',
  'POR QUE O VERSÍCULO MUDA TODOS OS DIAS?',
  'POR QUE O MESMO MONTE APARECE VÁRIAS VEZES?',
  'MAIS DO QUE UMA ESCALA, UMA CULTURA DE ALTAR',
].map(norm);

const FLOW_HEADING = norm('FLUXO DA REUNIÃO');

function parseOrientation(source) {
  const paras = paragraphs(source.xml);
  if (paras.length < 20) throw new Error('Orientação: documento curto demais para ser o esperado.');
  const [titlePara, subtitlePara, ...rest] = paras;

  // Título de seção: parágrafo numerado com a lista 1, ou (no fechamento, sem
  // numeração) parágrafo todo em negrito e em caixa alta que começa por letra.
  const isHeading = (p) =>
    p.numId === '1' || (!p.numId && p.bold && p.text === p.text.toUpperCase() && /^\p{L}/u.test(p.text) && p.text.length > 12);

  const intro = [];
  const sections = [];
  let current = null;
  for (const p of rest) {
    if (isHeading(p)) {
      current = { heading: p.text, public: PUBLIC_SECTIONS.includes(norm(p.text)), blocks: [] };
      sections.push(current);
      continue;
    }
    const block = { kind: p.numId === '3' ? 'step' : p.numId ? 'bullet' : 'paragraph', text: p.text };
    if (!current) {
      // A saudação ("Queridos líderes,") é endereçamento, não conteúdo.
      if (!/^queridos\b/i.test(block.text)) intro.push(block.text);
      continue;
    }
    current.blocks.push(block);
  }

  for (const wanted of PUBLIC_SECTIONS) {
    if (!sections.some((s) => norm(s.heading) === wanted)) throw new Error(`Orientação: seção não encontrada: "${wanted}".`);
  }

  const flowSection = sections.find((s) => norm(s.heading) === FLOW_HEADING);
  const flow = flowSection.blocks
    .filter((b) => b.kind === 'step')
    .map((b, index) => {
      const separator = b.text.indexOf(' - ');
      if (separator < 0) throw new Error(`Orientação: passo do fluxo sem descrição: "${b.text}".`);
      return { step: index + 1, title: b.text.slice(0, separator).trim(), description: b.text.slice(separator + 3).trim() };
    });
  if (flow.length !== 5) throw new Error(`Orientação: esperados 5 passos do fluxo da reunião, encontrados ${flow.length}.`);

  return {
    title: titlePara.text,
    subtitle: subtitlePara.text,
    intro,
    sections,
    flow,
    source: { file: source.file, sha256: source.sha256 },
  };
}

/* ------------------------------------------------------------- montagem */

function expectedDate(startDate, day) {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d) + (day - 1) * 86_400_000);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function build() {
  const rights = readRights();
  const guideSource = readSource(SOURCES.guide);
  const scheduleSource = readSource(SOURCES.schedule);
  const orientationSource = readSource(SOURCES.orientation);
  const guide = parseGuide(guideSource);
  const schedule = parseSchedule(scheduleSource);
  const proposito = parseOrientation(orientationSource);

  const problems = [];
  if (guide.days.length !== 100) problems.push(`Guia com ${guide.days.length} dias (esperado 100).`);
  if (schedule.length !== 100) problems.push(`Escala com ${schedule.length} dias (esperado 100).`);

  const byDay = new Map(schedule.map((r) => [r.day, r]));
  const coverage = new Map(CANON_ORDER.map((b) => [b, new Array(CHAPTERS[b] + 1).fill(0)]));
  const sphereOrder = Object.values(SPHERES);
  const campaignId = `lagoinha-100-dias-${guide.year}`;

  const days = guide.days
    .sort((a, b) => a.day - b.day)
    .map((g) => {
      const ctx = `Dia ${g.day}`;
      if (expectedDate(guide.startDate, g.day) !== g.date) problems.push(`${ctx}: data ${g.date} não segue de ${guide.startDate}.`);

      const sphere = SPHERES[norm(g.sphere)];
      if (!sphere) problems.push(`${ctx}: monte desconhecido "${g.sphere}".`);
      if (sphere && sphere !== sphereOrder[(g.day - 1) % 7]) problems.push(`${ctx}: quebra na rotação dos montes (${g.sphere}).`);

      const ranges = parseReadings(g.reading, ctx);
      let chapters = 0;
      for (const r of ranges) for (let c = r.from; c <= r.to; c += 1) { coverage.get(r.book)[c] += 1; chapters += 1; }

      const verse = parseVerse(g.verse, ctx);
      if (!ranges.some((r) => r.book === verse.book && verse.chapter >= r.from && verse.chapter <= r.to)) {
        problems.push(`${ctx}: versículo-base ${g.verse} fora da leitura "${g.reading}".`);
      }

      const s = byDay.get(g.day);
      if (!s) problems.push(`${ctx}: ausente na escala.`);
      else {
        if (s.date !== g.date) problems.push(`${ctx}: data difere entre guia (${g.date}) e escala (${s.date}).`);
        if (norm(s.sphere) !== norm(g.sphere)) problems.push(`${ctx}: monte difere entre guia e escala.`);
        const a = ranges.map(canonicalRange).join('; ');
        const b = parseReadings(s.reading, `${ctx} (escala)`).map(canonicalRange).join('; ');
        if (a !== b) problems.push(`${ctx}: leitura difere entre guia (${a}) e escala (${b}).`);
        if (!s.ministry) problems.push(`${ctx}: escala sem ministério.`);
      }

      return {
        campaign_id: campaignId,
        day_number: g.day,
        title: g.emphasis,
        theme: null,
        theme_highlight: null,
        sphere: sphere ?? null,
        key_verse_reference: verse.canonical,
        official_direction: null,
        prayer_focus: g.motives,
        prayer_points: prayerPoints(g.motives),
        altar: s ? { ministry: s.ministry, leaders_label: s.leaders || null } : null,
        milestone: MILESTONES[g.day] ?? null,
        next_day_teaser: null,
        publish_status: 'published',
        readings: ranges.map((r, index) => ({ sort_order: index + 1, canonical_reference: canonicalRange(r) })),
        _chapters: chapters,
      };
    });

  for (const [book, counts] of coverage) {
    for (let c = 1; c <= CHAPTERS[book]; c += 1) {
      if (counts[c] === 0) problems.push(`Capítulo não coberto: ${book} ${c}.`);
      if (counts[c] > 1) problems.push(`Capítulo repetido: ${book} ${c} (${counts[c]}x).`);
    }
  }

  if (problems.length) {
    throw new Error(`Material inconsistente (${problems.length} problema(s)):\n- ${problems.join('\n- ')}`);
  }

  const totalChapters = days.reduce((n, d) => n + d._chapters, 0);
  const chaptersPerDay = days.map((d) => d._chapters);
  for (const d of days) delete d._chapters;

  const dataset = {
    campaign: {
      id: campaignId,
      title: '100 Dias',
      subtitle: 'Palavra • Consagração • Adoração • Intercessão',
      start_date: guide.startDate,
      timezone: 'America/Sao_Paulo',
      utc_offset_minutes: -180,
      total_days: 100,
      status: 'active',
    },
    days,
    provenance: {
      source_type: 'original_church_content',
      source_name: `100 Dias — Guia Diário de Intercessão (${guide.startDate} a ${guide.year}-12-31)`,
      source_external_id: null,
      source_provider: 'Lagoinha — material recebido de Davi em 2026-09-19 (autoria no arquivo: Leandra Pedroso, 28/08/2026)',
      // Direitos vêm de content/100-dias-2026/rights.json: fica "pending_authorization"
      // até a igreja autorizar por escrito; nomes de líderes só com liberação explícita.
      rights_status: rights.rights_status,
      rights_reference: rights.rights_reference,
      content_version: '1.0.0',
      leader_names_authorized: rights.leader_names_authorized,
      source_files: [guideSource, scheduleSource, orientationSource].map(({ file, sha256 }) => ({ file, sha256 })),
      generated_by: 'scripts/convert-100-dias.mjs',
    },
    DEV_ONLY: false,
    NOT_PRODUCTION_CONTENT: false,
  };

  return {
    json: `${JSON.stringify(dataset, null, 2)}\n`,
    propositoJson: `${JSON.stringify(proposito, null, 2)}\n`,
    summary: {
      days: days.length,
      totalChapters,
      minChapters: Math.min(...chaptersPerDay),
      maxChapters: Math.max(...chaptersPerDay),
      ministries: new Set(schedule.map((r) => r.ministry)).size,
      startDate: guide.startDate,
      rightsStatus: rights.rights_status,
    },
  };
}

/* ------------------------------------------------------------------- CLI */

const check = process.argv.includes('--check');
const requireAuthorized = process.argv.includes('--require-authorized');
try {
  const { json, propositoJson, summary } = build();
  const outputs = [
    [OUTPUT, json],
    [PROPOSITO_OUTPUT, propositoJson],
  ];
  if (check) {
    for (const [path, expected] of outputs) {
      const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
      if (current !== expected) {
        console.error(`DESATUALIZADO: ${path} não corresponde às fontes. Rode: node scripts/convert-100-dias.mjs`);
        process.exit(1);
      }
    }
    console.log('OK: dataset.json e proposito.json correspondem às fontes.');
  } else {
    for (const [path, content] of outputs) {
      writeFileSync(path, content);
      console.log(`Gerado ${path}`);
    }
  }
  if (requireAuthorized && summary.rightsStatus !== 'authorized') {
    // Para rodar antes de qualquer build de loja: sem autorização escrita, sem build.
    console.error(`BLOQUEADO: rights_status é "${summary.rightsStatus}"; build de loja exige "authorized" (content/100-dias-2026/rights.json).`);
    process.exit(1);
  }
  console.log(
    `${summary.days} dias a partir de ${summary.startDate} · ${summary.totalChapters} capítulos ` +
      `(${summary.minChapters}–${summary.maxChapters}/dia) · ${summary.ministries} ministérios na escala · direitos: ${summary.rightsStatus}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
