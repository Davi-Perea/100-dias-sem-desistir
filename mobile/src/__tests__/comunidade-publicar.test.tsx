/**
 * Publicar (C3) e regras, com o cliente da Comunidade SIMULADO (mesmo molde de
 * comunidade-cliente.test.ts). Prova o comportamento das TELAS: o aceite
 * registrado no toque em Publicar (a tela de aceite saiu em 2026-09-22), o portão
 * PENDENTE, o aviso de quem vê, a foto preparada sem metadados, os estados depois
 * de enviar e que a reflexão privada nunca pré-preenche a publicação. Não prova o
 * servidor.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { Keyboard } from 'react-native';

import AceiteRouteGone from '@/app/comunidade/consentimento';
import PublishScreen from '@/app/comunidade/publicar';
import RulesScreen from '@/app/comunidade/regras';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import { LIMITS } from '@/community/validation';
import { inspectJpeg } from '@/community/photos';
import { needsAceite, parseDay, publishStep, safeNext, sentCopy } from '@/ui/comunidade/publicar/fluxo';
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

/**
 * A entrada de foto está desligada em produção (COMMUNITY_PHOTOS_ENABLED=false,
 * sem filtro automático de imagem). O CAMINHO da foto continua existindo e
 * precisa continuar testado — quando a conta AWS existir, ele volta a aparecer
 * sem ninguém reescrever nada. Por isso a chave é ligada aqui.
 */
jest.mock('@/config/features', () => ({
  ...jest.requireActual('@/config/features'),
  COMMUNITY_PHOTOS_ENABLED: true,
}));

jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
  Redirect: ({ href }: { href: unknown }) => {
    const { View } = jest.requireActual('react-native');
    return <View testID="redirect" accessibilityLabel={typeof href === 'string' ? href : JSON.stringify(href)} />;
  },
}));

// A entrada no Juntos é automática (sessão do aparelho + join); aqui só se confere que foi pedida.
jest.mock('@/community/deviceSession', () => ({
  startDeviceSession: jest.fn(async () => {}),
  ensureDeviceSession: jest.fn(async () => {}),
  ensureJoined: jest.fn(async () => {}),
}));
const mockDeviceSession = jest.requireMock('@/community/deviceSession') as {
  ensureDeviceSession: jest.Mock;
  ensureJoined: jest.Mock;
};

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
/** Não é JPEG (cabeçalho de PNG): o preparo não tem como salvar. */
const NOT_JPEG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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

    ministry: null,
    ministry_answered: true,
    avatar_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
    avatar_status: 'in_review',
    age_confirmed: true,
    profile_complete: true,
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
  mockDeviceSession.ensureDeviceSession.mockClear();
  mockDeviceSession.ensureJoined.mockClear();
  mockLaunch.mockReset();
  mockResize.mockClear();
  Object.assign(CAMPOS, ORIGINAL_CAMPOS);
});

/* ------------------------------------------------------------ regras puras */

