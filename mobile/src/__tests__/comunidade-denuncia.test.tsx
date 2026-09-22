/**
 * C5 · Denunciar e bloquear (publicação, comentário e pessoa) com o cliente da
 * Comunidade SIMULADO. Prova o comportamento das TELAS: a folha no post e no
 * comentário (exigência das duas lojas), os motivos com "apareço nesta foto e não
 * autorizei", o recibo com protocolo, que tudo parte do id do post ou do
 * comentário (nunca de um id de pessoa), que a pessoa bloqueada some, e que no
 * próprio post a folha vira "apagar". Não prova o servidor.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import PostCommentsRoute from '@/app/comunidade/post/[id]';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { REPORT_REASONS } from '@/community/types';
import { FeedScreen } from '@/ui/comunidade/feed/FeedScreen';
import { reasonOptions, receiptCode, reviewPromise, REVIEW_HOURS } from '@/ui/comunidade/sheets/motivos';

/* ------------------------------------------------------------------ mocks */

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react') as typeof import('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => mockParams,
    useSegments: () => [],
    useFocusEffect: (callback: () => void) => useEffect(() => callback(), [callback]),
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

jest.mock('@/net/useOnline', () => ({ useOnline: () => true }));

jest.mock('@/journey/useJourney', () => ({
  useJourney: () => ({ officialDay: 17, phase: 'running', contentState: 'authorized', campaign: { title: '100 dias' } }),
}));

/* ------------------------------------------------------ cliente simulado */

type Reply = { data?: unknown; error?: unknown };
type Handler = Reply | ((args: Record<string, unknown> | undefined) => Reply);

const POST = (i: number) => `20000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const COMMENT = (i: number) => `30000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
const REPORT_ID = 'abcdef12-3456-4789-8abc-def012345678';
const PHOTO = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001.jpg';

function feedRow(i: number, extra: Record<string, unknown> = {}) {
  return {
    post_id: POST(i),
    body: `Palavra ${i}`,
    photo_path: null,
    day_number: 17,
    published_at: '2026-10-01T12:00:00Z',
    author_name: 'Ana',
    is_mine: false,
    i_said_amen: false,
    ...extra,
  };
}

const READY_STATUS = {
  is_member: true,
  member_status: 'active',
  display_name: 'Davi',
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
    community_feed: { data: [feedRow(0, { photo_path: PHOTO }), feedRow(1, { author_name: 'Bruno' })] },
    my_community_posts: { data: [] },
    report_community_content: { data: REPORT_ID },
    block_community_author: { data: null },
    delete_my_community_post: { data: null },
    delete_my_community_comment: { data: null },
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
      createSignedUrls: jest.fn(async (paths: string[]) => ({
        data: paths.map((p) => ({ path: p, signedUrl: `https://assinada/${p}`, error: null })),
        error: null,
      })),
      remove: jest.fn(async () => ({ data: [], error: null })),
    }),
  };
  const client: CommunityClient = { rpc, storage };
  mockApi = createCommunityApi(client, { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  return { rpc };
}

function calls(rpc: jest.Mock, fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn);
}

