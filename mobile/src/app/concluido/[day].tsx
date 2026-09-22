import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion as useReanimatedReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { releaseMilestones } from '@/journey/celebration';
import { getDay } from '@/journey/datasetSource';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted } from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';
import { AppText, Button, Screen, ScreenScroll, StateView } from '@/ui/components';
import { PANEL_NUMERAL, useDisplayNumeral } from '@/ui/jornada/displayNumeral';
import type { NumeralSpec } from '@/ui/altar/milestoneNumeral';
import { Emphasis } from '@/ui/jornada/TodayPanel';
import { Confetti } from '@/ui/motion/Confetti';
import { SpherePill } from '@/ui/SpherePill';
import { MAX_CONTENT_WIDTH, spacing, useGutter, useReducedMotion, useTheme } from '@/ui/theme';

/**
 * J5 · "Dia N concluído" (feedback do fundador, 2026-09-22). Aberta ao concluir
 * pelo painel de hoje e pelo dia completo (A3).
 *
 * Tela grande: "Dia N" + "concluído" no tamanho de exibição, o monte e a ênfase
 * do dia (texto da igreja, como veio), confete e "Continuar", que volta à
 * Jornada. O marco (se a conclusão alcançou um) vem DEPOIS, ao voltar para a
 * casa: a trava de `journey/celebration.ts` segura o gatilho até esta tela sair.
 *
 * "Reduzir movimento": sem confete e sem entrada animada; o conteúdo é o mesmo.
 *
 * E4/V1: com o nome do perfil local, uma linha do app acima de "Continuar"
 * chama a pessoa pelo nome. Texto do app, nunca dentro da ênfase da igreja; sem
 * nome, nada aparece.
 */

/** "concluído" no tamanho de exibição (display 38/40); cede tamanho pela largura, nunca quebra. */
const DONE_WORD: NumeralSpec = { size: 38, lineHeight: 40, letterSpacing: -1.6 };

export default function DayCompletedScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const journey = useJourney();
  const day = Number.parseInt(params.day ?? '', 10);
  const total = journey.campaign.total_days;
  const valid = Number.isInteger(day) && day >= 1 && day <= total;

  // Sair desta tela (Continuar, voltar do sistema, gesto) libera o marco.
  useEffect(() => releaseMilestones, []);

  if (!journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  // Só celebra o que foi gravado: link direto para um dia não concluído não diz
  // "concluído" (nem para um número fora da jornada).
  if (!valid || !isDayCompleted(journey.completions, day)) {
    return (
      <Screen>
        <ScreenScroll>
          <StateView
            kind="empty"
            title="Nada para mostrar aqui"
            message="Este dia ainda não foi concluído."
            action={<Button title="Voltar para a Jornada" variant="outline" onPress={backToJourney} />}
          />
        </ScreenScroll>
      </Screen>
    );
  }

  return <Celebration day={day} total={total} />;
}

/** Volta à casa: fecha esta tela e o que estiver entre ela e a Jornada (o dia A3). */
function backToJourney() {
  releaseMilestones();
  if (router.canDismiss()) router.dismissTo('/');
  else router.replace('/');
}

function Celebration({ day, total }: { day: number; total: number }) {
  const { colors } = useTheme();
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  // O hook do Reanimated é lido na hora; o do tema chega depois (assíncrono).
  const themeReduced = useReducedMotion();
  const engineReduced = useReanimatedReducedMotion();
  const reduced = themeReduced || engineReduced;
  const dayData = getDay(day);
  const numeral = useDisplayNumeral(`Dia ${day}`, PANEL_NUMERAL);
  const word = useDisplayNumeral('concluído', DONE_WORD);
  const name = useSettings()?.profile.name ?? null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: gutter,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xxl + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: spacing.xl }}>
          <Animated.View
            entering={reduced ? undefined : ZoomIn.duration(360)}
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Dia ${day} de ${total} concluído`}
            testID="completed-headline"
            style={{ gap: spacing.xs }}
          >
            <View
              onLayout={numeral.onLayout}
              style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.sm }}
            >
              <AppText
                variant="dayNumeral"
                style={numeral.style}
                maxFontSizeMultiplier={numeral.maxFontSizeMultiplier}
                testID="completed-numeral"
              >
                {`Dia ${day}`}
              </AppText>
              <AppText variant="rowLabel" style={{ color: colors.textMuted }}>
                {`de ${total}`}
              </AppText>
            </View>
            <View onLayout={word.onLayout}>
              <AppText
                variant="display"
                style={word.style}
                maxFontSizeMultiplier={word.maxFontSizeMultiplier}
              >
                concluído
              </AppText>
            </View>
          </Animated.View>

          <Animated.View
            entering={reduced ? undefined : FadeInDown.delay(180).duration(320)}
            style={{ gap: spacing.md }}
            testID="completed-theme"
          >
            {dayData?.sphere ? <SpherePill sphere={dayData.sphere} /> : null}
            {dayData ? <Emphasis day={dayData} size="screen" /> : null}
          </Animated.View>

          {name ? (
            <AppText variant="body" testID="completed-name">
              {`Muito bem, ${name}.`}
            </AppText>
          ) : null}

          <Button
            title="Continuar"
            onPress={backToJourney}
            accessibilityHint="Volta para a Jornada"
            testID="completed-continue"
          />
        </View>
      </ScrollView>
      <Confetti />
    </Screen>
  );
}

