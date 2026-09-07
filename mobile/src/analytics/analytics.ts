/**
 * Contrato de eventos (spec §23). Nenhum fornecedor está conectado: os eventos ficam
 * num buffer local inspecionável no painel DEV. Isso fixa o vocabulário antes de
 * escolher a ferramenta, sem enviar nada para fora do aparelho.
 *
 * PROIBIDO por spec: reflexão privada, jejum, texto de insight, texto editorial
 * consumido, texto de oração, e-mail e nome. Os tipos abaixo não têm campo para isso.
 */
export type AnalyticsEvent =
  | { name: 'onboarding_started' }
  | { name: 'onboarding_completed'; readingMode: string; fasting: boolean; reminder: string }
  | { name: 'journey_day_viewed'; dayNumber: number; isOfficialDay: boolean }
  | { name: 'reading_started'; dayNumber: number; mode: 'in_app' | 'own_bible' }
  | { name: 'reading_completed'; dayNumber: number; mode: 'in_app' | 'own_bible' | 'unknown' }
  | { name: 'reading_mode_selected'; mode: 'in_app' | 'own_bible' | 'both' }
  | { name: 'journey_viewed' }
  | { name: 'milestone_reached'; dayNumber: number }
  | { name: 'return_after_gap'; gapDays: number };

export type RecordedEvent = { event: AnalyticsEvent; at: string };

const MAX_BUFFER = 200;
const buffer: RecordedEvent[] = [];
let enabled = false;

/** Desligado por padrão (spec §26 menores / ECA Digital: defaults protetivos). */
export function setAnalyticsEnabled(value: boolean) {
  enabled = value;
}

export function track(event: AnalyticsEvent): void {
  if (!enabled) return;
  buffer.push({ event, at: new Date().toISOString() });
  if (buffer.length > MAX_BUFFER) buffer.shift();
}

export function recordedEvents(): RecordedEvent[] {
  return [...buffer].reverse();
}

export function clearRecordedEvents(): void {
  buffer.length = 0;
}
