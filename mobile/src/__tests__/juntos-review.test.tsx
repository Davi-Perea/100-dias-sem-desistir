/**
 * Review do fundador de 2026-09-22 (prévia do Dia 23 no Expo Go), a parte do
 * Juntos, item a item:
 *
 *   1. "Conheça o Juntos" só na PRIMEIRA vez, para sempre: a dispensa fica em
 *      AsyncStorage, então abrir, fechar e REABRIR O APP não traz o aviso de volta.
 *   2. O botão do topo é "Publicar" (rótulo visível e rótulo falado), não "Escrever".
 *   3. "Minhas publicações" alcançável de dentro do Juntos, por um atalho no topo.
 *   4. "Ver leitura" só quando o post ANEXOU leitura — dia ou versículo. Em post
 *      livre (sem tipo), não aparece, mesmo que a linha traga um número de dia.
 *   5. Foto de perfil: UM toque para colocar ou trocar, na foto ou no botão, com
 *      as regras à vista antes do toque — e nada disso é exigido para publicar.
 *
 * O cliente da Comunidade é SIMULADO (mesmo molde de comunidade-feed.test.tsx):
 * nada aqui prova o servidor.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { EMPTY_PROFILE, profileGaps } from '@/community/profile';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { _resetJuntosIntroForTests, JUNTOS_INTRO_KEY } from '@/ui/comunidade/feed/conheca';
import { readingTarget } from '@/ui/comunidade/feed/v2';
import { verseHref } from '@/ui/comunidade/feed/rotas';
import {
  AVATAR_CHANGE_TITLE,
  AVATAR_OPTIONAL_NOTE,
  AVATAR_RULES,
  AVATAR_STEP_TITLE,
  AvatarField,
} from '@/ui/comunidade/perfil/PerfilCampos';

/* ------------------------------------------------------------------ mocks */

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    useFocusEffect: (callback: () => void) =>
      useEffect(() => {
        callback();
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

jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: true,
    loading: false,
    session: { user: { id: 'u1' } },
    signedIn: true,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));

jest.mock('@/community/deviceSession', () => {
  const actual = jest.requireActual('@/community/deviceSession');
  return { ...actual, ensureDeviceSession: jest.fn(async () => {}) };
});

jest.mock('@/settings/settingsStore', () => ({
  useSettings: () => ({ profile: { name: 'Davi', goals: [] } }),
}));

let mockApi: CommunityApi | null = null;
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return { ...actual, getCommunityApi: () => mockApi };
});

jest.mock('@/net/useOnline', () => ({ useOnline: () => true }));

jest.mock('@/journey/useJourney', () => ({
  useJourney: () => ({
    officialDay: 9,
    phase: 'running',
    contentState: 'authorized',
    campaign: { title: '100 dias' },
  }),
}));

jest.mock('@/config/features', () => ({ COMMUNITY_ENABLED: true }));

/** A galeria e a preparação da foto, fora do caminho: o que se prova aqui é a TELA. */
const mockPick = jest.fn();
jest.mock('@/ui/comunidade/publicar/foto', () => ({
  pickFromLibrary: () => mockPick(),
  preparePhoto: async (asset: { uri: string }) => ({ bytes: Uint8Array.from([1, 2]), uri: asset.uri }),
}));

/* ------------------------------------------------------ cliente simulado */

type Reply = { data?: unknown; error?: unknown };
const POST = (i: number) => `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const NOW = Date.parse('2026-10-01T15:00:00Z');

const READY_STATUS = {
  is_member: true,
  member_status: 'active',
  display_name: 'Davi',
  age_confirmed: true,
  can_publish: true,
  needs_publish_consent: false,
  needs_rules: false,
  publish_consent_version: '1.0',
  rules_version: '1.0',
  is_moderator: false,
};

function feedRow(i: number, extra: Record<string, unknown> = {}) {
  return {
    post_id: POST(i),
    body: `Palavra ${i}`,
    photo_path: null,
    day_number: 9,
    published_at: new Date(NOW - (i + 1) * 60 * 60 * 1000).toISOString(),
    author_name: 'Ana',
    is_mine: false,
    i_said_amen: false,
    ...extra,
  };
}

function setup(rows: Record<string, unknown>[] = [feedRow(0, { activity: 'leitura' })]) {
  const replies: Record<string, Reply> = {
    my_community_status: { data: [READY_STATUS] },
    community_feed: { data: rows },
    my_community_posts: { data: [] },
  };
  const rpc = jest.fn(async (fn: string) => {
    const reply = replies[fn] ?? {};
    return { data: reply.data ?? null, error: reply.error ?? null };
  });
  const storage = {
    from: () => ({
      upload: jest.fn(async () => ({ data: null, error: null })),
      createSignedUrls: jest.fn(async (paths: string[]) => ({
        data: paths.map((p) => ({ path: p, signedUrl: `https://assinada/${p}`, error: null })),
        error: null,
      })),
      remove: jest.fn(async () => ({ data: [], error: null })),
    }),
  };
  mockApi = createCommunityApi({ rpc, storage } as CommunityClient, {
    randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  });
  return { rpc };
}

