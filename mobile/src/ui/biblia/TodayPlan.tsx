import { router } from 'expo-router';
import { View } from 'react-native';

import { formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import type { JourneySnapshot } from '@/journey/useJourney';
import { AppText, Block, Button, Cap } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { spacing, useTheme } from '@/ui/theme';

/** "23/09" — início da campanha no fuso dela, sem o ano. */
export function campaignStartLabel(journey: Pick<JourneySnapshot, 'campaign'>): string {
  return formatDayDate(1, journey.campaign).slice(0, 5);
}

/** O que o bloco mostra; `null` = não aparece (carregando ou campanha encerrada). */
export type TodayPlanState =
  | { kind: 'before'; startLabel: string }
  | { kind: 'today'; day: number; label: string; detail: string; completed: boolean };

export function todayPlanState(journey: JourneySnapshot): TodayPlanState | null {
  if (!journey.ready) return null;
  if (journey.phase === 'before_start') return { kind: 'before', startLabel: campaignStartLabel(journey) };
  if (journey.phase !== 'running') return null;
  const day = journey.officialDay;
  // Dia futuro nunca aparece: só o dia oficial, e só se já estiver liberado.
  if (!journey.isDayUnlocked(day)) return null;
  const summary = readingSummary(journey.todayDay);
  if (!summary) return null;
  return {
    kind: 'today',
    day,
    label: summary.label,
    detail: summary.detail,
    completed: journey.dayState(day) === 'completed',
  };
}

/**
 * Topo da aba Bíblia: a leitura do plano de hoje, a MESMA da Jornada (vem do
 * `useJourney`). Abre o leitor do dia; concluir continua sendo lá. Antes da
 * campanha só avisa a data, sem botão; depois dela o bloco some.
 */
export function TodayPlan({ state }: { state: TodayPlanState }) {
  const { colors } = useTheme();

  if (state.kind === 'before') {
    return (
      <Block testID="bible-plan" accessibilityLabel={`Plano de hoje. O plano começa em ${state.startLabel}`}>
        <View style={{ gap: spacing.xs }}>
          <Cap>Plano de hoje</Cap>
          <AppText variant="item" testID="bible-plan-before">
            O plano começa em {state.startLabel}
          </AppText>
        </View>
      </Block>
    );
  }

  const open = () => router.push({ pathname: '/reader/[day]', params: { day: String(state.day) } });

  return (
    <Block testID="bible-plan">
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Cap accessibilityLabel={`Plano de hoje, Dia ${state.day}`} testID="bible-plan-cap">
            Plano de hoje · Dia {state.day}
          </Cap>
          <AppText variant="readingRef" testID="bible-plan-reference">
            {state.label}
          </AppText>
          <AppText
            variant="caption"
            testID="bible-plan-detail"
            accessibilityLabel={state.detail.replace('~', 'cerca de ').replace(' · ', ', ')}
          >
            {state.detail}
          </AppText>
        </View>
        {state.completed ? (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            testID="bible-plan-done"
          >
            <Icon name="check" size={18} color={colors.success} />
            <AppText variant="rowLabel">Concluído</AppText>
          </View>
        ) : null}
        <Button
          title={state.completed ? 'Ler de novo' : 'Ler'}
          variant={state.completed ? 'outline' : 'primary'}
          onPress={open}
          accessibilityHint={`Abre a leitura do Dia ${state.day}`}
          testID="bible-plan-read"
        />
      </View>
    </Block>
  );
}
