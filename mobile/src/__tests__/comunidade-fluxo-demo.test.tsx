/**
 * Juntos na DEMONSTRAÇÃO (demoApi em memória, como no Expo Go do fundador), com
 * as telas de verdade, do jeito de quem instala no dia 23 (pedido de
 * 2026-09-22): nenhuma tela de entrar, nenhum código, nenhum perfil para montar.
 *
 * A TELA DE ACEITE SAIU (decisão do fundador, 2026-09-22): embaixo do botão há a
 * linha "Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do
 * Juntos.", com link para as regras, e UM toque em Publicar registra o aceite
 * (16+, regras e consentimento destacado) e publica em seguida — sem tela no meio
 * e sem rota nenhuma. O post aparece no feed e em "Minhas publicações". Foto de
 * perfil e ministério não são pedidos.
 *
 * A única coisa que o toque exige é um NOME (o servidor recusa sem ele, CM007): se
 * a pessoa nunca deu nenhum, a tela diz isso e oferece o caminho do perfil.
 *
 * O foco é simulado montando a tela de novo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import AceiteRouteGone from '@/app/comunidade/consentimento';
import EntrarScreen from '@/app/comunidade/entrar';
import MyPostsScreen from '@/app/comunidade/minhas-publicacoes';
import PublishScreen from '@/app/comunidade/publicar';
import RulesScreen from '@/app/comunidade/regras';
import { _resetDemoForTests, getDemoCommunityApi, getDemoSession } from '@/community/demoApi';
import { ACEITE_LINE_SPOKEN, ACEITE_NEEDS_NAME } from '@/ui/comunidade/publicar/textos';

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

const TEXTO = 'Hoje a leitura me encorajou a não desistir.';

test('Juntos na demonstração: entra sozinha → escreve → UM toque publica e registra o aceite → feed e "Minhas publicações"', async () => {
  // 1. Publicar (vindo do dia 3) sem sessão nenhuma: a conta do aparelho e a entrada acontecem sozinhas.
  expect(getDemoSession()).toBeNull();
  mockParams = { day: '3' };
  let view = await render(<PublishScreen />);
  await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
  expect(getDemoSession()).not.toBeNull();
  expect(screen.queryByText(/código|Entre na comunidade|Criar meu perfil/i)).toBeNull();

  // 2. A linha do aceite está embaixo do botão ANTES de qualquer toque, e é ela
  //    que diz o que o toque significa. Não há tela de aceite para onde ir.
  expect(screen.getByTestId('aceite-line').props.accessibilityLabel).toBe(ACEITE_LINE_SPOKEN);

  // 3. Sem nome nenhum (nem no Juntos nem na entrada do app), o toque não publica:
  //    diz o porquê e oferece o perfil. Nada de aceite registrado, nada publicado.
  await fireEvent.changeText(screen.getByTestId('publish-input'), TEXTO);
  await fireEvent.press(screen.getByTestId('publish-send'));
  await waitFor(() => expect(screen.getByTestId('publish-error').props.children).toBe(ACEITE_NEEDS_NAME));
  expect(screen.getByTestId('publish-write-name')).toBeTruthy();
  expect(mockRouter.push).not.toHaveBeenCalled();
  const antes = await getDemoCommunityApi()!.getStatus();
  expect(antes).toMatchObject({ needsRules: true, needsPublishConsent: true });
  expect((await getDemoCommunityApi()!.myPosts()).some((post) => post.body === TEXTO)).toBe(false);
  await view.unmount();

  // 4. O nome é escrito no perfil (o caminho que o botão abre). Daqui em diante é
  //    UM toque: registra 16+, regras e consentimento e publica, sem tela no meio.
  await getDemoCommunityApi()!.updateProfile({ name: 'Davi' });
  view = await render(<PublishScreen />);
  await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('publish-input'), TEXTO);
  await fireEvent.press(screen.getByTestId('publish-send'));
  await waitFor(() => expect(screen.getByText('Publicado')).toBeTruthy());
  // Ninguém navegou para tela de aceite nenhuma.
  expect(mockRouter.push).not.toHaveBeenCalled();
  const depois = await getDemoCommunityApi()!.getStatus();
  expect(depois).toMatchObject({ needsRules: false, needsPublishConsent: false, displayName: 'Davi' });
  expect(depois.profile.ageConfirmed).toBe(true);
  await view.unmount();

  // 5. Está no feed, com o nome, e em "Minhas publicações".
  const page = await getDemoCommunityApi()!.feedPage();
  expect(page.posts[0]).toMatchObject({ body: TEXTO, authorName: 'Davi', isMine: true, dayNumber: 3 });
  await render(<MyPostsScreen />);
  await waitFor(() => expect(screen.getByText(TEXTO)).toBeTruthy());
});

test('links antigos: /comunidade/entrar leva ao Juntos, e as regras são tela de LEITURA (os dois textos do aceite)', async () => {
  let view = await render(<EntrarScreen />);
  expect(screen.getByTestId('redirect').props.accessibilityLabel).toBe('/juntos');
  await view.unmount();

  // A tela de regras não redireciona mais: ela MOSTRA as regras e o consentimento
  // destacado (LGPD art. 11, I) — os dois textos cujo sha256 o toque registra.
  mockParams = { ler: '1' };
  view = await render(<RulesScreen />);
  expect(screen.queryByTestId('redirect')).toBeNull();
  expect(screen.getByTestId('rules-title')).toBeTruthy();
  expect(screen.getByTestId('rules-consent')).toBeTruthy();
  // Nada é aceito por ler: não há botão de aceitar em tela nenhuma.
  expect(screen.queryByText(/Concordo/i)).toBeNull();
  await view.unmount();
  expect(mockRouter.push).not.toHaveBeenCalledWith('/conta?reason=comunidade');
});

test('a rota antiga do aceite não cai no vazio: leva às regras, e nada é registrado por navegar', async () => {
  mockParams = { next: 'feed', day: '3' };
  await render(<AceiteRouteGone />);
  expect(screen.getByTestId('redirect').props.accessibilityLabel).toContain('regras');
  // Navegar não entra na comunidade nem aceita nada: nem sessão foi criada.
  expect(getDemoSession()).toBeNull();
});
