import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { track } from '@/analytics/analytics';
import { getDay } from '@/journey/datasetSource';
import { MILESTONE_DAYS, milestoneForDay } from '@/journey/milestones';
import { daysForMinistry } from '@/journey/ministries';
import { journeyRowHeight, type JourneyRow as Row } from '@/journey/journeyRowHeight';
import { formatDayDate } from '@/journey/officialDay';
import { SPHERE_LABEL } from '@/journey/spheres';
import { useJourney, type DayState } from '@/journey/useJourney';
import { useSettings } from '@/settings/settingsStore';
import { Dove } from '@/ui/brand';
import { BrandHeader } from '@/ui/Lockup';
import { AppText, Button, DevContentBanner, Screen, Sheet, StateView } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { BRAND_YELLOW, fonts, spacing, useGutter, useTheme } from '@/ui/theme';

/** Largura da coluna central do trilho. */
const RAIL_W = 64;

/** Linha extra do marcador "Seu ministério conduz o altar" abaixo do rótulo do dia. */




/**
 * Quais dias aparecem no trilho.
 *
 * O handoff comprime trechos longos com reticências: 100 linhas seguidas não são
 * navegáveis. Ficam sempre visíveis as âncoras que a pessoa procura — hoje e sua
 * vizinhança, os marcos, as pontas, todo dia em aberto e os dias em que o
 * ministério da pessoa conduz o altar. O resto vira reticência, que continua
 * clicável para expandir.
 */
function buildRows(
  officialDay: number,
  total: number,
  pending: number[],
  expanded: boolean,
  ministryDays: number[],
): Row[] {
  if (expanded) return Array.from({ length: total }, (_, i) => ({ kind: 'day', day: i + 1 }));

  const anchors = new Set<number>([1, total, ...MILESTONE_DAYS, ...pending, ...ministryDays]);
  for (let day = officialDay - 3; day <= officialDay + 3; day += 1) {
    if (day >= 1 && day <= total) anchors.add(day);
  }
  const sorted = [...anchors].filter((d) => d >= 1 && d <= total).sort((a, b) => a - b);

  const rows: Row[] = [];
  sorted.forEach((day, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && day - previous > 1) {
      rows.push({ kind: 'gap', from: previous + 1, to: day - 1 });
    }
    rows.push({ kind: 'day', day });
  });
  return rows;
}

const STATE_LABEL: Record<DayState, string> = {
  completed: 'Concluído',
  today: 'Hoje',
  pending: 'Em aberto',
  future: 'Em breve',
};

