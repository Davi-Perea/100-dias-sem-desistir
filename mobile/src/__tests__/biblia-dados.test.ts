import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOOKS, TOTAL_CHAPTERS } from '@/bible/books';
import { BIBLIA_LIVRE_LOADERS, type BibliaLivreBook } from '@/reader/bibliaLivreBooks';

/**
 * Dados da Bíblia Livre empacotados (content/biblia-livre/). Lidos do disco, não
 * pelo provedor: aqui se confere o que o conversor gerou.
 */
const ROOT = join(__dirname, '..', '..');
const LIVROS = join(ROOT, 'content', 'biblia-livre', 'livros');

function book(id: string): BibliaLivreBook {
  return JSON.parse(readFileSync(join(LIVROS, `${id}.json`), 'utf8'));
}

const all = BOOKS.map((b) => ({ meta: b, data: book(b.id) }));

describe('Bíblia Livre: dados gerados', () => {
  test('66 livros, um arquivo por código de books.ts, nada sobrando', () => {
    expect(BOOKS).toHaveLength(66);
    const files = readdirSync(LIVROS).sort();
    expect(files).toEqual(BOOKS.map((b) => `${b.id}.json`).sort());
    for (const { meta, data } of all) {
      expect(data.livro).toBe(meta.id);
      expect(data.nome).toBe(meta.name);
    }
  });

  test('1189 capítulos, cada livro com a contagem de books.ts, e 31102 versículos', () => {
    let chapters = 0;
    let verses = 0;
    for (const { meta, data } of all) {
      expect(data.capitulos).toHaveLength(meta.chapters);
      data.capitulos.forEach((ch, i) => {
        expect(ch.capitulo).toBe(i + 1);
        expect(ch.versiculos.length).toBeGreaterThan(0);
      });
      chapters += data.capitulos.length;
      verses += data.capitulos.reduce((s, ch) => s + ch.versiculos.length, 0);
    }
    expect(chapters).toBe(1189);
    expect(chapters).toBe(TOTAL_CHAPTERS);
    expect(verses).toBe(31102);
    const manifest = JSON.parse(readFileSync(join(ROOT, 'content', 'biblia-livre', 'manifest.json'), 'utf8'));
    expect(manifest.totais).toEqual({ livros: 66, capitulos: 1189, versiculos: 31102 });
  });

  test('Gênesis 1:1 e João 3:16 presentes, com o texto da fonte', () => {
    expect(book('GEN').capitulos[0].versiculos[0]).toBe('No princípio criou Deus os céus e a terra.');
    expect(book('JHN').capitulos[2].versiculos[15]).toBe(
      'Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito; para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    );
  });

  test('nenhum versículo ou título tem marcador USFM, e nenhum é vazio', () => {
    for (const { data } of all) {
      for (const ch of data.capitulos) {
        for (const text of [...ch.versiculos, ch.titulo ?? 'x']) {
          expect(text).not.toMatch(/\\/);
          expect(text).not.toMatch(/\s{2}/);
          expect(text.trim()).toBe(text);
          expect(text.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('notas de rodapé e referências de citação saíram; palavras acrescentadas ficaram', () => {
    // Gn 3:5 tinha a nota "Ou: sereis como Deus".
    expect(book('GEN').capitulos[2].versiculos[4]).toBe(
      'Mas Deus sabe que no dia que comerdes dele, vossos olhos serão abertos, e sereis como deuses, sabendo o bem e o mal.',
    );
    // Mt 1:23 terminava com a referência "\rq Isaías 7:14 \rq*".
    expect(book('MAT').capitulos[0].versiculos[22]).not.toContain('Isaías 7:14');
    expect(book('MAT').capitulos[0].versiculos[22]).toMatch(/Deus conosco\.$/);
    // Sl 1:3 tinha "\add devido\add*": a palavra fica.
    expect(book('PSA').capitulos[0].versiculos[2]).toContain('a seu devido tempo');
  });

  test('título do salmo vai em "titulo", não num versículo', () => {
    expect(book('PSA').capitulos[2].titulo).toBe('Salmo de Davi, quando ele fugia da presença de seu filho Absalão:');
    expect(book('PSA').capitulos[2].versiculos[0]).toMatch(/^Ah SENHOR/);
    expect(book('GEN').capitulos[0].titulo).toBeNull();
  });

  test('há um carregador para cada livro de books.ts, e nenhum a mais', () => {
    expect(Object.keys(BIBLIA_LIVRE_LOADERS).sort()).toEqual(BOOKS.map((b) => b.id).sort());
  });

  test('a fonte e o README de licença estão versionados junto', () => {
    const source = join(ROOT, 'content', 'biblia-livre', 'source');
    expect(existsSync(join(source, 'porbr2018_usfm.zip'))).toBe(true);
    const readme = readFileSync(join(source, 'README.md'), 'utf8');
    expect(readme).toContain('Creative Commons Atribuição 4.0 Brasil');
    expect(readme).toContain('Diego Santos, Mario Sérgio, e Marco Teles');
  });

  test('o conversor, em --check, confirma que os JSON batem com a fonte', () => {
    const out = execFileSync(process.execPath, [join(ROOT, 'scripts', 'convert-biblia-livre.mjs'), '--check'], {
      encoding: 'utf8',
    });
    expect(out).toContain('OK');
    expect(out).toContain('66 livros · 1189 capítulos · 31102 versículos');
  });
});
