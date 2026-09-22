import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import BibleTab from '@/app/(tabs)/biblia';
import JourneyHome from '@/app/(tabs)/index';
import DayScreen from '@/app/dia/[day]';
import ReaderScreen from '@/app/reader/[day]';
import { expandChapters, formatReference, type CanonicalReference } from '@/bible/references';
import { getCampaign, getDay, resetToBundledContent } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import {
  _resetCompletionsCacheForTests,
  isDayCompleted,
  loadCompletions,
  setDayCompleted,
} from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider, type Passage } from '@/reader/provider';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { readCounterLabel } from '@/ui/jornada/JourneyHeader';
import { _resetEntryDismissalForTests } from '@/ui/jornada/entryDismissal';
import { _resetDailyNoticeForTests } from '@/ui/jornada/dailyNotice';
import { ProfileHeader } from '@/ui/voce/ProfileHeader';

import { AX5, resetViewport, setViewport } from './support/viewport';

/**
 * Feedback do fundador em 2026-09-22, testando a prévia do Dia 3.
 *
 * 1. MODO DE LEITURA — quem escolheu "Vou ler na minha Bíblia" não quer o app
 *    passando capítulo por capítulo: quer a referência do dia, a lista dos
 *    capítulos e onde dizer que leu. Quem escolheu "Ler aqui no app" continua
 *    com o leitor de texto, como hoje.
 * 2. CONTADOR DE DIAS LIDOS — a chama do Você também no topo da Jornada, com o
 *    mesmo número e o mesmo rótulo falado. Nunca zera.
 * 3. O PLANO TROCA TODO DIA — nos dias simulados 1, 2 e 3 a referência, a ênfase
 *    e o versículo do dia são os DAQUELE dia no dataset da igreja, e o painel de
 *    hoje e a aba Bíblia dizem a mesma coisa.
 *
 * Os dias aqui são simulados pelo dia do painel DEV (`settings.dev.dayOverride`,
 * o mesmo caminho da demonstração), sobre o dataset REAL embarcado — nada é
 * inventado nem editado: o teste só lê `content/100-dias-2026/dataset.json`.
 */

let mockDay = '3';
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => ({ day: mockDay }),
    useSegments: () => [],
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
};

/**
 * Provedor licenciado de TESTE (nenhuma tradução real): o que importa aqui é
 * `isDevPlaceholder: false`, que é o que faz o leitor ter texto para mostrar.
 */
const licensed: BibleTextProvider = {
  getMetadata: () => ({
    id: 'teste',
    name: 'Tradução de teste',
    abbreviation: 'TST',
    language: 'pt-BR',
    copyrightNotice: 'Atribuição de teste (CC BY).',
    attributionRequired: true,
    cachePolicy: 'bundled',
    offlineAvailable: true,
    isDevPlaceholder: false,
  }),
  getPassage: async (reference: CanonicalReference): Promise<Passage> => ({
    reference: `${reference.book} ${reference.chapterStart}`,
    book: reference.book,
    bookName: reference.book,
    chapter: reference.chapterStart,
    verses: [{ verse: 1, text: 'Texto de teste do primeiro versículo.' }],
  }),
};

type SettingsSeed = Record<string, unknown>;

/** Grava preferências e zera os caches locais; o dia é o do painel DEV. */
async function seed(day: number, extra: SettingsSeed = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, ...extra, dev: { dayOverride: day } }),
  );
  _resetSettingsCacheForTests();
}

/** Trecho literal dentro de um texto maior (o matcher de texto casa a frase inteira). */
const exactly = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const chapterLabels = (day: number) =>
  (getDay(day)?.readings ?? []).flatMap((reading) =>
    expandChapters(reading.canonical_reference).map((chapter) => `${chapter.bookName} ${chapter.chapter}`),
  );

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  resetToBundledContent();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  _resetFastingCacheForTests();
  _resetEntryDismissalForTests();
  _resetDailyNoticeForTests();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockDay = '3';
  setBibleProvider(licensed);
  await seed(3);
});

afterAll(() => {
  setBibleProvider(devBibleProvider);
});

// ---------------------------------------------------------------------------
// 1 · modo de leitura
// ---------------------------------------------------------------------------

