import type { Campaign } from './types';

/**
 * Dia oficial da campanha (spec §8): derivado de start_date + fuso oficial,
 * igual para toda a igreja, independente do fuso do aparelho.
 */

const MS_PER_DAY = 86_400_000;

/** Converte um instante para a data de calendário no fuso da campanha (offset fixo). */
export function calendarDateInCampaignTz(instant: Date, campaign: Campaign): string {
  const shifted = new Date(instant.getTime() + campaign.utc_offset_minutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function dateStringToUtcMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Dia da campanha para um instante. Pode ser < 1 (campanha ainda não começou)
 * ou > total_days (campanha encerrada). Use `officialDay` para o valor clampado.
 */
export function rawCampaignDay(instant: Date, campaign: Campaign): number {
  const today = dateStringToUtcMs(calendarDateInCampaignTz(instant, campaign));
  const start = dateStringToUtcMs(campaign.start_date);
  return Math.floor((today - start) / MS_PER_DAY) + 1;
}

export type CampaignPhase = 'before_start' | 'running' | 'finished';

export type OfficialDayInfo = {
  /** Dia exibido ao usuário, sempre entre 1 e total_days. */
  officialDay: number;
  rawDay: number;
  phase: CampaignPhase;
  daysRemaining: number;
};

export function officialDayInfo(instant: Date, campaign: Campaign): OfficialDayInfo {
  const rawDay = rawCampaignDay(instant, campaign);
  const phase: CampaignPhase = rawDay < 1 ? 'before_start' : rawDay > campaign.total_days ? 'finished' : 'running';
  const officialDay = Math.min(Math.max(rawDay, 1), campaign.total_days);
  return { officialDay, rawDay, phase, daysRemaining: Math.max(0, campaign.total_days - officialDay) };
}

/** Data de calendário (no fuso da campanha) de um dia da jornada. */
export function dateOfDay(dayNumber: number, campaign: Campaign): string {
  const ms = dateStringToUtcMs(campaign.start_date) + (dayNumber - 1) * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatDayDate(dayNumber: number, campaign: Campaign): string {
  const [y, m, d] = dateOfDay(dayNumber, campaign).split('-');
  return `${d}/${m}/${y}`;
}
