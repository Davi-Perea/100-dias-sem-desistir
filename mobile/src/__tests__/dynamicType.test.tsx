import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, useWindowDimensions } from 'react-native';

import JourneyHome from '@/app/(tabs)/index';
import MilestoneScreen from '@/app/marco/[day]';
import { loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { GAP_ROW_H, OPEN_ROW_H, ROW_H, journeyRowHeight, type JourneyRow } from '@/journey/journeyRowHeight';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { BACK_BAR_STACK_AT, BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/components';
import { SpherePill } from '@/ui/SpherePill';
import { ARRIVAL_NUMERAL, NUMERAL_MAX_SCALE, numeralWidth } from '@/ui/altar/milestoneNumeral';
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

const VARIANTS = ['primary', 'blue', 'yellow', 'outline', 'danger', 'underline'] as const;
/** Pisos do TOKENS.md §5: as quatro cheias em 56, as duas de texto em 48. */
const FLOOR: Record<(typeof VARIANTS)[number], number> = {
  primary: 56,
  blue: 56,
  yellow: 56,
  outline: 56,
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
    // TELAS A1: pílula do monte com piso 30.
    expect(style.minHeight).toBe(30);
  });
});

/* ------------------------------------------------------------------ Jornada */

describe('Jornada: a lista declara a altura que desenha', () => {
  // O mesmo contexto que a casa monta no dia 17 sem nada lido: 1–16 em aberto.
  const ctx = {
    todayDay: 17,
    openDays: new Set(Array.from({ length: 16 }, (_, i) => i + 1)),
    ministryDays: new Set<number>(),
  };

  test('com fonte padrão as linhas têm os pisos do desenho: 48, e 52 a em aberto', () => {
    expect(journeyRowHeight({ kind: 'day', day: 18 }, ctx, 1)).toBe(ROW_H);
    expect(journeyRowHeight({ kind: 'day', day: 5 }, ctx, 1)).toBe(OPEN_ROW_H);
    expect(journeyRowHeight({ kind: 'gap', from: 21, to: 99 }, ctx, 1)).toBe(GAP_ROW_H);
    expect([ROW_H, OPEN_ROW_H]).toEqual([48, 52]);
  });

  test('sem teto de escala: a linha cresce contando linhas até 3,571×', () => {
    const at = (scale: number) => journeyRowHeight({ kind: 'day', day: 18 }, ctx, scale);
    expect(at(2)).toBeGreaterThan(at(1));
    // A dívida do teto de 2× acabou: em AX5 a linha continua crescendo.
    expect(at(AX5)).toBeGreaterThan(at(2));
    expect(journeyRowHeight({ kind: 'gap', from: 21, to: 99 }, ctx, AX5)).toBeGreaterThan(GAP_ROW_H);
  });

  test.each([1, 1.5, 2, AX5])('em %s× cada linha renderiza o minHeight que o getItemLayout declara', async (scale) => {
    setViewport(scale);
    loadCampaignOnDay(17);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-17')).toBeTruthy());

    const list = screen.getByTestId('journey-list');
    const rows = list.props.data as JourneyRow[];
    const getItemLayout = list.props.getItemLayout as (data: unknown, index: number) => { length: number };
    // As linhas depois de hoje estão renderizadas na abertura: 18, 19, 20, a reticência e o 100.
    const checked = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.kind === 'gap' || (row.kind === 'day' && row.day > 17));
    expect(checked.length).toBeGreaterThanOrEqual(4);
    for (const { row, index } of checked) {
      const testID = row.kind === 'gap' ? `journey-gap-${row.from}` : `journey-day-${(row as { day: number }).day}`;
      const rendered = StyleSheet.flatten(screen.getByTestId(testID).props.style).minHeight;
      const declared = journeyRowHeight(row, ctx, scale);
      expect(rendered).toBe(declared);
      expect(getItemLayout(rows, index).length).toBe(declared);
    }
  });

  test('o painel de hoje entra na lista com a altura MEDIDA, não com uma constante', async () => {
    setViewport(AX5);
    loadCampaignOnDay(17);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-17')).toBeTruthy());

    await fireEvent(screen.getByTestId('journey-day-17'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 1234 } },
    });

    const list = screen.getByTestId('journey-list');
    const rows = list.props.data as JourneyRow[];
    const today = rows.findIndex((row) => row.kind === 'day' && row.day === 17);
    const getItemLayout = list.props.getItemLayout as (
      data: unknown,
      index: number,
    ) => { length: number; offset: number };
    await waitFor(() => expect(getItemLayout(rows, today).length).toBe(1234));
    // E o que vem depois de hoje começa onde o painel medido termina.
    const layout = screen.getByTestId('journey-list').props.getItemLayout as typeof getItemLayout;
    expect(layout(rows, today + 1).offset).toBe(layout(rows, today).offset + 1234);
    expect(journeyRowHeight({ kind: 'day', day: 17 }, { ...ctx, todayHeight: 1234 }, AX5)).toBe(1234);
  });
});

/* ------------------------------------------------------------ marcos (E3/E4) */

