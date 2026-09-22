/**
 * Comunidade como "diário compartilhado" (FEEDBACK_DAVI_2026-09-22, F1, F3, F4,
 * F6, F8) nas TELAS, com um cliente da Comunidade falso que já devolve o
 * formato estendido (tipo do post, até 4 fotos, grupo, número e rostinhos de
 * Amém, número de comentários, atividade). Não prova o servidor nem o
 * mapeamento de api.ts (isso é do agente de servidor).
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import ActivityRoute from '@/app/comunidade/atividade';
import type { CommunityApi } from '@/community/api';
import type { CommunityStatus, FeedPage, FeedPost, PostComment } from '@/community/types';
import { AFTER_CONSENT_COMMENT } from '@/ui/comunidade/feed/comentarios';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { activityLine, amenSpoken, feedExtras, groupLabel, type ActivityItem, type FeedPostExtras } from '@/ui/comunidade/feed/v2';

/* ------------------------------------------------------------------ mocks */

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true };
const mockFocused = new Set<() => void>();
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
    useLocalSearchParams: () => ({}),
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

let mockApi: CommunityApi | null = null;
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return { ...actual, getCommunityApi: () => mockApi };
});

let mockDemo = false;
jest.mock('@/community/demoApi', () => {
  const actual = jest.requireActual('@/community/demoApi');
  return { ...actual, isCommunityDemo: () => mockDemo };
});

jest.mock('@/net/useOnline', () => ({ useOnline: () => true }));
jest.mock('@/journey/useJourney', () => ({
  useJourney: () => ({ officialDay: 5, phase: 'running', contentState: 'authorized', campaign: { title: '100 dias' } }),
}));

/* ------------------------------------------------------- cliente falso */

const POST = (i: number) => `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const COMMENT = (i: number) => `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const PHOTO = (i: number) => `aaaaaaaa-bbbb-4ccc-8ddd-${String(i).padStart(12, '0')}.jpg`;
const NOW = Date.parse('2026-10-01T15:00:00Z');

type Post = FeedPost & FeedPostExtras;

function post(i: number, extra: Partial<Post> = {}): Post {
  return {
    postId: POST(i),
    body: `Palavra ${i}`,
    photoPath: null,
    dayNumber: 3,
    publishedAt: new Date(NOW - 4 * 60 * 60 * 1000).toISOString(),
    authorName: i % 2 === 0 ? 'Ana' : 'Bruno',
    authorMinistry: null,
    authorAvatarPath: null,
    isMine: false,
    iSaidAmen: false,
    ...extra,
  };
}

function status(extra: Partial<CommunityStatus> & { hasNewActivity?: boolean } = {}): CommunityStatus {
  return {
    isMember: true,
    memberStatus: 'active',
    displayName: 'Davi',
    profile: {
      displayName: 'Davi',
      ministry: 'Louvor',
      ministryAnswered: true,
      bio: null,
      avatarPath: null,
      avatarStatus: 'none',
      ageConfirmed: true,
      contactEmail: null,
      newsOptIn: false,
    },
    profileComplete: true,
    canPublish: true,
    needsPublishConsent: false,
    needsRules: false,
    publishConsentVersion: '1.0',
    rulesVersion: '1.0',
    isModerator: false,
    ...extra,
  };
}

function fakeApi({
  posts = [post(0), post(1)],
  ended = true,
  current = status(),
  comments = [] as PostComment[],
  activity,
}: {
  posts?: Post[];
  ended?: boolean;
  current?: CommunityStatus;
  comments?: PostComment[];
  activity?: ActivityItem[];
} = {}) {
  const box = { status: current };
  const api = {
    getStatus: jest.fn(async () => box.status),
    feedPage: jest.fn(async (): Promise<FeedPage> => ({ posts, nextCursor: null, ended })),
    myPosts: jest.fn(async () => []),
    setAmen: jest.fn(async (_id: string, amen: boolean) => amen),
    postComments: jest.fn(async () => comments),
    createComment: jest.fn(async () => ({ id: COMMENT(99), status: 'published' as const })),
    signPhotoUrls: jest.fn(async (paths: (string | null)[]) => {
      const urls = new Map<string, string>();
      paths.forEach((p) => p && urls.set(p, `https://assinada/${p}`));
      return urls;
    }),
    ...(activity
      ? { myActivity: jest.fn(async () => activity), markActivitySeen: jest.fn(async () => {}) }
      : null),
  };
  mockApi = api as unknown as CommunityApi;
  return { api, box };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDemo = false;
  mockApi = null;
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Quantos nós na árvore têm animação de entrada (`entering`). */
function animatedNodes(): number {
  let found = 0;
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as { props?: Record<string, unknown>; children?: unknown };
    if (n.props && n.props.entering != null) found += 1;
    walk(n.children);
  };
  walk(screen.toJSON());
  return found;
}

