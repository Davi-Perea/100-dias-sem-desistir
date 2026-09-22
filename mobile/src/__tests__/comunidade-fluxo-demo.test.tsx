/**
 * C6 (feedback do fundador de 2026-09-22: "a comunidade não está funcionando").
 *
 * Reproduz, na DEMONSTRAÇÃO (demoApi em memória, como no Expo Go do fundador),
 * o fluxo inteiro com as telas de verdade: entrar sem e-mail (e sem código, C3) → perfil
 * (foto, nome + 16+, ministério, bio) → Publicar → regras → consentimento →
 * Publicar → aparece no feed e em "Minhas publicações".
 *
 * O que travava antes (e este teste prende):
 *   - "Entrar com meu e-mail" em Publicar/regras/consentimento levava ao /conta,
 *     que na demonstração (sem servidor) não tem saída; regras e consentimento
 *     sem sessão eram só um aviso, sem botão;
 *   - Publicar não perguntava de novo ao voltar da entrada (continuava "Entre na
 *     comunidade" mesmo já dentro). Isso agora é `useFocusEffect` em
 *     useCommunityStatus (aqui o foco é simulado montando a tela de novo).
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

async function scrollRulesToEnd() {
  const scroll = screen.getByTestId('rules-scroll');
  await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } });
  await fireEvent(scroll, 'contentSizeChange', 390, 4000);
  await fireEvent.scroll(scroll, {
    nativeEvent: {
      contentOffset: { x: 0, y: 3200 },
      contentSize: { width: 390, height: 4000 },
      layoutMeasurement: { width: 390, height: 800 },
    },
  });
}

test('C6: entrar → perfil → regras → consentimento → publicar → feed e "Minhas publicações"', async () => {
  // 1. Entrar sem e-mail (C2): um toque, sem passo simulado de e-mail.
  const entry = await render(<EntrarScreen />);
  expect(getDemoSession()).toBeNull();
  await fireEvent.press(screen.getByTestId('community-sign-in'));
  // 2. Sem código (C3): entra direto e cai no primeiro passo do perfil.
  await waitFor(() => expect(screen.getByTestId('entrar-foto')).toBeTruthy());
  expect(getDemoSession()).not.toBeNull();
  expect(screen.queryByText(/código/i)).toBeNull();

  // 3. Perfil: foto, nome + 16+, "Nenhum", bio pulada.
  await fireEvent.press(screen.getByTestId('perfil-foto-abrir'));
  await fireEvent.press(screen.getByTestId('perfil-foto-escolher'));
  await waitFor(() => expect(screen.getByTestId('perfil-foto-estado')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('entrar-foto-continuar'));
  await fireEvent.changeText(screen.getByTestId('perfil-nome'), 'Davi');
  await fireEvent.press(screen.getByTestId('perfil-idade'));
  await fireEvent.press(screen.getByTestId('entrar-confirmar'));
  await waitFor(() => expect(screen.getByTestId('entrar-ministerio')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('perfil-ministerio-nenhum'));
  await fireEvent.press(screen.getByTestId('entrar-ministerio-continuar'));
  await waitFor(() => expect(screen.getByTestId('entrar-bio')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('entrar-pular-bio'));
  expect(screen.getByTestId('entrar-pronto')).toBeTruthy();
  expect(screen.queryByTestId('entrar-falta')).toBeNull();
  await entry.unmount();

  // 4. Publicar (vindo do dia 3): vai para as regras, levando o caminho de volta.
  mockParams = { day: '3' };
  let view = await render(<PublishScreen />);
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/comunidade/regras',
      params: { next: '/comunidade/publicar', day: '3' },
    }),
  );
  await view.unmount();

  // 5. Regras: rolar até o fim e aceitar (rascunho PENDENTE, mas a demonstração deixa seguir).
  mockRouter.replace.mockClear();
  mockParams = { next: '/comunidade/publicar', day: '3' };
  view = await render(<RulesScreen />);
  await waitFor(() => expect(screen.getByTestId('rules-accept')).toBeTruthy());
  await scrollRulesToEnd();
  await fireEvent.press(screen.getByTestId('rules-accept'));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/comunidade/consentimento',
      params: { next: '/comunidade/publicar', day: '3' },
    }),
  );
  await view.unmount();

  // 6. Consentimento: a frase de quem vê (C5) e "Concordo".
  mockRouter.replace.mockClear();
  view = await render(<ConsentScreen />);
  expect(
    screen.getAllByText(
      'Sua publicação aparece com seu nome para as pessoas que entraram na comunidade da Lagoinha Brasília Capital.',
    ).length,
  ).toBeGreaterThan(0);
  await fireEvent.press(await screen.findByTestId('consent-accept'));
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/comunidade/publicar', params: { day: '3' } }),
  );
  await view.unmount();

  // 7. Publicar de verdade.
  mockParams = { day: '3' };
  view = await render(<PublishScreen />);
  await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('publish-input'), 'Hoje a leitura me encorajou a não desistir.');
  await fireEvent.press(screen.getByTestId('publish-send'));
  await waitFor(() => expect(screen.getByText('Publicado')).toBeTruthy());
  await view.unmount();

  // 8. Está no feed, com o nome (e sem ministério: "Nenhum"), e em "Minhas publicações".
  const page = await getDemoCommunityApi()!.feedPage();
  expect(page.posts[0]).toMatchObject({
    body: 'Hoje a leitura me encorajou a não desistir.',
    authorName: 'Davi',
    authorMinistry: null,
    isMine: true,
    dayNumber: 3,
  });
  await render(<MyPostsScreen />);
  await waitFor(() => expect(screen.getByText('Hoje a leitura me encorajou a não desistir.')).toBeTruthy());
});

test('C6: sem sessão, Publicar, regras e consentimento levam à entrada (nunca ao /conta, que não tem saída na demonstração)', async () => {
  let view = await render(<PublishScreen />);
  await fireEvent.press(screen.getByTestId('gate-sign-in'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/comunidade/entrar');
  await view.unmount();

  view = await render(<RulesScreen />);
  await fireEvent.press(screen.getByTestId('rules-enter'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/comunidade/entrar');
  await view.unmount();

  await render(<ConsentScreen />);
  await fireEvent.press(screen.getByTestId('consent-enter'));
  expect(mockRouter.push).toHaveBeenLastCalledWith('/comunidade/entrar');
  expect(mockRouter.push).not.toHaveBeenCalledWith('/conta?reason=comunidade');
});
