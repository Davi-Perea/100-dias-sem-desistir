import { type LayoutChangeEvent, View } from 'react-native';

import type { ReadingSummary } from '@/journey/readingSummary';
import { splitHighlight } from '@/journey/readingSummary';
import type { JourneyDay } from '@/journey/types';

import { AppText, Block, Button, Highlight, SaveErrorNotice } from '../components';
import { SpherePill } from '../SpherePill';
import { faces, spacing, useTheme } from '../theme';
import { speakList, speakReadingDetail } from './a11y';
import { PANEL_NUMERAL, SCREEN_NUMERAL, useDisplayNumeral } from './displayNumeral';

/** "Dia 17" + "de 100", alinhados pela base; o leitor de tela ouve uma frase só. */
export function DayHeadline({
  day,
  total,
  size = 'panel',
}: {
  day: number;
  total: number;
  /** `panel` = dayNumeral 58/54 −2,6 (A1); `screen` = 50/48 −2,2 (A3). */
  size?: 'panel' | 'screen';
}) {
  const { colors } = useTheme();
  // A3 pede 50/48 −2,2, que não existe no TOKENS §3; a tela específica vence a tabela.
  // Fonte grande: a política do numeral do marco (ver displayNumeral) — "Dia 17"
  // nunca quebra no meio da palavra; o "de 100" e o rótulo falado crescem sem teto.
  const numeral = useDisplayNumeral(`Dia ${day}`, size === 'screen' ? SCREEN_NUMERAL : PANEL_NUMERAL);
  return (
    <View
      onLayout={numeral.onLayout}
      style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: spacing.sm }}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`Dia ${day} de ${total}`}
      testID="day-headline"
    >
      <AppText
        variant="dayNumeral"
        style={numeral.style}
        maxFontSizeMultiplier={numeral.maxFontSizeMultiplier}
        testID="day-numeral"
      >
        {`Dia ${day}`}
      </AppText>
      <AppText variant="rowLabel" style={{ color: colors.textMuted }}>
        {`de ${total}`}
      </AppText>
    </View>
  );
}

/**
 * Ênfase do dia com o realce amarelo SÓ sobre a palavra do campo `theme_highlight`.
 * Sem o campo (é o caso nos 100 dias do material real), a ênfase aparece inteira
 * sem realce: o app nunca escolhe a palavra. A ênfase da igreja vem de `title`.
 */
export function Emphasis({ day, size = 'panel' }: { day: JourneyDay; size?: 'panel' | 'screen' }) {
  if (!day.title) return null;
  const parts = splitHighlight(day.title, day.theme_highlight);
  return (
    <AppText
      variant="blockTitle"
      // A3: 25/30. O tracking não foi especificado; fica o do blockTitle.
      style={size === 'screen' ? { fontSize: 25, lineHeight: 30 } : null}
      testID="day-emphasis"
    >
      {parts.before}
      {parts.match ? <Highlight>{parts.match}</Highlight> : null}
      {parts.after}
    </AppText>
  );
}

/** "Josué 6–17" + "12 capítulos · ~36 min". O "~" é estimativa do app: sempre com o til. */
export function ReadingLine({
  summary,
  refStyle,
}: {
  summary: ReadingSummary | null;
  /** A3 usa 20/25; o painel usa o readingRef de 21/25. */
  refStyle?: 'panel' | 'screen';
}) {
  if (!summary) {
    return <AppText variant="caption">Nenhuma leitura definida para este dia.</AppText>;
  }
  return (
    <View style={{ gap: 2 }}>
      <AppText
        variant="readingRef"
        accessibilityLabel={speakList(summary.label)}
        style={refStyle === 'screen' ? { fontSize: 20, lineHeight: 25 } : null}
        testID="reading-label"
      >
        {summary.label}
      </AppText>
      <AppText variant="caption" accessibilityLabel={speakReadingDetail(summary)}>
        {summary.detail}
      </AppText>
    </View>
  );
}

/**
 * A1 · painel de hoje. `surfaceWarm` raio 22 padding 16 gap 12, na ordem do
 * desenho: cap azul, numeral, pílula do monte, ênfase, leitura, "Ler agora",
 * "Vou ler na minha Bíblia".
 */