async function renderFeed() {
  await render(<FeedScreen />);
  await waitFor(() => expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy());
}

/* ------------------------------------------------------------ puros (v2) */

describe('regras puras do cartão', () => {
  test('linha do tipo e do dia, e o grupo', () => {
    expect(activityLine('leitura', 3)).toBe('Leitura do dia · Dia 3');
    expect(activityLine('oracao', null)).toBe('Oração');
    expect(activityLine(null, 7)).toBe('Dia 7');
    expect(activityLine(null, null)).toBeNull();
    // Versículo: só a referência (nunca o texto bíblico).
    expect(activityLine('versiculo', null, { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: null })).toBe('Versículo · João 3:16');
    expect(activityLine('versiculo', 2, { book: 'PSA', chapter: 23, verseStart: 1, verseEnd: 3 })).toBe('Versículo · Salmos 23:1-3 · Dia 2');
    expect(groupLabel('igreja', 'Louvor')).toBe('Toda a igreja');
    expect(groupLabel('ministerio', 'Louvor')).toBe('Ministério Louvor');
  });

  test('campos novos ausentes caem no que já existia: uma foto, igreja toda, sem número', () => {
    const extras = feedExtras(post(0, { photoPath: PHOTO(1) }));
    expect(extras).toEqual({
      kind: null,
      verse: null,
      photoPaths: [PHOTO(1)],
      audience: 'igreja',
      audienceMinistry: null,
      amenCount: 0,
      amenFaces: [],
      commentCount: 0,
    });
  });

  test('no máximo 4 fotos e 3 rostos; número nunca menor que os rostos', () => {
    const extras = feedExtras(
      post(0, {
        photoPaths: [1, 2, 3, 4, 5].map(PHOTO),
        amenFaces: [{ name: 'A', avatarPath: null }, { name: 'B', avatarPath: null }, { name: 'C', avatarPath: null }, { name: 'D', avatarPath: null }],
        amenCount: 1,
      }),
    );
    expect(extras.photoPaths).toHaveLength(4);
    expect(extras.amenFaces).toHaveLength(3);
    expect(extras.amenCount).toBe(3);
  });

  test('o leitor de tela ouve o Amém por extenso', () => {
    expect(amenSpoken(12, false, [])).toBe('12 pessoas disseram Amém');
    expect(amenSpoken(1, false, [{ name: 'Ana', avatarPath: null }])).toBe('Ana disse Amém');
    expect(amenSpoken(1, true, [])).toBe('Você disse Amém');
    expect(amenSpoken(3, true, [])).toBe('Você e mais 2 pessoas disseram Amém');
  });
});

/* ------------------------------------------------------------- F1: cartão */