async function openPostSheet(postIndex: number) {
  await waitFor(() => expect(screen.getByTestId(`post-more-${POST(postIndex)}`)).toBeTruthy());
  await fireEvent.press(screen.getByTestId(`post-more-${POST(postIndex)}`));
  await waitFor(() => expect(screen.getByTestId('report-sheet')).toBeTruthy());
  return within(screen.getByTestId('report-sheet'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockApi = null;
});

/* --------------------------------------------------------------- motivos */

describe('motivos e promessa', () => {
  test('todo motivo mostrado existe na lista fechada do servidor', () => {
    for (const subject of ['post', 'comment', 'person'] as const) {
      for (const option of reasonOptions(subject, true)) expect(REPORT_REASONS).toContain(option.reason);
    }
  });

  test('"Apareço nesta foto e não autorizei" só onde há foto', () => {
    const label = 'Apareço nesta foto e não autorizei';
    expect(reasonOptions('post', true).map((o) => o.label)).toContain(label);
    expect(reasonOptions('post', false).map((o) => o.label)).not.toContain(label);
    expect(reasonOptions('comment', true).map((o) => o.label)).not.toContain(label);
    expect(reasonOptions('person', true).map((o) => o.label)).not.toContain(label);
  });

  test('sem prazo definido pela igreja, a folha não inventa um número de horas', () => {
    expect(REVIEW_HOURS).toBeNull();
    expect(reviewPromise()).not.toMatch(/\d/);
  });

  test('protocolo curto e estável a partir do recibo', () => {
    expect(receiptCode(REPORT_ID)).toBe('ABCDEF12');
  });
});

/* ------------------------------------------------------------ publicação */

describe('C5 na publicação de outra pessoa', () => {
  test('a folha tem denunciar a publicação, denunciar a pessoa e bloquear — e não tem apagar', async () => {
    setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(0);
    expect(sheet.getByText('Denunciar esta publicação')).toBeTruthy();
    expect(sheet.getByText('Denunciar Ana')).toBeTruthy();
    expect(sheet.getByText('Bloquear Ana')).toBeTruthy();
    expect(sheet.queryByTestId('sheet-delete')).toBeNull();
    expect(sheet.getByTestId('sheet-close')).toBeTruthy();
  });

  test('"apareço nesta foto": manda só o id do post, tira do ar na hora e mostra o recibo', async () => {
    const { rpc } = setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(0);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    // Enviar fica desligado até escolher o motivo.
    expect(screen.getByTestId('report-send').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('reason-rosto_de_terceiro'));
    await fireEvent.press(screen.getByTestId('report-send'));

    await waitFor(() => expect(screen.getByText('Denúncia recebida')).toBeTruthy());
    expect(rpc).toHaveBeenCalledWith('report_community_content', {
      target_post: POST(0),
      target_comment: null,
      report_person: false,
      report_reason: 'rosto_de_terceiro',
      report_details: null,
    });
    expect(screen.getByTestId('receipt-code').props.children).toBe('Protocolo ABCDEF12');
    expect(screen.getByTestId('receipt-hidden')).toBeTruthy();
    // O cartão sai do feed na hora; o do Bruno continua.
    expect(screen.queryByTestId(`post-${POST(0)}`)).toBeNull();
    expect(screen.getByTestId(`post-${POST(1)}`)).toBeTruthy();
  });

  test('denúncia comum não esconde nada e oferece bloquear depois', async () => {
    const { rpc } = setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(1);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    // Sem foto, o motivo "apareço nesta foto" nem aparece.
    expect(screen.queryByTestId('reason-rosto_de_terceiro')).toBeNull();
    await fireEvent.press(screen.getByTestId('reason-ofensivo'));
    await fireEvent.changeText(screen.getByTestId('reason-details'), '  debochou de quem pediu oração  ');
    await fireEvent.press(screen.getByTestId('report-send'));
    await waitFor(() => expect(screen.getByText('Denúncia recebida')).toBeTruthy());
    expect(calls(rpc, 'report_community_content')[0][1]).toMatchObject({
      target_post: POST(1),
      report_reason: 'ofensivo',
      report_details: 'debochou de quem pediu oração',
    });
    expect(screen.queryByTestId('receipt-hidden')).toBeNull();
    expect(screen.getByTestId(`post-${POST(1)}`)).toBeTruthy();
    expect(screen.getByTestId('receipt-block')).toBeTruthy();
  });

  test('denunciar a PESSOA vai pelo id do post com report_person = true', async () => {
    const { rpc } = setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(0);
    await fireEvent.press(sheet.getByTestId('sheet-report-person'));
    expect(screen.getByText('Denunciar Ana')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reason-assedio'));
    await fireEvent.press(screen.getByTestId('report-send'));
    await waitFor(() => expect(screen.getByText('Denúncia recebida')).toBeTruthy());
    expect(calls(rpc, 'report_community_content')[0][1]).toEqual({
      target_post: POST(0),
      target_comment: null,
      report_person: true,
      report_reason: 'assedio',
      report_details: null,
    });
    // Denúncia de pessoa não tira nada do ar.
    expect(screen.getByTestId(`post-${POST(0)}`)).toBeTruthy();
  });

  test('"alguém pode estar correndo perigo" mostra o aviso de emergência', async () => {
    setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(1);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    await fireEvent.press(screen.getByTestId('reason-risco_a_vida'));
    expect(screen.getByTestId('reason-emergency')).toBeTruthy();
  });

  test('sem motivo escolhido, a folha diz por que Enviar está apagado', async () => {
    setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(1);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    expect(screen.getByTestId('reason-needed')).toBeTruthy();
    expect(screen.getByTestId('report-send').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('reason-spam'));
    expect(screen.queryByTestId('reason-needed')).toBeNull();
  });

  test('detalhe longo demais não é enviado', async () => {
    const { rpc } = setup();
    await render(<FeedScreen />);
    const sheet = await openPostSheet(1);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    await fireEvent.press(screen.getByTestId('reason-spam'));
    await fireEvent.changeText(screen.getByTestId('reason-details'), 'a'.repeat(501));
    expect(screen.getByTestId('reason-too-long')).toBeTruthy();
    expect(screen.getByTestId('report-send').props.accessibilityState).toMatchObject({ disabled: true });
    expect(calls(rpc, 'report_community_content')).toHaveLength(0);
  });

  test('erro do servidor vira frase humana, nunca o texto cru', async () => {
    setup({ report_community_content: { error: { code: 'CM003', message: 'too many reports raw' } } });
    await render(<FeedScreen />);
    const sheet = await openPostSheet(1);
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    await fireEvent.press(screen.getByTestId('reason-spam'));
    await fireEvent.press(screen.getByTestId('report-send'));
    await waitFor(() => expect(screen.getByTestId('sheet-error')).toBeTruthy());
    expect(screen.getByText('Você chegou ao limite por agora. Tente de novo mais tarde.')).toBeTruthy();
    expect(screen.queryByText(/raw/)).toBeNull();
    expect(screen.queryByText('Denúncia recebida')).toBeNull();
  });

  test('bloquear: pede confirmação, manda o id do post, e tudo da pessoa bloqueada some', async () => {
    let blocked = false;
    const { rpc } = setup({
      community_feed: () => ({
        data: blocked
          ? [feedRow(1, { author_name: 'Bruno' })]
          : [feedRow(0), feedRow(1, { author_name: 'Bruno' }), feedRow(2)],
      }),
      block_community_author: () => {
        blocked = true;
        return { data: null };
      },
    });
    await render(<FeedScreen />);
    const sheet = await openPostSheet(0);
    await fireEvent.press(sheet.getByTestId('sheet-block'));
    expect(screen.getByText('Bloquear Ana?')).toBeTruthy();
    expect(calls(rpc, 'block_community_author')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('block-confirm'));

    await waitFor(() => expect(screen.getByTestId('blocked-close')).toBeTruthy());
    expect(rpc).toHaveBeenCalledWith('block_community_author', { target_post: POST(0), target_comment: null });
    // O feed volta do começo e o servidor já não manda nada da Ana (nem o outro post dela).
    await waitFor(() => expect(screen.queryByTestId(`post-${POST(2)}`)).toBeNull());
    expect(screen.queryByTestId(`post-${POST(0)}`)).toBeNull();
    expect(screen.getByTestId(`post-${POST(1)}`)).toBeTruthy();
    expect(calls(rpc, 'community_feed').length).toBeGreaterThanOrEqual(2);
    await fireEvent.press(screen.getByTestId('blocked-close'));
    expect(screen.queryByTestId('report-sheet')).toBeNull();
  });
});

describe('C5 no próprio post: apagar', () => {
  test('a folha só oferece apagar; confirma e o cartão sai', async () => {
    const { rpc } = setup({
      community_feed: { data: [feedRow(5, { is_mine: true, author_name: 'Davi' }), feedRow(1, { author_name: 'Bruno' })] },
    });
    await render(<FeedScreen />);
    const sheet = await openPostSheet(5);
    expect(sheet.queryByTestId('sheet-report-content')).toBeNull();
    expect(sheet.queryByTestId('sheet-block')).toBeNull();
    await fireEvent.press(sheet.getByTestId('sheet-delete'));
    expect(screen.getByText('Apagar esta publicação?')).toBeTruthy();
    expect(calls(rpc, 'delete_my_community_post')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.queryByTestId(`post-${POST(5)}`)).toBeNull());
    expect(rpc).toHaveBeenCalledWith('delete_my_community_post', { target_post: POST(5) });
    expect(screen.getByTestId(`post-${POST(1)}`)).toBeTruthy();
  });

  test('o meu post "Em análise" também pode ser apagado pela folha', async () => {
    const { rpc } = setup({
      my_community_posts: {
        data: [{ post_id: POST(9), body: 'Minha foto', photo_path: PHOTO, status: 'in_review', created_at: '2026-10-01T12:00:00Z' }],
      },
    });
    await render(<FeedScreen />);
    const sheet = await openPostSheet(9);
    await fireEvent.press(sheet.getByTestId('sheet-delete'));
    await fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.queryByTestId(`post-${POST(9)}`)).toBeNull());
    expect(rpc).toHaveBeenCalledWith('delete_my_community_post', { target_post: POST(9) });
  });
});

