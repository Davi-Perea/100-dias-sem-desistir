import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import IntercessionScreen from '@/app/intercessao/[day]';
import MilestoneScreen, { statLabel } from '@/app/marco/[day]';
import { loadDataset, resetToBundledContent, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { flowSteps } from '@/journey/proposito';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { _resetFastingCacheForTests, setFastingKept } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, getCachedSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { ALTAR_FOOTER_MIN, ALTAR_PREVIOUS_INACTIVE } from '@/ui/altar/AltarFooter';
import { MIN_TOUCH, fixedPalette, palettes } from '@/ui/theme';

/**
 * Correções do grupo E (intercessão e marcos), achados R3-1 a R3-13 da revisão
 * de telas. Cada bloco cita o achado que protege.
 */

let mockParams: { day: string } = { day: '25' };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
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

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

/** A barra de status vira um nó consultável: o estilo fica no nativeID. */
jest.mock('expo-status-bar', () => {
  const { View } = jest.requireActual('react-native');
  return { StatusBar: ({ style }: { style?: string }) => <View testID="status-bar" nativeID={style} /> };
});

const mockScheme = { value: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme.value,
}));

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  canGoBack: jest.Mock;
};

const CAMPAIGN = 'dev-fixture-campaign';
const INK = fixedPalette('ink');
const YELLOW = fixedPalette('yellow');
const STEPS = flowSteps();

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('fixture inválida no teste');
}

async function completeDays(days: number[]) {
  for (const day of days) await setDayCompleted(CAMPAIGN, day, true);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockRouter.canGoBack.mockReset();
  mockRouter.canGoBack.mockReturnValue(true);
  mockScheme.value = 'light';
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', milestonesSeen: [] }),
  );
  _resetSettingsCacheForTests();
});

afterEach(() => {
  resetToBundledContent();
});

describe('E3 · marco', () => {
  beforeEach(async () => {
    mockParams = { day: '25' };
    loadCampaignOnDay(60);
    await completeDays(Array.from({ length: 25 }, (_, i) => 11 + i * 2));
  });

  test('R3-1: se a gravação falha, nada é confirmado', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(getCachedSettings()?.milestonesSeen).toEqual([25]));
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disco cheio'));
    try {
      fireEvent.press(screen.getByTestId('milestone-keep'));
      await waitFor(() => expect(setItem).toHaveBeenCalled());
      // Deixa a promessa rejeitada assentar antes de conferir.
      await waitFor(() => expect(screen.getByText('Guardar este marco')).toBeTruthy());
      expect(screen.queryByText('Marco guardado')).toBeNull();
    } finally {
      setItem.mockRestore();
    }
  });

  test('R3-5: depois do toque o retorno é texto em cor plena, com o botão ativo', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-keep')).toBeTruthy());
    fireEvent.press(screen.getByTestId('milestone-keep'));
    await waitFor(() => expect(screen.getByText('Marco guardado')).toBeTruthy());
    const keep = screen.getByTestId('milestone-keep');
    expect(keep.props.accessibilityState).toMatchObject({ disabled: false });
    expect(flat(keep).opacity ?? 1).toBe(1);
    expect(flat(screen.getByText('Marco guardado')).color).toBe(YELLOW.text);
  });

  test('R3-11: o numeral não repete o número que a cap já diz', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByLabelText('Marco: 25 de 100 dias lidos')).toBeTruthy());
    const numeral = screen.getByTestId('milestone-numeral', { includeHiddenElements: true });
    expect(numeral.props['aria-hidden']).toBe(true);
    expect(screen.queryByLabelText('25 dias lidos')).toBeNull();
  });

  test('R3-13: no tema escuro, a superfície amarela e seu conteúdo não mudam', async () => {
    mockScheme.value = 'dark';
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-label')).toBeTruthy());
    expect(flat(screen.getByTestId('milestone-label')).color).toBe(YELLOW.onAccent);
    // Frase do marco: textSecondary do claro, #3F3D38, também no escuro.
    expect(flat(screen.getByText('Vinte e cinco dias de Palavra. Você não desistiu.')).color).toBe('#3F3D38');
    expect(flat(screen.getByText('Guardar este marco')).color).toBe(YELLOW.text);
    expect(flat(screen.getByText('Guardar este marco')).color).not.toBe(palettes.dark.text);
    expect(screen.getByTestId('status-bar', { includeHiddenElements: true }).props.nativeID).toBe('dark');
    expect(flat(screen.getByTestId('milestone-keep')).minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
  });
});

describe('E4 · chegada', () => {
  beforeEach(async () => {
    mockParams = { day: '100' };
    loadCampaignOnDay(100);
    await completeDays(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  test('R3-10: com 1 reflexão e 1 jejum, o rótulo fica no singular', async () => {
    await saveReflection(CAMPAIGN, 5, 'Uma reflexão de teste.');
    await setFastingKept(CAMPAIGN, 5, true);
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByLabelText('1 reflexão escrita')).toBeTruthy());
    expect(screen.getByLabelText('1 dia de jejum')).toBeTruthy();
    expect(screen.getByText('reflexão escrita')).toBeTruthy();
    expect(screen.getByText('dia de jejum')).toBeTruthy();
    expect(screen.queryByText(/1 reflexões|1 dias/)).toBeNull();
  });

  test('R3-10: statLabel escolhe singular só para 1', () => {
    expect(statLabel(0, 'dia lido', 'dias lidos')).toBe('dias lidos');
    expect(statLabel(1, 'dia lido', 'dias lidos')).toBe('dia lido');
    expect(statLabel(2, 'dia lido', 'dias lidos')).toBe('dias lidos');
  });

  test('R3-11: o numeral "100" não repete o que a cap já diz', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByLabelText(/^Chegada, dia 100, /)).toBeTruthy());
    expect(screen.queryByLabelText('Dia 100')).toBeNull();
  });

  test('R3-13: no tema claro, a tinta e seu conteúdo não mudam', async () => {
    mockScheme.value = 'light';
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-label')).toBeTruthy());
    expect(flat(screen.getByTestId('milestone-label')).color).toBe(INK.text);
    expect(flat(screen.getByTestId('milestone-verse')).color).toBe('#C7C4BD');
    expect(screen.getByTestId('status-bar', { includeHiddenElements: true }).props.nativeID).toBe('light');
  });
});

