import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, useWindowDimensions } from 'react-native';

import JourneyScreen from '@/app/(tabs)/jornada';
import MilestoneScreen from '@/app/marco/[day]';
import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { GAP_ROW_H, journeyRowHeight } from '@/journey/journeyRowHeight';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { Button } from '@/ui/components';
import { SpherePill } from '@/ui/SpherePill';
import { MIN_TOUCH } from '@/ui/theme';

import { AX5, resetViewport, setViewport } from './support/viewport';

/** Lido na carga do módulo, antes de qualquer `beforeEach` mexer no viewport. */
const HARNESS_DEFAULT = Dimensions.get('window');

let mockParams: { day: string } = { day: '100' };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

/** Estilo resolvido do nó, já achatado — é o que o Yoga receberia. */
function box(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, number | undefined>;
}

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

beforeEach(async () => {
  // Restaurar ANTES de cada teste, nunca depois: um `act` de limpeza no fim
  // envenena o arquivo inteiro (medido — ver o comentário em support/viewport).
  resetViewport();
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true }));
  _resetSettingsCacheForTests();
});

afterAll(() => {
  resetViewport();
  resetToDevFixtures();
});

/* ------------------------------------------------------------------ harness */

/**
 * Meta-teste: sem ele, todos os outros podem estar verdes afirmando os valores
 * do viewport padrão do harness (750×1334 @ fontScale 2) em vez do que pedem.
 */
describe('o harness enxerga o tamanho de fonte que o teste pede', () => {
  function Probe() {
    const { width, fontScale } = useWindowDimensions();
    return <Text testID="probe">{`${width}|${fontScale}`}</Text>;
  }

  test('o padrão do jest-expo NÃO é um telefone com fonte normal', () => {
    // Registrado de propósito: é por isso que "a suíte passa" nunca significou
    // que a meta de 200% do ARCHITECTURE_V0 §12 estava cumprida. Todo teste
    // deste repositório que não fixa o viewport roda em 750px com fonte 2×.
    expect({ width: HARNESS_DEFAULT.width, fontScale: HARNESS_DEFAULT.fontScale }).toEqual({
      width: 750,
      fontScale: 2,
    });
  });

  test('setViewport antes do render chega ao componente', async () => {
    setViewport(AX5);
    await render(<Probe />);
    expect(screen.getByTestId('probe').props.children).toBe(`390|${AX5}`);
  });

  test('resetViewport devolve o telefone de referência com fonte normal', async () => {
    resetViewport();
    await render(<Probe />);
    expect(screen.getByTestId('probe').props.children).toBe('390|1');
  });
});

/* ------------------------------------------------------------------- Button */

const VARIANTS = ['primary', 'yellow', 'outline', 'danger', 'underline'] as const;
/** Pisos do handoff. O underline pede 44, mas 44 é abaixo do alvo de toque. */
const FLOOR: Record<(typeof VARIANTS)[number], number> = {
  primary: 56,
  yellow: 56,
  outline: 52,
  danger: 48,
  underline: 48,
};

describe('Button: a caixa cede ao texto, e o alvo de toque não cede a ninguém', () => {
  test.each(VARIANTS)('%s não trava altura e nunca desce do alvo de toque', async (variant) => {
    for (const scale of [1, 2, AX5]) {
      resetViewport();
      setViewport(scale);
      const view = await render(
        <Button title="Guardar minha jornada" variant={variant} onPress={() => {}} testID="btn" />,
      );
      const style = box('btn');
      expect(style.height).toBeUndefined();
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
      await view.unmount();
    }
  });

  test('com fonte padrão a geometria do handoff não se mexe', async () => {
    for (const variant of VARIANTS) {
      const view = await render(<Button title="Concluir leitura" variant={variant} onPress={() => {}} testID="btn" />);
      expect(box('btn').minHeight).toBe(FLOOR[variant]);
      await view.unmount();
    }
  });
});

describe('SpherePill: o monte é conteúdo da igreja, então a pílula é que cresce', () => {
  test('não trava altura e mantém o piso do handoff', async () => {
    setViewport(AX5);
    await render(<SpherePill sphere="educacao" testID="pill" />);
    const style = box('pill');
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(28);
  });
});

/* ------------------------------------------------------------------ Jornada */

describe('Jornada: a lista declara a altura que desenha', () => {
  const ctx = { officialDay: 17, ministryDays: new Set<number>() };

  test('a reticência não escala, porque ela não cresce na tela', () => {
    for (const scale of [1, 1.5, 2, AX5]) {
      expect(journeyRowHeight({ kind: 'gap', from: 1, to: 16 }, ctx, scale)).toBe(GAP_ROW_H);
    }
  });

  test('a linha da reticência renderiza o mesmo número que o getItemLayout declara', async () => {
    setViewport(1.5);
    loadCampaignOnDay(17);
    await render(<JourneyScreen />);
    await waitFor(() => expect(screen.getByTestId('journey-day-17')).toBeTruthy());

    // Há reticência antes e depois de hoje: as duas têm de bater.
    const gaps = screen.getAllByLabelText(/^Mostrar os dias \d+ a \d+$/);
    expect(gaps.length).toBeGreaterThan(0);
    const declared = journeyRowHeight({ kind: 'gap', from: 1, to: 16 }, ctx, 1.5);
    for (const gap of gaps) {
      expect(StyleSheet.flatten(gap.props.style).minHeight).toBe(declared);
    }
  });

  test('a linha de hoje cresce com a fonte, e o teto de 2× está onde dissemos', async () => {
    const heights: number[] = [];
    for (const scale of [1, 2, AX5]) {
      resetViewport();
      setViewport(scale);
      loadCampaignOnDay(17);
      const view = await render(<JourneyScreen />);
      await waitFor(() => expect(screen.getByTestId('journey-day-17')).toBeTruthy());
      heights.push(StyleSheet.flatten(screen.getByTestId('journey-day-17').props.style).minHeight);
      await view.unmount();
    }
    const [normal, double, ax5] = heights;
    expect(double).toBeGreaterThan(normal);
    // Dívida consciente, não esquecimento: quando alguém subir o teto, este
    // teste cai e obriga a decisão a ser tomada de novo.
    expect(ax5).toBe(double);
  });
});

/* ------------------------------------------------------------------- Dia 100 */

describe('Dia 100: o numeral conhece as duas coisas que o esticam', () => {
  async function numeralSize(scale: number) {
    resetViewport();
    setViewport(scale);
    loadCampaignOnDay(100);
    const view = await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByLabelText('Dia 100')).toBeTruthy());
    const size = StyleSheet.flatten(screen.getByLabelText('Dia 100').props.style).fontSize as number;
    await view.unmount();
    return size;
  }

  test('com fonte padrão fica idêntico ao desenho de hoje, e encolhe em fonte grande', async () => {
    const normal = await numeralSize(1);
    const large = await numeralSize(2);
    expect(normal).toBe(167);
    expect(large).toBeLessThan(normal);
  });
});
