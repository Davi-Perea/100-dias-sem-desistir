import type { JourneyRow } from '@/journey/journeyRowHeight';

/** Quantos dias passados ficam à vista logo acima de hoje (ou do fim, depois da campanha). */
export const RECENT_PAST_DAYS = 3;

/**
 * Quais dias aparecem no trilho.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: pedido do fundador — "os dias que
 * eu não fiz têm que aparecer, mas o destaque é o dia de hoje"): acima de hoje
 * ficam só os `RECENT_PAST_DAYS` dias mais recentes. Os mais antigos viram UMA
 * linha recolhida no topo ("Mostrar dias anteriores · N em aberto"), que expande
 * a trilha inteira. Abaixo de hoje nada mudou: a vizinhança, os dias do
 * ministério da pessoa e o último dia ficam à vista, o resto vira reticência
 * clicável (LACUNAS P14, ver `GapRow`).
 *
 * PROVISÓRIO (pergunta 16 ao designer / LACUNAS P14): os marcos 7/25/50/75/100
 * não são âncoras nem têm rótulo na linha — o A1 desenha só as quatro formas de
 * nó (concluído, em aberto, hoje, futuro).
 *
 * `edge` é o primeiro dia que NÃO é passado: hoje na campanha em curso, `total + 1`
 * depois dela. A linha recolhida é sempre a reticência que começa no dia 1.
 */
export function buildRows(
  edge: number,
  total: number,
  expanded: boolean,
  ministryDays: readonly number[],
): JourneyRow[] {
  if (expanded) return Array.from({ length: total }, (_, i) => ({ kind: 'day', day: i + 1 }));

  const rows: JourneyRow[] = [];
  const firstRecent = Math.max(1, edge - RECENT_PAST_DAYS);
  if (firstRecent > 1) rows.push({ kind: 'gap', from: 1, to: firstRecent - 1 });
  for (let day = firstRecent; day < edge && day <= total; day += 1) rows.push({ kind: 'day', day });
  if (edge > total) return rows;

  const anchors = new Set<number>([total, ...ministryDays]);
  for (let day = edge; day <= edge + 3; day += 1) anchors.add(day);
  const future = [...anchors].filter((d) => d >= edge && d <= total).sort((a, b) => a - b);
  future.forEach((day, index) => {
    const previous = future[index - 1];
    if (previous !== undefined && day - previous > 1) rows.push({ kind: 'gap', from: previous + 1, to: day - 1 });
    rows.push({ kind: 'day', day });
  });
  return rows;
}

/** A linha recolhida dos dias anteriores é a reticência que começa no dia 1. */
export function isEarlierGap(row: JourneyRow): boolean {
  return row.kind === 'gap' && row.from === 1;
}
