import { BOOKS, TOTAL_CHAPTERS } from '@/bible/books';
import { expandChapters, formatReference, parseReference, validateReference } from '@/bible/references';

describe('cânon', () => {
  test('66 livros somam 1.189 capítulos', () => {
    expect(BOOKS).toHaveLength(66);
    expect(TOTAL_CHAPTERS).toBe(1189);
  });

  test('códigos de livro são USFM de 3 letras e únicos', () => {
    const ids = BOOKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(66);
    expect(ids.every((id) => /^[1-3A-Z]{3}$/.test(id))).toBe(true);
  });
});

describe('referências canônicas', () => {
  test.each([
    ['GEN 1', { book: 'GEN', chapterStart: 1, chapterEnd: 1, verseStart: null, verseEnd: null }],
    ['GEN 1-3', { book: 'GEN', chapterStart: 1, chapterEnd: 3, verseStart: null, verseEnd: null }],
    ['PSA 23:1', { book: 'PSA', chapterStart: 23, chapterEnd: 23, verseStart: 1, verseEnd: 1 }],
    ['PSA 23:1-6', { book: 'PSA', chapterStart: 23, chapterEnd: 23, verseStart: 1, verseEnd: 6 }],
    ['JHN 3:16-4:2', { book: 'JHN', chapterStart: 3, chapterEnd: 4, verseStart: 16, verseEnd: 2 }],
  ])('parseia %s', (raw, expected) => {
    expect(parseReference(raw)).toEqual(expected);
  });

  test('aceita traço curto e travessão', () => {
    expect(parseReference('GEN 1–3')).toEqual(parseReference('GEN 1-3'));
  });

  test.each([['GEN'], ['Genesis 1'], ['GEN abc'], ['']])('rejeita sintaxe inválida: %s', (raw) => {
    expect(parseReference(raw)).toBeNull();
    expect(validateReference(raw)).toMatch(/Sintaxe inválida/);
  });

  test('rejeita livro inexistente e capítulo fora do intervalo', () => {
    expect(validateReference('XYZ 1')).toMatch(/Livro desconhecido/);
    expect(validateReference('OBA 2')).toMatch(/fora do intervalo/);
    expect(validateReference('PSA 151')).toMatch(/fora do intervalo/);
  });

  test('aceita os limites de cada livro', () => {
    expect(validateReference('PSA 150')).toBeNull();
    expect(validateReference('OBA 1')).toBeNull();
    expect(validateReference('REV 22')).toBeNull();
  });

  test('formata em pt-BR', () => {
    expect(formatReference('GEN 1-3')).toBe('Gênesis 1–3');
    expect(formatReference('OBA 1')).toBe('Obadias 1');
    expect(formatReference('PSA 23:1-6')).toBe('Salmos 23:1-6');
    expect(formatReference('JHN 3:16')).toBe('João 3:16');
  });

  test('expande faixa de capítulos para o leitor', () => {
    expect(expandChapters('PSA 2-4').map((c) => c.chapter)).toEqual([2, 3, 4]);
    expect(expandChapters('OBA 1')).toHaveLength(1);
    expect(expandChapters('inválido')).toEqual([]);
  });
});
