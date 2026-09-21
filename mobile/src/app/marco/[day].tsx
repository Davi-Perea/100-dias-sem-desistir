import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { ARRIVAL_NUMERAL, MILESTONE_NUMERAL, NUMERAL_MAX_SCALE, numeralSize } from '@/ui/altar/milestoneNumeral';
import { Dove } from '@/ui/brand';
import { HundredDayRuler } from '@/ui/HundredDayRuler';
import { AppText, Button, DevContentBanner, Screen, ScreenScroll, StateView } from '@/ui/components';
import { faces, fixedPalette, spacing, useGutter } from '@/ui/theme';

/**
 * E3 e E4 são SUPERFÍCIES FIXAS (TOKENS §2): amarelo no marco, tinta na chegada.
 * Nenhuma cor aqui segue o tema — nem o texto, nem os botões, nem a régua.
 *
 * CORREÇÃO TÉCNICA sobre o TELAS.md, que escreve `textSecondary` nas duas: o
 * amarelo usa os valores do claro (#3F3D38, 7,42:1) e a tinta os do escuro
 * (#C7C4BD, 10,84:1). Com o token temático, "Apocalipse 21:5" mediria 1,74:1 no
 * claro e a frase do marco 1,19:1 no escuro.
 */
const YELLOW = fixedPalette('yellow');
const INK = fixedPalette('ink');

function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Frase do marco (TELAS E3). Só a do 25 foi escrita no desenho; é cópia do app,
 * não texto da igreja.
 *
 * PROVISÓRIO (LACUNAS P35): as frases de 7, 50 e 75 não foram entregues. Até lá
 * ficam as que o app já tinha (milestones.ts).
 */
const DESIGN_PHRASE: Record<number, string> = {
  25: 'Vinte e cinco dias de Palavra. Você não desistiu.',
};

/** TELAS E4, cópia literal. */
const ARRIVAL_TITLE = 'Cem dias. Você atravessou a jornada inteira.';

/**
 * O jejum está desenhado para sair sem a tela mudar de forma (REGRAS §5, item 4):
 * os números são uma lista empilhada, e tirar um item só encurta a pilha.
 * PROVISÓRIO (REGRAS §5 item 4, LACUNAS P18/P55): a igreja ainda não confirmou o
 * jejum oficial, e não há campo de campanha para ele. Mantido como hoje: visível.
 */
const FASTING_IN_CAMPAIGN = true;

/** "1 reflexão escrita", "2 reflexões escritas": o rótulo acompanha o número (R3-10). */
export function statLabel(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural;
}

/**
 * Grava o marco no aparelho e só depois confirma. É a mesma gravação que o botão
 * fazia antes de o registro de "visto" passar para a abertura da tela
 * (`milestonesSeen`); aqui ela é aguardada, então a confirmação nunca aparece
 * sem a gravação ter acontecido — inclusive se a gravação da abertura falhou.
 */
async function keepMilestone(day: number): Promise<void> {
  await updateSettings((s) => ({
    ...s,
    milestonesSeen: s.milestonesSeen.includes(day) ? s.milestonesSeen : [...s.milestonesSeen, day],
    milestonesKept: s.milestonesKept.includes(day) ? s.milestonesKept : [...s.milestonesKept, day],
  }));
}

/**
 * E3 · Marco (7, 25, 50, 75) e E4 · Chegada do dia 100.
 *
 * O marco é CONTAGEM PESSOAL de leituras, nunca dia de calendário: sem data, sem
 * monte, sem ênfase. Sem confete, sem pontos, sem XP. A chegada é a exceção de
 * data: 100 leituras implicam ter lido o Dia 100, então ali a data é verdadeira.
 *
 * O disparo (quando esta tela abre) não mora aqui.
 */
