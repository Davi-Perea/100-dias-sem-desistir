import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, StyleSheet } from 'react-native';

import ReaderScreen from '@/app/reader/[day]';
import ReflectionScreen from '@/app/reflexao/[day]';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, isDayCompleted, loadCompletions, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests, loadReflections, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';

import { resetViewport } from './support/viewport';

/**
 * Correções do grupo G2 (leitor B1/B3 e reflexão B5): D-1, R1-*, PER-04 e a
 * falha de gravação da reflexão. Cada teste diz a regra que protege.
 */

let mockDay = '17';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ day: mockDay }),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
}));

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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const TODAY = 17;
const POSITION_KEY = 'reader-position:v1';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = require('expo-router').router as { back: jest.Mock };

function loadCampaignOnDay(day: number) {
  const base: JourneyDataset = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
  return result.dataset.campaign.id;
}

function chaptersOf(day: number) {
  return (getDay(day)?.readings ?? []).flatMap((r) => expandChapters(r.canonical_reference));
}

/** Um dia já aberto com pelo menos `min` capítulos. */
function dayWithChapters(min: number): number {
  for (let day = TODAY; day >= 1; day--) if (chaptersOf(day).length >= min) return day;
  throw new Error(`nenhum dia até ${TODAY} tem ${min} capítulos`);
}

const failing: BibleTextProvider = {
  getMetadata: () => ({ ...devBibleProvider.getMetadata(), id: 'licenciada-teste', isDevPlaceholder: false }),
  getPassage: async () => {
    throw new Error('ECONNRESET socket hang up 503');
  },
};

let campaignId = '';

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.back.mockClear();
  setBibleProvider(devBibleProvider);
  mockDay = String(TODAY);
  campaignId = loadCampaignOnDay(TODAY);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* ------------------------------------------------------------ B1 · erro (F5) */

describe('B1 · estado de erro do leitor', () => {
  test('R1-20: cópia humana, nada da exceção e nenhum "hoje" (R1-11)', async () => {
    setBibleProvider(failing);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-error')).toBeTruthy());
    expect(screen.getByText('Não deu para carregar')).toBeTruthy();
    expect(screen.queryByText(/ECONNRESET|503|socket/)).toBeNull();
    expect(screen.getByTestId('error-message').props.children).not.toMatch(/hoje/i);
  });

  test('R1-2 / D-1: "Ler na minha Bíblia" do erro grava o modo e volta, sem concluir', async () => {
    setBibleProvider(failing);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-error-own-bible')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-error-own-bible'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await waitFor(async () => {
      _resetSettingsCacheForTests();
      expect((await loadSettings()).lastUsedReadingMode).toBe('own_bible');
    });
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), TODAY)).toBe(false);
  });
});

/* ------------------------------------------------------------ B1 · barra */

describe('B1 · barra de topo', () => {
  test('R1-8: filete vazio no capítulo 1 e cheio com o dia concluído', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-title')).toBeTruthy());
    const fill = () =>
      StyleSheet.flatten(
        screen.getByTestId('reader-progress', { includeHiddenElements: true }).props.children.props.style,
      ).width;
    expect(fill()).toBe('0%');
    screen.unmount();

    await setDayCompleted(campaignId, TODAY, true);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-title')).toBeTruthy());
    expect(fill()).toBe('100%');
  });

  test('R1-14: "Aa" cresce com a fonte do sistema, com teto que cabe na caixa de 48', async () => {
    await render(<ReaderScreen />);
    const aa = await screen.findByText('Aa', { includeHiddenElements: true });
    expect(aa.props.allowFontScaling).not.toBe(false);
    expect(aa.props.maxFontSizeMultiplier).toBe(1.6);
    // 16 × 1,6 = 25,6 e entrelinha 20 × 1,6 = 32: dentro do piso de 48.
    expect(20 * aa.props.maxFontSizeMultiplier).toBeLessThanOrEqual(48);
  });

  test('R1-10: a cap do livro não é cabeçalho, e a troca de capítulo é anunciada', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-next')).toBeTruthy());
    const second = chaptersOf(day)[1];
    const bookCap = screen.getAllByText(chaptersOf(day)[0].bookName).find((n) => n.props.accessibilityRole === 'text');
    expect(bookCap).toBeTruthy();
    expect(announce).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('reader-next'));
    await waitFor(() =>
      expect(announce).toHaveBeenCalledWith(
        `${second.bookName} ${second.chapter}, capítulo 2 de ${chaptersOf(day).length}`,
      ),
    );
  });
});

