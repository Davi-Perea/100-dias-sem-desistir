import { spacing } from '../theme';

/** Quantas linhas acima de hoje a abertura tenta mostrar (a "recuperação de quem faltou"). */
export const LEAD_ROWS = 3;

/**
 * Onde a casa abre (TELAS A1, "de cima para baixo"): as linhas logo acima de
 * hoje — a linha "Em aberto" de quem faltou um ou dois dias — e o painel de hoje
 * INTEIRO abaixo delas. Mostra até três linhas acima, só o quanto couber sem
 * empurrar o painel para fora da janela. Com a acolhida (A2), abre nela. Fora da
 * campanha em curso, abre no topo (`null`).
 *
 * 2026-09-22: quando o cabeçalho e as linhas passadas cabem acima do painel, a
 * abertura vai ao topo — assim o contador de dias lidos aparece sem rolar.
 *
 * `offsets`/`lengths` são os mesmos números do `getItemLayout` da lista.
 */
export function openingOffset({
  running,
  offsets,
  lengths,
  todayIndex,
  welcomeIndex,
  viewport,
}: {
  running: boolean;
  offsets: readonly number[];
  lengths: readonly number[];
  todayIndex: number;
  welcomeIndex: number;
  viewport: number;
}): number | null {
  if (!running) return null;
  if (welcomeIndex >= 0) return offsets[welcomeIndex] ?? null;
  if (todayIndex < 0) return null;
  const today = offsets[todayIndex] ?? 0;
  const first = Math.max(0, todayIndex - LEAD_ROWS);
  const above = today - (offsets[first] ?? 0);
  const room = Math.max(0, viewport - (lengths[todayIndex] ?? 0) - spacing.lg);
  // Se TUDO o que existe acima de hoje (o cabeçalho com o contador de dias lidos
  // e as linhas passadas) couber acima do painel, a casa abre no topo: o
  // contador não pode nascer fora da tela (o fundador não o viu, 2026-09-22).
  // Quando não couber, o painel de hoje vence — é o que a pessoa vem fazer.
  if (today <= room) return 0;
  return Math.max(0, today - Math.min(above, room));
}

/**
 * O `initialScrollIndex` só aceita índice: a primeira linha que começa dentro
 * da janela de abertura (uma linha cortada ao meio no topo fica de fora, para o
 * painel nunca ser empurrado). A casa corrige para o deslocamento exato assim
 * que a lista é medida.
 */
export function openingIndex(offsets: readonly number[], offset: number | null): number | undefined {
  if (offset === null) return undefined;
  const found = offsets.findIndex((value) => value >= offset - 0.5);
  return found >= 0 ? found : undefined;
}
