/**
 * Publicar (C3), consentimento (C4) e regras, com o cliente da Comunidade
 * SIMULADO (mesmo molde de comunidade-cliente.test.ts). Prova o comportamento das
 * TELAS: o fluxo regras → consentimento → publicar, o portão PENDENTE, o aviso de
 * quem vê, a foto preparada sem metadados, os estados depois de enviar e que a
 * reflexão privada nunca pré-preenche a publicação. Não prova o servidor.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { Keyboard } from 'react-native';

import ConsentScreen from '@/app/comunidade/consentimento';
import PublishScreen from '@/app/comunidade/publicar';
import RulesScreen from '@/app/comunidade/regras';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import { LIMITS } from '@/community/validation';
import {
  fitsWithoutScroll,
  parseDay,
  publishStep,
  reachedEnd,
  safeNext,
  sentCopy,
} from '@/ui/comunidade/publicar/fluxo';
import { base64ToBytes, fitWithin, preparePhoto } from '@/ui/comunidade/publicar/foto';
import { splitBold } from '@/ui/comunidade/publicar/partes';
import {
  audienceSentence,
  CAMPOS,
  consentDocument,
  hasOpenFields,
  PENDING_NOTICE,
  rulesDocument,
  termsAvailability,
  termsDocumentText,
  type CampoId,
} from '@/ui/comunidade/publicar/textos';

/* ------------------------------------------------------------------ mocks */

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

/** null = Comunidade desligada nesta build (o que getCommunityApi devolve na V1). */
let mockApi: CommunityApi | null = null;
jest.mock('@/community/api', () => {
  const actual = jest.requireActual('@/community/api');
  return { ...actual, getCommunityApi: () => mockApi };
});

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args) }));

/** JPEG mínimo sem metadados: SOI, DQT curto, SOS. */
const CLEAN_JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]);
/** O mesmo com um APP1 "Exif\0\0" (onde mora o GPS). */
const EXIF_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02,
]);
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

let mockEncoded = CLEAN_JPEG;
const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => {
  const makeRef = (width: number, height: number) => ({
    width,
    height,
    release: jest.fn(),
    saveAsync: jest.fn(async (options: { compress: number; format: string; base64: boolean }) => ({
      uri: 'file:///cache/preparada.jpg',
      width,
      height,
      base64: options.base64 ? Buffer.from(mockEncoded).toString('base64') : undefined,
      options,
    })),
  });
  return {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: jest.fn(() => {
        let size = { width: 4000, height: 3000 };
        const context = {
          resize: (next: { width?: number; height?: number }) => {
            mockResize(next);
            size = next.width ? { width: next.width, height: 1200 } : { width: 1200, height: next.height ?? 0 };
            return context;
          },
          renderAsync: jest.fn(async () => makeRef(size.width, size.height)),
          release: jest.fn(),
        };
        return context;
      }),
    },
  };
});

/* ------------------------------------------------------ cliente simulado */

const POST = '20000000-0000-4000-8000-000000000001';

type RpcResult = { data?: unknown; error?: unknown };

function statusRow(overrides: Record<string, unknown> = {}) {
  return {
    is_member: true,
    member_status: 'active',
    display_name: 'Ana',
    can_publish: true,
    needs_publish_consent: false,
    needs_rules: false,
    publish_consent_version: 'PENDENTE',
    rules_version: 'PENDENTE',
    is_moderator: false,
    ...overrides,
  };
}

