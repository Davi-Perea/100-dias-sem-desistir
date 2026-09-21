import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Anuncia um aviso curto (o motivo de uma recusa de permissão, por exemplo).
 *
 * `accessibilityLiveRegion` só funciona no Android; no iOS o VoiceOver não diz
 * nada quando o texto aparece. Por isso, no iOS, o aviso é anunciado aqui. No
 * Android a live region já anuncia, e chamar os dois repetiria a frase.
 */
export function announceNotice(message: string | null | undefined): void {
  if (!message || Platform.OS !== 'ios') return;
  AccessibilityInfo.announceForAccessibility(message);
}
