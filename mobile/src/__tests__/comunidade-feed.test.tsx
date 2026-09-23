/**
 * Feed (C1, C2) e comentários (C6) com o cliente da Comunidade SIMULADO (mesmo
 * molde de comunidade-cliente.test.ts). Prova o comportamento das TELAS: os
 * portões honestos (sem servidor, sem conta, sem perfil, suspensa), o Amém (sem número
 * quando ninguém disse Amém), o feed com fim (sem rolagem infinita), o "Em análise" só para o
 * autor, as regras e o consentimento antes do primeiro Amém ou comentário, e
 * que o campo de comentário nunca vem pré-preenchido. Não prova o servidor.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Keyboard } from 'react-native';

import CommunityTab from '@/app/(tabs)/juntos';
import PostCommentsRoute from '@/app/comunidade/post/[id]';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { postMeta, relativeTime } from '@/ui/comunidade/feed/tempo';
import { ACEITE_LINE, CAMPOS, PENDING_NOTICE, type CampoId } from '@/ui/comunidade/publicar/textos';

/* ------------------------------------------------------------------ mocks */

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};
let mockParams: Record<string, string> = {};
const mockFocused = new Set<() => void>();
/** A pessoa volta para a tela (das regras e do consentimento, por exemplo). */
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
    // Foco = montagem, como na primeira vez que a aba aparece. `refocus()` simula a volta à tela.
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
    session: mockSignedIn ? { user: { id: 'u1' } } : null,
    signedIn: mockSignedIn,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));

// A conta do aparelho é do Supabase Auth, fora deste teste.
jest.mock('@/community/deviceSession', () => {
  const actual = jest.requireActual('@/community/deviceSession');
  return { ...actual, ensureDeviceSession: jest.fn(async () => {}) };
});
const mockDeviceSession = jest.requireMock('@/community/deviceSession') as { ensureDeviceSession: jest.Mock };
jest.mock('@/settings/settingsStore', () => ({
  useSettings: () => ({ profile: { name: 'Davi', goals: [] } }),
}));

let mockApi: CommunityApi | null = null;
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return { ...actual, getCommunityApi: () => mockApi };
});

let mockOnline = true;
jest.mock('@/net/useOnline', () => ({ useOnline: () => mockOnline }));

let mockDay = 17;
jest.mock('@/journey/useJourney', () => ({
  useJourney: () => ({
    officialDay: mockDay,
    phase: 'running',
    contentState: 'authorized',
    campaign: { title: '100 dias' },
  }),
}));

jest.mock('@/ui/comunidade/feed/JuntosSemComunidade', () => {
  const { Text } = jest.requireActual('react-native');
  return { JuntosSemComunidade: () => <Text testID="juntos-sem-comunidade">altar e propósito</Text> };
});

let mockFlag = true;
jest.mock('@/config/features', () => ({
  get COMMUNITY_ENABLED() {
    return mockFlag;
  },
}));

/* ------------------------------------------------------ cliente simulado */

type Reply = { data?: unknown; error?: unknown };
type Handler = Reply | ((args: Record<string, unknown> | undefined) => Reply);

const POST = (i: number) => `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const COMMENT = (i: number) => `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const NOW = Date.parse('2026-10-01T15:00:00Z');

function feedRow(i: number, extra: Record<string, unknown> = {}) {
  return {
    post_id: POST(i),
    body: `Palavra ${i}`,
    photo_path: null,
    day_number: 9,
    published_at: new Date(NOW - (i + 1) * 60 * 60 * 1000).toISOString(),
    author_name: i % 2 === 0 ? 'Ana' : 'Bruno',
    is_mine: false,
    i_said_amen: false,
    ...extra,
  };
}

const READY_STATUS = {
  is_member: true,
  member_status: 'active',
  display_name: 'Davi',
  // Tela única de aceite (2026-09-23): 16+ confirmado faz parte do "pronto".
  age_confirmed: true,
  can_publish: true,
  needs_publish_consent: false,
  needs_rules: false,
  publish_consent_version: '1.0',
  rules_version: '1.0',
  is_moderator: false,
};

