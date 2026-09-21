import { View } from 'react-native';

import { AppText } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/**
 * Instrução do guia, escrita pelo app (nunca texto bíblico, nunca texto da
 * igreja). Revisável pelo Product Brain sem tocar em mais nada.
 */
export const GUIDE_INSTRUCTION = 'Leia este capítulo na sua Bíblia.';

/**
 * B1 · Guia de leitura. É o que o leitor mostra enquanto o provedor não tem
 * texto licenciado (Gate 1 aberto): a leitura acontece na Bíblia da própria
 * pessoa, e o app conduz capítulo a capítulo até o "Concluir leitura".
 *
 * Decisão do engenheiro (delegada pelo fundador, 2026-09-21): a caixa "Texto
 * ainda não liberado" saiu. Para quem abre o app — e para o revisor da loja —
 * ela era uma tela por terminar (Apple 2.1). O guia é uma tela que funciona:
 * referência, instrução e posição, com o avanço no rodapé.
 *
 * Leitor de tela: a referência é o cabeçalho, a posição é lida uma vez, aqui
 * (a barra de topo do modo guia não repete nem uma nem outra).
 */
export function ReaderGuide({
  reference,
  position,
  count,
}: {
  /** "Josué 6" */
  reference: string;
  /** Base um. */
  position: number;
  count: number;
}) {
  const { colors } = useTheme();
  return (
    <View testID="reader-guide" style={{ gap: spacing.lg }}>
      {/* `display` (38/40), não o `displayXl`: "1 Tessalonicenses 5" ainda
          cabe em uma linha de 375 pt com a calha de 26. Sem teto de escala:
          em fonte grande a referência quebra linha, como qualquer título. */}
      <AppText variant="display" accessibilityRole="header" testID="reader-guide-reference">
        {reference}
      </AppText>
      <AppText variant="read" style={{ color: colors.text }} testID="reader-guide-instruction">
        {GUIDE_INSTRUCTION}
      </AppText>
      <AppText variant="rowLabel" style={{ color: colors.textSecondary }} testID="reader-guide-position">
        {`Capítulo ${position} de ${count}`}
      </AppText>
    </View>
  );
}
