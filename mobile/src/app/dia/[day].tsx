import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { formatReference } from '@/bible/references';
import { holdMilestones, releaseMilestones } from '@/journey/celebration';
import { isFastingKept, setFastingKept, useFasting } from '@/fasting/fastingStore';
import { getDay } from '@/journey/datasetSource';
import { altarOfDay } from '@/journey/ministries';
import { formatDayDate } from '@/journey/officialDay';
import { flowSteps } from '@/journey/proposito';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { useSettings } from '@/settings/settingsStore';
import { BackBar } from '@/ui/BackBar';
import {
  AppText,
  Block,
  Button,
  Cap,
  DevContentBanner,
  Rule,
  Screen,
  SaveErrorNotice,
  ScreenScroll,
  StateView,
} from '@/ui/components';
import { speakList } from '@/ui/jornada/a11y';
import { DayLinkRow, FastingRow } from '@/ui/jornada/DayLinkRow';
import { extensoCap } from '@/ui/jornada/extenso';
import { DayHeadline, Emphasis, ReadingLine } from '@/ui/jornada/TodayPanel';
import { LockedDayScreen } from '@/ui/LockSheet';
import { SpherePill } from '@/ui/SpherePill';
import { BRAND_YELLOW, MIN_TOUCH, spacing } from '@/ui/theme';

/**
 * A3 · O dia completo. Tela contextual (sem barra de abas), fundo `surfaceWarm`,
 * alcançada tocando qualquer dia liberado da Jornada.
 *
 * Ordem do desenho: "‹ Jornada" + data · "Dia 17" de 100 · monte · ênfase ·
 * bloco da leitura com "Ler" · versículo-base (só a referência) · motivos de
 * oração · filete · altar, intercessão, reflexão · jejum.
 *
 * Dia futuro: o bloqueio é da ROTA (REGRAS 7). Link direto, histórico e deep
 * link chegam no cadeado do A4 antes de qualquer leitura do conteúdo do dia.
 * Com a chave J6 (`FUTURE_DAYS_OPEN`, config/features.ts) todo dia da campanha
 * abre; o dia futuro se lê, mas só se conclui quando chegar (`isDayCompletable`).
 *
 * J5: concluir aqui leva à tela "Dia N concluído" (/concluido/[day]).
 */
