import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';

import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { milestoneToShow, useMilestoneTrigger } from '@/journey/useMilestoneTrigger';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';

let mockSegments: string[] = ['(tabs)'];

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useSegments: () => mockSegments,
}));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const CAMPAIGN = 'dev-fixture-campaign';

/**
 * O gatilho da tela de marco (E3/E4) morava na aba Início, que o redesenho
 * elimina. Este teste foi escrito ANTES de o gatilho antigo sair: ele fixa o
 * que o novo, montado no layout das abas, tem de fazer.
 */

function campaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
}

async function seed(completedDays: number, seen: number[] = []) {
  const at = new Date().toISOString();
  const days = Object.fromEntries(Array.from({ length: completedDays }, (_, i) => [i + 1, at]));
  await AsyncStorage.setItem(`completions:v1:${CAMPAIGN}`, JSON.stringify({ days, updatedAt: at }));
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, milestonesSeen: seen }));
  _resetCompletionsCacheForTests();
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockRouter.push.mockClear();
  mockSegments = ['(tabs)'];
  campaignOnDay(60);
});

afterAll(() => resetToDevFixtures());

describe('qual marco mostrar', () => {
  test('o maior alcançado e ainda não visto — não igualdade exata com a contagem', () => {
    expect(milestoneToShow(7, [])).toBe(7);
    // Pulou de 6 para 8 concluindo dois dias de uma vez: a primeira semana aparece.
    expect(milestoneToShow(8, [])).toBe(7);
    // Com 30 lidas e nada visto, aparece só o 25 — não uma fila de marcos.
    expect(milestoneToShow(30, [])).toBe(25);
    expect(milestoneToShow(100, [])).toBe(100);
  });

  test('não mostra de novo, nem volta para trás depois de ver um maior', () => {
    expect(milestoneToShow(7, [7])).toBeNull();
    expect(milestoneToShow(30, [25])).toBeNull();
    expect(milestoneToShow(6, [])).toBeNull();
    expect(milestoneToShow(0, [])).toBeNull();
    // Sem preferências carregadas, nada dispara.
    expect(milestoneToShow(30, null)).toBeNull();
  });
});

describe('o gatilho no layout das abas', () => {
  test('abre o marco alcançado e o registra como visto na hora', async () => {
    await seed(8);
    await renderHook(() => useMilestoneTrigger());

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/marco/[day]', params: { day: '7' } }),
    );
    // "Aparece uma vez por marco" não depende de a pessoa sair pelo botão da tela.
    await waitFor(async () => expect((await loadSettings()).milestonesSeen).toContain(7));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  test('marco já visto não reabre', async () => {
    await seed(30, [25]);
    const hook = await renderHook(() => useMilestoneTrigger());
    await waitFor(() => expect(hook.result.current).toBeUndefined());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('com o leitor por cima, espera a volta para as abas', async () => {
    mockSegments = ['reader', '[day]'];
    await seed(25);
    const hook = await renderHook(() => useMilestoneTrigger());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRouter.push).not.toHaveBeenCalled();

    mockSegments = ['(tabs)'];
    await hook.rerender({});
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/marco/[day]', params: { day: '25' } }),
    );
  });

  test('antes da campanha não há contagem e nada dispara', async () => {
    campaignOnDay(0);
    await seed(0);
    await renderHook(() => useMilestoneTrigger());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
