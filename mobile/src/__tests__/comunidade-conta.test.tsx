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
import MyPostsScreen from '@/app/comunidade/minhas-publicacoes';
import { createCommunityApi, type CommunityClient } from '@/community/api';
import { CODE_FORMAT_COPY, INVALID_CODE_COPY, UNDER_18_COPY } from '@/ui/comunidade/perfil/EntradaFlow';
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

  test('sem conta: pede o e-mail e leva ao /conta com o motivo da comunidade', async () => {
    mockEnv.email = null;
    await render(<EntrarScreen />);
    expect(screen.getByText('Entre com o seu e-mail')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('community-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/conta?reason=comunidade');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('sessão anônima não conta como conta de e-mail', async () => {
    mockEnv.anonymous = true;
    await render(<EntrarScreen />);
    expect(screen.getByText('Entre com o seu e-mail')).toBeTruthy();
  });

  test('servidor fora do ar: erro humano com "Tentar de novo", sem texto cru', async () => {
    mockRpc.results.my_community_status = { error: { message: 'TypeError: Network request failed' } };
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Não deu para carregar')).toBeTruthy());
    expect(screen.queryByText(/TypeError/)).toBeNull();
    mockRpc.results.my_community_status = statusRow();
    await fireEvent.press(screen.getByTestId('community-retry'));
    await waitFor(() => expect(screen.getByTestId('entrar-idade')).toBeTruthy());
  });
});

describe('entrada: 18+ → código → perfil', () => {
  async function toCodeStep() {
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-idade')).toBeTruthy());
    expect(screen.getByText('Passo 1 de 3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-adulto'));
    expect(screen.getByTestId('entrar-codigo')).toBeTruthy();
  }

  test('caminho feliz: uma só chamada, com o código normalizado, o nome e a declaração de 18+', async () => {
    mockRpc.results.redeem_invite_code = { data: true };
    await toCodeStep();
    await fireEvent.changeText(screen.getByTestId('entrar-codigo-input'), 'abcde 23456');
    expect(screen.getByTestId('entrar-codigo-formatado').props.children).toEqual(['Código: ', 'ABCDE-23456']);
    await fireEvent.press(screen.getByTestId('entrar-codigo-continuar'));
    expect(screen.getByTestId('entrar-perfil')).toBeTruthy();
    // O código ainda não foi gasto: o servidor só é chamado com o nome.
    expect(calls('redeem_invite_code')).toHaveLength(0);

    // Nenhum nome vem pré-preenchido (nunca derivado do e-mail).
    expect(screen.getByTestId('entrar-nome-input').props.value).toBe('');
    expect(screen.getByTestId('entrar-confirmar').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('entrar-nome-input'), '  Ana Souza ');
    expect(screen.getByTestId('entrar-previa').props.accessibilityLabel).toBe('É assim que você aparece: Ana Souza');
    await fireEvent.press(screen.getByTestId('entrar-confirmar'));

    await waitFor(() => expect(screen.getByTestId('entrar-pronto')).toBeTruthy());
    expect(calls('redeem_invite_code')).toEqual([
      ['redeem_invite_code', { invite_code: 'ABCDE23456', chosen_name: 'Ana Souza', confirms_adult: true }],
    ]);
    // A tela seguinte não promete publicar sem regras e consentimento.
    expect(screen.getByText(/mostra as regras da comunidade e pede o seu consentimento/)).toBeTruthy();
  });

  test('código sem forma de código: avisa no aparelho e não gasta tentativa', async () => {
    await toCodeStep();
    await fireEvent.changeText(screen.getByTestId('entrar-codigo-input'), 'OI123');
    await fireEvent.press(screen.getByTestId('entrar-codigo-continuar'));
    expect(screen.getByTestId('entrar-codigo-erro').props.children).toBe(CODE_FORMAT_COPY);
    expect(screen.getByTestId('entrar-codigo')).toBeTruthy();
    expect(calls('redeem_invite_code')).toHaveLength(0);
  });

  test('código errado, vencido ou cancelado: volta ao passo do código com a mesma frase', async () => {
    mockRpc.results.redeem_invite_code = { data: false };
    await toCodeStep();
    await fireEvent.changeText(screen.getByTestId('entrar-codigo-input'), 'ABCDE-23456');
    await fireEvent.press(screen.getByTestId('entrar-codigo-continuar'));
    await fireEvent.changeText(screen.getByTestId('entrar-nome-input'), 'Ana');
    await fireEvent.press(screen.getByTestId('entrar-confirmar'));
    await waitFor(() => expect(screen.getByTestId('entrar-codigo')).toBeTruthy());
    expect(screen.getByTestId('entrar-codigo-erro').props.children).toBe(INVALID_CODE_COPY);
    expect(INVALID_CODE_COPY).toMatch(/errado, vencido ou cancelado/);
    // O que a pessoa digitou continua lá para corrigir.
    expect(screen.getByTestId('entrar-codigo-input').props.value).toBe('ABCDE-23456');
  });

  test('limite de tentativas: frase própria, sem texto do servidor', async () => {
    mockRpc.results.redeem_invite_code = { error: { code: 'CM003', message: 'limite de tentativas' } };
    await toCodeStep();
    await fireEvent.changeText(screen.getByTestId('entrar-codigo-input'), 'ABCDE-23456');
    await fireEvent.press(screen.getByTestId('entrar-codigo-continuar'));
    await fireEvent.changeText(screen.getByTestId('entrar-nome-input'), 'Ana');
    await fireEvent.press(screen.getByTestId('entrar-confirmar'));
    await waitFor(() => expect(screen.getByTestId('entrar-codigo-erro')).toBeTruthy());
    expect(screen.getByTestId('entrar-codigo-erro').props.children).toMatch(/Muitas tentativas/);
    expect(screen.queryByText(/limite de tentativas/)).toBeNull();
  });

  test('quem tem menos de 18 não segue, e nada é enviado', async () => {
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-idade')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('entrar-menor-de-18'));
    expect(screen.getByText(UNDER_18_COPY)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-menor-voltar'));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(calls('redeem_invite_code')).toHaveLength(0);
  });

  test('a declaração de idade é um toque explícito; não há campo de nascimento, CPF ou telefone', async () => {
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-idade')).toBeTruthy());
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(textInputs()).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('entrar-adulto'));
    await fireEvent.changeText(screen.getByTestId('entrar-codigo-input'), 'ABCDE-23456');
    await fireEvent.press(screen.getByTestId('entrar-codigo-continuar'));
    expect(textInputs().map((node) => node.props.accessibilityLabel)).toEqual(['Seu nome na comunidade']);
    expect(screen.queryByText(/CPF|telefone/i)).toBeNull();
  });

  test('suspenso ou removido: não entra com outro código', async () => {
    mockRpc.results.my_community_status = statusRow({ member_status: 'suspended' });
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Participação suspensa')).toBeTruthy());
    expect(screen.queryByTestId('entrar-codigo-input')).toBeNull();
  });

  test('quem já é membro não refaz a entrada', async () => {
    mockRpc.results.my_community_status = MEMBER;
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByText('Você já está na comunidade')).toBeTruthy());
    expect(screen.getByText('Você aparece como Ana.')).toBeTruthy();
  });

  test('"Voltar" no meio volta um passo, não sai da entrada', async () => {
    await toCodeStep();
    await fireEvent.press(screen.getByTestId('back-button'));
    expect(screen.getByTestId('entrar-idade')).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('fonte a 3,571×: os campos crescem (minHeight, nunca height) e a barra empilha', async () => {
    setViewport(AX5);
    await render(<EntrarScreen />);
    await waitFor(() => expect(screen.getByTestId('entrar-idade')).toBeTruthy());
    expect(screen.getByTestId('back-bar-second-row')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('entrar-adulto'));
    const style = StyleSheet.flatten(screen.getByTestId('entrar-codigo-input').props.style);
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.fontWeight).toBeUndefined();
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
    expect(screen.getByTestId('account-notice').props.children).toBe('Carlos foi desbloqueado.');
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
