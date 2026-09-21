import { useSyncExternalStore } from 'react';
import { AppState, type NativeEventSubscription } from 'react-native';

import { getCampaign } from './datasetSource';

/**
 * Relógio ÚNICO do dia oficial (DIA-04).
 *
 * Antes cada `useJourney` tinha o seu `now`, renovado só quando o app voltava do
 * background: com o app aberto na virada da meia-noite, as telas montadas antes
 * ficavam no dia anterior e as abertas depois já no seguinte. Agora todas leem
 * o mesmo instante, que é renovado:
 *  - na meia-noite do fuso da campanha (São Paulo, `utc_offset_minutes`), por um
 *    timer agendado enquanto houver alguém ouvindo;
 *  - quando o app volta a ficar ativo (timers não correm com o app suspenso).
 * O dia oficial só depende da data no fuso da campanha, então renovar na
 * meia-noite basta — não há motivo para um tique por minuto.
 */

const MS_PER_DAY = 86_400_000;
/** Folga depois da meia-noite, para o timer nunca disparar ainda no dia anterior. */
const MIDNIGHT_SLACK_MS = 1_000;

let current = new Date();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

/** Milissegundos até a próxima meia-noite no fuso da campanha (mais a folga). */
export function msUntilNextCampaignMidnight(instant: Date, utcOffsetMinutes: number): number {
  const shifted = instant.getTime() + utcOffsetMinutes * 60_000;
  const nextMidnight = Math.floor(shifted / MS_PER_DAY) * MS_PER_DAY + MS_PER_DAY;
  return nextMidnight - shifted + MIDNIGHT_SLACK_MS;
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(tick, msUntilNextCampaignMidnight(current, getCampaign().utc_offset_minutes));
}

function tick() {
  current = new Date();
  schedule();
  listeners.forEach((listener) => listener());
}

/** Sem ninguém ouvindo, o instante guardado envelhece; renova se passou de um segundo. */
function refreshIfStale() {
  if (Math.abs(Date.now() - current.getTime()) > MIDNIGHT_SLACK_MS) current = new Date();
}

/** Instante atual do relógio compartilhado. */
export function getCampaignNow(): Date {
  return current;
}

/** Força a leitura do relógio agora (volta do background, testes). */
export function refreshCampaignClock(): void {
  tick();
}

export function subscribeCampaignClock(listener: () => void): () => void {
  if (listeners.size === 0) {
    // Primeiro ouvinte: o instante guardado pode ser de muito antes.
    refreshIfStale();
    appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    schedule();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    if (timer) clearTimeout(timer);
    timer = null;
    appStateSubscription?.remove();
    appStateSubscription = null;
  };
}

/** Leitura para o React: sem ninguém ouvindo, renova o instante envelhecido antes de entregar. */
function snapshot(): Date {
  if (listeners.size === 0) refreshIfStale();
  return current;
}

/** Instante do relógio compartilhado; toda tela vira de dia no mesmo momento. */
export function useCampaignNow(): Date {
  return useSyncExternalStore(subscribeCampaignClock, snapshot, snapshot);
}
