import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BackBar } from '@/ui/BackBar';
import { LockedDayScreen, LockSheet, lockCopy } from '@/ui/LockSheet';
import { LoadingCaption, SkeletonBlock, TodaySkeleton } from '@/ui/Skeleton';
import { TextField } from '@/ui/TextField';
import { _setBoldTextForTests, faces, palettes } from '@/ui/theme';

import { resetViewport } from './support/viewport';

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));

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
  jest.clearAllMocks();
  mockRouter.canGoBack.mockReturnValue(true);
});

/* ------------------------------------------------------------------- A4 */

describe('A4 · folha do dia que ainda não abriu', () => {
  test('cópia exata, título como cabeçalho e botão primário', async () => {
    const onClose = jest.fn();
    await render(<LockSheet visible onClose={onClose} dayNumber={18} dateLabel="18/10/2026" kind="leitura" />);
    expect(screen.getByText('Abre em 18/10/2026.')).toBeTruthy();
    expect(
      screen.getByText(
        'A leitura de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.',
      ),
    ).toBeTruthy();
    const title = screen.getByTestId('lock-title');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ fontFamily: faces.sg700, fontSize: 24, lineHeight: 28 });

    await fireEvent.press(screen.getByTestId('locked-day-back'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Voltar para a Jornada' })).toBeTruthy();
  });

  test('variante da intercessão mantém o "nada foi perdido" (R3-12)', async () => {
    await render(<LockSheet visible onClose={() => {}} dayNumber={40} dateLabel="31/10/2026" kind="intercessao" />);
    expect(
      screen.getByText(
        'A intercessão de cada dia abre no dia oficial da igreja. Nada foi perdido — é só ainda não ter chegado.',
      ),
    ).toBeTruthy();
    expect(lockCopy('intercessao')).not.toBe(lockCopy('leitura'));
  });

  test('círculo de 56 em surfaceMuted', async () => {
    await render(<LockSheet visible onClose={() => {}} dayNumber={18} dateLabel="18/10/2026" />);
    expect(flat(screen.getByTestId('lock-circle', { includeHiddenElements: true }))).toMatchObject({
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: palettes.light.surfaceMuted,
    });
  });

  test('não revela nada do dia: só número e data entram nas props', async () => {
    await render(<LockSheet visible onClose={() => {}} dayNumber={18} dateLabel="18/10/2026" />);
    const all = screen.toJSON();
    const text = JSON.stringify(all);
    // Nenhuma referência de leitura, capítulo ou monte pode aparecer no cadeado.
    expect(text).not.toMatch(/cap[ií]tulo|Josu|monte/i);
  });

  test('fechada não renderiza conteúdo', async () => {
    await render(<LockSheet visible={false} onClose={() => {}} dayNumber={18} dateLabel="18/10/2026" />);
    expect(screen.queryByText('Abre em 18/10/2026.')).toBeNull();
  });

  test('tela a frio sem pilha: mesmo miolo, e o botão vai para a casa com replace', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<LockedDayScreen dayNumber={60} dateLabel="21/11/2026" />);
    expect(screen.getByTestId('locked-day-screen')).toBeTruthy();
    expect(screen.getByText('Abre em 21/11/2026.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('locked-day-home'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test('tela com pilha atrás: volta, sem replace que duplicaria as abas (R4-8)', async () => {
    await render(<LockedDayScreen dayNumber={60} dateLabel="21/11/2026" />);
    await fireEvent.press(screen.getByTestId('locked-day-home'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('tela a frio tem o "‹ Voltar" no topo, com o mesmo destino', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<LockedDayScreen dayNumber={60} dateLabel="21/11/2026" />);
    expect(screen.getByTestId('locked-day-back-bar')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  test('tela a frio aceita destino próprio', async () => {
    const onHome = jest.fn();
    await render(<LockedDayScreen dayNumber={60} dateLabel="21/11/2026" kind="intercessao" onHome={onHome} />);
    expect(screen.getByText(lockCopy('intercessao'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('locked-day-home'));
    expect(onHome).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ BackBar */

describe('BackBar · voltar das telas contextuais', () => {
  test('A3: "‹ Jornada" + data; rótulo acessível sem o glifo', async () => {
    await render(<BackBar label="Jornada" rightText="17/10/2026" />);
    const back = screen.getByTestId('back-button');
    expect(back.props.accessibilityLabel).toBe('Voltar para Jornada');
    expect(screen.getByText('Jornada')).toBeTruthy();
    expect(flat(screen.getByText('Jornada'))).toMatchObject({ fontFamily: faces.sg600, fontSize: 15, lineHeight: 20 });
    expect(screen.getByText('17/10/2026')).toBeTruthy();
    expect(flat(back)).toMatchObject({ minHeight: 48, minWidth: 48 });
  });

  test('volta na pilha quando há pilha', async () => {
    await render(<BackBar label="Dia 17" />);
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('sem pilha (deep link a frio) vai para a casa', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await render(<BackBar label="Dia 17" />);
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test('D3: "‹ Voltar" + "Passo 1 de 5" em Schibsted 700 13/18', async () => {
    await render(<BackBar rightText="Passo 1 de 5" />);
    expect(screen.getByTestId('back-button').props.accessibilityLabel).toBe('Voltar');
    expect(flat(screen.getByTestId('back-bar-right-text'))).toMatchObject({
      fontFamily: faces.sg700,
      fontSize: 13,
      lineHeight: 18,
    });
  });

  test('B5: "Cancelar" sem ‹, título central e "Excluir" em danger desabilitado', async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    await render(
      <BackBar
        label="Cancelar"
        chevron={false}
        onBack={onCancel}
        title="Dia 17"
        rightAction={{ label: 'Excluir', onPress: onDelete, variant: 'danger', disabled: true, testID: 'delete' }}
      />,
    );
    expect(screen.queryByText('‹')).toBeNull();
    expect(screen.getByTestId('back-button').props.accessibilityLabel).toBe('Cancelar');
    expect(screen.getByText('Dia 17').props.accessibilityRole).toBe('header');
    expect(flat(screen.getByText('Excluir')).color).toBe(palettes.light.danger);
    const del = screen.getByTestId('delete');
    expect(del.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(del);
    expect(onDelete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  test.each(['light', 'dark'] as const)('C4 sobre tinta fixa, tema %s: rótulo branco', async (scheme) => {
    mockScheme.value = scheme;
    await render(<BackBar tone="ink" />);
    expect(flat(screen.getByText('Voltar')).color).toBe('#FFFFFF');
  });
});

/* ----------------------------------------------------------------- Skeleton */

describe('F3 · esqueleto', () => {
  test('bloco em surfaceSunken, com medidas pedidas', async () => {
    await render(<SkeletonBlock width={120} height={20} radius={4} testID="sk" />);
    expect(flat(screen.getByTestId('sk', { includeHiddenElements: true }))).toMatchObject({
      width: 120,
      height: 20,
      borderRadius: 4,
      backgroundColor: palettes.light.surfaceSunken,
    });
  });

  test('painel de hoje: retângulos em surfaceSunken sobre surfaceWarm, e "Carregando…"', async () => {
    await render(<TodaySkeleton />);
    const hidden = { includeHiddenElements: true };
    expect(flat(screen.getByTestId('skeleton-today-panel', hidden)).backgroundColor).toBe(palettes.light.surfaceWarm);
    for (const id of ['skeleton-numeral', 'skeleton-pill', 'skeleton-emphasis', 'skeleton-button', 'skeleton-today-node']) {
      expect(flat(screen.getByTestId(id, hidden)).backgroundColor).toBe(palettes.light.surfaceSunken);
    }
    expect(flat(screen.getByTestId('skeleton-button', hidden)).height).toBe(56);
    expect(screen.getByText('Carregando…')).toBeTruthy();
  });

  test('o bloco de hoje tem só os quatro retângulos que o F3 enumera (R4-10)', async () => {
    await render(<TodaySkeleton />);
    const panel = screen.getByTestId('skeleton-today-panel', { includeHiddenElements: true });
    const ids = panel.children.map((child) => (typeof child === 'string' ? child : child.props.testID));
    expect(ids).toEqual(['skeleton-numeral', 'skeleton-pill', 'skeleton-emphasis', 'skeleton-button']);
  });

  test('os retângulos somem do leitor de tela; só a legenda fala', async () => {
    await render(<TodaySkeleton />);
    expect(screen.queryByTestId('skeleton-numeral')).toBeNull();
    expect(screen.getByTestId('loading-caption').props.accessibilityLabel).toBe('Carregando');
  });

  test('legenda em Schibsted 500 13/18, centralizada', async () => {
    await render(<LoadingCaption />);
    expect(flat(screen.getByText('Carregando…'))).toMatchObject({
      fontFamily: faces.sg500,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    });
  });

  test('sem animação: nenhum Animated no esqueleto', async () => {
    await render(<TodaySkeleton />);
    const text = JSON.stringify(screen.toJSON());
    expect(text).not.toMatch(/opacity/);
  });
});

/* ---------------------------------------------------------------- TextField */

describe('TextField · campo de B5 e C3', () => {
  test('tokens do desenho + borda de correção técnica em repouso', async () => {
    await render(
      <TextField minHeight={220} accessibilityLabel="Minha reflexão" placeholder="Escreva à vontade." testID="field" />,
    );
    const field = screen.getByTestId('field');
    expect(flat(field)).toMatchObject({
      minHeight: 220,
      borderRadius: 18,
      backgroundColor: palettes.light.surfaceWarm,
      borderWidth: 1.5,
      borderColor: palettes.light.controlBorder,
      fontFamily: faces.ss400,
      fontSize: 19,
      lineHeight: 32,
      color: palettes.light.text,
    });
    expect(flat(field).height).toBeUndefined();
    expect(field.props.placeholderTextColor).toBe(palettes.light.textMuted);
    expect(field.props.accessibilityLabel).toBe('Minha reflexão');
  });

  test('foco: borda de 2,5 em text, e o texto não pula (padding compensa)', async () => {
    await render(<TextField minHeight={140} accessibilityLabel="Publicação" testID="field" />);
    const rest = flat(screen.getByTestId('field'));
    await fireEvent(screen.getByTestId('field'), 'focus');
    const focused = flat(screen.getByTestId('field'));
    expect(focused).toMatchObject({ borderWidth: 2.5, borderColor: palettes.light.text, minHeight: 140 });
    expect((rest.padding as number) + (rest.borderWidth as number)).toBe(
      (focused.padding as number) + (focused.borderWidth as number),
    );
    await fireEvent(screen.getByTestId('field'), 'blur');
    expect(flat(screen.getByTestId('field')).borderWidth).toBe(1.5);
  });

  test('tema escuro segue os tokens do tema', async () => {
    mockScheme.value = 'dark';
    await render(<TextField minHeight={140} accessibilityLabel="Publicação" testID="field" />);
    expect(flat(screen.getByTestId('field'))).toMatchObject({
      backgroundColor: palettes.dark.surfaceWarm,
      borderColor: palettes.dark.controlBorder,
      color: palettes.dark.text,
    });
  });

  test('"Texto em Negrito" promove a serifa 400 → 600', async () => {
    _setBoldTextForTests(true);
    await render(<TextField minHeight={140} accessibilityLabel="Publicação" testID="field" />);
    expect(flat(screen.getByTestId('field')).fontFamily).toBe(faces.ss600);
  });

  test('repassa maxLength e os eventos de foco de quem usa', async () => {
    const onFocus = jest.fn();
    await render(
      <TextField minHeight={140} accessibilityLabel="Publicação" maxLength={5000} onFocus={onFocus} testID="field" />,
    );
    expect(screen.getByTestId('field').props.maxLength).toBe(5000);
    await fireEvent(screen.getByTestId('field'), 'focus');
    expect(onFocus).toHaveBeenCalled();
  });
});
