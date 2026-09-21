import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { formatReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { flowSteps, type FlowStep } from '@/journey/proposito';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { JourneyDay } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { AltarMode } from '@/ui/AltarMode';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { LockSheet, LockedDayScreen } from '@/ui/LockSheet';
import { SpherePill } from '@/ui/SpherePill';
import {
  AppText,
  Block,
  Button,
  DevContentBanner,
  Screen,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { faces, spacing, useTheme } from '@/ui/theme';

/**
 * Círculo de 34 em `markSurface` com o numeral em `onMark` (TELAS E1): tinta com
 * amarelo no claro, amarelo com tinta no escuro (12,92:1 nos dois). Decorativo:
 * o cabeçalho do passo já diz "Passo N de 5".
 *
 * Piso, não medida: com fonte grande o numeral cresce e o círculo vira pílula em
 * vez de cortar o dígito (regra 25).
 */
function StepNumber({ n }: { n: number }) {
  const { colors } = useTheme();
  return (
    <View
      aria-hidden
      style={{
        minWidth: 34,
        minHeight: 34,
        paddingHorizontal: spacing.xs,
        borderRadius: 17,
        backgroundColor: colors.markSurface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText
        variant="action"
        style={{ fontFamily: faces.sg800, fontSize: 16, lineHeight: 20, color: colors.onMark }}
      >
        {n}
      </AppText>
    </View>
  );
}

/**
 * Um passo da reunião das 12h30, com o título e a descrição da orientação da
 * igreja (proposito.json `flow`), como vieram.
 *
 * O rótulo "Passo N de 5: título" fica na linha de cabeçalho, não no bloco
 * inteiro: um bloco `accessible` viraria um único elemento no iOS e engoliria o
 * "Abrir no leitor" e os motivos de oração.
 */
function FlowStepBlock({ step, total, day, dayNumber }: { step: FlowStep; total: number; day: JourneyDay; dayNumber: number }) {
  const { colors } = useTheme();
  // `Block` sem `onPress` repassa testID, mas o invólucro deixa o identificador
  // estável se o bloco mudar de componente.
  return (
    <View testID={`flow-step-${step.step}`}>
      {/* TELAS E1: blocos de passo em `surface`, raio 20. */}
      <Block tone="surface" style={{ borderRadius: 20, gap: spacing.md }}>
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
        {/* Texto da orientação da igreja: `quote` é a variante do TOKENS para ele. */}
        <AppText variant="quote">{step.description}</AppText>

        {step.step === 3 && day.key_verse_reference ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="cap" accessibilityRole="header">
              Versículo-base
            </AppText>
            {/* Só a referência, nunca o versículo: a tradução não tem licença (Gate 1).
                PROVISÓRIO (decisão do engenheiro, 2026-09-21: o TELAS não dá tamanho à
                referência no E1). Usa o tratamento do mesmo elemento no A3, Source
                Serif 19/28 (`read`); `readingRef` é o da referência de LEITURA. */}
            <AppText variant="read" style={{ lineHeight: 28 }} testID="intercession-key-verse">
              {formatReference(day.key_verse_reference)}
            </AppText>
            {/* PROVISÓRIO (decisão do engenheiro, 2026-09-21: o leitor não aceita
                capítulo nem versículo, então abre a leitura do dia no capítulo 1, que
                pode ser outro livro; LACUNAS). Rótulo mantido até o designer
                responder; a dica acessível diz o destino real. */}
            <Button
              title="Abrir no leitor"
              variant="underline"
              onPress={() => router.push({ pathname: '/reader/[day]', params: { day: String(dayNumber) } })}
              accessibilityHint="Abre a leitura bíblica deste dia"
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
              testID="open-reader"
            />
          </View>
        ) : null}

        {step.step === 4 ? (
          <View style={{ gap: spacing.sm }}>
            {day.sphere ? (
              <AppText variant="cap" accessibilityRole="header">
                {SPHERE_LABEL[day.sphere]}
              </AppText>
            ) : null}
            {day.title ? <AppText variant="blockTitle">{day.title}</AppText> : null}
            {day.prayer_points.length > 0 ? (
              <View accessibilityRole="list" style={{ gap: spacing.sm, marginTop: spacing.xs }} testID="prayer-points">
                {day.prayer_points.map((point, i) => (
                  <View key={`${i}-${point}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                    <View
                      aria-hidden
                      style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: colors.text }}
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
 * E1 · Intercessão do dia: o mesmo roteiro da reunião das 12h30 para quem
 * intercede em casa, e o "Modo altar" (E2) para quem conduz com o telefone
 * apoiado.
 *
 * Tudo que aparece vem do dataset (ênfase, monte, versículo, motivos, escala) ou
 * da orientação da igreja (`flowSteps`). Nomes de líderes passam por
 * `altarOfDay`, que os esconde enquanto a igreja não autorizar.
 */
export default function IntercessionScreen() {
  const params = useLocalSearchParams<{ day: string }>();
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
        <BackBar onBack={goBackOrHome} />
        <StateView
          kind="empty"
          title="Dia não encontrado"
          message="Este dia não faz parte da jornada."
          action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
        />
      </Screen>
    );
  }

  const dateLabel = formatDayDate(day, journey.campaign);

  // A4: o bloqueio é da ROTA (REGRAS 7). Nada do dia é renderizado — nem monte,
  // nem ênfase, nem passos —, só o número e a data.
  if (!journey.isDayUnlocked(day)) {
    // Sem pilha (lembrete, deep link) não há Jornada atrás para a folha cobrir:
    // a mesma composição vira tela e o botão leva para a casa.
    if (!router.canGoBack()) {
      return <LockedDayScreen dayNumber={day} dateLabel={dateLabel} kind="intercessao" />;
    }
    return (
      <Screen tone="warm">
        <BackBar onBack={goBackOrHome} />
        <LockSheet visible onClose={goBackOrHome} dayNumber={day} dateLabel={dateLabel} kind="intercessao" />
      </Screen>
    );
  }

  const steps = flowSteps();

  if (altarMode) {
    return (
      <>
        {/* Sem o gesto de voltar do iOS enquanto conduz: um deslize acidental não derruba a reunião. */}
        <Stack.Screen options={{ gestureEnabled: false }} />
        <AltarMode day={dayData} steps={steps} contentState={journey.contentState} onExit={exitAltarMode} />
      </>
    );
  }

  const altar = altarOfDay(day);
  const conductor = altar
    ? altar.leaders_label
      ? `${altar.ministry} · ${altar.leaders_label}`
      : altar.ministry
    : null;
  // CORREÇÃO TÉCNICA (LACUNAS C42): o E1 também abre dias passados, pelo A3.
  // "hoje conduz" só é verdade no dia oficial com a campanha em curso. Dia que já
  // passou (ou campanha encerrada) diz "conduziu", como o A3 já diz "Conduziu".
  // PROVISÓRIO (decisão do engenheiro, 2026-09-21: cópia do app, C42 vai na
  // próxima mensagem ao designer).
  const isToday = journey.phase === 'running' && day === journey.officialDay;
  const isPast = journey.phase === 'finished' || (journey.phase === 'running' && day < journey.officialDay);
  const altarVerb = isToday ? 'hoje conduz' : isPast ? 'conduziu' : 'conduz';
  // Sem pilha (lembrete, deep link) o voltar leva à Jornada, não ao dia: o rótulo
  // diz o destino real. A data na cap continua dizendo qual dia é.
  // PROVISÓRIO (decisão do engenheiro, 2026-09-21: LACUNAS P56 não desenha esse caso).
  const backLabel = router.canGoBack() ? `Dia ${day}` : 'Jornada';

  return (
    <Screen tone="warm">
      <Stack.Screen options={{ gestureEnabled: true }} />
      <ScreenScroll gap={spacing.lg}>
        <BackBar label={backLabel} onBack={goBackOrHome} />
        {/* PROVISÓRIO (pergunta 5 ao designer): o aviso de conteúdo (C-07) não tem
            lugar no desenho. Compacto, logo abaixo do cabeçalho. */}
        <DevContentBanner state={journey.contentState} compact />

        <View style={{ gap: spacing.md }}>
          <AppText
            variant="cap"
            accessibilityRole="header"
            accessibilityLabel={`Intercessão do dia, ${dateLabel}`}
            testID="intercession-cap"
          >
            {`Intercessão do dia · ${dateLabel}`}
          </AppText>
          {dayData.sphere ? <SpherePill sphere={dayData.sphere} /> : null}
          {dayData.title ? (
            <AppText variant="blockTitleLg" accessibilityRole="header">
              {dayData.title}
            </AppText>
          ) : null}
          {conductor ? (
            <AppText
              variant="caption"
              accessibilityLabel={`Altar das 12h30, ${altarVerb}: ${conductor.replace(' · ', ', ')}`}
              testID="altar-caption"
            >
              {`Altar das 12h30 · ${altarVerb}: ${conductor}`}
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
