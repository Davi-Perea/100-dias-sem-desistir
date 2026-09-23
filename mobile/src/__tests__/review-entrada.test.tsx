import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AccessibilityInfo } from 'react-native';

import GoalsStep from '@/app/onboarding/metas';
import { quoteFrame } from '@/bible/quote';
import { CUSTOM_GOAL_LABEL, CUSTOM_GOAL_MAX, GOALS, normalizeCustomGoal } from '@/config/goals';
import type { JourneyDay } from '@/journey/types';
import {
  _resetSettingsCacheForTests,
  getCachedSettings,
  loadSettings,
  normalizeSettings,
  SETTINGS_KEY,
} from '@/settings/settingsStore';
import { DevContentBanner } from '@/ui/components';
import { CLOSE_QUOTE, DailyVerseNotice, OPEN_QUOTE } from '@/ui/jornada/DailyVerseNotice';
import { JourneyHeader, readCounterLabel } from '@/ui/jornada/JourneyHeader';
import { openingIndex, openingOffset } from '@/ui/jornada/opening';
import { CONFETTI_PIECES, CONFETTI_TOTAL_MS, Confetti } from '@/ui/motion/Confetti';
import { BRAND_YELLOW, palettes, _setBoldTextForTests } from '@/ui/theme';

import { AX5, PHONE, resetViewport, setViewport } from './support/viewport';

/**
 * Revisão do fundador de 2026-09-22 (prévia do Dia 23), parte "Entrada e Jornada":
 * a meta escrita pela pessoa, o versículo do dia entre aspas, o contador de dias
 * lidos visível ao abrir a casa (e nenhuma menção a autorização nesta aba) e o
 * confete refeito.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  useIsFocused: () => true,
  useSegments: () => [],
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

const mockKeyVerse: { value: { label: string; text: string | null; translation: string | null } | null } = {
  value: null,
};
jest.mock('@/journey/keyVerse', () => ({
  loadKeyVerse: () => Promise.resolve(mockKeyVerse.value),
}));

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => 'light',
}));

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: false, ...patch }));
  _resetSettingsCacheForTests();
  await loadSettings();
}

beforeEach(async () => {
  resetViewport();
  _setBoldTextForTests(false);
  jest.clearAllMocks();
  jest.restoreAllMocks();
  // Preferência do sistema explícita em todo teste: sem isto, um teste de
  // "Reduzir movimento" contamina os seguintes.
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  mockKeyVerse.value = null;
});

/* --------------------------------------------------------- 1 · Outra meta */