function useFakeApi(results: Record<string, RpcResult> = {}) {
  const rpc = jest.fn(async (fn: string, _args?: Record<string, unknown>) => {
    const configured = results[fn] ?? {};
    return { data: configured.data ?? null, error: configured.error ?? null };
  });
  const upload = jest.fn(async () => ({ data: { path: 'ok' }, error: null }));
  const remove = jest.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = jest.fn(async () => ({ data: [], error: null }));
  const client: CommunityClient = { rpc, storage: { from: () => ({ upload, createSignedUrls, remove }) } };
  mockApi = createCommunityApi(client, { randomUUID: () => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' });
  return { rpc, upload, remove };
}

function rpcCalls(rpc: jest.Mock, fn: string) {
  return rpc.mock.calls.filter(([name]) => name === fn).map(([, args]) => args);
}

const ORIGINAL_CAMPOS = { ...CAMPOS };
function fillCampos(version: string) {
  for (const key of Object.keys(CAMPOS) as CampoId[]) CAMPOS[key] = `valor-${key}`;
  CAMPOS.versaoRegras = version;
  CAMPOS.versaoConsentimento = version;
}

beforeEach(() => {
  mockParams = {};
  mockSignedIn = true;
  mockApi = null;
  mockEncoded = CLEAN_JPEG;
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockLaunch.mockReset();
  mockResize.mockClear();
  Object.assign(CAMPOS, ORIGINAL_CAMPOS);
});

/* ------------------------------------------------------------ regras puras */

describe('textos', () => {
  test('a frase de quem vê é a do rascunho §3, com o campo em aberto entre colchetes', () => {
    expect(audienceSentence()).toBe(
      'Sua publicação aparece, com o seu nome e a sua foto de perfil, para as pessoas que entraram na comunidade da ' +
        '[NOME DA IGREJA] com um código da igreja — hoje cerca de [N] pessoas maiores de 18 anos. Algumas você não ' +
        'conhece.',
    );
  });

  test('a mesma frase, palavra por palavra, está no consentimento (C4)', () => {
    expect(termsDocumentText(consentDocument())).toContain(audienceSentence());
  });

  test('nenhuma nota interna do rascunho vai para a tela', () => {
    for (const doc of [rulesDocument(), consentDocument()]) {
      expect(termsDocumentText(doc)).not.toMatch(/\[(DECISÃO PENDENTE|ADVOGADO|CONFERIR|ENGENHARIA)/);
    }
  });

  test('versão PENDENTE, texto sem versão ou campo vazio: ninguém aceita', () => {
    expect(termsAvailability(consentDocument(), 'PENDENTE')).toBe('pending');
    expect(termsAvailability(consentDocument(), '1.0')).toBe('pending'); // texto do app ainda sem versão
    fillCampos('1.0');
    expect(hasOpenFields(termsDocumentText(consentDocument()))).toBe(false);
    expect(termsAvailability(consentDocument(), 'PENDENTE')).toBe('pending');
    expect(termsAvailability(consentDocument(), '1.0')).toBe('ready');
    expect(termsAvailability(consentDocument(), '2.0')).toBe('mismatch');
  });

  test('o texto que vira hash é estável e muda quando o texto muda', () => {
    const a = termsDocumentText(rulesDocument());
    expect(termsDocumentText(rulesDocument())).toBe(a);
    fillCampos('1.0');
    expect(termsDocumentText(rulesDocument())).not.toBe(a);
  });

  test('negrito do rascunho', () => {
    expect(splitBold('ligue **188** (CVV)')).toEqual([
      { text: 'ligue ', bold: false },
      { text: '188', bold: true },
      { text: ' (CVV)', bold: false },
    ]);
  });
});

describe('fluxo', () => {
  const base = {
    isMember: true,
    memberStatus: 'active' as const,
    displayName: 'Ana',
    canPublish: true,
    needsPublishConsent: false,
    needsRules: false,
    publishConsentVersion: '1.0',
    rulesVersion: '1.0',
    isModerator: false,
  };

  test('regras antes do consentimento, e os dois antes do formulário', () => {
    expect(publishStep({ ...base, isMember: false })).toBe('needs_invite');
    expect(publishStep({ ...base, memberStatus: 'suspended' })).toBe('blocked');
    expect(publishStep({ ...base, needsRules: true, needsPublishConsent: true })).toBe('rules');
    expect(publishStep({ ...base, needsPublishConsent: true })).toBe('consent');
    expect(publishStep({ ...base, canPublish: false })).toBe('cannot_publish');
    expect(publishStep(base)).toBe('form');
  });

  test('o "next" só aceita rota interna da Comunidade', () => {
    expect(safeNext('/comunidade/publicar')).toBe('/comunidade/publicar');
    expect(safeNext('https://exemplo.com')).toBeNull();
    expect(safeNext('//exemplo.com')).toBeNull();
    expect(safeNext('/conta')).toBeNull();
    expect(safeNext('/comunidade/../conta')).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });

  test('dia só de 1 a 100', () => {
    expect(parseDay('17')).toBe(17);
    expect(parseDay('0')).toBeNull();
    expect(parseDay('101')).toBeNull();
    expect(parseDay('3.5')).toBeNull();
  });

  test('fim da rolagem', () => {
    expect(reachedEnd({ contentOffset: { y: 0 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 800 } })).toBe(false);
    expect(reachedEnd({ contentOffset: { y: 1190 }, contentSize: { height: 2000 }, layoutMeasurement: { height: 800 } })).toBe(true);
    expect(fitsWithoutScroll(800, 700)).toBe(true);
    expect(fitsWithoutScroll(800, 2000)).toBe(false);
    expect(fitsWithoutScroll(0, 0)).toBe(false);
  });

  test('"Em análise" diz que só o autor vê', () => {
    expect(sentCopy({ status: 'published', hadPhoto: false }).title).toBe('Publicado');
    expect(sentCopy({ status: 'in_review', hadPhoto: true }).message).toContain('só você a vê');
    expect(sentCopy({ status: 'in_review', hadPhoto: false }).message).toContain('só você a vê');
  });
});

describe('foto', () => {
  test('redimensiona só o lado maior, e só se passar de 1600', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600 });
    expect(fitWithin(3000, 4000)).toEqual({ height: 1600 });
    expect(fitWithin(1600, 900)).toBeNull();
    expect(fitWithin(0, 0)).toBeNull();
  });

  test('base64 volta aos mesmos bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(base64ToBytes(b64(bytes)))).toEqual(Array.from(bytes));
    expect(() => base64ToBytes('@@@@')).toThrow();
  });

  test('prepara em JPEG 0,8 com 1600 px e confere que não sobrou metadado', async () => {
    const prepared = await preparePhoto({ uri: 'file:///galeria.heic', width: 4000, height: 3000 });
    expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
    expect(Array.from(prepared.bytes)).toEqual(Array.from(CLEAN_JPEG));
    expect(prepared.uri).toBe('file:///cache/preparada.jpg');
  });

  test('se o reencode deixar EXIF, a foto é recusada antes de qualquer rede', async () => {
    mockEncoded = EXIF_JPEG;
    const attempt = preparePhoto({ uri: 'file:///galeria.jpg', width: 1000, height: 800 });
    await expect(attempt).rejects.toBeInstanceOf(CommunityError);
    await expect(preparePhoto({ uri: 'file:///g.jpg', width: 1, height: 1 })).rejects.toMatchObject({
      code: 'photo_has_metadata',
    });
  });
});

