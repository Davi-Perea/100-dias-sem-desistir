import type { CanonicalReference } from '@/bible/references';

/**
 * Costura do texto bíblico (spec §7). Existe para trocar o provider quando a licença
 * de tradução for resolvida (Gate 1) sem tocar nas telas. Não é framework universal:
 * quatro capacidades apenas — passagem, metadados, copyright, política de cache.
 */

export type Verse = { verse: number; text: string };

export type Passage = {
  reference: string;
  book: string;
  bookName: string;
  chapter: number;
  verses: Verse[];
};

export type TranslationMetadata = {
  id: string;
  name: string;
  abbreviation: string;
  language: string;
  /** Texto de atribuição exigido pela licença; exibido no Reader e em "Sobre". */
  copyrightNotice: string;
  attributionRequired: boolean;
  /** O que a licença permite guardar no dispositivo (spec §22). */
  cachePolicy: 'bundled' | 'persistent' | 'session' | 'none';
  offlineAvailable: boolean;
  /** true enquanto não houver tradução licenciada — a UI precisa avisar. */
  isDevPlaceholder: boolean;
};

export interface BibleTextProvider {
  getMetadata(): TranslationMetadata;
  getPassage(reference: CanonicalReference): Promise<Passage>;
}

let active: BibleTextProvider | null = null;

export function setBibleProvider(provider: BibleTextProvider) {
  active = provider;
}

export function getBibleProvider(): BibleTextProvider {
  if (!active) throw new Error('Nenhum BibleTextProvider registrado.');
  return active;
}
