import { devDataset } from './fixtures/devCampaign';
import type { JourneyDataset, JourneyDay } from './types';
import { assertProductionReady, validateDataset, type ValidationResult } from './validator';

/**
 * Única costura entre o app e o conteúdo da Jornada: trocar a fixture DEV pelo
 * dataset autorizado (Plan 42360) deve ser uma troca de DADOS, não de arquitetura.
 */

let active: JourneyDataset = devDataset();

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

/** Indica se o app está rodando com conteúdo de desenvolvimento (banner obrigatório na UI). */
export function isRunningOnFixtures(): boolean {
  return active.DEV_ONLY || active.provenance.rights_status !== 'authorized';
}

/**
 * Caminho de importação do dataset (FASE 11, só após Gate 2).
 * `mode: 'production'` recusa qualquer dataset não autorizado ou marcado como DEV.
 */
export function loadDataset(candidate: JourneyDataset, mode: 'development' | 'production' = 'development'): LoadResult {
  const validation = mode === 'production' ? assertProductionReady(candidate) : validateDataset(candidate);
  if (!validation.valid) return { ok: false, validation };
  active = candidate;
  return { ok: true, dataset: candidate };
}

export function resetToDevFixtures(reference?: Date): JourneyDataset {
  active = devDataset(reference);
  return active;
}
