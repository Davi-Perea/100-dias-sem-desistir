import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { track } from '@/analytics/analytics';
import { formatReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { milestoneForDay } from '@/journey/milestones';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getReflection, useReflections } from '@/reflections/reflectionsStore';
import { updateSettings } from '@/settings/settingsStore';
import {
  AppText,
  Button,
  Card,
  DevContentBanner,
  Divider,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { iconSize, spacing, useTheme } from '@/ui/theme';

export default function DayDetailScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const { colors } = useTheme();
  const journey = useJourney();
  const reflections = useReflections(journey.campaign.id);
  const [busy, setBusy] = useState(false);

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > journey.campaign.total_days) {
    return (
      <Screen>
        <StateView kind="empty" title="Dia inválido" message="Este link aponta para um dia que não existe." />
      </Screen>
    );
  }

  const dayData = getDay(dayNumber);
  const unlocked = journey.isDayUnlocked(dayNumber);
  const done = isDayCompleted(journey.completions, dayNumber);
  const milestone = milestoneForDay(dayNumber);
  const reflection = getReflection(reflections, dayNumber);

  if (!journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  // Conteúdo de dias futuros permanece indisponível até o dia oficial (spec §8).
  if (!unlocked) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Dia ${dayNumber}` }} />
        <StateView
          kind="empty"
          title={`Dia ${dayNumber}`}
          message={`Este dia abre em ${formatDayDate(dayNumber, journey.campaign)}. A igreja está no dia ${journey.officialDay}.`}
          action={<Button title="Voltar para hoje" variant="ghost" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  const toggle = async () => {
    setBusy(true);
    try {
      await setDayCompleted(journey.campaign.id, dayNumber, !done);
      if (!done) track({ name: 'reading_completed', dayNumber, mode: 'unknown' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: `Dia ${dayNumber} de ${journey.campaign.total_days}` }} />
      <ScreenScroll>
        {journey.isDevContent ? <DevContentBanner compact /> : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="eyebrow">
            {dayNumber === journey.officialDay ? 'Hoje' : formatDayDate(dayNumber, journey.campaign)}
            {milestone ? ` · ${milestone.label}` : ''}
          </AppText>
          <AppText variant="title">{dayData?.title ?? `Dia ${dayNumber}`}</AppText>
          {dayData?.theme ? <AppText variant="secondary">{dayData.theme}</AppText> : null}
        </View>

        {done ? (
          <Card tone="accent">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="checkmark-circle" size={iconSize.md} color={colors.success} />
              <AppText style={{ fontWeight: '600' }}>Concluído</AppText>
            </View>
          </Card>
        ) : dayNumber < journey.officialDay ? (
          <Card tone="muted">
            <AppText variant="secondary">
              Este dia continua pendente e disponível. Você pode retomar quando quiser.
            </AppText>
          </Card>
        ) : null}

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Leitura</AppText>
            {dayData?.readings.map((r) => (
              <AppText key={r.sort_order} variant="heading">
                {formatReference(r.canonical_reference)}
              </AppText>
            ))}
            {dayData?.key_verse_reference ? (
              <>
                <Divider />
                <View style={{ gap: 2 }}>
                  <AppText variant="eyebrow">Versículo-chave</AppText>
                  <AppText>{formatReference(dayData.key_verse_reference)}</AppText>
                </View>
              </>
            ) : null}
            {dayData?.official_direction ? (
              <>
                <Divider />
                <AppText variant="secondary">{dayData.official_direction}</AppText>
              </>
            ) : null}
            {dayData?.prayer_focus ? (
              <View style={{ gap: 2 }}>
                <AppText variant="eyebrow">Oração</AppText>
                <AppText variant="secondary">{dayData.prayer_focus}</AppText>
              </View>
            ) : null}
          </View>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="Ler aqui"
            size="lg"
            onPress={async () => {
              await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'in_app' }));
              track({ name: 'reading_started', dayNumber, mode: 'in_app' });
              router.push({ pathname: '/reader/[day]', params: { day: String(dayNumber) } });
            }}
          />
          <Button
            title={done ? 'Desfazer conclusão' : 'Marcar como concluído'}
            variant={done ? 'quiet' : 'secondary'}
            loading={busy}
            onPress={toggle}
            testID="day-toggle"
          />
        </View>

        {done ? (
          <Card onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(dayNumber) } })}>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow">Minha reflexão</AppText>
              <AppText variant="muted" numberOfLines={3}>
                {reflection || 'Opcional e privada. Só você vê.'}
              </AppText>
            </View>
          </Card>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
