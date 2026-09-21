/**
 * Tamanho do texto de leitura (B3). Faixa do TOKENS §3 `read`: 14 a 30, passo ±2,
 * padrão 19, entrelinha sempre 1,7×.
 *
 * CORREÇÃO TÉCNICA: a conta do desenho não fecha — de 19, com passo 2, só saem
 * ímpares (15…29), e os extremos pares 14 e 30 nunca seriam alcançados. A escala
 * vira uma lista explícita: os ímpares a partir do padrão, com 14 e 30 como
 * último passo de cada lado (é o que o PERGUNTAS_AO_DESIGNER registra como
 * decisão técnica).
 *
 * Migração: antes do redesenho o padrão era 18 e a escala era só de pares. Quem
 * tem 18 salvo nunca escolheu 18 — voltou ao padrão antigo, ou nunca mexeu — e
 * passa para o padrão novo, 19. Outros pares antigos (16, 20…) continuam
 * valendo como estão e o próximo toque cai no vizinho da escala nova.
 */

export const READER_FONT_MIN = 14;
export const READER_FONT_MAX = 30;
export const READER_FONT_DEFAULT = 19;
/** Padrão antes do redesenho. */
export const LEGACY_READER_FONT_DEFAULT = 18;

/** Os passos alcançáveis: 14 · 15 · 17 · 19 · 21 · 23 · 25 · 27 · 29 · 30. */
export const READER_FONT_STEPS: readonly number[] = [14, 15, 17, 19, 21, 23, 25, 27, 29, 30];

/** Entrelinha da leitura: sempre 1,7× o tamanho (19 → 32,3). */
export function readLineHeight(size: number): number {
  return Math.round(size * 1.7 * 10) / 10;
}

/** Valor efetivo a partir do que está salvo (ou de nada salvo ainda). */
export function normalizeReaderFontSize(stored: number | null | undefined): number {
  if (typeof stored !== 'number' || !Number.isFinite(stored)) return READER_FONT_DEFAULT;
  if (stored === LEGACY_READER_FONT_DEFAULT) return READER_FONT_DEFAULT;
  return Math.max(READER_FONT_MIN, Math.min(READER_FONT_MAX, Math.round(stored)));
}

/** Um passo para cima (+1) ou para baixo (−1) na escala. Nos extremos, fica. */
export function stepReaderFontSize(current: number, direction: 1 | -1): number {
  const size = normalizeReaderFontSize(current);
  if (direction > 0) return READER_FONT_STEPS.find((step) => step > size) ?? READER_FONT_MAX;
  return [...READER_FONT_STEPS].reverse().find((step) => step < size) ?? READER_FONT_MIN;
}

/** Fração da régua de 14 a 30 (0 a 1). */
export function readerFontFraction(size: number): number {
  return (normalizeReaderFontSize(size) - READER_FONT_MIN) / (READER_FONT_MAX - READER_FONT_MIN);
}
