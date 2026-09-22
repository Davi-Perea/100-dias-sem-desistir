import { getBook } from '@/bible/books';
import { MAX_POST_PHOTOS, type FeedScope, type NewPost, type PostKind } from '@/community/types';
import type { VerseRef } from '@/marks/marksStore';

/**
 * Rascunho do "Criar post" (F2, feedback do fundador de 2026-09-22). Puro, para
 * testar sem tela. A saída é o `NewPost` de src/community/types.ts (o contrato
 * de `api.createPost` e de `create_community_post`).
 *
 * O que a pessoa anexa sai do aparelho SÓ porque ela escolheu anexar ao post que
 * ela mesma publica. Nada é lido de um dado de fé e enviado por conta própria:
 *   - Leitura do dia: o número do dia (a referência do guia só aparece no chip;
 *     o app formata a referência, não reescreve o texto da igreja);
 *   - Versículo: SÓ a referência de um versículo que a pessoa marcou. A cor da
 *     marca, a anotação e o texto bíblico NUNCA vão ao servidor (o texto da
 *     Bíblia Livre é mostrado a partir da referência, no aparelho);
 *   - Oração e Jejum: só o tipo da atividade. Quantos dias de jejum, quais dias
 *     e o que ela anotou continuam só no aparelho.
 */

export { MAX_POST_PHOTOS };

export type Audience = FeedScope;

export type ReadingAttachment = {
  kind: 'leitura';
  day: number;
  /** "Gênesis 39–45 · Salmos 12", já formatado a partir do guia. null = o dia não tem leitura. */
  reference: string | null;
};

export type VerseChip = {
  kind: 'versiculo';
  ref: VerseRef;
  /** "João 3:16". */
  label: string;
  /** Texto da Bíblia Livre, só para a prévia no aparelho (nunca vai à rede). */
  text: string | null;
  /** Nome da tradução, para a atribuição (CC BY) junto da prévia. */
  translation: string | null;
};

export type Attachment = ReadingAttachment | VerseChip | { kind: 'oracao' } | { kind: 'jejum' };
export type AttachmentKind = Attachment['kind'];

/** Ordem fixa dos chips. */
const ORDER: readonly AttachmentKind[] = ['leitura', 'versiculo', 'oracao', 'jejum'];

/** Nome da atividade, como aparece no cartão do feed (F1). */
export const ACTIVITY_LABEL: Record<AttachmentKind, string> = {
  leitura: 'Leitura do dia',
  versiculo: 'Versículo',
  oracao: 'Oração',
  jejum: 'Jejum',
};

/** "João 3:16" a partir da referência guardada na marca. */
export function verseLabel(ref: VerseRef): string {
  const name = getBook(ref.book)?.name ?? ref.book;
  return `${name} ${ref.chapter}:${ref.verse}`;
}

/** Referência canônica portável ("JHN 3:16"), para buscar o texto no aparelho. */
export function verseCanonical(ref: VerseRef): string {
  return `${ref.book} ${ref.chapter}:${ref.verse}`;
}

/** "Dia 17 · Gênesis 39–45" (sem referência: só "Dia 17"). */
export function readingLabel(day: number, reference: string | null): string {
  return reference ? `Dia ${day} · ${reference}` : `Dia ${day}`;
}

/** Texto do chip. */
export function chipLabel(attachment: Attachment): string {
  switch (attachment.kind) {
    case 'leitura':
      return readingLabel(attachment.day, attachment.reference);
    case 'versiculo':
      return attachment.label;
    case 'oracao':
      return 'Oração';
    case 'jejum':
      return 'Jejum';
  }
}

/** Nome falado do "x" do chip. */
export function removeLabel(attachment: Attachment): string {
  return `Tirar ${ACTIVITY_LABEL[attachment.kind].toLocaleLowerCase('pt-BR')}: ${chipLabel(attachment)}`;
}

/**
 * Oração e Jejum são o TIPO do post (um só por post, como no servidor): anexar
 * um tira o outro. Leitura (o dia) e Versículo (a referência) são campos
 * próprios e convivem com qualquer tipo.
 */
const EXCLUSIVE: Partial<Record<AttachmentKind, AttachmentKind>> = {
  oracao: 'jejum',
  jejum: 'oracao',
};

/** Põe (ou troca) o anexo daquele tipo. Um de cada tipo por post. */
export function upsertAttachment(list: readonly Attachment[], next: Attachment): Attachment[] {
  const rival = EXCLUSIVE[next.kind];
  const others = list.filter((item) => item.kind !== next.kind && item.kind !== rival);
  return sortAttachments([...others, next]);
}

export function removeAttachment(list: readonly Attachment[], kind: AttachmentKind): Attachment[] {
  return list.filter((item) => item.kind !== kind);
}

export function hasAttachment(list: readonly Attachment[], kind: AttachmentKind): boolean {
  return list.some((item) => item.kind === kind);
}

function sortAttachments(list: Attachment[]): Attachment[] {
  return [...list].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/**
 * Tipo da atividade do post (F1): Oração ou Jejum, se anexados; senão Leitura
 * do dia; senão Versículo; sem nada, null ('livre' no servidor).
 */
export function postKind(list: readonly Attachment[]): PostKind | null {
  for (const kind of ['oracao', 'jejum', 'leitura', 'versiculo'] as const) {
    if (hasAttachment(list, kind)) return kind;
  }
  return null;
}

/* ----------------------------------------------------------- enviar ou não */

export type DraftState = {
  /** Já limpo (`cleanText`): null = sem texto. */
  body: string | null;
  photoCount: number;
  attachments: readonly Attachment[];
};

/** Tem conteúdo para publicar? Texto, foto ou qualquer anexo (o servidor recusa só o post vazio). */
export function hasContent(draft: DraftState): boolean {
  return draft.body !== null || draft.photoCount > 0 || draft.attachments.length > 0;
}

/** Tem algo que se perderia ao cancelar? */
export function isDirty(draft: DraftState, preattachedDay: number | null): boolean {
  if (draft.body !== null || draft.photoCount > 0) return true;
  // O dia que já veio anexado (de "Dia N concluído") não conta como algo que a pessoa fez.
  return draft.attachments.some((item) => !(item.kind === 'leitura' && item.day === preattachedDay));
}

/* -------------------------------------------------------- o que vai à rede */

/**
 * Só `photoPaths` (o `photoPath` antigo fica de fora: `normalizeNewPost` soma os
 * dois, e mandar a mesma foto nos dois seria "foto repetida").
 */
export function buildNewPost(input: {
  body: string | null;
  photoPaths: readonly string[];
  attachments: readonly Attachment[];
  audience: Audience;
}): NewPost {
  const photos = input.photoPaths.slice(0, MAX_POST_PHOTOS);
  const reading = input.attachments.find((item): item is ReadingAttachment => item.kind === 'leitura');
  const verse = input.attachments.find((item): item is VerseChip => item.kind === 'versiculo');
  return {
    body: input.body,
    photoPaths: photos,
    day: reading ? reading.day : null,
    kind: postKind(input.attachments),
    verse: verse
      ? {
          book: verse.ref.book,
          chapter: verse.ref.chapter,
          verseStart: verse.ref.verse,
          verseEnd: null,
        }
      : null,
    audience: input.audience,
  };
}

/* ------------------------------------------------------------------ público

   Não há mais escolha de público (2026-09-22): todo post vai para a igreja
   inteira, e `buildNewPost` recebe sempre 'igreja'. O tipo `Audience` continua
   porque é o contrato de `NewPost`, que o servidor ainda conhece. */
