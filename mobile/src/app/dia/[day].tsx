import { type Href, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { isFastingKept, setFastingKept, useFasting } from '@/fasting/fastingStore';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import { SPHERE_LABEL } from '@/journey/spheres';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getReflection, useReflections } from '@/reflections/reflectionsStore';
import { useSettings } from '@/settings/settingsStore';
import { Dove } from '@/ui/brand';
import { BarButton, TopBar } from '@/ui/Lockup';
import {
  AppText,
  Block,
  Button,
  Cap,
  DevContentBanner,
  IconCircle,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons';
import { SpherePill } from '@/ui/SpherePill';
import { BRAND_YELLOW, fonts, spacing, useTheme } from '@/ui/theme';

/** Rota da Intercessão do dia, tipada pelas rotas geradas pelo Expo Router. */
function intercessionHref(day: number): Href {
  return { pathname: '/intercessao/[day]', params: { day: String(day) } };
}

/** Mini-linha vertical de 96px: dia anterior → hoje → próximo dia. */
function MiniRail({ day, total, previousDone }: { day: number; total: number; previousDone: boolean }) {
  const { colors } = useTheme();
  const node = (filled: boolean) => (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: filled ? colors.nodeDone : colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {filled ? <Icon name="check" size={9} color={colors.surface} strokeWidth={3.2} /> : null}
    </View>
  );

  return (
    <View
      style={{ width: 96, alignItems: 'center', gap: 4 }}
          aria-hidden
    >
      {day > 1 ? (
        <>
          <AppText variant="tick" style={{ fontSize: 12 }}>
            Dia {day - 1}
          </AppText>
          {node(previousDone)}
          <View style={{ width: 3, height: 30, backgroundColor: BRAND_YELLOW }} />
        </>
      ) : null}
      <Dove width={58} role="marker" />
      {day < total ? (
        <>
          <View style={{ width: 3, height: 30, backgroundColor: colors.borderStrong }} />
          {node(false)}
          <AppText variant="tick" style={{ fontSize: 12 }}>
            Dia {day + 1}
          </AppText>
        </>
      ) : null}
    </View>
  );
}

function DayBlock({
  icon,
  title,
  subtitle,
  subtitleLines,
  onPress,
  testID,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  /** Limite de linhas do subtítulo; sem limite quando ausente. */
  subtitleLines?: number;
  onPress?: () => void;
  testID?: string;
  trailing?: 'chevron' | 'check' | 'none';
}) {
  const { colors } = useTheme();
  return (
    <Block onPress={onPress} accessibilityLabel={`${title}. ${subtitle}`} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, minHeight: 88 - 32 }}>
        <IconCircle name={icon} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="action">{title}</AppText>
          <AppText variant="caption" style={{ fontSize: 14, lineHeight: 18 }} numberOfLines={subtitleLines}>
            {subtitle}
          </AppText>
        </View>
        {trailing === 'check' ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.markSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={16} color={colors.onMark} strokeWidth={2.8} />
          </View>
        ) : trailing === 'none' ? null : (
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        )}
      </View>
    </Block>
  );
}

