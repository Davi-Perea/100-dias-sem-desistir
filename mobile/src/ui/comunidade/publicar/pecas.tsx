import { Image, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, radius, spacing, useReducedMotion, useTheme } from '@/ui/theme';

import { AttachIcon, type AttachIconName } from './icones';
import { chipLabel, removeLabel, type Attachment } from './rascunho';

/**
 * Peças do "Criar post" (F2): a linha de anexos, os chips do que foi anexado e
 * as fotos escolhidas. Só tokens do tema (src/ui/theme.ts); o peso vem da face
 * das variantes de `AppText` (nunca `fontWeight`).
 */

/** Movimento leve de entrada/saída, desligado com "Reduzir movimento" (os dois sinais). */
function useSoftMotion() {
  const themeReduced = useReducedMotion();
  const reanimatedReduced = useReanimatedReducedMotion();
  const reduced = themeReduced || reanimatedReduced;
  return {
    entering: reduced ? undefined : FadeIn.duration(180),
    exiting: reduced ? undefined : FadeOut.duration(140),
  };
}

/** A partir daqui a linha de anexos vira três por linha (o rótulo precisa de espaço). */
const WRAP_AT = 1.3;
/**
 * Com fonte muito grande (até 3,571×) nem um terço da tela cabe "Versículo":
 * cada botão vira uma linha inteira, ícone à esquerda e rótulo ao lado.
 */
const STACK_AT = 2;

export type AttachButton = {
  id: AttachIconName;
  /** Rótulo curto escrito embaixo do ícone. */
  label: string;
  /** Nome falado completo ("Anexar a leitura do dia"). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Linha de anexos. Cada botão tem alvo de 48 no mínimo (piso minHeight +
 * paddingVertical), ícone E rótulo escrito (nenhum ícone significa sozinho) e o
 * nome falado completo. Anexado = `markSurface`/`onMark`, a regra do "marcado".
 */
export function AttachBar({ buttons, testID = 'attach-bar' }: { buttons: AttachButton[]; testID?: string }) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const stack = fontScale >= STACK_AT;
  const wrap = !stack && fontScale >= WRAP_AT;
  return (
    <View
      testID={testID}
      accessibilityRole="toolbar"
      accessibilityLabel="Anexar"
      style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm }}
    >
      {buttons.map((button) => (
        <Pressable
          key={button.id}
          onPress={button.onPress}
          disabled={button.disabled}
          accessibilityRole="button"
          accessibilityLabel={button.accessibilityLabel}
          accessibilityHint={button.accessibilityHint}
          accessibilityState={{ selected: button.selected === true, disabled: button.disabled === true }}
          testID={`attach-${button.id}`}
          style={({ pressed }) => [
            {
              width: stack ? '100%' : wrap ? '33.33%' : `${100 / buttons.length}%`,
              minWidth: MIN_TOUCH,
              minHeight: MIN_TOUCH,
              paddingVertical: spacing.xs,
              flexDirection: stack ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: stack ? spacing.md : spacing.xs,
              opacity: button.disabled ? 0.45 : 1,
            },
            pressed && !button.disabled && { opacity: 0.72 },
          ]}
        >
          <View
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: button.selected ? colors.markSurface : colors.surfaceMuted,
            }}
          >
            <AttachIcon name={button.id} color={button.selected ? colors.onMark : colors.text} />
          </View>
          <AppText
            variant="caption"
            style={[{ color: colors.text, textAlign: 'center' }, stack && { flex: 1, textAlign: 'left' }]}
            aria-hidden
          >
            {button.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Chips do que foi anexado. O "x" de cada um é um botão de 48×48 com o nome
 * falado de QUAL anexo sai.
 */
export function AttachChips({
  attachments,
  onRemove,
}: {
  attachments: readonly Attachment[];
  onRemove: (attachment: Attachment) => void;
}) {
  const { colors } = useTheme();
  const motion = useSoftMotion();
  if (attachments.length === 0) return null;
  return (
    <View testID="attach-chips" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {attachments.map((attachment) => (
        <Animated.View
          key={attachment.kind}
          entering={motion.entering}
          exiting={motion.exiting}
          testID={`chip-${attachment.kind}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: '100%',
            minHeight: MIN_TOUCH,
            paddingLeft: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <AppText variant="rowLabel" style={{ flexShrink: 1, paddingVertical: spacing.sm }} testID={`chip-${attachment.kind}-label`}>
            {chipLabel(attachment)}
          </AppText>
          <Pressable
            onPress={() => onRemove(attachment)}
            accessibilityRole="button"
            accessibilityLabel={removeLabel(attachment)}
            testID={`chip-${attachment.kind}-remove`}
            style={({ pressed }) => [
              { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
              pressed && { opacity: 0.72 },
            ]}
          >
            <Icon name="close" size={18} color={colors.text} />
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

/** Uma foto escolhida (já preparada, sem metadados). */
export type ChosenPhoto = { key: string; uri: string };

/** Miniaturas das fotos escolhidas, cada uma com o seu "Tirar". */
export function PhotoStrip({ photos, onRemove }: { photos: readonly ChosenPhoto[]; onRemove: (key: string) => void }) {
  const { colors } = useTheme();
  const motion = useSoftMotion();
  if (photos.length === 0) return null;
  const THUMB = 96;
  return (
    <View testID="photo-strip" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {photos.map((photo, index) => (
        <Animated.View key={photo.key} entering={motion.entering} exiting={motion.exiting} style={{ width: THUMB }}>
          <Image
            testID={`photo-thumb-${index}`}
            source={{ uri: photo.uri }}
            accessible
            accessibilityLabel={`Foto ${index + 1} de ${photos.length}`}
            style={{ width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}
          />
          <Pressable
            onPress={() => onRemove(photo.key)}
            accessibilityRole="button"
            accessibilityLabel={`Tirar a foto ${index + 1}`}
            testID={`photo-remove-${index}`}
            style={({ pressed }) => [
              {
                position: 'absolute',
                top: 0,
                right: 0,
                width: MIN_TOUCH,
                height: MIN_TOUCH,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.72 },
            ]}
          >
            {/* Círculo de tinta sobre a foto: o "x" nunca depende das cores da imagem. */}
            <View
              aria-hidden
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.markSurface,
              }}
            >
              <Icon name="close" size={16} color={colors.onMark} />
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}
