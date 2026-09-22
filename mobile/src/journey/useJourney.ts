import { useMemo } from 'react';

import { demoDay } from '@/config/demo';
import { FUTURE_DAYS_OPEN } from '@/config/features';
import {
  completedCount,
  isDayCompleted,
  pendingDaysUpTo,
  useCompletions,
  type Completions,
} from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';

import { useCampaignNow } from './campaignClock';
import { contentState, getCampaign, getDataset, getDay, type ContentState } from './datasetSource';
import { useDemoSeed } from './demoSeed';
import { isDevBuild } from './devBuild';
import { officialDayInfo, type CampaignPhase } from './officialDay';
import { nextMilestoneAfter, reachedMilestones, type Milestone } from './milestones';
import { daysSinceLastCompletion, WELCOME_BACK_MIN_GAP } from './returnGap';
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
  /**
   * Dias desde a última conclusão, medidos pelo instante em que ela aconteceu
   * (DIA-02): 0 = concluiu algo hoje. Nulo antes da campanha e para quem nunca
   * concluiu nada. O primeiro dia em aberto da sequência é `officialDay − gapDays + 1`.
   */
  gapDays: number | null;
  /**
   * Retorno após lacuna: campanha em curso, hoje em aberto e pelo menos três
   * dias em aberto consecutivos antes de hoje (`gapDays ≥ 4`, R0-5). Hoje só
   * alimenta a métrica return_after_gap; a mensagem de entrada da Jornada vem
   * de `entryMessage()` em journey/returnGap.ts.
   */
  welcomeBack: boolean;
  /** Dias até o início (0 durante e depois da campanha), do mesmo relógio que a fase (DIA-04). */
  daysToStart: number;
  nextMilestone: Milestone | null;
  reached: Milestone[];
  todayDay: JourneyDay | null;
  dayState: (dayNumber: number) => DayState;
  /**
   * Se o dia abre. Com `FUTURE_DAYS_OPEN` (config/features.ts), todo dia da
   * campanha abre desde o Dia 1 oficial; sem ela, só até o dia oficial (spec §8).
   */
  isDayUnlocked: (dayNumber: number) => boolean;
  /** Se o dia pode ser CONCLUÍDO: só hoje e os dias que já passaram, com ou sem a chave J6. */
  isDayCompletable: (dayNumber: number) => boolean;
  ready: boolean;
};

export function useJourney(): JourneySnapshot {
  // Relógio único do app: vira na meia-noite de São Paulo e ao voltar do background (DIA-04).
  const now = useCampaignNow();
  const settings = useSettings();
  const campaign = getCampaign();
  const completions = useCompletions(campaign.id);
  // Modo demonstração (só __DEV__, config/demo.ts): progresso de exemplo na primeira abertura.
  useDemoSeed(campaign.id);

  const info = useMemo(() => officialDayInfo(now, campaign), [now, campaign]);
  // O dia simulado do painel DEV só vale em build de desenvolvimento (DIA-01/PER-01).
  // O modo demonstração usa o mesmo caminho, sem gravar nada, e vale MAIS que o dia do painel:
  // em demo o painel some, então um dia antigo escolhido nele ficaria invisível e sem como limpar.
  const override = isDevBuild() ? (demoDay() ?? settings?.dev.dayOverride ?? null) : null;
  /** Um override além do último dia simula a campanha encerrada (E5) no painel DEV. */
  const overrideFinished = override !== null && override > campaign.total_days;
  const officialDay = override === null ? info.officialDay : Math.min(override, campaign.total_days);
  /** Simular um dia no painel DEV coloca a campanha em curso, senão nada abriria. */
  const phase: CampaignPhase = override === null ? info.phase : overrideFinished ? 'finished' : 'running';
  const done = completedCount(completions);
  const state = contentState();
  /** "Hoje" no calendário da campanha; com o dia simulado, o calendário inteiro anda junto. */
  const todayCampaignDay = override === null ? info.rawDay : officialDay;
  const gapDays =
    phase === 'before_start'
      ? null
      : daysSinceLastCompletion(completions, todayCampaignDay, campaign, todayCampaignDay - info.rawDay);
  const welcomeBack =
    phase === 'running' && !isDayCompleted(completions, officialDay) && gapDays !== null && gapDays >= WELCOME_BACK_MIN_GAP;

  /**
   * Antes da campanha começar, NENHUM dia abre — inclusive o Dia 1. O clamp do dia
   * oficial serve para exibição; ele não pode virar permissão de leitura antecipada.
   */
  const isDayCompletable = (dayNumber: number) =>
    phase !== 'before_start' && dayNumber >= 1 && dayNumber <= officialDay;
  // J6: a chave é lida na chamada (e não copiada num valor do módulo) para os
  // testes cobrirem os dois valores.
  const isDayUnlocked = (dayNumber: number) =>
    FUTURE_DAYS_OPEN
      ? phase !== 'before_start' && dayNumber >= 1 && dayNumber <= campaign.total_days
      : isDayCompletable(dayNumber);

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
    gapDays,
    welcomeBack,
    daysToStart: phase === 'before_start' ? Math.max(0, 1 - info.rawDay) : 0,
    nextMilestone: nextMilestoneAfter(done),
    reached: reachedMilestones(done),
    todayDay: phase === 'before_start' ? null : getDay(officialDay),
    dayState,
    isDayUnlocked,
    isDayCompletable,
    ready: completions !== null && settings !== null,
  };
}

export function useDataset() {
  return getDataset();
}