export default function DayScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const { colors } = useTheme();
  const journey = useJourney();
  const settings = useSettings();
  const fasting = useFasting(journey.campaign.id);
  const reflections = useReflections(journey.campaign.id);

  const day = Number.parseInt(params.day ?? '', 10);
  const total = journey.campaign.total_days;
  const valid = Number.isInteger(day) && day >= 1 && day <= total;

  if (!journey.ready || !settings) {
    return (
      <Screen tone="warm">
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (!valid) {
    return (
      <Screen tone="warm">
        <TopBar />
        <StateView
          kind="empty"
          title="Dia não encontrado"
          message="Este dia não faz parte da jornada."
          action={<Button title="Voltar para a Jornada" variant="outline" onPress={() => router.replace('/jornada')} />}
        />
      </Screen>
    );
  }

  const unlocked = journey.isDayUnlocked(day);
  const dayData = getDay(day);
  const summary = readingSummary(dayData);
  const done = isDayCompleted(journey.completions, day);
  const reflection = getReflection(reflections, day);
  const fastingDone = isFastingKept(fasting, day);

  if (!unlocked) {
    return (
      <Screen tone="warm">
        <TopBar />
        <ScreenScroll>
          <Icon name="lock" size={26} color={colors.text} />
          <AppText variant="blockTitleLg">Dia {day}</AppText>
          <AppText variant="body">Abre em {formatDayDate(day, journey.campaign)}.</AppText>
          <AppText variant="secondary">
            A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.
          </AppText>
          <Button title="Voltar para a Jornada" variant="outline" onPress={() => router.back()} />
        </ScreenScroll>
      </Screen>
    );
  }

  // Altar presencial das 12h30: `altarOfDay` já esconde nomes de líderes sem autorização.
  const altar = altarOfDay(day);
  const altarCaption = altar
    ? `Altar das 12h30 · conduz: ${altar.ministry}${altar.leaders_label ? ` · ${altar.leaders_label}` : ''}`
    : null;

  // "Josué 6–17 · 12 capítulos · ~36 min" — referências e estimativa numa linha só.
  const readingSubtitle = summary ? `${summary.label} · ${summary.detail}` : 'Sem leitura definida';

  // "Governo · Sabedoria para governar" — monte e ênfase vêm do dado; sem ambos, só o rótulo da interface.
  const intercessionParts: string[] = [];
  if (dayData?.sphere) intercessionParts.push(SPHERE_LABEL[dayData.sphere]);
  if (dayData?.title) intercessionParts.push(dayData.title);
  const intercessionSubtitle =
    intercessionParts.length > 0 ? intercessionParts.join(' · ') : 'Motivos de oração do dia';

  return (
    <Screen tone="warm">
      <ScreenScroll gap={spacing.lg}>
        <TopBar
          right={
            <BarButton
              icon="more"
              label="Mais opções deste dia"
              onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
            />
          }
        />
        <DevContentBanner state={journey.contentState} compact />

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Cap>Jornada da Bíblia</Cap>
              <AppText variant="displayXl" style={{ fontSize: 68, lineHeight: 64, letterSpacing: -3 }}>
                Dia {day}
              </AppText>
              <AppText style={{ fontFamily: fonts.item, fontSize: 16, color: colors.textMuted }}>
                de {total}
              </AppText>
              {dayData?.sphere ? <SpherePill sphere={dayData.sphere} /> : null}
            </View>
            <MiniRail day={day} total={total} previousDone={isDayCompleted(journey.completions, day - 1)} />
          </View>
          {altarCaption ? (
            <AppText variant="caption" style={{ fontSize: 14, lineHeight: 18 }} testID="day-altar">
              {altarCaption}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.md }}>
          <DayBlock
            icon="book"
            title="Leitura bíblica"
            subtitle={readingSubtitle}
            onPress={() => router.push({ pathname: '/reader/[day]', params: { day: String(day) } })}
            testID="day-reading"
            trailing={done ? 'check' : 'chevron'}
          />
          <DayBlock
            icon="users"
            title="Intercessão do dia"
            subtitle={intercessionSubtitle}
            onPress={() => router.push(intercessionHref(day))}
            testID="day-intercession"
          />
          <DayBlock
            icon="note"
            title="Reflexão de hoje"
            subtitle={reflection ? 'Escrita · só você vê' : 'Só você vê'}
            onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
            testID="day-reflection"
          />
          {settings.fastingEnabled ? (
            <DayBlock
              icon="clock"
              title="Meu jejum"
              subtitle="Cumpri meu propósito hoje"
              onPress={() => setFastingKept(journey.campaign.id, day, !fastingDone)}
              testID="day-fasting"
              trailing={fastingDone ? 'check' : 'chevron'}
            />
          ) : null}
        </View>

        <Button
          title={done ? 'Reler este dia' : 'Ler agora'}
          icon="chevron-right"
          onPress={() => router.push({ pathname: '/reader/[day]', params: { day: String(day) } })}
          testID="day-primary"
        />
        {!done ? (
          <Button
            title="Marcar como concluído"
            variant="underline"
            onPress={() => setDayCompleted(journey.campaign.id, day, true)}
            testID="day-complete"
          />
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