/* ------------------------------------------------------------ comentário */

function commentRow(i: number, extra: Record<string, unknown> = {}) {
  return {
    comment_id: COMMENT(i),
    body: `Comentário ${i}`,
    status: 'published',
    created_at: '2026-10-01T12:00:00Z',
    author_name: 'Carla',
    is_mine: false,
    ...extra,
  };
}

describe('C5 no comentário (a mesma folha)', () => {
  test('denunciar o comentário vai pelo id do comentário', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({ community_post_comments: { data: [commentRow(1)] } });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId(`comment-more-${COMMENT(1)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`comment-more-${COMMENT(1)}`));
    const sheet = within(screen.getByTestId('report-sheet'));
    expect(sheet.getByText('Denunciar este comentário')).toBeTruthy();
    expect(sheet.getByText('Denunciar Carla')).toBeTruthy();
    expect(sheet.getByText('Bloquear Carla')).toBeTruthy();
    await fireEvent.press(sheet.getByTestId('sheet-report-content'));
    // Comentário não tem foto: "apareço nesta foto" não aparece.
    expect(screen.queryByTestId('reason-rosto_de_terceiro')).toBeNull();
    await fireEvent.press(screen.getByTestId('reason-crianca_exposta'));
    await fireEvent.press(screen.getByTestId('report-send'));
    await waitFor(() => expect(screen.getByText('Denúncia recebida')).toBeTruthy());
    expect(rpc).toHaveBeenCalledWith('report_community_content', {
      target_post: null,
      target_comment: COMMENT(1),
      report_person: false,
      report_reason: 'crianca_exposta',
      report_details: null,
    });
    // Motivo urgente: o comentário sai da lista na hora.
    expect(screen.queryByTestId(`comment-${COMMENT(1)}`)).toBeNull();
  });

  test('bloquear quem comentou: o comentário some e a lista é pedida de novo', async () => {
    mockParams = { id: POST(0) };
    let blocked = false;
    const { rpc } = setup({
      community_post_comments: () => ({
        data: blocked ? [commentRow(2, { author_name: 'Bruno' })] : [commentRow(1), commentRow(2, { author_name: 'Bruno' }), commentRow(3)],
      }),
      block_community_author: () => {
        blocked = true;
        return { data: null };
      },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId(`comment-more-${COMMENT(1)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`comment-more-${COMMENT(1)}`));
    await fireEvent.press(screen.getByTestId('sheet-block'));
    await fireEvent.press(screen.getByTestId('block-confirm'));
    await waitFor(() => expect(screen.queryByTestId(`comment-${COMMENT(3)}`)).toBeNull());
    expect(rpc).toHaveBeenCalledWith('block_community_author', { target_post: null, target_comment: COMMENT(1) });
    expect(screen.queryByTestId(`comment-${COMMENT(1)}`)).toBeNull();
    expect(screen.getByTestId(`comment-${COMMENT(2)}`)).toBeTruthy();
  });

  test('no MEU comentário a folha só oferece apagar', async () => {
    mockParams = { id: POST(0) };
    const { rpc } = setup({
      community_post_comments: { data: [commentRow(4, { is_mine: true, author_name: 'Davi' }), commentRow(1)] },
    });
    await render(<PostCommentsRoute />);
    await waitFor(() => expect(screen.getByTestId(`comment-more-${COMMENT(4)}`)).toBeTruthy());
    await fireEvent.press(screen.getByTestId(`comment-more-${COMMENT(4)}`));
    const sheet = within(screen.getByTestId('report-sheet'));
    expect(sheet.queryByTestId('sheet-report-content')).toBeNull();
    await fireEvent.press(sheet.getByTestId('sheet-delete'));
    await fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(screen.queryByTestId(`comment-${COMMENT(4)}`)).toBeNull());
    expect(rpc).toHaveBeenCalledWith('delete_my_community_comment', { target_comment: COMMENT(4) });
    expect(screen.getByTestId(`comment-${COMMENT(1)}`)).toBeTruthy();
  });
});