describe('E4 · "Outra meta": a pessoa escreve a dela', () => {
  test('a linha entra depois das metas prontas e abre o campo ao ser marcada', async () => {
    await seedSettings();
    await render(<GoalsStep />);

    const row = screen.getByRole('checkbox', { name: CUSTOM_GOAL_LABEL });
    expect(row.props.accessibilityState.checked).toBe(false);
    // Fechada, nenhum campo à toa na tela.
    expect(screen.queryByTestId('goal-custom-input')).toBeNull();
    // Sem meta nenhuma, "Continuar" segue travado e "Pular" existe.
    expect(screen.getByTestId('goals-continue').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('goal-custom'));
    const field = screen.getByTestId('goal-custom-input');
    expect(field.props.maxLength).toBe(CUSTOM_GOAL_MAX);
    expect(field.props.accessibilityLabel).toBe(CUSTOM_GOAL_LABEL);
    expect(field.props.multiline).toBe(false);
    // Marcada e ainda vazia não é meta: nada gravado e o "Continuar" espera.
    expect(getCachedSettings()?.profile.customGoal).toBeNull();
  });

  test('o que ela escreve fica guardado no aparelho e já libera o "Continuar"', async () => {
    await seedSettings();
    await render(<GoalsStep />);
    await fireEvent.press(screen.getByTestId('goal-custom'));
    await fireEvent.changeText(screen.getByTestId('goal-custom-input'), '  Levar minha mãe para a igreja  ');

    await waitFor(() => expect(getCachedSettings()?.profile.customGoal).toBe('Levar minha mãe para a igreja'));
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored.profile.customGoal).toBe('Levar minha mãe para a igreja');
    // Guardada junto das outras, sem mexer nas metas prontas.
    expect(stored.profile.goals).toEqual([]);

    await waitFor(() =>
      expect(screen.getByTestId('goals-continue').props.accessibilityState.disabled).toBe(false),
    );
    expect(screen.queryByTestId('goals-skip')).toBeNull();

    await fireEvent.press(screen.getByTestId('goals-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/leitura');
  });

  test('desmarcar apaga a meta escrita; apagar o texto não deixa meta vazia guardada', async () => {
    await seedSettings({ profile: { name: null, goals: [], customGoal: 'Orar com meu filho' } });
    await render(<GoalsStep />);

    const field = await screen.findByTestId('goal-custom-input');
    expect(field.props.value).toBe('Orar com meu filho');
    expect(screen.getByRole('checkbox', { name: CUSTOM_GOAL_LABEL }).props.accessibilityState.checked).toBe(true);

    // Apagar tudo não guarda meta vazia — e não fecha o campo no meio da digitação.
    await fireEvent.changeText(field, '   ');
    await waitFor(() => expect(getCachedSettings()?.profile.customGoal).toBeNull());
    expect(screen.getByTestId('goal-custom-input')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('goal-custom'));
    expect(screen.queryByTestId('goal-custom-input')).toBeNull();
    await waitFor(() => expect(getCachedSettings()?.profile.customGoal).toBeNull());
  });

  test('a linha da pessoa vem depois de todas as metas prontas', async () => {
    await seedSettings();
    await render(<GoalsStep />);
    const labels = screen.getAllByRole('checkbox').map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual([...GOALS.map((goal) => goal.label), CUSTOM_GOAL_LABEL]);
  });

  test('60 caracteres, espaços limpos, vazio vira null — na tela e na gravação', () => {
    expect(normalizeCustomGoal('  ler   todo   dia ')).toBe('ler todo dia');
    expect(normalizeCustomGoal('   ')).toBeNull();
    expect(normalizeCustomGoal('')).toBeNull();
    expect(normalizeCustomGoal(42)).toBeNull();
    expect(normalizeCustomGoal('x'.repeat(CUSTOM_GOAL_MAX + 20))).toBe('x'.repeat(CUSTOM_GOAL_MAX));
    expect(CUSTOM_GOAL_MAX).toBe(60);
    // A gravação normaliza de novo: nada entra no disco fora da regra.
    expect(normalizeSettings({ profile: { customGoal: '  ' } }).profile.customGoal).toBeNull();
    expect(normalizeSettings({ profile: { customGoal: 'y'.repeat(80) } }).profile.customGoal).toBe(
      'y'.repeat(CUSTOM_GOAL_MAX),
    );
    expect(normalizeSettings({}).profile.customGoal).toBeNull();
  });
});

/* ------------------------------------------------- 2 · aviso do versículo */

const DAY: JourneyDay = {
  campaign_id: 'c',
  day_number: 1,
  title: 'Sabedoria para governar',
  theme: null,
  sphere: null,
  key_verse_reference: 'PRO 3:5',
  official_direction: null,
  prayer_focus: null,
  prayer_points: [],
  altar: null,
  milestone: null,
  next_day_teaser: null,
  publish_status: 'published',
  readings: [],
};