/* ------------------------------------------------------------------ C3 */

describe('C3 · Publicar', () => {
  test('Comunidade desligada nesta build: estado honesto, sem formulário', async () => {
    await render(<PublishScreen />);
    expect(screen.getByText('A comunidade ainda não está disponível nesta versão do app.')).toBeTruthy();
    expect(screen.queryByTestId('publish-input')).toBeNull();
  });

  test('sem conta: pede o e-mail, sem formulário', async () => {
    useFakeApi();
    mockSignedIn = false;
    await render(<PublishScreen />);
    expect(screen.getByText('Entre com o seu e-mail')).toBeTruthy();
    expect(screen.queryByTestId('publish-input')).toBeNull();
  });

  test('sem código da igreja: diz o que falta', async () => {
    useFakeApi({ my_community_status: { data: [statusRow({ is_member: false })] } });
    await render(<PublishScreen />);
    expect(await screen.findByText('Para participar, entre com o código da sua igreja.')).toBeTruthy();
  });

  test('primeira vez: vai para as regras, levando o caminho de volta e o dia', async () => {
    useFakeApi({ my_community_status: { data: [statusRow({ needs_rules: true, needs_publish_consent: true })] } });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/comunidade/regras',
        params: { next: '/comunidade/publicar', day: '17' },
      }),
    );
  });

  test('regras aceitas, sem consentimento: vai para C4', async () => {
    useFakeApi({ my_community_status: { data: [statusRow({ needs_publish_consent: true })] } });
    await render(<PublishScreen />);
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/comunidade/consentimento',
        params: { next: '/comunidade/publicar' },
      }),
    );
  });

  test('formulário: aviso de quem vê acima do campo, campo VAZIO e "Publicar" desligado até haver texto', async () => {
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    const input = await screen.findByTestId('publish-input');
    expect(screen.getByTestId('audience-notice')).toBeTruthy();
    expect(screen.getByText(audienceSentence())).toBeTruthy();
    expect(input.props.value).toBe('');
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(input, '   ');
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(input, 'Deus foi fiel.');
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(false);
  });

  test('a reflexão privada nunca pré-preenche: a tela nem importa o que lê a reflexão', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'comunidade', 'publicar.tsx'), 'utf8');
    expect(source).not.toMatch(/@\/reflections/);
    expect(source).not.toMatch(/defaultValue|initialBody/);
  });

  test('texto limpo: publica com o dia marcado e mostra "Publicado"', async () => {
    const { rpc } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), '  Deus foi fiel.  ');
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Publicado')).toBeTruthy();
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([
      { post_body: 'Deus foi fiel.', post_photo_path: null, post_day: 17 },
    ]);
  });

  test('desmarcar o dia publica sem dia', async () => {
    const { rpc } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Oração');
    await fireEvent.press(screen.getByTestId('publish-mark-day'));
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(rpcCalls(rpc, 'create_community_post')[0]).toMatchObject({ post_day: null });
  });

  test('acima do limite do servidor, não envia', async () => {
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'a'.repeat(LIMITS.postBody + 1));
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('publish-counter')).toBeTruthy();
  });

  test('foto: aviso de rosto e criança ANTES da galeria; sobe só ao publicar; fica "Em análise"', async () => {
    const { rpc, upload } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { data: [{ post_id: POST, status: 'in_review' }] },
    });
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///galeria.jpg', width: 4000, height: 3000 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('photo-open'));
    expect(screen.getByTestId('photo-warning')).toBeTruthy();
    expect(screen.getByText(/Só publique o rosto de outra pessoa se ela concordou/)).toBeTruthy();
    expect(screen.getByText(/reconhecer uma criança ou um adolescente/)).toBeTruthy();
    expect(mockLaunch).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('photo-pick'));
    await screen.findByTestId('photo-preview');
    expect(mockLaunch).toHaveBeenCalledWith(expect.objectContaining({ exif: false, mediaTypes: ['images'] }));
    expect(upload).not.toHaveBeenCalled(); // nada sobe na escolha

    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(false); // só foto basta
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Em análise')).toBeTruthy();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([
      { post_body: null, post_photo_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg', post_day: null },
    ]);
  });

  test('foto com metadado que não saiu: recusada na escolha, com o motivo', async () => {
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    mockEncoded = EXIF_JPEG;
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///g.jpg', width: 800, height: 600 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('photo-open'));
    await fireEvent.press(screen.getByTestId('photo-pick'));
    expect(await screen.findByTestId('photo-error')).toBeTruthy();
    expect(screen.getByText('Não foi possível remover os dados de localização da foto. Ela não foi enviada.')).toBeTruthy();
    expect(screen.queryByTestId('photo-preview')).toBeNull();
  });

  test('se o post falha depois do upload, a foto enviada é descartada', async () => {
    const { remove } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { error: { code: 'CM003' } },
    });
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///g.jpg', width: 800, height: 600 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('photo-open'));
    await fireEvent.press(screen.getByTestId('photo-pick'));
    await screen.findByTestId('photo-preview');
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Você chegou ao limite por agora. Tente de novo mais tarde.')).toBeTruthy();
    expect(remove).toHaveBeenCalledWith(['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg']);
  });

  test('teclado aberto: a área da foto vira uma linha curta abaixo do campo; o aviso continua', async () => {
    const handlers: Record<string, ((event: unknown) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: unknown) => void) => {
      (handlers[event] ??= []).push(handler);
      return { remove: () => {} };
    }) as never);
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    await render(<PublishScreen />);
    await screen.findByTestId('publish-input');
    const open = Object.keys(handlers).find((name) => name.endsWith('Show'));
    expect(open).toBeDefined();
    // O teclado do iOS (e o KeyboardAvoidingView, que também escuta) recebem o mesmo evento.
    const frame = { endCoordinates: { screenX: 0, screenY: 500, width: 390, height: 344 }, duration: 0 };
    await act(async () => handlers[open!].forEach((handler) => handler(frame)));
    expect(screen.getByTestId('audience-notice')).toBeTruthy();
    expect(screen.getByTestId('photo-open').props.accessibilityLabel).toBe('Escolher uma foto (opcional)');
    spy.mockRestore();
  });
});

