/**
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  DEV FIXTURE — NOT PRODUCTION CONTENT                                     │
 * │                                                                           │
 * │  Conteúdo 100% fictício, criado apenas para exercitar a arquitetura.      │
 * │  NÃO é um cronograma de leitura, NÃO é um plano alternativo e NÃO deve    │
 * │  ser apresentado como conteúdo editorial real (spec §17, §29, §31).       │
 * │                                                                           │
 * │  A fonte editorial canônica DESEJADA para produção é o plano              │
 * │  "100 Dias na Palavra e Oração" (YouVersion Plan ID 42360, Alcance        │
 * │  Curitiba), que só pode ser ingerido após o Launch Gate 2 (autorização).  │
 * │  Estas fixtures existem para que a troca seja apenas de DADOS.            │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
import { milestoneForDay } from '../milestones';
import { TOTAL_DAYS, type Campaign, type JourneyDataset, type JourneyDay } from '../types';

export const DEV_FIXTURE_BANNER = 'DEV FIXTURE — NOT PRODUCTION CONTENT';

const CAMPAIGN_ID = 'dev-fixture-campaign';

/**
 * Rotação sintética e evidente de referências. Serve só para o leitor ter o que
 * paginar e para o validador ter o que validar. Não representa qualquer plano.
 */
const FIXTURE_REFERENCE_CYCLE = [
  ['PSA 1', 'PRO 1'],
  ['PSA 2-3', 'PRO 2'],
  ['JHN 1', 'PSA 4'],
  ['JHN 2', 'PRO 3'],
  ['PSA 5-6', 'JHN 3'],
];

const FIXTURE_KEY_VERSES = ['PSA 1:1', 'PRO 3:5', 'JHN 1:1', 'PSA 23:1', 'JHN 3:16'];

function fixtureDay(dayNumber: number): JourneyDay {
  const cycle = FIXTURE_REFERENCE_CYCLE[(dayNumber - 1) % FIXTURE_REFERENCE_CYCLE.length];
  const milestone = milestoneForDay(dayNumber);
  return {
    campaign_id: CAMPAIGN_ID,
    day_number: dayNumber,
    title: `Dia ${dayNumber} — título de exemplo`,
    theme: `Tema de exemplo ${((dayNumber - 1) % 5) + 1}`,
    key_verse_reference: FIXTURE_KEY_VERSES[(dayNumber - 1) % FIXTURE_KEY_VERSES.length],
    official_direction:
      `Direção pastoral de exemplo para o dia ${dayNumber}. Este texto é uma fixture de desenvolvimento ` +
      'e será substituído pelo conteúdo editorial autorizado.',
    prayer_focus: `Motivo de oração de exemplo para o dia ${dayNumber}.`,
    milestone: milestone ? milestone.label : null,
    next_day_teaser: dayNumber < TOTAL_DAYS ? `Amanhã continuamos no dia ${dayNumber + 1}.` : null,
    publish_status: 'published',
    readings: cycle.map((canonical_reference, index) => ({ sort_order: index + 1, canonical_reference })),
  };
}

/**
 * Data de início que coloca "hoje" no dia 17 — o cenário usado pelo spec para
 * demonstrar entrada tardia e dia perdido. Determinística por dia de execução.
 */
export function devStartDate(reference: Date = new Date(), dayToday = 17): string {
  const ms = Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
  return new Date(ms - (dayToday - 1) * 86_400_000).toISOString().slice(0, 10);
}

export function devCampaign(reference: Date = new Date()): Campaign {
  return {
    id: CAMPAIGN_ID,
    title: 'Jornada de 100 Dias (fixture)',
    start_date: devStartDate(reference),
    timezone: 'America/Sao_Paulo',
    utc_offset_minutes: -180,
    total_days: TOTAL_DAYS,
    status: 'active',
  };
}

export function devDataset(reference: Date = new Date()): JourneyDataset {
  return {
    campaign: devCampaign(reference),
    days: Array.from({ length: TOTAL_DAYS }, (_, i) => fixtureDay(i + 1)),
    provenance: {
      source_type: 'dev_fixture',
      source_name: 'DEV FIXTURE — conteúdo fictício',
      source_external_id: null,
      source_provider: null,
      rights_status: 'dev_fixture',
      rights_reference: null,
      content_version: 'dev-0.1.0',
    },
    DEV_ONLY: true,
    NOT_PRODUCTION_CONTENT: true,
  };
}

/**
 * Metadados da fonte editorial desejada, registrados desde já para rastreabilidade
 * (spec §17). Nenhum conteúdo do plano é reproduzido aqui — apenas a identificação
 * da fonte e o estado dos direitos.
 */
export const CANONICAL_SOURCE_TARGET = {
  source_type: 'external_plan' as const,
  source_name: '100 Dias na Palavra e Oração',
  source_external_id: '42360',
  source_provider: 'Alcance Curitiba',
  rights_status: 'pending_authorization' as const,
  rights_reference: null,
  note: 'Aguardando Launch Gate 2. Ingestão só por canal autorizado; scraping proibido (spec §18.6).',
};
