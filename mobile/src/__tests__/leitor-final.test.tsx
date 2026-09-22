import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import ReaderScreen from '@/app/reader/[day]';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, isDayCompleted, loadCompletions } from '@/progress/completionsStore';
import { BIBLIA_LIVRE_NOTICE, bibliaLivreProvider } from '@/reader/bibliaLivreProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { readLineHeight } from '@/reader/readerFontSize';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

import { resetViewport } from './support/viewport';

/**
 * Leitor do dia, versão final (modo TEXTO, Bíblia Livre empacotada):
 * - o corpo é o ChapterText da aba Bíblia (mesmos versículos, numeral e tamanho);
 * - o título do salmo (Passage.heading) vem antes do versículo 1, sem papel de cabeçalho;
 * - capítulo longo (Salmo 119, 176 versículos) inteiro, com a atribuição no fim;
 * - posição restaurada; rolar até o fim nunca conclui: só o gesto conclui.
 *
 * O texto vem do provedor real e é só LIDO (nunca reescrito aqui).
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
const mockRouter = require('expo-router').router as { back: jest.Mock; replace: jest.Mock };

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

function dayWithChapters(min: number): number {
  for (let day = TODAY; day >= 1; day--) if (chaptersOf(day).length >= min) return day;
  throw new Error(`nenhum dia até ${TODAY} tem ${min} capítulos`);
}

/** Bíblia Livre real, mas todo capítulo pedido vira o Salmo `psalm`. */
function psalmProvider(psalm: number): BibleTextProvider & { calls: jest.Mock } {
  const calls = jest.fn();
  return {
    calls,
    getMetadata: bibliaLivreProvider.getMetadata,
    getPassage: (reference) => {
      calls(reference);
      return bibliaLivreProvider.getPassage({
        ...reference,
        book: 'PSA',
        chapterStart: psalm,
        chapterEnd: psalm,
        verseStart: null,
        verseEnd: null,
      });
    },
  };
}

async function realPsalm(psalm: number) {
  return bibliaLivreProvider.getPassage({ book: 'PSA', chapterStart: psalm, chapterEnd: psalm, verseStart: null, verseEnd: null });
}

/** testIDs dos elementos nativos, na ordem em que aparecem na tela. */
function hostOrder(): string[] {
  const json = JSON.stringify(screen.toJSON());
  return [...json.matchAll(/"testID":"([^"]+)"/g)].map((m) => m[1]);
}

let campaignId = '';

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  mockRouter.back.mockClear();
  mockDay = String(TODAY);
  campaignId = loadCampaignOnDay(TODAY);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
});

describe('leitor do dia = ChapterText da aba Bíblia', () => {
  test('título do salmo antes do versículo 1, discreto e sem papel de cabeçalho', async () => {
    setBibleProvider(psalmProvider(3));
    const expected = await realPsalm(3);
    expect(expected.heading).toBeTruthy();
    await render(<ReaderScreen />);

    const body = await screen.findByTestId('chapter-text');
    const heading = within(body).getByTestId('chapter-heading');
    expect(heading).toHaveTextContent(expected.heading as string);
    expect(heading.props.accessibilityRole).toBeUndefined();
    // O único cabeçalho do corpo é o numeral do capítulo.
    expect(within(body).queryAllByRole('header')).toHaveLength(0);

    // Ordem: título, depois o versículo 1.
    const order = hostOrder();
    expect(order.indexOf('chapter-heading')).toBeLessThan(order.indexOf('verse-1'));

    const headingStyle = StyleSheet.flatten(heading.props.style);
    const verseStyle = StyleSheet.flatten(screen.getByTestId('verse-1').props.style);
    expect(headingStyle.color).not.toBe(verseStyle.color);
    expect(headingStyle.fontWeight).toBeUndefined();
  });

  test('mesmo tamanho da letra escolhido em "Aa", com o numeral em 12/19', async () => {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', readerFontSize: 24 }),
    );
    _resetSettingsCacheForTests();
    setBibleProvider(psalmProvider(3));
    const expected = await realPsalm(3);
    await render(<ReaderScreen />);

    const verse = await screen.findByTestId('verse-1');
    expect(StyleSheet.flatten(verse.props.style)).toMatchObject({ fontSize: 24, lineHeight: readLineHeight(24) });
    expect(verse.props.accessibilityLabel).toBe(`Versículo 1. ${expected.verses[0].text}`);
    expect(verse.props.maxFontSizeMultiplier).toBeUndefined();
    const numeral = (verse.props.children as { props: { style: { fontSize?: number } } }[])[0];
    expect(StyleSheet.flatten(numeral.props.style).fontSize).toBe(Math.round((12 * 24) / 19));
  });
});

