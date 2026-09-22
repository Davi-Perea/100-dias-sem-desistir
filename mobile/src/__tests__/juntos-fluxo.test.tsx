/**
 * Aba "Juntos" (pedido do fundador, 2026-09-22 de madrugada): "como seria se um
 * desconhecido instalasse no dia 23".
 *
 * Prova, com o cliente da comunidade SIMULADO (mesmo molde de
 * comunidade-feed.test.tsx):
 *   - a aba se chama "Juntos" (rótulo e título), nunca "Comunidade";
 *   - tocar nela cai DIRETO no feed: sem sessão, a conta do aparelho é criada
 *     sozinha; sem ser membro, entra sozinha com o nome da entrada do app; sem
 *     "entrar", sem código, sem "crie o seu perfil";
 *   - o primeiro Amém abre a tela única de aceite e, depois de "Concordo e
 *     continuar", o Amém é registrado sem outro toque; saindo sem concordar,
 *     nada é enviado;
 *   - Publicar: depois do aceite, o post que a pessoa deixou pronto sai sozinho.
 * Não prova o servidor.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import JuntosTab from '@/app/(tabs)/juntos';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { AFTER_CONSENT_FEED } from '@/ui/comunidade/feed/FeedScreen';
import { ACEITE_LINE, CAMPOS, PENDING_NOTICE, type CampoId } from '@/ui/comunidade/publicar/textos';

/* ------------------------------------------------------------------ mocks */

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
const mockFocused = new Set<() => void>();
/** A pessoa volta para a tela (da tela de aceite, por exemplo). */
async function refocus() {
  await act(async () => {
    mockFocused.forEach((callback) => callback());
  });
}

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => mockParams,
    useSegments: () => [],
    useFocusEffect: (callback: () => void) =>
      useEffect(() => {
        mockFocused.add(callback);
        callback();
        return () => {
          mockFocused.delete(callback);
        };
      }, [callback]),
    Stack: { Screen: () => null },
    Link: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'),
  digestStringAsync: jest.fn(async () => 'AB'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

let mockSignedIn = true;
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: true,
    loading: false,
    session: mockSignedIn ? { user: { id: 'u1', is_anonymous: true } } : null,
    signedIn: mockSignedIn,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));

// A conta do aparelho é do Supabase Auth, fora deste teste; o join é o de verdade (pela API simulada).
jest.mock('@/community/deviceSession', () => {
  const actual = jest.requireActual('@/community/deviceSession');
  return { ...actual, ensureDeviceSession: jest.fn(async () => {}) };
});
const mockDeviceSession = jest.requireMock('@/community/deviceSession') as { ensureDeviceSession: jest.Mock };

// O nome que a pessoa deu na entrada do app (settings.profile.name).
let mockEntryName: string | null = 'Davi';
jest.mock('@/settings/settingsStore', () => ({
  useSettings: () => ({ profile: { name: mockEntryName, goals: [] } }),
}));

let mockApi: CommunityApi | null = null;
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return { ...actual, getCommunityApi: () => mockApi };
});

jest.mock('@/net/useOnline', () => ({ useOnline: () => true }));
jest.mock('@/journey/useJourney', () => ({
  useJourney: () => ({ officialDay: 1, phase: 'running', contentState: 'authorized', campaign: { title: '100 dias' } }),
}));
jest.mock('@/config/features', () => ({ COMMUNITY_ENABLED: true }));

/* ------------------------------------------------------ cliente simulado */

type Reply = { data?: unknown; error?: unknown };
type Handler = Reply | ((args: Record<string, unknown> | undefined) => Reply);

const POST = '20000000-0000-4000-8000-000000000001';
const NOW = Date.parse('2026-09-23T12:00:00Z');

const FEED = [
  {
    post_id: POST,
    body: 'Comecei Gênesis hoje.',
    photo_path: null,
    day_number: 1,
    published_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    author_name: 'Marina',
    is_mine: false,
    i_said_amen: false,
  },
];

/** Recém-chegada: membro, sem 16+, sem regras, sem consentimento. */
function status(patch: Record<string, unknown> = {}) {
  return {
    is_member: true,
    member_status: 'active',
    display_name: 'Davi',
    age_confirmed: false,
    can_publish: false,
    needs_publish_consent: true,
    needs_rules: true,
    publish_consent_version: 'PENDENTE',
    rules_version: 'PENDENTE',
    is_moderator: false,
    ...patch,
  };
}
const ACCEPTED = { age_confirmed: true, needs_rules: false, needs_publish_consent: false, can_publish: true };

