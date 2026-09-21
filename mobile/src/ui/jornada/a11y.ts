import type { ReadingSummary } from '@/journey/readingSummary';

/**
 * Rótulos acessíveis sem "·" nem "~" (REGRAS 32): sem isso o leitor de tela fala
 * "ponto" e "til" no meio da frase.
 */

/** "Josué 6–17 · Salmos 1" → "Josué 6–17, Salmos 1". */
export function speakList(text: string): string {
  return text.replace(/\s*·\s*/g, ', ');
}

/** "12 capítulos · ~36 min" → "12 capítulos, cerca de 36 minutos". */
export function speakReadingDetail(summary: ReadingSummary): string {
  const chapters = summary.chapters === 1 ? '1 capítulo' : `${summary.chapters} capítulos`;
  if (summary.minutes === null) return chapters;
  const minutes = summary.minutes === 1 ? '1 minuto' : `${summary.minutes} minutos`;
  return `${chapters}, cerca de ${minutes}`;
}
