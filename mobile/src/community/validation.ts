/**
 * Regras puras que espelham os limites do servidor, para o app avisar antes de
 * enviar. O servidor confere de novo (a fonte da verdade é o banco).
 */

export const LIMITS = {
  postBody: 2000,
  commentBody: 1000,
  displayName: 40,
  reportDetails: 500,
  /** Tamanho de página do feed. Precisa ser igual ao `limit 20` de private.community_feed. */
  feedPage: 20,
} as const;

/** Alfabeto dos códigos de entrada: sem 0/O e 1/I, para ler em voz alta no culto. */
const INVITE_ALPHABET = /^[A-HJ-NP-Z2-9]{10}$/;

/**
 * Normaliza o que a pessoa digitou ("abcde 23456", "ABCDE-23456") para os 10
 * caracteres que o servidor compara. null = não tem cara de código (nem envia,
 * para não gastar uma das 5 tentativas por hora).
 */
export function normalizeInviteCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return INVITE_ALPHABET.test(compact) ? compact : null;
}

/** Formato de exibição: XXXXX-XXXXX. */
export function formatInviteCode(normalized: string): string {
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 10)}`;
}

/** Texto aparado, ou null se ficou vazio. */
export function cleanText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Comprimento em caracteres como o Postgres conta (code points, não unidades UTF-16). */
export function charLength(value: string): number {
  return Array.from(value).length;
}

export function isValidDisplayName(name: string): boolean {
  const cleaned = cleanText(name);
  return cleaned !== null && charLength(cleaned) <= LIMITS.displayName;
}

export function isValidPostBody(body: string | null): boolean {
  return body === null || charLength(body) <= LIMITS.postBody;
}

export function isValidCommentBody(body: string | null): boolean {
  return body !== null && charLength(body) <= LIMITS.commentBody;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
