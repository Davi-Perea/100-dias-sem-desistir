import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import JourneyHome from '@/app/(tabs)/index';
import DayCompletedScreen from '@/app/concluido/[day]';
import DayScreen from '@/app/dia/[day]';
import IntercessionScreen from '@/app/intercessao/[day]';
import ReaderScreen from '@/app/reader/[day]';
import { parseReference } from '@/bible/references';
import { holdMilestones, isHoldingMilestones, releaseMilestones } from '@/journey/celebration';
import { getCampaign, loadDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { loadKeyVerse } from '@/journey/keyVerse';
import { calendarDateInCampaignTz, formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { _resetCompletionsCacheForTests, loadCompletions, setDayCompleted } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { bibliaLivreProvider } from '@/reader/bibliaLivreProvider';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import {
  fitDisplayNumeral,
  PANEL_NUMERAL,
  safeNumeralLineHeight,
  SCHIBSTED_800_LINE_EM,
  SCREEN_NUMERAL,
  COUNTDOWN_NUMERAL,
  FINISHED_NUMERAL,
} from '@/ui/jornada/displayNumeral';
import { _resetDailyNoticeForTests, DAILY_NOTICE_KEY, dailyNoticeMark } from '@/ui/jornada/dailyNotice';
import { _resetEntryDismissalForTests } from '@/ui/jornada/entryDismissal';
import { DayHeadline } from '@/ui/jornada/TodayPanel';

/**
 * Feedback do fundador de 2026-09-22 — agente Jornada: J1 (numeral cortado),
 * J4 (aviso do dia), J5 (tela de conclusão com confete) e J6 (todos os dias
 * abertos pela chave única FUTURE_DAYS_OPEN).
 */

let mockFutureOpen = true;
// Getter de verdade (defineProperty): num literal com spread, o Babel avalia o
// getter uma vez só, na criação do mock, e a chave ficaria congelada.
jest.mock('@/config/features', () => {
  const mocked = { ...jest.requireActual('@/config/features') };
  Object.defineProperty(mocked, 'FUTURE_DAYS_OPEN', { get: () => mockFutureOpen, enumerable: true });
  return mocked;
});

let mockParams: Record<string, string> = {};
let mockFocus = true;
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
      canDismiss: () => true,
      dismissTo: jest.fn(),
    },
    useLocalSearchParams: () => mockParams,
    useSegments: () => ['(tabs)'],
    // Foco de verdade (como na navegação): o aviso do dia só aparece com a casa em foco.
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => (mockFocus ? effect() : undefined), [effect]);
    },
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
  };
});

// Reanimated 4 precisa do mock dos worklets antes do dele (sem módulo nativo no jest).
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
// O mock do Reanimated não traz `useReducedMotion`: o teste de "Reduzir movimento"
// usa o hook do tema (AccessibilityInfo), que é o que o projeto exige respeitar.
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
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

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  dismissTo: jest.Mock;
};
const CAMPAIGN = 'dev-fixture-campaign';
const TODAY = 17;
const FUTURE = 40;

function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }),
  );
  _resetSettingsCacheForTests();
}

/** O aviso do dia já fechado hoje: para os casos que não são sobre ele. */
async function dismissNoticeToday(day = TODAY) {
  await AsyncStorage.setItem(DAILY_NOTICE_KEY, dailyNoticeMark(CAMPAIGN, day));
  _resetDailyNoticeForTests();
}

beforeEach(async () => {
  mockFutureOpen = true;
  mockFocus = true;
  mockParams = {};
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  _resetEntryDismissalForTests();
  _resetDailyNoticeForTests();
  releaseMilestones();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.dismissTo.mockClear();
  setBibleProvider(devBibleProvider);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  loadCampaignOnDay(TODAY);
  await seedSettings();
});

afterEach(() => jest.restoreAllMocks());
afterAll(() => resetToDevFixtures());

/* ------------------------------------------------------------------- J1 */

