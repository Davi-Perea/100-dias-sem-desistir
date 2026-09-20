import { getAllDays, getDay, isRunningOnFixtures, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { MILESTONE_DAYS, milestoneForDay, nextMilestoneAfter, reachedMilestones } from '@/journey/milestones';
import type { JourneyDataset } from '@/journey/types';
import { assertProductionReady, validateDataset } from '@/journey/validator';

const clone = (d: JourneyDataset): JourneyDataset => JSON.parse(JSON.stringify(d));

beforeEach(() => {
  resetToDevFixtures(new Date('2026-05-20T10:00:00Z'));
});

describe('fixtures de desenvolvimento', () => {
  test('têm exatamente 100 dias, numerados 1..100 sem duplicatas', () => {
    const days = getAllDays();
    expect(days).toHaveLength(100);
    expect(days.map((d) => d.day_number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  test('passam na validação de desenvolvimento', () => {
    const result = validateDataset(devDataset());
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('são marcadas inequivocamente como não-produção', () => {
    const dataset = devDataset();
    expect(dataset.DEV_ONLY).toBe(true);
    expect(dataset.NOT_PRODUCTION_CONTENT).toBe(true);
    expect(dataset.provenance.rights_status).toBe('dev_fixture');
    expect(isRunningOnFixtures()).toBe(true);
  });

  test('todas as referências de leitura são válidas', () => {
    for (const day of getAllDays()) {
      expect(day.readings.length).toBeGreaterThan(0);
      for (const reading of day.readings) {
        expect(validateDataset({ ...devDataset(), days: [day] }).issues.filter((i) => i.code === 'reading.reference')).toEqual([]);
        expect(reading.canonical_reference).toMatch(/^[1-3A-Z]{3} \d/);
      }
    }
  });

  test('marcam os milestones nos dias corretos', () => {
    for (const day of MILESTONE_DAYS) {
      expect(getDay(day)?.milestone).toBe(milestoneForDay(day)?.label);
    }
    expect(getDay(8)?.milestone).toBeNull();
  });
});

describe('portão de produção', () => {
  test('fixtures DEV são bloqueadas em produção', () => {
    const result = assertProductionReady(devDataset());
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['production.dev_fixture', 'production.rights']),
    );
  });

  test('dataset autorizado e completo passa em produção', () => {
    const authorized = clone(devDataset());
    authorized.DEV_ONLY = false;
    authorized.NOT_PRODUCTION_CONTENT = false;
    authorized.provenance = {
      source_type: 'original_church_content',
      source_name: '100 Dias — Guia Diário de Intercessão',
      source_external_id: null,
      source_provider: 'Lagoinha',
      rights_status: 'authorized',
      rights_reference: 'autorizacao-2026-09-xx',
      content_version: '1.0.0',
    };
    const result = assertProductionReady(authorized);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
  });

  test('dataset autorizado sem documentação de direitos é recusado', () => {
    const dataset = clone(devDataset());
    dataset.DEV_ONLY = false;
    dataset.NOT_PRODUCTION_CONTENT = false;
    dataset.provenance = { ...dataset.provenance, rights_status: 'authorized', rights_reference: null };
    expect(assertProductionReady(dataset).issues.map((i) => i.code)).toContain('provenance.rights_reference');
  });

  test('loadDataset em modo produção recusa fixture e mantém o dataset anterior', () => {
    const before = getAllDays()[0].title;
    const result = loadDataset(devDataset(), 'production');
    expect(result.ok).toBe(false);
    expect(getAllDays()[0].title).toBe(before);
  });
});

describe('validador detecta datasets quebrados', () => {
  const broken = (mutate: (d: JourneyDataset) => void) => {
    const dataset = clone(devDataset());
    mutate(dataset);
    return validateDataset(dataset).issues.map((i) => i.code);
  };

  test('dias faltando', () => {
    expect(broken((d) => d.days.splice(50, 1))).toEqual(expect.arrayContaining(['days.count', 'day.missing']));
  });

  test('dia duplicado', () => {
    expect(broken((d) => { d.days[10].day_number = 12; })).toContain('day.duplicate');
  });

  test('número fora do intervalo', () => {
    expect(broken((d) => { d.days[0].day_number = 0; })).toContain('day.number');
  });

  test('referência inválida', () => {
    expect(broken((d) => { d.days[0].readings[0].canonical_reference = 'ZZZ 999'; })).toContain('reading.reference');
  });

  test('dia sem leituras', () => {
    expect(broken((d) => { d.days[3].readings = []; })).toContain('day.readings');
  });

  test('versículo-chave inválido', () => {
    expect(broken((d) => { d.days[0].key_verse_reference = 'GEN 999'; })).toContain('day.key_verse');
  });

  test('total_days diferente de 100', () => {
    expect(broken((d) => { d.campaign.total_days = 90; })).toContain('campaign.total_days');
  });

  test('proveniência sem versão', () => {
    expect(broken((d) => { d.provenance.content_version = ''; })).toContain('provenance.content_version');
  });

  test('campos editoriais nulos são aviso, não erro (autorização parcial)', () => {
    const dataset = clone(devDataset());
    dataset.days.forEach((d) => {
      d.title = null;
      d.theme = null;
      d.official_direction = null;
      d.prayer_focus = null;
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(true);
    expect(result.issues.every((i) => i.severity === 'warning')).toBe(true);
  });
});

describe('milestones', () => {
  test('são exatamente 7, 25, 50, 75 e 100', () => {
    expect([...MILESTONE_DAYS]).toEqual([7, 25, 50, 75, 100]);
  });

  test('próximo milestone considera dias concluídos', () => {
    expect(nextMilestoneAfter(0)?.day).toBe(7);
    expect(nextMilestoneAfter(7)?.day).toBe(25);
    expect(nextMilestoneAfter(100)).toBeNull();
  });

  test('milestones alcançados acumulam', () => {
    expect(reachedMilestones(0)).toHaveLength(0);
    expect(reachedMilestones(50).map((m) => m.day)).toEqual([7, 25, 50]);
  });
});
