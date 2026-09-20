import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { BOOKS } from '@/bible/books';
import { expandChapters, parseReference } from '@/bible/references';
import {
  altarForDisplay,
  BUNDLED_CONTENT,
  contentStateOf,
  getDataset,
  getDay,
  loadDataset,
  resetToBundledContent,
  resetToDevFixtures,
} from '@/journey/datasetSource';
import { MILESTONES } from '@/journey/milestones';
import { altarOfDay, listMinistries, nextMinistryDay } from '@/journey/ministries';
import { flowSteps, PROPOSITO, publicSections } from '@/journey/proposito';
import { SPHERE_ORDER } from '@/journey/spheres';
import type { JourneyDataset } from '@/journey/types';
import { assertProductionReady, validateDataset } from '@/journey/validator';

/**
 * O conteúdo REAL dos 100 Dias, como embarcado no app.
 *
 * Estas regras são específicas deste material (Bíblia inteira em 100 dias, sete
 * montes em rotação, escala de ministérios). O validador genérico só avisa
 * sobre elas; aqui elas são obrigatórias.
 */
const MOBILE_ROOT = join(__dirname, '..', '..');
const dataset = BUNDLED_CONTENT;
const TOTAL_CHAPTERS = BOOKS.reduce((sum, book) => sum + book.chapters, 0);

const clone = (d: JourneyDataset): JourneyDataset => JSON.parse(JSON.stringify(d));

afterEach(() => {
  resetToBundledContent();
});