export default function DayScreen() {
  const params = useLocalSearchParams<{ day: string }>();
  const journey = useJourney();
  const settings = useSettings();
  const fasting = useFasting(journey.campaign.id);
  // PER-02: os stores recusam quando o disco falha e nada muda; a tela avisa.
  const [saveFailed, setSaveFailed] = useState<'completion' | 'fasting' | null>(null);

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
        <ScreenScroll>
          <BackBar label="Jornada" />
          <StateView
            kind="empty"
            title="Dia não encontrado"
            message="Este dia não faz parte da jornada."
            action={<Button title="Voltar para a Jornada" variant="outline" onPress={() => router.replace('/')} />}
          />
        </ScreenScroll>
      </Screen>
    );
  }

  const dateLabel = formatDayDate(day, journey.campaign);

  if (!journey.isDayUnlocked(day)) {
    return <LockedDayScreen dayNumber={day} dateLabel={dateLabel} />;
  }

  const dayData = getDay(day);
  const summary = readingSummary(dayData);
  const done = isDayCompleted(journey.completions, day);
  const fastingDone = isFastingKept(fasting, day);
  const keyVerse = dayData?.key_verse_reference ? formatReference(dayData.key_verse_reference) : null;
  const prayerPoints = dayData?.prayer_points ?? [];
  // CORREÇÃO: "Hoje conduz" e "hoje" só no dia de hoje da campanha em curso. Num
  // dia passado (ou depois da campanha) o desenho diria "hoje" de um dia que não
  // é hoje; ali fica "Conduziu" e "neste dia".
  const isToday = journey.phase === 'running' && day === journey.officialDay;
  const completable = journey.isDayCompletable(day);
  const isFuture = !completable;
  // Nunca nome de líder, nem com autorização (REGRAS 3): o altar diz só o ministério.
  const altar = altarOfDay(day);
  const steps = flowSteps().length;

  const save = (kind: 'completion' | 'fasting', write: () => Promise<unknown>) => {
    setSaveFailed(null);
    write().catch(() => setSaveFailed(kind));
  };

  /** J5: gravado, abre a celebração; o marco (se houver) espera ela sair. */
  const complete = () => {
    setSaveFailed(null);
    holdMilestones();
    setDayCompleted(journey.campaign.id, day, true).then(
      () => router.push({ pathname: '/concluido/[day]', params: { day: String(day) } }),
      () => {
        releaseMilestones();
        setSaveFailed('completion');
      },
    );
  };

  const openReader = () => router.push({ pathname: '/reader/[day]', params: { day: String(day) } });

  return (
    <Screen tone="warm">
      <ScreenScroll gap={spacing.lg}>
        <BackBar label="Jornada" rightText={dateLabel} />
        {/* PROVISÓRIO (pergunta 5 ao designer): a faixa de conteúdo não autorizado
            (invariante C-07) não tem lugar no desenho; fica compacta, logo abaixo
            da barra. */}
        <DevContentBanner state={journey.contentState} compact />

        <View style={{ gap: spacing.md }}>
          <DayHeadline day={day} total={total} size="screen" />
          {dayData?.sphere ? <SpherePill sphere={dayData.sphere} testID="sphere-pill" /> : null}
          {dayData ? <Emphasis day={dayData} size="screen" /> : null}
        </View>

        {/* Bloco branco raio 22 com a leitura e o botão "Ler" de piso 48 à direita. */}
        <Block tone="surface" testID="day-reading">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
              <ReadingLine summary={summary} refStyle="screen" />
              {/* PROVISÓRIO (pergunta 1 ao designer): o A3 concluído não foi desenhado.
                  Fica o que o app já mostra: o dia marcado como concluído. */}
              {done ? (
                <AppText variant="captionStrong" testID="day-done" style={{ paddingTop: spacing.xs }}>
                  Concluído
                </AppText>
              ) : null}
            </View>
            {summary ? (
              <Button
                title="Ler"
                onPress={openReader}
                accessibilityHint={`Abre o leitor em ${speakList(summary.label)}`}
                // TELAS A3: piso de 48 (o primário padrão tem 56). Nunca abaixo do alvo de toque.
                style={{ minHeight: MIN_TOUCH }}
                testID="day-primary"
              />
            ) : null}
          </View>
        </Block>

        {/* PROVISÓRIO (pergunta 2 ao designer): o A3 perdeu o "Marcar como concluído" e
            o desenho não diz onde conclui quem lê na própria Bíblia. Fica o gesto
            explícito com o mesmo nome do painel (invariante P-09), como sublinhado —
            é por aqui que se conclui um dia passado em aberto.
            PROVISÓRIO (pergunta 1 ao designer): concluído, o mesmo "Desfazer" discreto
            do painel de hoje, para quem marcou o dia errado. */}
        {done ? (
          <Button
            title="Desfazer"
            variant="underline"
            onPress={() => save('completion', () => setDayCompleted(journey.campaign.id, day, false))}
            accessibilityLabel={`Desfazer a conclusão do dia ${day}`}
            testID="day-undo"
          />
        ) : completable ? (
          <Button title="Concluir leitura" variant="underline" onPress={complete} testID="day-complete" />
        ) : (
          // J6: o dia futuro abre para leitura, mas concluir antes da hora mexeria no
          // progresso e nos marcos. A frase diz quando.
          <AppText variant="caption" testID="day-future-note">
            {`Você poderá concluir este dia a partir de ${dateLabel}.`}
          </AppText>
        )}
        {saveFailed === 'completion' ? <SaveErrorNotice testID="day-save-error" /> : null}

        {keyVerse ? (
          <View style={{ gap: spacing.xs }}>
            <Cap>Versículo-base</Cap>
            {/* Só a referência, nunca o versículo (a tradução ainda não tem licença). */}
            <AppText variant="read" style={{ lineHeight: 28 }} testID="key-verse">
              {keyVerse}
            </AppText>
          </View>
        ) : null}

        {prayerPoints.length > 0 ? (
          <View style={{ gap: spacing.sm }} testID="prayer-points">
            <Cap>Motivos de oração</Cap>
            <View accessibilityRole="list" style={{ gap: spacing.sm }}>
              {prayerPoints.map((point, index) => (
                <View
                  key={`${index}-${point}`}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}
                >
                  {/* Marcador amarelo de 6px: decorativo, o texto é quem informa. */}
                  <View
                    aria-hidden
                    style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: BRAND_YELLOW }}
                  />
                  <AppText variant="item" style={{ flex: 1 }}>
                    {point}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Rule />

        <View>
          {altar ? (
            <DayLinkRow
              title="Altar das 12h30"
              subtitle={`${isToday ? 'Hoje conduz' : isFuture ? 'Conduz' : 'Conduziu'}: ${altar.ministry}`}
              testID="day-altar"
            />
          ) : null}
          <DayLinkRow
            title="Intercessão do dia"
            subtitle={`${extensoCap(steps)} passos · modo altar`}
            onPress={() => router.push({ pathname: '/intercessao/[day]', params: { day: String(day) } })}
            testID="day-intercession"
          />
          <DayLinkRow
            title="Minha reflexão"
            subtitle="Só você vê"
            onPress={() => router.push({ pathname: '/reflexao/[day]', params: { day: String(day) } })}
            testID="day-reflection"
          />
        </View>

        {/* O jejum aparece para quem optou por ele (como no app de hoje). REGRAS §5.4:
            a superfície foi desenhada para sair sem refazer a tela. */}
        {/* J6: jejum de um dia que ainda não chegou não se marca. */}
        {settings.fastingEnabled && !isFuture ? (
          <FastingRow
            // CORREÇÃO: mesmo motivo do altar — num dia passado, não é 'hoje'.
            title={isToday ? 'Cumpri meu jejum hoje' : 'Cumpri meu jejum neste dia'}
            subtitle="Só você vê"
            checked={fastingDone}
            onToggle={() => save('fasting', () => setFastingKept(journey.campaign.id, day, !fastingDone))}
            testID="day-fasting"
          />
        ) : null}
        {saveFailed === 'fasting' ? <SaveErrorNotice testID="day-fasting-save-error" /> : null}
      </ScreenScroll>
    </Screen>
  );
}
