import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import ReaderScreen from '@/app/reader/[day]';
import ReflectionScreen from '@/app/reflexao/[day]';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { readingSummary } from '@/journey/readingSummary';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests, loadCompletions, isDayCompleted, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import {
  READER_FONT_DEFAULT,
  normalizeReaderFontSize,
  readLineHeight,
  stepReaderFontSize,
} from '@/reader/readerFontSize';
import { _resetReflectionsCacheForTests, loadReflections, saveReflection } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { spokenReference } from '@/ui/leitor/spoken';

import { resetViewport } from './support/viewport';

let mockDay = '17';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ day: mockDay }),
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const TODAY = 17;

function loadCampaignOnDay(day: number) {
  const base: JourneyDataset = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
  return result.dataset.campaign.id;
}

let campaignId = '';

/**
 * Provedor com texto (licenciado, de teste): liga o modo TEXTO do leitor — o do
 * "Aa", da folha B3 e do "Prefiro ler na minha Bíblia". Sem ele, o leitor é o
 * guia (leitor-guia.test.tsx). A frase é escrita para o teste, nunca bíblica.
 */
const licensed: BibleTextProvider = {
  getMetadata: () => ({
    ...devBibleProvider.getMetadata(),
    id: 'licenciada-teste',
    copyrightNotice: 'Atribuição de teste.',
    attributionRequired: true,
    isDevPlaceholder: false,
  }),
  getPassage: async (reference) => ({
    reference: `${reference.book} ${reference.chapterStart}`,
    book: reference.book,
    bookName: reference.book,
    chapter: reference.chapterStart,
    verses: [{ verse: 1, text: 'Frase de teste.' }],
  }),
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = require('expo-router').router as { back: jest.Mock; replace: jest.Mock };

function chaptersOf(day: number) {
  return (getDay(day)?.readings ?? []).flatMap((r) => expandChapters(r.canonical_reference));
}

async function layout(testID: string, width: number, height = 50) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

async function seedSettings(extra: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...extra }),
  );
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  resetViewport();
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  setBibleProvider(devBibleProvider);
  mockDay = String(TODAY);
  campaignId = loadCampaignOnDay(TODAY);
  await seedSettings();
});

/* ------------------------------------------------------------------ B3 regra */

describe('tamanho do texto: 14 a 30, padrão 19, extremos alcançáveis', () => {
  test('padrão 19, e quem tinha o padrão antigo (18) migra para 19', () => {
    expect(READER_FONT_DEFAULT).toBe(19);
    expect(normalizeReaderFontSize(undefined)).toBe(19);
    expect(normalizeReaderFontSize(18)).toBe(19);
    expect(normalizeReaderFontSize(40)).toBe(30);
    expect(normalizeReaderFontSize(9)).toBe(14);
  });

  test('de 19 para baixo chega a 14, e para cima chega a 30, no último passo', () => {
    const down: number[] = [];
    let size = 19;
    for (let i = 0; i < 5; i++) down.push((size = stepReaderFontSize(size, -1)));
    expect(down).toEqual([17, 15, 14, 14, 14]);

    const up: number[] = [];
    size = 19;
    for (let i = 0; i < 8; i++) up.push((size = stepReaderFontSize(size, 1)));
    expect(up).toEqual([21, 23, 25, 27, 29, 30, 30, 30]);
  });

  test('pares antigos continuam valendo e o próximo passo cai na escala nova', () => {
    expect(normalizeReaderFontSize(20)).toBe(20);
    expect(stepReaderFontSize(20, 1)).toBe(21);
    expect(stepReaderFontSize(16, -1)).toBe(15);
  });

  test('entrelinha sempre 1,7×', () => {
    expect(readLineHeight(19)).toBe(32.3);
    expect(readLineHeight(30)).toBe(51);
  });
});

/* ------------------------------------------------------------------------ B1 */