export default function JourneyScreen() {
  const { colors } = useTheme();
  const journey = useJourney();
  const settings = useSettings();
  const inset = useGutter();
  const { fontScale } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [lockedDay, setLockedDay] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      track({ name: 'journey_viewed' });
    }, []),
  );

  const total = journey.campaign.total_days;
  /**
   * "Meu ministério" é escolha local (settings.ministry). Os dias em que ele
   * conduz o altar ganham marcador e nunca são comprimidos nas reticências.
   */
  const ministry = settings?.ministry ?? null;
  const ministryDays = useMemo(() => daysForMinistry(ministry), [ministry]);
  const ministrySet = useMemo(() => new Set(ministryDays), [ministryDays]);
  /**
   * A lista é virtualizada, então precisa de alturas conhecidas. Elas escalam
   * junto com o tamanho de fonte do sistema — sem isso, o texto seria cortado no
   * maior Dynamic Type. É o mesmo motivo de `getItemLayout` existir aqui.
   * A linha do ministério acrescenta uma linha de texto; a altura acompanha, e a
   * mesma função alimenta o `minHeight` da linha e o `getItemLayout`.
   */
  const rowHeight = (row: Row) =>
    journeyRowHeight(row, { officialDay: journey.officialDay, ministryDays: ministrySet }, fontScale);
  const rows = useMemo(
    () => buildRows(journey.officialDay, total, journey.pendingDays, expanded, ministryDays),
    [journey.officialDay, total, journey.pendingDays, expanded, ministryDays],
  );

  if (!journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'gap') {
      const count = item.to - item.from + 1;
      return (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={`Mostrar os dias ${item.from} a ${item.to}`}
          style={({ pressed }) => [
            // O mesmo número que o getItemLayout declara para esta linha.
            { flexDirection: 'row', alignItems: 'center', minHeight: rowHeight(item) },
            pressed && { opacity: 0.72 },
          ]}
        >
          <View style={{ flex: 1 }} />
          <View style={{ width: RAIL_W, alignItems: 'center', gap: 5 }}>
            {[0, 1, 2].map((dot) => (
              <View
                key={dot}
                style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }}
              />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="tick">
              {count === 1 ? '1 dia' : `${count} dias`}
            </AppText>
          </View>
        </Pressable>
      );
    }

    const day = item.day;
    const state = journey.dayState(day);
    const unlocked = journey.isDayUnlocked(day);
    const milestone = milestoneForDay(day);
    const isToday = state === 'today';
    const dayData = getDay(day);
    const sphere = dayData?.sphere ?? null;
    const isMinistryDay = ministrySet.has(day);
    const a11yLabel = [
      `Dia ${day}.`,
      `${STATE_LABEL[state]}.`,
      milestone ? `Marco: ${milestone.label}.` : null,
      sphere ? `Monte: ${SPHERE_LABEL[sphere]}.` : null,
      isMinistryDay ? 'Seu ministério conduz o altar.' : null,
    ]
      .filter(Boolean)
      .join(' ');

    // O trecho percorrido chega até hoje em amarelo; o resto fica cinza.
    const segment = (position: 'top' | 'bottom') => {
      const reachesToday =
        position === 'top' ? day <= journey.officialDay : day < journey.officialDay;
      return (
        <View
          style={{
            width: 3,
            flex: 1,
            backgroundColor: reachesToday ? BRAND_YELLOW : colors.borderStrong,
          }}
        />
      );
    };

    return (
      <Pressable
        onPress={() => {
          if (unlocked) router.push({ pathname: '/dia/[day]', params: { day: String(day) } });
          else setLockedDay(day);
        }}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={unlocked ? 'Abre a tela do dia' : 'Este dia ainda não abriu'}
        testID={`journey-day-${day}`}
        style={({ pressed }) => [
          { flexDirection: 'row', minHeight: rowHeight(item) },
          pressed && { opacity: 0.72 },
        ]}
      >
        {/* nota à esquerda: data e monte do dia */}
        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing.md }}>
          <AppText variant="tick" numberOfLines={1}>
            {formatDayDate(day, journey.campaign)}
          </AppText>
          {sphere ? (
            <AppText variant="tick" numberOfLines={2} style={{ textAlign: 'right' }}>
              {SPHERE_LABEL[sphere]}
            </AppText>
          ) : null}
        </View>

        {/* coluna do trilho */}
        <View style={{ width: RAIL_W, alignItems: 'center' }}>
          {segment('top')}
          <Node state={state} day={day} isMilestone={milestone !== null} total={total} />
          {segment('bottom')}
        </View>

        {/* rótulo à direita */}
        <View style={{ flex: 1, justifyContent: 'center', paddingLeft: spacing.md, gap: 2 }}>
          <AppText
            style={{
              fontFamily: isToday ? fonts.title : fonts.item,
              fontSize: isToday ? 22 : 15.5,
              color: state === 'future' ? colors.textMuted : colors.text,
            }}
          >
            Dia {day}
          </AppText>
          <AppText variant="tick">
            {milestone ? milestone.label : STATE_LABEL[state]}
          </AppText>
          {isMinistryDay ? (
            <View
              testID={`journey-ministry-${day}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              {/* O amarelo só acompanha: o texto ao lado é quem carrega a informação. */}
              <View
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND_YELLOW }}
              />
              <AppText variant="tick" style={{ flexShrink: 1 }}>
                Seu ministério conduz o altar
              </AppText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <View style={{ paddingHorizontal: inset, gap: spacing.lg, paddingTop: spacing.md }}>
        <BrandHeader />
        <DevContentBanner state={journey.contentState} compact />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <AppText variant="displayXl" style={{ fontSize: 72, lineHeight: 70, letterSpacing: -3.2 }}>
            Dia {journey.officialDay}
          </AppText>
          <AppText style={{ fontFamily: fonts.item, fontSize: 22, color: colors.textMuted }}>
            de {total}
          </AppText>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'day' ? `d${row.day}` : `g${row.from}`)}
        renderItem={renderRow}
        contentContainerStyle={{ paddingHorizontal: inset, paddingVertical: spacing.lg }}
        getItemLayout={(data, index) => {
          const list = data ?? rows;
          let offset = 0;
          for (let i = 0; i < index; i += 1) offset += rowHeight(list[i]);
          return { length: rowHeight(list[index]), offset, index };
        }}
        // A Jornada abre onde a igreja está, não no dia 1.
        initialScrollIndex={Math.max(0, rows.findIndex((row) => row.kind === 'day' && row.day === journey.officialDay))}
        initialNumToRender={12}
        windowSize={9}
        ListFooterComponent={
          expanded ? (
            <Button title="Comprimir a linha" variant="underline" onPress={() => setExpanded(false)} />
          ) : null
        }
      />

      {/* --------------------------------------------------------------- e3 */}
      <Sheet
        visible={lockedDay !== null}
        onClose={() => setLockedDay(null)}
        title={`Dia ${lockedDay ?? ''}`}
        testID="locked-day-sheet"
      >
        <View style={{ gap: spacing.md }}>
          <Icon name="lock" size={26} color={colors.text} />
          <AppText variant="body">
            Abre em {lockedDay ? formatDayDate(lockedDay, journey.campaign) : ''}.
          </AppText>
          <AppText variant="secondary">
            A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.
          </AppText>
          <Button title="Voltar para a Jornada" variant="outline" onPress={() => setLockedDay(null)} />
        </View>
      </Sheet>
    </Screen>
  );
}

/**
 * Nó do trilho. Cada estado tem FORMA própria, não só cor: quem não distingue
 * tons continua vendo o que está concluído, o que está aberto e onde é hoje.
 */
function Node({
  state,
  day,
  isMilestone,
  total,
}: {
  state: DayState;
  day: number;
  isMilestone: boolean;
  total: number;
}) {
  const { colors } = useTheme();

  if (state === 'today') {
    return (
      <View
        style={{
          width: 82,
          height: 60,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
          borderRadius: 30,
        }}
      >
        <Dove width={78} role="marker" />
      </View>
    );
  }

  if (day === total) {
    return (
      <View style={circle(30, colors.text, 'transparent')}>
        <Icon name="flag-finish" size={16} color={colors.text} />
      </View>
    );
  }

  if (isMilestone && state !== 'completed') {
    return (
      <View style={circle(26, colors.text, colors.background)}>
        <AppText style={{ fontFamily: fonts.label, fontSize: 11, color: colors.text }}>{day}</AppText>
      </View>
    );
  }

  if (state === 'completed') {
    return (
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.nodeDone,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={12} color={colors.surface} strokeWidth={3} />
      </View>
    );
  }

  if (state === 'pending') {
    return <View style={circle(22, colors.text, colors.surface, 2.5)} />;
  }

  return (
    <View
      style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.borderStrong }}
    />
  );
}

function circle(size: number, border: string, background: string, borderWidth = 2) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
    borderColor: border,
    backgroundColor: background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}
