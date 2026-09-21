import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { track } from '@/analytics/analytics';
import { expandChapters, parseReference } from '@/bible/references';
import { getDay } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { getBibleProvider, type Passage } from '@/reader/provider';
import { normalizeReaderFontSize, readLineHeight, stepReaderFontSize } from '@/reader/readerFontSize';
import { loadReaderPosition, saveReaderPosition } from '@/reader/readerPosition';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { goBackOrHome } from '@/ui/BackBar';
import { LockedDayScreen } from '@/ui/LockSheet';
import { AppText, Button, Cap, DevContentBanner, Screen, StateView, useFace } from '@/ui/components';
import { ErrorState } from '@/ui/entrada/States';
import { ReaderFooter, type ReaderPrimary } from '@/ui/leitor/ReaderFooter';
import { ReaderTopBar } from '@/ui/leitor/ReaderTopBar';
import { TextSizeSheet } from '@/ui/leitor/TextSizeSheet';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, faces, spacing, useTheme } from '@/ui/theme';

/** Calha do corpo do leitor (TELAS B1). */
const READER_GUTTER = 26;

/**
 * B1 · Leitor. Um capítulo por página. Rota contextual, nunca uma aba.
 *
 * O texto fica sempre em superfície OPACA; vidro só na barra de topo, que o
 * texto atravessa ao rolar.
 *
 * Enquanto não houver tradução licenciada (Gate 1), o corpo é: cap do livro,
 * numeral do capítulo e a caixa "TEXTO AINDA NÃO LIBERADO". CORREÇÃO TÉCNICA:
 * a "estrutura de versículos" do desenho (numeral + barra listrada por versículo)
 * NÃO é desenhada — o app não tem a contagem de versículos por capítulo, e
 * numerar versículos de um capítulo real seria inventar estrutura (REGRAS 1.5;
 * LACUNAS B1). Quando um provedor licenciado entrar, o texto dele aparece no
 * mesmo lugar, com os números que ELE fornecer e a atribuição no fim.
 */