describe('B1 · leitor', () => {
  test('com texto, a barra tem fechar, título, posição sem símbolo falado, "Aa" e filete', async () => {
    setBibleProvider(licensed);
    await render(<ReaderScreen />);
    const first = chaptersOf(TODAY)[0];
    const total = chaptersOf(TODAY).length;

    await waitFor(() => expect(screen.getByTestId('reader-title')).toBeTruthy());
    expect(screen.getByTestId('reader-title').props.children).toBe(`${first.bookName} ${first.chapter}`);
    expect(screen.getByLabelText('Fechar leitura')).toBeTruthy();
    expect(screen.getByText(`Dia ${TODAY} · capítulo 1 de ${total}`).props.accessibilityLabel).toBe(
      `Dia ${TODAY}, capítulo 1 de ${total}`,
    );
    expect(screen.getByLabelText('Tamanho do texto')).toBeTruthy();
    expect(screen.getByText('Aa', { includeHiddenElements: true })).toBeTruthy();
    // O filete fica fora do leitor de tela (a legenda já diz a posição) e, no
    // capítulo 1 de um dia aberto, nada foi lido ainda (R1-8, R1-10).
    const progress = screen.getByTestId('reader-progress', { includeHiddenElements: true });
    expect(progress.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(progress.props.accessibilityRole).toBeUndefined();
  });

  test('sem tradução licenciada o leitor é o guia, sem caixa "não liberado" e sem versículo numerado', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    expect(screen.queryByTestId('reader-not-released')).toBeNull();
    expect(screen.queryByText(/não liberado/i)).toBeNull();
    // Estrutura de versículos não existe como dado: nada de numerar (LACUNAS B1).
    expect(screen.queryByLabelText(/^Versículo /)).toBeNull();
    // As frases DEV do provedor de exemplo não aparecem como se fossem leitura.
    expect(screen.queryByText(/Este é um texto de exemplo/)).toBeNull();
  });

  test('a faixa de aviso de conteúdo (C-07) continua na tela', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('content-banner')).toBeTruthy());
  });

  test('capítulo a capítulo até "Concluir leitura", que conclui e fecha', async () => {
    await render(<ReaderScreen />);
    const total = chaptersOf(TODAY).length;
    await waitFor(() => expect(screen.getByTestId('reader-footer')).toBeTruthy());

    expect(screen.getByTestId('reader-previous').props.accessibilityState).toMatchObject({ disabled: true });
    for (let i = 1; i < total; i++) {
      await fireEvent.press(screen.getByTestId('reader-next'));
    }
    expect(screen.queryByTestId('reader-next')).toBeNull();
    expect(screen.getByLabelText('Concluir leitura')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('reader-complete'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), TODAY)).toBe(true);
  });

  test('dia já concluído: a releitura anda capítulo a capítulo, "Voltar" só no último, e o link da Bíblia some', async () => {
    await setDayCompleted(campaignId, TODAY, true);
    await render(<ReaderScreen />);
    const total = chaptersOf(TODAY).length;
    await waitFor(() => expect(screen.getByTestId('reader-footer')).toBeTruthy());
    expect(screen.queryByTestId('reader-own-bible')).toBeNull();
    for (let i = 1; i < total; i++) {
      expect(screen.queryByLabelText('Voltar')).toBeNull();
      await fireEvent.press(screen.getByTestId('reader-next'));
    }
    expect(screen.getByLabelText('Voltar')).toBeTruthy();
    expect(screen.queryByLabelText('Concluir leitura')).toBeNull();
  });

  test('D-1 (P-09): com texto, "Prefiro ler na minha Bíblia" grava o modo e volta, sem concluir o dia', async () => {
    setBibleProvider(licensed);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-own-bible')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-own-bible'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    await waitFor(async () => {
      _resetSettingsCacheForTests();
      expect((await loadSettings()).lastUsedReadingMode).toBe('own_bible');
    });
    _resetCompletionsCacheForTests();
    expect(isDayCompleted(await loadCompletions(campaignId), TODAY)).toBe(false);
  });

  test('com tradução licenciada, o texto aparece sem teto de escala e com a atribuição', async () => {
    setBibleProvider(licensed);
    await render(<ReaderScreen />);

    const verse = await screen.findByLabelText('Versículo 1. Frase de teste.');
    expect(verse.props.maxFontSizeMultiplier).toBeUndefined();
    expect(StyleSheet.flatten(verse.props.style)).toMatchObject({ fontSize: 19, lineHeight: 32.3 });
    expect(screen.getByTestId('reader-attribution')).toBeTruthy();
    expect(screen.queryByTestId('reader-guide')).toBeNull();
  });
});

/* ------------------------------------------------------------------------ B2 */

describe('B2 · rodapé empilha quando o rótulo não cabe em uma linha (medido)', () => {
  test('cabe: quadrado + primário em linha', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-footer-box')).toBeTruthy());
    await layout('reader-footer-box', 338);
    await layout('reader-footer-probe', 140);
    expect(screen.getByTestId('reader-footer-row')).toBeTruthy();
    expect(screen.queryByTestId('reader-footer-stacked')).toBeNull();
  });

  test('não cabe: primário em cima, "Capítulo anterior" embaixo, os dois com piso 64', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-footer-box')).toBeTruthy());
    await layout('reader-footer-box', 338);
    // 338 − 56 − 12 − 40 − 26 = 204 de espaço para o rótulo com ícone.
    await layout('reader-footer-probe', 205);

    expect(screen.getByTestId('reader-footer-stacked')).toBeTruthy();
    const next = StyleSheet.flatten(screen.getByTestId('reader-next').props.style);
    const previous = screen.getByTestId('reader-previous');
    expect(next.minHeight).toBe(64);
    expect(StyleSheet.flatten(previous.props.style).minHeight).toBe(64);
    expect(previous.props.accessibilityLabel).toBe('Capítulo anterior');
    expect(next.height).toBeUndefined();
  });
});

/* ------------------------------------------------------------------------ B3 */

