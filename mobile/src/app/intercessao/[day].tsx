import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { formatReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { flowSteps, type FlowStep } from '@/journey/proposito';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { JourneyDay } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { AltarMode } from '@/ui/AltarMode';
import { TopBar } from '@/ui/Lockup';
import { SpherePill } from '@/ui/SpherePill';
import {
  AppText,
  Block,
  Button,
  Cap,
  DevContentBanner,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { Icon } from '@/ui/icons';
import { fonts, spacing, useTheme } from '@/ui/theme';

/** A rota pode ser aberta por um lembrete (deep link) sem pilha atrás: cai no Início. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Círculo de 28px com o numeral, usando o par `markSurface`/`onMark`: tinta com
 * amarelo no tema claro, amarelo com tinta no escuro (12,9:1 nos dois sentidos).
 * Decorativo: o cabeçalho do passo já diz "Passo N de 5".
 */
function StepNumber({ n }: { n: number }) {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.markSurface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.label, fontSize: 13, lineHeight: 16, color: colors.onMark }}>{n}</Text>
    </View>
  );
}

/**
 * Um passo da reunião das 12h30, com o texto da orientação da igreja.
 *
 * O rótulo "Passo N de 5: título" fica na linha de cabeçalho, não no bloco
 * inteiro: um bloco `accessible` viraria um único elemento no iOS e engoliria
 * o botão "Abrir no leitor" e os motivos de oração.
 */
function FlowStepBlock({
  step,
  total,
  day,
  dayNumber,
}: {
  step: FlowStep;
  total: number;
  day: JourneyDay;
  dayNumber: number;
}) {
  const { colors } = useTheme();
  // `Block` sem `onPress` não repassa testID; o invólucro carrega o identificador.
  return (
    <View testID={`flow-step-${step.step}`}>
      <Block style={{ gap: spacing.md }}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={`Passo ${step.step} de ${total}: ${step.title}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
        >
          <StepNumber n={step.step} />
          <AppText variant="action" style={{ flex: 1 }}>
            {step.title}
          </AppText>
        </View>
        <AppText variant="quote">{step.description}</AppText>

        {step.step === 3 && day.key_verse_reference ? (
          <View style={{ gap: spacing.sm }}>
            <Cap>Versículo-base</Cap>
            <AppText variant="blockTitle">{formatReference(day.key_verse_reference)}</AppText>
            <Button
              title="Abrir no leitor"
              variant="underline"
              onPress={() => router.push({ pathname: '/reader/[day]', params: { day: String(dayNumber) } })}
              accessibilityHint="Abre a leitura bíblica deste dia"
              style={{ alignSelf: 'flex-start' }}
              testID="open-reader"
            />
          </View>
        ) : null}

        {step.step === 4 ? (
          <View style={{ gap: spacing.sm }}>
            {day.sphere ? <Cap>{SPHERE_LABEL[day.sphere]}</Cap> : null}
            {day.title ? <AppText variant="blockTitle">{day.title}</AppText> : null}
            {day.prayer_points.length > 0 ? (
              <View accessibilityRole="list" style={{ gap: spacing.sm, marginTop: spacing.xs }} testID="prayer-points">
                {day.prayer_points.map((point, i) => (
                  <View
                    key={`${i}-${point}`}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}
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
        ) : null}
      </Block>
    </View>
  );
}

/**
 * Intercessão do dia: o mesmo roteiro da reunião das 12h30 para quem intercede
 * em casa, e o "Modo altar" para quem conduz a reunião com o telefone apoiado.
 *
 * Tudo que aparece vem do dataset (ênfase, monte, versículo, motivos, escala) ou
 * da orientação da igreja (`flowSteps`). Nomes de líderes passam por `altarOfDay`,
 * que os esconde enquanto a igreja não autorizar.
 */
export default function IntercessionScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const { colors } = useTheme();
  const journey = useJourney();
  const [altarMode, setAltarMode] = useState(false);
  const exitAltarMode = useCallback(() => setAltarMode(false), []);

  const day = Number.parseInt(params.day ?? '', 10);
  const total = journey.campaign.total_days;
  const valid = Number.isInteger(day) && day >= 1 && day <= total;

  if (!journey.ready) {
    return (
      <Screen tone="warm">
        <StateView kind="loading" />
      </Screen>
    );
  }

  const dayData = valid ? getDay(day) : null;

  if (!dayData) {
    return (
      <Screen tone="warm">
        <TopBar />
        <StateView
          kind="empty"
          title="Dia não encontrado"
          message="Este dia não faz parte da jornada."
          action={<Button title="Voltar" variant="outline" onPress={goBack} />}
        />
      </Screen>
    );
  }

  if (!journey.isDayUnlocked(day)) {
    return (
      <Screen tone="warm">
        <TopBar />
        <ScreenScroll>
          <Icon name="lock" size={26} color={colors.text} />
          <AppText variant="blockTitleLg" accessibilityRole="header">
            {`Dia ${day}`}
          </AppText>
          <AppText variant="body">{`Abre em ${formatDayDate(day, journey.campaign)}.`}</AppText>
          <AppText variant="secondary">
            A intercessão de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.
          </AppText>
          <Button title="Voltar" variant="outline" onPress={goBack} testID="locked-back" />
        </ScreenScroll>
      </Screen>
    );
  }

  const steps = flowSteps();

  if (altarMode) {
    return (
      <>
        {/* Sem o gesto de voltar do iOS enquanto conduz: um deslize acidental não derruba a reunião. */}
        <Stack.Screen options={{ gestureEnabled: false }} />
        <AltarMode day={dayData} steps={steps} onExit={exitAltarMode} />
      </>
    );
  }

  const altar = altarOfDay(day);
  const conductor = altar
    ? altar.leaders_label
      ? `${altar.ministry} · ${altar.leaders_label}`
      : altar.ministry
    : null;

  return (
    <Screen tone="warm">
      <Stack.Screen options={{ gestureEnabled: true }} />
      <ScreenScroll gap={spacing.lg}>
        <TopBar onBack={goBack} />
        <DevContentBanner state={journey.contentState} compact />

        <View style={{ gap: spacing.sm }}>
          <Cap>{`Intercessão do dia · Dia ${day} · ${formatDayDate(day, journey.campaign)}`}</Cap>
          {dayData.sphere ? <SpherePill sphere={dayData.sphere} /> : null}
          {dayData.title ? (
            <AppText variant="blockTitleLg" accessibilityRole="header">
              {dayData.title}
            </AppText>
          ) : null}
          {conductor ? (
            <AppText variant="caption" style={{ fontSize: 14, lineHeight: 18 }} testID="altar-caption">
              {`Altar das 12h30 · conduz: ${conductor}`}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.md }}>
          {steps.map((step) => (
            <FlowStepBlock key={step.step} step={step} total={steps.length} day={dayData} dayNumber={day} />
          ))}
        </View>

        {steps.length > 0 ? (
          <Button
            title="Modo altar"
            onPress={() => setAltarMode(true)}
            accessibilityHint="Mostra um passo por vez, em letras grandes, e mantém a tela acesa"
            testID="enter-altar-mode"
          />
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
