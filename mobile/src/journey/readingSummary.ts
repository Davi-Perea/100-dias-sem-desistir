import { expandChapters, formatReference } from '@/bible/references';

import type { JourneyDay } from './types';

/**
 * Estimativa de ritmo de leitura em voz baixa, em capítulos por minuto.
 *
 * A contagem de capítulos é exata (vem das referências do dia); o tempo é
 * DERIVADO desta constante e sempre aparece com "~". Três minutos por capítulo
 * corresponde a ~200 palavras por minuto sobre a Bíblia inteira (~780 mil
 * palavras em 1.189 capítulos): 12 capítulos dão ~36 min. É estimativa
 * conservadora, não dado editorial.
 */
const MINUTES_PER_CHAPTER = 3;

export type ReadingSummary = {
  /** "Gênesis 39–45" — referências do dia, já formatadas e unidas. */
  label: string;
  chapters: number;
  /** Minutos estimados, arredondados. `null` quando não há capítulo algum. */
  minutes: number | null;
  /** "7 capítulos · ~18 min" */
  detail: string;
};

export function readingSummary(day: JourneyDay | null): ReadingSummary | null {
  if (!day || day.readings.length === 0) return null;

  const ordered = [...day.readings].sort((a, b) => a.sort_order - b.sort_order);
  const label = ordered.map((reading) => formatReference(reading.canonical_reference)).join(' · ');
  const chapters = ordered.reduce(
    (total, reading) => total + expandChapters(reading.canonical_reference).length,
    0,
  );
  const minutes = chapters > 0 ? Math.max(1, Math.round(chapters * MINUTES_PER_CHAPTER)) : null;

  const parts = [chapters === 1 ? '1 capítulo' : `${chapters} capítulos`];
  if (minutes !== null) parts.push(`~${minutes} min`);

  return { label, chapters, minutes, detail: parts.join(' · ') };
}

/**
 * Divide o tema em três pedaços para o realce amarelo: antes, realçado, depois.
 * Se a palavra não estiver no tema, devolve o tema inteiro sem realce — nunca
 * escolhe uma palavra por conta própria.
 */
export function splitHighlight(
  text: string,
  highlight: string | null | undefined,
): { before: string; match: string | null; after: string } {
  if (!highlight) return { before: text, match: null, after: '' };
  const index = text.toLocaleLowerCase().indexOf(highlight.toLocaleLowerCase());
  if (index < 0) return { before: text, match: null, after: '' };
  return {
    before: text.slice(0, index),
    match: text.slice(index, index + highlight.length),
    after: text.slice(index + highlight.length),
  };
}
