import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import MarksScreen from '@/app/anotacoes';
import BibleChapterScreen from '@/app/biblia/[livro]/[capitulo]';
import ReaderScreen from '@/app/reader/[day]';
import { getBook } from '@/bible/books';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { copyText } from '@/marks/clipboard';
import { HIGHLIGHTS } from '@/marks/colors';
import {
  MARKS_KEY,
  _resetMarksCacheForTests,
  loadMarks,
  marksByBook,
  saveVerseMark,
  wipeAllMarks,
} from '@/marks/marksStore';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { MIN_TOUCH, palettes } from '@/ui/theme';

import { resetViewport } from './support/viewport';

/**
 * B2 (feedback de 2026-09-22): marca-texto e anotação por versículo, só no
 * aparelho, no leitor do dia e na aba Bíblia (ChapterText compartilhado), e a
 * lista "Minhas anotações".
 *
 * As frases do provedor falso são escritas para o teste, nunca texto bíblico.
 */

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
      setParams: jest.fn(),
      canGoBack: () => true,
    },
    useLocalSearchParams: () => mockParams,
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

jest.mock('expo-blur', () => ({ BlurView: () => null }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/marks/clipboard', () => ({ copyText: jest.fn().mockResolvedValue(undefined) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = require('expo-router').router as Record<string, jest.Mock>;
const mockCopy = copyText as jest.Mock;

const fake: BibleTextProvider = {
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
  getPassage: async (reference) => ({
    reference: `${reference.book} ${reference.chapterStart}`,
    book: reference.book,
    bookName: reference.book,
    chapter: reference.chapterStart,
    heading: null,
    verses: [
      { verse: 1, text: 'Primeira frase de teste.' },
      { verse: 2, text: 'Segunda frase de teste.' },
    ],
  }),
};

function relativeLuminance(hex: string): number {
  const channels = (hex.replace('#', '').match(/../g) ?? []).map((pair) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetMarksCacheForTests();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  Object.values(mockRouter).forEach((fn) => typeof fn === 'function' && 'mockClear' in fn && fn.mockClear());
  mockCopy.mockClear();
  setBibleProvider(fake);
  mockParams = {};
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
});

afterAll(() => setBibleProvider(devBibleProvider));

describe('cores do marca-texto', () => {
  test('cinco cores; texto e numeral passam 4,5:1 sobre cada uma, nos dois temas', () => {
    expect(HIGHLIGHTS).toHaveLength(5);
    for (const h of HIGHLIGHTS) {
      expect(contrast(palettes.light.text, h.light)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palettes.light.textMuted, h.light)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palettes.dark.text, h.dark)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palettes.dark.textMuted, h.dark)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('a amostra da folha tem limite de 3:1 contra a folha nos dois temas', () => {
    expect(contrast(palettes.light.controlBorder, palettes.light.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(palettes.dark.controlBorder, palettes.dark.surface)).toBeGreaterThanOrEqual(3);
  });
});

describe('store de marcas (só no aparelho)', () => {
  const ref = { book: 'JHN', chapter: 3, verse: 16 };

  test('cor e anotação se somam; sem as duas o versículo sai', async () => {
    await saveVerseMark(ref, { color: 'azul' });
    await saveVerseMark(ref, { note: '  minha nota  ' });
    _resetMarksCacheForTests();
    let marks = await loadMarks();
    expect(marks.byVerse['JHN.3.16']).toMatchObject({ color: 'azul', note: 'minha nota' });

    await saveVerseMark(ref, { color: null });
    marks = await loadMarks();
    expect(marks.byVerse['JHN.3.16']).toMatchObject({ color: null, note: 'minha nota' });
    await saveVerseMark(ref, { note: '' });
    marks = await loadMarks();
    expect(marks.byVerse['JHN.3.16']).toBeUndefined();
  });

  test('grava no disco antes do cache: se o disco recusa, nada muda', async () => {
    await saveVerseMark(ref, { color: 'verde' });
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disco cheio'));
    await expect(saveVerseMark(ref, { color: 'rosa' })).rejects.toThrow();
    expect((await loadMarks()).byVerse['JHN.3.16'].color).toBe('verde');
  });

  test('apagar os dados por fora não ressuscita marcas na próxima gravação', async () => {
    await saveVerseMark(ref, { color: 'verde' });
    await AsyncStorage.clear();
    await saveVerseMark({ book: 'GEN', chapter: 1, verse: 1 }, { color: 'amarelo' });
    const stored = JSON.parse((await AsyncStorage.getItem(MARKS_KEY)) as string);
    expect(Object.keys(stored.byVerse)).toEqual(['GEN.1.1']);
  });

  test('wipeAllMarks limpa disco e cache', async () => {
    await saveVerseMark(ref, { color: 'verde' });
    await wipeAllMarks();
    expect(await AsyncStorage.getItem(MARKS_KEY)).toBeNull();
    expect(Object.keys((await loadMarks()).byVerse)).toHaveLength(0);
  });

  test('ignora entradas inválidas e agrupa por livro na ordem do cânon', async () => {
    await AsyncStorage.setItem(
      MARKS_KEY,
      JSON.stringify({
        byVerse: {
          a: { book: 'JHN', chapter: 3, verse: 16, color: 'azul', note: '' },
          b: { book: 'GEN', chapter: 2, verse: 1, color: null, note: 'x' },
          c: { book: 'GEN', chapter: 1, verse: 3, color: 'roxo', note: '' },
          d: { book: 'XYZ', chapter: 1, verse: 1, color: 'azul', note: '' },
        },
      }),
    );
    const groups = marksByBook(await loadMarks());
    expect(groups.map((g) => g.book.id)).toEqual(['GEN', 'JHN']);
    expect(groups[0].items).toHaveLength(1);
  });
});

describe('folha do versículo na aba Bíblia', () => {
  test('marcar, anotar, copiar e tirar a marca', async () => {
    mockParams = { livro: 'JHN', capitulo: '3' };
    await render(<BibleChapterScreen />);
    const verse = await screen.findByTestId('verse-1');
    expect(verse.props.accessibilityRole).toBe('button');
    expect(StyleSheet.flatten(verse.props.style).backgroundColor).toBeUndefined();

    await fireEvent.press(verse);
    const sheet = await screen.findByTestId('verse-sheet');
    expect(within(sheet).getByText('João 3:1')).toBeTruthy();

    // Alvo de toque de 48 em cada cor.
    for (const h of HIGHLIGHTS) {
      const swatch = screen.getByTestId(`verse-color-${h.id}`);
      expect(StyleSheet.flatten(swatch.props.style)).toMatchObject({ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH });
    }

    await fireEvent.press(screen.getByTestId('verse-color-verde'));
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByTestId('verse-1').props.style).backgroundColor).toBe(
        HIGHLIGHTS.find((h) => h.id === 'verde')?.light,
      ),
    );
    expect(screen.getByTestId('verse-1').props.accessibilityLabel).toBe(
      'Versículo 1. Primeira frase de teste. Marcado em verde.',
    );
    expect(screen.getByTestId('verse-color-verde').props.accessibilityState).toMatchObject({ checked: true });

    // Anotar.
    await fireEvent.press(screen.getByTestId('verse-note'));
    await fireEvent.changeText(screen.getByTestId('verse-note-input'), 'Lembrar disto.');
    await fireEvent.press(screen.getByTestId('verse-note-save'));
    await waitFor(async () => expect((await loadMarks()).byVerse['JHN.3.1']?.note).toBe('Lembrar disto.'));
    await screen.findByTestId('verse-note-1', { includeHiddenElements: true });
    expect(screen.getByTestId('verse-sheet-note')).toHaveTextContent(/Lembrar disto\./);

    // Copiar: o texto do versículo, a referência e a tradução.
    await fireEvent.press(screen.getByTestId('verse-copy'));
    expect(mockCopy).toHaveBeenCalledWith('“Primeira frase de teste.” João 3:1 (Tradução de teste)');
    await waitFor(() => expect(screen.getByTestId('verse-copy')).toHaveTextContent('Copiado'));

    // Tirar marca: a cor sai, a anotação fica.
    await fireEvent.press(screen.getByTestId('verse-unmark'));
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByTestId('verse-1').props.style).backgroundColor).toBeUndefined(),
    );
    expect(screen.getByTestId('verse-note-1', { includeHiddenElements: true })).toBeTruthy();
    expect((await loadMarks()).byVerse['JHN.3.1']).toMatchObject({ color: null, note: 'Lembrar disto.' });
  });

  test('disco recusando: a folha avisa e o versículo continua sem cor', async () => {
    mockParams = { livro: 'JHN', capitulo: '3' };
    await render(<BibleChapterScreen />);
    await fireEvent.press(await screen.findByTestId('verse-2'));
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disco cheio'));
    await fireEvent.press(screen.getByTestId('verse-color-rosa'));
    await screen.findByTestId('verse-sheet-error');
    expect(StyleSheet.flatten(screen.getByTestId('verse-2').props.style).backgroundColor).toBeUndefined();
  });

  test('o marca-texto usa o tom escuro no tema escuro', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    const scheme = jest.spyOn(rn, 'useColorScheme').mockReturnValue('dark');
    await saveVerseMark({ book: 'JHN', chapter: 3, verse: 1 }, { color: 'laranja' });
    mockParams = { livro: 'JHN', capitulo: '3' };
    await render(<BibleChapterScreen />);
    const verse = await screen.findByTestId('verse-1');
    await waitFor(() =>
      expect(StyleSheet.flatten(screen.getByTestId('verse-1').props.style).backgroundColor).toBe(
        HIGHLIGHTS.find((h) => h.id === 'laranja')?.dark,
      ),
    );
    expect(StyleSheet.flatten(verse.props.style).color).toBe(palettes.dark.text);
    scheme.mockRestore();
  });
});

