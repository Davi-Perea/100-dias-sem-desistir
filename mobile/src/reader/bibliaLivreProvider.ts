import { getBook } from '@/bible/books';
import type { CanonicalReference } from '@/bible/references';

import { BIBLIA_LIVRE_LOADERS, type BibliaLivreBook } from './bibliaLivreBooks';
import type { BibleTextProvider, Passage, TranslationMetadata } from './provider';

/**
 * Bíblia Livre (BLIVRE), empacotada no app. Decisão do fundador em 2026-09-21.
 *
 * Fonte: eBible.org, porbr2018 (USFM), convertida por scripts/convert-biblia-livre.mjs.
 * Licença: Creative Commons Atribuição 4.0 Brasil — atribuição obrigatória e
 * indicação das alterações. As duas vão em `copyrightNotice`, que o leitor
 * mostra no fim de cada capítulo e a Ajuda mostra em "Sobre".
 * Detalhes e texto de crédito sugerido pelos autores: content/biblia-livre/source/README.md.
 */
export const BIBLIA_LIVRE_NOTICE =
  'Bíblia Livre (BLIVRE), Copyright © 2018 Diego Santos, Mario Sérgio, e Marco Teles, ' +
  'http://sites.google.com/site/biblialivre/. Texto da edição porbr2018 de eBible.org ' +
  '(arquivos de 12/12/2025). Licença Creative Commons Atribuição 4.0 Brasil ' +
  '(http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que ' +
  'devidamente mencionados fonte e autores. Texto adaptado para este app: notas de rodapé e ' +
  'referências cruzadas não são exibidas e as palavras acrescentadas pelos tradutores aparecem ' +
  'sem itálico. Os autores não endossam necessariamente estas alterações.';

const METADATA: TranslationMetadata = {
  id: 'blivre-porbr2018',
  name: 'Bíblia Livre',
  abbreviation: 'BLIVRE',
  language: 'pt-BR',
  copyrightNotice: BIBLIA_LIVRE_NOTICE,
  attributionRequired: true,
  cachePolicy: 'bundled',
  offlineAvailable: true,
  isDevPlaceholder: false,
};

/** Livros já avaliados nesta sessão (o require também guarda, isto só evita revalidar). */
const cache = new Map<string, BibliaLivreBook>();

function loadBook(id: string): BibliaLivreBook {
  const hit = cache.get(id);
  if (hit) return hit;
  const loader = BIBLIA_LIVRE_LOADERS[id];
  if (!loader) throw new Error(`Livro sem texto na Bíblia Livre: ${id}`);
  const book = loader();
  cache.set(id, book);
  return book;
}

export const bibliaLivreProvider: BibleTextProvider = {
  getMetadata: () => METADATA,

  async getPassage(reference: CanonicalReference): Promise<Passage> {
    const book = loadBook(reference.book);
    const chapter = book.capitulos[reference.chapterStart - 1];
    if (!chapter || chapter.capitulo !== reference.chapterStart) {
      throw new Error(`Capítulo inexistente: ${reference.book} ${reference.chapterStart}`);
    }
    let verses = chapter.versiculos.map((text, i) => ({ verse: i + 1, text }));
    // Faixa de versículos só dentro do mesmo capítulo; o leitor pede capítulos inteiros.
    if (reference.verseStart !== null && reference.chapterEnd === reference.chapterStart) {
      const start = reference.verseStart;
      const end = reference.verseEnd ?? start;
      verses = verses.filter((v) => v.verse >= start && v.verse <= end);
    }
    return {
      reference: `${reference.book} ${reference.chapterStart}`,
      book: reference.book,
      bookName: getBook(reference.book)?.name ?? book.nome,
      chapter: reference.chapterStart,
      heading: chapter.titulo,
      verses,
    };
  },
};

/** Só para testes: esvazia o cache de livros avaliados. */
export function _resetBibliaLivreCacheForTests() {
  cache.clear();
}