export default function ReaderScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const dayNumber = Number(day);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const face = useFace();
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

  const dayData = getDay(dayNumber);
  const unlocked = journey.isDayUnlocked(dayNumber);
  const provider = getBibleProvider();
  const metadata = provider.getMetadata();

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
  // seria uma requisição de conteúdo de um dia que ainda não abriu.
  useEffect(() => {
    if (!reference || !unlocked) return;
    let alive = true;
    provider.getPassage(reference).then(
      (loaded) => alive && setResult({ key: chapterKey, passage: loaded }),
      (err: unknown) =>
        alive && setResult({ key: chapterKey, error: err instanceof Error ? err : new Error(String(err)) }),
    );
    if (positionReady) {
      // Gravação de conveniência: se o disco falhar, a leitura segue igual.
      saveReaderPosition({ dayNumber, readingIndex: 0, chapterIndex }).catch(() => {});
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    return () => {
      alive = false;
    };
  }, [reference, chapterKey, dayNumber, chapterIndex, provider, unlocked, positionReady]);

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
  const hasLicensedText = !metadata.isDevPlaceholder;
  const chapterLabel = `${current.bookName} ${current.chapter}`;

  const completeDay = async () => {
    setBusy(true);
    setSaveFailed(false);
    try {
      await setDayCompleted(journey.campaign.id, dayNumber, true);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      track({ name: 'reading_completed', dayNumber, mode: 'in_app' });
      // PROVISÓRIO (perguntas 4 e 8 ao designer): o B4 ("depois de concluir")
      // ainda não existe, nem a ordem dele com o marco; mantém fechar o leitor.
      goBackOrHome();
    } catch {
      // PER-02: não gravou, nada mudou; fica no leitor com o aviso.
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // D-1 / invariante P-09: "Prefiro ler na minha Bíblia" NUNCA conclui o dia.
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
    onPress: () => setChapterIndex((i) => Math.min(chapters.length - 1, i + 1)),
    testID: 'reader-next',
  };
  // R1-7: com o dia concluído a releitura continua capítulo a capítulo, e
  // "Voltar" só aparece no último. PROVISÓRIO (decisão do engenheiro,
  // 2026-09-21: o TELAS diz "ou 'Voltar' se o dia já está concluído" sem dizer
  // em qual capítulo; "Voltar" em todos prendia a releitura no capítulo 1).
  const primary: ReaderPrimary = !isLastChapter
    ? nextChapter
    : done
      ? { title: 'Voltar', onPress: goBackOrHome, testID: 'reader-complete' }
      : { title: 'Concluir leitura', icon: 'check', onPress: completeDay, loading: busy, testID: 'reader-complete' };

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: READER_GUTTER,
          paddingTop: (barHeight || insets.top + MIN_TOUCH + 3) + spacing.xl,
          paddingBottom: (footerHeight || insets.bottom + 180) + spacing.lg,
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

        {hasLicensedText ? (
          error ? (
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
              {passage.verses.map((verse) => (
                // Sem `maxFontSizeMultiplier`: o texto cresce com a fonte do
                // sistema sem teto, que é o que a folha B3 promete.
                <Text
                  key={verse.verse}
                  accessibilityLabel={`Versículo ${verse.verse}. ${verse.text}`}
                  style={{
                    fontFamily: face(faces.ss400),
                    fontSize,
                    lineHeight: readLineHeight(fontSize),
                    color: colors.text,
                  }}
                >
                  <Text style={{ fontSize: Math.round((12 * fontSize) / 19), color: colors.textMuted }}>
                    {verse.verse}{' '}
                  </Text>
                  {verse.text}
                </Text>
              ))}
              {/* PROVISÓRIO (LACUNAS C29): atribuição exigida pela licença, no
                  fim do capítulo e acima do rodapé medido. */}
              <AppText variant="caption" style={{ marginTop: spacing.lg }} testID="reader-attribution">
                {metadata.copyrightNotice}
              </AppText>
            </>
          )
        ) : (
          <NotReleasedNotice chapterLabel={chapterLabel} />
        )}
      </ScrollView>

      <ReaderTopBar
        topInset={insets.top}
        title={chapterLabel}
        dayNumber={dayNumber}
        chapterIndex={chapterIndex}
        chapterCount={chapters.length}
        done={done}
        onClose={goBackOrHome}
        onTextSize={() => setSizeSheet(true)}
        onHeight={setBarHeight}
      />

      <ReaderFooter
        primary={primary}
        isFirstChapter={chapterIndex === 0}
        onPrevious={() => setChapterIndex((i) => Math.max(0, i - 1))}
        ownBible={done ? undefined : readOwnBible}
        bottomPadding={Math.max(40, insets.bottom)}
        onHeight={setFooterHeight}
        saveFailed={saveFailed}
      />

      <TextSizeSheet
        visible={sizeSheet}
        onClose={() => setSizeSheet(false)}
        size={fontSize}
        onStep={stepFont}
      />
    </Screen>
  );
}

/**
 * Caixa "TEXTO AINDA NÃO LIBERADO" (B1): borda 1,5px `border`, raio 16, fundo
 * `surfaceWarm`; rótulo Schibsted 700 11/14 em `warning` (5,4:1 sobre o quente).
 */
function NotReleasedNotice({ chapterLabel }: { chapterLabel: string }) {
  const { colors } = useTheme();
  return (
    <View
      testID="reader-not-released"
      style={{
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.surfaceWarm,
        padding: spacing.lg,
        gap: spacing.xs,
        minHeight: MIN_TOUCH,
      }}
    >
      <AppText variant="cap" accessibilityRole="header" style={{ fontFamily: faces.sg700, color: colors.warning }}>
        Texto ainda não liberado
      </AppText>
      {/* PROVISÓRIO (pergunta 2 ao designer): "volte para marcar" ainda não diz
          onde. Pela D-1 o dia se marca em "Concluir leitura", no último capítulo
          daqui ou no painel de hoje da Jornada — nunca em "Prefiro ler na minha
          Bíblia". */}
      <AppText variant="bodySm">
        {`Nenhuma tradução bíblica é exibida enquanto a licença não estiver resolvida. Abra na sua Bíblia em ${chapterLabel} e volte para marcar.`}
      </AppText>
    </View>
  );
}