function setup(handlers: Record<string, Handler> = {}) {
  const all: Record<string, Handler> = {
    my_community_status: { data: [status()] },
    community_feed: { data: FEED },
    my_community_posts: { data: [] },
    ...handlers,
  };
  const rpc = jest.fn(async (fn: string, args?: Record<string, unknown>) => {
    const h = all[fn] ?? {};
    const reply = typeof h === 'function' ? h(args) : h;
    return { data: reply.data ?? null, error: reply.error ?? null };
  });
  const storage = {
    from: () => ({
      upload: jest.fn(async () => ({ data: null, error: null })),
      createSignedUrls: jest.fn(async () => ({ data: [], error: null })),
      remove: jest.fn(async () => ({ data: [], error: null })),
    }),
  };
  const client: CommunityClient = { rpc, storage };
  mockApi = createCommunityApi(client, { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  return { rpc, handlers: all };
}

function calls(rpc: jest.Mock, fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn).map(([, args]) => args);
}

/**
 * Texto do aceite APROVADO pela igreja (o contrário do rascunho PENDENTE que o
 * app traz hoje): mesma manobra de comunidade-publicar.test.tsx. Sem isto,
 * ninguém aceita — e é justamente esse portão que um dos testes prova.
 */
const ORIGINAL_CAMPOS = { ...CAMPOS };
function fillCampos(version: string) {
  for (const key of Object.keys(CAMPOS) as CampoId[]) CAMPOS[key] = `valor-${key}`;
  CAMPOS.versaoRegras = version;
  CAMPOS.versaoConsentimento = version;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSignedIn = true;
  mockEntryName = 'Davi';
  mockParams = {};
  mockApi = null;
  mockFocused.clear();
  Object.assign(CAMPOS, ORIGINAL_CAMPOS);
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* ---------------------------------------------------------------- entrada */

describe('tocar em Juntos cai direto no feed', () => {
  test('já dentro: título "Juntos", o feed na hora, nada de entrar, código ou perfil', async () => {
    setup();
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-body-${POST}`)).toBeTruthy());
    expect(screen.getByText('Juntos')).toBeTruthy();
    expect(screen.queryByText('Comunidade')).toBeNull();
    expect(screen.getByLabelText('Publicar no Juntos')).toBeTruthy();
    expect(screen.queryByText(/Entrar na comunidade|Criar meu perfil|crie o seu perfil|código/i)).toBeNull();
  });

  test('sem sessão: a conta do aparelho é criada sozinha, sem botão e sem e-mail', async () => {
    const { rpc } = setup();
    mockSignedIn = false;
    await render(<JuntosTab />);
    await waitFor(() => expect(mockDeviceSession.ensureDeviceSession).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('feed-loading')).toBeTruthy();
    expect(screen.queryByText(/Entrar na comunidade|e-mail/i)).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  test('ainda não é membro: entra sozinha com o nome da entrada do app e já vê o feed', async () => {
    let member = false;
    const { rpc } = setup({
      my_community_status: () => ({
        data: [member ? status() : status({ is_member: false, member_status: null, display_name: null })],
      }),
      join_community: () => {
        member = true;
        return { data: true };
      },
    });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-body-${POST}`)).toBeTruthy());
    expect(calls(rpc, 'join_community')).toEqual([{ chosen_name: 'Davi' }]);
    expect(screen.queryByText(/crie o seu perfil|Criar meu perfil/i)).toBeNull();
  });

  test('sem nome na entrada do app: entra do mesmo jeito (o nome é pedido só no aceite)', async () => {
    mockEntryName = null;
    let member = false;
    const { rpc } = setup({
      my_community_status: () => ({
        data: [member ? status({ display_name: null }) : status({ is_member: false, member_status: null })],
      }),
      join_community: () => {
        member = true;
        return { data: true };
      },
    });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-body-${POST}`)).toBeTruthy());
    expect(calls(rpc, 'join_community')).toEqual([{ chosen_name: null }]);
  });

  test('suspensa: não entra de novo, diz o que é', async () => {
    const { rpc } = setup({
      my_community_status: { data: [status({ is_member: false, member_status: 'suspended' })] },
    });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId('gate-suspended')).toBeTruthy());
    expect(calls(rpc, 'join_community')).toEqual([]);
  });

  test('falha ao entrar: erro humano com "Tentar de novo", e tentar de novo entra', async () => {
    let attempts = 0;
    let member = false;
    setup({
      my_community_status: () => ({
        data: [member ? status() : status({ is_member: false, member_status: null })],
      }),
      join_community: () => {
        attempts += 1;
        if (attempts === 1) return { error: { message: 'TypeError: Network request failed' } };
        member = true;
        return { data: true };
      },
    });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId('gate-error')).toBeTruthy());
    expect(screen.queryByText(/TypeError/)).toBeNull();
    await fireEvent.press(screen.getByTestId('gate-error-retry'));
    await waitFor(() => expect(screen.getByTestId(`post-body-${POST}`)).toBeTruthy());
    expect(attempts).toBe(2);
  });
});

/* ----------------------------------------------------------------- aceite */

/**
 * O ACEITE NÃO É MAIS UMA TELA (decisão do fundador, 2026-09-22): a linha fica no
 * topo do feed enquanto o aceite falta, e o toque no Amém registra 16+, as regras
 * e o consentimento destacado antes de o Amém ir. Aqui se prova o FEED; a tela de
 * publicar tem a própria suíte (comunidade-publicar.test.tsx).
 */
describe('primeiro Amém: aceite no próprio toque, sem tela', () => {
  test('a linha do aceite está à vista, e o Amém não leva a tela nenhuma', async () => {
    setup({ set_amen: (args) => ({ data: args?.amen === true }) });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST}`)).toBeTruthy());
    // A frase do fundador, palavra por palavra, com o link para as regras.
    expect(screen.getByTestId('feed-aceite-line').props.accessibilityLabel).toContain(ACEITE_LINE);
    await fireEvent.press(screen.getByTestId(`post-amen-${POST}`));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('texto ainda não liberado pela igreja: o Amém diz isso e NADA é enviado nem aceito', async () => {
    const { rpc } = setup({ set_amen: (args) => ({ data: args?.amen === true }) });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST}`));
    await waitFor(() => expect(screen.getByTestId('feed-consent-notice').props.children).toBe(PENDING_NOTICE));
    expect(calls(rpc, 'set_amen')).toEqual([]);
    expect(calls(rpc, 'accept_community_terms')).toEqual([]);
    expect(calls(rpc, 'set_community_profile')).toEqual([]);
  });

  test('com o texto aprovado: um toque registra 16+, regras e consentimento, e AÍ manda o Amém', async () => {
    fillCampos('1.0');
    const approved = { rules_version: '1.0', publish_consent_version: '1.0' };
    let accepted = false;
    const { rpc } = setup({
      my_community_status: () => ({ data: [accepted ? status({ ...ACCEPTED, ...approved }) : status(approved)] }),
      set_community_profile: { data: true },
      accept_community_terms: () => {
        accepted = true;
        return { data: true };
      },
      set_amen: (args) => ({ data: args?.amen === true }),
    });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST}`));

    // Ordem: 16+ e os DOIS aceites ANTES do Amém (Google Play; Apple 1.2).
    await waitFor(() =>
      expect(calls(rpc, 'set_amen')).toEqual([{ target_post: POST, amen: true, accept_terms: null }]),
    );
    const reads = new Set(['my_community_status', 'community_feed', 'my_community_posts']);
    expect(rpc.mock.calls.map(([name]) => name as string).filter((name) => !reads.has(name))).toEqual([
      'set_community_profile',
      'accept_community_terms',
      'accept_community_terms',
      'set_amen',
    ]);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('feed-consent-notice').props.children).toBe(AFTER_CONSENT_FEED);
  });

  test('o Amém não fica guardado para depois: voltar à aba não envia nada sozinho', async () => {
    const { rpc } = setup({ set_amen: (args) => ({ data: args?.amen === true }) });
    await render(<JuntosTab />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST}`));
    await refocus();
    expect(calls(rpc, 'set_amen')).toEqual([]);
  });
});