function setup(handlers: Record<string, Handler> = {}) {
  const all: Record<string, Handler> = {
    my_community_status: { data: [READY_STATUS] },
    community_feed: { data: [feedRow(0), feedRow(1)] },
    my_community_posts: { data: [] },
    ...handlers,
  };
  const rpc = jest.fn(async (fn: string, args?: Record<string, unknown>) => {
    const h = all[fn] ?? {};
    const reply = typeof h === 'function' ? h(args) : h;
    return { data: reply.data ?? null, error: reply.error ?? null };
  });
  const createSignedUrls = jest.fn(async (paths: string[]) => ({
    data: paths.map((p) => ({ path: p, signedUrl: `https://assinada/${p}`, error: null })),
    error: null,
  }));
  const storage = {
    from: () => ({
      upload: jest.fn(async () => ({ data: null, error: null })),
      createSignedUrls,
      remove: jest.fn(async () => ({ data: [], error: null })),
    }),
  };
  const client: CommunityClient = { rpc, storage };
  mockApi = createCommunityApi(client, { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  return { rpc, createSignedUrls, handlers: all };
}

function calls(rpc: jest.Mock, fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn);
}

/** Todo o texto visível na tela, para procurar número de Amém ou de comentários. */
function allText(): string {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === 'object' && 'children' in (node as object)) walk((node as { children: unknown }).children);
  };
  walk(screen.toJSON());
  return out.join(' ');
}

/**
 * Texto do aceite APROVADO pela igreja (o app traz o rascunho PENDENTE): mesma
 * manobra de comunidade-publicar.test.tsx. Sem isto ninguém aceita — e esse
 * portão também é testado.
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
  mockOnline = true;
  mockDay = 17;
  mockFlag = true;
  mockParams = {};
  mockApi = null;
  Object.assign(CAMPOS, ORIGINAL_CAMPOS);
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* --------------------------------------------------------------- portões */

