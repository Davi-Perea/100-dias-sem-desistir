import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import TabsLayout from '@/app/(tabs)/_layout';
import AfterReadingScreen from '@/app/comunidade/depois/[day]';
import ReaderScreen from '@/app/reader/[day]';
import { expandChapters } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { audienceSentence } from '@/ui/comunidade/publicar/textos';

import { resetViewport } from './support/viewport';

/**
 * Integração da Comunidade (branch comunidade-v2): a flag por variável de
 * ambiente, a aba entre Bíblia e Você e a ponte B4 depois de concluir. Com a
 * flag desligada, a barra e o leitor ficam como na V1.
 */

let mockEnabled = false;
jest.mock('@/config/features', () => ({
  get COMMUNITY_ENABLED() {
    return mockEnabled;
  },
}));

jest.mock('@/ui/biblia/visibility', () => ({ bibleTabVisible: () => true }));

let mockParams: Record<string, string> = {};
const mockRedirects: string[] = [];
jest.mock('expo-router', () => {
  const { Children, isValidElement } = jest.requireActual('react') as typeof import('react');
  const Screen = () => null;
  // Imita o expo-router de verdade: `href: null` vira `display: 'none'` e a rota fica no estado.
  function Tabs({ children, tabBar }: { children: ReactNode; tabBar: (props: unknown) => ReactElement }) {
    const screens = Children.toArray(children).filter(isValidElement) as ReactElement<{
      name: string;
      options?: { title?: string; href?: string | null };
    }>[];
    const routes = screens.map((s) => ({ key: s.props.name, name: s.props.name }));
    const descriptors = Object.fromEntries(
      screens.map((s) => {
        const { href, ...options } = s.props.options ?? {};
        // `href: undefined` é aba visível; só `null` esconde.
        const hidden = href === null;
        return [s.props.name, { options: hidden ? { ...options, tabBarItemStyle: { display: 'none' } } : options }];
      }),
    );
    return tabBar({
      state: { index: 0, routes },
      descriptors,
      navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
    });
  }
  Tabs.Screen = Screen;
  function Redirect({ href }: { href: string }) {
    mockRedirects.push(href);
    return null;
  }
  return {
    Tabs,
    Redirect,
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useIsFocused: () => true,
    useLocalSearchParams: () => mockParams,
    useSegments: () => [],
    useFocusEffect: () => {},
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('@/journey/useMilestoneTrigger', () => ({ useMilestoneTrigger: () => {} }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = require('expo-router').router as { push: jest.Mock; replace: jest.Mock; back: jest.Mock };

const TODAY = 5;
let campaignId = '';

function loadCampaignOnDay(day: number): string {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('dataset de teste inválido');
  return result.dataset.campaign.id;
}

function tabLabels(): string[] {
  return screen.getAllByRole('tab').map((tab) => String(tab.props.accessibilityLabel));
}

beforeEach(async () => {
  resetViewport();
  mockEnabled = false;
  mockParams = {};
  mockRedirects.length = 0;
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  setBibleProvider(devBibleProvider);
  campaignId = loadCampaignOnDay(TODAY);
});

describe('flag por variável de ambiente', () => {
  const original = process.env.EXPO_PUBLIC_COMMUNITY_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_COMMUNITY_ENABLED;
    else process.env.EXPO_PUBLIC_COMMUNITY_ENABLED = original;
  });

  function readFlag(value: string | undefined): boolean {
    if (value === undefined) delete process.env.EXPO_PUBLIC_COMMUNITY_ENABLED;
    else process.env.EXPO_PUBLIC_COMMUNITY_ENABLED = value;
    let flag = false;
    jest.isolateModules(() => {
      flag = (jest.requireActual('@/config/features') as { COMMUNITY_ENABLED: boolean }).COMMUNITY_ENABLED;
    });
    return flag;
  }

  test('só liga com o texto exato "true"; ausente ou qualquer outro valor é desligado', () => {
    expect(readFlag(undefined)).toBe(false);
    expect(readFlag('')).toBe(false);
    expect(readFlag('1')).toBe(false);
    expect(readFlag('TRUE')).toBe(false);
    expect(readFlag('false')).toBe(false);
    expect(readFlag('true')).toBe(true);
  });
});

describe('barra de abas', () => {
  test('desligada: igual à V1 (Jornada · Bíblia · Você), sem Comunidade', async () => {
    await render(<TabsLayout />);
    expect(tabLabels()).toEqual(['Jornada', 'Bíblia', 'Você']);
    expect(screen.queryByLabelText('Comunidade')).toBeNull();
  });

  test('ligada: a Comunidade entra entre Bíblia e Você', async () => {
    mockEnabled = true;
    await render(<TabsLayout />);
    expect(tabLabels()).toEqual(['Jornada', 'Bíblia', 'Comunidade', 'Você']);
  });
});

describe('leitor: o que acontece ao concluir', () => {
  async function completeReading() {
    mockParams = { day: String(TODAY) };
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-guide')).toBeTruthy());
    const chapters = (getDay(TODAY)?.readings ?? []).flatMap((r) => expandChapters(r.canonical_reference));
    for (let i = 1; i < chapters.length; i++) await fireEvent.press(screen.getByTestId('reader-next'));
    await fireEvent.press(screen.getByTestId('reader-complete'));
  }

  // Feedback de 2026-09-22: concluir leva sempre à tela de conclusão (confete);
  // com a Comunidade ligada, o "Continuar" de lá segue para o B4 (ver /concluido).
  test('desligada: troca o leitor pela tela de conclusão do dia', async () => {
    await completeReading();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/concluido/${TODAY}`));
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test('ligada: também passa pela tela de conclusão (o B4 vem depois dela)', async () => {
    mockEnabled = true;
    await completeReading();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/concluido/${TODAY}`));
    expect(mockRouter.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/comunidade/depois/[day]' }),
    );
  });
});

describe('B4 · depois de concluir', () => {
  test('desligada: a rota volta para a casa e não mostra nada', async () => {
    await setDayCompleted(campaignId, TODAY, true);
    mockParams = { day: String(TODAY) };
    await render(<AfterReadingScreen />);
    expect(mockRedirects).toContain('/');
    expect(screen.queryByTestId('after-write')).toBeNull();
  });

  test('dia ainda não concluído: não existe convite para publicar', async () => {
    mockEnabled = true;
    mockParams = { day: String(TODAY) };
    await render(<AfterReadingScreen />);
    await waitFor(() => expect(mockRedirects).toContain('/'));
    expect(screen.queryByTestId('after-write')).toBeNull();
  });

  test('dia inválido: volta para a casa', async () => {
    mockEnabled = true;
    mockParams = { day: 'abc' };
    await render(<AfterReadingScreen />);
    expect(mockRedirects).toContain('/');
  });

  test('duas portas do mesmo tamanho, frase única de quem vê, e só o número do dia segue adiante', async () => {
    mockEnabled = true;
    await setDayCompleted(campaignId, TODAY, true);
    _resetCompletionsCacheForTests();
    mockParams = { day: String(TODAY) };
    await render(<AfterReadingScreen />);
    await waitFor(() => expect(screen.getByTestId('after-write')).toBeTruthy());

    expect(screen.getByText(`Dia ${TODAY} concluído`)).toBeTruthy();
    const write = StyleSheet.flatten(screen.getByTestId('after-write').props.style);
    const keep = StyleSheet.flatten(screen.getByTestId('after-keep').props.style);
    expect(write.minHeight).toBeGreaterThanOrEqual(48);
    expect(keep.minHeight).toBe(write.minHeight);
    expect(write.height).toBeUndefined();
    expect(keep.height).toBeUndefined();

    const audience = screen.getByTestId('after-audience').props.children as string;
    expect(audience).toContain(audienceSentence());

    // Nenhum texto sem fontWeight: peso só pela face.
    expect(JSON.stringify(screen.toJSON())).not.toContain('fontWeight');

    await fireEvent.press(screen.getByTestId('after-write'));
    expect(mockRouter.replace).toHaveBeenLastCalledWith({
      pathname: '/comunidade/publicar',
      params: { day: String(TODAY) },
    });
    await fireEvent.press(screen.getByTestId('after-keep'));
    expect(mockRouter.replace).toHaveBeenLastCalledWith({
      pathname: '/reflexao/[day]',
      params: { day: String(TODAY) },
    });
    await fireEvent.press(screen.getByTestId('after-not-now'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