/* ------------------------------------------------------------------ C4 */

describe('C4 · Consentimento', () => {
  test('versão PENDENTE: diz que a igreja ainda não liberou e não oferece o aceite', async () => {
    const { rpc } = useFakeApi({ my_community_status: { data: [statusRow({ needs_publish_consent: true })] } });
    await render(<ConsentScreen />);
    expect(await screen.findByTestId('consent-notice')).toBeTruthy();
    expect(screen.getAllByText(PENDING_NOTICE).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('consent-accept')).toBeNull();
    expect(screen.getByText(audienceSentence())).toBeTruthy();
    expect(rpcCalls(rpc, 'accept_community_terms')).toEqual([]);
  });

  test('versão aprovada: registra versão + sha256 e segue para a publicação', async () => {
    fillCampos('C4-1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [statusRow({ needs_publish_consent: true, publish_consent_version: 'C4-1.0', rules_version: 'C4-1.0' })],
      },
    });
    mockParams = { next: '/comunidade/publicar', day: '17' };
    await render(<ConsentScreen />);
    await fireEvent.press(await screen.findByTestId('consent-accept'));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/comunidade/publicar', params: { day: '17' } }),
    );
    expect(rpcCalls(rpc, 'accept_community_terms')).toEqual([
      {
        terms_purpose: 'community_publish',
        terms_version: 'C4-1.0',
        terms_sha256: 'ab'.repeat(32),
        client_app_version: expect.any(String),
      },
    ]);
  });

  test('"Guardar só para mim" leva à reflexão privada do dia, sem enviar nada', async () => {
    const { rpc } = useFakeApi({ my_community_status: { data: [statusRow({ needs_publish_consent: true })] } });
    mockParams = { day: '17' };
    await render(<ConsentScreen />);
    await fireEvent.press(await screen.findByTestId('consent-keep'));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/reflexao/[day]', params: { day: '17' } });
    expect(rpcCalls(rpc, 'accept_community_terms')).toEqual([]);
  });

  test('servidor diz que o texto mudou: pede atualização, sem aceitar', async () => {
    fillCampos('C4-1.0');
    useFakeApi({
      my_community_status: { data: [statusRow({ needs_publish_consent: true, publish_consent_version: 'C4-1.0' })] },
      accept_community_terms: { error: { code: 'CM005' } },
    });
    await render(<ConsentScreen />);
    await fireEvent.press(await screen.findByTestId('consent-accept'));
    expect((await screen.findAllByText('O texto foi atualizado. Atualize o app para ler a versão nova e continuar.')).length).toBeGreaterThan(0);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------- regras */

describe('Regras', () => {
  async function scrollTo(y: number) {
    const scroll = screen.getByTestId('rules-scroll');
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } });
    await fireEvent(scroll, 'contentSizeChange', 390, 4000);
    await fireEvent.scroll(scroll, {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 390, height: 4000 },
        layoutMeasurement: { width: 390, height: 800 },
      },
    });
  }

  test('"Li e aceito" só depois de rolar até o fim; depois vai para o consentimento', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [statusRow({ needs_rules: true, needs_publish_consent: true, rules_version: '1.0' })],
      },
    });
    mockParams = { next: '/comunidade/publicar', day: '17' };
    await render(<RulesScreen />);
    const accept = await screen.findByTestId('rules-accept');
    await scrollTo(100);
    expect(accept.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(accept);
    expect(rpcCalls(rpc, 'accept_community_terms')).toEqual([]);

    await scrollTo(3200);
    expect(screen.getByTestId('rules-accept').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('rules-accept'));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/comunidade/consentimento',
        params: { next: '/comunidade/publicar', day: '17' },
      }),
    );
    expect(rpcCalls(rpc, 'accept_community_terms')[0]).toMatchObject({
      terms_purpose: 'community_rules',
      terms_version: '1.0',
    });
  });

  test('versão PENDENTE: o texto aparece, o aceite não', async () => {
    useFakeApi({ my_community_status: { data: [statusRow({ needs_rules: true })] } });
    await render(<RulesScreen />);
    expect(await screen.findByTestId('rules-notice')).toBeTruthy();
    expect(screen.queryByTestId('rules-accept')).toBeNull();
    expect(screen.getByText('Um lugar para a igreja ler junto.')).toBeTruthy();
  });

  test('só leitura (link "Regras da comunidade"): sem aceite, funciona até sem Comunidade ligada', async () => {
    mockParams = { ler: '1' };
    await render(<RulesScreen />);
    expect(screen.getByText('Fotos de crianças e adolescentes')).toBeTruthy();
    expect(screen.queryByTestId('rules-accept')).toBeNull();
    expect(screen.getByTestId('rules-back')).toBeTruthy();
  });
});
