import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import TabsLayout from '@/app/(tabs)/_layout';
import TogetherScreen from '@/app/(tabs)/juntos';
import HelpScreen from '@/app/ajuda';
import WelcomeScreen from '@/app/onboarding/index';
import { _setCloudConfigForTests, isCloudConfigured } from '@/cloud/config';
import { COMMUNITY_ENABLED } from '@/config/features';
import { isDevBuild } from '@/journey/devBuild';
import { loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

/**
 * Superfícies de release (guideline 2.1 da Apple): numa build de release a nuvem
 * está desligada à força (D-6). Nada alcançável pode prometer "em breve" ou dizer
 * "indisponível", e a Comunidade, que não tem servidor, sai da barra.
 */

/**
 * O `Tabs` do expo-router é trocado por um que imita o que ele faz de verdade
 * (layouts/TabsClient.js): `href: null` vira `tabBarItemStyle: { display:
 * 'none' }`, e a rota continua no estado do navegador. A barra própria é
 * chamada com esse estado, como o React Navigation faria.
 */
jest.mock('expo-router', () => {
  const { Children, isValidElement } = jest.requireActual('react') as typeof import('react');
  const Screen = () => null;
  function Tabs({
    children,
    tabBar,
  }: {
    children: ReactNode;
    tabBar: (props: unknown) => ReactElement;
  }) {
    const screens = Children.toArray(children).filter(isValidElement) as ReactElement<{
      name: string;
      options?: { title?: string; href?: string | null };
    }>[];
    const routes = screens.map((s) => ({ key: s.props.name, name: s.props.name }));
    const descriptors = Object.fromEntries(
      screens.map((s) => {
        const { href, ...options } = s.props.options ?? {};
        const hidden = s.props.options && 'href' in s.props.options && href == null;
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
  return {
    Tabs,
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useIsFocused: () => true,
    useLocalSearchParams: () => ({}),
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

/** O que uma loja lê como tela incompleta. */
const UNAVAILABLE = /indispon[ií]ve|em breve|ainda não está ligad|não está disponível|servidor/i;

function allText(): string {
  return JSON.stringify(screen.toJSON());
}

function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  // Simula a release: nenhuma configuração de nuvem.
  _setCloudConfigForTests(null);
  loadCampaignOnDay(3);
  // O _layout raiz registra o provedor; aqui as telas rodam sem ele.
  setBibleProvider(devBibleProvider);
});

describe('release: a nuvem fica desligada à força (D-6)', () => {
  test('sem configuração de nuvem, ela não liga (é o caso da V1)', () => {
    expect(isCloudConfigured()).toBe(false);
  });
});

describe('barra de abas sem a Comunidade', () => {
  test('a Comunidade está desligada nesta build', () => {
    expect(COMMUNITY_ENABLED).toBe(false);
  });

  test('com COMMUNITY_ENABLED = false a barra tem 2 abas: Jornada · Você', async () => {
    await render(<TabsLayout />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(screen.getByLabelText('Jornada')).toBeTruthy();
    expect(screen.getByLabelText('Você')).toBeTruthy();
    expect(screen.queryByLabelText('Comunidade')).toBeNull();
    expect(screen.queryByTestId('tab-juntos')).toBeNull();
  });
});

describe('nenhuma tela alcançável em release diz "indisponível"', () => {
  test('boas-vindas: sem "Já tenho perfil" (levaria a /conta indisponível)', async () => {
    await render(<WelcomeScreen />);
    expect(screen.queryByTestId('onboarding-sign-in')).toBeNull();
    expect(allText()).not.toMatch(UNAVAILABLE);
  });

  test('Comunidade (rota escondida, mas ainda alcançável por link): só o altar e o propósito', async () => {
    await render(<TogetherScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-today')).toBeTruthy());
    expect(screen.getByTestId('open-proposito')).toBeTruthy();
    expect(screen.queryByTestId('join-cta')).toBeNull();
    expect(allText()).not.toMatch(UNAVAILABLE);
  });

  test('Ajuda: sem recado de indisponível', async () => {
    await render(<HelpScreen />);
    expect(allText()).not.toMatch(UNAVAILABLE);
  });

  test('Ajuda em release (isDevBuild = false): sem o aviso DEV FIXTURE do provedor sem texto (2.1)', async () => {
    const g = globalThis as unknown as { __DEV__: boolean };
    const previous = g.__DEV__;
    g.__DEV__ = false;
    try {
      expect(isDevBuild()).toBe(false);
      await render(<HelpScreen />);
      // O aviso do provedor sem texto ('DEV FIXTURE — texto de exemplo…') não aparece.
      // (A fonte editorial aqui vem do dataset fictício do teste; em release o
      // carregador só aceita o dataset real, então ela não entra nesta conferência.)
      expect(allText()).not.toContain(devBibleProvider.getMetadata().copyrightNotice);
      expect(allText()).not.toMatch(/Launch Gate|texto de exemplo|Nenhuma tradução bíblica/i);
      expect(screen.queryByTestId('help-copyright')).toBeNull();
    } finally {
      g.__DEV__ = previous;
    }
  });
});