describe('J1 · "Dia 3 de 100" nunca é cortado', () => {
  test('a altura natural da Schibsted 800 é a da tabela hhea (ascent 2000 + descent 528 / 2048)', () => {
    expect(SCHIBSTED_800_LINE_EM).toBeCloseTo(1.234, 3);
  });

  test('em toda largura e escala de fonte, a entrelinha do numeral cobre a altura natural da fonte', () => {
    const specs = [PANEL_NUMERAL, SCREEN_NUMERAL, COUNTDOWN_NUMERAL, FINISHED_NUMERAL];
    for (const spec of specs) {
      for (const word of ['Dia 3', 'Dia 17', 'Dia 100', 'Faltam']) {
        for (const width of [120, 200, 282, 320, 390, 600, 900]) {
          for (const scale of [1, 1.2, 2, 3.571]) {
            const fitted = fitDisplayNumeral(word, spec, width, scale);
            const line = safeNumeralLineHeight(fitted);
            expect(line).toBeGreaterThanOrEqual(fitted.size * SCHIBSTED_800_LINE_EM);
            // O desenho continua valendo quando pedir MAIS espaço.
            expect(line).toBeGreaterThanOrEqual(fitted.lineHeight);
          }
        }
      }
    }
  });

  test('o numeral renderizado usa a entrelinha segura e devolve a folga do tracking', async () => {
    await render(<DayHeadline day={3} total={100} />);
    await fireEvent(screen.getByTestId('day-headline'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 240, height: 80 } },
    });
    const style = StyleSheet.flatten(screen.getByTestId('day-numeral').props.style);
    expect(style.lineHeight).toBeGreaterThanOrEqual(Math.ceil(style.fontSize * SCHIBSTED_800_LINE_EM));
    expect(style.paddingRight).toBeGreaterThanOrEqual(Math.abs(style.letterSpacing));
    expect(screen.getByLabelText('Dia 3 de 100')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------- J6 */

describe('J6 · chave única FUTURE_DAYS_OPEN', () => {
  test('ligada: todo dia da campanha abre; concluir continua só até hoje', async () => {
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.isDayUnlocked(1)).toBe(true);
    expect(result.current.isDayUnlocked(FUTURE)).toBe(true);
    expect(result.current.isDayUnlocked(100)).toBe(true);
    expect(result.current.isDayUnlocked(101)).toBe(false);
    expect(result.current.isDayUnlocked(0)).toBe(false);
    expect(result.current.isDayCompletable(TODAY)).toBe(true);
    expect(result.current.isDayCompletable(TODAY + 1)).toBe(false);
  });

  test('desligada: volta o comportamento antigo (só até o dia oficial)', async () => {
    mockFutureOpen = false;
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.isDayUnlocked(TODAY)).toBe(true);
    expect(result.current.isDayUnlocked(TODAY + 1)).toBe(false);
  });

  test('ligada, antes da campanha nenhum dia abre', async () => {
    loadCampaignOnDay(-2);
    const { result } = await renderHook(() => useJourney());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.phase).toBe('before_start');
    expect(result.current.isDayUnlocked(1)).toBe(false);
    expect(result.current.isDayUnlocked(100)).toBe(false);
  });

  test('ligada: a linha futura não diz "Em breve", mostra a data e abre o dia (sem cadeado)', async () => {
    await dismissNoticeToday();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-18')).toBeTruthy());
    expect(screen.queryByText('Em breve')).toBeNull();
    // Da campanha que o app REALMENTE carregou, e não da fixture original:
    // `loadCampaignOnDay` desloca a data de início para o dia 17 cair hoje, e
    // `devDataset().campaign` continua com a data de origem. As duas coincidiam
    // por acaso, e deixaram de coincidir na virada de 23 para 24/09/2026.
    const date = formatDayDate(18, getCampaign());
    expect(screen.getByLabelText(new RegExp(`^Dia 18, .*Dia de ${date.replace(/\//g, '\\/')}\\.`))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('journey-day-18'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dia/[day]', params: { day: '18' } });
    expect(screen.queryByTestId('locked-day-sheet')).toBeNull();
    // Hoje continua o destaque.
    expect(screen.getByTestId('today-panel')).toBeTruthy();
  });

  test('desligada: a linha futura volta a "Em breve" e ao cadeado', async () => {
    mockFutureOpen = false;
    await dismissNoticeToday();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('journey-day-18')).toBeTruthy());
    expect(screen.getByLabelText('Dia 18. Em breve.')).toBeTruthy();
  });

  test('ligada: o dia futuro (A3) abre com o conteúdo, mas não se conclui antes da hora', async () => {
    mockParams = { day: String(FUTURE) };
    await render(<DayScreen />);
    await waitFor(() => expect(screen.getByTestId('day-reading')).toBeTruthy());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
    expect(screen.queryByTestId('day-complete')).toBeNull();
    expect(screen.getByTestId('day-future-note')).toBeTruthy();
    expect(screen.getByTestId('day-intercession')).toBeTruthy();
  });

});

