import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import {
  completedCount,
  daysSinceLastCompletion,
  isDayCompleted,
  pendingDaysUpTo,
  useCompletions,
  type Completions,
} from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';

import { contentState, getCampaign, getDataset, getDay, type ContentState } from './datasetSource';
import { officialDayInfo, type CampaignPhase } from './officialDay';
import { nextMilestoneAfter, reachedMilestones, type Milestone } from './milestones';
import type { Campaign, JourneyDay } from './types';

export type DayState = 'completed' | 'today' | 'pending' | 'future';

export type JourneySnapshot = {
  campaign: Campaign;
  officialDay: number;
  phase: CampaignPhase;
  /** Verdadeiro sempre que o conteúdo ativo NÃO estiver autorizado (fixture ou pendente): a UI avisa. */
  isDevContent: boolean;
  /** Fixture fictícia, conteúdo real pendente ou conteúdo real autorizado. */
  contentState: ContentState;
  completions: Completions | null;
  completedCount: number;
  pendingDays: number[];
  gapDays: number | null;
  nextMilestone: Milestone | null;
  reached: Milestone[];
  todayDay: JourneyDay | null;
  dayState: (dayNumber: number) => DayState;
  /** Conteúdo de dias futuros permanece indisponível até o dia oficial (spec §8). */
  isDayUnlocked: (dayNumber: number) => boolean;
  ready: boolean;
};

/** Reavalia o Dia oficial ao voltar do background (a virada de meia-noite não deve exigir reinício). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);
  return now;
}

export function useJourney(): JourneySnapshot {
  const now = useNow();
  const settings = useSettings();
  const campaign = getCampaign();
  const completions = useCompletions(campaign.id);

  const info = useMemo(() => officialDayInfo(now, campaign), [now, campaign]);
  const override = settings?.dev.dayOverride ?? null;
  const officialDay = override ?? info.officialDay;
  /** Simular um dia no painel DEV coloca a campanha em curso, senão nada abriria. */
  const phase: CampaignPhase = override !== null ? 'running' : info.phase;
  const done = completedCount(completions);
  const state = contentState();

  /**
   * Antes da campanha começar, NENHUM dia abre — inclusive o Dia 1. O clamp do dia
   * oficial serve para exibição; ele não pode virar permissão de leitura antecipada.
   */
  const isDayUnlocked = (dayNumber: number) => phase !== 'before_start' && dayNumber <= officialDay;

  const dayState = (dayNumber: number): DayState => {
    if (isDayCompleted(completions, dayNumber)) return 'completed';
    if (phase === 'before_start') return 'future';
    if (dayNumber === officialDay && phase === 'running') return 'today';
    if (dayNumber < officialDay || (phase === 'finished' && dayNumber <= campaign.total_days)) return 'pending';
    return 'future';
  };

  return {
    campaign,
    officialDay,
    phase,
    isDevContent: state !== 'authorized',
    contentState: state,
    completions,
    completedCount: done,
    pendingDays: phase === 'before_start' ? [] : pendingDaysUpTo(completions, officialDay).filter((d) => phase === 'finished' || d !== officialDay),
    gapDays: phase === 'before_start' ? null : daysSinceLastCompletion(completions, officialDay),
    nextMilestone: nextMilestoneAfter(done),
    reached: reachedMilestones(done),
    todayDay: phase === 'before_start' ? null : getDay(officialDay),
    dayState,
    isDayUnlocked,
    ready: completions !== null && settings !== null,
  };
}

export function useDataset() {
  return getDataset();
}
