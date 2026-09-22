import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatReference } from '@/bible/references';
import { type KeyVerse, loadKeyVerse } from '@/journey/keyVerse';
import type { JourneyDay } from '@/journey/types';

import { AppText } from '../components';
import { Icon } from '../icons';
import { faces, floatShadow, glass, MIN_TOUCH, radius, spacing, useGutter, useReducedMotion, useTheme } from '../theme';

/**
 * J4 · aviso do dia (feedback do fundador, 2026-09-22): ao abrir o app, uma vez
 * por dia, a ênfase do dia e o versículo-base em destaque, fechado só no X.
 *
 * - A ênfase é o `title` do dataset da igreja, exatamente como veio (nunca
 *   reescrita nem cortada).
 * - O versículo-base vem de `key_verse_reference`; o texto é o da Bíblia Livre
 *   empacotada, com a atribuição curta ao lado (a completa fica no leitor e em
 *   "Sobre"). Sem achar o texto, fica só a referência.
 * - O véu NÃO fecha ao toque (o pedido é "só o X"); o voltar do Android fecha,
 *   como o X, porque prender a pessoa num aviso seria pior.
 * - Com "Reduzir movimento", aparece sem animação.
 */
export function DailyVerseNotice({
  visible,
  day,
  dayData,
  onClose,
}: {
  visible: boolean;
  day: number;
  dayData: JourneyDay | null;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const reduced = useReducedMotion();
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reference = dayData?.key_verse_reference ?? null;
  const [verse, setVerse] = useState<{ ref: string; value: KeyVerse | null } | null>(null);

  useEffect(() => {
    if (!visible || !reference) return;
    let alive = true;
    loadKeyVerse(reference).then((value) => {
      if (alive) setVerse({ ref: reference, value });
    });
    return () => {
      alive = false;
    };
  }, [visible, reference]);

  const current = verse && verse.ref === reference ? verse.value : null;
  const title = dayData?.title ?? null;

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
          testID="daily-notice"
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
              accessibilityLabel={`Dia ${day}, palavra do dia`}
              style={{ flex: 1, fontFamily: faces.sg700, color: colors.blue }}
            >
              {`Dia ${day} · palavra do dia`}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={4}
              testID="daily-notice-close"
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
            {title ? (
              <AppText variant="blockTitle" testID="daily-notice-emphasis">
                {title}
              </AppText>
            ) : null}

            {reference ? (
              <View style={{ gap: spacing.sm }} testID="daily-notice-verse">
                {/* O texto da tradução como veio: sem aspas, cortes ou ajustes. */}
                {current?.text ? (
                  <AppText variant="quote" style={{ fontSize: 19, lineHeight: 30 }} testID="daily-notice-verse-text">
                    {current.text}
                  </AppText>
                ) : null}
                <AppText
                  variant="captionStrong"
                  accessibilityLabel={
                    current?.translation ? `${current.label}, ${current.translation}` : undefined
                  }
                  testID="daily-notice-reference"
                >
                  {current?.translation
                    ? `${current.label} · ${current.translation}`
                    : (current?.label ?? formatReference(reference))}
                </AppText>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