describe('folha do versículo no leitor do dia', () => {
  const TODAY = 17;
  function loadCampaignOnDay(day: number) {
    const base = devDataset();
    const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
    const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
    const result = loadDataset(
      { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
      'development',
    );
    if (!result.ok) throw new Error('dataset inválido');
  }

  test('tocar num versículo abre a mesma folha, com o capítulo do dia', async () => {
    loadCampaignOnDay(TODAY);
    mockParams = { day: String(TODAY) };
    const first = expandChapters(getDay(TODAY)?.readings[0].canonical_reference ?? '')[0];
    await render(<ReaderScreen />);
    await fireEvent.press(await screen.findByTestId('verse-1'));
    const sheet = await screen.findByTestId('verse-sheet');
    expect(within(sheet).getByText(`${getBook(first.book)?.name} ${first.chapter}:1`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verse-color-amarelo'));
    await waitFor(async () =>
      expect((await loadMarks()).byVerse[`${first.book}.${first.chapter}.1`]?.color).toBe('amarelo'),
    );
  });
});

describe('Minhas anotações', () => {
  test('vazia: explica como marcar e leva à Bíblia', async () => {
    await render(<MarksScreen />);
    await screen.findByTestId('marks-empty');
    await fireEvent.press(screen.getByTestId('marks-empty-bible'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/biblia');
  });

  test('por livro, na ordem do cânon, e abre o capítulo', async () => {
    await saveVerseMark({ book: 'JHN', chapter: 3, verse: 16 }, { color: 'azul', note: 'Nota de teste.' });
    await saveVerseMark({ book: 'GEN', chapter: 1, verse: 1 }, { color: 'amarelo' });
    await render(<MarksScreen />);
    await screen.findByTestId('marks-book-GEN');
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('marks-book-GEN')).toBeLessThan(json.indexOf('marks-book-JHN'));

    const row = screen.getByTestId('mark-JHN.3.16');
    expect(row.props.accessibilityLabel).toBe('João 3:16. marcado em azul. Nota de teste.');
    await fireEvent.press(row);
    expect(mockRouter.push).toHaveBeenCalledWith('/biblia/JHN/3');
  });
});
