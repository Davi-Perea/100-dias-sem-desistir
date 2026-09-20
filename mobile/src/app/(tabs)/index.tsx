import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { track } from '@/analytics/analytics';
import { formatReference } from '@/bible/references';
import { useCloudSession } from '@/cloud/useSession';
import { collectiveNotice, getChurchProgress } from '@/community/communityState';
import { isFastingKept, setFastingKept, useFasting } from '@/fasting/fastingStore';
import { milestoneForDay } from '@/journey/milestones';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate, rawCampaignDay } from '@/journey/officialDay';
import { readingSummary, splitHighlight } from '@/journey/readingSummary';
import { SPHERE_LABEL } from '@/journey/spheres';
import { useJourney } from '@/journey/useJourney';
import { completedDayNumbers, isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getReflection, useReflections } from '@/reflections/reflectionsStore';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { HundredDayRuler } from '@/ui/HundredDayRuler';
import { AccountButton, BrandHeader } from '@/ui/Lockup';
import { SpherePill } from '@/ui/SpherePill';
import {
  AppText,
  Button,
  Cap,
  Checkbox,
  DevContentBanner,
  Highlight,
  OfflineBanner,
  ProgressBar,
  Rule,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import { fonts, spacing, useTheme } from '@/ui/theme';

function haptic(style: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** "Dia 17" em 84px com "de 100" ao lado, alinhado pela base. */
function DayHeadline({ day, total, size = 84 }: { day: number; total: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Dia ${day} de ${total}`}
    >
      <AppText
        variant="displayXl"
        style={{ fontSize: size, lineHeight: size * 0.95, letterSpacing: size * -0.045 }}
      >
        Dia {day}
      </AppText>
      <AppText style={{ fontFamily: fonts.item, fontSize: size * 0.24, color: colors.textMuted }}>
        de {total}
      </AppText>
    </View>
  );
}

export default function StartScreen() {
  const { colors } = useTheme();
  const journey = useJourney();
  const settings = useSettings();
  const session = useCloudSession();
  const fasting = useFasting(journey.campaign.id);
  const reflections = useReflections(journey.campaign.id);
  const [busy, setBusy] = useState(false);

  const accountName = (session.session?.user?.email ?? null)?.split('@')[0] ?? null;
  const church = getChurchProgress();

  // Marco em tela cheia: uma vez por marco alcançado (handoff, telas 10 e 11).
  const reachedNow = journey.ready ? milestoneForDay(journey.completedCount) : null;
  const unseenMilestone =
    reachedNow && settings && !settings.milestonesSeen.includes(reachedNow.day) ? reachedNow.day : null;
  useEffect(() => {
    if (unseenMilestone === null) return;
    router.push({ pathname: '/marco/[day]', params: { day: String(unseenMilestone) } });
  }, [unseenMilestone]);

  if (!journey.ready || !settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const { officialDay, campaign, todayDay, completions, phase } = journey;
  const total = campaign.total_days;

  // ---------------------------------------------------------------- e1
  // Antes da campanha nenhum conteúdo é revelado, nem o do Dia 1.
  // ---------------------------------------------------------------- e1
  if (phase === 'before_start') {
    // Contado no fuso da campanha: às 23h em São Paulo ainda é "hoje" para a igreja,
    // mesmo que o UTC já tenha virado o dia.
    const daysToStart = Math.max(0, 1 - rawCampaignDay(new Date(), campaign));
    return (
      <Screen>
        <ScreenScroll>
          <BrandHeader right={<AccountButton name={accountName} />} />
          <DevContentBanner state={journey.contentState} />

          <View style={{ gap: spacing.sm }} testID="before-start-card">
            <AppText variant="display" style={{ fontSize: 52, lineHeight: 52 }}>
              Faltam <Highlight>{daysToStart === 1 ? '1 dia' : `${daysToStart} dias`}</Highlight>
            </AppText>
            <AppText variant="secondary">A igreja começa em {formatDayDate(1, campaign)}.</AppText>
          </View>

          <HundredDayRuler
            totalDays={total}
            officialDay={0}
            completed={[]}
            variant="inactive"
            accessibilityLabel={`A jornada de ${total} dias ainda não começou.`}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="tick">Dia 1 · {formatDayDate(1, campaign)}</AppText>
            <AppText variant="tick">
              Dia {total} · {formatDayDate(total, campaign)}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Ajustar lembrete" variant="outline" onPress={() => router.push('/lembrete')} style={{ flex: 1 }} />
            <Button title="Entrar no grupo" variant="outline" onPress={() => router.push('/(tabs)/juntos')} style={{ flex: 1 }} />
          </View>
        </ScreenScroll>
      </Screen>
    );
  }

  const done = isDayCompleted(completions, officialDay);
  const summary = readingSummary(todayDay);
  const reflection = getReflection(reflections, officialDay);
  const preferOwnBible = (settings.lastUsedReadingMode ?? settings.readingMode) === 'own_bible';
  const isFinished = phase === 'finished';
  const gap = journey.gapDays;
  const returningAfterGap = !done && gap !== null && gap >= 3;
  const openCount = journey.pendingDays.length;
  const theme = todayDay?.theme
    ? splitHighlight(todayDay.theme, todayDay.theme_highlight)
    : null;
  const keyVerse = todayDay?.key_verse_reference ? formatReference(todayDay.key_verse_reference) : null;
  const prayerPoints = todayDay?.prayer_points ?? [];
  const sphereLabel = todayDay?.sphere ? SPHERE_LABEL[todayDay.sphere] : null;
  // Nomes de pessoas já vêm filtrados pela autorização da igreja. Depois da
  // campanha `officialDay` fica travado no último dia, então a linha mostra o
  // altar do Dia 100.
  const altar = altarOfDay(officialDay);
  const altarLine = altar
    ? `${isFinished ? `Conduziu no Dia ${total}` : 'Hoje conduz'}: ${altar.ministry}${
        altar.leaders_label ? ` · ${altar.leaders_label}` : ''
      }`
    : null;

  const openIntercession = () =>
    router.push({ pathname: '/intercessao/[day]', params: { day: String(officialDay) } });

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

  /**
   * Handoff: escolher a própria Bíblia NÃO conclui o dia. Ela troca a ação
   * principal do Início para "Concluir leitura", que a pessoa toca quando
   * terminar de ler. Marcar por ela seria decidir no lugar dela.
   */
  const readOwnBible = async () => {
    await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'own_bible' }));
    track({ name: 'reading_started', dayNumber: officialDay, mode: 'own_bible' });
  };

  const statusLine = [
    `${journey.completedCount} ${journey.completedCount === 1 ? 'concluído' : 'concluídos'}`,
    openCount > 0 ? `${openCount} em aberto` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        <BrandHeader right={<AccountButton name={accountName} />} />
        <DevContentBanner state={journey.contentState} />
        {session.degraded ? <OfflineBanner /> : null}

        {/* ------------------------------------------------------------- e2 */}
        {returningAfterGap ? (
          <View style={{ gap: spacing.xs }} testID="return-module">
            <AppText variant="blockTitleLg">
              <Highlight>Que bom ter você</Highlight> de volta.
            </AppText>
            <AppText variant="secondary">
              {openCount === 1
                ? 'Um dia ficou para trás e continua aberto.'
                : `${openCount} dias ficaram para trás e continuam abertos.`}{' '}
              Você pode retomar por onde quiser.
            </AppText>
          </View>
        ) : null}

        {/* --------------------------------------------- cabeça: dia + régua */}
        <View style={{ gap: spacing.lg }}>
          <DayHeadline day={officialDay} total={total} />
          <HundredDayRuler totalDays={total} officialDay={officialDay} completed={completedDayNumbers(completions)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="tick">{statusLine}</AppText>
            <AppText variant="tick" testID={isFinished ? 'after-campaign-card' : 'church-day'}>
              {isFinished ? `Jornada encerrada · ${total} dias` : `Igreja no Dia ${officialDay}`}
            </AppText>
          </View>
        </View>

        <Rule />

        {/* ------------------------------------------------- tema e leitura */}
        <View style={{ gap: spacing.md }}>
          <Cap>{isFinished ? `Tema do dia ${total}` : 'Tema de hoje'}</Cap>
          {todayDay?.sphere ? <SpherePill sphere={todayDay.sphere} testID="sphere-pill" /> : null}
          {theme ? (
            <AppText variant="blockTitle">
              {theme.before}
              {theme.match ? <Highlight>{theme.match}</Highlight> : null}
              {theme.after}
            </AppText>
          ) : (
            <AppText variant="blockTitle">{todayDay?.title ?? `Dia ${officialDay}`}</AppText>
          )}

          {summary ? (
            <View style={{ gap: 2 }}>
              <AppText style={{ fontFamily: fonts.title, fontSize: 22, lineHeight: 27, color: colors.text }}>
                {summary.label}
              </AppText>
              <AppText variant="caption">{summary.detail}</AppText>
            </View>
          ) : (
            <AppText variant="caption">Nenhuma leitura definida para este dia.</AppText>
          )}

          {keyVerse ? (
            <View style={{ gap: spacing.xs }}>
              <Cap>Versículo-base</Cap>
              <AppText variant="action" testID="key-verse">
                {keyVerse}
              </AppText>
            </View>
          ) : null}

          {/* Lista simples, não cartão: os motivos são texto da igreja, um por linha. */}
          {prayerPoints.length > 0 ? (
            <View style={{ gap: spacing.xs }} accessibilityRole="list" testID="prayer-points">
              <Cap>Motivos de oração</Cap>
              {prayerPoints.map((point, index) => (
                <View
                  key={`${index}-${point}`}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
                >
                  <View
                    aria-hidden
                    style={{ width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: colors.text }}
                  />
                  <AppText variant="item" style={{ flex: 1 }}>
                    {point}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* ------------------------------------------------- 02 contra 03 */}
        {done ? (
          <View style={{ gap: spacing.lg }} testID="day-completed">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.markSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={20} color={colors.onMark} strokeWidth={2.6} />
              </View>
              <AppText variant="blockTitle" style={{ flex: 1, fontSize: 24, lineHeight: 28 }}>
                <Highlight>Leitura de hoje</Highlight> concluída
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs }}>
              <AppText variant="caption">
                {summary ? `${summary.label} · ` : ''}
                {preferOwnBible ? 'lido na sua Bíblia' : 'lido aqui no app'} ·{' '}
              </AppText>
              <Button title="Desfazer" variant="underline" onPress={undo} testID="undo-complete" style={{ height: 24 }} />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Cap>Minha reflexão · só você vê</Cap>
              <Button
                title={reflection ? 'Editar minha reflexão' : 'Escrever minha reflexão'}
                variant="outline"
                onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(officialDay) } })}
                testID="reflection-card"
              />
            </View>

            <Button
              title="Intercessão do dia"
              variant="outline"
              onPress={openIntercession}
              testID="open-intercession"
            />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }} testID="day-open">
            <Button
              title={preferOwnBible ? 'Concluir leitura' : 'Ler agora'}
              onPress={preferOwnBible ? () => complete('own_bible') : openReader}
              loading={busy}
              testID="complete-day"
            />
            <Button
              title={preferOwnBible ? 'Ler aqui no app' : 'Vou ler na minha Bíblia'}
              variant="underline"
              onPress={preferOwnBible ? openReader : readOwnBible}
              disabled={busy}
            />
            <Button
              title="Intercessão do dia"
              variant="outline"
              onPress={openIntercession}
              testID="open-intercession"
            />
          </View>
        )}

        {/* ----------------------------------------------------- meu jejum */}
        {settings.fastingEnabled ? (
          <View testID="fasting-card">
            <Rule />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="item">Meu jejum</AppText>
                <AppText variant="caption">Registro privado. Fica só neste aparelho.</AppText>
              </View>
              <Checkbox
                checked={isFastingKept(fasting, officialDay)}
                onToggle={() => {
                  setFastingKept(campaign.id, officialDay, !isFastingKept(fasting, officialDay));
                  haptic('light');
                }}
                label="Cumpri meu propósito hoje"
                testID="fasting-toggle"
              />
            </View>
          </View>
        ) : null}

        {/* ------------------------------------------------ altar das 12h30 */}
        {altar && altarLine ? (
          <View>
            <Rule />
            <View style={{ paddingTop: spacing.md, gap: spacing.xs }} testID="altar-today">
              <Cap>Altar das 12h30</Cap>
              <AppText variant="item">{altarLine}</AppText>
              {sphereLabel ? <AppText variant="caption">Monte do dia · {sphereLabel}</AppText> : null}
            </View>
          </View>
        ) : null}

        {/* -------------------------------------------------- linha coletiva */}
        <View>
          <Rule />
          <View style={{ paddingTop: spacing.md, gap: spacing.sm }} testID="church-progress">
            {church.status === 'available' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <AppText variant="item" style={{ flex: 1 }}>
                  {church.data.readersToday.toLocaleString('pt-BR')} pessoas já leram hoje
                </AppText>
                <View style={{ width: 56 }}>
                  <ProgressBar
                    value={church.data.ratio}
                    height={8}
                    label={`${Math.round(church.data.ratio * 100)}% da igreja já leu hoje`}
                  />
                </View>
              </View>
            ) : (
              <>
                <AppText variant="item">Progresso da igreja</AppText>
                <AppText variant="caption">{collectiveNotice(church)}</AppText>
              </>
            )}
          </View>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
