import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { expandChapters, parseReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { useOuvirCapitulo, type Leitura } from '@/reader/audio/useOuvirCapitulo';
import { getBibleProvider, type Passage } from '@/reader/provider';
import { normalizeReaderFontSize, stepReaderFontSize } from '@/reader/readerFontSize';
import { loadReaderPosition, saveReaderPosition } from '@/reader/readerPosition';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { goBackOrHome } from '@/ui/BackBar';
import { LockedDayScreen } from '@/ui/LockSheet';
import { ChapterText } from '@/ui/biblia/ChapterText';
import { MiniPlayer } from '@/ui/biblia/MiniPlayer';
import { AppText, Button, Cap, DevContentBanner, Screen, StateView } from '@/ui/components';
import { ErrorState } from '@/ui/entrada/States';
import { OwnBiblePlan } from '@/ui/leitor/OwnBiblePlan';
import { ReaderFooter, type ReaderPrimary } from '@/ui/leitor/ReaderFooter';
import { ReaderGuide } from '@/ui/leitor/ReaderGuide';
import { ReaderTopBar } from '@/ui/leitor/ReaderTopBar';
import { TextSizeSheet } from '@/ui/leitor/TextSizeSheet';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, spacing } from '@/ui/theme';

/** Calha do corpo do leitor (TELAS B1). */
const READER_GUTTER = 26;

/**
 * B1 · Leitor. Um capítulo por página. Rota contextual, nunca uma aba.
 *
 * O texto fica sempre em superfície OPACA; vidro só na barra de topo, que o
 * texto atravessa ao rolar.
 *
 * Dois modos, escolhidos pelo provedor:
 * - GUIA (provedor sem texto licenciado — Gate 1 aberto): para cada capítulo, a
 *   referência grande, "Leia este capítulo na sua Bíblia." e a posição
 *   ("Capítulo 1 de 12"); o rodapé anda até "Concluir leitura". Nada é pedido
 *   ao provedor, não há "Aa" (sem texto, o tamanho não muda nada) nem "Prefiro
 *   ler na minha Bíblia" (o guia JÁ é a leitura na própria Bíblia). Decisão do
 *   engenheiro, delegada pelo fundador em 2026-09-21: a caixa "Texto ainda não
 *   liberado" era lida como tela por terminar (Apple 2.1).
 * - TEXTO (provedor licenciado): cap do livro, numeral do capítulo, o texto com
 *   os números de versículo que o PROVEDOR fornecer e a atribuição no fim. O app
 *   nunca inventa estrutura de versículos (REGRAS 1.5; LACUNAS B1).
 *
 * Acima dos dois está o MODO DE LEITURA da pessoa (feedback do fundador,
 * 2026-09-22): quem escolheu "Vou ler na minha Bíblia" abre a tela enxuta do
 * `OwnBiblePlan` — referência do dia, capítulos e "Concluir leitura" —, sem
 * texto e sem passar capítulo por capítulo. "Ler aqui no app" troca para o
 * leitor com texto e guarda a preferência, como o "Ler agora" da Jornada.
 */
