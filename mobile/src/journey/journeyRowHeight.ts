/**
 * Altura das linhas da Jornada (A1), fora da tela.
 *
 * A lista é virtualizada: `getItemLayout` declara a altura de cada linha ANTES
 * de ela existir, e é esse número que posiciona a abertura no dia da igreja. Se
 * o declarado não bater com o renderizado, a Jornada abre no lugar errado e o
 * scroll salta ao virtualizar — justamente para quem usa fonte grande.
 *
 * Mora num módulo próprio para que a tela e o teste comparem dois números
 * calculados de forma independente, em vez de o teste reimplementar a conta.
 *
 * Contrato com a tela:
 *   - linha de dia: piso 48 (TELAS A1), paddingVertical 14, rótulo 15/20;
 *   - linha em aberto: piso 52, paddingVertical 16;
 *   - a linha renderiza com `minHeight` = este número (o teste confere);
 *   - o painel de hoje e a acolhida (A2) têm texto da igreja de tamanho
 *     variável: a altura deles é MEDIDA com `onLayout` e entra aqui pelo
 *     contexto. A estimativa só vale até a primeira medição.
 *
 * Sem teto de escala: o texto cresce até 3,571× (REGRAS 25) e a altura cresce
 * contando LINHAS, não multiplicando a caixa. Acima de `STACK_AT` o estado
 * ("Concluído", "Em aberto") desce para baixo do rótulo, porque lado a lado não
 * cabe; a conta segue o mesmo corte. Quebra de linha dentro do rótulo (monte
 * longo em fonte enorme) não é previsível sem medir: a tela mede cada linha e
 * usa a medida no `getItemLayout` quando ela existe.
 */

export const ROW_H = 48;
export const OPEN_ROW_H = 52;
/** Piso da reticência que expande trechos comprimidos. */
export const GAP_ROW_H = 48;

/** Respiro vertical de cada tipo de linha: (48 − 20) / 2 e (52 − 20) / 2. */
export const ROW_PAD = 14;
export const OPEN_ROW_PAD = 16;
export const GAP_ROW_PAD = 8;

/** rowLabel 15/20 · estado 12,5/17 · legenda do ministério 13/18 · reticência 13/18. */
export const LABEL_LINE_H = 20;
export const STATUS_LINE_H = 17;
export const MINISTRY_LINE_H = 18;
export const GAP_LINE_H = 18;
/** Espaço entre linhas de texto empilhadas. Não escala. */
export const LINE_GAP = 2;

/** A partir desta escala o estado vai para baixo do rótulo. */
export const STACK_AT = 1.6;

/** Estimativas até a primeira medição (painel de hoje e mensagem de entrada). */
export const TODAY_ESTIMATE_H = 440;
// PROVISÓRIO (decisão do engenheiro, 2026-09-21: a mensagem de entrada tem título, texto e dois botões, ~230 em 1x).
export const WELCOME_ESTIMATE_H = 230;

export type JourneyRow =
  | { kind: 'day'; day: number }
  | { kind: 'gap'; from: number; to: number }
  /** A2 · acolhida de quem voltou, logo acima dos dias em aberto. */
  | { kind: 'welcome' };

export type RowContext = {
  /** Dia do painel de hoje (campanha em curso); `null` quando não há painel. */
  todayDay: number | null;
  /** Dias em aberto (passados e não lidos): linha azul de piso 52. */
  openDays: ReadonlySet<number>;
  /** Dias em que o ministério da pessoa conduz o altar: uma linha a mais. */
  ministryDays: ReadonlySet<number>;
  /** Altura medida do painel de hoje, quando já medida. */
  todayHeight?: number | null;
  /** Altura medida da acolhida, quando já medida. */
  welcomeHeight?: number | null;
};

export function rowKey(row: JourneyRow): string {
  if (row.kind === 'welcome') return 'welcome';
  return row.kind === 'day' ? `d${row.day}` : `g${row.from}`;
}

export function isStacked(fontScale: number): boolean {
  return fontScale >= STACK_AT;
}

export function journeyRowHeight(row: JourneyRow, context: RowContext, fontScale: number): number {
  const s = Math.max(fontScale, 1);
  if (row.kind === 'welcome') return context.welcomeHeight ?? Math.round(WELCOME_ESTIMATE_H * s);
  if (row.kind === 'gap') return Math.max(GAP_ROW_H, Math.round(GAP_LINE_H * s + 2 * GAP_ROW_PAD));
  if (row.day === context.todayDay) return context.todayHeight ?? Math.round(TODAY_ESTIMATE_H * s);

  const open = context.openDays.has(row.day);
  const floor = open ? OPEN_ROW_H : ROW_H;
  const pad = open ? OPEN_ROW_PAD : ROW_PAD;
  let content = isStacked(s) ? LABEL_LINE_H * s + LINE_GAP + STATUS_LINE_H * s : LABEL_LINE_H * s;
  if (context.ministryDays.has(row.day)) content += LINE_GAP + MINISTRY_LINE_H * s;
  return Math.max(floor, Math.round(content + 2 * pad));
}
