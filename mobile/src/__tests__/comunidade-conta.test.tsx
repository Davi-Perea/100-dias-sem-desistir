/**
 * Conta e perfil da Comunidade (V2), com o cliente SIMULADO (mesmo molde de
 * comunidade-cliente.test.ts): o supabase-js é trocado por um `rpc` falso e as
 * telas usam o cliente real (`createCommunityApi`). Prova o que cada tela envia
 * e mostra. NÃO prova RLS nem as RPCs (pgTAP 07–10, não executados).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import AccountScreen from '@/app/conta';
import CommunityAccountScreen from '@/app/comunidade/conta-e-privacidade';
import EntrarScreen from '@/app/comunidade/entrar';
import CommunityProfileScreen from '@/app/comunidade/perfil';
import MyPostsScreen from '@/app/comunidade/minhas-publicacoes';
import { createCommunityApi, type CommunityClient } from '@/community/api';
import { authorLine } from '@/community/profile';
import { listMinistries } from '@/journey/ministries';
import { NAME_TOO_LONG_COPY } from '@/ui/comunidade/perfil/EntradaFlow';
import { AVATAR_NOTE, NEWS_LABEL } from '@/ui/comunidade/perfil/PerfilCampos';
import { DEVICE_ACCOUNT_COPY } from '@/ui/comunidade/perfil/parts';
import { AX5, resetViewport, setViewport } from './support/viewport';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'),
  digestStringAsync: jest.fn(async () => 'AB'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams.current,
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

// Entrar sem e-mail (C2): a sessão do aparelho é do Supabase Auth, fora deste teste.
jest.mock('@/community/deviceSession', () => ({ startDeviceSession: jest.fn(async () => {}) }));

// Foto de perfil: galeria e reencode simulados (JPEG mínimo, sem metadados).
const mockLaunch = jest.fn(async () => ({
  canceled: false,
  assets: [{ uri: 'file:///galeria/eu.jpg', width: 800, height: 800 }],
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: () => mockLaunch() }));
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

// Interruptores e nuvem controlados pelo teste.
const mockEnv = {
  enabled: true,
  configured: true,
  email: 'ana@exemplo.com' as string | null,
  anonymous: false,
  deletionAvailable: false,
  supportEmail: null as string | null,
  deletionUrl: null as string | null,
};
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('@/config/features', () => ({
  get COMMUNITY_ENABLED() {
    return mockEnv.enabled;
  },
}));
jest.mock('@/config/contato', () => ({
  get SUPPORT_EMAIL() {
    return mockEnv.supportEmail;
  },
  get PRIVACY_URL() {
    return null;
  },
  get ACCOUNT_DELETION_URL() {
    return mockEnv.deletionUrl;
  },
}));
jest.mock('@/cloud/config', () => ({
  isCloudConfigured: () => mockEnv.configured,
  get ACCOUNT_DELETION_AVAILABLE() {
    return mockEnv.deletionAvailable;
  },
}));
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: mockEnv.configured,
    loading: false,
    session: mockEnv.email
      ? { user: { id: 'eu', email: mockEnv.email, is_anonymous: mockEnv.anonymous } }
      : null,
    signedIn: !!mockEnv.email,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));
jest.mock('@/cloud/auth', () => ({
  isValidEmail: (value: string) => /.+@.+\..+/.test(value),
  OTP_LENGTH: 6,
  requestOtp: jest.fn().mockResolvedValue(undefined),
  verifyOtp: jest.fn().mockResolvedValue(undefined),
  secondsUntilResendAllowed: () => 0,
  signOut: jest.fn().mockResolvedValue(undefined),
  requestAccountDeletion: jest.fn().mockResolvedValue(undefined),
}));

// O cliente real sobre um supabase falso. getCommunityApi é o único ponto trocado.
type RpcResult = { data?: unknown; error?: unknown };
const mockRpc = { results: {} as Record<string, RpcResult | ((args?: Record<string, unknown>) => RpcResult)> };
const rpc = jest.fn(async (fn: string, args?: Record<string, unknown>) => {
  const configured = mockRpc.results[fn];
  const result = typeof configured === 'function' ? configured(args) : (configured ?? {});
  return { data: result.data ?? null, error: result.error ?? null };
});
const createSignedUrls = jest.fn(async (paths: string[]) => ({
  data: paths.map((path) => ({ path, signedUrl: `https://assinada/${path}`, error: null })),
  error: null,
}));
const fakeClient: CommunityClient = {
  rpc,
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      createSignedUrls,
      remove: async () => ({ data: [], error: null }),
    }),
  },
};
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return {
    ...actual,
    getCommunityApi: () => {
      const features = jest.requireMock('@/config/features') as { COMMUNITY_ENABLED: boolean };
      return features.COMMUNITY_ENABLED ? mockApiFactory() : null;
    },
  };
});
function mockApiFactory() {
  return createCommunityApi(fakeClient, { randomUUID: () => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' });
}

const router = jest.requireMock('expo-router').router as { push: jest.Mock; replace: jest.Mock; back: jest.Mock };
const auth = jest.requireMock('@/cloud/auth') as { signOut: jest.Mock; requestAccountDeletion: jest.Mock };
const deviceSession = jest.requireMock('@/community/deviceSession') as { startDeviceSession: jest.Mock };

function statusRow(patch: Record<string, unknown> = {}) {
  return {
    data: [
      {
        is_member: false,
        member_status: null,
        display_name: null,
        can_publish: false,
        needs_publish_consent: true,
        needs_rules: true,
        publish_consent_version: 'PENDENTE',
        rules_version: 'PENDENTE',
        is_moderator: false,
        ...patch,
      },
    ],
  };
}
const MEMBER = statusRow({ is_member: true, member_status: 'active', display_name: 'Ana' });

const P1 = '20000000-0000-4000-8000-000000000001';
const P2 = '20000000-0000-4000-8000-000000000002';
const P3 = '20000000-0000-4000-8000-000000000003';
const B1 = '40000000-0000-4000-8000-000000000001';

type JsonNode = { type: string; props: Record<string, unknown>; children: (JsonNode | string)[] | null };
/** Todos os campos de texto na tela (host TextInput). */
function textInputs(): JsonNode[] {
  const found: JsonNode[] = [];
  const walk = (node: JsonNode | JsonNode[] | string | null) => {
    if (!node || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'TextInput') found.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as JsonNode | JsonNode[] | null);
  return found;
}

