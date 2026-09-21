import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import BibleTab from '@/app/(tabs)/biblia';
import BibleChapterScreen from '@/app/biblia/[livro]/[capitulo]';
import BibleBookScreen from '@/app/biblia/[livro]/index';
import { BOOKS } from '@/bible/books';
import { COMPLETIONS_PREFIX, _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { READER_FONT_DEFAULT, readLineHeight, stepReaderFontSize } from '@/reader/readerFontSize';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import {
  BIBLE_POSITION_KEY,
  NEW_TESTAMENT,
  OLD_TESTAMENT,
  loadBiblePosition,
  nextChapter,
  previousChapter,
  resolveChapter,
} from '@/ui/biblia/bibleNav';
import { GlassTabBar } from '@/ui/TabBar';
import { MIN_TOUCH } from '@/ui/theme';

import { AX5, resetViewport, setViewport } from './support/viewport';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      navigate: jest.fn(),
      setParams: jest.fn(),
      canGoBack: () => true,
    },
    useLocalSearchParams: () => mockParams,
    useSegments: () => [],
    // Roda o efeito de foco como um efeito de montagem.
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
const mockRouter = require('expo-router').router as Record<string, jest.Mock>;

/**
 * Provedor falso com texto licenciado DE TESTE. As frases são escritas para o
 * teste, nunca texto bíblico. Conta as chamadas para provar o que foi pedido.
 */
const calls: string[] = [];
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
  getPassage: async (reference) => {
    calls.push(`${reference.book} ${reference.chapterStart}`);
    return {
      reference: `${reference.book} ${reference.chapterStart}`,
      book: reference.book,
      bookName: reference.book,
      chapter: reference.chapterStart,
      heading: reference.book === 'PSA' ? 'Título de teste.' : null,
      verses: [
        { verse: 1, text: 'Primeira frase de teste.' },
        { verse: 2, text: 'Segunda frase de teste.' },
      ],
    };
  },
};

async function seedSettings(extra: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, ...extra }));
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  Object.values(mockRouter).forEach((fn) => typeof fn === 'function' && 'mockClear' in fn && fn.mockClear());
  calls.length = 0;
  setBibleProvider(fake);
  mockParams = {};
});

afterAll(() => setBibleProvider(devBibleProvider));

describe('navegação da leitura livre', () => {
  it('divide o cânon em 39 + 27 livros', () => {
    expect(OLD_TESTAMENT).toHaveLength(39);
    expect(NEW_TESTAMENT).toHaveLength(27);
    expect(OLD_TESTAMENT[38].id).toBe('MAL');
    expect(NEW_TESTAMENT[0].id).toBe('MAT');
  });

  it('anterior e próximo atravessam livros e param nas pontas', () => {
    expect(nextChapter({ book: 'GEN', chapter: 50 })).toEqual({ book: 'EXO', chapter: 1 });
    expect(previousChapter({ book: 'EXO', chapter: 1 })).toEqual({ book: 'GEN', chapter: 50 });
    expect(previousChapter({ book: 'GEN', chapter: 1 })).toBeNull();
    expect(nextChapter({ book: 'REV', chapter: 22 })).toBeNull();
  });

  it('recusa livro ou capítulo fora do cânon', () => {
    expect(resolveChapter('GEN', '51')).toBeNull();
    expect(resolveChapter('XYZ', '1')).toBeNull();
    expect(resolveChapter('gen', '0')).toBeNull();
    expect(resolveChapter('gen', '3')?.book.id).toBe('GEN');
  });

  it('posição salva inválida ou disco quebrado não derrubam nada', async () => {
    await AsyncStorage.setItem(BIBLE_POSITION_KEY, '{quebrado');
    expect(await loadBiblePosition()).toBeNull();
    // O mock do AsyncStorage já é jest.fn: sem spyOn/mockRestore, que apagaria a implementação.
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disco'));
    expect(await loadBiblePosition()).toBeNull();
  });
});

