/**
 * F2 · "Criar post" no formato de diário compartilhado (feedback do fundador de
 * 2026-09-22), com o cliente da Comunidade SIMULADO. Prova o comportamento da
 * TELA e do rascunho: anexos (leitura do dia, versículo, oração, jejum, galeria
 * até 4, câmera), chips removíveis, público, o que vai (e o que NUNCA vai) para a
 * rede, e o "Publicado" / "Em análise" do F5. Não prova o servidor.
 *
 * O caminho novo do versículo (a Bíblia inteira: livro → capítulo → versículo) e a
 * linha do aceite embaixo do botão estão em publicar-review.test.tsx.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import PublishScreen from '@/app/comunidade/publicar';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { _resetMarksCacheForTests, MARKS_KEY } from '@/marks/marksStore';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { sentCopy } from '@/ui/comunidade/publicar/fluxo';
import { cameraConfigured } from '@/ui/comunidade/publicar/foto';
import {
  buildNewPost,
  chipLabel,
  hasContent,
  isDirty,
  postKind,
  removeLabel,
  upsertAttachment,
  verseCanonical,
  verseLabel,
  type Attachment,
} from '@/ui/comunidade/publicar/rascunho';
import { AttachBar, type AttachButton } from '@/ui/comunidade/publicar/pecas';
import { audienceSentence } from '@/ui/comunidade/publicar/textos';

import { AX5, resetViewport, setViewport } from './support/viewport';

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

/** Dia da campanha controlado (o relógio real mudaria o teste de um dia para o outro). */
let mockJourney: { phase: 'before_start' | 'running' | 'finished'; officialDay: number } = {
  phase: 'running',
  officialDay: 5,
};
jest.mock('@/journey/useJourney', () => ({ useJourney: () => mockJourney }));

/** A build declara (ou não) o texto de finalidade da câmera. */
const mockExpoConfig: { version: string; plugins: unknown[] } = { version: '1.0.0', plugins: [] };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

const mockLaunch = jest.fn();
const mockCamera = jest.fn();
const mockCameraPermission = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamera(...args),
  requestCameraPermissionsAsync: () => mockCameraPermission(),
}));

/** JPEG mínimo sem metadados. */
const MOCK_CLEAN_JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]);
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: jest.fn(() => {
      const ref = {
        width: 1200,
        height: 900,
        release: jest.fn(),
        saveAsync: jest.fn(async () => ({
          uri: 'file:///cache/preparada.jpg',
          width: 1200,
          height: 900,
          base64: Buffer.from(MOCK_CLEAN_JPEG).toString('base64'),
        })),
      };
      const context = { resize: () => context, renderAsync: jest.fn(async () => ref), release: jest.fn() };
      return context;
    }),
  },
}));

/* ------------------------------------------------------ cliente simulado */

const POST = '20000000-0000-4000-8000-000000000001';

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
    ministry: 'Louvor',
    ministry_answered: true,
    avatar_path: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg',
    avatar_status: 'approved',
    age_confirmed: true,
    profile_complete: true,
    ...overrides,
  };
}

/**
 * Cliente real (createCommunityApi) com as RPCs simuladas; `createPost` vira
 * espião para ver o NewPost inteiro que a tela monta.
 */
function useFakeApi(options: { status?: Record<string, unknown>; result?: string } = {}) {
  let uploads = 0;
  const rpc = jest.fn(async (fn: string) => {
    if (fn === 'my_community_status') return { data: [statusRow(options.status)], error: null };
    return { data: null, error: null };
  });
  const upload = jest.fn(async () => ({ data: { path: 'ok' }, error: null }));
  const remove = jest.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = jest.fn(async () => ({ data: [], error: null }));
  const client: CommunityClient = { rpc, storage: { from: () => ({ upload, createSignedUrls, remove }) } };
  const base = createCommunityApi(client, {
    randomUUID: () => `AAAAAAAA-BBBB-4CCC-8DDD-${String(++uploads).padStart(12, '0')}`,
  });
  const createPost = jest.fn(async (_input: unknown) => ({ id: POST, status: (options.result ?? 'published') as 'published' }));
  mockApi = { ...base, createPost } as CommunityApi;
  return { createPost, upload, remove };
}