describe('textos', () => {
  test('C5: a frase de quem vê é EXATAMENTE a do fundador, sem "cerca de N", "algumas você não conhece" nem 18+', () => {
    expect(audienceSentence()).toBe(
      'Sua publicação aparece com seu nome para as pessoas que entraram na comunidade da Lagoinha Brasília Capital.',
    );
  });

  test('a mesma frase, palavra por palavra, está no consentimento e nas regras; as frases antigas saíram', () => {
    expect(termsDocumentText(consentDocument())).toContain(audienceSentence());
    expect(termsDocumentText(rulesDocument())).toContain(audienceSentence());
    for (const doc of [rulesDocument(), consentDocument()]) {
      const text = termsDocumentText(doc);
      expect(text).not.toMatch(/Algumas você não conhece/);
      expect(text).not.toMatch(/hoje cerca de/);
      expect(text).not.toMatch(/18 anos/);
    }
  });

  test('nenhuma nota interna do rascunho vai para a tela', () => {
    for (const doc of [rulesDocument(), consentDocument()]) {
      expect(termsDocumentText(doc)).not.toMatch(/\[(DECISÃO PENDENTE|ADVOGADO|CONFERIR|ENGENHARIA)/);
    }
  });

  test('versão PENDENTE, texto sem versão ou campo vazio: ninguém aceita', () => {
    expect(termsAvailability(consentDocument(), 'PENDENTE')).toBe('pending');
    // Desde 23/09 o texto do app TEM versão (v1-2026-09-23). Para provar o caso
    // 'app sem versão', o documento é construído com o campo vazio de propósito.
    expect(termsAvailability({ ...consentDocument(), version: null }, '1.0')).toBe('pending');
    fillCampos('1.0');
    expect(hasOpenFields(termsDocumentText(consentDocument()))).toBe(false);
    expect(termsAvailability(consentDocument(), 'PENDENTE')).toBe('pending');
    expect(termsAvailability(consentDocument(), '1.0')).toBe('ready');
    expect(termsAvailability(consentDocument(), '2.0')).toBe('mismatch');
  });

  test('o texto que vira hash é estável, e as regras curtas não têm campo em aberto', () => {
    const a = termsDocumentText(rulesDocument());
    expect(termsDocumentText(rulesDocument())).toBe(a);
    // As regras encurtadas (2026-09-22) não citam mais razão social, CNPJ, prazos
    // nem endereços: o texto é o mesmo com os campos vazios ou preenchidos.
    expect(hasOpenFields(a)).toBe(false);
    fillCampos('1.0');
    expect(termsDocumentText(rulesDocument())).toBe(a);
    // O portão nunca dependeu dos campos: depende da VERSÃO, e ela continua mandando.
    expect(termsAvailability(rulesDocument(), '1.0')).toBe('ready');
    expect(termsAvailability(rulesDocument({ ...CAMPOS, versaoRegras: null }), '1.0')).toBe('pending');
  });

  test('as regras curtas têm só o que o fundador pediu, e nada do que ele mandou tirar', () => {
    const doc = rulesDocument();
    const titles = doc.sections.map((section) => section.title);
    expect(titles).toEqual([
      'Um lugar para a igreja ler junto.',
      'O que pode',
      'O que não pode',
      'O que é tirado do ar',
      'O que você pode fazer',
      'Em momentos difíceis',
    ]);
    // Sem versão e data no título.
    expect(doc.title).toBe('Regras do Juntos');
    const text = termsDocumentText(doc);
    for (const gone of [
      'Fotos de outras pessoas',
      'Fotos de crianças e adolescentes',
      'Como funciona o cuidado com o que é publicado',
      'Se tirarem o que você publicou',
      'Quem cuida desta comunidade',
      'Pedir revisão',
      'CNPJ',
    ]) {
      expect(text).not.toContain(gone);
    }
    // As FUNÇÕES continuam escritas: denunciar, bloquear e apagar o meu.
    expect(text).toContain('Denunciar');
    expect(text).toContain('bloquear');
    expect(text).toContain('apagar');
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
    profile: {
      displayName: 'Ana',
      ministry: null,
      ministryAnswered: true,
      bio: null,
      avatarPath: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
      avatarStatus: 'in_review' as const,
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
  };

  test('não existe mais passo de aceite: membro ativo vê o formulário (2026-09-22)', () => {
    expect(publishStep({ ...base, isMember: false, memberStatus: null })).toBe('needs_join');
    expect(publishStep({ ...base, isMember: false, memberStatus: 'removed' })).toBe('blocked');
    expect(publishStep({ ...base, memberStatus: 'suspended' })).toBe('blocked');
    // O que antes era o passo 'aceite' hoje é só "falta registrar", e a tela continua no formulário.
    expect(publishStep({ ...base, needsRules: true })).toBe('form');
    expect(publishStep({ ...base, needsPublishConsent: true })).toBe('form');
    expect(publishStep({ ...base, profile: { ...base.profile, ageConfirmed: false } })).toBe('form');
    expect(publishStep({ ...base, displayName: null, profile: { ...base.profile, displayName: null } })).toBe('form');
    const semFotoNemMinisterio = {
      ...base,
      profileComplete: false,
      canPublish: false,
      profile: { ...base.profile, avatarPath: null, avatarStatus: 'none' as const, ministryAnswered: false },
    };
    expect(publishStep(semFotoNemMinisterio)).toBe('form');
    expect(publishStep(base)).toBe('form');
  });

  test('o que falta registrar: regras, consentimento, 16+ ou nome; foto de perfil e ministério não contam', () => {
    expect(needsAceite(base)).toBe(false);
    expect(needsAceite({ ...base, needsRules: true })).toBe(true);
    expect(needsAceite({ ...base, needsPublishConsent: true })).toBe(true);
    expect(needsAceite({ ...base, profile: { ...base.profile, ageConfirmed: false } })).toBe(true);
    expect(needsAceite({ ...base, displayName: null, profile: { ...base.profile, displayName: null } })).toBe(true);
    expect(
      needsAceite({ ...base, profile: { ...base.profile, avatarPath: null, avatarStatus: 'none', ministryAnswered: false } }),
    ).toBe(false);
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

  // 2026-09-22: o iOS grava EXIF de orientação mesmo no arquivo reencodado, e a
  // foto era recusada por isso ("não carrega"). Agora o app LIMPA os metadados
  // antes de conferir; só o que não é JPEG continua sendo recusado.
  test('se o reencode deixar EXIF, o app limpa os metadados antes de enviar', async () => {
    mockEncoded = EXIF_JPEG;
    const prepared = await preparePhoto({ uri: 'file:///galeria.jpg', width: 1000, height: 800 });
    const inspection = inspectJpeg(prepared.bytes);
    expect(inspection.isJpeg).toBe(true);
    expect(inspection.hasExif).toBe(false);
    expect(prepared.bytes.length).toBeLessThan(EXIF_JPEG.length);
  });

  test('o que não é JPEG continua recusado antes de qualquer rede', async () => {
    mockEncoded = NOT_JPEG;
    const attempt = preparePhoto({ uri: 'file:///galeria.png', width: 1000, height: 800 });
    await expect(attempt).rejects.toBeInstanceOf(CommunityError);
    await expect(preparePhoto({ uri: 'file:///g.png', width: 1, height: 1 })).rejects.toMatchObject({
      code: 'photo_not_jpeg',
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

  test('sem conta: cria a conta do aparelho sozinha e espera, sem botão de entrar', async () => {
    useFakeApi();
    mockSignedIn = false;
    await render(<PublishScreen />);
    await waitFor(() => expect(mockDeviceSession.ensureDeviceSession).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Entre na comunidade|Criar meu perfil|código/)).toBeNull();
    expect(screen.queryByTestId('publish-input')).toBeNull();
  });

  test('ainda não é membro: entra sozinha, sem código', async () => {
    useFakeApi({ my_community_status: { data: [statusRow({ is_member: false, member_status: null })] } });
    await render(<PublishScreen />);
    await waitFor(() => expect(mockDeviceSession.ensureJoined).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/código|crie o seu perfil/i)).toBeNull();
  });

  test('sem foto de perfil e sem ministério: o formulário abre do mesmo jeito', async () => {
    useFakeApi({
      my_community_status: {
        data: [
          statusRow({
            profile_complete: false,
            can_publish: false,
            avatar_path: null,
            avatar_status: 'none',
            ministry_answered: false,
          }),
        ],
      },
    });
    await render(<PublishScreen />);
    expect(await screen.findByTestId('publish-input')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('texto PENDENTE e primeira vez: a tela diz que a igreja não liberou, e Publicar não serve', async () => {
    const { rpc } = useFakeApi({
      my_community_status: { data: [statusRow({ needs_rules: true, needs_publish_consent: true })] },
    });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Hoje eu li Gênesis.');
    expect(screen.getByTestId('publish-pending')).toBeTruthy();
    expect(screen.getAllByText(PENDING_NOTICE).length).toBeGreaterThan(0);
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(rpc.mock.calls.filter(([name]) => name !== 'my_community_status')).toEqual([]);
  });

  test('primeira vez com texto aprovado: o toque em Publicar registra o aceite e publica, sem tela no meio', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [
          statusRow({
            needs_rules: true,
            needs_publish_consent: true,
            publish_consent_version: '1.0',
            rules_version: '1.0',
            age_confirmed: false,
          }),
        ],
      },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Hoje eu li Gênesis.');
    // A linha embaixo do botão, palavra por palavra, com o link para as regras.
    expect(screen.getByTestId('aceite-line').props.accessibilityLabel).toContain(
      'Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do Juntos.',
    );
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Publicado')).toBeTruthy();
    // Nenhuma navegação para uma tela de aceite: nem push, nem replace.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // 16+ e os DOIS aceites são registrados ANTES do post (Google Play; Apple 1.2).
    expect(rpcCalls(rpc, 'set_community_profile')[0]).toMatchObject({ confirms_16: true });
    expect(rpcCalls(rpc, 'accept_community_terms').map((args) => args?.terms_purpose)).toEqual([
      'community_rules',
      'community_publish',
    ]);
    const order = rpc.mock.calls.map(([name]) => name).filter((name) => name !== 'my_community_status');
    expect(order).toEqual([
      'set_community_profile',
      'accept_community_terms',
      'accept_community_terms',
      'create_community_post',
    ]);
    expect(rpcCalls(rpc, 'accept_community_terms')[0]).toMatchObject({
      terms_version: '1.0',
      terms_sha256: 'ab'.repeat(32),
    });
  });

  test('sem nome nenhum: não publica, diz o que falta e oferece o perfil (o servidor recusaria, CM007)', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [
          statusRow({
            needs_rules: true,
            needs_publish_consent: true,
            publish_consent_version: '1.0',
            rules_version: '1.0',
            display_name: null,
            profile_complete: false,
          }),
        ],
      },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Deus foi fiel.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByTestId('publish-error')).toBeTruthy();
    expect(screen.getByText('Para publicar, escreva o seu nome. É como a igreja vai te ver.')).toBeTruthy();
    expect(screen.getByTestId('publish-write-name')).toBeTruthy();
    // Nada foi registrado, e nenhum nome inventado ("Você") foi enviado.
    expect(rpcCalls(rpc, 'set_community_profile')).toEqual([]);
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([]);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('Você');
  });

  test('formulário: aviso de quem vê acima do campo, campo VAZIO e "Publicar" desligado até haver texto', async () => {
    useFakeApi({ my_community_status: { data: [statusRow()] } });
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
      {
        post_body: 'Deus foi fiel.',
        post_photo_paths: null,
        post_day: 17,
        post_activity: 'leitura',
        post_verse_book: null,
        post_verse_chapter: null,
        post_verse_start: null,
        post_verse_end: null,
        post_audience: 'igreja',
        // Quem já aceitou publica sem aceite junto (o `accept_terms` da chamada é null).
        accept_terms: null,
      },
    ]);
  });

  test('tirar o chip da leitura publica sem dia', async () => {
    const { rpc } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Oração');
    expect(screen.getByTestId('chip-leitura')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-leitura-remove'));
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
    expect(screen.getByTestId('publish-counter-sentence').props.children).toBe(
      'Passou do limite de 2.000 caracteres. Apague um pouco para poder enviar.',
    );
    expect(screen.getByTestId('publish-counter-sentence').props.accessibilityLiveRegion).toBe('polite');
  });

  test('foto: Galeria abre a galeria DIRETO (sem aviso); sobe só ao publicar; "Em análise" do F5', async () => {
    const { rpc, upload } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { data: [{ post_id: POST, status: 'in_review' }] },
    });
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///galeria.jpg', width: 4000, height: 3000 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    // 2026-09-22: o aviso de rosto/criança e o da câmera saíram; só a permissão do sistema aparece.
    expect(screen.queryByTestId('photo-warning')).toBeNull();
    expect(screen.queryByTestId('photo-pick')).toBeNull();
    expect(screen.queryByText(/Não exponha outra pessoa/)).toBeNull();
    await screen.findByTestId('photo-thumb-0');
    // F2: até 4 fotos por post, na ordem da escolha.
    // `quality` PRECISA ser < 1: em 1 o expo-image-picker devolve o arquivo original
    // sem decodificar (HEIC com nome .jpeg), e o manipulador não abre — a foto "não carrega".
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false, mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4 }),
    );
    expect(mockLaunch.mock.calls[0][0].quality).toBeLessThan(1);
    expect(upload).not.toHaveBeenCalled(); // nada sobe na escolha

    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(false); // só foto basta
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Em análise')).toBeTruthy();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([
      expect.objectContaining({
        post_body: null,
        post_photo_paths: ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg'],
        post_day: null,
        post_activity: 'livre',
      }),
    ]);
  });

  test('foto que o preparo não consegue abrir: recusada na escolha, com o motivo', async () => {
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    mockEncoded = NOT_JPEG;
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///g.jpg', width: 800, height: 600 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    expect(await screen.findByTestId('photo-error')).toBeTruthy();
    expect(screen.getByText('Não foi possível preparar esta foto. Tente outra.')).toBeTruthy();
    expect(screen.queryByTestId('photo-thumb-0')).toBeNull();
  });

  test('se o post falha depois do upload, a foto enviada é descartada', async () => {
    const { remove } = useFakeApi({
      my_community_status: { data: [statusRow()] },
      create_community_post: { error: { code: 'CM003' } },
    });
    mockLaunch.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///g.jpg', width: 800, height: 600 }] });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    await screen.findByTestId('photo-thumb-0');
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Você chegou ao limite por agora. Tente de novo mais tarde.')).toBeTruthy();
    expect(remove).toHaveBeenCalledWith(['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg']);
  });

  test('teclado aberto: o aviso de quem vê continua ACIMA do campo e Publicar fica no rodapé', async () => {
    const handlers: Record<string, ((event: unknown) => void)[]> = {};
    const spy = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: unknown) => void) => {
      (handlers[event] ??= []).push(handler);
      return { remove: () => {} };
    }) as never);
    useFakeApi({ my_community_status: { data: [statusRow()] } });
    await render(<PublishScreen />);
    await screen.findByTestId('publish-input');
    const open = Object.keys(handlers).find((name) => name.endsWith('Show'));
    const frame = { endCoordinates: { screenX: 0, screenY: 500, width: 390, height: 344 }, duration: 0 };
    if (open) await act(async () => handlers[open].forEach((handler) => handler(frame)));
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('audience-notice')).toBeGreaterThan(-1);
    expect(json.indexOf('audience-notice')).toBeLessThan(json.indexOf('publish-input'));
    expect(json.indexOf('publish-input')).toBeLessThan(json.indexOf('publish-footer'));
    expect(screen.getByTestId('publish-send')).toBeTruthy();
    spy.mockRestore();
  });
});