export default function MilestoneScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const journey = useJourney();
  const settings = useSettings();
  const reflections = useReflections(journey.campaign.id);
  const fasting = useFasting(journey.campaign.id);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const { width, fontScale } = useWindowDimensions();
  const gutter = useGutter();

  const day = Number.parseInt(params.day ?? '', 10);
  const milestone = milestoneForDay(day);
  const total = journey.campaign.total_days;
  const isArrival = day === total;
  // CORREÇÃO (LACUNAS C40): a rota tem deep link. Sem esta guarda, /marco/25
  // afirmaria "25 de 100 dias lidos" a quem leu 3, e /marco/100 mostraria o
  // versículo-base do Dia 100 antes da hora. O marco só existe para quem o alcançou.
  const reached = milestone !== null && journey.completedCount >= day;

  // CORREÇÃO (LACUNAS B29): "aparece uma vez por marco". Grava como visto ao
  // abrir, não no botão: o voltar do Android e "Ver minhas reflexões" fechavam a
  // tela sem gravar, e o marco voltava a cada abertura.
  const alreadySeen = settings?.milestonesSeen.includes(day) ?? true;
  const kept = settings?.milestonesKept.includes(day) ?? false;
  useEffect(() => {
    if (!reached || alreadySeen) return;
    // Se não gravar, o marco volta na próxima abertura — o melhor fallback.
    updateSettings((s) =>
      s.milestonesSeen.includes(day) ? s : { ...s, milestonesSeen: [...s.milestonesSeen, day] },
    ).catch(() => undefined);
  }, [reached, alreadySeen, day]);

  if (!journey.ready || !settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (!milestone || !reached) {
    return (
      <Screen>
        <StateView
          kind="empty"
          title="Marco não encontrado"
          action={<Button title="Voltar" variant="outline" onPress={goHome} />}
        />
      </Screen>
    );
  }

  const numeral = numeralSize(String(day), isArrival ? ARRIVAL_NUMERAL : MILESTONE_NUMERAL, {
    width,
    gutter,
    fontScale,
  });
  const ruler = (
    <HundredDayRuler
      totalDays={total}
      officialDay={journey.officialDay}
      completed={completedDayNumbers(journey.completions)}
      variant={isArrival ? 'onInk' : 'onYellow'}
      accessibilityLabel={`Régua com os ${journey.completedCount} dias que você já leu, de ${total}.`}
    />
  );

  if (!isArrival) {
    const phrase = DESIGN_PHRASE[day] ?? milestone.celebration;
    return (
      <Screen tone="yellow" edges={['top', 'bottom', 'left', 'right']}>
        {/* CORREÇÃO TÉCNICA (LACUNAS C57): barra de status pela superfície, não pelo tema. */}
        <StatusBar style="dark" />
        <ScreenScroll gap={spacing.lg}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppText
              variant="cap"
              accessibilityRole="header"
              accessibilityLabel={`Marco: ${day} de ${total} dias lidos`}
              style={{ flex: 1, color: YELLOW.onAccent }}
              testID="milestone-cap"
            >
              {`Marco · ${day} de ${total} dias lidos`}
            </AppText>
            <Dove width={46} tone="black" role="signature" />
          </View>
          {/* PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo (C-07) sem lugar
              no desenho; compacto, logo abaixo do cabeçalho. */}
          <DevContentBanner state={journey.contentState} compact tone="yellow" />

          <AppText
            variant="milestone"
            style={{
              fontSize: numeral.size,
              lineHeight: numeral.lineHeight,
              letterSpacing: numeral.letterSpacing,
              color: YELLOW.onAccent,
            }}
            // A cap logo acima, marcada como cabeçalho, já diz o número inteiro e
            // sem símbolos; o numeral repetiria o dado (R3-11).
            aria-hidden
            maxFontSizeMultiplier={NUMERAL_MAX_SCALE}
            testID="milestone-numeral"
          >
            {day}
          </AppText>

          <AppText
            accessibilityRole="header"
            style={{ fontFamily: faces.sg700, fontSize: 34, lineHeight: 38, color: YELLOW.onAccent }}
            testID="milestone-label"
          >
            {milestone.label}
          </AppText>
          <AppText style={{ fontFamily: faces.ss400, fontSize: 19, lineHeight: 30, color: YELLOW.textSecondary }}>
            {phrase}
          </AppText>

          {ruler}

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Continuar a jornada" tone="yellow" onPress={goHome} testID="milestone-continue" />
            {/* PROVISÓRIO (LACUNAS C18, decisão do dono): "Guardar este marco" promete
                um lugar em Você que não existe em nenhuma das telas. O que o toque
                faz de fato: grava o marco no aparelho (`keepMilestone`), registra
                o evento de analytics (desligado por padrão, não sai do aparelho) e,
                SÓ DEPOIS da gravação, troca o rótulo para "Marco guardado". Se a
                gravação falhar, nada é confirmado.
                CORREÇÃO: "Marco guardado em Você" era um destino falso.
                CORREÇÃO TÉCNICA (R3-5): o retorno não é mais um botão desabilitado a
                0,45 sobre o amarelo (2,82:1). O botão continua ativo, com o rótulo em
                cor plena (`text` do claro, #111111, 12,92:1 sobre #FFD100), e tocar de novo
                só repete a mesma gravação, sem efeito. Ativo também mantém o foco do
                leitor de tela no lugar, que relê o nome novo como retorno.
                O "guardado" vive em `milestonesKept`, distinto de "visto": ao
                reabrir a tela, o rótulo continua "Marco guardado". */}
            <Button
              title={saved || kept ? 'Marco guardado' : 'Guardar este marco'}
              variant="underline"
              tone="yellow"
              onPress={async () => {
                if (saving.current) return;
                saving.current = true;
                try {
                  await keepMilestone(day);
                  if (!saved && !kept) track({ name: 'milestone_reached', dayNumber: day });
                  setSaved(true);
                } catch {
                  // Sem confirmação: o rótulo continua "Guardar este marco".
                } finally {
                  saving.current = false;
                }
              }}
              testID="milestone-keep"
            />
          </View>
        </ScreenScroll>
      </Screen>
    );
  }

  // E4 · Chegada do dia 100.
  const date = formatDayDate(day, journey.campaign);
  const dayData = getDay(day);
  // Nunca escrito à mão: vem do dataset (REV 21:5) e passa por formatReference.
  const verseReference = dayData?.key_verse_reference ? formatReference(dayData.key_verse_reference) : null;
  const reflectionTotal = reflectionCount(reflections);
  const fastingTotal = fastingKeptCount(fasting);
  const stats = [
    { key: 'read', value: journey.completedCount, label: statLabel(journey.completedCount, 'dia lido', 'dias lidos') },
    {
      key: 'reflections',
      value: reflectionTotal,
      label: statLabel(reflectionTotal, 'reflexão escrita', 'reflexões escritas'),
    },
    ...(FASTING_IN_CAMPAIGN
      ? [{ key: 'fasting', value: fastingTotal, label: statLabel(fastingTotal, 'dia de jejum', 'dias de jejum') }]
      : []),
  ];

  return (
    <Screen tone="ink" edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <ScreenScroll gap={spacing.lg}>
        <AppText
          variant="cap"
          accessibilityRole="header"
          accessibilityLabel={`Chegada, dia ${total}, ${date}`}
          style={{ color: INK.accent }}
          testID="milestone-cap"
        >
          {`Chegada · Dia ${total} · ${date}`}
        </AppText>
        {/* PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo (C-07) sem lugar
            no desenho, inclusive nas telas pretas; compacto, abaixo do cabeçalho. */}
        <DevContentBanner state={journey.contentState} compact tone="ink" />

        {/* Amarelo sobre tinta: 12,92:1. */}
        <AppText
          variant="milestone"
          style={{
            fontSize: numeral.size,
            lineHeight: numeral.lineHeight,
            letterSpacing: numeral.letterSpacing,
            color: INK.accent,
          }}
          // A cap "Chegada, dia 100, …" já diz o número (R3-11).
          aria-hidden
          maxFontSizeMultiplier={NUMERAL_MAX_SCALE}
          testID="milestone-numeral"
        >
          {day}
        </AppText>

        <AppText
          accessibilityRole="header"
          style={{ fontFamily: faces.sg700, fontSize: 30, lineHeight: 35, color: INK.text }}
          testID="milestone-label"
        >
          {ARRIVAL_TITLE}
        </AppText>
        {verseReference ? (
          <AppText
            style={{ fontFamily: faces.ss400i, fontSize: 18, lineHeight: 28, color: INK.textSecondary }}
            testID="milestone-verse"
          >
            {verseReference}
          </AppText>
        ) : null}

        {/* Empilhados, com filete entre eles, nunca em colunas (decisão A3 do
            pacote): se o jejum sair, sobram dois e a tela não muda de forma. Os
            números são reais e locais. */}
        <View testID="milestone-stats" accessibilityRole="list">
          {stats.map((stat, i) => (
            <View
              key={stat.key}
              testID={`milestone-stat-${stat.key}`}
              accessible
              accessibilityLabel={`${stat.value} ${stat.label}`}
              style={{
                paddingVertical: spacing.md,
                gap: 2,
                // Filete decorativo em `border` do escuro, só ENTRE os números.
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: INK.border,
              }}
            >
              <AppText style={{ fontFamily: faces.sg800, fontSize: 34, lineHeight: 36, color: INK.accent }}>
                {stat.value}
              </AppText>
              {/* CORREÇÃO TÉCNICA: era branco a 78% de opacidade; hex plano #C7C4BD, 10,84:1. */}
              <AppText style={{ fontFamily: faces.sg500, fontSize: 15, lineHeight: 20, color: INK.textSecondary }}>
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {/* CORREÇÃO (2.1/2.3): "Guardar minha jornada" prometia guardar algo e só
              voltava para a Jornada; sem nuvem não há onde guardar. Mesmo rótulo e
              mesma ação do outro ramo do marco. Registra (analytics desligado por
              padrão) e fecha. O marco já foi gravado como visto ao abrir. */}
          <Button
            title="Continuar a jornada"
            variant="yellow"
            tone="ink"
            onPress={() => {
              track({ name: 'milestone_reached', dayNumber: day });
              goHome();
            }}
            testID="milestone-continue"
          />
          <Button
            title="Ver minhas reflexões"
            variant="underline"
            tone="ink"
            onPress={() => router.replace('/reflexoes')}
            testID="milestone-reflections"
          />
        </View>
      </ScreenScroll>
    </Screen>
  );
}
