import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { faces, floatShadow, glass, MIN_TOUCH, radius, spacing, useGutter, useReducedMotion, useTheme } from '@/ui/theme';

/**
 * "Conheça o Juntos" (pedido do fundador, 2026-09-22): na PRIMEIRA vez que a
 * pessoa abre a aba, um aviso por cima diz o que é este lugar, o que cabe aqui e
 * o que não cabe. Quatro linhas, e só isso.
 *
 * Mesmo padrão do aviso do versículo do dia (`ui/jornada/DailyVerseNotice.tsx`):
 * folha centrada sobre o véu, X grande de "Fechar" no topo, o véu NÃO fecha ao
 * toque, o voltar do Android fecha (prender a pessoa num aviso seria pior) e,
 * com "Reduzir movimento", aparece sem animação.
 *
 * As quatro linhas não são regras novas: são as frases das regras do Juntos
 * (`publicar/textos.ts`), encurtadas. Quem quiser o texto inteiro abre "Regras do
 * Juntos" no fim do feed; o aceite continua sendo na tela única de aceite, nunca
 * aqui — este aviso não pede nada e não registra nada no servidor.
 */
export const INTRO_TITLE = 'Conheça o Juntos';

export const INTRO_LINES = [
  'Aqui a igreja conta o que Deus falou na leitura do dia e o que achou dela.',
  'Dá para pedir oração, agradecer e dizer Amém no que os outros escreveram.',
  'Cabe aqui: sua reflexão, um versículo, uma foto da sua Bíblia ou do seu caderno.',
  'Não cabe: ofensa, violência, nudez ou expor outra pessoa. Isso é tirado do ar.',
] as const;

export function ConhecaOJuntos({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? glass.scrimDark : glass.scrim,
          justifyContent: 'center',
          paddingHorizontal: gutter,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        <View
          aria-modal
          testID="juntos-intro"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.block,
            maxHeight: height - insets.top - insets.bottom - spacing.xxl,
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            ...floatShadow,
            ...(isDark ? { borderWidth: 1, borderColor: glass.hairlineDark } : null),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: spacing.xl,
              paddingRight: spacing.xs,
              paddingTop: spacing.xs,
              gap: spacing.sm,
            }}
          >
            <AppText
              variant="cap"
              accessibilityRole="header"
              style={{ flex: 1, fontFamily: faces.sg700, color: colors.blue }}
              testID="juntos-intro-title"
            >
              {INTRO_TITLE}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={4}
              testID="juntos-intro-close"
              style={({ pressed }) => [
                {
                  minWidth: MIN_TOUCH,
                  minHeight: MIN_TOUCH,
                  paddingVertical: spacing.xs,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: MIN_TOUCH / 2,
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.xs,
              gap: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            {INTRO_LINES.map((line, index) => (
              <View
                key={index}
                style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}
                testID={`juntos-intro-line-${index}`}
              >
                <View
                  aria-hidden
                  style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text, marginTop: 9 }}
                />
                <AppText variant="item" style={{ flex: 1 }}>
                  {line}
                </AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
