import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import ReaderScreen from '@/app/reader/[day]';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, isDayCompleted, loadCompletions } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { GUIDE_INSTRUCTION } from '@/ui/leitor/ReaderGuide';

import { resetViewport } from './support/viewport';

/**
 * B1 · leitor como GUIA: é o que aparece enquanto o provedor não tem texto
 * licenciado (Gate 1 aberto). Tem de ser uma tela que funciona — nada de caixa
 * "não liberado", barras listradas ou controles que não mudam nada (Apple 2.1).
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

const refOf = (c: { bookName: string; chapter: number }) => `${c.bookName} ${c.chapter}`;

let campaignId = '';

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.back.mockClear();
  // O provedor de exemplo não tem texto licenciado: o leitor vira o guia.
  setBibleProvider(devBibleProvider);
  mockDay = String(TODAY);
  campaignId = loadCampaignOnDay(TODAY);
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('B1 · guia sem texto licenciado', () => {
  test('referência grande, instrução em serifa e posição — sem "não liberado", listras, "Aa" nem "Prefiro ler"', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    await render(<ReaderScreen />);
    const chapters = chaptersOf(day);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());

    expect(screen.getByTestId('reader-guide-reference').props.children).toBe(refOf(chapters[0]));
    expect(screen.getByText(GUIDE_INSTRUCTION)).toBeTruthy();
    expect(screen.getByTestId('reader-guide-position').props.children).toBe(`Capítulo 1 de ${chapters.length}`);

    // Tipografia de tokens: serifa na instrução, peso só pela face.
    const instruction = StyleSheet.flatten(screen.getByTestId('reader-guide-instruction').props.style);
    expect(instruction.fontFamily).toMatch(/^SourceSerif4/);
    for (const id of ['reader-guide-reference', 'reader-guide-instruction', 'reader-guide-position']) {
      expect(StyleSheet.flatten(screen.getByTestId(id).props.style).fontWeight).toBeUndefined();
    }

    // Nada do leitor de placeholder.
    expect(screen.queryByTestId('reader-not-released')).toBeNull();
    expect(screen.queryByText(/não liberad/i, { includeHiddenElements: true })).toBeNull();
    expect(screen.queryAllByTestId(/listr|stripe|skeleton/i, { includeHiddenElements: true })).toHaveLength(0);
    expect(screen.queryByTestId('reader-chapter-numeral')).toBeNull();
    expect(screen.queryByLabelText(/^Versículo /)).toBeNull();
    // Sem texto, o tamanho da letra não muda nada: sem "Aa" e sem folha.
    expect(screen.queryByText('Aa', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('reader-text-size')).toBeNull();
    expect(screen.queryByLabelText('Tamanho do texto')).toBeNull();
    // O guia JÁ é a leitura na própria Bíblia.
    expect(screen.queryByTestId('reader-own-bible')).toBeNull();
    expect(screen.queryByText(/Prefiro ler/)).toBeNull();
    // A faixa de conteúdo (C-07) continua.
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('a barra diz só o dia, mantém "Fechar leitura" e guarda o vão do "Aa" para centrar o título', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-title')).toBeTruthy());
    expect(screen.getByTestId('reader-title').props.children).toBe(`Dia ${TODAY}`);
    expect(screen.getByLabelText('Fechar leitura')).toBeTruthy();
    const spacer = screen.getByTestId('reader-top-bar-spacer', { includeHiddenElements: true });
    expect(spacer.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(StyleSheet.flatten(spacer.props.style)).toMatchObject({ minWidth: 48, minHeight: 48 });
  });

  test('percorre os capítulos e só conclui no último, por toque em "Concluir leitura"', async () => {
    const day = dayWithChapters(3);
    mockDay = String(day);
    await render(<ReaderScreen />);
    const chapters = chaptersOf(day);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());

    for (let i = 0; i < chapters.length; i++) {
      expect(screen.getByTestId('reader-guide-reference').props.children).toBe(refOf(chapters[i]));
      expect(screen.getByTestId('reader-guide-position').props.children).toBe(`Capítulo ${i + 1} de ${chapters.length}`);
      if (i < chapters.length - 1) {
        expect(screen.getByLabelText('Próximo capítulo')).toBeTruthy();
        expect(screen.queryByLabelText('Concluir leitura')).toBeNull();
        await fireEvent.press(screen.getByTestId('reader-next'));
      }
    }

    // Chegar ao último capítulo não conclui nada (P-09): só o gesto conclui.
    expect(screen.queryByTestId('reader-next')).toBeNull();
    expect(screen.getByLabelText('Concluir leitura')).toBeTruthy();
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), day)).toBe(false);
    expect(mockRouter.back).not.toHaveBeenCalled();

    // "Capítulo anterior" volta sem concluir.
    await fireEvent.press(screen.getByTestId('reader-previous'));
    expect(screen.getByTestId('reader-guide-position').props.children).toBe(
      `Capítulo ${chapters.length - 1} de ${chapters.length}`,
    );
    await fireEvent.press(screen.getByTestId('reader-next'));

    await fireEvent.press(screen.getByTestId('reader-complete'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), day)).toBe(true);
  });

  test('leitor de tela: referência e posição aparecem uma vez cada, e a troca é anunciada uma vez', async () => {
    const day = dayWithChapters(2);
    mockDay = String(day);
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    // O mock do React Native guarda chamadas de testes anteriores.
    announce.mockClear();
    await render(<ReaderScreen />);
    const chapters = chaptersOf(day);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());

    const first = refOf(chapters[0]);
    // Só o que o leitor de tela alcança (sem `includeHiddenElements`).
    expect(screen.getAllByText(first)).toHaveLength(1);
    expect(screen.queryAllByLabelText(new RegExp(first))).toHaveLength(0);
    expect(screen.getAllByText(/capítulo 1 de/i)).toHaveLength(1);
    expect(screen.queryAllByLabelText(/capítulo 1 de/i)).toHaveLength(0);
    // A referência é cabeçalho; a barra só diz o dia.
    const headers = screen.getAllByRole('header').map((n) => n.props.children);
    expect(headers).toEqual(expect.arrayContaining([`Dia ${day}`, first]));
    expect(announce).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('reader-next'));
    const second = refOf(chapters[1]);
    await waitFor(() =>
      expect(announce).toHaveBeenCalledWith(`${second}, capítulo 2 de ${chapters.length}`),
    );
    expect(announce).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText(second)).toHaveLength(1);
  });

  test('a posição continua sendo gravada e restaurada no guia (PER-04)', async () => {
    const day = dayWithChapters(3);
    mockDay = String(day);
    await AsyncStorage.setItem('reader-position:v1', JSON.stringify({ dayNumber: day, readingIndex: 0, chapterIndex: 2 }));
    await render(<ReaderScreen />);
    const chapters = chaptersOf(day);
    await waitFor(() =>
      expect(screen.getByTestId('reader-guide-position').props.children).toBe(`Capítulo 3 de ${chapters.length}`),
    );
    expect(screen.getByTestId('reader-guide-reference').props.children).toBe(refOf(chapters[2]));

    await fireEvent.press(screen.getByTestId('reader-previous'));
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem('reader-position:v1')) ?? '{}')).toMatchObject({
        dayNumber: day,
        chapterIndex: 1,
      }),
    );
  });
});
