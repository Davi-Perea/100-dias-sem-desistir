import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { BOOKS, getBook, type Book } from '@/bible/books';
import { createWriteQueue } from '@/progress/writeQueue';

import { isHighlightId, type HighlightId } from './colors';

/**
 * Marca-texto e anotação por versículo (item B2 do feedback de 2026-09-22).
 *
 * LOCAL-ONLY, como a reflexão: o que a pessoa marca e escreve sobre a Bíblia é
 * dado de convicção religiosa (LGPD art. 5º, II). Não vai ao backend, não entra
 * em analytics, não é analisado. Uma chave só, fora de qualquer campanha: a
 * marca é do versículo, vale no leitor do dia e na aba Bíblia.
 *
 * O texto bíblico NÃO é guardado aqui, só a referência (livro, capítulo,
 * versículo). A lista de anotações mostra a referência e a anotação da pessoa.
 *
 * PER-02: grava no disco e só então atualiza o cache. Cada gravação parte do
 * que está NO DISCO, não do cache: se "Apagar meus dados" limpou o AsyncStorage
 * por fora (sem passar por `wipeAllMarks`), a próxima marca não devolve ao
 * disco as marcas apagadas.
 */
export type VerseRef = { book: string; chapter: number; verse: number };

export type VerseMark = VerseRef & {
  color: HighlightId | null;
  /** Anotação da pessoa; '' quando não há. */
  note: string;
  updatedAt: string;
};

export type Marks = { byVerse: Record<string, VerseMark> };

export const MARKS_KEY = 'verse-marks:v1';
/** Teto da anotação: é nota de margem, não diário. */
export const NOTE_MAX_LENGTH = 2000;

const EMPTY: Marks = { byVerse: {} };

export const verseKey = (ref: VerseRef) => `${ref.book}.${ref.chapter}.${ref.verse}`;

let cache: Marks | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const enqueue = createWriteQueue();

function parse(raw: string | null): Marks {
  if (!raw) return EMPTY;
  const parsed = JSON.parse(raw) as { byVerse?: Record<string, unknown> };
  const byVerse: Marks['byVerse'] = {};
  for (const value of Object.values(parsed.byVerse ?? {})) {
    const entry = value as Partial<VerseMark> | null;
    if (!entry || typeof entry.book !== 'string' || !getBook(entry.book)) continue;
    if (!Number.isInteger(entry.chapter) || !Number.isInteger(entry.verse)) continue;
    const color = isHighlightId(entry.color) ? entry.color : null;
    const note = typeof entry.note === 'string' ? entry.note : '';
    if (!color && !note) continue;
    const mark: VerseMark = {
      book: entry.book,
      chapter: entry.chapter as number,
      verse: entry.verse as number,
      color,
      note,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
    };
    byVerse[verseKey(mark)] = mark;
  }
  return { byVerse };
}

export async function loadMarks(): Promise<Marks> {
  if (cache) return cache;
  let value: Marks = EMPTY;
  try {
    value = parse(await AsyncStorage.getItem(MARKS_KEY));
  } catch {
    value = EMPTY;
  }
  // Uma gravação pode ter terminado enquanto o disco era lido: ela vale mais.
  if (cache) return cache;
  cache = value;
  return value;
}

/**
 * Muda a cor e/ou a anotação de um versículo. `color: null` tira a marca;
 * `note: ''` apaga a anotação; sem as duas, o versículo sai da lista.
 * Se o disco falhar, rejeita e nada muda (nem o cache, nem a tela).
 */
export function saveVerseMark(
  ref: VerseRef,
  patch: { color?: HighlightId | null; note?: string },
): Promise<Marks> {
  return enqueue(async () => {
    const current = parse(await AsyncStorage.getItem(MARKS_KEY));
    const key = verseKey(ref);
    const previous = current.byVerse[key];
    const color = patch.color !== undefined ? patch.color : (previous?.color ?? null);
    const note = (patch.note !== undefined ? patch.note : (previous?.note ?? '')).trim().slice(0, NOTE_MAX_LENGTH);
    const byVerse = { ...current.byVerse };
    if (color || note) {
      byVerse[key] = {
        book: ref.book,
        chapter: ref.chapter,
        verse: ref.verse,
        color,
        note,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete byVerse[key];
    }
    const next: Marks = { byVerse };
    await AsyncStorage.setItem(MARKS_KEY, JSON.stringify(next));
    cache = next;
    emit();
    return next;
  });
}

/** Apaga todas as marcas e anotações, no disco e no cache, e avisa as telas (PER-03). */
export function wipeAllMarks(): Promise<void> {
  return enqueue(async () => {
    await AsyncStorage.removeItem(MARKS_KEY);
    cache = EMPTY;
    emit();
  });
}

export function getVerseMark(marks: Marks | null, ref: VerseRef): VerseMark | null {
  return marks?.byVerse[verseKey(ref)] ?? null;
}

/** Marcas de um capítulo, por número de versículo. */
export function chapterMarks(marks: Marks | null, book: string, chapter: number): Record<number, VerseMark> {
  const out: Record<number, VerseMark> = {};
  if (!marks) return out;
  for (const mark of Object.values(marks.byVerse)) {
    if (mark.book === book && mark.chapter === chapter) out[mark.verse] = mark;
  }
  return out;
}

export function markCount(marks: Marks | null): number {
  return marks ? Object.keys(marks.byVerse).length : 0;
}

/** Marcas agrupadas por livro, na ordem do cânon, e por capítulo e versículo dentro do livro. */
export function marksByBook(marks: Marks | null): { book: Book; items: VerseMark[] }[] {
  if (!marks) return [];
  const groups = new Map<string, VerseMark[]>();
  for (const mark of Object.values(marks.byVerse)) {
    const list = groups.get(mark.book) ?? [];
    list.push(mark);
    groups.set(mark.book, list);
  }
  return BOOKS.filter((book) => groups.has(book.id)).map((book) => ({
    book,
    items: (groups.get(book.id) ?? []).sort((a, b) => a.chapter - b.chapter || a.verse - b.verse),
  }));
}

export function subscribeMarks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `null` enquanto o disco não respondeu. */
export function useMarks(): Marks | null {
  const [state, setState] = useState<Marks | null>(cache);
  useEffect(() => {
    let alive = true;
    loadMarks().then((m) => alive && setState(m));
    const unsubscribe = subscribeMarks(() => {
      loadMarks().then((m) => alive && setState(m));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  return state;
}

export function _resetMarksCacheForTests() {
  cache = null;
}