export default function ReaderScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const journey = useJourney();
  const scrollRef = useRef<ScrollView>(null);

  const [chapterIndex, setChapterIndex] = useState(0);
  /**
   * PER-04: a posição salva é LIDA antes de qualquer gravação. Enquanto ela não
   * voltou do disco, nada é gravado — senão o capítulo 1 do primeiro quadro
   * apagaria a posição que se queria restaurar.
   */
  const [positionReady, setPositionReady] = useState(false);
  /** Último capítulo anunciado ao leitor de tela (só trocas, não a abertura). */
  const announcedRef = useRef<number | null>(null);
  /** Resultado chaveado pelo capítulo: evita setState síncrono dentro do efeito. */
  const [result, setResult] = useState<{ key: string; passage?: Passage; error?: Error } | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [sizeSheet, setSizeSheet] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  /**
   * Alturas reais da barra de topo e do rodapé. Os dois são absolutos sobre o
   * texto e crescem com a fonte do sistema; a rolagem reserva o que eles
   * MEDEM, nunca uma constante — reservar fixo em fonte grande esconderia o
   * começo ou o fim do capítulo atrás deles.
   */
  const [barHeight, setBarHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  /** Altura do mini-player, que fica EM CIMA do rodapé. Medida pelo mesmo motivo. */
  const [playerHeight, setPlayerHeight] = useState(0);

  const dayData = getDay(dayNumber);
  const unlocked = journey.isDayUnlocked(dayNumber);
  const provider = getBibleProvider();
  const metadata = provider.getMetadata();
  /** Sem texto licenciado o leitor é o guia (ver o topo). */
  const hasLicensedText = !metadata.isDevPlaceholder;
  /**
   * Modo de leitura da pessoa. Enquanto as preferências não voltaram do disco
   * (`settings === null`) o modo é desconhecido e a tela espera: abrir o texto
   * para só depois trocar pela tela enxuta seria um pisca-pisca no lugar de uma
   * decisão. A regra é a MESMA do painel de hoje (`preferOwnBible` da Jornada):
   * só `own_bible` é a própria Bíblia; `both` continua no leitor do app.
   */
  const [readInApp, setReadInApp] = useState(false);
  const readingMode = settings ? (settings.lastUsedReadingMode ?? settings.readingMode) : null;
  const ownBibleMode = !readInApp && readingMode === 'own_bible';

  const chapters = useMemo(() => {
    if (!dayData) return [];
    return dayData.readings.flatMap((reading) =>
      expandChapters(reading.canonical_reference).map((chapter) => ({
        ...chapter,
        source: reading.canonical_reference,
      })),
    );
  }, [dayData]);

  const current = chapters[chapterIndex];
  const chapterKey = current ? `${current.book}-${current.chapter}#${reloadTick}` : '';
  const reference = useMemo(
    () => (current ? parseReference(`${current.book} ${current.chapter}`) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chapterKey],
  );

  // Dia trancado: nada é pedido ao provedor. Com uma tradução licenciada, isso
  // seria uma requisição de conteúdo de um dia que ainda não abriu. No guia
  // também não: o provedor sem licença não tem texto para dar.
  // Os três efeitos abaixo são separados de propósito: a posição voltar do
  // disco (positionReady) não pode pedir o capítulo de novo nem jogar a
  // rolagem para o topo de quem já começou a ler um capítulo longo (Salmo 119).
  // Na tela enxuta nada é pedido ao provedor: quem lê na própria Bíblia não abriu
  // texto nenhum, e buscar a passagem seria trabalho (e, com provedor online,
  // requisição) por conta de uma leitura que não vai acontecer aqui.
  useEffect(() => {
    if (!reference || !unlocked || !hasLicensedText || ownBibleMode) return;
    let alive = true;
    provider.getPassage(reference).then(
      (loaded) => alive && setResult({ key: chapterKey, passage: loaded }),
      (err: unknown) =>
        alive && setResult({ key: chapterKey, error: err instanceof Error ? err : new Error(String(err)) }),
    );
    return () => {
      alive = false;
    };
  }, [reference, chapterKey, provider, hasLicensedText, unlocked, ownBibleMode]);

  useEffect(() => {
    if (!positionReady || !unlocked || chapters.length === 0) return;
    // Gravação de conveniência: se o disco falhar, a leitura segue igual.
    saveReaderPosition({ dayNumber, readingIndex: 0, chapterIndex }).catch(() => {});
  }, [positionReady, unlocked, chapters.length, dayNumber, chapterIndex]);

  // Capítulo novo começa do topo; o mesmo capítulo nunca é rolado de volta.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [chapterIndex]);

  const completionsReady = journey.completions != null;
  const dayDone = isDayCompleted(journey.completions, dayNumber);
  const chapterCount = chapters.length;

  // PER-04 (spec §7, "restaurar posição"): reabrir o mesmo dia volta ao capítulo
  // em que a pessoa estava. PROVISÓRIO (decisão do engenheiro, 2026-09-21: a
  // retomada ainda está em aberto na LACUNAS P17, e o app gravava a posição sem
  // nunca lê-la. Dia já concluído abre no capítulo 1: reabrir um dia lido é
  // releitura, e voltar ao último capítulo prenderia a pessoa no fim).
  useEffect(() => {
    if (positionReady || !unlocked || chapterCount === 0 || !completionsReady) return;
    let alive = true;
    loadReaderPosition().then((saved) => {
      if (!alive) return;
      if (
        saved &&
        saved.dayNumber === dayNumber &&
        !dayDone &&
        saved.chapterIndex > 0 &&
        saved.chapterIndex < chapterCount
      ) {
        // Se a pessoa já andou antes do disco responder, o toque dela vence.
        setChapterIndex((i) => {
          if (i !== 0) return i;
          announcedRef.current = saved.chapterIndex;
          return saved.chapterIndex;
        });
      }
      setPositionReady(true);
    });
    return () => {
      alive = false;
    };
  }, [positionReady, unlocked, chapterCount, completionsReady, dayNumber, dayDone]);

  // R1-10: a troca de capítulo é anunciada ao leitor de tela. A abertura não —
  // o título da barra já é lido ao entrar.
  useEffect(() => {
    if (!positionReady) return;
    if (announcedRef.current === null) {
      announcedRef.current = chapterIndex;
      return;
    }
    if (announcedRef.current === chapterIndex) return;
    announcedRef.current = chapterIndex;
    const chapter = chapters[chapterIndex];
    if (chapter) {
      AccessibilityInfo.announceForAccessibility(
        `${chapter.bookName} ${chapter.chapter}, capítulo ${chapterIndex + 1} de ${chapterCount}`,
      );
    }
  }, [chapterIndex, chapterCount, chapters, positionReady]);

  const fresh = result?.key === chapterKey ? result : null;
  const passage = fresh?.passage ?? null;
  const error = fresh?.error ?? (current && !reference ? new Error('Referência inválida.') : null);

  /* -------------------------------------------- ouvir o capítulo (o MESMO motor)
   *
   * É literalmente o mesmo `useOuvirCapitulo` da aba Bíblia — mesma escolha de
   * voz local masculina, mesmo agrupamento, mesma pausa, mesma velocidade
   * gravada nas preferências. Não existe um segundo sistema de áudio no app, e
   * é isto que garante que as duas telas soem igual.
   *
   * O QUE ENTRA NA FALA: só `passage.verses`, o texto bíblico que já está na
   * tela. Nunca a reflexão do dia, a oração, o jejum, a anotação ou o nome de
   * quem quer que seja.
   *
   * Os hooks ficam ACIMA de todos os `return` adiantados desta tela (dia
   * trancado, dia sem leitura, preferências ainda no disco): a ordem dos hooks
   * não pode depender de nada disso.
   */
  const versiculosFalados = useMemo(() => passage?.verses.map((v) => v.text) ?? [], [passage]);

  /*
   * A CONTINUAÇÃO ENTRE OS CAPÍTULOS DO DIA.
   *
   * Quem avisa que o capítulo terminou é a callback de uma fala já em curso: ela
   * não enxerga o render atual. Daí os espelhos — sem eles, o dia 1 terminaria
   * Gênesis 1 e tentaria avançar a partir de um índice velho.
   */
  const indiceRef = useRef(chapterIndex);
  const totalRef = useRef(chapters.length);
  const leituraRef = useRef<Leitura | null>(null);

  const aoTerminarCapitulo = useCallback(() => {
    const proximo = indiceRef.current + 1;
    // Último capítulo do dia: a leitura acaba aqui. Concluir o dia continua
    // sendo um gesto da pessoa — o áudio nunca marca nada como lido.
    if (proximo >= totalRef.current) return;
    leituraRef.current?.tocarAoTrocarDeTexto();
    setChapterIndex(proximo);
  }, []);

  const leitura = useOuvirCapitulo(versiculosFalados, chapterKey, aoTerminarCapitulo);

  useEffect(() => {
    indiceRef.current = chapterIndex;
    totalRef.current = chapters.length;
    leituraRef.current = leitura;
  });

  /**
   * Trocar de capítulo pelo ⏮/⏭ OU pelo rodapé. Se a voz estava tocando, ela
   * segue no capítulo novo; se estava calada, continua calada. Um caminho só,
   * para os dois controles não discordarem.
   */
  const irParaCapitulo = useCallback(
    (destino: number) => {
      if (destino < 0 || destino >= totalRef.current || destino === indiceRef.current) return;
      if (leituraRef.current?.estado === 'tocando') leituraRef.current.tocarAoTrocarDeTexto();
      setChapterIndex(destino);
    },
    [],
  );

  // PER-02: se o disco recusar, o store não muda e o texto fica no tamanho salvo.
  const stepFont = (direction: 1 | -1) =>
    updateSettings((s) => ({ ...s, readerFontSize: stepReaderFontSize(s.readerFontSize, direction) })).catch(() => undefined);

  // A leitura de cada dia abre no dia oficial da igreja. Vale para toque na
  // Jornada e para link direto: senão a regra seria só um botão escondido. É a
  // composição única do A4 (fundação), sem nada daquele dia.
  if (Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= journey.campaign.total_days && !unlocked) {
    return <LockedDayScreen dayNumber={dayNumber} dateLabel={formatDayDate(dayNumber, journey.campaign)} />;
  }

  if (!Number.isInteger(dayNumber) || !dayData || chapters.length === 0) {
    return (
      <Screen>
        <StateView
          kind="empty"
          icon="alert"
          title="Leitura não encontrada"
          message="Este dia não tem leituras definidas."
          action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
        />
      </Screen>
    );
  }

  const done = dayDone;
  const fontSize = normalizeReaderFontSize(settings?.readerFontSize);
  const isLastChapter = chapterIndex >= chapters.length - 1;
  const chapterLabel = `${current.bookName} ${current.chapter}`;

  /**
   * O player só existe quando há o que falar: texto licenciado na tela E uma voz
   * masculina local neste aparelho. Sem qualquer uma das duas coisas, `ouvir` é
   * null e a tela fica exatamente como sempre foi — nenhum controle morto.
   */
  const ouvir: Leitura | null =
    hasLicensedText && passage && leitura.estado !== 'indisponivel' && leitura.estado !== 'carregando'
      ? leitura
      : null;

  const completeDay = async () => {
    setBusy(true);
    setSaveFailed(false);
    try {
      await setDayCompleted(journey.campaign.id, dayNumber, true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      track({ name: 'reading_completed', dayNumber, mode: ownBibleMode ? 'own_bible' : 'in_app' });
      // Feedback de 2026-09-22: concluir leva à tela de conclusão do dia (com
      // confete). Com a Comunidade ligada, o "Continuar" de lá segue para o B4.
      // `replace`: voltar de lá não reabre o leitor já concluído.
      router.replace(`/concluido/${dayNumber}` as Href);
    } catch {
      // PER-02: não gravou, nada mudou; fica no leitor com o aviso.
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // D-1 / invariante P-09: "Prefiro ler na minha Bíblia" NUNCA conclui o dia.
  // Só existe no modo TEXTO: no guia a leitura já é na Bíblia da pessoa.
  // Grava o modo e volta; a conclusão é sempre o gesto explícito "Concluir
  // leitura" (no último capítulo daqui ou no painel de hoje da Jornada).
  // PROVISÓRIO (pergunta 2 ao designer).
  const readOwnBible = () => {
    // Preferência de conveniência: se a gravação falhar, a pessoa volta do mesmo jeito.
    updateSettings((s) => ({ ...s, lastUsedReadingMode: 'own_bible' })).catch(() => {});
    goBackOrHome();
  };

  const nextChapter: ReaderPrimary = {
    title: 'Próximo capítulo',
    icon: 'chevron-right',
    onPress: () => irParaCapitulo(chapterIndex + 1),
    testID: 'reader-next',
  };
  // R1-7: com o dia concluído a releitura continua capítulo a capítulo, e
  // "Voltar" só aparece no último. PROVISÓRIO (decisão do engenheiro,
  // 2026-09-21: o TELAS diz "ou 'Voltar' se o dia já está concluído" sem dizer
  // em qual capítulo; "Voltar" em todos prendia a releitura no capítulo 1).
  // J6: com os dias futuros abertos, ler adiantado não conclui (progresso e
  // marcos só contam o dia que já chegou). No último capítulo fica "Voltar" e
  // a frase diz a partir de quando o dia pode ser concluído, como no A3.
  const completable = journey.isDayCompletable(dayNumber);

  // ---------------------------------------------- tela enxuta da própria Bíblia
  // Enquanto as preferências não voltaram do disco, o modo é desconhecido: a
  // tela espera em vez de abrir o texto e trocar no quadro seguinte.
  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  if (ownBibleMode) {
    const summary = readingSummary(dayData);
    /** "Ler aqui no app" grava a preferência, como o "Ler agora" da Jornada. */
    const readHere = () => {
      setReadInApp(true);
      track({ name: 'reading_started', dayNumber, mode: 'in_app' });
      // Preferência de conveniência: se a gravação falhar, o texto abre do mesmo jeito.
      updateSettings((s) => ({ ...s, lastUsedReadingMode: 'in_app' })).catch(() => {});
    };
    return (
      <Screen edges={['left', 'right']}>
        <ScrollView
          testID="reader-scroll"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            paddingHorizontal: READER_GUTTER,
            paddingTop: (barHeight || insets.top + MIN_TOUCH + 3) + spacing.xl,
            paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl,
            gap: spacing.lg,
            width: '100%',
            maxWidth: MAX_CONTENT_WIDTH + READER_GUTTER * 2,
            alignSelf: 'center',
          }}
        >
          <DevContentBanner state={journey.contentState} compact />
          <OwnBiblePlan
            reference={summary?.label ?? chapterLabel}
            detail={summary?.detail ?? null}
            chapters={chapters.map((chapter) => `${chapter.bookName} ${chapter.chapter}`)}
            done={done}
            completable={completable}
            busy={busy}
            saveFailed={saveFailed}
            futureNote={
              !done && !completable
                ? `Você poderá concluir este dia a partir de ${formatDayDate(dayNumber, journey.campaign)}.`
                : undefined
            }
            onComplete={completeDay}
            onBack={goBackOrHome}
            onReadInApp={hasLicensedText ? readHere : undefined}
          />
        </ScrollView>

        <ReaderTopBar
          topInset={insets.top}
          title={`Dia ${dayNumber}`}
          // Sem capítulo aberto não há posição a dizer, nem tamanho de texto a mudar.
          showPosition={false}
          dayNumber={dayNumber}
          chapterIndex={0}
          chapterCount={chapters.length}
          done={done}
          onClose={goBackOrHome}
          onHeight={setBarHeight}
        />
      </Screen>
    );
  }

  const futureNote =
    isLastChapter && !done && !completable
      ? `Você poderá concluir este dia a partir de ${formatDayDate(dayNumber, journey.campaign)}.`
      : undefined;
  const primary: ReaderPrimary = !isLastChapter
    ? nextChapter
    : done || !completable
      ? { title: 'Voltar', onPress: goBackOrHome, testID: 'reader-complete' }
      : { title: 'Concluir leitura', icon: 'check', onPress: completeDay, loading: busy, testID: 'reader-complete' };

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        testID="reader-scroll"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: READER_GUTTER,
          paddingTop: (barHeight || insets.top + MIN_TOUCH + 3) + spacing.xl,
          // O player fica ACIMA do rodapé: o fim do capítulo precisa passar dos dois.
          paddingBottom: (footerHeight || insets.bottom + 180) + playerHeight + spacing.lg,
          gap: spacing.lg,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH + READER_GUTTER * 2,
          alignSelf: 'center',
        }}
      >
        {/* PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo (C-07). A escala
            de capítulos do dia é material da igreja; enquanto ela não autorizar,
            a faixa compacta fica logo abaixo do cabeçalho. */}
        <DevContentBanner state={journey.contentState} compact />

        {hasLicensedText ? (
          <>
            {/* ------------------------------------------------ cabeça do capítulo */}
            <View style={{ gap: spacing.xs }}>
              {/* Só o numeral é cabeçalho: a cap do livro não repete o anúncio (R1-10). */}
              <Cap accessibilityRole="text">{current.bookName}</Cap>
              <AppText
                variant="chapterNumeral"
                accessibilityRole="header"
                accessibilityLabel={`Capítulo ${current.chapter}`}
                testID="reader-chapter-numeral"
              >
                {current.chapter}
              </AppText>
            </View>

            {error ? (
              // F5: o molde único de erro (círculo 56 com "!", cópia humana, nenhum
              // texto técnico). PROVISÓRIO (LACUNAS C45): "nada foi perdido" é a cópia
              // literal do F5 e ainda não é verificável pelo app.
              // R1-11: a mensagem padrão fala da "leitura de hoje", e o leitor abre
              // dias passados; aqui ela vai sem "hoje" (invariante §5.1).
              // PROVISÓRIO (LACUNAS C31). O link da própria Bíblia NÃO conclui o
              // dia: grava o modo e volta (D-1; pergunta 2 ao designer).
              <ErrorState
                message="Este capítulo não carregou. Sua jornada e as suas reflexões estão salvas — nada foi perdido."
                onRetry={() => setReloadTick((t) => t + 1)}
                // O rodapé do leitor já tem o primário ("Próximo capítulo" /
                // "Concluir leitura"): aqui o "Tentar de novo" vai contornado (R1-12).
                retryVariant="outline"
                secondary={
                  done
                    ? undefined
                    : { label: 'Ler na minha Bíblia', onPress: readOwnBible, testID: 'reader-error-own-bible' }
                }
                testID="reader-error"
              />
            ) : !passage ? (
              <StateView kind="loading" />
            ) : (
              <>
                {/* Mesma composição da aba Bíblia (ChapterText), com o título de
                    salmo (Passage.heading) antes do versículo 1. */}
                <ChapterText
                  verses={passage.verses}
                  heading={passage.heading}
                  fontSize={fontSize}
                  book={current.book}
                  chapter={current.chapter}
                />
                {/* PROVISÓRIO (LACUNAS C29): atribuição exigida pela licença, no
                    fim do capítulo e acima do rodapé medido. */}
                <AppText variant="caption" style={{ marginTop: spacing.lg }} testID="reader-attribution">
                  {metadata.copyrightNotice}
                </AppText>
              </>
            )}
          </>
        ) : (
          // ------------------------------------------------ guia (sem texto)
          <ReaderGuide reference={chapterLabel} position={chapterIndex + 1} count={chapters.length} />
        )}
      </ScrollView>

      <ReaderTopBar
        topInset={insets.top}
        // No guia a referência e a posição estão no corpo: a barra diz só o dia.
        title={hasLicensedText ? chapterLabel : `Dia ${dayNumber}`}
        showPosition={hasLicensedText}
        dayNumber={dayNumber}
        chapterIndex={chapterIndex}
        chapterCount={chapters.length}
        done={done}
        onClose={goBackOrHome}
        onTextSize={hasLicensedText ? () => setSizeSheet(true) : undefined}
        onHeight={setBarHeight}
      />

      {/*
        AQUI O PLAYER EMPILHA, e na aba Bíblia ele SUBSTITUI o rodapé. A diferença
        não é de desenho, é do que cada rodapé faz: o da aba Bíblia só anda entre
        capítulos — exatamente o que ⏮ e ⏭ fazem, então duas barras seriam dois
        jeitos da mesma coisa. Este rodapé tem "Concluir leitura" e "Prefiro ler
        na minha Bíblia", que o player não sabe fazer e que a pessoa não pode
        perder por ter ligado o áudio.
      */}
      {ouvir ? (
        <View
          onLayout={(e) => setPlayerHeight(Math.round(e.nativeEvent.layout.height))}
          style={{ position: 'absolute', left: 0, right: 0, bottom: footerHeight }}
        >
          <MiniPlayer
            // Zero: quem encosta na borda do aparelho é o rodapé, logo abaixo.
            recuoInferior={0}
            capitulo={chapterLabel}
            tocando={ouvir.estado === 'tocando'}
            velocidade={ouvir.velocidade}
            onVelocidade={ouvir.escolherVelocidade}
            onTocarOuPausar={() => {
              if (ouvir.estado === 'tocando') ouvir.pausar();
              else if (ouvir.estado === 'pausado') ouvir.continuar();
              else ouvir.tocar();
            }}
            onAnterior={() => irParaCapitulo(chapterIndex - 1)}
            onProximo={() => irParaCapitulo(chapterIndex + 1)}
            temAnterior={chapterIndex > 0}
            temProximo={!isLastChapter}
          />
        </View>
      ) : null}

      <ReaderFooter
        primary={primary}
        isFirstChapter={chapterIndex === 0}
        onPrevious={() => irParaCapitulo(chapterIndex - 1)}
        ownBible={done || !hasLicensedText ? undefined : readOwnBible}
        bottomPadding={Math.max(40, insets.bottom)}
        onHeight={setFooterHeight}
        saveFailed={saveFailed}
        note={futureNote}
      />

      {hasLicensedText ? (
        <TextSizeSheet
          visible={sizeSheet}
          onClose={() => setSizeSheet(false)}
          size={fontSize}
          onStep={stepFont}
        />
      ) : null}
    </Screen>
  );
}