function calls(fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn);
}

beforeEach(() => {
  Object.assign(mockEnv, {
    enabled: true,
    configured: true,
    email: 'ana@exemplo.com',
    anonymous: false,
    deletionAvailable: false,
    supportEmail: null,
    deletionUrl: null,
  });
  mockParams.current = {};
  mockRpc.results = { my_community_status: statusRow() };
  rpc.mockClear();
  createSignedUrls.mockClear();
  router.push.mockClear();
  router.replace.mockClear();
  auth.signOut.mockClear();
  deviceSession.startDeviceSession.mockClear();
  mockLaunch.mockClear();
  auth.requestAccountDeletion.mockClear();
  resetViewport();
});

describe('estados honestos', () => {
  test('Comunidade desligada: as três telas dizem que não está disponível e não chamam o servidor', async () => {
    mockEnv.enabled = false;
    for (const Screen of [EntrarScreen, MyPostsScreen, CommunityAccountScreen]) {
      const view = await render(<Screen />);
      expect(screen.getByText('Comunidade indisponível')).toBeTruthy();
      expect(screen.queryByText(/em breve/i)).toBeNull();
      await view.unmount();
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  test('sem nuvem configurada também é indisponível, nunca dado falso', async () => {
    mockEnv.configured = false;
    await render(<EntrarScreen />);
    expect(screen.getByText('Comunidade indisponível')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  test('sem conta: entra SEM e-mail, com um toque (C2); nada vai para o servidor da comunidade antes', async () => {
    mockEnv.email = null;
    await render(<EntrarScreen />);
    expect(screen.getAllByText('Entrar na comunidade').length).toBeGreaterThan(0);
    expect(screen.getByText(DEVICE_ACCOUNT_COPY)).toBeTruthy();
    expect(screen.queryByText(/18 anos/)).toBeNull();
    await fireEvent.press(screen.getByTestId('community-sign-in'));
    expect(deviceSession.startDeviceSession).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalledWith('/conta?reason=comunidade');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('conta ligada ao aparelho (sessão anônima) vale: entra sem código e segue para a foto (C3)', async () => {
    mockEnv.email = 'anon';
    mockEnv.anonymous = true;
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-foto')).toBeTruthy());
    expect(calls('join_community')).toEqual([['join_community', { chosen_name: null }]]);
  });

  test('servidor fora do ar: erro humano com "Tentar de novo", sem texto cru', async () => {
    mockRpc.results.my_community_status = { error: { message: 'TypeError: Network request failed' } };
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Não deu para carregar')).toBeTruthy());
    expect(screen.queryByText(/TypeError/)).toBeNull();
    mockRpc.results.my_community_status = statusRow();
    await fireEvent.press(screen.getByTestId('community-retry'));
    await waitFor(() => expect(screen.getByTestId('entrar-foto')).toBeTruthy());
  });
});

describe('entrada sem código: foto → nome e 16+ → ministério → bio (C1, C3, C4)', () => {
  async function join() {
    mockRpc.results.join_community = { data: true };
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-foto')).toBeTruthy());
  }

  test('sem código e sem aviso de 18+: abre direto no passo 1 de 4, a foto (C1, C3)', async () => {
    await join();
    expect(screen.getByText('Passo 1 de 4')).toBeTruthy();
    expect(screen.queryByText(/18 anos|maiores de 18/)).toBeNull();
    expect(screen.queryByText(/código/i)).toBeNull();
    expect(calls('join_community')).toEqual([['join_community', { chosen_name: null }]]);
  });

  test('caminho completo: entra na hora; cada passo salva o que a pessoa escolheu', async () => {
    mockRpc.results.set_community_avatar = { data: 'in_review' };
    await join();
    expect(screen.getByText('Passo 1 de 4')).toBeTruthy();

    // Foto: as regras aparecem ANTES da galeria; volta "em análise".
    expect(screen.getByTestId('entrar-foto-continuar').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('perfil-foto-abrir'));
    expect(screen.getByTestId('perfil-foto-regras')).toBeTruthy();
    expect(mockLaunch).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('perfil-foto-escolher'));
    await waitFor(() => expect(screen.getByTestId('perfil-foto-estado').props.children).toBe(AVATAR_NOTE.in_review));
    expect(calls('set_community_avatar')).toEqual([
      ['set_community_avatar', { new_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg' }],
    ]);
    await fireEvent.press(screen.getByTestId('entrar-foto-continuar'));

    // Nome + 16+ (nada marcado de antemão, nome nunca derivado do e-mail).
    expect(screen.getByTestId('perfil-nome').props.value).toBe('');
    expect(screen.getByTestId('perfil-idade').props.accessibilityState.checked).toBe(false);
    await fireEvent.changeText(screen.getByTestId('perfil-nome'), '  Davi ');
    await fireEvent.press(screen.getByTestId('perfil-idade'));
    await fireEvent.press(screen.getByTestId('entrar-confirmar'));
    await waitFor(() => expect(screen.getByTestId('entrar-ministerio')).toBeTruthy());
    expect(calls('set_community_profile').at(-1)?.[1]).toMatchObject({ new_name: 'Davi', confirms_16: true });

    // Ministério da lista do app, com "Nenhum" no topo.
    expect(screen.getByTestId('perfil-ministerio-nenhum')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('perfil-ministerio-nenhum'));
    await fireEvent.press(screen.getByTestId('entrar-ministerio-continuar'));
    await waitFor(() => expect(screen.getByTestId('entrar-bio')).toBeTruthy());
    expect(calls('set_community_profile').at(-1)?.[1]).toMatchObject({ no_ministry: true, new_ministry: null });

    // Bio: opcional.
    await fireEvent.press(screen.getByTestId('entrar-pular-bio'));
    await waitFor(() => expect(screen.getByTestId('entrar-pronto')).toBeTruthy());
    expect(screen.getByTestId('entrar-previa').props.accessibilityLabel).toBe('É assim que você aparece: Davi');
    expect(screen.queryByTestId('entrar-falta')).toBeNull();
    expect(screen.getByText(/mostra as regras da comunidade e pede o seu consentimento/)).toBeTruthy();
  });

  test('tudo pode ser pulado; o fim diz o que falta para publicar, sem bloquear quem só quer ler', async () => {
    await join();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    await fireEvent.press(screen.getByTestId('entrar-pular-nome'));
    await fireEvent.press(screen.getByTestId('entrar-pular-ministerio'));
    await fireEvent.press(screen.getByTestId('entrar-pular-bio'));
    expect(screen.getByTestId('entrar-pronto')).toBeTruthy();
    expect(calls('set_community_profile')).toHaveLength(0);
    expect(screen.getByText(/Para publicar, falta: foto de perfil, nome, a confirmação de 16 anos ou mais e ministério/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-completar'));
    expect(router.replace).toHaveBeenCalledWith('/comunidade/perfil');
  });

  test('ministério aparece como "Nome · Ministério X"', async () => {
    await join();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    await fireEvent.changeText(screen.getByTestId('perfil-nome'), 'Davi');
    await fireEvent.press(screen.getByTestId('entrar-confirmar'));
    await waitFor(() => expect(screen.getByTestId('entrar-ministerio')).toBeTruthy());
    const first = listMinistries()[0].name;
    await fireEvent.press(screen.getByTestId(`perfil-ministerio-${first}`));
    await fireEvent.press(screen.getByTestId('entrar-ministerio-continuar'));
    await waitFor(() => expect(screen.getByTestId('entrar-bio')).toBeTruthy());
    expect(calls('set_community_profile').at(-1)?.[1]).toMatchObject({ new_ministry: first, no_ministry: false });
    await fireEvent.press(screen.getByTestId('entrar-pular-bio'));
    expect(screen.getByTestId('entrar-previa').props.accessibilityLabel).toBe(
      `É assim que você aparece: ${authorLine('Davi', first)}`,
    );
  });

  test('nome longo demais: a tela diz por que o botão não funciona', async () => {
    await join();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    expect(screen.queryByTestId('perfil-nome-longo')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('perfil-nome'), 'M'.repeat(41));
    expect(screen.getByTestId('perfil-nome-longo').props.children).toBe(NAME_TOO_LONG_COPY);
    expect(screen.getByTestId('perfil-nome-longo').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('entrar-confirmar').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('perfil-nome'), 'Maria');
    expect(screen.queryByTestId('perfil-nome-longo')).toBeNull();
  });

  test('falha ao entrar: erro humano com "Tentar de novo", sem texto do servidor', async () => {
    mockRpc.results.join_community = { error: { message: 'TypeError: Network request failed' } };
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Não foi possível entrar agora')).toBeTruthy());
    expect(screen.queryByText(/TypeError/)).toBeNull();
    mockRpc.results.join_community = { data: true };
    await fireEvent.press(screen.getByTestId('entrar-tentar-de-novo'));
    await waitFor(() => expect(screen.getByTestId('entrar-foto')).toBeTruthy());
  });

  test('bloqueio vindo do servidor na entrada (CM004): tela de suspensão', async () => {
    mockRpc.results.join_community = { error: { code: 'CM004', message: 'entrada na comunidade bloqueada' } };
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Participação suspensa')).toBeTruthy());
    expect(screen.queryByText(/bloqueada/)).toBeNull();
  });

  test('a idade é uma caixa desmarcada; não há campo de nascimento, CPF ou telefone', async () => {
    await join();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    expect(textInputs().map((node) => node.props.accessibilityLabel)).toEqual(['Seu nome na comunidade']);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.queryByText(/CPF|telefone|nascimento:/i)).toBeNull();
  });

  test('suspenso ou removido: não entra de novo (nem tenta)', async () => {
    mockRpc.results.my_community_status = statusRow({ member_status: 'suspended' });
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Participação suspensa')).toBeTruthy());
    expect(calls('join_community')).toHaveLength(0);
    expect(screen.queryByTestId('entrar-foto')).toBeNull();
  });

  test('quem já é membro não refaz a entrada e pode editar o perfil', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Você já está na comunidade')).toBeTruthy());
    expect(screen.getByText('Você aparece como Ana.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-editar-perfil'));
    expect(router.push).toHaveBeenCalledWith('/comunidade/perfil');
  });

  test('"Voltar" no meio do perfil volta um passo, não sai da entrada', async () => {
    await join();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    expect(screen.getByTestId('entrar-perfil')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(screen.getByTestId('entrar-foto')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('fonte a 3,571×: os campos crescem (minHeight, nunca height) e a barra empilha', async () => {
    setViewport(AX5);
    await join();
    expect(screen.getByTestId('back-bar-second-row')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-pular-foto'));
    const style = StyleSheet.flatten(screen.getByTestId('perfil-nome').props.style);
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.fontWeight).toBeUndefined();
  });
});

describe('perfil da comunidade (C1, C4, N3)', () => {
  const COMPLETE = statusRow({
    is_member: true,
    member_status: 'active',
    display_name: 'Davi',
    ministry: null,
    ministry_answered: true,
    avatar_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
    avatar_status: 'approved',
    age_confirmed: true,
    profile_complete: true,
  });

  test('mostra "é assim que você aparece" e a foto assinada; e-mail vazio e novidades DESMARCADAS', async () => {
    mockRpc.results.my_community_status = COMPLETE;
    await render(<CommunityProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('perfil')).toBeTruthy());
    expect(screen.getByTestId('perfil-previa').props.accessibilityLabel).toBe('É assim que você aparece: Davi');
    expect(screen.queryByTestId('perfil-falta')).toBeNull();
    expect(screen.getByTestId('perfil-email').props.value).toBe('');
    expect(screen.getByTestId('perfil-novidades').props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText(NEWS_LABEL)).toBeTruthy();
    await waitFor(() =>
      expect(createSignedUrls).toHaveBeenCalledWith(['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg'], expect.any(Number)),
    );
  });

  test('N3: novidades sem e-mail não salva; com e-mail, vai junto com o aceite separado', async () => {
    mockRpc.results.my_community_status = COMPLETE;
    await render(<CommunityProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('perfil')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('perfil-novidades'));
    expect(screen.getByTestId('perfil-novidades-sem-email')).toBeTruthy();
    expect(screen.getByTestId('perfil-salvar').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('perfil-email'), 'Davi@Exemplo.com');
    await fireEvent.press(screen.getByTestId('perfil-salvar'));
    await waitFor(() => expect(screen.getByTestId('perfil-salvo')).toBeTruthy());
    expect(calls('set_community_contact')).toEqual([
      ['set_community_contact', { new_email: 'davi@exemplo.com', wants_news: true }],
    ]);
  });

  test('vindo de Publicar com o perfil incompleto: diz o que falta; completo, segue para Publicar', async () => {
    mockParams.current = { next: '/comunidade/publicar', day: '9' };
    mockRpc.results.my_community_status = statusRow({ is_member: true, member_status: 'active', display_name: 'Davi' });
    await render(<CommunityProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('perfil-falta')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('perfil-salvar'));
    await waitFor(() => expect(screen.getByTestId('perfil-salvo')).toBeTruthy());
    expect(router.replace).not.toHaveBeenCalled();
  });

  test('perfil completo vindo de Publicar: salvar leva de volta a Publicar com o dia', async () => {
    mockParams.current = { next: '/comunidade/publicar', day: '9' };
    mockRpc.results.my_community_status = COMPLETE;
    await render(<CommunityProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('perfil')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('perfil-salvar'));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({ pathname: '/comunidade/publicar', params: { day: '9' } }),
    );
  });
});

describe('Minhas publicações', () => {
  const rows = [
    {
      post_id: P1,
      body: 'Foto do meu caderno',
      photo_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
      day_number: 3,
      status: 'in_review',
      hold_reason: 'foto',
      created_at: '2026-09-25T12:00:00Z',
      published_at: null,
      decided_by: null,
      reason: null,
      note_for_author: null,
    },
    {
      post_id: P2,
      body: 'Deus é fiel',
      photo_path: null,
      day_number: 2,
      status: 'published',
      hold_reason: null,
      created_at: '2026-09-24T12:00:00Z',
      published_at: '2026-09-24T12:00:00Z',
      decided_by: null,
      reason: null,
      note_for_author: null,
    },
    {
      post_id: P3,
      body: 'Texto recusado',
      photo_path: null,
      day_number: null,
      status: 'not_published',
      hold_reason: 'termo',
      created_at: '2026-09-23T12:00:00Z',
      published_at: null,
      decided_by: 'pessoa',
      reason: 'ofensivo',
      note_for_author: 'Reescreva sem o deboche.',
      moderator_name: 'Fulano Moderador',
    },
  ];

  test('mostra cada estado em palavra, o motivo, quem decidiu (sem nome) e como contestar', async () => {
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.my_community_posts = { data: rows };
    await render(<MyPostsScreen />);
    await waitFor(() => expect(screen.getByTestId(`my-post-${P1}`)).toBeTruthy());

    expect(screen.getByText('Em análise')).toBeTruthy();
    expect(screen.getByText('Publicado')).toBeTruthy();
    expect(screen.getByText('Não publicado')).toBeTruthy();
    expect(screen.getByText(/Toda foto passa por uma pessoa da equipe/)).toBeTruthy();
    expect(screen.getByText('Motivo: Ofensa, humilhação ou deboche.')).toBeTruthy();
    expect(screen.getByText('Nota da equipe: Reescreva sem o deboche.')).toBeTruthy();
    expect(screen.getByText('Quem decidiu: uma pessoa da equipe de cuidado da comunidade.')).toBeTruthy();
    expect(screen.getByText(/Se achar que foi engano, peça revisão/)).toBeTruthy();
    expect(screen.queryByText(/Fulano/)).toBeNull();
    // Lista com fim, sem rolagem infinita.
    expect(screen.getByTestId('my-posts-end')).toBeTruthy();
    // A foto do próprio post em análise vem por URL assinada, numa chamada só.
    await waitFor(() => expect(createSignedUrls).toHaveBeenCalledTimes(1));
    // Sem e-mail publicado, nenhum botão de e-mail inventado.
    expect(screen.queryByTestId(`my-post-appeal-${P3}`)).toBeNull();
  });

  test('com e-mail publicado, o pedido de revisão aponta para ele', async () => {
    mockEnv.supportEmail = 'contato@igreja.org';
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.my_community_posts = { data: rows };
    await render(<MyPostsScreen />);
    await waitFor(() => expect(screen.getByTestId(`my-post-appeal-${P3}`)).toBeTruthy());
    expect(screen.getByText(/peça revisão pelo e-mail contato@igreja.org/)).toBeTruthy();
    expect(screen.queryByTestId(`my-post-appeal-${P2}`)).toBeNull();
  });

  test('apagar pede confirmação, chama a RPC com o id e tira da lista', async () => {
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.my_community_posts = { data: rows };
    await render(<MyPostsScreen />);
    await waitFor(() => expect(screen.getByTestId(`my-post-delete-${P2}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`my-post-delete-${P2}`));
    expect(screen.getByText('Apagar esta publicação?')).toBeTruthy();
    expect(calls('delete_my_community_post')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('my-posts-delete-confirm'));
    await waitFor(() => expect(screen.queryByTestId(`my-post-${P2}`)).toBeNull());
    expect(calls('delete_my_community_post')).toEqual([['delete_my_community_post', { target_post: P2 }]]);
    expect(screen.getByTestId('my-posts-notice').props.children).toBe('Publicação apagada.');
  });

  test('lista vazia: molde de vazio, sem cara de erro', async () => {
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.my_community_posts = { data: [] };
    await render(<MyPostsScreen />);
    await waitFor(() => expect(screen.getByText('Nada publicado ainda')).toBeTruthy());
  });
});

describe('Conta e privacidade', () => {
  test('bloqueados: lista com "Desbloquear", confirmação e RPC pelo id do bloqueio', async () => {
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.my_community_blocks = {
      data: [{ block_id: B1, display_name: 'Carlos', created_at: '2026-09-25T12:00:00Z' }],
    };
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByText('Carlos')).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`account-unblock-${B1}`));
    expect(screen.getByText('Desbloquear Carlos?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-unblock-confirm'));
    await waitFor(() => expect(screen.queryByText('Carlos')).toBeNull());
    expect(calls('unblock_community_member')).toEqual([['unblock_community_member', { target_block: B1 }]]);
    expect(screen.getByTestId('account-notice').props.children).toBe('Você desbloqueou Carlos.');
  });

  test('"Apagar tudo o que publiquei" revoga o consentimento de publicar, depois de confirmar', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-purge')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('account-purge'));
    await fireEvent.press(screen.getByTestId('sheet-purge-confirm'));
    await waitFor(() => expect(calls('revoke_community_publish_consent')).toHaveLength(1));
    expect(screen.getByTestId('account-notice').props.children).toBe('Tudo o que você publicou foi apagado.');
  });

  test('"Deixar de participar" é um toque e uma confirmação, e a tela muda na hora', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-leave')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('account-leave'));
    await fireEvent.press(screen.getByTestId('sheet-leave-confirm'));
    await waitFor(() => expect(calls('leave_community')).toHaveLength(1));
    expect(screen.queryByTestId('account-leave')).toBeNull();
    expect(screen.queryByTestId('account-blocks')).toBeNull();
    expect(screen.getByTestId('account-enter')).toBeTruthy();
    expect(calls('revoke_community_publish_consent')).toHaveLength(0);
  });

  test('erro numa ação fica na folha, em palavras, e nada muda', async () => {
    mockRpc.results.my_community_status = MEMBER;
    mockRpc.results.leave_community = { error: { message: 'Failed to fetch' } };
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-leave')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('account-leave'));
    await fireEvent.press(screen.getByTestId('sheet-leave-confirm'));
    await waitFor(() => expect(screen.getByTestId('sheet-leave-error')).toBeTruthy());
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
    expect(screen.getByTestId('account-leave')).toBeTruthy();
  });

  test('excluir conta: explica o que some e, sem a exclusão pronta, não mostra botão morto', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-delete-section')).toBeTruthy());
    expect(screen.getAllByText(/publicações, comentários, fotos e\s+Améns somem/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('account-delete-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('account-delete')).toBeNull();
    // Sem URL publicada, nenhum link web inventado.
    expect(screen.queryByTestId('account-delete-web')).toBeNull();
  });

  test('excluir conta pronta: confirmação forte (digitar EXCLUIR) e o caminho pela web', async () => {
    mockEnv.deletionAvailable = true;
    mockEnv.deletionUrl = 'https://igreja.org/excluir-conta';
    mockRpc.results.my_community_status = MEMBER;
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-delete')).toBeTruthy());
    expect(screen.getByTestId('account-delete-web')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-delete'));
    const confirm = () => screen.getByTestId('sheet-delete-confirm');
    expect(confirm().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('sheet-delete-input'), 'excluir');
    expect(confirm().props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(confirm());
    await waitFor(() => expect(auth.requestAccountDeletion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(auth.signOut).toHaveBeenCalled();
  });

  test('sair da conta', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<CommunityAccountScreen />);
    await waitFor(() => expect(screen.getByTestId('account-sign-out')).toBeTruthy());
    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-sign-out'));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});

describe('/conta com a Comunidade', () => {
  test('o motivo da comunidade diz que é 18+ e que o e-mail não aparece', async () => {
    mockEnv.email = null;
    mockParams.current = { reason: 'comunidade' };
    await render(<AccountScreen />);
    expect(screen.getByText(/só para quem tem 18 anos ou mais/)).toBeTruthy();
  });

  test('conectado, leva a "Conta e privacidade" da comunidade', async () => {
    await render(<AccountScreen />);
    await fireEvent.press(screen.getByTestId('account-community-privacy'));
    expect(router.push).toHaveBeenCalledWith('/comunidade/conta-e-privacidade');
  });

  test('com a Comunidade desligada, /conta continua como na V1', async () => {
    mockEnv.enabled = false;
    await render(<AccountScreen />);
    expect(screen.queryByTestId('account-community-privacy')).toBeNull();
    expect(screen.getByText(/Excluir a conta e exportar os dados ainda não estão disponíveis/)).toBeTruthy();
  });

  test('5.1.1(v): com a exclusão pronta, /conta exclui mesmo com o servidor da comunidade em erro', async () => {
    mockEnv.deletionAvailable = true;
    mockRpc.results.my_community_status = { error: { message: 'Failed to fetch' } };
    await render(<AccountScreen />);
    expect(screen.getByTestId('account-delete-section')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('account-delete'));
    await fireEvent.changeText(screen.getByTestId('sheet-delete-input'), 'EXCLUIR');
    await fireEvent.press(screen.getByTestId('sheet-delete-confirm'));
    await waitFor(() => expect(auth.requestAccountDeletion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(calls('my_community_status')).toHaveLength(0);
  });

  test('sem a exclusão pronta, /conta não mostra botão morto de exclusão', async () => {
    await render(<AccountScreen />);
    expect(screen.queryByTestId('account-delete')).toBeNull();
    expect(screen.queryByTestId('account-delete-section')).toBeNull();
  });
});
