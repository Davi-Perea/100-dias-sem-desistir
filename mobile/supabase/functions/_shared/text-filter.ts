/**
 * Filtro de palavras em pt-BR, sem serviço externo. Sem nada de Deno.
 *
 * Duas camadas (COMUNIDADE_V2_DEPLOY.md §6):
 *  1. SÍNCRONA, no banco: private.community_text_verdict segura o texto ANTES de
 *     aparecer (link, contato, termo da tabela private.community_filter_terms).
 *     A Edge Function `moderate-text` mantém a lista base dentro dessa tabela
 *     (ação sync_terms), então a lista base vale já na primeira camada.
 *  2. SEGUNDA PASSADA, aqui: logo depois de um texto aparecer, o banco chama
 *     `moderate-text` (ação recheck). Esta versão também pega disfarces que o SQL
 *     não pega (letra repetida "merdaaa", números no lugar de letras "p0rr4",
 *     letras separadas "p u t a"). Se pegar, o texto volta para "Em análise".
 *
 * O filtro NUNCA recusa sozinho: só segura para uma pessoa olhar.
 * `textVerdict` imita private.community_text_verdict para link e contato.
 */

export type HoldReason = 'link' | 'contato' | 'termo';

export type Verdict = { hold: HoldReason | null; matched: string[] };

/** Minúsculas e sem acento (igual a private.community_normalize, mais abrangente). */
export function normalizeText(input: string | null | undefined): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Só letras e números, separados por um espaço. */
export function tokens(input: string): string {
  return input
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

/** Troca número/símbolo por letra, antes de os símbolos virarem espaço. */
export function deleet(normalized: string): string {
  return normalized.replace(/[013457@$]/g, (ch) => LEET[ch] ?? ch);
}

/** "merdaaaa" → "merda"; aplicado dos dois lados (texto e termo). */
export function squeeze(value: string): string {
  return value.replace(/([a-z0-9])\1+/g, '$1');
}

/** "p u t a" → "puta": junta sequências de 3 ou mais letras soltas. */
export function joinSingleLetters(tokenized: string): string {
  return tokenized.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (run) => run.replace(/ /g, ''));
}

const TERM_RE = /^[a-z0-9]+( [a-z0-9]+)*$/;

/** Forma canônica de um termo da lista. null = termo inválido (curto, longo ou vazio). */
export function normalizeTerm(raw: string): string | null {
  const term = tokens(normalizeText(raw));
  return term.length >= 2 && term.length <= 80 && TERM_RE.test(term) ? term : null;
}

/**
 * Lista configurada = base versionada + FILTER_EXTRA_TERMS − FILTER_DISABLED_TERMS
 * (os dois segredos são listas separadas por vírgula).
 */
export function configuredTerms(
  base: readonly string[],
  extraRaw: string | null | undefined,
  disabledRaw: string | null | undefined,
): string[] {
  const split = (raw: string | null | undefined) =>
    (raw ?? '')
      .split(',')
      .map((t) => normalizeTerm(t))
      .filter((t): t is string => t !== null);
  const disabled = new Set(split(disabledRaw));
  const all = new Set<string>();
  for (const t of [...base.map((b) => normalizeTerm(b)), ...split(extraRaw)]) {
    if (t && !disabled.has(t)) all.add(t);
  }
  return [...all].sort();
}

const LINK_RE = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|br|net|org|me|ly|io|app|link)(\/|\b))/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/;

function containsPhrase(haystack: string, phrase: string): boolean {
  return phrase.length > 0 && ` ${haystack} `.includes(` ${phrase} `);
}

export function textVerdict(input: string | null | undefined, terms: readonly string[]): Verdict {
  const normalized = normalizeText(input);
  if (LINK_RE.test(normalized)) return { hold: 'link', matched: [] };
  if (EMAIL_RE.test(normalized)) return { hold: 'contato', matched: [] };
  if (/\d{8,}/.test(normalized.replace(/[\s().-]/g, ''))) return { hold: 'contato', matched: [] };

  const plain = tokens(normalized);
  const disguised = squeeze(joinSingleLetters(tokens(deleet(normalized))));
  const matched: string[] = [];
  for (const term of terms) {
    if (containsPhrase(plain, term) || containsPhrase(disguised, squeeze(term))) matched.push(term);
  }
  return matched.length > 0 ? { hold: 'termo', matched } : { hold: null, matched: [] };
}