async function renderFeed(rows?: Record<string, unknown>[]) {
  setup(rows);
  const view = await render(<FeedScreen />);
  await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
  return view;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockApi = null;
  _resetJuntosIntroForTests();
  await AsyncStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* --------------------------------------------- 1 · Conheça o Juntos, uma vez */

describe('1 · "Conheça o Juntos" só na primeira vez, para sempre', () => {
  test('abriu, fechou, reabriu o app: não aparece de novo', async () => {
    let view = await renderFeed();
    // Primeira vez na aba: o aviso está por cima do feed.
    await waitFor(() => expect(screen.getByTestId('juntos-intro')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('juntos-intro-close'));
    await waitFor(() => expect(screen.queryByTestId('juntos-intro')).toBeNull());
    // A dispensa foi GRAVADA (não ficou só na memória do processo).
    await waitFor(async () => expect(await AsyncStorage.getItem(JUNTOS_INTRO_KEY)).toBe('1'));
    await view.unmount();

    // Trocar de aba e voltar: nada.
    view = await renderFeed();
    expect(screen.queryByTestId('juntos-intro')).toBeNull();
    await view.unmount();

    // REABRIU O APP: processo novo (memória limpa), só a marca gravada sobrou.
    _resetJuntosIntroForTests();
    view = await renderFeed();
    await act(async () => {});
    expect(screen.queryByTestId('juntos-intro')).toBeNull();
    await view.unmount();
  });

  test('sem a marca gravada, ele aparece: quem nunca viu, vê', async () => {
    const view = await renderFeed();
    await waitFor(() => expect(screen.getByTestId('juntos-intro')).toBeTruthy());
    expect(await AsyncStorage.getItem(JUNTOS_INTRO_KEY)).toBeNull();
    await view.unmount();
  });
});

/* ------------------------------------------------ 2 e 3 · topo do Juntos */

describe('2 · o botão é "Publicar"', () => {
  test('rótulo visível e rótulo falado; "Escrever" não existe mais no topo', async () => {
    await renderFeed();
    const button = screen.getByTestId('feed-write');
    expect(button.props.accessibilityLabel).toBe('Publicar no Juntos');
    expect(screen.getByText('Publicar')).toBeTruthy();
    expect(screen.queryByText('Escrever')).toBeNull();
    expect(screen.queryByLabelText('Escrever no Juntos')).toBeNull();
    await fireEvent.press(button);
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/publicar');
  });
});

describe('3 · atalhos do topo: perfil e "Minhas publicações"', () => {
  test('"Minhas publicações" se alcança de dentro do Juntos, sem passar por Conta e privacidade', async () => {
    await renderFeed();
    const shortcut = screen.getByTestId('feed-my-posts');
    expect(shortcut.props.accessibilityLabel).toBe('Minhas publicações');
    await fireEvent.press(shortcut);
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/minhas-publicacoes');
    // Um só controle com esse nome na tela (o do fim da rolagem saiu).
    expect(screen.getAllByLabelText('Minhas publicações')).toHaveLength(1);
  });

  test('o perfil do Juntos (onde se coloca a foto) também está no topo', async () => {
    await renderFeed();
    const profile = screen.getByTestId('feed-profile');
    expect(profile.props.accessibilityLabel).toMatch(/^Seu perfil no Juntos/);
    expect(screen.getByText('Seu perfil')).toBeTruthy();
    await fireEvent.press(profile);
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/perfil');
  });

  test('alvo de 48 nos dois atalhos, por piso e não por altura fixa', async () => {
    await renderFeed();
    for (const id of ['feed-profile', 'feed-my-posts']) {
      const node = screen.getByTestId(id);
      const style = Array.isArray(node.props.style) ? Object.assign({}, ...node.props.style) : node.props.style;
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.height).toBeUndefined();
    }
  });
});

/* ------------------------------------------------------- 4 · Ver leitura */

describe('4 · "Ver leitura" só com leitura anexada', () => {
  test('a regra, isolada', () => {
    const verse = { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: null };
    expect(readingTarget({ kind: 'leitura', dayNumber: 3, verse: null })).toEqual({ kind: 'dia', day: 3 });
    expect(readingTarget({ kind: 'versiculo', dayNumber: null, verse })).toEqual({
      kind: 'versiculo',
      verse,
      label: 'João 3:16',
    });
    // Post LIVRE (sem tipo): nada, nem com dia, nem com versículo.
    expect(readingTarget({ kind: null, dayNumber: 3, verse: null })).toBeNull();
    expect(readingTarget({ kind: null, dayNumber: null, verse })).toBeNull();
    // Oração ou jejum que anexaram a leitura do dia continuam com o atalho.
    expect(readingTarget({ kind: 'oracao', dayNumber: 7, verse: null })).toEqual({ kind: 'dia', day: 7 });
    // Sem dia e sem versículo, não há o que abrir.
    expect(readingTarget({ kind: 'oracao', dayNumber: null, verse: null })).toBeNull();
    // Livro que não existe no cânon não inventa destino.
    expect(readingTarget({ kind: 'versiculo', dayNumber: null, verse: { ...verse, book: 'XXX' } })).toBeNull();
  });

  test('post com "Leitura do dia": o atalho abre o leitor daquele dia', async () => {
    await renderFeed([feedRow(0, { activity: 'leitura' })]);
    const link = screen.getByTestId(`post-reading-${POST(0)}`);
    expect(link.props.accessibilityLabel).toBe('Ver leitura do dia 9');
    await fireEvent.press(link);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '9' } });
  });

  test('post LIVRE com número de dia na linha: "Ver leitura" NÃO aparece', async () => {
    await renderFeed([feedRow(0)]);
    // A linha do dia continua (é o contexto do post), o atalho é que sai.
    expect(screen.getByText('Dia 9')).toBeTruthy();
    expect(screen.queryByTestId(`post-reading-${POST(0)}`)).toBeNull();
    expect(screen.queryByText('Ver leitura')).toBeNull();
  });

  test('post com versículo anexado: o atalho abre o capítulo na Bíblia', async () => {
    await renderFeed([
      feedRow(0, { activity: 'versiculo', day_number: null, verse_book: 'JHN', verse_chapter: 3, verse_start: 16 }),
    ]);
    const link = screen.getByTestId(`post-reading-${POST(0)}`);
    // O nome falado começa pelo rótulo visível (WCAG 2.5.3) e diz onde vai dar.
    expect(link.props.accessibilityLabel).toBe('Ver leitura, João 3:16 na Bíblia');
    await fireEvent.press(link);
    expect(mockRouter.push).toHaveBeenCalledWith('/biblia/JHN/3');
    expect(verseHref({ book: 'JHN', chapter: 3, verseStart: 16, verseEnd: null })).toBe('/biblia/JHN/3');
  });
});

