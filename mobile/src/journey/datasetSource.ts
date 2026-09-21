import bundledJson from '../../content/100-dias-2026/dataset.json';

import { isDevBuild } from './devBuild';
import { devDataset } from './fixtures/devCampaign';
import type { DayAltar, JourneyDataset, JourneyDay } from './types';
import { assertProductionReady, validateDataset, type ValidationResult } from './validator';

/**
 * Única costura entre o app e o conteúdo da Jornada.
 *
 * O conteúdo REAL (guia da igreja) é embarcado no bundle a partir de
 * `content/100-dias-2026/dataset.json`, gerado por `scripts/convert-100-dias.mjs`.
 * As fixtures DEV continuam disponíveis para testes e para o painel de
 * desenvolvimento, e nunca podem ser confundidas com o conteúdo da igreja.
 */

/**
 * Estado do conteúdo ativo, do ponto de vista de quem vê a tela:
 *  - `fixture`: conteúdo fictício de desenvolvimento;
 *  - `pending`: conteúdo real da igreja, ainda sem autorização escrita para publicar;
 *  - `authorized`: conteúdo real autorizado (o único que pode ir para a loja).
 */
export type ContentState = 'fixture' | 'pending' | 'authorized';

export const BUNDLED_CONTENT: JourneyDataset = bundledJson as unknown as JourneyDataset;

/**
 * Em build de release (`__DEV__ === false`) o conteúdo embarcado PRECISA passar
 * no portão de produção. Falhar aqui, na primeira abertura, é deliberado: um
 * build de loja com conteúdo não autorizado nunca deve chegar a alguém.
 * O painel de desenvolvimento continua podendo carregar fixtures e conteúdo
 * pendente em builds de desenvolvimento.
 */
function chooseInitialDataset(): JourneyDataset {
  if (!isDevBuild()) {
    const gate = assertProductionReady(BUNDLED_CONTENT);
    if (!gate.valid) {
      const reasons = gate.issues.filter((i) => i.severity === 'error').map((i) => i.message);
      throw new Error(`Build de release com conteúdo não liberado para produção:\n${reasons.join('\n')}`);
    }
    return BUNDLED_CONTENT;
  }
  const validation = validateDataset(BUNDLED_CONTENT);
  if (validation.valid) return BUNDLED_CONTENT;
  // Só em desenvolvimento: dataset embarcado quebrado cai para as fixtures, com aviso alto.
  console.error(
    'Dataset embarcado inválido; usando fixtures DEV.',
    validation.issues.filter((i) => i.severity === 'error').map((i) => i.message),
  );
  return devDataset();
}

let active: JourneyDataset = chooseInitialDataset();

export type LoadResult = { ok: true; dataset: JourneyDataset } | { ok: false; validation: ValidationResult };

export function getDataset(): JourneyDataset {
  return active;
}

export function getCampaign() {
  return active.campaign;
}

export function getDay(dayNumber: number): JourneyDay | null {
  return active.days.find((d) => d.day_number === dayNumber) ?? null;
}

export function getAllDays(): JourneyDay[] {
  return [...active.days].sort((a, b) => a.day_number - b.day_number);
}

export function contentStateOf(dataset: JourneyDataset): ContentState {
  if (dataset.DEV_ONLY) return 'fixture';
  return dataset.provenance.rights_status === 'authorized' ? 'authorized' : 'pending';
}

/** Estado do conteúdo ativo (define o aviso na interface). */
export function contentState(): ContentState {
  return contentStateOf(active);
}

/** Verdadeiro só para as fixtures fictícias. Conteúdo real pendente NÃO é fixture. */
export function isRunningOnFixtures(): boolean {
  return active.DEV_ONLY;
}

/**
 * Altar do dia como pode ser exibido: o nome do ministério sempre; o rótulo com
 * nomes de pessoas só quando a igreja autorizou. Esconder o nome aqui, na fonte,
 * evita que uma tela esqueça a regra.
 */
export function altarForDisplay(day: JourneyDay | null): DayAltar | null {
  if (!day?.altar) return null;
  const authorized = active.provenance.leader_names_authorized === true;
  return { ministry: day.altar.ministry, leaders_label: authorized ? day.altar.leaders_label : null };
}

/**
 * Caminho de importação de um dataset em tempo de execução (painel DEV e testes).
 * `mode: 'production'` recusa qualquer dataset não autorizado ou marcado como DEV.
 * Em build de release o modo é SEMPRE 'production', peça quem pedir (DIR-01): o
 * portão de produção não vale só na abertura.
 */
export function loadDataset(candidate: JourneyDataset, mode: 'development' | 'production' = 'development'): LoadResult {
  const effective = isDevBuild() ? mode : 'production';
  const validation = effective === 'production' ? assertProductionReady(candidate) : validateDataset(candidate);
  if (!validation.valid) return { ok: false, validation };
  active = candidate;
  return { ok: true, dataset: candidate };
}

/** Fixtures fictícias: só em build de desenvolvimento. Em release, lança e não troca nada (DIR-01). */
export function resetToDevFixtures(reference?: Date): JourneyDataset {
  if (!isDevBuild()) throw new Error('Fixtures DEV não podem ser carregadas em build de release.');
  active = devDataset(reference);
  return active;
}

/** Volta ao conteúdo embarcado (o guia da igreja), no modo de desenvolvimento. */
export function resetToBundledContent(): LoadResult {
  return loadDataset(BUNDLED_CONTENT, 'development');
}
