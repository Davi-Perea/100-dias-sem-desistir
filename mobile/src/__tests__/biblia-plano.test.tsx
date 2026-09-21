import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BibleTab from '@/app/(tabs)/biblia';
import { getDay, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { BIBLE_POSITION_KEY } from '@/ui/biblia/bibleNav';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
    useLocalSearchParams: () => ({}),
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockPush = require('expo-router').router.push as jest.Mock;

const DAY_MS = 86_400_000;

/** Provedor licenciado de TESTE: sem faixa de exemplo, para a aba ficar como em release. */
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
  getPassage: async () => {
    throw new Error('não usado');
  },
};

/** Dataset cuja data de início faz de HOJE o dia informado (0 = antes; > 100 = encerrada). */
function datasetOnDay(day: number): JourneyDataset {
  const base = devDataset();
  const todayInTz = calendarDateInCampaignTz(new Date(), base.campaign);
  const [y, m, d] = todayInTz.split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * DAY_MS;
  return { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } };
}

function onDay(day: number) {
  const dataset = datasetOnDay(day);
  expect(loadDataset(dataset, 'development').ok).toBe(true);
  return dataset;
}

async function renderTab() {
  await render(<BibleTab />);
  await waitFor(() => expect(screen.getByTestId('bible-title')).toBeTruthy());
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  mockPush.mockClear();
  setBibleProvider(fake);
});

afterAll(() => {
  resetToDevFixtures();
  setBibleProvider(devBibleProvider);
});

describe('plano de hoje na aba Bíblia', () => {
  it('em curso: Dia N com a referência e o tempo da Jornada, e "Ler" abre o leitor do dia', async () => {
    onDay(5);
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-plan')).toBeTruthy());
    const summary = readingSummary(getDay(5))!;
    expect(screen.getByTestId('bible-plan-cap').props.children).toEqual(['Plano de hoje · Dia ', 5]);
    expect(screen.getByTestId('bible-plan-reference')).toHaveTextContent(summary.label);
    expect(screen.getByTestId('bible-plan-detail')).toHaveTextContent(summary.detail);
    expect(summary.detail).toContain('~');
    expect(screen.queryByTestId('bible-plan-done')).toBeNull();

    fireEvent.press(screen.getByTestId('bible-plan-read'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '5' } });
    expect(screen.getByText('Ler')).toBeTruthy();
  });

  it('dia concluído: mostra "Concluído" e "Ler de novo"', async () => {
    const dataset = onDay(5);
    await setDayCompleted(dataset.campaign.id, 5, true);
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-plan-done')).toBeTruthy());
    expect(screen.getByText('Concluído')).toBeTruthy();
    expect(screen.getByText('Ler de novo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('bible-plan-read'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '5' } });
  });

  it('antes da campanha: avisa a data de início, sem botão e sem dia algum', async () => {
    const dataset = onDay(0);
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-plan-before')).toBeTruthy());
    const start = formatDayDate(1, dataset.campaign).slice(0, 5);
    expect(screen.getByTestId('bible-plan-before')).toHaveTextContent(`O plano começa em ${start}`);
    expect(screen.queryByTestId('bible-plan-read')).toBeNull();
    expect(screen.queryByTestId('bible-plan-reference')).toBeNull();
  });

  it('depois da campanha: o bloco não aparece e a Bíblia continua inteira', async () => {
    onDay(101);
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-ot')).toBeTruthy());
    expect(screen.queryByTestId('bible-plan')).toBeNull();
    expect(screen.getByTestId('bible-nt')).toBeTruthy();
  });

  it('nunca mostra um dia futuro: o bloco é sempre o dia oficial de hoje', async () => {
    onDay(2);
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-plan-cap')).toBeTruthy());
    expect(screen.getByTestId('bible-plan-cap').props.children).toEqual(['Plano de hoje · Dia ', 2]);
    expect(screen.queryByText(readingSummary(getDay(3))!.label)).toBeNull();
  });

  it('embaixo, tudo como estava: "Continuar em" e os dois Testamentos', async () => {
    onDay(5);
    await AsyncStorage.setItem(BIBLE_POSITION_KEY, JSON.stringify({ book: 'JHN', chapter: 3 }));
    await renderTab();

    await waitFor(() => expect(screen.getByTestId('bible-continue')).toBeTruthy());
    expect(screen.getByTestId('bible-plan')).toBeTruthy();
    expect(screen.getByTestId('bible-ot')).toBeTruthy();
    expect(screen.getByTestId('bible-nt')).toBeTruthy();
  });
});