describe('aba Bíblia', () => {
  it('lista os dois testamentos em linhas de 48+ e o nome da tradução', async () => {
    await render(<BibleTab />);
    expect(await screen.findByText('Antigo Testamento')).toBeTruthy();
    expect(screen.getByText('Novo Testamento')).toBeTruthy();
    expect(screen.getByTestId('bible-translation')).toHaveTextContent('Tradução de teste');
    for (const book of BOOKS) expect(screen.getByTestId(`bible-book-${book.id}`)).toBeTruthy();
    expect(screen.queryByTestId('bible-continue')).toBeNull();
    expect(screen.queryByTestId('bible-placeholder-notice')).toBeNull();

    await fireEvent.press(screen.getByTestId('bible-book-JHN'));
    expect(mockRouter.push).toHaveBeenCalledWith('/biblia/JHN');
  });

  it('mostra "Continuar em <Livro N>" quando há última leitura', async () => {
    await AsyncStorage.setItem(BIBLE_POSITION_KEY, JSON.stringify({ book: 'PSA', chapter: 23 }));
    await render(<BibleTab />);
    const button = await screen.findByTestId('bible-continue');
    expect(screen.getByText('Continuar em Salmos 23')).toBeTruthy();
    await fireEvent.press(button);
    expect(mockRouter.push).toHaveBeenCalledWith('/biblia/PSA/23');
  });

  it('com o provedor de desenvolvimento avisa que é texto de exemplo', async () => {
    setBibleProvider(devBibleProvider);
    await render(<BibleTab />);
    expect(await screen.findByTestId('bible-placeholder-notice')).toBeTruthy();
  });

  it("a barra de abas mostra Bíblia com ícone e rótulo entre Jornada e Você", async () => {
    const routes = [
      { key: 'a', name: 'index' },
      { key: 'b', name: 'biblia' },
      { key: 'c', name: 'voce' },
    ];
    await render(
      <GlassTabBar
        state={{ index: 1, routes }}
        descriptors={{
          a: { options: { title: 'Jornada' } },
          b: { options: { title: 'Bíblia' } },
          c: { options: { title: 'Você' } },
        }}
        navigation={{ emit: () => ({ defaultPrevented: false }), navigate: jest.fn() }}
      />,
    );
    const tab = screen.getByTestId('tab-biblia');
    expect(tab.props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByText('Bíblia')).toBeTruthy();
  });
});

