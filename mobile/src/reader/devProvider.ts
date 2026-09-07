import { getBook } from '@/bible/books';
import type { CanonicalReference } from '@/bible/references';

import { devPlaceholderVerses } from './devPlaceholderText';
import type { BibleTextProvider, Passage, TranslationMetadata } from './provider';

/**
 * DEV FIXTURE — NOT PRODUCTION CONTENT.
 * Provider de desenvolvimento: gera texto neutro escrito para o projeto.
 * Nenhuma tradução bíblica (aberta ou protegida) é reproduzida aqui.
 * Será substituído pelo provider licenciado após o Launch Gate 1.
 */
export const devBibleProvider: BibleTextProvider = {
  getMetadata(): TranslationMetadata {
    return {
      id: 'dev-placeholder',
      name: 'Texto de exemplo (desenvolvimento)',
      abbreviation: 'DEV',
      language: 'pt-BR',
      copyrightNotice:
        'DEV FIXTURE — texto de exemplo criado para desenvolvimento. Nenhuma tradução bíblica é exibida. ' +
        'A tradução licenciada entra após o Launch Gate 1.',
      attributionRequired: false,
      cachePolicy: 'bundled',
      offlineAvailable: true,
      isDevPlaceholder: true,
    };
  },

  async getPassage(reference: CanonicalReference): Promise<Passage> {
    const book = getBook(reference.book);
    return {
      reference: `${reference.book} ${reference.chapterStart}`,
      book: reference.book,
      bookName: book?.name ?? reference.book,
      chapter: reference.chapterStart,
      verses: devPlaceholderVerses(reference.book, reference.chapterStart),
    };
  },
};
