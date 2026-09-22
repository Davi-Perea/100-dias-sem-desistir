import { Pressable, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';

import type { Settings } from '@/settings/settingsStore';

import { AppText, Block, Rule } from '../components';
import { Icon } from '../icons';
import { MIN_TOUCH, spacing, useReducedMotion, useTheme } from '../theme';

/**
 * V1 · "Comece por aqui" (feedback do fundador, 2026-09-22): três passos que
 * deixam os 100 dias com a cara da pessoa — nome, metas e lembrete. Cada um
 * ganha ✓ quando feito; com os três feitos, o cartão some.
 *
 * Tudo sai das preferências locais (`settings.profile`, `settings.reminder`):
 * nada vai para servidor.
 *
 * Movimento (G1): o ✓ entra com um zoom curto e o cartão sai com fade. Com
 * "Reduzir movimento", nenhum dos dois: o estado troca na hora.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) Bloco quente com
 * linhas no ritmo de `SettingRow`; o círculo do passo segue a regra do
 * "marcado" da `Checkbox` (`markSurface` + `onMark`, vazio em `controlBorder`).
 */
export type StartStepId = 'name' | 'goals' | 'reminder';
export type StartStep = { id: StartStepId; label: string; done: boolean; value?: string };

export function startSteps(settings: Settings): StartStep[] {
  const { name, goals } = settings.profile;
  const reminder = settings.reminder;
  return [
    { id: 'name', label: 'Como podemos te chamar?', done: name !== null, value: name ?? undefined },
    {
      id: 'goals',
      label: 'Suas metas para os 100 dias',
      done: goals.length > 0,
      value: goals.length > 0 ? `${goals.length} ${goals.length === 1 ? 'meta' : 'metas'}` : undefined,
    },
    {
      id: 'reminder',
      label: 'Um lembrete para ler',
      done: reminder.slot !== 'none',
      value:
        reminder.slot !== 'none'
          ? `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`
          : undefined,
    },
  ];
}

export function StartHereCard({
  settings,
  onOpen,
}: {
  settings: Settings;
  onOpen: (step: StartStepId) => void;
}) {
  const reduced = useReducedMotion();
  const steps = startSteps(settings);
  if (steps.every((step) => step.done)) return null;
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Animated.View exiting={reduced ? undefined : FadeOut.duration(240)} testID="start-here">
      <Block tone="warm">
        <View style={{ gap: spacing.xs, paddingBottom: spacing.sm }}>
          <AppText variant="blockTitle" accessibilityRole="header">
            Comece por aqui
          </AppText>
          <AppText variant="caption">
            {doneCount} de {steps.length} feitos. Tudo fica só neste aparelho.
          </AppText>
        </View>
        {steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            first={index === 0}
            reduced={reduced}
            onPress={() => onOpen(step.id)}
          />
        ))}
      </Block>
    </Animated.View>
  );
}

function StepRow({
  step,
  first,
  reduced,
  onPress,
}: {
  step: StartStep;
  first: boolean;
  reduced: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const spoken = [step.label, step.value, step.done ? 'feito' : 'a fazer'].filter(Boolean).join(', ');
  return (
    <View>
      {first ? null : <Rule />}
      <Pressable
        onPress={onPress}
        testID={`start-step-${step.id}`}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        style={({ pressed }) => [
          {
            minHeight: MIN_TOUCH,
            paddingVertical: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: step.done ? 0 : 2,
            borderColor: colors.controlBorder,
            backgroundColor: step.done ? colors.markSurface : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step.done ? (
            <Animated.View entering={reduced ? undefined : ZoomIn.duration(220)} testID={`start-step-${step.id}-done`}>
              <Icon name="check" size={18} color={colors.onMark} strokeWidth={2.6} />
            </Animated.View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="rowLabel">{step.label}</AppText>
          {step.value ? <AppText variant="caption">{step.value}</AppText> : null}
        </View>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
