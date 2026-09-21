import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';

import { getCampaign, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { _resetCompletionsCacheForTests, COMPLETIONS_PREFIX, setDayCompleted } from '@/progress/completionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

const CAMPAIGN_ID = 'dev-fixture-campaign';
const DAY_MS = 86_400_000;

/**
 * Monta um dataset cuja data de início faz com que HOJE seja o dia informado.
 * `day = 0` deixa a campanha no futuro; `day > 100` deixa a campanha encerrada.
 */
function datasetOnDay(day: number): JourneyDataset {
  const base = devDataset();
  const todayInTz = calendarDateInCampaignTz(new Date(), base.campaign);
  const [y, m, d] = todayInTz.split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * DAY_MS;
  return {
    ...base,
    campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) },
  };
}

async function mountOnDay(day: number) {
  const result = loadDataset(datasetOnDay(day), 'development');
  expect(result.ok).toBe(true);
  const hook = await renderHook(() => useJourney());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
});

afterAll(() => resetToDevFixtures());

describe('dia oficial por fase da campanha', () => {
  test('ANTES da campanha: fase before_start e nenhum dia liberado', async () => {
    const { result } = await mountOnDay(0);
    expect(result.current.phase).toBe('before_start');
    expect(result.current.isDayUnlocked(1)).toBe(false);
    expect(result.current.isDayUnlocked(17)).toBe(false);
    // Nem o conteúdo do Dia 1 pode vazar antes do início.
    expect(result.current.todayDay).toBeNull();
    expect(result.current.dayState(1)).toBe('future');
    expect(result.current.pendingDays).toEqual([]);
  });

  test('DIA 1: campanha em curso, só o dia 1 liberado', async () => {
    const { result } = await mountOnDay(1);
    expect(result.current.phase).toBe('running');
    expect(result.current.officialDay).toBe(1);
    expect(result.current.todayDay?.day_number).toBe(1);
    expect(result.current.isDayUnlocked(1)).toBe(true);
    expect(result.current.isDayUnlocked(2)).toBe(false);
    expect(result.current.dayState(1)).toBe('today');
    expect(result.current.dayState(2)).toBe('future');
  });

  test('MEIO da campanha (dia 50): anteriores liberados, futuros bloqueados', async () => {
    const { result } = await mountOnDay(50);
    expect(result.current.phase).toBe('running');
    expect(result.current.officialDay).toBe(50);
    expect(result.current.isDayUnlocked(49)).toBe(true);
    expect(result.current.isDayUnlocked(50)).toBe(true);
    expect(result.current.isDayUnlocked(51)).toBe(false);
    expect(result.current.dayState(49)).toBe('pending');
    expect(result.current.dayState(50)).toBe('today');
    expect(result.current.dayState(51)).toBe('future');
  });

  test('DIA 100: último dia da campanha ainda em curso', async () => {
    const { result } = await mountOnDay(100);
    expect(result.current.phase).toBe('running');
    expect(result.current.officialDay).toBe(100);
    expect(result.current.todayDay?.day_number).toBe(100);
    expect(result.current.isDayUnlocked(100)).toBe(true);
    expect(result.current.dayState(100)).toBe('today');
  });

  test('DEPOIS da campanha: fase finished, dia oficial fixo em 100 e tudo acessível', async () => {
    const { result } = await mountOnDay(130);
    expect(result.current.phase).toBe('finished');
    expect(result.current.officialDay).toBe(100);
    expect(result.current.isDayUnlocked(1)).toBe(true);
    expect(result.current.isDayUnlocked(100)).toBe(true);
    expect(result.current.isDayUnlocked(101)).toBe(false);
    // Depois do fim nenhum dia é "hoje"; os não lidos seguem pendentes.
    expect(result.current.dayState(100)).toBe('pending');
    expect(result.current.pendingDays).toContain(100);
  });
});

describe('painel DEV: simular o dia oficial', () => {
  async function mountWithOverride(dayOverride: number) {
    await AsyncStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ onboardingCompleted: true, dev: { dayOverride } }),
    );
    _resetSettingsCacheForTests();
    return mountOnDay(-5);
  }

  test('um dia dentro da campanha força a fase em curso', async () => {
    const { result } = await mountWithOverride(25);
    await waitFor(() => expect(result.current.officialDay).toBe(25));
    expect(result.current.phase).toBe('running');
  });

  test('"Depois da campanha" (LACUNAS B35) simula o encerramento: fase finished, dia fixo em 100', async () => {
    const { result } = await mountWithOverride(101);
    await waitFor(() => expect(result.current.phase).toBe('finished'));
    expect(result.current.officialDay).toBe(100);
    expect(result.current.dayState(100)).toBe('pending');
    expect(result.current.isDayUnlocked(101)).toBe(false);
  });
});

describe('entrada tardia e atraso', () => {
  test('igreja no dia 17: usuário entra no dia 17, sem backlog obrigatório', async () => {
    const { result } = await mountOnDay(17);
    expect(result.current.officialDay).toBe(17);
    expect(result.current.todayDay?.day_number).toBe(17);
    expect(result.current.completedCount).toBe(0);
    // Os 16 dias anteriores seguem acessíveis, e não bloqueiam o dia de hoje.
    expect(result.current.isDayUnlocked(1)).toBe(true);
    expect(result.current.isDayUnlocked(16)).toBe(true);
    expect(result.current.pendingDays).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  test('atraso NÃO replaneja o calendário individual: o dia oficial segue a campanha', async () => {
    const { result } = await mountOnDay(30);
    expect(result.current.officialDay).toBe(30);

    // A pessoa lê só o dia 10, no próprio dia 10, e some por 20 dias.
    await AsyncStorage.setItem(
      `${COMPLETIONS_PREFIX}${CAMPAIGN_ID}`,
      JSON.stringify({ days: { 10: new Date(Date.now() - 20 * DAY_MS).toISOString() }, updatedAt: '' }),
    );
    _resetCompletionsCacheForTests();
    const again = await mountOnDay(30);
    await waitFor(() => expect(again.result.current.completedCount).toBe(1));

    // O dia de hoje continua sendo o 30 da igreja, não "o dia 11 dela".
    expect(again.result.current.officialDay).toBe(30);
    expect(again.result.current.todayDay?.day_number).toBe(30);
    // DIA-02: a lacuna conta desde QUANDO leu (há 20 dias), não o número do dia lido.
    expect(again.result.current.gapDays).toBe(20);
    expect(again.result.current.welcomeBack).toBe(true);
    expect(again.result.current.isDayUnlocked(31)).toBe(false);
  });

  test('DIA-02: entrou no dia 20 e leu o Dia 1 hoje — não é "de volta"', async () => {
    const { result } = await mountOnDay(20);
    await setDayCompleted(CAMPAIGN_ID, 1, true);
    await waitFor(() => expect(result.current.completedCount).toBe(1));
    expect(result.current.gapDays).toBe(0);
    expect(result.current.welcomeBack).toBe(false);
  });
});

describe('gating de conteúdo futuro', () => {
  test('o dataset tem os 100 dias, mas só os liberados podem ser abertos', async () => {
    const { result } = await mountOnDay(17);
    const locked = [18, 19, 50, 100].filter((d) => !result.current.isDayUnlocked(d));
    expect(locked).toEqual([18, 19, 50, 100]);
    expect(getCampaign().total_days).toBe(100);
  });
});