describe('F1: o post do dia', () => {
  test('grupo no topo, "Nome · há 4 h", "Leitura do dia · Dia 3" e "Ver leitura" abre o leitor no dia', async () => {
    fakeApi({ posts: [post(0, { kind: 'leitura', audience: 'ministerio', audienceMinistry: 'Louvor' }), post(1)] });
    await renderFeed();
    expect(screen.getByTestId(`post-group-${POST(0)}`, { includeHiddenElements: true }).props.children).toBe('Ministério Louvor');
    expect(screen.getByTestId(`post-group-${POST(1)}`, { includeHiddenElements: true }).props.children).toBe('Toda a igreja');
    expect(screen.getByText('Ana · há 4 h')).toBeTruthy();
    expect(screen.getByText('Leitura do dia · Dia 3')).toBeTruthy();
    // O grupo e o tipo vão juntos no rótulo do autor, sem "·".
    expect(screen.getByLabelText('Ministério Louvor, Ana, há 4 horas, Leitura do dia, Dia 3')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`post-reading-${POST(0)}`));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reader/[day]', params: { day: '3' } });
  });

  test('sem dia anexado, sem "Ver leitura"', async () => {
    fakeApi({ posts: [post(0, { dayNumber: null, kind: 'oracao' })] });
    await renderFeed();
    expect(screen.getByText('Oração')).toBeTruthy();
    expect(screen.queryByTestId(`post-reading-${POST(0)}`)).toBeNull();
  });

  test('fotos em carrossel: todas assinadas numa chamada, indicador e "Foto 2 de 3"', async () => {
    const { api } = fakeApi({ posts: [post(0, { photoPath: PHOTO(1), photoPaths: [1, 2, 3].map(PHOTO) })] });
    await renderFeed();
    await waitFor(() => expect(screen.getByTestId('post-photo')).toBeTruthy());
    expect(api.signPhotoUrls).toHaveBeenCalledTimes(1);
    expect(api.signPhotoUrls.mock.calls[0][0]).toEqual(expect.arrayContaining([1, 2, 3].map(PHOTO)));
    expect(screen.getByLabelText('Foto 1 de 3, publicada por Ana')).toBeTruthy();
    expect(screen.getByLabelText('Foto 2 de 3, publicada por Ana').props.source).toEqual({ uri: `https://assinada/${PHOTO(2)}` });
    expect(screen.getByTestId('post-photos-indicator', { includeHiddenElements: true })).toBeTruthy();
    // Arrastar para a segunda muda o ponto atual (pela largura, não só pela cor).
    await fireEvent(screen.getByTestId('post-photos-scroll'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 750, y: 0 } },
    });
    const dots = within(screen.getByTestId('post-photos-indicator', { includeHiddenElements: true }));
    expect(dots.getByTestId('post-photos-dot-active', { includeHiddenElements: true })).toBeTruthy();
  });

  test('uma foto só: sem indicador', async () => {
    fakeApi({ posts: [post(0, { photoPath: PHOTO(1) })] });
    await renderFeed();
    await waitFor(() => expect(screen.getByLabelText('Foto publicada por Ana')).toBeTruthy());
    expect(screen.queryByTestId('post-photos-indicator', { includeHiddenElements: true })).toBeNull();
  });

  test('feed com fim explícito', async () => {
    fakeApi();
    await renderFeed();
    expect(screen.getByTestId('feed-end')).toBeTruthy();
    expect(screen.queryByTestId('feed-more')).toBeNull();
  });

  test('selo da demonstração continua na demo', async () => {
    mockDemo = true;
    fakeApi();
    await render(<FeedScreen />);
    expect(screen.getByTestId('feed-demo-badge')).toBeTruthy();
    expect(screen.getByLabelText('Demonstração. Nada é enviado.')).toBeTruthy();
  });
});

/* ------------------------------------------------------ F3: Amém com número */

