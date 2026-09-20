import { altarForDisplay, getAllDays, getDay } from './datasetSource';
import type { DayAltar } from './types';

/**
 * Ministérios da escala, derivados do dataset ativo. Nada aqui é digitado à mão:
 * se a escala mudar, a lista muda junto.
 *
 * "Meu ministério" é uma escolha LOCAL da pessoa (settings.ministry), sem conta e
 * sem papel: serve só para destacar os dias e avisar na véspera.
 */
export type MinistryEntry = { name: string; days: number[] };

export function listMinistries(): MinistryEntry[] {
  const byName = new Map<string, number[]>();
  for (const day of getAllDays()) {
    const name = day.altar?.ministry?.trim();
    if (!name) continue;
    const days = byName.get(name) ?? [];
    days.push(day.day_number);
    byName.set(name, days);
  }
  return [...byName.entries()]
    .map(([name, days]) => ({ name, days: [...days].sort((a, b) => a - b) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function daysForMinistry(name: string | null): number[] {
  if (!name) return [];
  return listMinistries().find((m) => m.name === name)?.days ?? [];
}

/** Altar do dia já filtrado pela autorização de nomes. */
export function altarOfDay(dayNumber: number): DayAltar | null {
  return altarForDisplay(getDay(dayNumber));
}

/** Próximo dia (a partir de `fromDay`, inclusive) em que o ministério conduz o altar. */
export function nextMinistryDay(name: string | null, fromDay: number): number | null {
  return daysForMinistry(name).find((d) => d >= fromDay) ?? null;
}