describe('J4 · o versículo do dia entre aspas, com a referência embaixo', () => {
  const VERSE = 'Confia no SENHOR de todo o teu coração.';

  test('aspas tipográficas em volta, filete separando da ênfase e o texto da igreja intacto', async () => {
    mockKeyVerse.value = { label: 'Provérbios 3:5', text: VERSE, translation: 'Bíblia Livre' };
    await render(<DailyVerseNotice visible day={1} dayData={DAY} onClose={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('daily-notice-verse-text')).toBeTruthy());
    // O nó do versículo guarda o texto da tradução SEM aspas dentro: nada reescrito.
    const verse = screen.getByTestId('daily-notice-verse-text');
    expect(verse.props.children).toBe(VERSE);
    expect(String(verse.props.children)).not.toMatch(/[“”"]/);

    // As aspas são moldura, em nós irmãos do texto.
    const quoted = screen.getByLabelText(VERSE);
    expect(quoted.props.children).toEqual([OPEN_QUOTE, expect.anything(), CLOSE_QUOTE]);
    expect(OPEN_QUOTE).toBe('“');
    expect(CLOSE_QUOTE).toBe('”');

    // A ênfase da igreja segue separada, e a referência fica embaixo do versículo.
    expect(screen.getByTestId('daily-notice-emphasis').props.children).toBe('Sabedoria para governar');
    expect(screen.getByTestId('daily-notice-divider')).toBeTruthy();
    expect(screen.getByTestId('daily-notice-reference').props.children).toBe('Provérbios 3:5 · Bíblia Livre');
  });

  test('tradução que já usa aspas não ganha uma segunda camada', async () => {
    // Gênesis 12:2–3 é fala de Deus: a Bíblia Livre já fecha com aspas. A
    // moldura cede inteira; o texto da tradução continua intacto.
    const FALA = 'E farei de ti uma grande nação; e em ti serão benditas todas as famílias da terra.”';
    mockKeyVerse.value = { label: 'Gênesis 12:2-3', text: FALA, translation: 'Bíblia Livre' };
    await render(<DailyVerseNotice visible day={1} dayData={DAY} onClose={() => {}} />);

    await waitFor(() => expect(screen.getByTestId('daily-notice-verse-text')).toBeTruthy());
    expect(screen.getByTestId('daily-notice-verse-text').props.children).toBe(FALA);

    const quoted = screen.getByLabelText(FALA);
    expect(quoted.props.children).toEqual(['', expect.anything(), '']);
    // Nenhuma aspa dobrada em lugar nenhum da tela.
    const desenho = JSON.stringify(screen.toJSON());
    expect(desenho).not.toContain(`${CLOSE_QUOTE}${CLOSE_QUOTE}`);
    expect(desenho).not.toContain(`${OPEN_QUOTE}${OPEN_QUOTE}`);
  });

  test('a moldura nunca desemparelha as aspas de um versículo (Dia 100 incluído)', () => {
    // O defeito do Dia 100 era a moldura entrar num versículo que já abria fala
    // no meio: saíam três aspas de abertura para duas de fechamento.
    const conta = (s: string, c: string) => s.split(c).length - 1;
    const emparelhado = (s: string) => conta(s, OPEN_QUOTE) === conta(s, CLOSE_QUOTE);

    const CASOS = [
      'Confia no SENHOR de todo o teu coração.', // sem aspas: ganha a moldura
      'E disse-lhes: “Por que fazeis essas coisas?”', // fala interna fechada
      '“Eis que faço novas todas as coisas.”', // fala inteira
      'E veio um homem de Deus a Eli, e disse-lhe: “Assim diz o SENHOR:', // abre e não fecha
    ];

    for (const texto of CASOS) {
      const { open, close } = quoteFrame(texto);
      const antes = conta(texto, OPEN_QUOTE) - conta(texto, CLOSE_QUOTE);
      const depois = conta(open + texto + close, OPEN_QUOTE) - conta(open + texto + close, CLOSE_QUOTE);
      // A moldura não pode PIORAR o que a tradução entregou.
      expect(depois).toBe(antes);
    }

    // Sem aspas próprias, a moldura entra e fica emparelhada.
    const { open, close } = quoteFrame(CASOS[0]);
    expect(open).toBe(OPEN_QUOTE);
    expect(emparelhado(open + CASOS[0] + close)).toBe(true);
  });

  test('sem texto achado, fica só a referência — e nenhuma aspa solta', async () => {
    mockKeyVerse.value = { label: 'Provérbios 3:5', text: null, translation: null };
    await render(<DailyVerseNotice visible day={1} dayData={DAY} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('daily-notice-reference')).toBeTruthy());
    expect(screen.queryByTestId('daily-notice-verse-text')).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain(OPEN_QUOTE);
  });
});

/* ------------------------------------------------------------ 3 · Jornada */

describe('A1 · a Jornada não fala de autorização, e o contador aparece', () => {
  test('nenhum arquivo da Jornada mostra "aguardando autorização"', () => {
    const root = join(__dirname, '..');
    const files = [
      join(root, 'app', '(tabs)', 'index.tsx'),
      join(root, 'ui', 'jornada', 'BeforeCampaign.tsx'),
      join(root, 'ui', 'jornada', 'CampaignFinished.tsx'),
      join(root, 'ui', 'jornada', 'TodayPanel.tsx'),
      join(root, 'ui', 'jornada', 'JourneyHeader.tsx'),
      join(root, 'ui', 'jornada', 'JourneyRows.tsx'),
      join(root, 'ui', 'jornada', 'WelcomeBack.tsx'),
      join(root, 'ui', 'jornada', 'DailyVerseNotice.tsx'),
    ];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      // Sobra a menção em comentário explicando que ela mora em Ajustes; o que não
      // pode existir é a frase dentro de uma string que vá para a tela.
      const strings = source.match(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g) ?? [];
      for (const text of strings) {
        expect(text.toLowerCase()).not.toContain('aguardando autoriza');
        expect(text.toLowerCase()).not.toContain('não autorizado');
      }
    }
  });

  test('a faixa da Jornada não desenha nada com o conteúdo real pendente', async () => {
    await render(<DevContentBanner state="pending" compact />);
    expect(screen.toJSON()).toBeNull();
    expect(screen.queryByTestId('content-banner')).toBeNull();
  });

  test('conteúdo FICTÍCIO continua avisado em toda tela (REGRAS §17–18)', async () => {
    await render(<DevContentBanner state="fixture" compact />);
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('o contador aparece desde o primeiro dia, inclusive com zero dias lidos', async () => {
    await render(<JourneyHeader readCount={0} />);
    const counter = screen.getByTestId('journey-read-counter');
    expect(counter).toBeTruthy();
    expect(counter.props.accessibilityLabel).toBe(readCounterLabel(0));
    expect(screen.getByTestId('journey-read-counter-count')).toHaveTextContent('0');
  });

  test('a abertura da casa não esconde o contador quando ele cabe', () => {
    // Cabeçalho de 100 no topo, três dias de 48, painel de 440 e janela de 700.
    const offsets = [100, 148, 196, 244, 684];
    const lengths = [48, 48, 48, 440, 48];
    const base = { running: true, offsets, lengths, todayIndex: 3, welcomeIndex: -1 };
    expect(openingOffset({ ...base, viewport: 700 })).toBe(0);
    expect(openingIndex(offsets, 0)).toBe(0);
    // Janela curta: o painel de hoje vence, e o contador fica a uma rolagem.
    expect(openingOffset({ ...base, viewport: 420 })).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------ 4 · confete */

describe('J5 · confete refeito', () => {
  const settle = () => act(async () => void (await new Promise((resolve) => setTimeout(resolve, 300))));

  test('40 a 60 papéis, tamanhos variados, cores da marca e nada de fileira igual', async () => {
    setViewport(1, PHONE);
    await render(<Confetti />);
    await settle();

    expect(CONFETTI_PIECES).toBeGreaterThanOrEqual(40);
    expect(CONFETTI_PIECES).toBeLessThanOrEqual(60);
    const tree = screen.getByTestId('confetti', { includeHiddenElements: true });
    const pieces = tree.children as unknown as { props: { style: unknown } }[];
    expect(pieces).toHaveLength(CONFETTI_PIECES);

    const style = (index: number) =>
      (Array.isArray(pieces[index].props.style) ? pieces[index].props.style[0] : pieces[index].props.style) as {
        width: number;
        height: number;
        left: number;
        borderRadius: number;
        backgroundColor: string;
      };
    const widths = new Set(Array.from({ length: CONFETTI_PIECES }, (_, i) => style(i).width));
    const heights = new Set(Array.from({ length: CONFETTI_PIECES }, (_, i) => style(i).height));
    // Tamanhos variados: o antigo tinha dois.
    expect(widths.size).toBeGreaterThanOrEqual(4);
    expect(heights.size).toBeGreaterThanOrEqual(4);
    // Redondos e retangulares convivem.
    const radii = new Set(Array.from({ length: CONFETTI_PIECES }, (_, i) => style(i).borderRadius));
    expect(radii.size).toBeGreaterThan(1);

    const colors = new Set(Array.from({ length: CONFETTI_PIECES }, (_, i) => style(i).backgroundColor));
    expect(colors).toContain(BRAND_YELLOW);
    expect(colors).toContain(palettes.light.blue);
    expect(colors).toContain(palettes.light.text);
    expect(colors.size).toBe(4);

    // Espalhados pela largura, não em duas colunas.
    const lefts = Array.from({ length: CONFETTI_PIECES }, (_, i) => style(i).left);
    expect(Math.min(...lefts)).toBeLessThan(40);
    expect(Math.max(...lefts)).toBeGreaterThan(330);
    resetViewport();
  });

  test('a festa inteira cabe em 2 a 3 segundos e o confete sai de cena sozinho', async () => {
    expect(CONFETTI_TOTAL_MS).toBeGreaterThanOrEqual(2000);
    expect(CONFETTI_TOTAL_MS).toBeLessThanOrEqual(3000);
    await render(<Confetti />);
    await settle();
    expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeTruthy();
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, CONFETTI_TOTAL_MS + 200))));
    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
  });

  test('com "Reduzir movimento", nem um quadro de confete', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<Confetti />);
    await settle();
    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
  });

  test('o leitor de tela nunca vê o confete, e ele não recebe toque', async () => {
    await render(<Confetti />);
    await settle();
    const tree = screen.getByTestId('confetti', { includeHiddenElements: true });
    expect(tree.props.accessibilityElementsHidden).toBe(true);
    expect(tree.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(tree.props.pointerEvents).toBe('none');
    // Sem `includeHiddenElements` ele não existe para a árvore acessível.
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  test('com fonte grande (3,571×) o confete é o mesmo: geometria, sem texto', async () => {
    setViewport(AX5, PHONE);
    await render(<Confetti />);
    await settle();
    const tree = screen.getByTestId('confetti', { includeHiddenElements: true });
    expect(tree.children).toHaveLength(CONFETTI_PIECES);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/"children":"/);
    resetViewport();
  });
});
