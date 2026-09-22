import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { AppText, Block, Checkbox, Highlight, Screen, Sheet } from '@/ui/components';
import { TextSizeSheet } from '@/ui/leitor/TextSizeSheet';
import { glass, palettes } from '@/ui/theme';

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
  mockScheme.value = 'light';
});

/**
 * TEMA_ESCURO_PROPOSTA: as correções técnicas chegam ao nó renderizado no
 * escuro, e o claro sai igual ao de antes. As medidas estão em contrast.test.ts.
 */
describe('achado 1 · realce amarelo', () => {
  test.each(['light', 'dark'] as const)('tema %s: a palavra realçada é tinta, mesmo dentro de texto branco', async (scheme) => {
    mockScheme.value = scheme;
    await render(
      <AppText variant="body">
        a igreja <Highlight>está aqui</Highlight>
      </AppText>,
    );
    expect(flat(screen.getByText('está aqui'))).toMatchObject({ color: '#111111', backgroundColor: '#FFD100' });
  });
});

describe('achado 2 · bloco sobre fundo quente', () => {
  const Warm = ({ tone }: { tone: 'surface' | 'warm' }) => (
    <Screen tone="warm">
      <Block tone={tone} testID="blk">
        <Text>x</Text>
      </Block>
    </Screen>
  );

  test('escuro: bloco surface sobre tela quente sobe para surfaceMuted e mantém a borda', async () => {
    mockScheme.value = 'dark';
    await render(<Warm tone="surface" />);
    expect(flat(screen.getByTestId('blk'))).toMatchObject({
      backgroundColor: palettes.dark.surfaceMuted,
      borderColor: glass.blockBorderDark,
      borderWidth: 1,
    });
  });

  test('claro: bloco surface sobre tela quente continua branco', async () => {
    await render(<Warm tone="surface" />);
    expect(flat(screen.getByTestId('blk')).backgroundColor).toBe(palettes.light.surface);
  });

  test('escuro: bloco surface sobre a página continua surface', async () => {
    mockScheme.value = 'dark';
    await render(
      <Screen>
        <Block testID="blk">
          <Text>x</Text>
        </Block>
      </Screen>,
    );
    expect(flat(screen.getByTestId('blk')).backgroundColor).toBe(palettes.dark.surface);
  });

  test('escuro: bloco quente sobre a tela quente continua quente', async () => {
    mockScheme.value = 'dark';
    await render(<Warm tone="warm" />);
    expect(flat(screen.getByTestId('blk')).backgroundColor).toBe(palettes.dark.surfaceWarm);
  });

  test('escuro: dentro da folha, o bloco quente sobe e o surface não herda o quente da tela', async () => {
    mockScheme.value = 'dark';
    await render(
      <Screen tone="warm">
        <Sheet visible onClose={() => {}} testID="sheet">
          <Block tone="warm" testID="blk">
            <Text>x</Text>
          </Block>
          <Block tone="surface" testID="blk2">
            <Text>y</Text>
          </Block>
        </Sheet>
      </Screen>,
    );
    expect(flat(screen.getByTestId('blk')).backgroundColor).toBe(palettes.dark.surfaceMuted);
    expect(flat(screen.getByTestId('blk2')).backgroundColor).toBe(palettes.dark.surface);
  });

  test('claro: bloco quente dentro da folha continua quente', async () => {
    await render(
      <Sheet visible onClose={() => {}}>
        <Block tone="warm" testID="blk">
          <Text>x</Text>
        </Block>
      </Sheet>,
    );
    expect(flat(screen.getByTestId('blk')).backgroundColor).toBe(palettes.light.surfaceWarm);
  });
});

describe('achado 3 · folha modal separada do véu', () => {
  test('escuro: filete de 1px no topo', async () => {
    mockScheme.value = 'dark';
    await render(
      <Sheet visible onClose={() => {}} testID="sheet">
        <Text>x</Text>
      </Sheet>,
    );
    expect(flat(screen.getByTestId('sheet'))).toMatchObject({ borderTopWidth: 1, borderColor: glass.hairlineDark });
  });

  test('claro: sem filete, como antes', async () => {
    await render(
      <Sheet visible onClose={() => {}} testID="sheet">
        <Text>x</Text>
      </Sheet>,
    );
    expect(flat(screen.getByTestId('sheet')).borderTopWidth).toBeUndefined();
  });
});

describe('achado 4 · limite de caixa no escuro', () => {
  test('caixa de jejum desmarcada usa controlBorder, não borderStrong', async () => {
    mockScheme.value = 'dark';
    await render(<Checkbox checked={false} onToggle={() => {}} label="Cumpri meu jejum hoje" testID="box" />);
    const inner = screen.getByTestId('box').children[0] as never;
    expect(flat(inner).borderColor).toBe(palettes.dark.controlBorder);
  });
});

describe('achado 2 · amostra da B3 (tamanho do texto)', () => {
  const sheet = () => <TextSizeSheet visible onClose={() => {}} size={19} onStep={() => {}} />;

  test('escuro: a amostra quente dentro da folha sobe para surfaceMuted', async () => {
    mockScheme.value = 'dark';
    await render(sheet());
    expect(flat(screen.getByTestId('text-size-sample-box')).backgroundColor).toBe(palettes.dark.surfaceMuted);
  });

  test('claro: a amostra continua quente', async () => {
    await render(sheet());
    expect(flat(screen.getByTestId('text-size-sample-box')).backgroundColor).toBe(palettes.light.surfaceWarm);
  });
});
