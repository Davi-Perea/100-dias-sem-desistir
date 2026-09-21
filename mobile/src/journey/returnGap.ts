import { completedDayNumbers, lastCompletionInstant, type Completions } from '@/progress/completionsStore';

import { rawCampaignDay } from './officialDay';
import type { Campaign } from './types';

/**
 * Acolhida de retorno (A2, "Que bom ter você de volta").
 *
 * DIA-02: a lacuna é medida pelo INSTANTE da última conclusão, não pelo maior
 * número de dia concluído. Quem entra no dia 20 e lê o Dia 1 hoje, ou quem lê
 * todo dia alguns dias atrás da igreja, não se ausentou e não recebe a acolhida.
 *
 * R0-5: o TELAS pede "três ou mais dias em aberto consecutivos antes de hoje".
 * Se a última conclusão aconteceu no dia L da campanha, nenhum dia depois de L
 * pode estar concluído (dia futuro não abre), então os dias L+1 … hoje−1 estão
 * todos em aberto: são `hoje − L − 1` dias. Três deles exigem `hoje − L ≥ 4`.
 * // PROVISÓRIO (decisão do engenheiro, 2026-09-21: critério "desde a última conclusão" mantido até o designer responder LACUNAS C2)
 */
export const WELCOME_BACK_MIN_GAP = 4;

/**
 * Dia da campanha em que aconteceu a conclusão mais recente.
 * `dayShift` desloca o calendário quando o painel DEV simula outro dia oficial,
 * para a conta seguir o mesmo "hoje" simulado.
 * Sem instante legível (dado antigo ou corrompido), cai no maior dia concluído.
 */
export function lastCompletionCampaignDay(
  completions: Completions | null,
  campaign: Campaign,
  dayShift = 0,
): number | null {
  const instant = lastCompletionInstant(completions);
  if (instant) return rawCampaignDay(instant, campaign) + dayShift;
  const done = completedDayNumbers(completions);
  return done.length === 0 ? null : done[done.length - 1];
}

/**
 * Dias desde a última conclusão (0 = concluiu algo hoje). Nulo para quem nunca
 * concluiu nada. Usado para a mensagem de retomada, nunca para punição.
 */
export function daysSinceLastCompletion(
  completions: Completions | null,
  todayCampaignDay: number,
  campaign: Campaign,
  dayShift = 0,
): number | null {
  const last = lastCompletionCampaignDay(completions, campaign, dayShift);
  if (last === null) return null;
  return Math.max(0, todayCampaignDay - last);
}

/**
 * Mensagem de entrada da Jornada (substitui a acolhida A2 antiga).
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: pedido do fundador — "os dias que
 * eu não fiz têm que aparecer, mas o destaque é hoje; quando a pessoa entrar, uma
 * mensagem com quantos dias estão em aberto"): substitui a acolhida sem número da
 * D-3/REGRAS 9. O fundador PEDIU o número; a cópia diz sempre "em aberto", nunca
 * "perdidos/pendentes/atrasados". Aparece com 2 ou mais dias em aberto antes de hoje.
 */
export const ENTRY_MESSAGE_MIN_OPEN = 2;

export type EntryMessage = {
  /** `first_time`: nunca concluiu nada (entrou depois do início). `resume`: já leu antes. */
  variant: 'first_time' | 'resume';
  /** Dias em aberto antes de hoje. */
  openCount: number;
  /** O dia em aberto mais antigo — por onde começar/retomar. */
  firstOpen: number;
  /** O dia em que a igreja está. */
  todayDay: number;
};

/** Decide a mensagem de entrada, ou `null` quando ela não cabe. Conta pura, sem tela. */
export function entryMessage({
  running,
  officialDay,
  pendingDays,
  completedCount,
}: {
  running: boolean;
  officialDay: number;
  pendingDays: readonly number[];
  completedCount: number;
}): EntryMessage | null {
  if (!running) return null;
  const open = pendingDays.filter((d) => d < officialDay).sort((a, b) => a - b);
  if (open.length < ENTRY_MESSAGE_MIN_OPEN) return null;
  return {
    variant: completedCount === 0 ? 'first_time' : 'resume',
    openCount: open.length,
    firstOpen: open[0],
    todayDay: officialDay,
  };
}