describe('F3: Amém com número e rostinhos', () => {
  const faces = [
    { name: 'Carla', avatarPath: PHOTO(7) },
    { name: 'Dani', avatarPath: null },
    { name: 'Edu', avatarPath: null },
  ];

  test('mostra até 3 rostos e o número; marcar soma 1 e põe o meu rosto na frente; desmarcar volta', async () => {
    const { api } = fakeApi({ posts: [post(0, { amenCount: 12, amenFaces: faces })] });
    await renderFeed();
    const summary = `post-amen-summary-${POST(0)}`;
    expect(screen.getByTestId(`${summary}-count`, { includeHiddenElements: true }).props.children).toBe('12');
    expect(screen.getAllByTestId(`${summary}-face`, { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.getByLabelText('12 pessoas disseram Amém')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(api.setAmen).toHaveBeenCalledWith(POST(0), true));
    expect(screen.getByTestId(`${summary}-count`, { includeHiddenElements: true }).props.children).toBe('13');
    expect(screen.getByLabelText('Você e mais 12 pessoas disseram Amém')).toBeTruthy();
    expect(screen.getAllByTestId(`${summary}-face`, { includeHiddenElements: true })).toHaveLength(3);
    expect(screen.getByTestId(`post-amen-${POST(0)}`).props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(api.setAmen).toHaveBeenLastCalledWith(POST(0), false));
    expect(screen.getByTestId(`${summary}-count`, { includeHiddenElements: true }).props.children).toBe('12');
  });

  test('o primeiro Amém faz aparecer o número 1; o Amém que falha volta o número', async () => {
    const { api } = fakeApi({ posts: [post(0)] });
    api.setAmen.mockRejectedValueOnce(new Error('rede'));
    await renderFeed();
    expect(screen.queryByTestId(`post-amen-summary-${POST(0)}`)).toBeNull();
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('feed-notice')).toBeTruthy());
    expect(screen.queryByTestId(`post-amen-summary-${POST(0)}`)).toBeNull();
    await fireEvent.press(screen.getByTestId(`post-amen-${POST(0)}`));
    await waitFor(() => expect(screen.getByLabelText('Você disse Amém')).toBeTruthy());
  });

  test('a mão cheia entra com zoom', async () => {
    fakeApi({ posts: [post(0, { iSaidAmen: true, amenCount: 1 })] });
    await renderFeed();
    expect(animatedNodes()).toBeGreaterThan(0);
  });

  test('com "Reduzir movimento", a mão cheia troca sem animação', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    fakeApi({ posts: [post(0, { iSaidAmen: true, amenCount: 1 })] });
    await renderFeed();
    await act(async () => {});
    expect(animatedNodes()).toBe(0);
  });
});

/* ------------------------------------------------------ F4: comentários */

