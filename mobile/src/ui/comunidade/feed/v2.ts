import type { CommunityApi } from '@/community/api';
import {
  type ActivityItem,
  type AmenFace,
  type CommunityStatus,
  type DiaryFields,
  type FeedCursor,
  type FeedPage,
  type FeedPost,
  type FeedScope,
  MAX_AMEN_FACES,
  MAX_POST_PHOTOS,
  type PostKind,
  POST_KINDS,
  type VerseAttachment,
} from '@/community/types';
import { getBook } from '@/bible/books';

/**
 * Comunidade no formato de "diário compartilhado" (FEEDBACK_DAVI_2026-09-22,
 * F1, F3, F4, F6, F8): o que as telas do feed leem do cliente da Comunidade.
 *
 * Os campos do diário (DiaryFields em types.ts) são opcionais em FeedPost e
 * MyPost; o cliente real e a demonstração os preenchem, mas as telas continuam
 * aceitando o formato antigo: uma foto, sem tipo, "Toda a igreja", sem número.
 */

export type { ActivityItem, AmenFace, FeedScope, PostKind };
export type FeedPostExtras = Partial<DiaryFields>;
export const MAX_PHOTOS = MAX_POST_PHOTOS;
export const MAX_FACES = MAX_AMEN_FACES;

const KIND_LABEL: Record<PostKind, string> = {
  leitura: 'Leitura do dia',
  oracao: 'Oração',
  jejum: 'Jejum',
  versiculo: 'Versículo',
};

export function kindLabel(kind: PostKind | null | undefined): string | null {
  return kind && POST_KINDS.includes(kind) ? KIND_LABEL[kind] : null;
}

/** "João 3:16" / "Salmos 23:1-3": só a referência, nunca o texto bíblico. */
export function verseLabel(verse: VerseAttachment | null | undefined): string | null {
  if (!verse) return null;
  const book = getBook(verse.book)?.name;
  if (!book) return null;
  const end = verse.verseEnd && verse.verseEnd > verse.verseStart ? `-${verse.verseEnd}` : '';
  return `${book} ${verse.chapter}:${verse.verseStart}${end}`;
}

/** "Leitura do dia · Dia 3", "Versículo · João 3:16", "Oração", "Dia 3" — ou nada. */
export function activityLine(
  kind: PostKind | null,
  dayNumber: number | null,
  verse: VerseAttachment | null = null,
): string | null {
  const parts = [kindLabel(kind), verseLabel(verse), dayNumber ? `Dia ${dayNumber}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export type FeedExtras = {
  kind: PostKind | null;
  verse: VerseAttachment | null;
  photoPaths: string[];
  audience: FeedScope;
  audienceMinistry: string | null;
  amenCount: number;
  amenFaces: AmenFace[];
  commentCount: number;
};

/** Lê os campos novos com segurança; o que faltar vira o padrão honesto. */
export function feedExtras(post: FeedPost): FeedExtras {
  const listed = Array.isArray(post.photoPaths) ? post.photoPaths.filter((p) => typeof p === 'string' && p) : [];
  const photoPaths = (listed.length ? listed : post.photoPath ? [post.photoPath] : []).slice(0, MAX_PHOTOS);
  const faces = Array.isArray(post.amenFaces)
    ? post.amenFaces.filter((f) => f && typeof f.name === 'string').slice(0, MAX_FACES)
    : [];
  const amenCount = Math.max(count(post.amenCount), faces.length, post.iSaidAmen ? 1 : 0);
  const audience: FeedScope = post.audience === 'ministerio' ? 'ministerio' : 'igreja';
  return {
    kind: post.kind && POST_KINDS.includes(post.kind) ? post.kind : null,
    verse: post.verse ?? null,
    photoPaths,
    audience,
    audienceMinistry: audience === 'ministerio' ? (post.audienceMinistry ?? null) : null,
    amenCount,
    amenFaces: faces,
    commentCount: count(post.commentCount),
  };
}

/** Página do feed num escopo (F6). */
export function fetchFeedPage(api: CommunityApi, cursor: FeedCursor | null, scope: FeedScope): Promise<FeedPage> {
  return api.feedPage(cursor, { scope });
}

/* ------------------------------------------------------------- atividade (F8) */

export type ActivityApi = {
  myActivity(): Promise<ActivityItem[]>;
  markActivitySeen(): Promise<void>;
};

/**
 * O cliente sabe listar a atividade? O real sabe; um cliente sem isso (a
 * demonstração, por enquanto) faz a tela dizer, em vez de inventar.
 */
export function activityApi(api: CommunityApi): ActivityApi | null {
  const maybe = api as unknown as Partial<ActivityApi>;
  if (typeof maybe.myActivity !== 'function') return null;
  return {
    myActivity: () => maybe.myActivity!.call(api),
    markActivitySeen: () =>
      typeof maybe.markActivitySeen === 'function' ? maybe.markActivitySeen.call(api) : Promise.resolve(),
  };
}

/** Ponto no sino: o estado da comunidade diz se há novidade (`hasNewActivity`). */
export function hasNewActivity(status: CommunityStatus): boolean {
  return status.hasNewActivity === true;
}

/** "Ana disse Amém na sua publicação" / "Ana comentou na sua publicação". */
export function activityText(item: ActivityItem): string {
  return item.kind === 'amen'
    ? `${item.actorName} disse Amém na sua publicação`
    : `${item.actorName} comentou na sua publicação`;
}

/** "12 pessoas disseram Amém" / "Você e mais 2 disseram Amém" (leitor de tela). */
export function amenSpoken(countValue: number, iSaidAmen: boolean, faces: AmenFace[]): string {
  if (countValue <= 0) return 'Ninguém disse Amém ainda';
  if (iSaidAmen) {
    const others = countValue - 1;
    if (others <= 0) return 'Você disse Amém';
    return `Você e mais ${others} ${others === 1 ? 'pessoa disseram' : 'pessoas disseram'} Amém`;
  }
  const names = faces.filter((f) => !f.isMine).map((f) => f.name);
  if (countValue === 1 && names[0]) return `${names[0]} disse Amém`;
  return `${countValue} ${countValue === 1 ? 'pessoa disse' : 'pessoas disseram'} Amém`;
}