describe('modo de leitura (pedido do fundador, 2026-09-22)', () => {
  test('"Vou ler na minha Bíblia": tela enxuta com a referência grande, os capítulos e "Concluir leitura"', async () => {
    await seed(3, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());

    const summary = readingSummary(getDay(3))!;
    expect(screen.getByTestId('own-bible-reference')).toHaveTextContent(summary.label);
    expect(screen.getByTestId('own-bible-detail')).toHaveTextContent(summary.detail);
    // A lista traz TODOS os capítulos do dia, na ordem da leitura.
    const chapters = chapterLabels(3);
    expect(chapters.length).toBeGreaterThan(1);
    for (const label of chapters) expect(screen.getByText(label)).toBeTruthy();

    // Sem texto bíblico, sem "Aa" e sem passar capítulo por capítulo.
    expect(screen.queryByTestId('reader-chapter-numeral')).toBeNull();
    expect(screen.queryByTestId('reader-attribution')).toBeNull();
    expect(screen.queryByTestId('reader-guide')).toBeNull();
    expect(screen.queryByTestId('reader-next')).toBeNull();
    expect(screen.queryByTestId('reader-previous')).toBeNull();
    expect(screen.queryByTestId('reader-text-size')).toBeNull();
    expect(screen.queryByText('Aa', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByLabelText('Tamanho do texto')).toBeNull();

    // O que fica: concluir a leitura, fechar e o sublinhado que devolve o texto.
    expect(screen.getByTestId('reader-complete')).toBeTruthy();
    expect(screen.getByText('Concluir leitura')).toBeTruthy();
    expect(screen.getByLabelText('Fechar leitura')).toBeTruthy();
    expect(screen.getByText('Ler aqui no app')).toBeTruthy();
  });

  test('abrir a tela enxuta não conclui nada; "Concluir leitura" grava e leva à celebração', async () => {
    await seed(3, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    const campaignId = getCampaign().id;
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());

    // Invariante P-09: só o gesto explícito conclui.
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), 3)).toBe(false);

    fireEvent.press(screen.getByTestId('reader-complete'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/concluido/3'));
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), 3)).toBe(true);
  });

  test('"Ler aqui no app" troca para o leitor com texto e guarda a preferência', async () => {
    await seed(3, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());

    fireEvent.press(screen.getByTestId('own-bible-read-in-app'));

    await waitFor(() => expect(screen.getByTestId('reader-chapter-numeral')).toBeTruthy());
    expect(screen.queryByTestId('own-bible-plan')).toBeNull();
    // O leitor de texto volta inteiro: "Aa", navegação de capítulos e atribuição.
    expect(screen.getByTestId('reader-text-size')).toBeTruthy();
    expect(screen.getByTestId('reader-next')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('reader-attribution')).toBeTruthy());
    await waitFor(async () => expect((await loadSettings()).lastUsedReadingMode).toBe('in_app'));
  });

  test('"Ler aqui no app": quem escolheu ler no app abre o leitor com o texto, como hoje', async () => {
    await seed(3, { readingMode: 'in_app', lastUsedReadingMode: 'in_app' });
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByTestId('reader-chapter-numeral')).toBeTruthy());
    expect(screen.queryByTestId('own-bible-plan')).toBeNull();
    expect(screen.getByTestId('reader-text-size')).toBeTruthy();
  });

  test('sem tradução licenciada, a tela enxuta não oferece "Ler aqui no app" (não haveria texto)', async () => {
    setBibleProvider(devBibleProvider);
    await seed(3, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());
    expect(screen.queryByTestId('own-bible-read-in-app')).toBeNull();
    expect(screen.queryByText('Ler aqui no app')).toBeNull();
  });

  test('em fonte 3,571× a tela enxuta continua inteira, sem fontWeight e com o piso de 48 no fechar', async () => {
    setViewport(AX5);
    await seed(3, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());

    // A referência, a estimativa e todos os capítulos continuam na tela.
    expect(screen.getByTestId('own-bible-reference')).toBeTruthy();
    expect(screen.getByTestId('own-bible-detail')).toBeTruthy();
    for (const label of chapterLabels(3)) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTestId('reader-complete')).toBeTruthy();

    // Peso só pela face da fonte (REGRAS 25): nenhum fontWeight na tela.
    for (const id of ['own-bible-reference', 'own-bible-detail']) {
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style).fontWeight).toBeUndefined();
    }
    // O "✕" é ícone de traço: não cresce com a fonte e o alvo fica nos 48.
    expect(StyleSheet.flatten(screen.getByTestId('reader-back').props.style)).toMatchObject({
      minWidth: 48,
      minHeight: 48,
    });
    resetViewport();
  });
});

// ---------------------------------------------------------------------------
// 2 · contador de dias lidos no topo da Jornada
// ---------------------------------------------------------------------------

describe('contador de dias lidos no topo da Jornada', () => {
  test('mostra o mesmo número e o mesmo rótulo falado do contador do Você', async () => {
    const campaignId = getCampaign().id;
    await setDayCompleted(campaignId, 1, true);
    await setDayCompleted(campaignId, 2, true);
    await seed(5);

    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-read-counter')).toBeTruthy());

    const counter = screen.getByTestId('journey-read-counter');
    expect(screen.getByTestId('journey-read-counter-count')).toHaveTextContent('2');
    expect(counter.props.accessibilityLabel).toBe(readCounterLabel(2));

    // O rótulo é literalmente o do Você: se um mudar, este teste cai.
    const voce = await render(
      <ProfileHeader
        name="Você"
        ministry={null}
        readCount={2}
        onOpenSettings={() => {}}
        onEditProfile={() => {}}
      />,
    );
    const pilha = voce.getByTestId('read-counter');
    expect(counter.props.accessibilityLabel).toBe(pilha.props.accessibilityLabel);
    voce.unmount();
  });

  test('nunca zera: com dias em aberto no meio, continua contando tudo o que foi lido', async () => {
    const campaignId = getCampaign().id;
    // Leu os dias 1 e 2, faltou 3 e 4, hoje é o 5: uma sequência seria zero.
    await setDayCompleted(campaignId, 1, true);
    await setDayCompleted(campaignId, 2, true);
    await seed(5);

    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-read-counter')).toBeTruthy());
    expect(screen.getByTestId('journey-read-counter').props.accessibilityLabel).toBe(readCounterLabel(2));
    // Nenhuma cobrança ao lado do contador.
    expect(screen.queryByText(/perdeu|recomeç|falhou|zerou/i)).toBeNull();
  });

  test('sem nenhum dia lido, o contador aparece em zero (sem culpa, sem esconder)', async () => {
    await seed(3);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-read-counter')).toBeTruthy());
    expect(screen.getByTestId('journey-read-counter').props.accessibilityLabel).toBe(readCounterLabel(0));
    expect(readCounterLabel(1)).toBe('1 dia lido no total');
  });
});

