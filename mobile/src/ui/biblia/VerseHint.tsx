import { Pressable, View } from 'react-native';

import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

/**
 * A dica de que o versículo responde ao toque.
 *
 * ACHADO NO TESTE COM USUÁRIO REAL, 23/09/2026: marcar versículo e anotar
 * existiam e funcionavam, e a pessoa leu capítulos inteiros sem desconfiar. Um
 * recurso que ninguém encontra é um recurso que não existe.
 *
 * O que ela é, e o que NÃO é:
 *  - uma faixa, UMA vez, dispensável, no fluxo do texto. Não é tutorial, não é
 *    carrossel, não é balão por cima do texto. Nada que cubra a leitura;
 *  - inline de propósito. A tela já tem duas coisas posicionadas de forma
 *    absoluta (a barra de cima e o rodapé), e foi justamente esse tipo de
 *    elemento que quebrou a rolagem no Android. Uma faixa no fluxo empurra o
 *    texto para baixo e some quando dispensada: nada a calcular;
 *  - some sozinha no momento em que a pessoa toca um versículo — aí ela já
 *    descobriu, e insistir viraria ruído.
 *
 * `verseHintSeen` fica nas preferências locais, junto do resto. Some com
 * "apagar meus dados", como tudo o mais.
 */
export const VERSE_HINT_TEXT = 'Dica: toque em um versículo para marcar ou adicionar uma anotação.';

export function useVerseHint(): { visible: boolean; dismiss: () => void } {
  const settings = useSettings();
  // Enquanto o disco não respondeu, não mostra: piscar a dica e sumir é pior
  // que mostrá-la um instante depois.
  const visible = settings !== null && !settings.verseHintSeen;
  const dismiss = () => {
    if (!visible) return;
    // Falha de gravação só custa a dica reaparecer na próxima abertura.
    void updateSettings((s) => ({ ...s, verseHintSeen: true })).catch(() => undefined);
  };
  return { visible, dismiss };
}

export function VerseHint({ onDismiss }: { onDismiss: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      testID="verse-hint"
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.warningSurface,
        borderRadius: radius.button,
        paddingLeft: spacing.lg,
        paddingRight: spacing.xs,
        paddingVertical: spacing.xs,
        minHeight: MIN_TOUCH,
      }}
    >
      <AppText variant="caption" style={{ flex: 1, color: colors.warning }}>
        {VERSE_HINT_TEXT}
      </AppText>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Entendi, dispensar a dica"
        testID="verse-hint-dismiss"
        // Alvo de toque de 44, mesmo o ícone sendo pequeno.
        style={({ pressed }) => [
          { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Icon name="close" size={18} color={colors.warning} />
      </Pressable>
    </View>
  );
}
