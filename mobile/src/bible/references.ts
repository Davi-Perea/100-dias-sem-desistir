import { BOOKS, getBook, type Book } from './books';

/**
 * Referência bíblica canônica em formato textual portável, independente de tradução.
 * Formato: "GEN 1", "GEN 1-3", "PSA 23:1", "PSA 23:1-6", "JHN 3:16-4:2".
 * Códigos de livro são USFM de 3 letras (fato público, não licenciado).
 */
export type CanonicalReference = {
  book: string;
  chapterStart: number;
  chapterEnd: number;
  verseStart: number | null;
  verseEnd: number | null;
};

export type ReferenceProblem = { reference: string; reason: string };

const PATTERN = /^([1-3A-Z]{3})\s+(\d+)(?::(\d+))?(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/;

export function parseReference(raw: string): CanonicalReference | null {
  const match = PATTERN.exec(raw.trim().toUpperCase());
  if (!match) return null;
  const [, book, c1, v1, c2, endNumber] = match;

  const chapterStart = Number(c1);
  const verseStart = v1 ? Number(v1) : null;

  let chapterEnd = chapterStart;
  let verseEnd: number | null = verseStart;

  if (endNumber !== undefined) {
    if (c2 !== undefined) {
      // "JHN 3:16-4:2" — atravessa capítulos
      chapterEnd = Number(c2);
      verseEnd = Number(endNumber);
    } else if (verseStart !== null) {
      // "PSA 23:1-6" — faixa de versículos no mesmo capítulo
      verseEnd = Number(endNumber);
    } else {
      // "GEN 1-3" — faixa de capítulos
      chapterEnd = Number(endNumber);
    }
  }

  return { book, chapterStart, chapterEnd, verseStart, verseEnd };
}

/** Valida sintaxe, existência do livro e limites de capítulo. Não valida contagem de versículos (varia por tradução). */
export function validateReference(raw: string): string | null {
  const parsed = parseReference(raw);
  if (!parsed) return `Sintaxe inválida: "${raw}"`;
  const book = getBook(parsed.book);
  if (!book) return `Livro desconhecido: "${parsed.book}"`;
  if (parsed.chapterStart < 1 || parsed.chapterStart > book.chapters) {
    return `Capítulo fora do intervalo de ${book.name}: ${parsed.chapterStart}`;
  }
  if (parsed.chapterEnd < parsed.chapterStart || parsed.chapterEnd > book.chapters) {
    return `Faixa de capítulos inválida em ${book.name}: ${parsed.chapterStart}-${parsed.chapterEnd}`;
  }
  if (parsed.verseStart !== null && parsed.verseStart < 1) return `Versículo inválido em "${raw}"`;
  if (parsed.verseEnd !== null && parsed.verseStart !== null && parsed.chapterEnd === parsed.chapterStart && parsed.verseEnd < parsed.verseStart) {
    return `Faixa de versículos invertida em "${raw}"`;
  }
  return null;
}

/** Rótulo em pt-BR para exibição, ex.: "Gênesis 1–3", "Salmos 23:1-6". */
export function formatReference(raw: string): string {
  const parsed = parseReference(raw);
  if (!parsed) return raw;
  const book: Book | undefined = getBook(parsed.book);
  const name = book?.name ?? parsed.book;

  if (parsed.verseStart === null) {
    return parsed.chapterEnd > parsed.chapterStart
      ? `${name} ${parsed.chapterStart}–${parsed.chapterEnd}`
      : `${name} ${parsed.chapterStart}`;
  }
  if (parsed.chapterEnd !== parsed.chapterStart) {
    return `${name} ${parsed.chapterStart}:${parsed.verseStart}–${parsed.chapterEnd}:${parsed.verseEnd}`;
  }
  if (parsed.verseEnd !== null && parsed.verseEnd !== parsed.verseStart) {
    return `${name} ${parsed.chapterStart}:${parsed.verseStart}-${parsed.verseEnd}`;
  }
  return `${name} ${parsed.chapterStart}:${parsed.verseStart}`;
}

/** Capítulos individuais cobertos por uma referência (para paginar o leitor). */
export function expandChapters(raw: string): { book: string; bookName: string; chapter: number }[] {
  const parsed = parseReference(raw);
  if (!parsed) return [];
  const book = getBook(parsed.book);
  const out = [];
  for (let c = parsed.chapterStart; c <= parsed.chapterEnd; c++) {
    out.push({ book: parsed.book, bookName: book?.name ?? parsed.book, chapter: c });
  }
  return out;
}

export const BOOK_CODES = BOOKS.map((b) => b.id);
