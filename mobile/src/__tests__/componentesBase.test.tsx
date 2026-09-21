import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppText, Button, Checkbox, ChoiceRow, JourneyNode } from '@/ui/components';
import { GlassTabBar } from '@/ui/TabBar';
import { _setBoldTextForTests, BRAND_YELLOW, faces, palettes, promoteFace } from '@/ui/theme';

import { resetViewport } from './support/viewport';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

const mockScheme = { value: 'light' as 'light' | 'dark' };
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockScheme.value,
}));

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

beforeEach(() => {
  resetViewport();
  mockScheme.value = 'light';
  _setBoldTextForTests(false);
});

/**
 * Componentes-base do redesenho (TOKENS.md §5). Estes testes afirmam o resultado
 * da composição — o estilo que chega ao nó —, não a existência de uma linha.
 */
describe('nó da jornada: quatro estados, quatro formas', () => {
  test.each([
    ['done', { width: 13, backgroundColor: palettes.light.text }],
    ['open', { width: 14, borderWidth: 3, borderColor: palettes.light.blue }],
    ['today', { width: 20, backgroundColor: BRAND_YELLOW, borderWidth: 3, borderColor: palettes.light.text }],
    ['future', { width: 7, backgroundColor: palettes.light.borderStrong }],
  ] as const)('%s', async (state, expected) => {
    await render(<JourneyNode state={state} testID="node" />);
    expect(flat(screen.getByTestId('node', { includeHiddenElements: true }))).toMatchObject(expected);
  });

  test('nenhum par de estados tem a mesma forma — o estado nunca depende só de cor', async () => {
    const sizes = new Set<unknown>();
    for (const state of ['done', 'open', 'today', 'future'] as const) {
      const view = await render(<JourneyNode state={state} testID="node" />);
      sizes.add(flat(screen.getByTestId('node', { includeHiddenElements: true })).width);
      await view.unmount();
    }
    expect(sizes.size).toBe(4);
  });
});

describe('botão em superfície fixa não muda com o tema', () => {
  // O defeito que isto evita: no tema escuro, o primário sobre o amarelo fixo
  // viraria branco com rótulo escuro, porque `text` e `surface` invertem.
  test.each(['light', 'dark'] as const)('primário sobre amarelo, tema %s: tinta com rótulo branco', async (scheme) => {
    mockScheme.value = scheme;
    await render(<Button title="Continuar a jornada" tone="yellow" onPress={() => {}} testID="btn" />);
    expect(flat(screen.getByTestId('btn')).backgroundColor).toBe('#111111');
    expect(flat(screen.getByText('Continuar a jornada')).color).toBe('#FFFFFF');
  });

  test.each(['light', 'dark'] as const)('sublinhado sobre tinta, tema %s: branco', async (scheme) => {
    mockScheme.value = scheme;
    await render(<Button title="Guardar só para mim" variant="underline" tone="ink" onPress={() => {}} />);
    expect(flat(screen.getByText('Guardar só para mim')).color).toBe('#FFFFFF');
  });

  test('o nome antigo `onInk` continua valendo como tone="ink"', async () => {
    await render(<Button title="Guardar" variant="underline" onInk onPress={() => {}} />);
    expect(flat(screen.getByText('Guardar')).color).toBe('#FFFFFF');
  });
});

