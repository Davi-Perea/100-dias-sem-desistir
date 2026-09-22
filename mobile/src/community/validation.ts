import { getBook } from '@/bible/books';

import type { FeedScope, InlineAccept, NewPost, PostKind, VerseAttachment } from './types';
import { POST_KINDS } from './types';

/**
 * Regras puras que espelham os limites do servidor, para o app avisar antes de
 * enviar. O servidor confere de novo (a fonte da verdade é o banco).
 */

export const LIMITS = {
  postBody: 2000,
  commentBody: 1000,
  displayName: 40,
  /** Bio opcional do perfil (C4). Igual ao check da coluna community_profiles.bio. */
  bio: 160,
  ministry: 80,
  email: 254,
  reportDetails: 500,
  /** Tamanho de página do feed. Precisa ser igual ao `limit 20` de private.community_feed. */
  feedPage: 20,
  /** Fotos por post (F1). Igual ao check de community_post_photos.sort_order (0–3). */
  postPhotos: 4,
  /** Maior versículo do cânon (Salmo 119:176). Igual ao check de community_posts.verse_start. */
  verse: 176,
} as const;

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

/**
 * Referência de versículo anexada ao post (F1): livro do cânon (código USFM),
 * capítulo que existe no livro e versículos em ordem. Só a referência: o texto
 * bíblico nunca vai ao servidor. O servidor confere de novo (private.is_bible_book).
 */
export function isValidVerse(verse: VerseAttachment): boolean {
  const book = getBook(verse.book);
  if (!book) return false;
  const { chapter, verseStart, verseEnd } = verse;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return false;
  if (!Number.isInteger(verseStart) || verseStart < 1 || verseStart > LIMITS.verse) return false;
  if (verseEnd !== null && (!Number.isInteger(verseEnd) || verseEnd < verseStart || verseEnd > LIMITS.verse)) return false;
  return true;
}

/** Post pronto para enviar (F1), depois das mesmas regras do servidor. */
export type NormalizedPost = {
  body: string | null;
  photoPaths: string[];
  day: number | null;
  kind: PostKind | null;
  verse: VerseAttachment | null;
  /**
   * Sempre 'igreja' desde 2026-09-22: todo post vai para a igreja inteira. O
   * campo continua no tipo porque o servidor ainda guarda a coluna `audience`
   * (linhas antigas de ministério continuam restritas).
   */
  audience: FeedScope;
};

/**
 * Confere a entrada de createPost com as regras do servidor
 * (private.create_community_post): até 4 fotos sem repetir, texto até 2000,
 * dia 1–100, tipo da lista, "Versículo" com referência válida e nada totalmente
 * vazio. `isPhoto` diz que caminho de foto é aceito (o real exige '<uuid>.jpg';
 * a demonstração tem os seus). Devolve null quando a entrada não pode sair do
 * aparelho.
 *
 * O público (`input.audience`) é IGNORADO desde 2026-09-22: todo post vai para a
 * igreja inteira e o servidor recusa qualquer outro valor (22023). A tela que
 * ainda oferece a escolha precisa perdê-la (ver "pedidos").
 */
export function normalizeNewPost(input: NewPost, isPhoto: (path: string) => boolean): NormalizedPost | null {
  const body = cleanText(input.body);
  // photoPath (formato antigo) já contido em photoPaths não conta duas vezes;
  // repetição DENTRO de photoPaths continua recusada.
  const listed = input.photoPaths ?? [];
  const photoPaths = input.photoPath && !listed.includes(input.photoPath) ? [...listed, input.photoPath] : [...listed];
  if (photoPaths.length > LIMITS.postPhotos || new Set(photoPaths).size !== photoPaths.length) return null;
  if (photoPaths.some((p) => typeof p !== 'string' || !isPhoto(p))) return null;
  if (!isValidPostBody(body)) return null;
  const day = input.day ?? null;
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 100)) return null;
  const kind = input.kind ?? null;
  if (kind !== null && !POST_KINDS.includes(kind)) return null;
  const verse = input.verse ?? null;
  if (verse !== null && !isValidVerse(verse)) return null;
  if (kind === 'versiculo' && !verse) return null;
  if (!body && photoPaths.length === 0 && day === null && !verse && kind === null) return null;
  return { body, photoPaths, day, kind, verse, audience: 'igreja' };
}

/* -------------------------------------------- o aceite que vai junto com a ação */

const SHA256 = /^[0-9a-f]{64}$/i;

/**
 * O corpo `accept_terms` de create_community_post / create_community_comment /
 * set_amen / set_comment_amen (migration 20260923070000_comunidade_aceite_no_ato).
 * Espelha private.apply_inline_accept:
 *   - `confirms_16` é OBRIGATÓRIO (é o que a linha embaixo do botão diz);
 *   - cada finalidade vai como par versão + sha256 do texto EXATO mostrado;
 *   - `name` só viaja quando a pessoa ainda não tem nome (o servidor não troca
 *     nome já escolhido).
 * Devolve null SÓ quando o aceite não pode sair do aparelho (hash malformado,
 * versão vazia, confirms16 diferente de true): aí quem chama levanta
 * 'invalid_input' em vez de mandar prova quebrada ao servidor. Quem já aceitou
 * não passa por aqui — manda `accept_terms: null`.
 */
export function normalizeInlineAccept(accept: InlineAccept): Record<string, unknown> | null {
  if (accept.confirms16 !== true) return null;
  const args: Record<string, unknown> = { confirms_16: true, app_version: accept.appVersion };
  const name = cleanText(accept.name);
  if (name !== null) {
    if (!isValidDisplayName(name)) return null;
    args.name = name;
  }
  for (const [key, doc] of [
    ['rules', accept.rules],
    ['consent', accept.consent],
  ] as const) {
    if (!doc) continue;
    const version = cleanText(doc.version);
    if (version === null || !SHA256.test(doc.sha256)) return null;
    args[`${key}_version`] = version;
    args[`${key}_sha256`] = doc.sha256.toLowerCase();
  }
  // Sem nenhuma finalidade, o corpo só confirmaria 16+ — o que é um aceite legítimo
  // para quem já aceitou os textos e ainda não declarou a idade.
  return args;
}
