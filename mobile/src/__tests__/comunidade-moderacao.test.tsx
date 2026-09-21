/**
 * Fila de moderação dentro do app (Comunidade V2), com um cliente Supabase SIMULADO.
 *
 * Prova o comportamento do APP: quem não modera é mandado embora antes de
 * qualquer consulta da fila; o que cada ação envia a cada RPC; que recusar,
 * remover e suspender exigem motivo; que urgente vem primeiro; que foto que não
 * abriu não pode ser aprovada; e que o histórico diz a verdade quando o servidor
 * ainda não tem a consulta. NÃO prova a autorização do servidor (pgTAP 07–10).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { createCommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import { createModerationApi } from '@/ui/comunidade/moderacao/moderacaoApi';
import { ModerationQueueScreen } from '@/ui/comunidade/moderacao/ModerationQueueScreen';
import { dueLabel, timeAgo } from '@/ui/comunidade/moderacao/rotulos';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE'),
  digestStringAsync: jest.fn(async () => 'AB'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

// Portão e nuvem controlados pelo teste da rota.
const mockGate = { enabled: false, supabase: null as unknown };
jest.mock('@/config/features', () => ({
  get COMMUNITY_ENABLED() {
    return mockGate.enabled;
  },
}));
jest.mock('@/cloud/client', () => ({ getSupabase: () => mockGate.supabase }));

const NOW = Date.parse('2026-10-05T12:00:00Z');
const POST_PHOTO = '20000000-0000-4000-8000-000000000001';
const POST_TEXT = '20000000-0000-4000-8000-000000000002';
const POST_REPORTED = '20000000-0000-4000-8000-000000000003';
const POST_URGENT = '20000000-0000-4000-8000-000000000004';
const REPORT_PERSON = '40000000-0000-4000-8000-000000000001';
const REPORT_POST = '40000000-0000-4000-8000-000000000002';
const REPORT_URGENT = '40000000-0000-4000-8000-000000000003';
const PHOTO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg';

type RpcResult = { data?: unknown; error?: unknown };

function queueRow(over: Record<string, unknown>) {
  return {
    item_kind: 'post',
    item_id: POST_TEXT,
    post_id: POST_TEXT,
    body: 'Texto',
    photo_path: null,
    hold_reason: null,
    item_status: 'in_review',
    author_known: true,
    author_name: 'Ana Souza',
    author_status: 'active',
    created_at: '2026-10-05T10:00:00Z',
    open_reports: 0,
    urgent: false,
    due_at: null,
    ...over,
  };
}

const QUEUE = [
  queueRow({ item_id: POST_PHOTO, post_id: POST_PHOTO, body: null, photo_path: PHOTO, hold_reason: 'foto' }),
  queueRow({ item_id: POST_TEXT, post_id: POST_TEXT, body: 'Veja www.exemplo.com', hold_reason: 'link' }),
  queueRow({
    item_id: POST_REPORTED,
    post_id: POST_REPORTED,
    body: 'Publicado com denúncia',
    item_status: 'published',
    open_reports: 1,
    due_at: '2026-10-06T10:00:00Z',
  }),
  queueRow({
    item_id: POST_URGENT,
    post_id: POST_URGENT,
    body: 'Foto do culto',
    item_status: 'in_review',
    hold_reason: 'denuncia',
    open_reports: 1,
    urgent: true,
    due_at: '2026-10-05T14:00:00Z',
  }),
];

const REPORTS = [
  {
    report_id: REPORT_URGENT,
    target_kind: 'post',
    post_id: POST_URGENT,
    comment_id: null,
    reported_known: true,
    reported_name: 'Ana Souza',
    reason: 'crianca_exposta',
    details: null,
    urgent: true,
    created_at: '2026-10-05T11:00:00Z',
    due_at: '2026-10-05T14:00:00Z',
  },
  {
    report_id: REPORT_POST,
    target_kind: 'post',
    post_id: POST_REPORTED,
    comment_id: null,
    reported_known: true,
    reported_name: 'Ana Souza',
    reason: 'spam',
    details: 'Repetiu três vezes',
    urgent: false,
    created_at: '2026-10-04T10:00:00Z',
    due_at: '2026-10-06T10:00:00Z',
  },
  {
    report_id: REPORT_PERSON,
    target_kind: 'person',
    post_id: null,
    comment_id: null,
    reported_known: true,
    reported_name: 'Bruno Lima',
    reason: 'assedio',
    details: null,
    urgent: false,
    created_at: '2026-10-05T09:00:00Z',
    due_at: '2026-10-07T09:00:00Z',
  },
];

function fake(results: Record<string, RpcResult> = {}, opts: { signFails?: boolean } = {}) {
  const rpc = jest.fn(async (fn: string, _args?: Record<string, unknown>) => {
    const configured = results[fn] ?? {};
    return { data: configured.data ?? null, error: configured.error ?? null };
  });
  const createSignedUrls = jest.fn(async (paths: string[]) =>
    opts.signFails
      ? { data: null, error: { message: 'fetch failed' } }
      : { data: paths.map((path) => ({ path, signedUrl: `https://assinada/${path}`, error: null })), error: null },
  );
  const files = {
    upload: jest.fn(async () => ({ data: null, error: null })),
    createSignedUrls,
    remove: jest.fn(async () => ({ data: null, error: null })),
  };
  const client: CommunityClient = { rpc, storage: { from: () => files } };
  return {
    rpc,
    createSignedUrls,
    community: createCommunityApi(client, { randomUUID: () => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' }),
    moderation: createModerationApi(client),
  };
}

const MODERATOR: RpcResult = { data: [{ is_member: true, member_status: 'active', is_moderator: true }] };

async function renderQueue(results: Record<string, RpcResult> = {}, opts: { signFails?: boolean } = {}) {
  const f = fake(
    {
      my_community_status: MODERATOR,
      community_moderation_queue: { data: QUEUE },
      community_open_reports: { data: REPORTS },
      ...results,
    },
    opts,
  );
  const onNotModerator = jest.fn();
  await render(
    <ModerationQueueScreen community={f.community} moderation={f.moderation} onNotModerator={onNotModerator} now={() => NOW} />,
  );
  return { ...f, onNotModerator };
}

function called(rpc: jest.Mock, fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn);
}

afterEach(() => {
  jest.restoreAllMocks();
  mockGate.enabled = false;
  mockGate.supabase = null;
});

describe('cliente de moderação', () => {
  test('recusar e remover exigem motivo, e isso falha antes de gastar rede', async () => {
    const { rpc, moderation } = fake();
    await expect(moderation.decide({ kind: 'post', id: POST_TEXT, decision: 'reject' })).rejects.toBeInstanceOf(
      CommunityError,
    );
    await expect(
      moderation.decide({ kind: 'comment', id: POST_TEXT, decision: 'remove', reason: 'spam', note: 'x'.repeat(501) }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(moderation.suspendMember({ target: { kind: 'post', id: 'não-é-uuid' }, reason: 'spam' })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  test('cada decisão vai para a RPC certa, com motivo e nota (o servidor registra a ação)', async () => {
    const { rpc, moderation } = fake();
    await moderation.decide({ kind: 'post', id: POST_TEXT, decision: 'approve', reason: 'spam', note: 'ignorada' });
    await moderation.decide({ kind: 'comment', id: POST_TEXT, decision: 'remove', reason: 'ofensivo', note: '  Fere a regra 2.  ' });
    await moderation.resolveReport(REPORT_POST, 'dismissed');
    await moderation.suspendMember({ target: { kind: 'report', id: REPORT_PERSON }, reason: 'assedio', note: null });
    await moderation.suspendMember({ target: { kind: 'comment', id: POST_TEXT }, reason: 'spam', note: null });
    expect(rpc.mock.calls).toEqual([
      [
        'moderate_community_post',
        { target_post: POST_TEXT, decision: 'approve', decision_reason: null, note_for_author: null },
      ],
      [
        'moderate_community_comment',
        { target_comment: POST_TEXT, decision: 'remove', decision_reason: 'ofensivo', note_for_author: 'Fere a regra 2.' },
      ],
      ['resolve_community_report', { target_report: REPORT_POST, outcome: 'dismissed' }],
      [
        'suspend_community_author',
        {
          target_post: null,
          target_comment: null,
          target_report: REPORT_PERSON,
          new_status: 'suspended',
          decision_reason: 'assedio',
          note_for_author: null,
        },
      ],
      [
        'suspend_community_author',
        {
          target_post: null,
          target_comment: POST_TEXT,
          target_report: null,
          new_status: 'suspended',
          decision_reason: 'spam',
          note_for_author: null,
        },
      ],
    ]);
  });

  test('histórico: sem a RPC no servidor devolve null (a tela diz isso); outro erro vira erro traduzido', async () => {
    expect(await fake({ community_moderation_history: { error: { code: 'PGRST202' } } }).moderation.history()).toBeNull();
    await expect(
      fake({ community_moderation_history: { error: { code: '42501', message: 'apenas moderação' } } }).moderation.history(),
    ).rejects.toMatchObject({ code: 'not_authorized' });
    const rows = await fake({
      community_moderation_history: {
        data: [{ action_id: 7, kind: 'reject', decided_by: 'pessoa', reason: 'spam', created_at: '2026-10-05T10:00:00Z' }],
      },
    }).moderation.history();
    expect(rows?.[0]).toMatchObject({ actionId: '7', kind: 'reject', decidedBy: 'pessoa', reason: 'spam' });
  });

  test('estado desconhecido na fila nunca vira "publicado"', async () => {
    const { moderation } = fake({ community_moderation_queue: { data: [queueRow({ item_status: 'qualquer' })] } });
    expect((await moderation.queue())[0].status).toBe('in_review');
  });

  test('tempo por extenso', () => {
    expect(timeAgo('2026-10-05T10:00:00Z', NOW)).toBe('há 2 horas');
    expect(dueLabel('2026-10-05T14:00:00Z', NOW)).toEqual({ text: 'prazo em 2 horas', late: false });
    expect(dueLabel('2026-10-05T11:00:00Z', NOW)).toEqual({ text: 'prazo vencido há 1 hora', late: true });
  });
});

describe('tela da fila', () => {
  test('quem não modera é mandado embora antes de qualquer consulta da fila', async () => {
    const { rpc, onNotModerator } = await renderQueue({ my_community_status: { data: [{ is_moderator: false }] } });
    await waitFor(() => expect(onNotModerator).toHaveBeenCalledTimes(1));
    expect(called(rpc, 'community_moderation_queue')).toHaveLength(0);
    expect(called(rpc, 'community_open_reports')).toHaveLength(0);
  });

  test('erro ao abrir mostra o F5 com saída, sem texto técnico', async () => {
    await renderQueue({ my_community_status: { error: { message: 'fetch failed' } } });
    expect(await screen.findByTestId('moderation-error')).toBeTruthy();
    expect(screen.queryByText(/fetch failed/)).toBeNull();
  });

  test('em análise: foto e texto segurado, cada um com o motivo; aprovar chama a RPC e recarrega', async () => {
    const { rpc } = await renderQueue();
    expect(await screen.findByText('Fotos aguardando aprovação')).toBeTruthy();
    expect(screen.getByTestId(`photo-${POST_PHOTO}`)).toBeTruthy();
    expect(screen.getByText('Segurado por: Link')).toBeTruthy();
    // Denunciados não entram nesta aba.
    expect(screen.queryByTestId(`item-${POST_URGENT}`)).toBeNull();
    expect(screen.getByText('Fim da fila.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`approve-${POST_PHOTO}`));
    await screen.findByTestId('moderation-done-notice');
    expect(called(rpc, 'moderate_community_post')[0][1]).toEqual({
      target_post: POST_PHOTO,
      decision: 'approve',
      decision_reason: null,
      note_for_author: null,
    });
    expect(called(rpc, 'community_moderation_queue')).toHaveLength(2);
  });

  test('foto que não abriu não pode ser aprovada', async () => {
    await renderQueue({}, { signFails: true });
    expect(await screen.findByTestId(`photo-missing-${POST_PHOTO}`)).toBeTruthy();
    expect(screen.getByTestId(`approve-${POST_PHOTO}`).props.accessibilityState).toMatchObject({ disabled: true });
    // Texto não depende de foto.
    expect(screen.getByTestId(`approve-${POST_TEXT}`).props.accessibilityState).toMatchObject({ disabled: false });
  });

  test('recusar abre a folha; sem motivo não confirma; com motivo e nota envia tudo', async () => {
    const { rpc } = await renderQueue();
    await fireEvent.press(await screen.findByTestId(`reject-${POST_TEXT}`));
    expect(screen.getByTestId('decision-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByTestId('reason-dado_pessoal'));
    await fireEvent.changeText(screen.getByTestId('decision-note'), 'Tire o link e publique de novo.');
    await fireEvent.press(screen.getByTestId('decision-confirm'));
    await screen.findByTestId('moderation-done-notice');
    expect(called(rpc, 'moderate_community_post')[0][1]).toEqual({
      target_post: POST_TEXT,
      decision: 'reject',
      decision_reason: 'dado_pessoal',
      note_for_author: 'Tire o link e publique de novo.',
    });
  });

  test('denúncias: urgente primeiro, com a marca escrita; denúncia de pessoa também aparece', async () => {
    await renderQueue();
    await fireEvent.press(await screen.findByTestId('tab-denuncias'));
    const order = screen.getAllByTestId(/^(item|person)-/);
    expect(order.map((n) => n.props.testID)).toEqual([
      `item-${POST_URGENT}`,
      `item-${POST_REPORTED}`,
      `person-${REPORT_PERSON}`,
    ]);
    expect(screen.getAllByTestId('urgent-tag')).toHaveLength(1);
    expect(screen.getByText('Denúncia: Criança exposta')).toBeTruthy();
    expect(screen.getByText('“Repetiu três vezes”')).toBeTruthy();
    // Orientação de protocolo não aparece sem a folha aberta.
    expect(screen.queryByTestId('reason-guidance')).toBeNull();
  });

  test('remover a urgente: o motivo da denúncia vem marcado, a orientação aparece e a RPC recebe o motivo', async () => {
    const { rpc } = await renderQueue();
    await fireEvent.press(await screen.findByTestId('tab-denuncias'));
    await fireEvent.press(screen.getByTestId(`remove-${POST_URGENT}`));
    expect(screen.getByTestId('reason-guidance')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('decision-confirm'));
    await screen.findByTestId('moderation-done-notice');
    expect(called(rpc, 'moderate_community_post')[0][1]).toEqual({
      target_post: POST_URGENT,
      decision: 'remove',
      decision_reason: 'crianca_exposta',
      note_for_author: null,
    });
  });

  test('manter no ar um publicado arquiva cada denúncia dele', async () => {
    const { rpc } = await renderQueue();
    await fireEvent.press(await screen.findByTestId('tab-denuncias'));
    await fireEvent.press(screen.getByTestId(`keep-${POST_REPORTED}`));
    await screen.findByTestId('moderation-done-notice');
    expect(called(rpc, 'resolve_community_report').map(([, args]) => args)).toEqual([
      { target_report: REPORT_POST, outcome: 'dismissed' },
    ]);
    expect(called(rpc, 'moderate_community_post')).toHaveLength(0);
  });

  test('suspender a pessoa denunciada pede confirmação, suspende e fecha a denúncia como atendida', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    const { rpc } = await renderQueue();
    await fireEvent.press(await screen.findByTestId('tab-denuncias'));
    await fireEvent.press(screen.getByTestId(`suspend-${REPORT_PERSON}`));
    await fireEvent.press(screen.getByTestId('decision-confirm'));
    await screen.findByTestId('moderation-done-notice');
    expect(called(rpc, 'suspend_community_author')[0][1]).toEqual({
      target_post: null,
      target_comment: null,
      target_report: REPORT_PERSON,
      new_status: 'suspended',
      decision_reason: 'assedio',
      note_for_author: null,
    });
    expect(called(rpc, 'resolve_community_report')[0][1]).toEqual({ target_report: REPORT_PERSON, outcome: 'actioned' });
    // Nenhum user_id alheio chega ao aparelho: nem na chamada, nem na tela.
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/target_user|user_id/);
  });

  test('erro do servidor numa ação vira aviso humano e a fila recarrega', async () => {
    const { rpc } = await renderQueue({ moderate_community_post: { error: { code: '42501', message: 'ninguém modera o próprio conteúdo' } } });
    await fireEvent.press(await screen.findByTestId(`approve-${POST_TEXT}`));
    expect(await screen.findByTestId('moderation-error-notice')).toBeTruthy();
    expect(screen.getByText('Você não tem permissão para esta ação.')).toBeTruthy();
    expect(called(rpc, 'community_moderation_queue')).toHaveLength(2);
  });

  test('histórico sem a consulta no servidor: estado honesto, nenhuma lista inventada', async () => {
    await renderQueue({ community_moderation_history: { error: { code: 'PGRST202' } } });
    await fireEvent.press(await screen.findByTestId('tab-historico'));
    expect(await screen.findByTestId('moderation-history-unavailable')).toBeTruthy();
  });

  test('histórico com decisões mostra o tipo e se foi pessoa ou filtro, nunca quem', async () => {
    await renderQueue({
      community_moderation_history: {
        data: [
          { action_id: 1, kind: 'auto_hold', decided_by: 'automatico', created_at: '2026-10-05T11:00:00Z' },
          { action_id: 2, kind: 'remove', decided_by: 'pessoa', reason: 'spam', created_at: '2026-10-05T11:30:00Z' },
        ],
      },
    });
    await fireEvent.press(await screen.findByTestId('tab-historico'));
    expect(await screen.findByText('Segurado pelo filtro')).toBeTruthy();
    expect(screen.getByText(/por filtro automático/)).toBeTruthy();
    expect(screen.getByText(/por pessoa da equipe/)).toBeTruthy();
    expect(screen.getByText('Fim do histórico.')).toBeTruthy();
  });
});

describe('rota /moderacao', () => {
  // Importada aqui para os mocks do portão valerem.
  const ModerationRoute = jest.requireActual('@/app/moderacao/index').default as () => React.JSX.Element;

  test('com a Comunidade desligada, a rota não existe e volta para a casa', async () => {
    mockGate.enabled = false;
    await render(<ModerationRoute />);
    expect(screen.getByTestId('redirect').props.children).toBe('/');
  });

  test('ligada e sem servidor configurado: estado honesto, sem fila falsa', async () => {
    mockGate.enabled = true;
    mockGate.supabase = null;
    await render(<ModerationRoute />);
    expect(screen.getByTestId('moderation-no-server')).toBeTruthy();
  });
});