describe('C1: portões honestos antes do feed', () => {
  test('Comunidade desligada nesta build: a aba mostra a tela sem Comunidade (altar), nunca o feed', async () => {
    mockFlag = false;
    await render(<CommunityTab />);
    expect(screen.getByTestId('juntos-sem-comunidade')).toBeTruthy();
    expect(screen.queryByTestId('feed-write')).toBeNull();
    expect(screen.queryByText('Ver comentários')).toBeNull();
  });

  test('ligada, mas sem servidor configurado: diz isso e não mostra feed falso', async () => {
    mockApi = null;
    await render(<CommunityTab />);
    expect(screen.getByTestId('gate-no-server')).toBeTruthy();
    expect(screen.queryByTestId('feed-write')).toBeNull();
    expect(screen.queryByTestId(/^post-/)).toBeNull();
  });

  test('sem conta: a conta do aparelho é criada sozinha, sem e-mail, sem 18+ e sem botão de entrar (Juntos)', async () => {
    const { rpc } = setup();
    mockSignedIn = false;
    await render(<FeedScreen />);
    await waitFor(() => expect(mockDeviceSession.ensureDeviceSession).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('gate-sign-in')).toBeNull();
    expect(screen.queryByText(/18 anos/)).toBeNull();
    expect(screen.queryByText(/e-mail/)).toBeNull();
    expect(screen.queryByText(/Entrar na comunidade/)).toBeNull();
    expect(screen.getByTestId('feed-loading')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  test('com conta e ainda fora: entra sozinho com o nome da entrada do app e cai direto no feed (sem código)', async () => {
    let member = false;
    const { rpc } = setup({
      my_community_status: () => ({
        data: [member ? READY_STATUS : { ...READY_STATUS, is_member: false, member_status: null }],
      }),
      join_community: () => {
        member = true;
        return { data: true };
      },
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    expect(calls(rpc, 'join_community')).toHaveLength(1);
    expect(JSON.stringify(calls(rpc, 'join_community')[0][1])).toContain('Davi');
    expect(screen.queryByText(/código/)).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('participação suspensa: estado próprio, sem feed', async () => {
    const { rpc } = setup({ my_community_status: { data: [{ ...READY_STATUS, member_status: 'suspended' }] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('gate-suspended')).toBeTruthy());
    expect(calls(rpc, 'community_feed')).toHaveLength(0);
  });

  test('erro ao perguntar o estado: mensagem humana e "Tentar de novo", sem texto cru do servidor', async () => {
    setup({ my_community_status: { error: { code: 'XX000', message: 'relation private.x does not exist' } } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('gate-error')).toBeTruthy());
    expect(screen.queryByText(/relation private/)).toBeNull();
    expect(screen.getByTestId('gate-error-retry')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ feed */

describe('C1: feed', () => {
  test('cabeçalho: "Juntos", sino e pílula "Escrever" (vai para Publicar); SEM filtro de grupo', async () => {
    setup();
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
    expect(screen.getByText('Juntos')).toBeTruthy();
    expect(screen.getByTestId('feed-bell')).toBeTruthy();
    // 2026-09-22: só a igreja toda — o filtro saiu do topo.
    expect(screen.queryByTestId('feed-scope')).toBeNull();
    expect(screen.queryByText('Meu ministério')).toBeNull();
    await fireEvent.press(screen.getByTestId('feed-write'));
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/publicar');
  });

  test('cartão: "Ana · há 1 h", "Dia 9", texto, Amém e comentar — sem número quando ninguém disse Amém', async () => {
    setup();
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
    expect(screen.getByText('Ana · há 1 h')).toBeTruthy();
    expect(screen.getAllByText('Dia 9')).toHaveLength(2);
    expect(screen.getByText('Palavra 0')).toBeTruthy();
    expect(screen.getAllByLabelText('Amém')).toHaveLength(2);
    expect(screen.getAllByLabelText('Comentar')).toHaveLength(2);
    // Zero não vira número: sem Amém e sem comentário, nada ao lado dos ícones.
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  test('F1: sem rótulo de grupo no cartão, e a foto de perfil assinada', async () => {
    const avatar = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg';
    const { createSignedUrls } = setup({
      community_feed: {
        data: [feedRow(0, { author_ministry: 'Comunicação', author_avatar_path: avatar }), feedRow(1)],
      },
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
    expect(screen.getByTestId(`post-author-${POST(0)}`).props.children).toBe('Ana · há 1 h');
    expect(screen.queryByTestId(`post-group-${POST(0)}`, { includeHiddenElements: true })).toBeNull();
    await waitFor(() => expect(createSignedUrls).toHaveBeenCalledWith([avatar], expect.any(Number)));
  });

  test('Amém marca e desmarca, só o MEU estado, e manda o id do post e nada mais', async () => {
    const { rpc } = setup({ set_amen: (args) => ({ data: args?.amen === true }) });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    const amen = screen.getByTestId(`post-amen-${POST(0)}`);
    expect(amen.props.accessibilityState).toMatchObject({ checked: false });

    await fireEvent.press(amen);
    await waitFor(() =>
      expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: true }),
    );
    expect(rpc).toHaveBeenCalledWith('set_amen', { target_post: POST(0), amen: true, accept_terms: null });

    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() =>
      expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: false }),
    );
    expect(rpc).toHaveBeenLastCalledWith('set_amen', { target_post: POST(0), amen: false, accept_terms: null });
  });

  test('Amém que falha volta ao estado anterior e diz por quê, sem texto cru', async () => {
    setup({ set_amen: { error: { code: 'CM003', message: 'rate limit raw' } } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('feed-notice')).toBeTruthy());
    expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText('Você chegou ao limite por agora. Tente de novo mais tarde.')).toBeTruthy();
    expect(screen.queryByText(/raw/)).toBeNull();
  });

  /* O ACEITE SAIU DA TELA (decisão do fundador, 2026-09-22): a linha fica no topo
     do feed e o próprio toque no Amém registra. O caminho inteiro (registrar e
     então mandar o Amém, com o texto já aprovado pela igreja) está em
     juntos-fluxo.test.tsx; aqui se prova que NINGUÉM é mandado para uma tela. */
  test('antes do primeiro Amém: a linha do aceite no topo, e nenhuma tela de aceite', async () => {
    setup({
      my_community_status: { data: [{ ...READY_STATUS, needs_rules: true, needs_publish_consent: true }] },
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    expect(screen.getByTestId('feed-aceite-line')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('falta só o consentimento: a mesma linha, e o Amém também não navega', async () => {
    setup({ my_community_status: { data: [{ ...READY_STATUS, needs_publish_consent: true }] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    expect(screen.getByTestId('feed-aceite-line')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('aceite já feito: a linha não aparece', async () => {
    setup();
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    expect(screen.queryByTestId('feed-aceite-line')).toBeNull();
  });

  test('texto do aceite ainda não liberado pela igreja: o Amém diz isso, e nada é enviado nem aceito', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { rpc } = setup({
      my_community_status: { data: [{ ...READY_STATUS, needs_rules: true, needs_publish_consent: true }] },
      set_amen: (args) => ({ data: args?.amen === true }),
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('feed-consent-notice')).toBeTruthy());
    expect(screen.getByTestId('feed-consent-notice').props.children).toBe(PENDING_NOTICE);
    expect(announce).toHaveBeenCalledWith(PENDING_NOTICE);
    expect(calls(rpc, 'set_amen')).toHaveLength(0);
    expect(calls(rpc, 'accept_community_terms')).toHaveLength(0);
  });

  test('o Amém não fica guardado para depois: voltar à tela não envia nada sozinho', async () => {
    const { rpc, handlers } = setup({ my_community_status: { data: [{ ...READY_STATUS, needs_publish_consent: true }] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    // Mesmo que outro caminho libere depois, o toque de antes não volta sozinho.
    handlers.my_community_status = { data: [READY_STATUS] };
    await refocus();
    await waitFor(() => expect(calls(rpc, 'my_community_status').length).toBeGreaterThanOrEqual(2));
    expect(calls(rpc, 'set_amen')).toHaveLength(0);
  });

  test('toques seguidos no Amém não se perdem: vale o último', async () => {
    let release: (() => void) | null = null;
    const { rpc } = setup({ set_amen: (args) => ({ data: args?.amen === true }) });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-amen-${POST(0)}`)).toBeTruthy());
    const original = rpc.getMockImplementation()!;
    rpc.mockImplementation(async (fn: string, args?: Record<string, unknown>) => {
      if (fn === 'set_amen' && calls(rpc, 'set_amen').length === 1) await new Promise<void>((r) => (release = r));
      return original(fn, args);
    });
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`)); // marca (fica no ar)
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`)); // desmarca
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`)); // marca de novo
    expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: true });
    await act(async () => release?.());
    await waitFor(() =>
      expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: true }),
    );
    // O primeiro pedido já dizia "marcado", e o último desejo também: nada mais a enviar.
    expect(calls(rpc, 'set_amen').map(([, a]) => (a as { amen: boolean }).amen)).toEqual([true]);
  });

  test('feed com fim: menos de uma página mostra "Fim" e não oferece mais nada', async () => {
    const { rpc } = setup();
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-end')).toBeTruthy());
    expect(screen.getByText('Você viu todas as publicações da igreja.')).toBeTruthy();
    expect(screen.queryByTestId('feed-more')).toBeNull();
    expect(calls(rpc, 'community_feed')).toHaveLength(1);
  });

  test('sem rolagem infinita: a página seguinte só vem por toque, com o cursor, e depois acaba', async () => {
    const first = Array.from({ length: 20 }, (_, i) => feedRow(i));
    const { rpc } = setup({
      community_feed: (args) => (args && 'before_post' in args ? { data: [feedRow(20), feedRow(21)] } : { data: first }),
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-more')).toBeTruthy());
    expect(screen.queryByTestId('feed-end')).toBeNull();

    // Rolar até o fim não busca nada.
    await fireEvent.scroll(screen.getByTestId('feed-scroll'), {
      nativeEvent: {
        contentOffset: { y: 5000 },
        contentSize: { height: 5000, width: 400 },
        layoutMeasurement: { height: 800, width: 400 },
      },
    });
    expect(calls(rpc, 'community_feed')).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('feed-more'));
    await waitFor(() => expect(screen.getByTestId('feed-end')).toBeTruthy());
    expect(calls(rpc, 'community_feed')[1][1]).toEqual({
      before_published_at: first[19].published_at,
      before_post: first[19].post_id,
    });
    // A página seguinte entrou na lista. Desde a virtualização (auditoria de
    // 23/09) o feed é uma FlatList: um cartão lá embaixo NÃO fica montado até a
    // rolagem chegar nele — é para isso que a lista existe. A prova de que a
    // página chegou é o conteúdo da lista, não a montagem de um cartão distante.
    const lista = screen.getByTestId('feed-scroll');
    expect(lista.props.data).toHaveLength(22);
    expect(lista.props.data[21].postId).toBe(POST(21));
    expect(lista.props.keyExtractor(lista.props.data[21])).toBe(`p-${POST(21)}`);
  });

  test('a virtualização não monta o feed inteiro de uma vez', async () => {
    // AUDITORIA EXTERNA 2026-09-23: antes eram 200 cartões montados ao mesmo
    // tempo, cada um com carrossel de fotos, e a memória só subia.
    setup({ community_feed: { data: Array.from({ length: 40 }, (_, i) => feedRow(i)) } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-scroll')).toBeTruthy());

    const lista = screen.getByTestId('feed-scroll');
    expect(lista.props.data).toHaveLength(40);
    // Os 40 estão na lista; montados, bem menos que isso. O testID do CARTÃO é
    // `post-<uuid>`; os botões de dentro dele também começam com "post-", então
    // a conta só vale ancorada no formato do uuid.
    const cartoes = new Set(
      screen
        .queryAllByTestId(/^post-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
        .map((node) => node.props.testID),
    );
    expect(cartoes.size).toBeGreaterThan(0);
    expect(cartoes.size).toBeLessThan(40);
  });

  test('C2: feed vazio no primeiro dia, sem cara de erro, com "Ler o dia 1"', async () => {
    mockDay = 1;
    setup({ community_feed: { data: [] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-empty')).toBeTruthy());
    expect(screen.getByText('Hoje começa.')).toBeTruthy();
    expect(screen.queryByText('Não deu para carregar')).toBeNull();
    await fireEvent.press(screen.getByText('Ler o dia 1'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/');
  });

  test('vazio depois do primeiro dia não diz que "hoje começa"', async () => {
    setup({ community_feed: { data: [] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-empty')).toBeTruthy());
    expect(screen.queryByText('Hoje começa.')).toBeNull();
    expect(screen.getByText('Ler o dia 17')).toBeTruthy();
  });

  test('"Em análise" aparece só no cartão do próprio autor, sem Amém nem comentários', async () => {
    setup({
      my_community_posts: {
        data: [
          {
            post_id: POST(90),
            body: 'Minha foto do culto',
            photo_path: 'aaaaaaaa-bbbb-4ccc-8ddd-000000000090.jpg',
            day_number: 17,
            status: 'in_review',
            hold_reason: 'foto',
            created_at: new Date(NOW - 5 * 60 * 1000).toISOString(),
          },
          { post_id: POST(91), body: 'Já publicado', status: 'published', created_at: new Date(NOW).toISOString() },
        ],
      },
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-in-review-${POST(90)}`)).toBeTruthy());
    expect(screen.getByText('Em análise · só você vê')).toBeTruthy();
    expect(screen.getByText('Davi · há 5 min')).toBeTruthy();
    expect(screen.queryByTestId(`post-amen-${POST(90)}`)).toBeNull();
    expect(screen.queryByTestId(`post-comment-${POST(90)}`)).toBeNull();
    // Só um selo: o do meu post em análise. Os posts dos outros nunca têm.
    expect(screen.getAllByText('Em análise · só você vê')).toHaveLength(1);
    expect(screen.queryByTestId(`post-in-review-${POST(0)}`)).toBeNull();
    // O publicado de "Minhas publicações" não entra duplicado pelo topo.
    expect(screen.queryByTestId(`post-${POST(91)}`)).toBeNull();
  });

  test('foto: URL assinada em lote, uma chamada por página, e a imagem usa essa URL', async () => {
    const path = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001.jpg';
    const { createSignedUrls } = setup({ community_feed: { data: [feedRow(0, { photo_path: path }), feedRow(1)] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('post-photo')).toBeTruthy());
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('post-photo').props.source).toEqual({ uri: `https://assinada/${path}` });
    expect(screen.getByLabelText('Foto publicada por Ana')).toBeTruthy();
  });

  test('erro ao carregar o feed: F5 com "Tentar de novo" que pede de novo', async () => {
    let fail = true;
    const { rpc } = setup({
      community_feed: () => (fail ? { error: { message: 'Network request failed' } } : { data: [feedRow(0)] }),
    });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-error')).toBeTruthy());
    fail = false;
    await fireEvent.press(screen.getByTestId('feed-error-retry'));
    await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
    expect(calls(rpc, 'community_feed')).toHaveLength(2);
  });

  test('sem internet: a faixa diz o que continua funcionando', async () => {
    setup();
    mockOnline = false;
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId('feed-offline')).toBeTruthy());
    expect(screen.getByText('O Juntos volta quando a internet voltar.')).toBeTruthy();
  });

  test('comentar abre a folha "Comentários" (F4) pelo id do post, sem sair do feed', async () => {
    const { rpc } = setup({ community_post_comments: { data: [] } });
    await render(<FeedScreen />);
    await waitFor(() => expect(screen.getByTestId(`post-comment-${POST(0)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`post-comment-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('comments-sheet')).toBeTruthy());
    expect(calls(rpc, 'community_post_comments')[0][1]).toEqual({ target_post: POST(0) });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------ comentários */

function commentRow(i: number, extra: Record<string, unknown> = {}) {
  return {
    comment_id: COMMENT(i),
    body: `Orando por você ${i}`,
    status: 'published',
    created_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    author_name: 'Carla',
    is_mine: false,
    ...extra,
  };
}

describe('C6: comentários', () => {
  test('lista os publicados e os MEUS em qualquer estado, com o selo; o dos outros fora do ar some', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({
      community_post_comments: {
        data: [
          commentRow(1),
          commentRow(2, { status: 'in_review', is_mine: true, author_name: 'Davi', body: 'Meu comentário' }),
          commentRow(3, { status: 'removed', body: 'Removido de outra pessoa' }),
        ],
      },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId(`comment-${COMMENT(1)}`)).toBeTruthy());
    expect(rpc).toHaveBeenCalledWith('community_post_comments', { target_post: POST(0) });
    expect(screen.getByText('Comentários')).toBeTruthy();
    expect(screen.getByTestId(`comment-status-${COMMENT(2)}`)).toBeTruthy();
    expect(screen.queryByText('Removido de outra pessoa')).toBeNull();
    expect(screen.queryByTestId(`comment-status-${COMMENT(1)}`)).toBeNull();
    expect(allText()).not.toMatch(/\d+\s*comentários?/i);
  });

  test('o campo começa vazio (nada da reflexão privada) e "Enviar" fica desligado', async () => {
    mockParams = { id: POST(0), texto: 'minha reflexão privada', body: 'x' };
    setup({ community_post_comments: { data: [] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comments-empty')).toBeTruthy());
    expect(screen.getByTestId('comment-input').props.value).toBe('');
    expect(screen.getByTestId('comment-send').props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('comentário limpo aparece na hora; o segurado pelo filtro fica "Em análise" só para mim', async () => {
    mockParams = { id: POST(0) };
    let next = 'published';
    const { rpc } = setup({
      community_post_comments: { data: [] },
      create_community_comment: () => ({ data: [{ comment_id: next === 'published' ? COMMENT(7) : COMMENT(8), status: next }] }),
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('comment-input'), '  Deus é fiel  ');
    await fireEvent.press(screen.getByTestId('comment-send'));
    await waitFor(() => expect(screen.getByTestId(`comment-${COMMENT(7)}`)).toBeTruthy());
    expect(rpc).toHaveBeenCalledWith('create_community_comment', {
      target_post: POST(0),
      comment_body: 'Deus é fiel',
      accept_terms: null,
    });
    expect(screen.queryByTestId(`comment-status-${COMMENT(7)}`)).toBeNull();
    expect(screen.getByTestId('comment-input').props.value).toBe('');

    next = 'in_review';
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'me liga 31 99999-9999');
    await fireEvent.press(screen.getByTestId('comment-send'));
    await waitFor(() => expect(screen.getByTestId(`comment-status-${COMMENT(8)}`)).toBeTruthy());
    expect(screen.getByTestId('comment-notice')).toBeTruthy();
  });

  test('antes do primeiro comentário: a linha do aceite embaixo do campo, e nenhuma tela', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({
      my_community_status: { data: [{ ...READY_STATUS, needs_publish_consent: true }] },
      community_post_comments: { data: [] },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    expect(screen.getByTestId('comment-aceite-line').props.accessibilityLabel).toContain(ACEITE_LINE);
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Amém!');
    await fireEvent.press(screen.getByTestId('comment-send'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(calls(rpc, 'create_community_comment')).toHaveLength(0);
  });

  test('texto do aceite ainda não liberado: o Enviar diz isso e o comentário continua no campo', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({
      my_community_status: { data: [{ ...READY_STATUS, needs_rules: true, needs_publish_consent: true }] },
      community_post_comments: { data: [] },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Amém, irmã!');
    await fireEvent.press(screen.getByTestId('comment-send'));
    await waitFor(() => expect(screen.getByTestId('comment-notice').props.children).toBe(PENDING_NOTICE));
    expect(screen.getByTestId('comment-input').props.value).toBe('Amém, irmã!');
    expect(calls(rpc, 'create_community_comment')).toHaveLength(0);
    expect(calls(rpc, 'accept_community_terms')).toHaveLength(0);
  });

  test('com o texto aprovado: um toque em Enviar registra o aceite e manda o comentário', async () => {
    fillCampos('1.0');
    mockParams = { id: POST(0) };
    let accepted = false;
    const approved = { rules_version: '1.0', publish_consent_version: '1.0' };
    const { rpc } = setup({
      my_community_status: () => ({
        data: [
          accepted
            ? { ...READY_STATUS, ...approved }
            : { ...READY_STATUS, ...approved, needs_rules: true, needs_publish_consent: true, age_confirmed: false },
        ],
      }),
      set_community_profile: { data: true },
      accept_community_terms: () => {
        accepted = true;
        return { data: true };
      },
      community_post_comments: { data: [] },
      create_community_comment: { data: [{ comment_id: COMMENT(9), status: 'published' }] },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Amém, irmã!');
    await fireEvent.press(screen.getByTestId('comment-send'));

    await waitFor(() => expect(screen.getByTestId(`comment-${COMMENT(9)}`)).toBeTruthy());
    // 16+ e os DOIS aceites ANTES do comentário (Google Play; Apple 1.2).
    const reads = new Set(['my_community_status', 'community_post_comments', 'community_comment_amens']);
    expect(rpc.mock.calls.map(([name]) => name as string).filter((name) => !reads.has(name))).toEqual([
      'set_community_profile',
      'accept_community_terms',
      'accept_community_terms',
      'create_community_comment',
    ]);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  test('comentário longo demais não sai do aparelho', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({ community_post_comments: { data: [] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'a'.repeat(1001));
    expect(screen.getByTestId('comment-too-long')).toBeTruthy();
    expect(screen.getByTestId('comment-send').props.accessibilityState).toMatchObject({ disabled: true });
    expect(calls(rpc, 'create_community_comment')).toHaveLength(0);
  });

  test('limite do comentário é dito ao leitor de tela: perto, passou e voltou a caber', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mockParams = { id: POST(0) };
    setup({ community_post_comments: { data: [] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    const input = screen.getByTestId('comment-input');

    await fireEvent.changeText(input, 'a'.repeat(899));
    expect(screen.queryByTestId('comment-limit')).toBeNull();
    expect(announce).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'a'.repeat(950));
    const near = screen.getByTestId('comment-limit-sentence');
    expect(near.props.children).toBe('Perto do limite de 1.000 caracteres.');
    expect(near.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByTestId('comment-limit-count').props.children).toBe('950 de 1.000 caracteres');
    expect(announce).toHaveBeenLastCalledWith('Perto do limite de 1.000 caracteres.');

    // Digitar mais uma letra no mesmo estado não repete a frase.
    await fireEvent.changeText(input, 'a'.repeat(951));
    expect(announce).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(input, 'a'.repeat(1001));
    const over = screen.getByTestId('comment-too-long-sentence');
    expect(over.props.children).toBe('Passou do limite de 1.000 caracteres. Apague um pouco para poder enviar.');
    expect(over.props.accessibilityLiveRegion).toBe('polite');
    expect(announce).toHaveBeenLastCalledWith(
      'Passou do limite de 1.000 caracteres. Apague um pouco para poder enviar.',
    );

    await fireEvent.changeText(input, 'curto');
    expect(screen.queryByTestId('comment-too-long')).toBeNull();
    expect(announce).toHaveBeenLastCalledWith('Agora o texto cabe no limite.');
  });

  test('quem já aceitou não vê a linha do aceite', async () => {
    mockParams = { id: POST(0) };
    setup({ community_post_comments: { data: [] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    expect(screen.queryByTestId('comment-aceite-line')).toBeNull();
  });

  test('sem comentários: a tela diz onde escrever', async () => {
    mockParams = { id: POST(0) };
    setup({ community_post_comments: { data: [] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comments-empty')).toBeTruthy());
    expect(screen.getByText('Para comentar, escreva no campo lá embaixo e toque em Enviar.')).toBeTruthy();
  });

  test('teclado aberto: a legenda sai, o campo e o Enviar continuam (fonte grande em telefone pequeno)', async () => {
    const handlers: Record<string, ((event: unknown) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: unknown) => void) => {
      (handlers[event] ??= []).push(handler);
      return { remove: () => {} };
    }) as never);
    try {
      mockParams = { id: POST(0) };
      setup({ community_post_comments: { data: [] } });
      await render(<PostCommentsRoute />);
      await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
      expect(screen.getByTestId('comment-visibility-note')).toBeTruthy();
      const open = Object.keys(handlers).find((name) => name.endsWith('Show'));
      expect(open).toBeDefined();
      const frame = { endCoordinates: { screenX: 0, screenY: 367, width: 375, height: 300 }, duration: 0 };
      await act(async () => handlers[open!].forEach((handler) => handler(frame)));
      expect(screen.queryByTestId('comment-visibility-note')).toBeNull();
      expect(screen.getByTestId('comment-input')).toBeTruthy();
      expect(screen.getByTestId('comment-send')).toBeTruthy();
      const close = Object.keys(handlers).find((name) => name.endsWith('Hide'));
      await act(async () => handlers[close!].forEach((handler) => handler(frame)));
      expect(screen.getByTestId('comment-visibility-note')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  test('id adulterado no link: "não encontrada" e nenhuma chamada', async () => {
    mockParams = { id: '../outra-coisa' };
    const { rpc } = setup();
    await render(<PostCommentsRoute />);
    expect(screen.getByText('Publicação não encontrada')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  test('post que saiu do ar (ou bloqueio): erro humano com saída', async () => {
    mockParams = { id: POST(0) };
    setup({ community_post_comments: { error: { code: 'P0002', message: 'no_data_found raw' } } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId('comments-error')).toBeTruthy());
    expect(screen.queryByText(/raw/)).toBeNull();
  });
});

/* ------------------------------------------------------------------ tempo */

describe('tempo relativo', () => {
  test('curto na tela, por extenso para o leitor de tela', () => {
    const now = Date.parse('2026-10-01T15:00:00Z');
    expect(relativeTime('2026-10-01T14:59:40Z', now)).toEqual({ short: 'agora', spoken: 'agora' });
    expect(relativeTime('2026-10-01T14:55:00Z', now)).toEqual({ short: 'há 5 min', spoken: 'há 5 minutos' });
    expect(relativeTime('2026-10-01T13:00:00Z', now)).toEqual({ short: 'há 2 h', spoken: 'há 2 horas' });
    expect(relativeTime('2026-09-30T12:00:00Z', now).short).toBe('ontem');
    expect(relativeTime('2026-09-28T12:00:00Z', now).short).toBe('há 3 dias');
    // Relógio do aparelho atrasado: nunca "há -3 min".
    expect(relativeTime('2026-10-01T15:03:00Z', now).short).toBe('agora');
    expect(relativeTime('não é data', now)).toEqual({ short: '', spoken: '' });
    expect(postMeta(17, '2026-10-01T13:00:00Z', now)).toEqual({ short: 'Dia 17 · há 2 h', spoken: 'Dia 17, há 2 horas' });
  });
});