/* ------------------------------------------------------------------- J4 */

describe('J4 · aviso do dia', () => {
  test('aparece ao abrir, com a ênfase da igreja e o versículo-base com o texto da Bíblia Livre', async () => {
    setBibleProvider(bibliaLivreProvider);
    const expected = await bibliaLivreProvider.getPassage(parseReference('PRO 3:5')!);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('daily-notice')).toBeTruthy());
    expect(screen.getByTestId('daily-notice-emphasis').props.children).toBe(`Dia ${TODAY} — título de exemplo`);
    await waitFor(() => expect(screen.getByTestId('daily-notice-verse-text')).toBeTruthy());
    expect(screen.getByTestId('daily-notice-verse-text').props.children).toBe(expected.verses[0].text.trim());
    expect(screen.getByTestId('daily-notice-reference').props.children).toBe('Provérbios 3:5 · Bíblia Livre');
  });

  test('fecha só no X ("Fechar", alvo 48), guarda a dispensa do dia e não volta no mesmo dia', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('daily-notice')).toBeTruthy());
    const close = screen.getByLabelText('Fechar');
    const style = StyleSheet.flatten(
      typeof close.props.style === 'function' ? close.props.style({ pressed: false }) : close.props.style,
    );
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    await fireEvent.press(screen.getByTestId('daily-notice-close'));
    await waitFor(() => expect(screen.queryByTestId('daily-notice')).toBeNull());
    // A gravação é disparada no toque; basta a fila de microtarefas andar.
    await act(async () => {
      await Promise.resolve();
    });
    expect(await AsyncStorage.getItem(DAILY_NOTICE_KEY)).toBe(dailyNoticeMark(CAMPAIGN, TODAY));

    // Fechar o app e abrir de novo, no mesmo dia: não aparece.
    await screen.unmount();
    _resetDailyNoticeForTests();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByTestId('daily-notice')).toBeNull();
  });

  test('no dia seguinte da campanha aparece de novo', async () => {
    await dismissNoticeToday(TODAY - 1);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('daily-notice')).toBeTruthy());
  });

  test('sem texto licenciado, mostra só a referência', async () => {
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('daily-notice-reference')).toBeTruthy());
    expect(screen.queryByTestId('daily-notice-verse-text')).toBeNull();
    expect(screen.getByTestId('daily-notice-reference').props.children).toBe('Provérbios 3:5');
  });

  test('referência que não dá para achar devolve só a referência', async () => {
    setBibleProvider(bibliaLivreProvider);
    expect(await loadKeyVerse('XYZ 1:1')).toEqual({ label: 'XYZ 1:1', text: null, translation: null });
    expect((await loadKeyVerse('JHN 3:16-4:2'))?.text).toBeNull();
    expect((await loadKeyVerse('PSA 999:1'))?.text).toBeNull();
    expect(await loadKeyVerse(null)).toBeNull();
  });

  test('não aparece antes da campanha', async () => {
    loadCampaignOnDay(-2);
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('before-start-card')).toBeTruthy());
    expect(screen.queryByTestId('daily-notice')).toBeNull();
  });

  test('não aparece com a casa fora de foco (não cobre o marco nem a conclusão)', async () => {
    mockFocus = false;
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('today-panel')).toBeTruthy());
    expect(screen.queryByTestId('daily-notice')).toBeNull();
  });
});

/* ------------------------------------------------------------------- J5 */