describe('botão: nome acessível e piso', () => {
  test('carregando, o botão continua com nome para o leitor de tela', async () => {
    await render(<Button title="Salvar para mim" loading onPress={() => {}} testID="btn" />);
    expect(screen.queryByText('Salvar para mim')).toBeNull();
    expect(screen.getByLabelText('Salvar para mim')).toBeTruthy();
    expect(screen.getByTestId('btn').props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  test('o azul é a variante nova da comunidade: fundo azul, rótulo onBlue', async () => {
    await render(<Button title="Escrever para a igreja" variant="blue" onPress={() => {}} testID="btn" />);
    expect(flat(screen.getByTestId('btn')).backgroundColor).toBe(palettes.light.blue);
    expect(flat(screen.getByText('Escrever para a igreja')).color).toBe(palettes.light.onBlue);
  });
});

describe('controles com limite medido', () => {
  test('caixa de marcação: 28×28, raio 8 (TELAS A3), borda em controlBorder', async () => {
    await render(<Checkbox checked={false} onToggle={() => {}} label="Cumpri meu jejum hoje" testID="box" />);
    const inner = screen.getByTestId('box').children[0] as never;
    expect(flat(inner)).toMatchObject({ width: 28, height: 28, borderRadius: 8, borderColor: palettes.light.controlBorder });
  });

  test('opção não selecionada tem limite de 3:1 — `controlBorder`, não o `borderStrong` de 1,44:1', async () => {
    await render(<ChoiceRow label="Usar a minha Bíblia" selected={false} onPress={() => {}} testID="opt" />);
    expect(flat(screen.getByTestId('opt')).borderColor).toBe(palettes.light.controlBorder);
  });
});

describe('"Texto em Negrito" do sistema (REGRAS 31)', () => {
  test('cada face sobe um degrau dentro das oito empacotadas; 800 e itálico ficam', () => {
    expect(promoteFace(faces.sg400)).toBe(faces.sg500);
    expect(promoteFace(faces.sg500)).toBe(faces.sg600);
    expect(promoteFace(faces.sg600)).toBe(faces.sg700);
    expect(promoteFace(faces.sg700)).toBe(faces.sg800);
    expect(promoteFace(faces.sg800)).toBe(faces.sg800);
    expect(promoteFace(faces.ss400)).toBe(faces.ss600);
    expect(promoteFace(faces.ss400i)).toBe(faces.ss400i);
  });

  test('ligado, o texto troca de face — inclusive quando a tela sobrescreve a face', async () => {
    await render(
      <>
        <AppText variant="caption">legenda</AppText>
        <AppText variant="caption" style={{ fontFamily: faces.sg700 }}>
          sobrescrita
        </AppText>
      </>,
    );
    expect(flat(screen.getByText('legenda')).fontFamily).toBe(faces.sg500);
    await act(async () => _setBoldTextForTests(true));
    expect(flat(screen.getByText('legenda')).fontFamily).toBe(faces.sg600);
    expect(flat(screen.getByText('sobrescrita')).fontFamily).toBe(faces.sg800);
  });

  test('ligado, o rótulo do botão também promove', async () => {
    _setBoldTextForTests(true);
    await render(<Button title="Ler agora" onPress={() => {}} />);
    expect(flat(screen.getByText('Ler agora')).fontFamily).toBe(faces.sg800);
  });
});

describe('barra de navegação flutuante', () => {
  const routes = [
    { key: 'jornada', name: 'jornada' },
    { key: 'comunidade', name: 'comunidade' },
    { key: 'voce', name: 'voce' },
  ];
  const descriptors = {
    jornada: { options: { title: 'Jornada' } },
    comunidade: { options: { title: 'Comunidade' } },
    voce: { options: { title: 'Você' } },
  };

  test('três destinos com rótulo, a aba ativa em markSurface com rótulo em onMark', async () => {
    await render(
      <GlassTabBar
        state={{ index: 1, routes }}
        descriptors={descriptors}
        navigation={{ emit: () => ({ defaultPrevented: false }), navigate: () => {} }}
      />,
    );
    const active = screen.getByTestId('tab-comunidade');
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    expect(flat(active).backgroundColor).toBe(palettes.light.markSurface);
    expect(flat(screen.getByText('Comunidade')).color).toBe(palettes.light.onMark);
    expect(flat(screen.getByText('Jornada')).color).toBe(palettes.light.navInactive);
    // Todo destino tem alvo de 48 e rótulo em texto — nenhum ícone sozinho.
    for (const name of ['Jornada', 'Comunidade', 'Você']) expect(screen.getByLabelText(name)).toBeTruthy();
    expect(flat(active).minHeight).toBe(48);
  });

  test('flutua acima da área do indicador de home, a 26 do fundo', async () => {
    await render(
      <GlassTabBar
        state={{ index: 0, routes }}
        descriptors={descriptors}
        navigation={{ emit: () => ({ defaultPrevented: false }), navigate: () => {} }}
      />,
    );
    // Com a área segura de 34 do iPhone, max(26, 34 − 8) = 26.
    const bar = screen.getByTestId('tab-bar');
    expect(flat(bar)).toMatchObject({ position: 'absolute', left: 20, right: 20, bottom: 26 });
  });
});
