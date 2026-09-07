import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { formatReference } from '@/bible/references';
import { getAllDays } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import { milestoneForDay } from '@/journey/milestones';
import { useJourney, type DayState } from '@/journey/useJourney';
import type { JourneyDay } from '@/journey/types';
import { AppText, Card, DevContentBanner, ProgressBar, Screen, StateView } from '@/ui/components';
import { iconSize, MIN_TOUCH, radius, spacing, useTheme } from '@/ui/theme';

const BASE_ROW_HEIGHT = 78;

/**
 * A lista é virtualizada com getItemLayout, que exige altura conhecida. Escalar a altura
 * junto com o tamanho de fonte do sistema mantém a virtualização E o Dynamic Type:
 * sem isso, o texto seria cortado no maior tamanho de fonte.
 */
function useRowHeight(): number {
  const { fontScale } = useWindowDimensions();
  return Math.round(BASE_ROW_HEIGHT * Math.min(Math.max(fontScale, 1), 2));
}

/** Estados nunca incluem "falhou" (spec §8): um dia não feito é "pendente". */
const STATE_LABEL: Record<DayState, string> = {
  completed: 'Concluído',
  today: 'Hoje',
  pending: 'Pendente',
  future: 'Em breve',
};

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const journey = useJourney();
  const listRef = useRef<FlatList<JourneyDay>>(null);
  const rowHeight = useRowHeight();
  const days = useMemo(() => getAllDays(), []);

  useFocusEffect(
    useCallback(() => {
      track({ name: 'journey_viewed' });
    }, []),
  );

  const renderItem = useCallback(
    ({ item }: { item: JourneyDay }) => {
      const state = journey.dayState(item.day_number);
      const unlocked = journey.isDayUnlocked(item.day_number);
      const milestone = milestoneForDay(item.day_number);
      const readings = item.readings.map((r) => formatReference(r.canonical_reference)).join(' · ');

      const dotColor =
        state === 'completed' ? colors.success : state === 'today' ? colors.accent : colors.controlBorder;

      return (
        <Pressable
          onPress={() => router.push({ pathname: '/dia/[day]', params: { day: String(item.day_number) } })}
          accessibilityRole="button"
          accessibilityLabel={`Dia ${item.day_number}. ${STATE_LABEL[state]}.${unlocked ? ` ${readings}` : ' Conteúdo disponível no dia.'}`}
          accessibilityHint="Abre o dia"
          android_ripple={{ color: colors.surfaceMuted }}
          style={({ pressed }) => [styles.row, { height: rowHeight, opacity: pressed ? 0.75 : 1 }]}>
          <View style={styles.rail}>
            <View style={[styles.railLine, { backgroundColor: colors.border }]} />
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: state === 'completed' ? colors.success : colors.background,
                  borderColor: dotColor,
                  borderWidth: state === 'today' ? 3 : 2,
                },
              ]}>
              {state === 'completed' ? <Ionicons name="checkmark" size={iconSize.sm - 4} color={colors.onAccent} /> : null}
            </View>
          </View>

          <View style={{ flex: 1, gap: 3, paddingVertical: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText style={{ fontWeight: '700' }}>Dia {item.day_number}</AppText>
              {state === 'today' ? (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                  <AppText style={{ color: colors.onAccent, fontSize: 11, fontWeight: '700' }}>HOJE</AppText>
                </View>
              ) : null}
              {milestone ? (
                <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                    {milestone.label.toUpperCase()}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="muted" numberOfLines={1}>
              {unlocked ? readings : 'Disponível no dia'} · {formatDayDate(item.day_number, journey.campaign)}
            </AppText>
          </View>

          {state === 'pending' ? (
            <AppText variant="muted" style={{ color: colors.textMuted }}>
              Pendente
            </AppText>
          ) : null}
        </Pressable>
      );
    },
    [journey, colors, rowHeight],
  );

  if (!journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(d) => String(d.day_number)}
        renderItem={renderItem}
        extraData={journey.completions}
        getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
        initialScrollIndex={Math.max(0, journey.officialDay - 3)}
        onScrollToIndexFailed={() => {}}
        initialNumToRender={14}
        windowSize={9}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={
          <View style={{ padding: spacing.lg, gap: spacing.lg }}>
            {journey.isDevContent ? <DevContentBanner compact /> : null}
            <Card>
              <View style={{ gap: spacing.sm }}>
                <AppText variant="eyebrow">Seu caminho</AppText>
                <AppText variant="title">
                  {journey.completedCount} de {journey.campaign.total_days} dias
                </AppText>
                <ProgressBar
                  value={journey.completedCount / journey.campaign.total_days}
                  label={`${journey.completedCount} de ${journey.campaign.total_days} dias concluídos`}
                />
                {journey.nextMilestone ? (
                  <AppText variant="muted">
                    Próximo marco: {journey.nextMilestone.label} (dia {journey.nextMilestone.day}).
                  </AppText>
                ) : (
                  <AppText variant="muted">Todos os marcos alcançados.</AppText>
                )}
                {journey.pendingDays.length > 0 ? (
                  <AppText variant="muted">
                    {journey.pendingDays.length} {journey.pendingDays.length === 1 ? 'dia pendente' : 'dias pendentes'} continuam
                    disponíveis. Você pode retomar quando quiser.
                  </AppText>
                ) : null}
              </View>
            </Card>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rail: { width: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
});