describe('J5 · "Dia N concluído"', () => {
  test('concluir pelo painel de hoje grava e leva à tela de conclusão', async () => {
    await dismissNoticeToday();
    await render(<JourneyHome />);
    await waitFor(() => expect(screen.getByTestId('complete-day')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('complete-day'));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/concluido/[day]', params: { day: String(TODAY) } }),
    );
    const saved = await loadCompletions(CAMPAIGN);
    expect(saved.days[TODAY]).toBeTruthy();
    // O marco espera a tela de conclusão sair.
    expect(isHoldingMilestones()).toBe(true);
  });

  test('concluir pelo dia (A3) leva à mesma tela', async () => {
    mockParams = { day: String(TODAY - 2) };
    await render(<DayScreen />);
    await waitFor(() => expect(screen.getByTestId('day-complete')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('day-complete'));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/concluido/[day]',
        params: { day: String(TODAY - 2) },
      }),
    );
  });

  test('tela grande com o título do dia, confete e "Continuar" que volta à Jornada', async () => {
    await setDayCompleted(CAMPAIGN, TODAY, true);
    mockParams = { day: String(TODAY) };
    holdMilestones();
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByLabelText(`Dia ${TODAY} de 100 concluído`)).toBeTruthy());
    expect(screen.getByText('concluído')).toBeTruthy();
    expect(screen.getByTestId('day-emphasis')).toBeTruthy();
    // O confete espera um instante (a preferência do sistema chega assíncrona).
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    // O confete é decorativo e escondido do leitor de tela: a busca precisa incluir ocultos.
    expect(screen.getByTestId('confetti', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('completed-continue'));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
    expect(isHoldingMilestones()).toBe(false);
  });

  test('com "Reduzir movimento", nenhum confete', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await setDayCompleted(CAMPAIGN, TODAY, true);
    mockParams = { day: String(TODAY) };
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByTestId('completed-continue')).toBeTruthy());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(screen.queryByTestId('confetti', { includeHiddenElements: true })).toBeNull();
  });

  test('E4/V1: com nome no perfil, "Muito bem, <nome>." acima de Continuar; sem nome, nada', async () => {
    await seedSettings({ profile: { name: 'Davi', goals: [] } });
    await setDayCompleted(CAMPAIGN, TODAY, true);
    mockParams = { day: String(TODAY) };
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByTestId('completed-name')).toBeTruthy());
    expect(screen.getByTestId('completed-name').props.children).toBe('Muito bem, Davi.');
    await screen.unmount();

    await seedSettings({ profile: { name: null, goals: [] } });
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByTestId('completed-continue')).toBeTruthy());
    expect(screen.queryByTestId('completed-name')).toBeNull();
  });

  test('link direto para um dia não concluído não celebra', async () => {
    mockParams = { day: String(TODAY) };
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByText('Este dia ainda não foi concluído.')).toBeTruthy());
    expect(screen.queryByTestId('completed-continue')).toBeNull();
  });

  test('sair da tela de conclusão solta o marco', async () => {
    await setDayCompleted(CAMPAIGN, TODAY, true);
    mockParams = { day: String(TODAY) };
    holdMilestones();
    await render(<DayCompletedScreen />);
    await waitFor(() => expect(screen.getByTestId('completed-continue')).toBeTruthy());
    await screen.unmount();
    expect(isHoldingMilestones()).toBe(false);
  });
});

/* ------------------------------------------------- J6 · rotas do dia futuro */

// Por último no arquivo: o leitor e a intercessão deixam timers próprios.
describe('J6 · leitor e intercessão do dia futuro', () => {
  test('ligada: o leitor do dia futuro abre', async () => {
    mockParams = { day: String(FUTURE) };
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.queryByTestId('reader-guide') ?? screen.queryByTestId('reader-footer')).toBeTruthy());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
  });

  test('ligada: a intercessão do dia futuro abre', async () => {
    mockParams = { day: String(FUTURE) };
    await render(<IntercessionScreen />);
    await waitFor(() => expect(screen.queryByTestId('locked-day-sheet')).toBeNull());
    expect(screen.queryByTestId('locked-day-screen')).toBeNull();
  });
});