const fakeBible: BibleTextProvider = {
  getMetadata: () => ({
    id: 'teste',
    name: 'Bíblia Livre',
    abbreviation: 'BLIVRE',
    language: 'pt-BR',
    copyrightNotice: 'CC BY',
    attributionRequired: true,
    cachePolicy: 'bundled',
    offlineAvailable: true,
    isDevPlaceholder: false,
  }),
  getPassage: async (reference) => ({
    reference: `${reference.book} ${reference.chapterStart}`,
    book: reference.book,
    bookName: reference.book,
    chapter: reference.chapterStart,
    heading: null,
    verses: [{ verse: reference.verseStart ?? 1, text: 'Texto do versículo de teste.' }],
  }),
};

async function seedMarks() {
  await AsyncStorage.setItem(
    MARKS_KEY,
    JSON.stringify({
      byVerse: {
        'JHN.3.16': { book: 'JHN', chapter: 3, verse: 16, color: 'amarelo', note: 'MINHA ANOTAÇÃO SECRETA', updatedAt: '' },
        'PSA.23.1': { book: 'PSA', chapter: 23, verse: 1, color: 'verde', note: '', updatedAt: '' },
      },
    }),
  );
  _resetMarksCacheForTests();
}

const picked = (n: number) => ({
  canceled: false,
  assets: Array.from({ length: n }, (_, i) => ({ uri: `file:///galeria/${i}.jpg`, width: 800, height: 600 })),
});

let screenReader = false;

