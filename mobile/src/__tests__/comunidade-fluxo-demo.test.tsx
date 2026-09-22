/**
 * Juntos na DEMONSTRAÇÃO (demoApi em memória, como no Expo Go do fundador), com
 * as telas de verdade, do jeito de quem instala no dia 23 (pedido de
 * 2026-09-22): nenhuma tela de entrar, nenhum código, nenhum perfil para montar.
 * A pessoa escreve, toca em Publicar, passa UMA vez pela tela única de aceite
 * (16+, regras, consentimento e o nome) e o post aparece no feed e em "Minhas
 * publicações". Foto de perfil e ministério não são pedidos.
 *
 * O foco é simulado montando a tela de novo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ConsentScreen from '@/app/comunidade/consentimento';
import EntrarScreen from '@/app/comunidade/entrar';
import MyPostsScreen from '@/app/comunidade/minhas-publicacoes';
import PublishScreen from '@/app/comunidade/publicar';
import RulesScreen from '@/app/comunidade/regras';
import { _resetDemoForTests, getDemoCommunityApi, getDemoSession } from '@/community/demoApi';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
  Redirect: ({ href }: { href: unknown }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="redirect" accessibilityLabel={typeof href === 'string' ? href : JSON.stringify(href)} />;
  },
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

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  digestStringAsync: jest.fn(async () => 'ab'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Demonstração: Comunidade ligada, SEM nuvem (é isso que liga o demoApi).
jest.mock('@/config/features', () => ({ COMMUNITY_ENABLED: true }));
jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => false, ACCOUNT_DELETION_AVAILABLE: false }));
jest.mock('@/cloud/client', () => ({ getSupabase: () => null, requireSupabase: () => null }));
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: false,
    loading: false,
    session: null,
    signedIn: false,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));

// Foto de perfil: galeria e reencode simulados (JPEG mínimo, sem metadados). Nada sai do aparelho.
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: async () => ({
    canceled: false,
    assets: [{ uri: 'file:///galeria/eu.jpg', width: 800, height: 800 }],
  }),
}));
jest.mock('expo-image-manipulator', () => {
  const clean = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]).toString('base64');
  const ref = {
    width: 800,
    height: 800,
    release: () => {},
    saveAsync: async () => ({ uri: 'file:///cache/eu.jpg', width: 800, height: 800, base64: clean }),
  };
  return {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: () => ({ renderAsync: async () => ref, resize: () => ({ renderAsync: async () => ref }), release: () => {} }),
    },
  };
});

const g = globalThis as unknown as { __DEV__: boolean };
const ORIGINAL_DEV = g.__DEV__;
const ORIGINAL_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE;

beforeEach(() => {
  g.__DEV__ = true;
  process.env.EXPO_PUBLIC_DEMO_MODE = 'true';
  _resetDemoForTests(Date.parse('2026-09-25T12:00:00Z'));
  mockParams = {};
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
});

afterAll(() => {
  g.__DEV__ = ORIGINAL_DEV;
  if (ORIGINAL_DEMO === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE;
  else process.env.EXPO_PUBLIC_DEMO_MODE = ORIGINAL_DEMO;
});

test('Juntos na demonstração: entra sozinha → escreve → aceite único → o post sai sozinho → feed e "Minhas publicações"', async () => {
  // 1. Publicar (vindo do dia 3) sem sessão nenhuma: a conta do aparelho e a entrada acontecem sozinhas.
  expect(getDemoSession()).toBeNull();
  mockParams = { day: '3' };
  let view = await render(<PublishScreen />);
  await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
  expect(getDemoSession()).not.toBeNull();
  expect(screen.queryByText(/código|Entre na comunidade|Criar meu perfil/i)).toBeNull();

  // 2. Escreve e toca em Publicar: abre a tela única de aceite; nada foi enviado.
  await fireEvent.changeText(screen.getByTestId('publish-input'), 'Hoje a leitura me encorajou a não desistir.');
  await fireEvent.press(screen.getByTestId('publish-send'));
  expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/consentimento');
  const mine = await getDemoCommunityApi()!.myPosts();
  expect(mine.some((post) => post.body === 'Hoje a leitura me encorajou a não desistir.')).toBe(false);
  await view.unmount();

  // 3. Aceite: frase de quem vê, 16+, o nome (a entrada do app não deu nenhum) e "Concordo e continuar".
  view = await render(<ConsentScreen />);
  await waitFor(() => expect(screen.getByTestId('consent-accept')).toBeTruthy());
  expect(
    screen.getAllByText(
      'Sua publicação aparece com seu nome para as pessoas que entraram na comunidade da Lagoinha Brasília Capital.',
    ).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText(/foto de perfil/i)).toBeNull();
  await fireEvent.changeText(screen.getByTestId('perfil-nome'), 'Davi');
  await fireEvent.press(screen.getByTestId('perfil-idade'));
  await fireEvent.press(screen.getByTestId('consent-accept'));
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  const status = await getDemoCommunityApi()!.getStatus();
  expect(status).toMatchObject({ needsRules: false, needsPublishConsent: false, displayName: 'Davi' });
  expect(status.profile.ageConfirmed).toBe(true);
  await view.unmount();

  // 4. Publicar de novo (sem foto de perfil e sem ministério): sai.
  view = await render(<PublishScreen />);
  await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('publish-input'), 'Hoje a leitura me encorajou a não desistir.');
  await fireEvent.press(screen.getByTestId('publish-send'));
  await waitFor(() => expect(screen.getByText('Publicado')).toBeTruthy());
  await view.unmount();

  // 5. Está no feed, com o nome, e em "Minhas publicações".
  const page = await getDemoCommunityApi()!.feedPage();
  expect(page.posts[0]).toMatchObject({
    body: 'Hoje a leitura me encorajou a não desistir.',
    authorName: 'Davi',
    isMine: true,
    dayNumber: 3,
  });
  await render(<MyPostsScreen />);
  await waitFor(() => expect(screen.getByText('Hoje a leitura me encorajou a não desistir.')).toBeTruthy());
});

test('/comunidade/entrar e o aceite das regras antigos levam ao Juntos e ao aceite único', async () => {
  let view = await render(<EntrarScreen />);
  expect(screen.getByTestId('redirect').props.accessibilityLabel).toBe('/juntos');
  await view.unmount();
  view = await render(<RulesScreen />);
  expect(screen.getByTestId('redirect').props.accessibilityLabel).toContain('/comunidade/consentimento');
  await view.unmount();
  expect(mockRouter.push).not.toHaveBeenCalledWith('/conta?reason=comunidade');
});