describe('E1 · intercessão', () => {
  beforeEach(() => {
    mockParams = { day: '17' };
    resetToDevFixtures(new Date());
    loadCampaignOnDay(17);
  });

  test('R3-4: sem pilha (deep link), o voltar diz o destino real, "Jornada"', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByTestId('flow-step-1')).toBeTruthy());
    expect(screen.getByLabelText('Voltar para Jornada')).toBeTruthy();
    expect(screen.queryByLabelText('Voltar para Dia 17')).toBeNull();
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  test('R3-8: a referência do versículo-base usa o tratamento do A3 (Source Serif 19/28)', async () => {
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByTestId('intercession-key-verse')).toBeTruthy());
    const style = flat(screen.getByTestId('intercession-key-verse'));
    expect(style.fontSize).toBe(19);
    expect(style.lineHeight).toBe(28);
  });
});

describe('E2 · modo altar', () => {
  beforeEach(() => {
    mockParams = { day: '17' };
    resetToDevFixtures(new Date());
    loadCampaignOnDay(17);
  });

  async function enterAltar() {
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.getByTestId('enter-altar-mode')).toBeTruthy());
    fireEvent.press(screen.getByTestId('enter-altar-mode'));
    await waitFor(() => expect(screen.getByText('Passo 1 de 5')).toBeTruthy());
  }

  test('R3-2: o "‹" fica montado no passo 1, inativo, e é o mesmo elemento em todos os passos', async () => {
    await enterAltar();
    const previous = screen.getByTestId('altar-previous');
    expect(previous.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flat(previous).borderColor).toBe(ALTAR_PREVIOUS_INACTIVE);
    expect(flat(previous).minWidth).toBe(ALTAR_FOOTER_MIN);

    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());
    const active = screen.getByTestId('altar-previous');
    expect(active.props.accessibilityState).toMatchObject({ disabled: false });
    expect(flat(active).borderColor).toBe(INK.text);

    // Voltar ao passo 1 não desmonta o botão que tinha o foco.
    fireEvent.press(active);
    await waitFor(() => expect(screen.getByText('Passo 1 de 5')).toBeTruthy());
    expect(screen.getByTestId('altar-previous')).toBe(active);
    expect(screen.getByTestId('altar-previous').props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('R3-3: cada passo começa com a rolagem no topo (a lista rolável é nova)', async () => {
    await enterAltar();
    const first = screen.getByTestId('altar-scroll');
    fireEvent.press(screen.getByTestId('altar-next'));
    await waitFor(() => expect(screen.getByText('Passo 2 de 5')).toBeTruthy());
    expect(screen.getByTestId('altar-scroll')).not.toBe(first);
  });

  test('R3-6: o nome acessível do botão amarelo contém o texto visível', async () => {
    await enterAltar();
    for (let i = 0; i < STEPS.length; i += 1) {
      const next = screen.getByTestId('altar-next');
      const visible = i === STEPS.length - 1 ? 'Concluir' : `Passo ${i + 2}`;
      expect(within(next).getByText(visible)).toBeTruthy();
      expect(String(next.props.accessibilityLabel)).toContain(visible);
      if (i < STEPS.length - 1) {
        fireEvent.press(next);
        await waitFor(() => expect(screen.getByText(`Passo ${i + 2} de 5`)).toBeTruthy());
      }
    }
  });

  test('R3-13: no tema claro, a tinta do modo altar não muda, e os alvos têm piso', async () => {
    mockScheme.value = 'light';
    await enterAltar();
    expect(flat(screen.getByTestId('altar-step-title')).color).toBe('#FFFFFF');
    expect(flat(screen.getByText('Sair')).color).toBe('#FFFFFF');
    expect(flat(screen.getByTestId('altar-step-count')).color).toBe(INK.accent);
    expect(screen.getByTestId('status-bar', { includeHiddenElements: true }).props.nativeID).toBe('light');
    expect(flat(screen.getByTestId('exit-altar-mode')).minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(flat(screen.getByTestId('altar-next')).minHeight).toBeGreaterThanOrEqual(ALTAR_FOOTER_MIN);
    expect(flat(screen.getByTestId('altar-previous')).minHeight).toBeGreaterThanOrEqual(ALTAR_FOOTER_MIN);
  });

  test('R3-13: no tema escuro, o mesmo', async () => {
    mockScheme.value = 'dark';
    await enterAltar();
    expect(flat(screen.getByTestId('altar-step-title')).color).toBe('#FFFFFF');
    expect(flat(screen.getByText('Sair')).color).toBe('#FFFFFF');
    expect(flat(screen.getByTestId('altar-step-count')).color).toBe(INK.accent);
  });
});