/* ------------------------------------------------ aceite: erro do servidor */

describe('aceite no toque', () => {
  test('servidor diz que o texto mudou: pede atualização, e nada é publicado', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [
          statusRow({
            needs_rules: true,
            needs_publish_consent: true,
            publish_consent_version: '1.0',
            rules_version: '1.0',
          }),
        ],
      },
      accept_community_terms: { error: { code: 'CM005' } },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Deus foi fiel.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await waitFor(() => expect(screen.getByTestId('publish-pending')).toBeTruthy());
    expect(
      screen.getAllByText('O texto foi atualizado. Atualize o app para ler a versão nova e continuar.').length,
    ).toBeGreaterThan(0);
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([]);
  });

  test('o servidor recusa o registro: a recusa aparece e o post não sai', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      my_community_status: {
        data: [
          statusRow({
            needs_rules: true,
            needs_publish_consent: true,
            publish_consent_version: '1.0',
            rules_version: '1.0',
          }),
        ],
      },
      accept_community_terms: { error: { code: 'CM001' } },
      create_community_post: { data: [{ post_id: POST, status: 'published' }] },
    });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Deus foi fiel.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByTestId('publish-error')).toBeTruthy();
    expect(rpcCalls(rpc, 'create_community_post')).toEqual([]);
  });
});

