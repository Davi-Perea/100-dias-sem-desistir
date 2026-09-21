import { useEffect } from 'react';

import { demoDay, demoSeedDays } from '@/config/demo';
import { completedCount, loadCompletions, setDayCompleted } from '@/progress/completionsStore';

/**
 * Progresso de exemplo do modo demonstração (config/demo.ts). Roda uma vez por
 * processo e campanha, e só quando não há progresso nenhum: nunca mexe no
 * progresso de quem já marcou algo. Em release `demoDay()` é null e nada roda.
 */
const seeded = new Map<string, Promise<void>>();

export function seedDemoProgress(campaignId: string): Promise<void> {
  const day = demoDay();
  if (day === null) return Promise.resolve();
  const existing = seeded.get(campaignId);
  if (existing) return existing;
  const run = (async () => {
    const current = await loadCompletions(campaignId);
    if (completedCount(current) > 0) return;
    for (const d of demoSeedDays(day)) await setDayCompleted(campaignId, d, true);
  })().catch(() => {
    // Demonstração: se o disco falhar, a Jornada só aparece sem o progresso de exemplo.
  });
  seeded.set(campaignId, run);
  return run;
}

export function useDemoSeed(campaignId: string): void {
  useEffect(() => {
    void seedDemoProgress(campaignId);
  }, [campaignId]);
}

export function _resetDemoSeedForTests() {
  seeded.clear();
}