/* ---------------------------------------------------- 5 · foto de perfil */

describe('5 · foto de perfil: caminho curto para colocar e trocar', () => {
  const api = { setAvatar: jest.fn(async () => 'in_review' as const) } as unknown as CommunityApi;

  test('UM toque no botão abre a galeria e a foto vai embora (sem passo no meio)', async () => {
    mockPick.mockResolvedValue({ uri: 'file:///escolhida.jpg', width: 800, height: 800 });
    const saved = jest.fn();
    const view = await render(
      <AvatarField api={api} name="Davi" status="none" photoUrl={null} onSaved={saved} />,
    );

    const button = screen.getByTestId('perfil-foto-abrir');
    expect(button.props.accessibilityLabel).toBe(AVATAR_STEP_TITLE);
    await fireEvent.press(button);

    await waitFor(() => expect(saved).toHaveBeenCalledWith('file:///escolhida.jpg', 'in_review'));
    expect(mockPick).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test('a própria foto também é botão, com o mesmo nome do botão', async () => {
    mockPick.mockResolvedValue(null);
    const view = await render(
      <AvatarField api={api} name="Davi" status="approved" photoUrl="https://assinada/f.jpg" onSaved={jest.fn()} />,
    );
    const tap = screen.getByTestId('perfil-foto-toque');
    expect(tap.props.accessibilityLabel).toBe(AVATAR_CHANGE_TITLE);
    expect(screen.getByTestId('perfil-foto-abrir').props.accessibilityLabel).toBe(AVATAR_CHANGE_TITLE);
    await fireEvent.press(tap);
    await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
    await view.unmount();
  });

  test('as regras da foto ficam à vista ANTES do toque, e o passo continua opcional', async () => {
    const view = await render(<AvatarField api={api} name="Davi" status="none" photoUrl={null} onSaved={jest.fn()} />);
    for (const line of AVATAR_RULES) expect(screen.getByText(line)).toBeTruthy();
    expect(screen.getByTestId('perfil-foto-opcional').props.children).toBe(AVATAR_OPTIONAL_NOTE);
    expect(AVATAR_OPTIONAL_NOTE).toMatch(/Publicar nunca depende dela/);
    await view.unmount();
  });

  test('e nada da foto é exigido para publicar', () => {
    expect(profileGaps({ ...EMPTY_PROFILE, displayName: 'Davi', ageConfirmed: true })).toEqual([]);
  });
});