describe('B3 · folha "Tamanho do texto" (só existe com texto licenciado)', () => {
  beforeEach(() => setBibleProvider(licensed));

  test('amostra sem teto, valor em pt, passos até os extremos', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-text-size')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-text-size'));

    expect(screen.getByTestId('text-size-value').props.children).toBe('19 pt');
    const sample = screen.getByTestId('text-size-sample');
    expect(sample.props.maxFontSizeMultiplier).toBeUndefined();
    expect(StyleSheet.flatten(sample.props.style)).toMatchObject({ fontSize: 19, lineHeight: 32.3 });
    expect(
      screen.getByText(
        'O texto também cresce com o tamanho de letra do seu celular, até o máximo que o sistema permite.',
      ),
    ).toBeTruthy();

    for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByTestId('font-bigger'));
    await waitFor(() => expect(screen.getByTestId('text-size-value').props.children).toBe('30 pt'));
    expect(screen.getByTestId('font-bigger').props.accessibilityState).toMatchObject({ disabled: true });
    _resetSettingsCacheForTests();
    expect((await loadSettings()).readerFontSize).toBe(30);
  });

  test('quem tinha 18 salvo vê 19: a carga das preferências normaliza, e o leitor não grava nada', async () => {
    await seedSettings({ readerFontSize: 18 });
    // A normalização é da carga (settingsStore.merge), para toda tela.
    expect((await loadSettings()).readerFontSize).toBe(19);
    _resetSettingsCacheForTests();
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-text-size')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-text-size'));
    expect(screen.getByTestId('text-size-value').props.children).toBe('19 pt');
    // Abrir o leitor não reescreve a preferência (PER-05): o disco segue com o que tinha.
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}').readerFontSize).toBe(18);
  });

  test('"Diminuir" e "Aumentar" empilham quando o rótulo não cabe na metade', async () => {
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-text-size')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('reader-text-size'));
    await layout('text-size-buttons', 350);
    await layout('text-size-probe', 120);
    expect(StyleSheet.flatten(screen.getByTestId('text-size-buttons').props.style).flexDirection).toBe('row');
    // (350 − 12) / 2 − 44 = 125.
    await layout('text-size-probe', 126);
    expect(StyleSheet.flatten(screen.getByTestId('text-size-buttons').props.style).flexDirection).toBe('column');
  });
});

/* ------------------------------------------------------------------------ B5 */

describe('B5 · reflexão privada', () => {
  test('barra, cap, título, campo, caixa azul e rodapé — sem o bloco social', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-save')).toBeTruthy());

    expect(screen.getByLabelText('Cancelar')).toBeTruthy();
    expect(screen.getByText(`Dia ${TODAY}`)).toBeTruthy();
    expect(screen.getByTestId('reflection-delete').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByLabelText('Minha reflexão, só você vê')).toBeTruthy();
    expect(screen.getByText('O que ficou com você hoje?')).toBeTruthy();

    const input = screen.getByTestId('reflection-input');
    expect(StyleSheet.flatten(input.props.style).minHeight).toBe(220);
    expect(input.props.placeholder).toBe('Escreva à vontade.');
    expect(input.props.value).toBe('');

    expect(
      screen.getByText(
        'Isto fica neste aparelho. Se depois você quiser dizer algo para a igreja, escreve de novo — do zero, de propósito.',
      ),
    ).toBeTruthy();
    expect(screen.queryByTestId('share-insight')).toBeNull();
    expect(screen.queryByText(/Compartilhar/)).toBeNull();
    expect(screen.getByTestId('content-banner')).toBeTruthy();

    const label = readingSummary(getDay(TODAY))!.label;
    const cap = screen.getByText(`${label} · salva neste aparelho`);
    expect(cap.props.accessibilityLabel).toBe(`${spokenReference(label)}, salva neste aparelho`);
    expect(cap.props.accessibilityLabel).not.toMatch(/[·–~]/);
  });

  test('"Salvar para mim" guarda no aparelho (sem espaços nas pontas) e fecha', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('reflection-input'), '  algo que ficou  ');
    await fireEvent.press(screen.getByTestId('reflection-save'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    _resetReflectionsCacheForTests();
    expect((await loadReflections(campaignId)).byDay[TODAY]?.body).toBe('algo que ficou');
  });

  test('reflexão guardada abre preenchida e com "Excluir" ativo', async () => {
    await saveReflection(campaignId, TODAY, 'já escrita');
    _resetReflectionsCacheForTests();
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-input').props.value).toBe('já escrita'));
    expect(screen.getByTestId('reflection-delete').props.accessibilityState).toMatchObject({ disabled: false });
  });

  test('teclado aberto sem espaço: o rodapé desce para a rolagem e o campo não colapsa', async () => {
    await render(<ReflectionScreen />);
    await waitFor(() => expect(screen.getByTestId('reflection-footer')).toBeTruthy());
    const pinned = StyleSheet.flatten(screen.getByTestId('reflection-footer').props.style);
    expect(pinned.borderTopWidth).toBe(1);

    // Rodapé de 250 numa coluna de 300 (teclado aberto): sobram 50, menos que
    // três linhas do campo. O rodapé passa a rolar junto.
    await layout('reflection-footer', 350, 250);
    await layout('reflection-column', 390, 300);
    const inline = StyleSheet.flatten(screen.getByTestId('reflection-footer').props.style);
    expect(inline.borderTopWidth).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('reflection-input').props.style).minHeight).toBe(220);
  });
});
