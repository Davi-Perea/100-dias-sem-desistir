import { getBibleProvider } from '@/reader/provider';

/**
 * A aba Bíblia só aparece em release quando há texto de verdade registrado. Com
 * o provedor de desenvolvimento (texto de exemplo), uma aba de Bíblia sem Bíblia
 * seria tela por terminar (Apple 2.1) — em desenvolvimento ela aparece com a
 * faixa "Texto de exemplo".
 */
export function bibleTabVisible(): boolean {
  try {
    return __DEV__ || !getBibleProvider().getMetadata().isDevPlaceholder;
  } catch {
    return __DEV__;
  }
}