describe('dataset embarcado dos 100 Dias', () => {
  test('é o conteúdo ativo por padrão ao abrir o app', () => {
    expect(getDataset().campaign.id).toBe('lagoinha-100-dias-2026');
    expect(contentStateOf(getDataset())).toBe('pending');
  });

  test('o JSON versionado corresponde às fontes .docx (conversor determinístico)', () => {
    // Falha se alguém editar o JSON à mão ou trocar a fonte sem regenerar.
    const out = execFileSync('node', ['scripts/convert-100-dias.mjs', '--check'], { cwd: MOBILE_ROOT, encoding: 'utf8' });
    expect(out).toContain('OK');
  });

  test('passa no validador sem nenhum erro e sem nenhum aviso', () => {
    const result = validateDataset(dataset);
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('campanha: 100 dias a partir de 23/09/2026, fuso de São Paulo', () => {
    expect(dataset.campaign.start_date).toBe('2026-09-23');
    expect(dataset.campaign.timezone).toBe('America/Sao_Paulo');
    expect(dataset.campaign.utc_offset_minutes).toBe(-180);
    expect(dataset.campaign.total_days).toBe(100);
    expect(dataset.days).toHaveLength(100);
    expect(dataset.days.map((d) => d.day_number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  test('cobre a Bíblia inteira: cada um dos 1.189 capítulos exatamente uma vez, em ordem canônica', () => {
    const seen = new Map<string, number>();
    let previousIndex = -1;
    const order = BOOKS.map((b) => b.id);
    for (const day of dataset.days) {
      for (const reading of day.readings) {
        for (const chapter of expandChapters(reading.canonical_reference)) {
          const key = `${chapter.book} ${chapter.chapter}`;
          seen.set(key, (seen.get(key) ?? 0) + 1);
          const index = order.indexOf(chapter.book) * 1000 + chapter.chapter;
          expect(index).toBeGreaterThan(previousIndex);
          previousIndex = index;
        }
      }
    }
    expect(seen.size).toBe(TOTAL_CHAPTERS);
    expect([...seen.values()].every((count) => count === 1)).toBe(true);
  });

  test('cada dia tem 11 ou 12 capítulos', () => {
    for (const day of dataset.days) {
      const chapters = day.readings.reduce((n, r) => n + expandChapters(r.canonical_reference).length, 0);
      expect(chapters).toBeGreaterThanOrEqual(11);
      expect(chapters).toBeLessThanOrEqual(12);
    }
  });

  test('os sete montes giram sem quebra: dia 1 = Igreja, dia 100 = Família', () => {
    for (const day of dataset.days) {
      expect(day.sphere).toBe(SPHERE_ORDER[(day.day_number - 1) % 7]);
    }
    expect(getDay(1)?.sphere).toBe('igreja');
    expect(getDay(100)?.sphere).toBe('familia');
  });

  test('o versículo-base de cada dia está dentro da leitura daquele dia', () => {
    for (const day of dataset.days) {
      const verse = parseReference(day.key_verse_reference ?? '');
      expect(verse).not.toBeNull();
      const inside = day.readings.some((r) => {
        const range = parseReference(r.canonical_reference);
        return range !== null && verse !== null && range.book === verse.book && verse.chapterStart >= range.chapterStart && verse.chapterStart <= range.chapterEnd;
      });
      expect(inside).toBe(true);
    }
  });

  test('todo dia tem ênfase, motivos em lista e altar com ministério', () => {
    const ministries = new Map<string, number>();
    for (const day of dataset.days) {
      expect(day.title?.length).toBeGreaterThan(0);
      expect(day.prayer_points.length).toBeGreaterThanOrEqual(3);
      expect(day.prayer_focus?.length).toBeGreaterThan(0);
      expect(day.altar?.ministry.length).toBeGreaterThan(0);
      ministries.set(day.altar!.ministry, (ministries.get(day.altar!.ministry) ?? 0) + 1);
    }
    expect(ministries.size).toBe(39);
    expect(ministries.get('Intercessão/Bálsamo')).toBe(24);
    expect([...ministries.values()].filter((n) => n === 2)).toHaveLength(38);
  });

  test('o Dia 100 cai em 31/12 e termina em Apocalipse 21:5', () => {
    const last = getDay(100);
    expect(last?.readings.map((r) => r.canonical_reference)).toEqual(['REV 12-22']);
    expect(last?.key_verse_reference).toBe('REV 21:5');
    expect(last?.milestone).toBe('Jornada completa');
  });

  test('os marcos do dataset são exatamente os do produto', () => {
    for (const milestone of MILESTONES) {
      expect(getDay(milestone.day)?.milestone).toBe(milestone.label);
    }
    expect(dataset.days.filter((d) => d.milestone !== null)).toHaveLength(MILESTONES.length);
  });

  test('não carrega texto bíblico nem devocional longo: só referências e frases curtas', () => {
    for (const day of dataset.days) {
      expect(day.official_direction).toBeNull();
      expect(day.next_day_teaser).toBeNull();
      expect(day.theme).toBeNull();
      expect(day.theme_highlight).toBeNull();
      for (const value of [day.title, day.prayer_focus, ...day.prayer_points]) {
        expect((value ?? '').length).toBeLessThan(300);
      }
    }
  });
});

describe('proveniência e direitos do conteúdo real', () => {
  test('é conteúdo original da igreja, não fixture, com as fontes rastreadas por hash', () => {
    expect(dataset.DEV_ONLY).toBe(false);
    expect(dataset.NOT_PRODUCTION_CONTENT).toBe(false);
    expect(dataset.provenance.source_type).toBe('original_church_content');
    expect(dataset.provenance.source_external_id).toBeNull();
    expect(dataset.provenance.source_files).toHaveLength(3);
    for (const file of dataset.provenance.source_files ?? []) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.file).toMatch(/^2026-08-28_.+\.docx$/);
    }
  });

  test('está pendente de autorização: o portão de produção bloqueia, mas não por ser fixture', () => {
    expect(dataset.provenance.rights_status).toBe('pending_authorization');
    const gate = assertProductionReady(dataset);
    expect(gate.valid).toBe(false);
    const codes = gate.issues.map((i) => i.code);
    expect(codes).toContain('production.rights');
    expect(codes).not.toContain('production.dev_fixture');
    expect(loadDataset(dataset, 'production').ok).toBe(false);
  });

  test('vira "authorized" só com a referência da autorização', () => {
    const authorized = clone(dataset);
    authorized.provenance.rights_status = 'authorized';
    expect(assertProductionReady(authorized).issues.map((i) => i.code)).toContain('provenance.rights_reference');
    authorized.provenance.rights_reference = 'e-mail da liderança, 2026-09-xx';
    expect(assertProductionReady(authorized).valid).toBe(true);
  });

  test('nomes de líderes ficam ocultos até autorização explícita', () => {
    const day = getDay(1)!;
    expect(day.altar?.leaders_label).toBeTruthy();
    expect(altarForDisplay(day)).toEqual({ ministry: 'Intercessão/Bálsamo', leaders_label: null });

    // Liberar nomes num dataset ainda pendente é erro de validação.
    const pendingWithNames = clone(dataset);
    pendingWithNames.provenance.leader_names_authorized = true;
    expect(validateDataset(pendingWithNames).issues.map((i) => i.code)).toContain('provenance.leader_names');

    const authorized = clone(dataset);
    authorized.provenance.rights_status = 'authorized';
    authorized.provenance.rights_reference = 'autorizacao';
    authorized.provenance.leader_names_authorized = true;
    expect(loadDataset(authorized, 'production').ok).toBe(true);
    expect(altarForDisplay(getDay(1))?.leaders_label).toBe('Prs. Leandra e Daniel');
  });

  test('fixtures continuam sendo fixtures, e conteúdo real pendente não é fixture', () => {
    resetToDevFixtures();
    expect(contentStateOf(getDataset())).toBe('fixture');
    resetToBundledContent();
    expect(contentStateOf(getDataset())).toBe('pending');
  });
});

describe('orientação da igreja (proposito.json)', () => {
  test('é a orientação aos líderes, com o título exato do documento', () => {
    expect(PROPOSITO.title).toBe('ORIENTAÇÃO AOS LÍDERES DE MINISTÉRIOS');
  });

  test('o fluxo da reunião tem os cinco passos, na ordem da igreja, cada um com descrição', () => {
    const steps = flowSteps();
    expect(steps.map((s) => s.title)).toEqual([
      'Arrependimento pessoal',
      'Arrependimento congregacional',
      'Palavra-base do dia',
      'Intercessão pelo Monte do dia',
      'Adoração e entrega',
    ]);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5]);
    for (const step of steps) {
      expect(step.description.trim().length).toBeGreaterThan(0);
    }
  });

  test('das 10 seções, 8 são públicas; as instruções só para líderes ficam fora', () => {
    expect(PROPOSITO.sections).toHaveLength(10);
    const headings = publicSections().map((s) => s.heading);
    expect(headings).toHaveLength(8);
    expect(headings).not.toContain('QUAL É A RESPONSABILIDADE DO LÍDER?');
    expect(headings).not.toContain('PARTICIPAÇÃO E RESPONSABILIDADE DOS MINISTÉRIOS');
  });

  test('a introdução tem 4 parágrafos e nenhum é a saudação aos líderes', () => {
    expect(PROPOSITO.intro).toHaveLength(4);
    for (const paragraph of PROPOSITO.intro) {
      expect(paragraph.trim().length).toBeGreaterThan(0);
      expect(paragraph.startsWith('Queridos')).toBe(false);
    }
  });

  test('a fonte da orientação é um dos .docx rastreados por hash na proveniência do dataset', () => {
    // O `--check` do conversor (já executado acima) cobre proposito.json; aqui só se
    // confirma que a orientação e o dataset apontam para o MESMO arquivo-fonte.
    expect(PROPOSITO.source.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(dataset.provenance.source_files).toContainEqual(PROPOSITO.source);
  });
});

describe('ministérios derivados da escala', () => {
  test('39 ministérios, em ordem alfabética pt-BR, cada um com os próprios dias', () => {
    const ministries = listMinistries();
    expect(ministries).toHaveLength(39);
    const names = ministries.map((m) => m.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    expect(new Set(names).size).toBe(39);
    for (const ministry of ministries) {
      expect(ministry.days.length).toBeGreaterThan(0);
      expect(ministry.days).toEqual([...ministry.days].sort((a, b) => a - b));
    }
  });

  test('Kids conduz nos dias 30 e 80; Intercessão/Bálsamo em 24 dias', () => {
    expect(listMinistries().find((m) => m.name === 'Kids')?.days).toEqual([30, 80]);
    expect(listMinistries().find((m) => m.name === 'Intercessão/Bálsamo')?.days).toHaveLength(24);
  });

  test('o altar do dia sai com o ministério e sem nomes de líderes', () => {
    expect(altarOfDay(1)).toEqual({ ministry: 'Intercessão/Bálsamo', leaders_label: null });
  });

  test('próximo dia do ministério a partir de um dia: 31 → 80, depois de 80 → nenhum', () => {
    expect(nextMinistryDay('Kids', 31)).toBe(80);
    expect(nextMinistryDay('Kids', 81)).toBeNull();
    expect(nextMinistryDay('Kids', 30)).toBe(30);
    expect(nextMinistryDay(null, 1)).toBeNull();
  });
});