// ---------------------------------------------------------------------------
// 3 · o plano troca todo dia
// ---------------------------------------------------------------------------

const DAYS = [1, 2, 3] as const;

describe('o plano troca todo dia (dias simulados 1, 2 e 3)', () => {
  test('o dataset da igreja tem referência, ênfase e versículo DIFERENTES nos três dias', () => {
    const references = DAYS.map((day) => readingSummary(getDay(day))!.label);
    const emphases = DAYS.map((day) => getDay(day)!.title);
    const verses = DAYS.map((day) => getDay(day)!.key_verse_reference);

    expect(new Set(references).size).toBe(DAYS.length);
    expect(new Set(emphases).size).toBe(DAYS.length);
    expect(new Set(verses).size).toBe(DAYS.length);
  });

  test('o painel de hoje e o aviso do dia mostram o que é DAQUELE dia', async () => {
    for (const day of DAYS) {
      await seed(day);
      const view = await render(<JourneyHome />);
      await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());

      const data = getDay(day)!;
      const summary = readingSummary(data)!;
      // A ênfase do dia (título do guia da igreja) existe nos 100 dias.
      const title = data.title ?? '';
      expect(title).not.toBe('');
      // Painel de hoje: "Dia N de 100", a referência e a ênfase do dia.
      expect(screen.getByLabelText(`Dia ${day} de 100`)).toBeTruthy();
      expect(screen.getByTestId('reading-label')).toHaveTextContent(summary.label);
      expect(screen.getByTestId('day-emphasis')).toHaveTextContent(title);

      // J4 · aviso do dia: a mesma ênfase e o versículo-base daquele dia.
      await waitFor(() => expect(screen.getByTestId('daily-notice')).toBeTruthy());
      expect(screen.getByTestId('daily-notice-emphasis')).toHaveTextContent(title);
      // Ao lado da referência vai a atribuição da tradução; o que importa aqui é
      // que a referência é a do dia.
      expect(screen.getByTestId('daily-notice-reference')).toHaveTextContent(
        exactly(formatReference(data.key_verse_reference!)),
      );

      view.unmount();
      _resetDailyNoticeForTests();
    }
  });

  test('a aba Bíblia diz o mesmo plano do painel de hoje, dia a dia', async () => {
    for (const day of DAYS) {
      await seed(day);
      const view = await render(<BibleTab />);
      await waitFor(() => expect(screen.getByTestId('bible-plan')).toBeTruthy());

      const summary = readingSummary(getDay(day))!;
      expect(screen.getByTestId('bible-plan-cap')).toHaveTextContent(exactly(`Dia ${day}`));
      expect(screen.getByTestId('bible-plan-reference')).toHaveTextContent(summary.label);
      expect(screen.getByTestId('bible-plan-detail')).toHaveTextContent(summary.detail);

      view.unmount();
    }
  });

  test('o dia completo (A3) traz a leitura, a ênfase e o versículo-base daquele dia', async () => {
    for (const day of DAYS) {
      mockDay = String(day);
      await seed(day);
      const view = await render(<DayScreen />);
      await waitFor(() => expect(screen.getByTestId('day-reading')).toBeTruthy());

      const data = getDay(day)!;
      expect(screen.getByTestId('reading-label')).toHaveTextContent(readingSummary(data)!.label);
      expect(screen.getByTestId('day-emphasis')).toHaveTextContent(data.title ?? '');
      expect(screen.getByTestId('key-verse')).toHaveTextContent(formatReference(data.key_verse_reference!));

      view.unmount();
    }
  });

  test('a leitura que o leitor abre é a do dia simulado', async () => {
    for (const day of DAYS) {
      mockDay = String(day);
      await seed(day, { readingMode: 'own_bible', lastUsedReadingMode: 'own_bible' });
      const view = await render(<ReaderScreen />);
      await waitFor(() => expect(screen.getByTestId('own-bible-plan')).toBeTruthy());

      expect(screen.getByTestId('own-bible-reference')).toHaveTextContent(readingSummary(getDay(day))!.label);
      const chapters = chapterLabels(day);
      for (const label of chapters) expect(screen.getByText(label)).toBeTruthy();

      view.unmount();
    }
  });
});