/* ------------------------------------------------------------ PER-04 */

describe('PER-04 · posição de leitura', () => {
  test('reabrir o mesmo dia volta ao capítulo em que a pessoa estava', async () => {
    const day = dayWithChapters(3);
    mockDay = String(day);
    await AsyncStorage.setItem(POSITION_KEY, JSON.stringify({ dayNumber: day, readingIndex: 0, chapterIndex: 2 }));
    await render(<ReaderScreen />);
    const total = chaptersOf(day).length;
    await waitFor(() => expect(screen.getByText(`Dia ${day} · capítulo 3 de ${total}`)).toBeTruthy());
    expect(screen.getByTestId('reader-chapter-numeral').props.children).toBe(chaptersOf(day)[2].chapter);
  });

  test('a posição de outro dia é ignorada, e a do dia aberto é gravada ao andar', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    await AsyncStorage.setItem(POSITION_KEY, JSON.stringify({ dayNumber: day - 1, readingIndex: 0, chapterIndex: 1 }));
    await render(<ReaderScreen />);
    const total = chaptersOf(day).length;
    await waitFor(() => expect(screen.getByText(`Dia ${day} · capítulo 1 de ${total}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-next'));
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(POSITION_KEY)) ?? '{}')).toMatchObject({
        dayNumber: day,
        chapterIndex: 1,
      }),
    );
  });

  test('dia já concluído abre no capítulo 1 (releitura)', async () => {
    const day = dayWithChapters(3);
    mockDay = String(day);
    await setDayCompleted(campaignId, day, true);
    await AsyncStorage.setItem(POSITION_KEY, JSON.stringify({ dayNumber: day, readingIndex: 0, chapterIndex: 2 }));
    await render(<ReaderScreen />);
    const total = chaptersOf(day).length;
    await waitFor(() => expect(screen.getByText(`Dia ${day} · capítulo 1 de ${total}`)).toBeTruthy());
  });
});

/* ------------------------------------------------------------ B3 */

describe('B3 · folha de tamanho do texto', () => {
  test('R1-3: "Pronto" fecha a folha', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-text-size')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-text-size'));
    expect(screen.getByTestId('text-size-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('text-size-done'));
    await waitFor(() => expect(screen.queryByTestId('text-size-sheet')).toBeNull());
  });

  test('R1-15: a régua quebra linha em vez de passar da largura', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-text-size')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-text-size'));
    expect(StyleSheet.flatten(screen.getByTestId('text-size-ruler').props.style).flexWrap).toBe('wrap');
    // "14 — trilha — 30" fica junto; só o valor desce.
    expect(screen.getByTestId('text-size-track-row')).toBeTruthy();
  });
});

/* ------------------------------------------------------------ B5 */

describe('B5 · reflexão', () => {
  test('R1-6: esvaziar e salvar pede a mesma confirmação do "Excluir", e não apaga sozinho', async () => {
    await saveReflection(campaignId, TODAY, 'já escrita');
    _resetReflectionsCacheForTests();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-input').props.value).toBe('já escrita'));
    await fireEvent.changeText(screen.getByTestId('reflection-input'), '   ');
    await fireEvent.press(screen.getByTestId('reflection-save'));

    expect(alert).toHaveBeenCalledWith('Excluir reflexão', 'Esta reflexão será apagada deste aparelho.', expect.any(Array));
    expect(mockRouter.back).not.toHaveBeenCalled();
    _resetReflectionsCacheForTests();
    expect((await loadReflections(campaignId)).byDay[TODAY]?.body).toBe('já escrita');
  });

  test('falha de gravação: avisa "Não foi possível salvar", fica no editor e mantém o rascunho', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('reflection-input'), 'algo que ficou');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('SQLITE_FULL'));
    await fireEvent.press(screen.getByTestId('reflection-save'));

    await waitFor(() => expect(screen.getByTestId('reflection-save-error')).toBeTruthy());
    expect(screen.getByText(/Não foi possível salvar/)).toBeTruthy();
    expect(screen.queryByText(/SQLITE_FULL/)).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.getByTestId('reflection-input').props.value).toBe('algo que ficou');
  });
});