describe('grade de capítulos', () => {
  it('um alvo de 48+ por capítulo e a última leitura marcada', async () => {
    await AsyncStorage.setItem(BIBLE_POSITION_KEY, JSON.stringify({ book: 'RUT', chapter: 2 }));
    mockParams = { livro: 'RUT' };
    await render(<BibleBookScreen />);
    expect(screen.getByTestId('bible-book-title')).toHaveTextContent('Rute');
    await waitFor(() =>
      expect(screen.getByTestId('bible-chapter-2').props.accessibilityLabel).toBe('Capítulo 2, última leitura'),
    );
    for (let c = 1; c <= 4; c++) {
      const style = StyleSheet.flatten(screen.getByTestId(`bible-chapter-${c}`).props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(style.height).toBeUndefined();
    }
    await fireEvent.press(screen.getByTestId('bible-chapter-3'));
    expect(mockRouter.push).toHaveBeenCalledWith('/biblia/RUT/3');
  });

  it("livro inexistente vira estado vazio com voltar", async () => {
    mockParams = { livro: 'XYZ' };
    await render(<BibleBookScreen />);
    expect(screen.getByText('Livro não encontrado')).toBeTruthy();
  });
});

describe('capítulo em leitura livre', () => {
  it('mostra os versículos do provedor, o numeral e a atribuição no fim', async () => {
    await seedSettings();
    mockParams = { livro: 'JHN', capitulo: '3' };
    await render(<BibleChapterScreen />);
    expect(await screen.findByTestId('verse-2')).toHaveTextContent('2 Segunda frase de teste.');
    expect(calls).toEqual(['JHN 3']);
    expect(screen.getByTestId('bible-chapter-numeral')).toHaveTextContent('3');
    expect(screen.getByTestId('back-bar-title')).toHaveTextContent('João 3');
    expect(screen.getByTestId('bible-attribution')).toHaveTextContent('Atribuição de teste (CC BY).');
    expect(screen.getByTestId('verse-1').props.accessibilityLabel).toBe('Versículo 1. Primeira frase de teste.');
    const style = StyleSheet.flatten(screen.getByTestId('verse-1').props.style);
    expect(style.fontSize).toBe(READER_FONT_DEFAULT);
    expect(style.lineHeight).toBe(readLineHeight(READER_FONT_DEFAULT));
  });

  it('título da tradução antes do versículo 1, só quando o provedor manda', async () => {
    await seedSettings();
    mockParams = { livro: 'PSA', capitulo: '3' };
    const view = await render(<BibleChapterScreen />);
    expect(await screen.findByTestId('chapter-heading')).toHaveTextContent('Título de teste.');
    mockParams = { livro: 'JHN', capitulo: '1' };
    await view.rerender(<BibleChapterScreen />);
    await waitFor(() => expect(calls).toContain('JHN 1'));
    await screen.findByTestId('verse-1');
    expect(screen.queryByTestId('chapter-heading')).toBeNull();
  });

  it('grava a última posição em chave própria e não conclui nenhum dia', async () => {
    await seedSettings();
    mockParams = { livro: 'GEN', capitulo: '1' };
    await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    await waitFor(async () => expect(await loadBiblePosition()).toEqual({ book: 'GEN', chapter: 1 }));
    expect(await AsyncStorage.getItem('reader-position:v1')).toBeNull();
    // Nenhuma chave de conclusão foi escrita: só a posição da leitura livre.
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.filter((key) => key.startsWith(COMPLETIONS_PREFIX))).toEqual([]);
    expect([...keys].sort()).toEqual([BIBLE_POSITION_KEY, SETTINGS_KEY].sort());
    // Sem "Concluir leitura" na leitura livre.
    expect(screen.queryByTestId('reader-complete')).toBeNull();
    expect(screen.queryByText('Concluir leitura')).toBeNull();
  });

  it('próximo atravessa o livro; anterior fica desabilitado em Gênesis 1', async () => {
    await seedSettings();
    mockParams = { livro: 'GEN', capitulo: '50' };
    const view = await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    await fireEvent.press(screen.getByTestId('bible-next'));
    expect(mockRouter.setParams).toHaveBeenCalledWith({ livro: 'EXO', capitulo: '1' });

    mockParams = { livro: 'GEN', capitulo: '1' };
    await view.rerender(<BibleChapterScreen />);
    await waitFor(() => expect(calls).toContain('GEN 1'));
    expect(screen.getByTestId('reader-previous').props.accessibilityState).toEqual({ disabled: true });
  });

  it('anuncia a troca de capítulo, não a abertura', async () => {
    await seedSettings();
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    announce.mockClear();
    mockParams = { livro: 'MRK', capitulo: '1' };
    const view = await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    expect(announce).not.toHaveBeenCalled();
    mockParams = { livro: 'MRK', capitulo: '2' };
    await view.rerender(<BibleChapterScreen />);
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Marcos 2'));
    announce.mockRestore();
  });

  it('Apocalipse 22 troca o próximo por "Voltar aos livros"', async () => {
    await seedSettings();
    mockParams = { livro: 'REV', capitulo: '22' };
    await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    expect(screen.getByText('Voltar aos livros')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('bible-next'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/biblia');
  });

  it('"Aa" abre a folha e muda o tamanho do texto', async () => {
    await seedSettings();
    mockParams = { livro: 'JHN', capitulo: '1' };
    await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    const aa = StyleSheet.flatten(screen.getByTestId('bible-text-size').props.style);
    expect(aa.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
    await fireEvent.press(screen.getByTestId('bible-text-size'));
    await act(async () => {
      await fireEvent.press(screen.getByTestId('font-bigger'));
    });
    const bigger = stepReaderFontSize(READER_FONT_DEFAULT, 1);
    await waitFor(() => expect(StyleSheet.flatten(screen.getByTestId('verse-1').props.style).fontSize).toBe(bigger));
  });

  it('erro do provedor vira estado de erro com tentar de novo', async () => {
    await seedSettings();
    let fail = true;
    setBibleProvider({
      getMetadata: fake.getMetadata,
      getPassage: async (reference) => {
        if (fail) throw new Error('falhou');
        return fake.getPassage(reference);
      },
    });
    mockParams = { livro: 'JHN', capitulo: '1' };
    await render(<BibleChapterScreen />);
    expect(await screen.findByTestId('bible-error')).toBeTruthy();
    fail = false;
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByTestId('verse-1')).toBeTruthy();
  });

  it("capítulo inexistente vira estado vazio", async () => {
    mockParams = { livro: 'GEN', capitulo: '51' };
    await render(<BibleChapterScreen />);
    expect(screen.getByText('Capítulo não encontrado')).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('em fonte máxima (AX5) o texto não tem teto e os alvos seguem 48+', async () => {
    setViewport(AX5);
    await seedSettings();
    mockParams = { livro: 'JHN', capitulo: '1' };
    await render(<BibleChapterScreen />);
    await screen.findByTestId('verse-1');
    expect(screen.getByTestId('verse-1').props.maxFontSizeMultiplier).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('back-button').props.style).minHeight).toBeGreaterThanOrEqual(MIN_TOUCH);
  });
});