describe('capítulo longo (Salmo 119)', () => {
  test('os 176 versículos aparecem, sem título inventado, e a atribuição vem no fim', async () => {
    setBibleProvider(psalmProvider(119));
    await render(<ReaderScreen />);

    expect(await screen.findByTestId('verse-176')).toBeTruthy();
    expect(screen.getAllByTestId(/^verse-\d+$/)).toHaveLength(176);
    expect(screen.queryByTestId('chapter-heading')).toBeNull();
    const attribution = screen.getByTestId('reader-attribution');
    expect(attribution.props.children).toBe(BIBLIA_LIVRE_NOTICE);

    // Atribuição depois do último versículo, no mesmo conteúdo rolável.
    const order = hostOrder();
    expect(order.indexOf('reader-attribution')).toBeGreaterThan(order.indexOf('verse-176'));
  });

  test('o fim do capítulo fica acima do rodapé medido, e rolar não conclui o dia', async () => {
    setBibleProvider(psalmProvider(119));
    await render(<ReaderScreen />);
    await screen.findByTestId('verse-176');

    await fireEvent(screen.getByTestId('reader-footer'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 420 } },
    });
    const scroll = screen.getByTestId('reader-scroll');
    await waitFor(() =>
      expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBeGreaterThanOrEqual(420),
    );

    await fireEvent.scroll(scroll, {
      nativeEvent: {
        contentOffset: { x: 0, y: 20_000 },
        contentSize: { width: 375, height: 21_000 },
        layoutMeasurement: { width: 375, height: 800 },
      },
    });
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), TODAY)).toBe(false);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('posição e conclusão', () => {
  test('reabrir o dia volta ao capítulo salvo, e a volta da posição não pede o capítulo de novo', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    const chapters = chaptersOf(day);
    await AsyncStorage.setItem(POSITION_KEY, JSON.stringify({ dayNumber: day, readingIndex: 0, chapterIndex: 1 }));
    const provider = psalmProvider(3);
    setBibleProvider(provider);
    await render(<ReaderScreen />);

    await waitFor(() => expect(screen.getByTestId('reader-chapter-numeral')).toHaveTextContent(String(chapters[1].chapter)));
    await screen.findByTestId('verse-1');
    const asked = provider.calls.mock.calls.map(([r]) => `${r.book} ${r.chapterStart}`);
    // Capítulo 1 (antes do disco responder) e o 2 (restaurado); nunca repetidos.
    expect(new Set(asked).size).toBe(asked.length);
  });

  test('sem posição salva, o capítulo 1 é pedido uma vez só (a leitura do disco não repete o pedido)', async () => {
    const provider = psalmProvider(119);
    setBibleProvider(provider);
    await render(<ReaderScreen />);
    await screen.findByTestId('verse-176');
    await waitFor(async () => expect(await AsyncStorage.getItem(POSITION_KEY)).not.toBeNull());
    expect(provider.calls).toHaveBeenCalledTimes(1);
  });

  test('só o gesto "Concluir leitura" no último capítulo conclui o dia', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    const total = chaptersOf(day).length;
    setBibleProvider(psalmProvider(3));
    await render(<ReaderScreen />);
    await screen.findByTestId('verse-1');

    for (let i = 1; i < total; i++) {
      await fireEvent.press(screen.getByTestId('reader-next'));
      await screen.findByTestId('verse-1');
    }
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), day)).toBe(false);

    await fireEvent.press(screen.getByTestId('reader-complete'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/concluido/${day}`));
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), day)).toBe(true);
  });
});