export function TodayPanel({
  day,
  total,
  dayData,
  summary,
  done,
  preferOwnBible,
  busy,
  onRead,
  onOwnBible,
  onComplete,
  onUndo,
  onOpenDay,
  onCapLayout,
  saveFailed = false,
}: {
  day: number;
  total: number;
  dayData: JourneyDay | null;
  summary: ReadingSummary | null;
  done: boolean;
  preferOwnBible: boolean;
  busy: boolean;
  onRead: () => void;
  onOwnBible: () => void;
  onComplete: () => void;
  onUndo: () => void;
  onOpenDay: () => void;
  /** Posição da cap dentro do painel: o nó de hoje no trilho se alinha a ela. */
  onCapLayout?: (event: LayoutChangeEvent) => void;
  /** A última conclusão/desfazer não foi gravada (PER-02): nada mudou no disco. */
  saveFailed?: boolean;
}) {
  const { colors } = useTheme();
  return (
    // TELAS A1: gap 12 entre TODOS os filhos do painel, botões inclusive — por isso
    // as ações entram direto no bloco, sem um View intermediário com outro gap.
    <Block tone="warm" style={{ gap: spacing.md, justifyContent: 'flex-start' }} testID="today-panel">
      <AppText
        variant="cap"
        accessibilityRole="header"
        accessibilityLabel="Hoje, a igreja está aqui"
        // TELAS A1: cap em 700 e em `blue` (o TOKENS diz 600; a tela vence). Azul
        // sobre o quente mede 7,78:1.
        style={{ fontFamily: faces.sg700, color: colors.blue }}
        onLayout={onCapLayout}
        testID="today-cap"
      >
        Hoje · a igreja está aqui
      </AppText>
      <DayHeadline day={day} total={total} />
      {dayData?.sphere ? <SpherePill sphere={dayData.sphere} testID="sphere-pill" /> : null}
      {dayData ? <Emphasis day={dayData} /> : null}
      <ReadingLine summary={summary} />

      {done ? (
        <DoneState day={day} summary={summary} busy={busy} onUndo={onUndo} />
      ) : preferOwnBible ? (
        // PROVISÓRIO (pergunta 2 ao designer): invariante P-09 — "Vou ler na minha
        // Bíblia" grava o modo e NÃO conclui o dia. A conclusão é sempre um gesto
        // explícito, "Concluir leitura". Para quem lê na Bíblia impressa ele vira a
        // ação principal, e o sublinhado devolve o leitor do app.
        <>
          <Button title="Concluir leitura" onPress={onComplete} loading={busy} testID="complete-day" />
          <Button
            title="Ler no app"
            variant="underline"
            onPress={onRead}
            disabled={busy}
            testID="secondary-read"
          />
        </>
      ) : (
        // PROVISÓRIO (pergunta 2 ao designer): no modo do app, "Ler agora" continua
        // principal e a conclusão também fica à mão aqui — nos dois modos o painel
        // tem "Concluir leitura" (o leitor tem o seu no último capítulo).
        <>
          <Button title="Ler agora" onPress={onRead} disabled={busy} testID="read-now" />
          <Button
            title="Concluir leitura"
            variant="outline"
            onPress={onComplete}
            loading={busy}
            testID="complete-day"
          />
          <Button
            title="Vou ler na minha Bíblia"
            variant="underline"
            onPress={onOwnBible}
            disabled={busy}
            testID="secondary-read"
          />
        </>
      )}

      {saveFailed ? <SaveErrorNotice testID="today-save-error" /> : null}

      {/* PROVISÓRIO (pergunta 3 ao designer): DESENHO PROPOSTO pelo engenheiro, não
          comportamento mantido — o Início antigo dava acesso direto à intercessão,
          à reflexão e ao jejum de hoje; aqui eles ficam a um toque a mais, no A3.
          O A3 de hoje não tem caminho desenhado a partir da casa; até a resposta,
          este sublinhado leva ao dia completo. */}
      <Button title="Ver o dia completo" variant="underline" onPress={onOpenDay} testID="open-today" />
    </Block>
  );
}

/**
 * PROVISÓRIO (pergunta 1 ao designer): o painel depois de concluído não foi
 * desenhado. Mostra que a leitura foi concluída e um sublinhado discreto
 * "Desfazer" (sem confirmação), montado com o bloco de conclusão do próprio
 * desenho (B4): círculo de 48 em `markSurface` com ponto de 16 em `onMark` e
 * "Dia 17 concluído" Schibsted 700 19/24.
 *
 * A linha de baixo é só a referência: a conclusão não grava o modo de leitura,
 * então dizer "lido na sua Bíblia" ou "lido aqui no app" seria afirmar o que o
 * app não sabe (e o leitor ainda não tem texto bíblico).
 */
function DoneState({
  day,
  summary,
  busy,
  onUndo,
}: {
  day: number;
  summary: ReadingSummary | null;
  busy: boolean;
  onUndo: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }} testID="day-completed">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.markSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.onMark }} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="action" accessibilityRole="header" style={{ fontSize: 19, lineHeight: 24 }}>
            {`Dia ${day} concluído`}
          </AppText>
          {summary ? (
            <AppText variant="caption" accessibilityLabel={speakList(summary.label)}>
              {summary.label}
            </AppText>
          ) : null}
        </View>
      </View>
      <Button
        title="Desfazer"
        variant="underline"
        onPress={onUndo}
        disabled={busy}
        accessibilityLabel={`Desfazer a conclusão do dia ${day}`}
        testID="undo-complete"
      />
    </View>
  );
}