beforeEach(async () => {
  mockParams = {};
  mockApi = null;
  mockJourney = { phase: 'running', officialDay: 5 };
  mockExpoConfig.plugins = [];
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockLaunch.mockReset();
  mockCamera.mockReset();
  mockCameraPermission.mockReset();
  screenReader = false;
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockImplementation(async () => screenReader);
  await AsyncStorage.clear();
  _resetMarksCacheForTests();
  setBibleProvider(fakeBible);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* --------------------------------------------------------------- rascunho */

describe('rascunho (puro)', () => {
  const verse: Attachment = {
    kind: 'versiculo',
    ref: { book: 'JHN', chapter: 3, verse: 16 },
    label: 'João 3:16',
    text: 'Porque Deus amou…',
    translation: 'Bíblia Livre',
  };

  test('NewPost: fotos (até 4), dia, tipo, versículo SÓ pela referência e público', () => {
    const input = buildNewPost({
      body: null,
      photoPaths: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
      attachments: [verse, { kind: 'leitura', day: 3, reference: 'Gênesis 7–9' }],
      audience: 'ministerio',
    });
    expect(input).toEqual({
      body: null,
      photoPaths: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'],
      day: 3,
      kind: 'leitura',
      verse: { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: null },
      audience: 'ministerio',
    });
    // O texto bíblico da prévia NUNCA vai à rede.
    expect(JSON.stringify(input)).not.toMatch(/Porque Deus amou|Bíblia Livre/);
  });

  test('tipo do post: Oração ou Jejum; senão Leitura; senão Versículo; sem nada, livre', () => {
    expect(postKind([])).toBeNull();
    expect(postKind([verse])).toBe('versiculo');
    expect(postKind([verse, { kind: 'leitura', day: 1, reference: null }])).toBe('leitura');
    expect(postKind([{ kind: 'leitura', day: 1, reference: null }, { kind: 'jejum' }])).toBe('jejum');
  });

  test('Oração e Jejum são um tipo só: anexar um tira o outro; leitura e versículo convivem', () => {
    const list = upsertAttachment([{ kind: 'jejum' }, { kind: 'leitura', day: 2, reference: null }], { kind: 'oracao' });
    expect(list.map((a) => a.kind)).toEqual(['leitura', 'oracao']);
    expect(upsertAttachment(list, verse).map((a) => a.kind)).toEqual(['leitura', 'versiculo', 'oracao']);
  });

  test('conteúdo: texto, foto ou qualquer anexo; nada, não', () => {
    expect(hasContent({ body: null, photoCount: 0, attachments: [{ kind: 'oracao' }] })).toBe(true);
    expect(hasContent({ body: null, photoCount: 1, attachments: [] })).toBe(true);
    expect(hasContent({ body: null, photoCount: 0, attachments: [] })).toBe(false);
  });

  test('o dia que já veio anexado não conta como rascunho a descartar', () => {
    const reading: Attachment = { kind: 'leitura', day: 17, reference: null };
    expect(isDirty({ body: null, photoCount: 0, attachments: [reading] }, 17)).toBe(false);
    expect(isDirty({ body: null, photoCount: 0, attachments: [reading] }, null)).toBe(true);
  });

  test('rótulos: chip, "x" falado e versículo', () => {
    expect(chipLabel({ kind: 'leitura', day: 17, reference: 'Gênesis 39–45' })).toBe('Dia 17 · Gênesis 39–45');
    expect(chipLabel({ kind: 'leitura', day: 17, reference: null })).toBe('Dia 17');
    expect(removeLabel({ kind: 'oracao' })).toBe('Tirar oração: Oração');
    expect(verseLabel({ book: 'PSA', chapter: 23, verse: 1 })).toBe('Salmos 23:1');
    expect(verseCanonical({ book: 'PSA', chapter: 23, verse: 1 })).toBe('PSA 23:1');
  });

  test('câmera só com o texto de finalidade declarado na build', () => {
    expect(cameraConfigured({ plugins: [['expo-image-picker', { cameraPermission: false }]] })).toBe(false);
    expect(cameraConfigured({ plugins: [['expo-image-picker', { cameraPermission: 'Para tirar a foto.' }]] })).toBe(true);
    expect(cameraConfigured(null)).toBe(false);
  });

  test('F5: "Em análise" com foto fala de conferência (sem inventar filtro) e diz que só o autor vê', () => {
    // REVISÃO FINAL 2026-09-22: o texto não pode AFIRMAR que o filtro automático
    // segurou AQUELA foto. O próprio F5 mantém o caminho seguro ("sem filtro
    // configurado, cai para aprovação humana") e é nele que o servidor está hoje:
    // sem MODERATION_PROVIDER, submit-post devolve in_review para TODA foto.
    // Afirmar o filtro contaria um exame que não houve.
    const message = sentCopy({ status: 'in_review', hadPhoto: true }).message;
    expect(message).toMatch(/passando por uma conferência/);
    expect(message).toContain('só você a vê');
    expect(message).not.toMatch(/filtro automático segurou/);
  });
});

/* ------------------------------------------------------------------ tela */

describe('F2 · Criar post', () => {
  test('cabeçalho: Cancelar · "Criar post" · avatar + nome e ministério; a frase do fundador ACIMA do campo', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    const input = await screen.findByTestId('publish-input');
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Criar post')).toBeTruthy();
    expect(screen.getByTestId('publish-author-line').props.children).toBe('Ana · Ministério Louvor');
    expect(input.props.placeholder).toBe('O que Deus falou com você hoje?');
    expect(input.props.value).toBe('');
    expect(screen.getByText(audienceSentence())).toBeTruthy();
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('audience-notice')).toBeLessThan(json.indexOf('publish-input'));
  });

  test('linha de anexos: seis botões, cada um com rótulo falado e alvo de pelo menos 48', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('attach-bar');
    const expected: Record<string, string> = {
      leitura: 'Leitura do dia 5',
      versiculo: 'Versículo da Bíblia',
      oracao: 'Oração',
      jejum: 'Jejum',
      galeria: 'Galeria, até 4 fotos',
      camera: 'Câmera',
    };
    for (const [id, label] of Object.entries(expected)) {
      const button = screen.getByTestId(`attach-${id}`);
      expect(button.props.accessibilityLabel).toBe(label);
      const style = StyleSheet.flatten(button.props.style);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.minWidth).toBeGreaterThanOrEqual(48);
    }
  });

  test('vindo de "Dia N concluído": a leitura do dia já vem anexada, com "Dia N · referência", e sai no "x"', async () => {
    useFakeApi();
    mockParams = { day: '17' };
    await render(<PublishScreen />);
    const label = await screen.findByTestId('chip-leitura-label');
    expect(label.props.children).toMatch(/^Dia 17 · \S/);
    expect(screen.getByTestId('chip-leitura-remove').props.accessibilityLabel).toMatch(/^Tirar leitura do dia: Dia 17/);
    await fireEvent.press(screen.getByTestId('chip-leitura-remove'));
    expect(screen.queryByTestId('chip-leitura')).toBeNull();
  });

  test('Leitura do dia anexa o dia de HOJE na campanha; antes de começar, fica desligada', async () => {
    const { createPost } = useFakeApi();
    let view = await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-leitura'));
    expect(screen.getByTestId('chip-leitura-label').props.children).toMatch(/^Dia 5/);
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(createPost.mock.calls[0][0]).toMatchObject({ day: 5, kind: 'leitura' });
    await view.unmount();

    mockJourney = { phase: 'before_start', officialDay: 1 };
    view = await render(<PublishScreen />);
    const button = await screen.findByTestId('attach-leitura');
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(button.props.accessibilityHint).toBe('A campanha ainda não começou.');
  });

  test('Oração e Jejum viram chips (um tira o outro); post só com anexo publica; vai só o tipo', async () => {
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('attach-bar');
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('attach-jejum'));
    await fireEvent.press(screen.getByTestId('attach-oracao'));
    expect(screen.getByTestId('attach-oracao').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('chip-oracao')).toBeTruthy();
    expect(screen.queryByTestId('chip-jejum')).toBeNull();
    // Tocar de novo tira.
    await fireEvent.press(screen.getByTestId('attach-oracao'));
    expect(screen.queryByTestId('chip-oracao')).toBeNull();
    await fireEvent.press(screen.getByTestId('attach-oracao'));
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(createPost.mock.calls[0][0]).toEqual({
      body: null,
      photoPaths: [],
      day: null,
      kind: 'oracao',
      verse: null,
      audience: 'igreja',
    });
  });

  test('Versículo: o atalho dos MARCADOS; vai só a referência; a anotação nunca sai do aparelho', async () => {
    await seedMarks();
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));
    expect(await screen.findByTestId('verse-option-JHN.3.16')).toBeTruthy();
    expect(screen.getByTestId('verse-option-PSA.23.1')).toBeTruthy();
    expect(screen.queryByText(/MINHA ANOTAÇÃO SECRETA/)).toBeNull();
    expect(screen.getByTestId('verse-attach').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('verse-option-JHN.3.16'));
    await fireEvent.press(screen.getByTestId('verse-attach'));
    await waitFor(() => expect(screen.getByTestId('chip-versiculo-label').props.children).toBe('João 3:16'));
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    const sentInput = createPost.mock.calls[0][0];
    expect(sentInput).toMatchObject({
      verse: { book: 'JHN', chapter: 3, verseStart: 16, verseEnd: null },
      kind: 'versiculo',
    });
    expect(JSON.stringify(sentInput)).not.toMatch(/ANOTAÇÃO|amarelo|Texto do versículo/);
  });

  test('Versículo: o texto da Bíblia Livre aparece como prévia, com a tradução, e não vai à rede', async () => {
    await seedMarks();
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));
    await fireEvent.press(await screen.findByTestId('verse-option-PSA.23.1'));
    await fireEvent.press(screen.getByTestId('verse-attach'));
    expect(await screen.findByTestId('verse-preview')).toBeTruthy();
    expect(screen.getByText('Texto do versículo de teste.')).toBeTruthy();
    expect(screen.getByText('Salmos 23:1 · Bíblia Livre')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('publish-input'), 'O Senhor é o meu pastor.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    const sentInput = createPost.mock.calls[0][0];
    expect(sentInput).toMatchObject({
      body: 'O Senhor é o meu pastor.',
      verse: { book: 'PSA', chapter: 23, verseStart: 1, verseEnd: null },
    });
    expect(JSON.stringify(sentInput)).not.toMatch(/Texto do versículo|Bíblia Livre/);
  });

  test('Versículo sem nenhuma marca: a folha abre direto na Bíblia (sem beco sem saída)', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));
    expect(await screen.findByTestId('verse-books')).toBeTruthy();
    expect(screen.queryByTestId('verse-marked')).toBeNull();
    expect(screen.getByText('Antigo Testamento')).toBeTruthy();
    expect(screen.getByText('Novo Testamento')).toBeTruthy();
    expect(screen.getByTestId('verse-book-GEN')).toBeTruthy();
    expect(screen.getByTestId('verse-book-REV')).toBeTruthy();
  });

  test('Galeria: abre DIRETO (sem aviso); até 4 fotos; sobem só ao publicar; F5 "Em análise"', async () => {
    const { createPost, upload } = useFakeApi({ result: 'in_review' });
    mockLaunch.mockResolvedValue(picked(5));
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    // 2026-09-22: nenhum aviso antes da galeria; a única pergunta é a do sistema.
    expect(screen.queryByTestId('photo-warning')).toBeNull();
    expect(screen.queryByTestId('photo-pick')).toBeNull();
    expect(screen.queryByText(/Não exponha outra pessoa/)).toBeNull();
    await screen.findByTestId('photo-thumb-3');
    expect(screen.queryByTestId('photo-thumb-4')).toBeNull();
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 4, exif: false }),
    );
    expect(upload).not.toHaveBeenCalled();

    // Cheio: não abre a galeria de novo, e diz por quê.
    await fireEvent.press(screen.getByTestId('attach-galeria'));
    expect(screen.getByTestId('photo-error').props.children).toBe(
      'Cabem até 4 fotos por publicação. Tire uma para escolher outra.',
    );
    expect(mockLaunch).toHaveBeenCalledTimes(1);

    // Tirar uma.
    await fireEvent.press(screen.getByTestId('photo-remove-0'));
    expect(screen.queryByTestId('photo-thumb-3')).toBeNull();

    // O resumo discreto do que vai junto conta as fotos (item 4 do fundador).
    expect(screen.getByTestId('attach-summary').props.children).toBe('Vai junto: 3 fotos');

    await fireEvent.press(screen.getByTestId('publish-send'));
    expect(await screen.findByText('Em análise')).toBeTruthy();
    expect(upload).toHaveBeenCalledTimes(3);
    const sentInput = createPost.mock.calls[0][0] as { photoPaths: string[]; photoPath?: string };
    expect(sentInput.photoPaths).toHaveLength(3);
    expect(new Set(sentInput.photoPaths).size).toBe(3);
    expect(sentInput.photoPath).toBeUndefined();
    expect(screen.getByTestId('publish-my-posts')).toBeTruthy();
  });

  test('falha depois do upload: todas as fotos enviadas são descartadas', async () => {
    const { createPost, remove } = useFakeApi();
    createPost.mockRejectedValueOnce(new Error('rede'));
    mockLaunch.mockResolvedValue(picked(2));
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    await screen.findByTestId('photo-thumb-1');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByTestId('publish-error');
    expect(remove).toHaveBeenCalledTimes(2);
  });

  test('Câmera: sem o texto de finalidade na build, não pede permissão (o iOS encerraria o app)', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-camera'));
    expect(screen.getByTestId('photo-error').props.children).toMatch(/câmera ainda não está liberada/);
    expect(mockCameraPermission).not.toHaveBeenCalled();
  });

  test('Câmera: abre direto, só com a permissão do sistema; recusada diz o caminho; aceita vira foto', async () => {
    mockExpoConfig.plugins = [['expo-image-picker', { cameraPermission: 'Para tirar a foto do post.' }]];
    useFakeApi();
    mockCameraPermission.mockResolvedValueOnce({ granted: false });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-camera'));
    // Sem aviso do app no meio: a permissão do sistema é pedida no próprio toque.
    expect(screen.queryByTestId('photo-warning')).toBeNull();
    expect(await screen.findByTestId('photo-error')).toBeTruthy();
    expect(mockCameraPermission).toHaveBeenCalledTimes(1);
    expect(mockCamera).not.toHaveBeenCalled();

    mockCameraPermission.mockResolvedValueOnce({ granted: true });
    mockCamera.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///camera.jpg', width: 3000, height: 4000 }] });
    await fireEvent.press(screen.getByTestId('attach-camera'));
    expect(await screen.findByTestId('photo-thumb-0')).toBeTruthy();
    expect(mockCamera).toHaveBeenCalledWith(expect.objectContaining({ exif: false }));
  });

  test('sem escolha de público: não há botão, e todo post vai para a igreja inteira', async () => {
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('publish-input');
    // 2026-09-22: a escolha de público saiu do rodapé.
    expect(screen.queryByTestId('audience-button')).toBeNull();
    expect(screen.queryByTestId('audience-sheet')).toBeNull();
    // A frase de quem vê continua a do fundador, palavra por palavra.
    expect(screen.getByText(audienceSentence())).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('publish-input'), 'Ensaio abençoado.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(createPost.mock.calls[0][0]).toMatchObject({ audience: 'igreja' });
  });

  test('mesmo com ministério no perfil, o post vai para a igreja inteira', async () => {
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Ensaio abençoado.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(createPost.mock.calls[0][0]).toMatchObject({ audience: 'igreja' });
    // O ministério continua aparecendo junto do nome de quem publica.
    expect(screen.queryByTestId('audience-button')).toBeNull();
  });

  /**
   * "Ver no feed" CHEGA no feed (2026-09-22): voltar não servia, porque quem
   * publica depois de concluir o dia veio por `/comunidade/depois/<dia>`, que se
   * substituiu no caminho — embaixo da tela de publicar está a Jornada, e voltar
   * levaria para lá com o botão prometendo o feed. A aba Juntos entra no lugar
   * desta tela.
   */
  test('"Publicado" vai sozinho para a aba Juntos; com leitor de tela, espera o toque', async () => {
    useFakeApi();
    let view = await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Deus foi fiel.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/juntos'), { timeout: 3000 });
    expect(mockRouter.back).not.toHaveBeenCalled();
    await view.unmount();

    mockRouter.back.mockClear();
    mockRouter.replace.mockClear();
    screenReader = true;
    useFakeApi();
    view = await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Deus foi fiel.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('publish-done'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/juntos');
  }, 10000);
});

