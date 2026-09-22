import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, type LayoutChangeEvent, Platform, useWindowDimensions, View } from 'react-native';

import { track } from '@/analytics/analytics';
import { holdMilestones, releaseMilestones } from '@/journey/celebration';
import { getDay } from '@/journey/datasetSource';
import { milestoneForDay } from '@/journey/milestones';
import { daysForMinistry } from '@/journey/ministries';
import {
  isStacked,
  journeyRowHeight,
  rowKey,
  type JourneyRow,
  type RowContext,
} from '@/journey/journeyRowHeight';
import { formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import { entryMessage } from '@/journey/returnGap';
import { SPHERE_LABEL } from '@/journey/spheres';
import { useOnline } from '@/net/useOnline';
import { useJourney, type JourneySnapshot } from '@/journey/useJourney';
import { completedDayNumbers, isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { reflectionCount, useReflections } from '@/reflections/reflectionsStore';
import { type Settings, updateSettings, useSettings } from '@/settings/settingsStore';
import { Button, DevContentBanner, OfflineBanner, Screen, ScreenScroll } from '@/ui/components';
import { BeforeCampaign } from '@/ui/jornada/BeforeCampaign';
import { dailyNoticeMark, useDailyNotice } from '@/ui/jornada/dailyNotice';
import { DailyVerseNotice } from '@/ui/jornada/DailyVerseNotice';
import { CampaignFinished } from '@/ui/jornada/CampaignFinished';
import { JourneyHeader } from '@/ui/jornada/JourneyHeader';
import { openingIndex, openingOffset } from '@/ui/jornada/opening';
import { type EntryDismissal, entryDismissMark, useEntryDismissal } from '@/ui/jornada/entryDismissal';
import { DayRow, EarlierDaysRow, GapRow, type RailKind, TodayRow, todayNodeOffset } from '@/ui/jornada/JourneyRows';
import { buildRows, isEarlierGap, RECENT_PAST_DAYS } from '@/ui/jornada/rows';
import { TodayPanel } from '@/ui/jornada/TodayPanel';
import { EntryMessageCard } from '@/ui/jornada/WelcomeBack';
import { LockSheet } from '@/ui/LockSheet';
import { TodaySkeleton } from '@/ui/Skeleton';
import { spacing, useGutter, useReducedMotion } from '@/ui/theme';

/**
 * A1 · Jornada — a casa do app (rota "/").
 *
 * Abre onde a igreja está, nunca no dia 1: dias passados em cima, o painel de
 * hoje, os dias futuros embaixo. Estados da mesma casa: carregando (F3),
 * mensagem de entrada com os dias em aberto (no lugar da A2), antes da campanha
 * (A5), encerrada (E5).
 */

function haptic(style: 'light' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (style === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * Respiro do topo da lista, ACIMA do cabeçalho (que agora rola junto). Entra nos
 * deslocamentos do `getItemLayout`, somado à altura medida do cabeçalho.
 */
const LIST_PAD_TOP = spacing.md;
const EMPTY_MEASURES: Record<string, number> = {};

export default function JourneyHome() {
  const journey = useJourney();
  const settings = useSettings();
  // Saber se a mensagem de entrada foi dispensada hoje faz parte do carregamento:
  // a lista calcula a abertura (e as linhas) uma vez só, na montagem.
  const dismissal = useEntryDismissal(entryDismissMark(journey.campaign.id, journey.officialDay));

  useFocusEffect(
    useCallback(() => {
      track({ name: 'journey_viewed' });
    }, []),
  );

  if (!journey.ready || !settings || !dismissal.loaded) {
    return (
      <Screen>
        <ScreenScroll>
          <TodaySkeleton />
        </ScreenScroll>
      </Screen>
    );
  }

  if (journey.phase === 'before_start') {
    // DIA-04: a contagem vem do MESMO relógio que decide a fase (`useJourney`), no
    // fuso da campanha — nunca "Faltam 0 dias" com o Dia 1 ainda trancado.
    return (
      <BeforeCampaign campaign={journey.campaign} daysToStart={journey.daysToStart} contentState={journey.contentState} />
    );
  }

  return <JourneyTrail journey={journey} settings={settings} dismissal={dismissal} />;
}

function JourneyTrail({
  journey,
  settings,
  dismissal,
}: {
  journey: JourneySnapshot;
  settings: Settings;
  dismissal: EntryDismissal;
}) {
  const online = useOnline();
  const reflections = useReflections(journey.campaign.id);
  const { fontScale, height: windowHeight } = useWindowDimensions();
  const gutter = useGutter();
  const reduced = useReducedMotion();
  // TELAS: calha 20 nas telas de lista (24 é a das demais); tablet mantém a sua.
  const inset = gutter === 24 ? 20 : gutter;
  const listRef = useRef<FlatList<JourneyRow>>(null);

  const [expanded, setExpanded] = useState(false);
  // A folha do cadeado guarda o dia mesmo fechando: o conteúdo não pode mudar
  // (nem virar "Dia 0 abre em .") durante a animação de saída do Modal.
  const [lockSheet, setLockSheet] = useState<{ day: number; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Medidas antigas não valem para outro tamanho de fonte: o mapa carrega a
  // escala em que foi medido e é descartado (sem efeito) quando ela muda.
  const [measuredState, setMeasuredState] = useState<{ scale: number; map: Record<string, number> }>(() => ({
    scale: fontScale,
    map: {},
  }));
  const measured = measuredState.scale === fontScale ? measuredState.map : EMPTY_MEASURES;
  const [todayHeight, setTodayHeight] = useState<number | null>(null);
  const [welcomeHeight, setWelcomeHeight] = useState<number | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [listHeight, setListHeight] = useState<number | null>(null);
  const [cap, setCap] = useState<{ y: number; height: number } | null>(null);

  const { campaign, officialDay, phase, completions } = journey;

  // J4 · aviso do dia: uma vez por dia oficial, só com a campanha em curso (nunca
  // antes dela) e só com a Jornada em foco — o Modal fica por cima de tudo, e
  // não pode cobrir o marco ou a tela de conclusão empilhados sobre a casa.
  const notice = useDailyNotice(dailyNoticeMark(campaign.id, officialDay));
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const showNotice = phase === 'running' && focused && notice.loaded && !notice.dismissed;
  const total = campaign.total_days;
  const running = phase === 'running';
  const finished = phase === 'finished';
  /** Até onde o trilho é cheio. Depois da campanha, a trilha inteira ficou para trás. */
  const edge = finished ? total + 1 : officialDay;

  const ministry = settings.ministry ?? null;
  const ministryDays = useMemo(() => daysForMinistry(ministry), [ministry]);
  const ministrySet = useMemo(() => new Set(ministryDays), [ministryDays]);
  const openSet = useMemo(() => new Set(journey.pendingDays), [journey.pendingDays]);

  const doneToday = isDayCompleted(completions, officialDay);
  const gap = journey.gapDays;
  // Só para a métrica `return_after_gap` (quem decide é o `useJourney`); a tela
  // não usa mais a acolhida antiga.
  const returning = journey.welcomeBack;

  // Mensagem de entrada: 2+ dias em aberto antes de hoje, até "Ir para hoje"
  // dispensá-la no dia (ver `entryMessage` e `useEntryDismissal`).
  const entry = entryMessage({
    running,
    officialDay,
    pendingDays: journey.pendingDays,
    completedCount: journey.completedCount,
  });
  const showEntry = entry !== null && !dismissal.dismissed;
  /** Dias em aberto escondidos na linha recolhida do topo. */
  const earlierOpen = journey.pendingDays.filter((d) => d < edge - RECENT_PAST_DAYS).length;

  const rows = useMemo(() => {
    const base = buildRows(edge, total, expanded, ministryDays);
    if (!showEntry) return base;
    // A mensagem fica logo acima dos dias passados: acima da linha recolhida,
    // ou (com a trilha expandida) acima dos três dias mais recentes.
    let at = base.findIndex(
      (row) => isEarlierGap(row) || (row.kind === 'day' && row.day >= edge - RECENT_PAST_DAYS),
    );
    if (at < 0) at = 0;
    return [...base.slice(0, at), { kind: 'welcome' } as JourneyRow, ...base.slice(at)];
  }, [edge, total, expanded, ministryDays, showEntry]);

  const ctx: RowContext = {
    todayDay: running ? officialDay : null,
    openDays: openSet,
    ministryDays: ministrySet,
    todayHeight,
    welcomeHeight,
  };
  const declared = (row: JourneyRow) => journeyRowHeight(row, ctx, fontScale);
  /**
   * O que a lista declara: a medida real quando ela existe (a quebra de linha de
   * um rótulo em fonte enorme não é previsível), senão a conta de
   * `journeyRowHeight` — que é também o `minHeight` renderizado.
   */
  const lengths = rows.map((row) => measured[rowKey(row)] ?? declared(row));
  const offsets: number[] = [];
  // O cabeçalho (com as faixas e, depois da campanha, o E5) rola junto com a
  // lista: a altura medida dele entra no deslocamento de toda linha.
  lengths.reduce((acc, length, index) => {
    offsets[index] = acc;
    return acc + length;
  }, LIST_PAD_TOP + (headerHeight ?? 0));

  const todayIndex = rows.findIndex((row) => row.kind === 'day' && row.day === officialDay);
  const welcomeIndex = rows.findIndex((row) => row.kind === 'welcome');

  // Abertura (ver `openingOffset`): um pouco acima de hoje, com o painel inteiro.
  const opening = (viewport: number) =>
    openingOffset({ running, offsets, lengths, todayIndex, welcomeIndex, viewport });
  // Antes de medir a lista, vale a janela estimada (tela menos barra de abas e margens).
  // Só a PRIMEIRA conta vale: `initialScrollIndex` é da montagem, e mudá-lo depois
  // (quando a lista é medida) faria a lista virtual recalcular a janela à toa.
  const [initialIndex] = useState(() => openingIndex(offsets, opening(listHeight ?? windowHeight * 0.75)));

  // A abertura usa alturas estimadas; quando o painel, o cabeçalho e a própria
  // lista forem medidos, a lista corrige UMA vez para o deslocamento exato.
  const corrected = useRef(false);
  const exactOffset =
    todayHeight !== null && headerHeight !== null && listHeight !== null ? opening(listHeight) : null;
  useEffect(() => {
    if (corrected.current || exactOffset === null) return;
    corrected.current = true;
    const id = requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: exactOffset, animated: false }));
    return () => cancelAnimationFrame(id);
  }, [exactOffset]);

  // E5 · "Ver a jornada inteira": primeiro expande (sem reticências), depois rola
  // até o dia 1 — a rolagem espera a lista nova existir.
  const scrollToStart = useRef(false);
  useEffect(() => {
    if (!scrollToStart.current || !expanded) return;
    scrollToStart.current = false;
    const id = requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: 0, animated: !reduced }));
    return () => cancelAnimationFrame(id);
  }, [expanded, reduced]);
  const seeWholeJourney = () => {
    if (expanded) {
      listRef.current?.scrollToIndex({ index: 0, animated: !reduced });
      return;
    }
    scrollToStart.current = true;
    setExpanded(true);
  };

  // "Ir para hoje" dispensa a mensagem até amanhã e, com as linhas já sem ela,
  // leva ao painel de hoje (a mesma abertura de quem não tem dias em aberto).
  const goToday = useRef(false);
  const todayOpening = showEntry ? null : opening(listHeight ?? windowHeight * 0.75);
  useEffect(() => {
    if (!goToday.current || todayOpening === null) return;
    goToday.current = false;
    const id = requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: todayOpening, animated: !reduced }),
    );
    return () => cancelAnimationFrame(id);
  }, [todayOpening, reduced]);
  const dismissEntry = () => {
    goToday.current = true;
    dismissal.dismiss();
  };

  const remember = (key: string, expected: number) => (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (Math.abs(height - expected) < 0.5) return;
    setMeasuredState((current) => {
      const map = current.scale === fontScale ? current.map : EMPTY_MEASURES;
      return map[key] === height && current.scale === fontScale
        ? current
        : { scale: fontScale, map: { ...map, [key]: height } };
    });
  };

  /** Guarda uma altura medida só quando ela muda de fato (evita laço de re-render). */
  const settle =
    (setter: (update: (current: number | null) => number | null) => void) => (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      setter((current) => (current !== null && Math.abs(current - height) < 0.5 ? current : height));
    };

  // ------------------------------------------------------------ ações do dia
  const summary = readingSummary(journey.todayDay);
  const preferOwnBible = (settings.lastUsedReadingMode ?? settings.readingMode) === 'own_bible';

  /**
   * "Concluir leitura" — o único gesto que conclui o dia no painel (invariante P-09).
   * J5: gravado, leva à tela "Dia N concluído"; o marco (se houver) espera ela sair.
   */
  const complete = async () => {
    setBusy(true);
    setSaveFailed(false);
    holdMilestones();
    try {
      await setDayCompleted(campaign.id, officialDay, true);
      const reached = milestoneForDay(journey.completedCount + 1);
      haptic(reached ? 'success' : 'light');
      track({ name: 'reading_completed', dayNumber: officialDay, mode: preferOwnBible ? 'own_bible' : 'in_app' });
      if (reached) track({ name: 'milestone_reached', dayNumber: reached.day });
      if (returning && gap) track({ name: 'return_after_gap', gapDays: gap });
      router.push({ pathname: '/concluido/[day]', params: { day: String(officialDay) } });
    } catch {
      // PER-02: o store não mudou nada; a pessoa vê que não salvou e tenta de novo.
      releaseMilestones();
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    setSaveFailed(false);
    try {
      await setDayCompleted(campaign.id, officialDay, false);
      haptic('light');
    } catch {
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const openReader = async () => {
    // Preferência de conveniência: se a gravação falhar, o leitor abre do mesmo jeito.
    await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'in_app' })).catch(() => undefined);
    track({ name: 'reading_started', dayNumber: officialDay, mode: 'in_app' });
    router.push({ pathname: '/reader/[day]', params: { day: String(officialDay) } });
  };

  /** Escolher a própria Bíblia grava o modo e NÃO conclui o dia (invariante P-09, decisão D-1). */
  const readOwnBible = async () => {
    setSaveFailed(false);
    try {
      await updateSettings((s) => ({ ...s, lastUsedReadingMode: 'own_bible' }));
    } catch {
      // Aqui gravar o modo é o gesto inteiro: se não gravou, a pessoa precisa saber.
      setSaveFailed(true);
      return;
    }
    track({ name: 'reading_started', dayNumber: officialDay, mode: 'own_bible' });
  };

  const openDay = (day: number) => router.push({ pathname: '/dia/[day]', params: { day: String(day) } });

  // ----------------------------------------------------------------- linhas
  const stacked = isStacked(fontScale);
  const nodeOffset = cap ? todayNodeOffset(cap.y, cap.height) : undefined;

  const renderRow = ({ item }: { item: JourneyRow }) => {
    if (item.kind === 'welcome') {
      if (!entry) return null;
      return (
        <EntryMessageCard
          message={entry}
          onStart={() => openDay(entry.firstOpen)}
          onGoToday={dismissEntry}
          onLayout={settle(setWelcomeHeight)}
        />
      );
    }

    if (item.kind === 'gap' && isEarlierGap(item)) {
      const minHeight = declared(item);
      return (
        <EarlierDaysRow
          to={item.to}
          openCount={earlierOpen}
          minHeight={minHeight}
          onPress={() => setExpanded(true)}
          onLayout={remember(rowKey(item), minHeight)}
        />
      );
    }

    if (item.kind === 'gap') {
      const minHeight = declared(item);
      return (
        <GapRow
          from={item.from}
          to={item.to}
          rail={item.to < edge ? 'solid' : 'dotted'}
          minHeight={minHeight}
          onPress={() => setExpanded(true)}
          onLayout={remember(rowKey(item), minHeight)}
        />
      );
    }

    const day = item.day;
    const top: RailKind = day === 1 ? 'none' : day <= edge ? 'solid' : 'dotted';
    const bottom: RailKind = day === total ? 'none' : day < edge ? 'solid' : 'dotted';

    if (running && day === officialDay) {
      return (
        <TodayRow day={day} top={top} bottom={bottom} nodeOffset={nodeOffset} onLayout={settle(setTodayHeight)}>
          <TodayPanel
            day={day}
            total={total}
            dayData={journey.todayDay}
            summary={summary}
            done={doneToday}
            preferOwnBible={preferOwnBible}
            busy={busy}
            onRead={openReader}
            onOwnBible={readOwnBible}
            onComplete={complete}
            onUndo={undo}
            onOpenDay={() => openDay(day)}
            saveFailed={saveFailed}
            onCapLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              setCap((current) =>
                current && Math.abs(current.y - y) < 0.5 && Math.abs(current.height - height) < 0.5
                  ? current
                  : { y, height },
              );
            }}
          />
        </TodayRow>
      );
    }

    const state = journey.dayState(day);
    const kind = state === 'completed' ? 'done' : state === 'pending' ? 'open' : 'future';
    const unlocked = journey.isDayUnlocked(day);
    // Sem a chave J6 (config/features.ts), o dia futuro não revela nada do dia:
    // nem o monte (REGRAS 7). Com ela, o dia futuro abre como os outros e a linha
    // diz a data dele no lugar do "Em breve" (hoje continua o destaque).
    const hidden = kind === 'future' && !unlocked;
    const sphere = hidden ? null : (getDay(day)?.sphere ?? null);
    const futureDate = kind === 'future' ? formatDayDate(day, campaign) : null;
    const status =
      kind === 'done'
        ? 'Concluído'
        : kind === 'open'
          ? 'Em aberto'
          : unlocked && futureDate
            ? futureDate.slice(0, 5)
            : 'Em breve';
    const spokenStatus = kind === 'future' && unlocked && futureDate ? `Dia de ${futureDate}` : status;
    // A escala futura aparece por decisão consciente — ver o PROVISÓRIO de `MinistryNote`.
    const isMinistryDay = ministrySet.has(day);
    const minHeight = declared(item);
    const spoken = [
      sphere ? `Dia ${day}, ${SPHERE_LABEL[sphere]}.` : `Dia ${day}.`,
      `${spokenStatus}.`,
      isMinistryDay ? 'Seu ministério conduz o altar.' : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <DayRow
        day={day}
        kind={kind}
        label={sphere ? `Dia ${day} · ${SPHERE_LABEL[sphere]}` : `Dia ${day}`}
        status={status}
        top={top}
        bottom={bottom}
        minHeight={minHeight}
        stacked={stacked}
        ministry={isMinistryDay}
        accessibilityLabel={spoken}
        accessibilityHint={unlocked ? 'Abre o dia completo' : 'Este dia ainda não abriu'}
        onPress={() => (unlocked ? openDay(day) : setLockSheet({ day, open: true }))}
        onLayout={remember(rowKey(item), minHeight)}
      />
    );
  };

  return (
    <Screen>
      <FlatList
        ref={listRef}
        testID="journey-list"
        data={rows}
        keyExtractor={rowKey}
        renderItem={renderRow}
        extraData={[busy, doneToday, preferOwnBible, stacked, nodeOffset, earlierOpen, entry?.openCount, entry?.variant]}
        contentContainerStyle={{ paddingHorizontal: inset, paddingTop: LIST_PAD_TOP, paddingBottom: spacing.xxl }}
        getItemLayout={(_, index) => ({ length: lengths[index] ?? 0, offset: offsets[index] ?? 0, index })}
        onLayout={settle(setListHeight)}
        // Abertura a frio: um pouco acima de hoje (ou na mensagem de entrada).
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={({ index }) =>
          listRef.current?.scrollToOffset({ offset: offsets[index] ?? 0, animated: false })
        }
        initialNumToRender={14}
        windowSize={9}
        // CORREÇÃO TÉCNICA (REGRAS 26/27 — nenhuma tela sem rolagem): o cabeçalho, a
        // faixa C-07 e a faixa de rede ROLAM com a lista. Presos fora dela, em fonte
        // grande somavam mais que a tela e a lista (com o painel de hoje dentro)
        // ficava com altura zero.
        ListHeaderComponent={
          <View onLayout={settle(setHeaderHeight)} style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
            {/* F7/feedback de 2026-09-22: o contador de dias lidos do Você também
                no topo da Jornada, com o mesmo número (`completedCount`) e o
                mesmo rótulo falado. Nunca zera e nada cobra de quem faltou. */}
            <JourneyHeader readCount={journey.completedCount} />
            {/* Só o aviso de conteúdo FICTÍCIO (fixtures DEV) desenha aqui: a
                pendência de autorização da igreja NÃO aparece nesta aba — ela é
                uma linha só, em Ajustes (feedback do fundador, 2026-09-22). Ver
                `DevContentBanner`, que não desenha nada com `pending`. */}
            <DevContentBanner state={journey.contentState} compact />
            {/* F4 · a faixa depende da rede REAL do aparelho (expo-network), não do
                estado da nuvem: quem usa sem conta também a vê, e uma recusa do
                servidor com a rede no ar não vira "Sem internet".
                PROVISÓRIO (LACUNAS B17/B18/B34): a segunda frase do F4 ("A comunidade
                volta… fica na fila…") foi omitida de propósito — a fila de envio não
                existe, e a frase seria promessa falsa. */}
            {online ? null : <OfflineBanner />}
            {finished ? (
              <CampaignFinished
                total={total}
                readDays={completedDayNumbers(completions)}
                reflectionCount={reflectionCount(reflections)}
                onSeeJourney={seeWholeJourney}
              />
            ) : null}
          </View>
        }
        ListFooterComponent={
          expanded ? <Button title="Comprimir a linha" variant="underline" onPress={() => setExpanded(false)} /> : null
        }
      />

      <DailyVerseNotice
        visible={showNotice}
        day={officialDay}
        dayData={journey.todayDay}
        onClose={notice.dismiss}
      />

      {/* A4 · o dia futuro abre a folha do cadeado, sem revelar nada daquele dia.
          PROVISÓRIO (decisão do engenheiro, 2026-09-21: no RN 0.86 o filter
          grayscale/saturate só é aplicado no Android — o iOS aplica só brightness e
          drop-shadow): a "jornada dessaturada" atrás da folha não é feita; fica o
          véu do Sheet, igual nas duas plataformas. */}
      {lockSheet ? (
        <LockSheet
          visible={lockSheet.open}
          onClose={() => setLockSheet((current) => (current ? { ...current, open: false } : current))}
          dayNumber={lockSheet.day}
          dateLabel={formatDayDate(lockSheet.day, campaign)}
        />
      ) : null}
    </Screen>
  );
}