describe('Marco e Dia 100: o numeral conhece as duas coisas que o esticam', () => {
  const CAMPAIGN = 'dev-fixture-campaign';

  /** Renderiza o marco `day` com `day` leituras feitas e devolve o estilo do numeral. */
  async function numeralStyle(day: number, scale: number, size?: { width: number; height: number }) {
    resetViewport();
    setViewport(scale, size);
    mockParams = { day: String(day) };
    loadCampaignOnDay(day === 100 ? 100 : 60);
    for (let d = 1; d <= day; d++) await setDayCompleted(CAMPAIGN, d, true);
    const view = await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-numeral', { includeHiddenElements: true })).toBeTruthy());
    const style = StyleSheet.flatten(screen.getByTestId('milestone-numeral', { includeHiddenElements: true }).props.style) as Record<string, number>;
    await view.unmount();
    return style;
  }

  test('com fonte padrão, o tamanho exato do desenho (E3 180/−10, E4 150/−8)', async () => {
    // Entrelinha: a do desenho (160, 136) é menor que a altura natural da Schibsted 800
    // (1,234em) e recortava o topo dos dígitos (mesmo defeito do J1). Vale a natural.
    expect(await numeralStyle(25, 1)).toMatchObject({ fontSize: 180, lineHeight: 223, letterSpacing: -10 });
    expect(await numeralStyle(100, 1)).toMatchObject({ fontSize: 150, lineHeight: 186, letterSpacing: -8 });
  });

  test('cede tamanho em tela estreita com fonte grande, e cabe na largura útil', async () => {
    const narrow = { width: 320, height: 640 };
    const style = await numeralStyle(100, AX5, narrow);
    expect(style.fontSize).toBeLessThan(150);
    // O Text multiplica por até NUMERAL_MAX_SCALE; mesmo assim cabe em 320 − 2×24.
    const rendered = numeralWidth('100', style.fontSize * NUMERAL_MAX_SCALE, ARRIVAL_NUMERAL);
    expect(rendered).toBeLessThanOrEqual(320 - 48);
  });

  test('o rótulo do marco cresce sem teto (só o numeral de exibição cede)', async () => {
    setViewport(AX5);
    mockParams = { day: '25' };
    loadCampaignOnDay(60);
    for (let d = 1; d <= 25; d++) await setDayCompleted(CAMPAIGN, d, true);
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-label')).toBeTruthy());
    expect(screen.getByTestId('milestone-label').props.maxFontSizeMultiplier).toBeUndefined();
    expect(screen.getByTestId('milestone-numeral', { includeHiddenElements: true }).props.maxFontSizeMultiplier).toBe(NUMERAL_MAX_SCALE);
  });
});

/* ------------------------------------------------------------------ BackBar */

/**
 * R4-1: a barra de voltar era uma linha só, sem flexShrink. A 3,571× o par
 * "‹ Voltar" + "Passo 1 de 3" media ~527px numa coluna de 354 e "Excluir" (B5)
 * saía da tela. O harness não calcula layout (sem Yoga real), então o teste
 * afirma o que o Yoga receberia: empilhada, com a segunda linha quebrando, todo
 * texto podendo encolher, nenhuma altura travada e os alvos com piso de 48.
 */
describe('BackBar: em fonte grande a barra empilha e nada sai da tela', () => {
  const CASES = {
    F2: { rightText: 'Passo 1 de 3' },
    A3: { label: 'Jornada', rightText: '17/10/2026' },
    B5: {
      label: 'Cancelar',
      chevron: false,
      title: 'Dia 17',
      rightAction: { label: 'Excluir', onPress: () => {}, variant: 'danger' as const, testID: 'delete' },
    },
  };

  test.each(Object.keys(CASES) as (keyof typeof CASES)[])('%s a 3,571×: voltar numa linha, o resto na seguinte', async (name) => {
    setViewport(AX5);
    await render(<BackBar {...CASES[name]} />);
    expect(box('back-bar').flexDirection).toBe('column');
    const second = box('back-bar-second-row');
    expect(second.flexWrap).toBe('wrap');
    expect(second.height).toBeUndefined();

    const back = box('back-button');
    expect(back.flexShrink).toBe(1);
    expect(back.height).toBeUndefined();
    expect(back.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(box('back-bar-label').flexShrink).toBe(1);
    if (name !== 'B5') expect(box('back-bar-right-text').flexShrink).toBe(1);
  });

  test('B5 a 3,571×: "Excluir" continua na árvore, alcançável e com alvo de 48', async () => {
    setViewport(AX5);
    const onDelete = jest.fn();
    await render(<BackBar {...CASES.B5} rightAction={{ ...CASES.B5.rightAction, onPress: onDelete }} />);
    const del = screen.getByTestId('delete');
    const style = box('delete');
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(style.flexShrink).toBe(1);
    expect(StyleSheet.flatten(screen.getByText('Excluir').props.style).flexShrink).toBe(1);
    expect(box('back-bar-title').flexShrink).toBe(1);
    await fireEvent.press(del);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('com fonte padrão a linha do desenho não muda, e mesmo assim o texto pode ceder', async () => {
    setViewport(1);
    await render(<BackBar {...CASES.B5} />);
    expect(box('back-bar').flexDirection).toBe('row');
    expect(screen.queryByTestId('back-bar-second-row')).toBeNull();
    expect(box('back-button').flexShrink).toBe(1);
    expect(box('back-bar-title').textAlign).toBe('center');
  });

  test('o limiar é o mesmo da linha de dia da Jornada', () => {
    expect(BACK_BAR_STACK_AT).toBe(1.6);
  });
});