/* -------------------------------------------------------------- regras */

describe('Regras', () => {
  test('a rota antiga do aceite não é mais uma tela: leva às regras', async () => {
    mockParams = { next: '/comunidade/publicar', day: '17' };
    await render(<AceiteRouteGone />);
    expect(screen.getByTestId('redirect').props.accessibilityLabel).toBe(
      JSON.stringify({
        pathname: '/comunidade/regras',
        params: { next: '/comunidade/publicar', day: '17', ler: '1' },
      }),
    );
  });

  test('só leitura: regras E consentimento destacado, sem aceite, até sem Comunidade ligada', async () => {
    await render(<RulesScreen />);
    expect(screen.getByTestId('rules-title').props.children).toBe('Regras do Juntos');
    expect(screen.getByText('O que não pode')).toBeTruthy();
    expect(screen.queryByText('Fotos de crianças e adolescentes')).toBeNull();
    // Os DOIS textos que o aceite registra podem ser lidos aqui (LGPD art. 11, I).
    expect(screen.getByTestId('rules-consent-block')).toBeTruthy();
    expect(screen.getByTestId('rules-consent-title').props.children).toBe('Antes de participar');
    expect(screen.getByText(audienceSentence())).toBeTruthy();
    // Nada de aceitar por aqui.
    expect(screen.queryByTestId('rules-accept')).toBeNull();
    expect(screen.queryByTestId('consent-accept')).toBeNull();
    expect(screen.getByTestId('rules-back')).toBeTruthy();
  });
});
