import type { CanonicalReference } from '@/bible/references';

/**
 * Costura do texto bíblico (spec §7). Existe para trocar o provider sem tocar nas
 * telas. Em produção: a Bíblia Livre empacotada (bibliaLivreProvider.ts, decisão do
 * fundador de 2026-09-21); o devProvider fica só para os testes que o usam. Não é framework universal:
 * quatro capacidades apenas — passagem, metadados, copyright, política de cache.
 */

export type Verse = { verse: number; text: string };

export type Passage = {
  reference: string;
  book: string;
  bookName: string;
  chapter: number;
  /**
   * Título que a tradução põe antes do versículo 1 (ex.: título do salmo). Não é
   * versículo nem nota; opcional porque nem todo provedor tem.
   */
  heading?: string | null;
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