describe('AttachBar · Dynamic Type', () => {
  const buttons: AttachButton[] = [
    { id: 'leitura', label: 'Leitura', accessibilityLabel: 'Leitura do dia', onPress: () => {} },
    { id: 'versiculo', label: 'Versículo', accessibilityLabel: 'Versículo que você marcou', onPress: () => {} },
    { id: 'oracao', label: 'Oração', accessibilityLabel: 'Oração', onPress: () => {} },
  ];
  const styleOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

  // Desmonta ANTES de voltar a escala: trocar Dimensions com a árvore montada dispara update fora de act.
  afterEach(async () => {
    await cleanup();
    resetViewport();
  });

  test('fonte padrão: todos numa linha, ícone em cima do rótulo', async () => {
    setViewport(1);
    await render(<AttachBar buttons={buttons} />);
    expect(styleOf('attach-versiculo').width).toBe(`${100 / 3}%`);
    expect(styleOf('attach-versiculo').flexDirection).toBe('column');
  });

  test('entre 1,3 e 2: três por linha', async () => {
    setViewport(1.5);
    await render(<AttachBar buttons={buttons} />);
    expect(styleOf('attach-versiculo').width).toBe('33.33%');
  });

  test('fonte máxima (3,571×): cada botão numa linha inteira, rótulo ao lado do ícone', async () => {
    setViewport(AX5);
    await render(<AttachBar buttons={buttons} />);
    const style = styleOf('attach-versiculo');
    expect(style.width).toBe('100%');
    expect(style.flexDirection).toBe('row');
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
  });
});
