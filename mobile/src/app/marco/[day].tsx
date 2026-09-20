import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { track } from '@/analytics/analytics';
import { formatReference } from '@/bible/references';
import { fastingKeptCount, useFasting } from '@/fasting/fastingStore';
import { getDay } from '@/journey/datasetSource';
import { milestoneForDay } from '@/journey/milestones';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { completedDayNumbers } from '@/progress/completionsStore';
import { reflectionCount, useReflections } from '@/reflections/reflectionsStore';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { Dove } from '@/ui/brand';
import { HundredDayRuler } from '@/ui/HundredDayRuler';
import { AppText, Button, Cap, Screen, ScreenScroll, StateView } from '@/ui/components';
import { BRAND_YELLOW, fonts, spacing, useGutter } from '@/ui/theme';

/**
 * Tela de marco (handoff 10 e 11).
 *
 * Sem confete, sem pontos, sem XP — o marco é um momento de leitura, não uma
 * recompensa de jogo. O Dia 100 inverte a tela: fundo tinta, numeral amarelo.
 *
 * O marco é ancorado no dia real da igreja: data do calendário, monte e ênfase
 * do dia vêm do dataset (`getDay`). Na chegada, a ênfase do Dia 100 vira o
 * título e a referência do versículo-base fecha o texto — só a referência,
 * nunca o versículo (a tradução tem licença própria).
 */
export default function MilestoneScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const journey = useJourney();
  const settings = useSettings();
  const reflections = useReflections(journey.campaign.id);
  const fasting = useFasting(journey.campaign.id);
  const [saved, setSaved] = useState(false);
  const { width } = useWindowDimensions();
  const gutter = useGutter();

  const day = Number.parseInt(params.day ?? '', 10);
  const milestone = milestoneForDay(day);
  const dayData = getDay(day);
  const isArrival = day === journey.campaign.total_days;

  const close = async () => {
    if (settings && !settings.milestonesSeen.includes(day)) {
      await updateSettings((s) => ({ ...s, milestonesSeen: [...s.milestonesSeen, day] }));
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const keep = async () => {
    await updateSettings((s) => ({
      ...s,
      milestonesSeen: s.milestonesSeen.includes(day) ? s.milestonesSeen : [...s.milestonesSeen, day],
    }));
    track({ name: 'milestone_reached', dayNumber: day });
    setSaved(true);
  };

  if (!milestone || !settings) {
    return (
      <Screen>
        <StateView
          kind="empty"
          title="Marco não encontrado"
          action={<Button title="Voltar" variant="outline" onPress={close} />}
        />
      </Screen>
    );
  }

  const ink = isArrival ? '#FFFFFF' : '#111111';
  const inkSoft = isArrival ? 'rgba(255,255,255,0.78)' : '#3F3D38';
  const numeralColor = isArrival ? BRAND_YELLOW : '#111111';
  // O handoff pede 236px no marco e 190px na chegada, medidos num telefone de
  // 390px. Em telas menores (ou com "100", que tem três dígitos) o numeral não
  // pode quebrar em duas linhas: o tamanho cede até caber na largura útil.
  // Archivo Black tem dígitos largos (~0,72em em média); o tracking de −0,07em desconta um pouco.
  const designSize = isArrival ? 190 : 236;
  const digits = String(day).length;
  const available = Math.max(200, width - gutter * 2);
  const numeralSize = Math.floor(Math.min(designSize, available / (digits * 0.72 - (digits - 1) * 0.07)));
  const total = journey.campaign.total_days;
  // Só a chegada usa data: 100 leituras implicam ter lido o Dia 100, então ali
  // a data do dia é verdadeira. Nos marcos intermediários a contagem pessoal e o
  // dia da igreja podem estar longe um do outro.
  const date = formatDayDate(day, journey.campaign);

  // Chegada: a ênfase do Dia 100 é o título; o rótulo do marco sobe para um cap.
  const dayTitle = dayData?.title ?? null;
  const title = isArrival && dayTitle ? dayTitle : milestone.label;
  const verseReference =
    isArrival && dayData?.key_verse_reference ? formatReference(dayData.key_verse_reference) : null;

  return (
    <Screen tone={isArrival ? 'ink' : 'yellow'} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenScroll gap={spacing.lg}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Cap style={{ flex: 1, color: isArrival ? BRAND_YELLOW : '#111111' }}>
            {isArrival ? `Chegada · Dia ${total} · ${date}` : `Marco · ${day} de ${total} dias lidos`}
          </Cap>
          <Dove width={46} tone={isArrival ? 'white' : 'black'} role="signature" />
        </View>

        <AppText
          style={{
            fontFamily: fonts.display,
            fontSize: numeralSize,
            lineHeight: numeralSize * 0.86,
            letterSpacing: numeralSize * -0.07,
            color: numeralColor,
          }}
          accessibilityRole="header"
          accessibilityLabel={`Dia ${day}`}
          maxFontSizeMultiplier={1.2}
        >
          {day}
        </AppText>

        <View style={{ gap: spacing.sm }}>
          {isArrival && dayTitle ? (
            <AppText variant="cap" style={{ color: inkSoft }}>
              {milestone.label}
            </AppText>
          ) : null}
          <AppText
            style={{ fontFamily: fonts.title, fontSize: isArrival ? 32 : 34, lineHeight: 36, letterSpacing: -1, color: ink }}
          >
            {title}
          </AppText>
        </View>

        <View style={{ gap: spacing.md }}>
          <AppText style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: inkSoft }}>
            {milestone.celebration}
          </AppText>
          {verseReference ? (
            <AppText
              style={{ fontFamily: fonts.readItalic, fontSize: 18, lineHeight: 26, color: 'rgba(255,255,255,0.78)' }}
              testID="milestone-verse"
            >
              {verseReference}
            </AppText>
          ) : null}
        </View>

        <HundredDayRuler
          totalDays={total}
          officialDay={day}
          completed={completedDayNumbers(journey.completions)}
          variant={isArrival ? 'onInk' : 'onYellow'}
          accessibilityLabel={`Régua com os ${journey.completedCount} dias que você já leu, de ${total}.`}
        />

        {/* A história pessoal do Dia 100 vem toda de dados locais reais. */}
        {isArrival ? (
          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm }}>
            {[
              { value: journey.completedCount, label: 'dias lidos' },
              { value: reflectionCount(reflections), label: 'reflexões' },
              { value: fastingKeptCount(fasting), label: 'dias de jejum' },
            ].map((stat) => (
              <View key={stat.label} style={{ gap: 2 }}>
                <AppText style={{ fontFamily: fonts.display, fontSize: 34, lineHeight: 36, color: BRAND_YELLOW }}>
                  {stat.value}
                </AppText>
                <AppText style={{ fontFamily: fonts.item, fontSize: 12.5, color: 'rgba(255,255,255,0.78)' }}>
                  {stat.label}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {isArrival ? (
            <Button
              title="Guardar minha jornada"
              variant="yellow"
              onPress={async () => {
                await keep();
                await close();
              }}
              testID="milestone-keep"
            />
          ) : (
            <Button title="Continuar a jornada" onPress={close} testID="milestone-continue" />
          )}

          {isArrival ? (
            <Button
              title="Ver minhas reflexões"
              variant="underline"
              onInk
              onPress={() => router.replace('/reflexoes')}
            />
          ) : (
            <Button
              title={saved ? 'Marco guardado em Você' : 'Guardar este marco'}
              variant="underline"
              onPress={keep}
              disabled={saved}
              testID="milestone-keep"
            />
          )}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
