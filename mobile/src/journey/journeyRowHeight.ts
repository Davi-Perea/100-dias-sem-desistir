/**
 * Altura das linhas da Jornada, fora da tela.
 *
 * A lista é virtualizada: `getItemLayout` declara a altura de cada linha ANTES
 * de ela existir, e é esse número que posiciona a abertura no dia da igreja. Se
 * o declarado não bater com o renderizado, a Jornada abre no lugar errado e o
 * scroll salta ao virtualizar — justamente para quem usa fonte grande.
 *
 * Mora num módulo próprio por um motivo só: assim a tela e o teste podem
 * comparar dois números calculados de forma independente, em vez de o teste
 * reimplementar a conta (e concordar com o próprio erro).
 */

export const ROW_H = 64;
export const TODAY_ROW_H = 96;
export const GAP_ROW_H = 48;
/** A linha do ministério acrescenta uma linha de texto. */
export const MINISTRY_EXTRA_H = 16;

export type JourneyRow = { kind: 'day'; day: number } | { kind: 'gap'; from: number; to: number };

export type RowContext = {
  officialDay: number;
  ministryDays: ReadonlySet<number>;
};

/**
 * O teto de 2× é dívida consciente: acima dele as linhas param de crescer
 * enquanto o texto continua. Subir o teto sozinho não resolve — a altura
 * multiplica constantes em vez de contar linhas, então o desvio troca de sinal
 * em vez de sumir. Está registrado em EXECUTION_04_REVISAO.md.
 */
export function journeyRowHeight(row: JourneyRow, context: RowContext, fontScale: number): number {
  // A reticência não escala: ela tem três pontos e uma linha curta, e renderiza
  // 48px em qualquer tamanho de fonte. Escalá-la era a única divergência do app
  // em que o declarado ficava MAIOR que o renderizado.
  if (row.kind === 'gap') return GAP_ROW_H;
  const scale = Math.min(Math.max(fontScale, 1), 2);
  const base = row.day === context.officialDay ? TODAY_ROW_H : ROW_H;
  const extra = context.ministryDays.has(row.day) ? MINISTRY_EXTRA_H : 0;
  return Math.round((base + extra) * scale);
}
