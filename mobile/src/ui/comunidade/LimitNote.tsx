import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { AppText } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

/**
 * Aviso de limite de caracteres dos campos da Comunidade (comentário,
 * publicação, detalhes da denúncia, nome).
 *
 * Quem não enxerga a tela precisa saber que chegou perto do limite e, mais
 * ainda, por que o "Enviar" parou de funcionar. Duas partes:
 *
 * - a FRASE do estado ("Perto do limite…", "Passou do limite…"), numa live
 *   region. Ela só muda quando o estado muda, então o Android não repete a
 *   frase a cada letra digitada;
 * - a CONTAGEM ("950 de 1.000"), fora da live region: quem quiser, chega nela.
 *
 * No iOS a live region não existe; a frase é anunciada quando o estado muda
 * (`announceNotice`, que no Android não fala para não repetir).
 */
export type LimitPhase = 'ok' | 'near' | 'over';

export function limitPhase(length: number, max: number, nearFrom: number): LimitPhase {
  if (length > max) return 'over';
  if (length >= nearFrom) return 'near';
  return 'ok';
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

/** A frase que o leitor de tela diz, e que a tela mostra, em cada estado. */
export function limitSentence(phase: LimitPhase, max: number): string | null {
  if (phase === 'near') return `Perto do limite de ${formatCount(max)} caracteres.`;
  if (phase === 'over') {
    return `Passou do limite de ${formatCount(max)} caracteres. Apague um pouco para poder enviar.`;
  }
  return null;
}

/** Anuncia no iOS a frase do estado quando ele muda (e quando volta a caber). */
export function useLimitAnnouncement(phase: LimitPhase, max: number) {
  const previous = useRef<LimitPhase>(phase);
  useEffect(() => {
    const before = previous.current;
    previous.current = phase;
    if (before === phase) return;
    if (phase === 'ok') {
      if (before === 'over') announceNotice('Agora o texto cabe no limite.');
      return;
    }
    announceNotice(limitSentence(phase, max));
  }, [phase, max]);
}

export function LimitNote({
  length,
  max,
  nearFrom,
  testID,
}: {
  /** Caracteres contados como o servidor conta (`charLength`). */
  length: number;
  max: number;
  /** A partir de quantos caracteres o aviso aparece. */
  nearFrom: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const phase = limitPhase(length, max, nearFrom);
  useLimitAnnouncement(phase, max);
  const sentence = limitSentence(phase, max);
  if (!sentence) return null;
  const over = phase === 'over';
  return (
    <View testID={testID} style={{ gap: spacing.xs }}>
      <AppText
        variant={over ? 'captionStrong' : 'caption'}
        accessibilityLiveRegion="polite"
        style={over ? { color: colors.danger } : undefined}
        testID={testID ? `${testID}-sentence` : undefined}
      >
        {sentence}
      </AppText>
      <AppText variant="caption" testID={testID ? `${testID}-count` : undefined}>
        {`${formatCount(length)} de ${formatCount(max)} caracteres`}
      </AppText>
    </View>
  );
}
