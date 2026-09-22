import { getBook } from '@/bible/books';
import { formatReference, parseReference } from '@/bible/references';
import { getBibleProvider } from '@/reader/provider';

/**
 * Versículo-base do dia (campo `key_verse_reference` do dataset da igreja) com o
 * texto da tradução empacotada (Bíblia Livre). Usado pelo aviso do dia (J4).
 *
 * Só busca o que a referência pede, sem inventar: livro que não está no cânon
 * (books.ts), capítulo fora do intervalo, referência que atravessa capítulos,
 * provedor de exemplo (sem tradução licenciada) ou qualquer falha de leitura
 * devolvem `text: null`, e o aviso mostra só a referência.
 */
export type KeyVerse = {
  /** "Gênesis 12:2-3". */
  label: string;
  /** Texto dos versículos, na ordem, ou `null` quando não foi possível achar. */
  text: string | null;
  /** Nome curto da tradução, para a atribuição ao lado do texto (CC BY). */
  translation: string | null;
};

export async function loadKeyVerse(raw: string | null | undefined): Promise<KeyVerse | null> {
  if (!raw) return null;
  const label = formatReference(raw);
  const parsed = parseReference(raw);
  const book = parsed ? getBook(parsed.book) : undefined;
  const findable =
    parsed !== null &&
    book !== undefined &&
    parsed.verseStart !== null &&
    parsed.chapterEnd === parsed.chapterStart &&
    parsed.chapterStart >= 1 &&
    parsed.chapterStart <= book.chapters;
  if (!findable) return { label, text: null, translation: null };

  try {
    const provider = getBibleProvider();
    const metadata = provider.getMetadata();
    // Texto de exemplo nunca se passa por versículo.
    if (metadata.isDevPlaceholder) return { label, text: null, translation: null };
    const passage = await provider.getPassage(parsed);
    const text = passage.verses
      .map((verse) => verse.text.trim())
      .filter(Boolean)
      .join(' ');
    return text ? { label, text, translation: metadata.name } : { label, text: null, translation: null };
  } catch {
    return { label, text: null, translation: null };
  }
}
