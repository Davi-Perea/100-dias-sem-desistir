import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { formatReference } from '@/bible/references';
import { milestoneForDay } from '@/journey/milestones';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { isFastingKept, setFastingKept, useFasting } from '@/fasting/fastingStore';
import { getReflection, useReflections } from '@/reflections/reflectionsStore';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import {
  AppText,
  Button,
  Card,
  DevContentBanner,
  Divider,
  ProgressBar,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { iconSize, radius, spacing, useTheme } from '@/ui/theme';

function haptic(style: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const journey = useJourney();
  const settings = useSettings();
  const fasting = useFasting(journey.campaign.id);
  const reflections = useReflections(journey.campaign.id);
  const [busy, setBusy] = useState(false);

  if (!journey.ready || !settings) {
    return (
      <Screen>
        <StateView kind="loading" message="Preparando sua jornada." />
      </Screen>
    );
  }

  const { officialDay, campaign, todayDay, completions, phase } = journey;
  const total = campaign.total_days;

  // ---------------------------------------------------------------------------
  // Estado ANTES da campanha: nenhum conteúdo é revelado, nem o do Dia 1.
  // ---------------------------------------------------------------------------
  if (phase === 'before_start') {
    return (
      <Screen>
        <ScreenScroll contentStyle={{ paddingTop: insets.top + spacing.lg }}>
          {journey.isDevContent ? <DevContentBanner /> : null}
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">A jornada ainda não começou</AppText>
            <AppText variant="display">100 dias, juntos</AppText>
            <AppText variant="secondary">
              A igreja começa em {formatDayDate(1, campaign)}. A leitura do primeiro dia abre nesse dia.
            </AppText>
          </View>
          <Card tone="muted" testID="before-start-card">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow">Enquanto isso</AppText>
              <AppText variant="secondary">
                Você já pode escolher como prefere ler e definir seu lembrete diário em Você.
              </AppText>
            </View>
          </Card>
        </ScreenScroll>
      </Screen>
    );
  }

  const done = isDayCompleted(completions, officialDay);
  const campaignProgress = officialDay / total;
  const personalProgress = journey.completedCount / total;
  const milestone = done ? milestoneForDay(journey.completedCount) : null;
  const reflection = getReflection(reflections, officialDay);
  const preferOwnBible = (settings.lastUsedReadingMode ?? settings.readingMode) === 'own_bible';
  const isFinished = phase === 'finished';

  // Retomada tratada como sucesso, nunca como falha (spec §4.5).
  const gap = journey.gapDays;
  const returningAfterGap = !done && gap !== null && gap > 1;

  const complete = async (mode: 'in_app' | 'own_bible' | 'unknown') => {
    setBusy(true);
    try {
      await setDayCompleted(campaign.id, officialDay, true);
      const reached = milestoneForDay(journey.completedCount + 1);
      haptic(reached ? 'success' : 'light');
      track({ name: 'reading_completed', dayNumber: officialDay, mode });
      if (reached) track({ name: 'milestone_reached', dayNumber: reached.day });
      if (returningAfterGap && gap) track({ name: 'return_after_gap', gapDays: gap });
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    try {
      await setDayCompleted(campaign.id, officialDay, false);
      haptic('light');
    } finally {
      setBusy(false);
    }
  };

  const openReader = async () => {
    await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'in_app' }));
    track({ name: 'reading_started', dayNumber: officialDay, mode: 'in_app' });
    router.push({ pathname: '/reader/[day]', params: { day: String(officialDay) } });
  };

  const readOwnBible = async () => {
    await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'own_bible' }));
    track({ name: 'reading_started', dayNumber: officialDay, mode: 'own_bible' });
    await complete('own_bible');
  };

  const primaryReadCta = preferOwnBible ? (
    <Button
      title="Vou ler na minha Bíblia"
      subtitle="Marcar como concluído"
      size="lg"
      onPress={readOwnBible}
      disabled={busy}
    />
  ) : (
    <Button title="Ler aqui" size="lg" onPress={openReader} disabled={busy} />
  );
  const secondaryReadCta = preferOwnBible ? (
    <Button title="Ler aqui" variant="ghost" onPress={openReader} disabled={busy} />
  ) : (
    <Button title="Vou ler na minha Bíblia" variant="ghost" onPress={readOwnBible} disabled={busy} />
  );

  return (
    <Screen>
      <ScreenScroll contentStyle={{ paddingTop: insets.top + spacing.lg }}>
        {journey.isDevContent ? <DevContentBanner /> : null}

        {/* 6.1 cabeçalho */}
        <View style={{ gap: spacing.md }}>
          <AppText variant="eyebrow">
            {isFinished ? `Jornada encerrada · ${total} dias` : `Dia ${officialDay} de ${total}`}
          </AppText>
          <AppText variant="display">{todayDay?.title ?? `Dia ${officialDay}`}</AppText>
          <View style={{ gap: spacing.sm }}>
            <ProgressBar
              value={campaignProgress}
              label={`A igreja está no dia ${officialDay} de ${total}`}
              tone="muted"
            />
            <ProgressBar value={personalProgress} label={`Você concluiu ${journey.completedCount} de ${total} dias`} />
            <AppText variant="muted">
              Você concluiu {journey.completedCount} de {total} dias.
            </AppText>
          </View>
        </View>

        {/* Estado DEPOIS da campanha */}
        {isFinished ? (
          <Card tone="accent" testID="after-campaign-card">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="heading">A jornada da igreja terminou</AppText>
              <AppText variant="secondary">
                {journey.completedCount === total
                  ? 'Você atravessou os 100 dias inteiros.'
                  : 'Os dias que ficaram continuam abertos. Você pode concluir no seu ritmo.'}
              </AppText>
            </View>
          </Card>
        ) : null}

        {returningAfterGap ? (
          <Card tone="accent">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="heading" style={{ color: colors.accent }}>
                Você voltou.
              </AppText>
              <AppText variant="secondary">Continue de onde quiser. A jornada segue com você.</AppText>
            </View>
          </Card>
        ) : null}

        {/* 6.2 tema + 6.3 leitura + 6.4 versículo-chave */}
        <Card>
          <View style={{ gap: spacing.lg }}>
            {todayDay?.theme ? (
              <View style={{ gap: spacing.xs }}>
                <AppText variant="eyebrow">Tema</AppText>
                <AppText variant="heading">{todayDay.theme}</AppText>
              </View>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <AppText variant="eyebrow">{isFinished ? 'Leitura do dia 100' : 'Leitura de hoje'}</AppText>
              {todayDay && todayDay.readings.length > 0 ? (
                todayDay.readings.map((reading) => (
                  <AppText key={reading.sort_order} variant="title" style={{ fontSize: 22 }}>
                    {formatReference(reading.canonical_reference)}
                  </AppText>
                ))
              ) : (
                <AppText variant="muted">Nenhuma leitura definida para este dia.</AppText>
              )}
            </View>

            {todayDay?.key_verse_reference ? (
              <>
                <Divider />
                <View style={{ gap: spacing.xs }}>
                  <AppText variant="eyebrow">Versículo-chave</AppText>
                  <AppText variant="body" style={{ fontWeight: '600' }}>
                    {formatReference(todayDay.key_verse_reference)}
                  </AppText>
                </View>
              </>
            ) : null}

            {todayDay?.official_direction ? (
              <>
                <Divider />
                <AppText variant="secondary">{todayDay.official_direction}</AppText>
              </>
            ) : null}

            {todayDay?.prayer_focus ? (
              <View style={{ gap: spacing.xs }}>
                <AppText variant="eyebrow">Oração</AppText>
                <AppText variant="secondary">{todayDay.prayer_focus}</AppText>
              </View>
            ) : null}
          </View>
        </Card>

        {/* 6.5 e 6.6 leitura e conclusão */}
        {done ? (
          <Card tone="accent">
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="checkmark-circle" size={iconSize.lg} color={colors.success} />
                <AppText variant="heading">Dia {officialDay} concluído</AppText>
              </View>
              {milestone ? <AppText variant="secondary">{milestone.celebration}</AppText> : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title="Reler" variant="secondary" onPress={openReader} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Desfazer" variant="quiet" onPress={undo} loading={busy} testID="undo-complete" />
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {primaryReadCta}
            {secondaryReadCta}
            <Button
              title="Concluir leitura de hoje"
              variant="secondary"
              onPress={() => complete('unknown')}
              loading={busy}
              testID="complete-day"
            />
          </View>
        )}

        {/* 6.7 jejum */}
        {settings.fastingEnabled ? (
          <Card testID="fasting-card">
            <View style={{ gap: spacing.md }}>
              <AppText variant="eyebrow">Meu jejum</AppText>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isFastingKept(fasting, officialDay) }}
                accessibilityLabel="Cumpri meu propósito hoje"
                accessibilityHint="Registro privado, guardado só neste aparelho"
                testID="fasting-toggle"
                onPress={() => {
                  setFastingKept(campaign.id, officialDay, !isFastingKept(fasting, officialDay));
                  haptic('light');
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 }}>
                <Ionicons
                  name={isFastingKept(fasting, officialDay) ? 'checkbox' : 'square-outline'}
                  size={iconSize.lg}
                  color={isFastingKept(fasting, officialDay) ? colors.success : colors.controlBorder}
                />
                <AppText style={{ flex: 1 }}>
                  {isFastingKept(fasting, officialDay) ? 'Cumprido hoje' : 'Cumpri meu propósito hoje'}
                </AppText>
              </Pressable>
              <AppText variant="muted">Registro privado. Fica só neste aparelho.</AppText>
            </View>
          </Card>
        ) : null}

        {/* 6.8 reflexão, apenas após concluir */}
        {done ? (
          <Card
            onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(officialDay) } })}
            accessibilityLabel="O que ficou com você hoje? Escrever reflexão privada"
            testID="reflection-card">
            <View style={{ gap: spacing.xs }}>
              <AppText variant="eyebrow">Minha reflexão</AppText>
              <AppText variant="heading">O que ficou com você hoje?</AppText>
              <AppText variant="muted" numberOfLines={2}>
                {reflection ? reflection : 'Opcional e privada. Só você vê.'}
              </AppText>
            </View>
          </Card>
        ) : null}

        {/* 6.11 próximo passo */}
        {done && !isFinished && officialDay < total ? (
          <View
            style={{
              padding: spacing.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
              gap: spacing.xs,
            }}>
            <AppText variant="eyebrow">Dia {officialDay + 1}</AppText>
            <AppText variant="secondary">{todayDay?.next_day_teaser ?? 'Amanhã continuamos nossa jornada.'}</AppText>
          </View>
        ) : null}

        {journey.pendingDays.length > 0 ? (
          <Button
            title={`Ver ${journey.pendingDays.length} ${journey.pendingDays.length === 1 ? 'dia pendente' : 'dias pendentes'}`}
            variant="quiet"
            onPress={() => router.push('/jornada')}
          />
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