describe('F4: comentários em folha', () => {
  const carla: PostComment = {
    commentId: COMMENT(1),
    body: 'Orando por você',
    status: 'published',
    createdAt: new Date(NOW - 60_000).toISOString(),
    authorName: 'Carla',
    isMine: false,
  };

  test('número ao lado do balão; a folha lista, envia e o número sobe', async () => {
    const { api } = fakeApi({ posts: [post(0, { commentCount: 3 })], comments: [carla] });
    await renderFeed();
    expect(screen.getByTestId(`post-comment-count-${POST(0)}`).props.children).toBe('3');
    expect(screen.getByLabelText('Comentários, 3 comentários')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`post-comment-${POST(0)}`));
    await waitFor(() => expect(screen.getByText('Orando por você')).toBeTruthy());
    expect(screen.getByTestId('comments-sheet')).toBeTruthy();
    // Sem GIF: só texto e Enviar.
    expect(screen.queryByText(/gif/i)).toBeNull();
    expect(screen.getByTestId('comment-input').props.value).toBe('');
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Amém, irmã');
    await fireEvent.press(screen.getByTestId('comment-send'));
    await waitFor(() => expect(api.createComment).toHaveBeenCalledWith(POST(0), 'Amém, irmã'));
    await waitFor(() => expect(screen.getByTestId(`post-comment-count-${POST(0)}`).props.children).toBe('4'));
    await fireEvent.press(screen.getByTestId('comments-sheet-close'));
    expect(screen.queryByTestId('comments-sheet')).toBeNull();
  });

  test('antes do primeiro comentário: a folha fecha, vai ao consentimento, e ao reabrir o rascunho volta com o aviso', async () => {
    const { api, box } = fakeApi({ current: status({ needsPublishConsent: true }) });
    await renderFeed();
    await fireEvent.press(screen.getByTestId(`post-comment-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('comment-input')).toBeTruthy());
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Que palavra');
    await fireEvent.press(screen.getByTestId('comment-send'));
    expect(api.createComment).not.toHaveBeenCalled();
    expect(screen.queryByTestId('comments-sheet')).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/consentimento');

    box.status = status();
    await refocus();
    await waitFor(() => expect(api.getStatus).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByTestId(`post-comment-${POST(0)}`));
    await waitFor(() => expect(screen.getByTestId('comment-input').props.value).toBe('Que palavra'));
    expect(screen.getByText(AFTER_CONSENT_COMMENT)).toBeTruthy();
    expect(api.createComment).not.toHaveBeenCalled();
  });
});

/* ----------------------------------------------- F6: toda a igreja / ministério */

describe('F6: toda a igreja e meu ministério (sem seguidores)', () => {
  test('o filtro pede o feed do ministério ao servidor', async () => {
    const { api } = fakeApi();
    await renderFeed();
    expect(api.feedPage).toHaveBeenLastCalledWith(null, { scope: 'igreja' });
    await fireEvent.press(screen.getByTestId('feed-scope-ministerio'));
    await waitFor(() => expect(api.feedPage).toHaveBeenLastCalledWith(null, { scope: 'ministerio' }));
    expect(screen.getByTestId('feed-scope-ministerio').props.accessibilityState).toMatchObject({ selected: true });
  });

  test('sem ministério no perfil: diz isso, leva ao perfil e não pede feed de ministério', async () => {
    const base = status();
    const { api } = fakeApi({ current: status({ profile: { ...base.profile, ministry: null } }) });
    await renderFeed();
    await fireEvent.press(screen.getByTestId('feed-scope-ministerio'));
    expect(screen.getByTestId('feed-no-ministry')).toBeTruthy();
    expect(api.feedPage).not.toHaveBeenCalledWith(null, { scope: 'ministerio' });
    await fireEvent.press(screen.getByTestId('feed-no-ministry-profile'));
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/perfil');
  });
});

/* -------------------------------------------------------- F8: sino e atividade */

describe('F8: sino e atividade', () => {
  test('o sino tem ponto quando há novidade e abre a Atividade', async () => {
    fakeApi({ current: status({ hasNewActivity: true }) });
    await renderFeed();
    expect(screen.getByTestId('feed-bell-dot', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Atividade, tem novidade')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('feed-bell'));
    expect(mockRouter.push).toHaveBeenCalledWith('/comunidade/atividade');
  });

  test('sem novidade, sem ponto', async () => {
    fakeApi();
    await renderFeed();
    expect(screen.queryByTestId('feed-bell-dot', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByLabelText('Atividade')).toBeTruthy();
  });

  test('Atividade: Amém e comentários nos meus posts, "Novo" em palavra, marca como visto e abre a conversa', async () => {
    const items: ActivityItem[] = [
      { activityId: 'a1', kind: 'comment', postId: POST(5), actorName: 'Carla', actorAvatarPath: null, at: new Date(NOW - 60_000).toISOString(), preview: 'Que lindo', unread: true },
      { activityId: 'a2', kind: 'amen', postId: POST(5), actorName: 'Edu', actorAvatarPath: PHOTO(2), at: new Date(NOW - 3 * 3600_000).toISOString(), preview: null, unread: false },
    ];
    const { api } = fakeApi({ activity: items });
    await render(<ActivityRoute />);
    await waitFor(() => expect(screen.getByText('Carla comentou na sua publicação')).toBeTruthy());
    expect(screen.getByText('Edu disse Amém na sua publicação')).toBeTruthy();
    expect(screen.getByTestId('activity-new-a1')).toBeTruthy();
    expect(screen.queryByTestId('activity-new-a2')).toBeNull();
    const seen = (api as unknown as { markActivitySeen: jest.Mock }).markActivitySeen;
    expect(seen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('activity-end')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('activity-a1'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/comunidade/post/[id]', params: { id: POST(5) } });
  });

  test('Atividade vazia diz o que vai aparecer; sem push', async () => {
    fakeApi({ activity: [] });
    await render(<ActivityRoute />);
    await waitFor(() => expect(screen.getByTestId('activity-empty')).toBeTruthy());
    expect(screen.getByText(/Sem notificação/)).toBeTruthy();
  });

  test('cliente sem atividade ainda: estado honesto, nada inventado', async () => {
    fakeApi();
    await render(<ActivityRoute />);
    await waitFor(() => expect(screen.getByTestId('activity-unsupported')).toBeTruthy());
  });
});
