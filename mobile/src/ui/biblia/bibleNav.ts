import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, type Href } from 'expo-router';

import { BOOKS, getBook, type Book } from '@/bible/books';
import type { CanonicalReference } from '@/bible/references';

/**
 * Navegação da aba Bíblia (leitura livre). Nada aqui toca na Jornada: a leitura
 * livre NÃO conclui dia nenhum da campanha e tem a própria posição salva, em
 * chave separada da do leitor do dia (`reader-position:v1`).
 */

/** Cânon protestante: os 39 primeiros livros são o Antigo Testamento (fato público). */
export const OLD_TESTAMENT_COUNT = 39;
export const OLD_TESTAMENT: readonly Book[] = BOOKS.slice(0, OLD_TESTAMENT_COUNT);
export const NEW_TESTAMENT: readonly Book[] = BOOKS.slice(OLD_TESTAMENT_COUNT);

export type BiblePosition = { book: string; chapter: number };

/** Livro e capítulo existentes no cânon; `null` para qualquer outra coisa. */
export function resolveChapter(book: unknown, chapter: unknown): { book: Book; chapter: number } | null {
  if (typeof book !== 'string') return null;
  const found = getBook(book.toUpperCase());
  const n = typeof chapter === 'number' ? chapter : Number(chapter);
  if (!found || !Number.isInteger(n) || n < 1 || n > found.chapters) return null;
  return { book: found, chapter: n };
}

/** O capítulo inteiro, no formato que o provedor entende. */
export function chapterReference(book: string, chapter: number): CanonicalReference {
  return { book, chapterStart: chapter, chapterEnd: chapter, verseStart: null, verseEnd: null };
}

/** Capítulo seguinte; atravessa livros (Gênesis 50 → Êxodo 1). `null` depois de Apocalipse 22. */
export function nextChapter(position: BiblePosition): BiblePosition | null {
  const index = BOOKS.findIndex((b) => b.id === position.book);
  if (index < 0) return null;
  if (position.chapter < BOOKS[index].chapters) return { book: position.book, chapter: position.chapter + 1 };
  const following = BOOKS[index + 1];
  return following ? { book: following.id, chapter: 1 } : null;
}

/** Capítulo anterior; atravessa livros (Êxodo 1 → Gênesis 50). `null` antes de Gênesis 1. */
export function previousChapter(position: BiblePosition): BiblePosition | null {
  const index = BOOKS.findIndex((b) => b.id === position.book);
  if (index < 0) return null;
  if (position.chapter > 1) return { book: position.book, chapter: position.chapter - 1 };
  const preceding = BOOKS[index - 1];
  return preceding ? { book: preceding.id, chapter: preceding.chapters } : null;
}

export function chapterLabel(position: BiblePosition): string {
  return `${getBook(position.book)?.name ?? position.book} ${position.chapter}`;
}

/**
 * Rotas da leitura livre. Montadas como texto e afirmadas como `Href` porque
 * os tipos de rota do expo-router (`.expo/types`) só se regeneram com o
 * servidor de desenvolvimento, e as rotas /biblia são novas.
 */
export function bookHref(book: string): Href {
  return `/biblia/${book}` as Href;
}

export function chapterHref(position: BiblePosition): Href {
  return `/biblia/${position.book}/${position.chapter}` as Href;
}

/* ------------------------------------------------------- última posição */

/** LOCAL-ONLY. Separada da posição do leitor do dia de propósito. */
export const BIBLE_POSITION_KEY = 'biblia-position:v1';

/** Gravação de conveniência: se o disco recusar, a leitura segue igual. */
export async function saveBiblePosition(position: BiblePosition): Promise<void> {
  try {
    await AsyncStorage.setItem(BIBLE_POSITION_KEY, JSON.stringify(position));
  } catch {
    // Sem posição salva a aba só não mostra "Continuar em".
  }
}

export async function loadBiblePosition(): Promise<BiblePosition | null> {
  try {
    const raw = await AsyncStorage.getItem(BIBLE_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiblePosition>;
    const resolved = resolveChapter(parsed.book, parsed.chapter);
    return resolved ? { book: resolved.book.id, chapter: resolved.chapter } : null;
  } catch {
    return null;
  }
}

/** Voltar das telas internas. Sem pilha (link direto) vai para a aba Bíblia, não para a Jornada. */
export function backToBible() {
  if (router.canGoBack()) router.back();
  else router.replace('/biblia' as Href);
}
