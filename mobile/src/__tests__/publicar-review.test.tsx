/**
 * REVIEW DO FUNDADOR, 2026-09-22 — agente "Publicar". Prova, com o cliente da
 * Comunidade simulado, as quatro coisas que ele pediu:
 *
 *   1. A TELA de aceite antes de participar SAIU. No lugar, a linha embaixo do
 *      botão ("Ao publicar, você confirma que tem 16 anos ou mais e aceita as
 *      regras do Juntos.", com link para as regras), e o toque em Publicar
 *      registra o aceite (as mesmas RPCs) e publica em seguida, sem tela no meio.
 *   2. O anexo "Versículo" passa a alcançar QUALQUER versículo da Bíblia —
 *      livro → capítulo → versículo, pelo caminho que a aba Bíblia já usa —, com
 *      os marcados em destaque no topo, como atalho. O que sai é só a referência.
 *   3. Foto sem aviso antes: Galeria abre a galeria, Câmera abre a câmera.
 *   4. Um resumo discreto do que vai junto, sem passo obrigatório.
 *
 * E o que vale para toda tela: alvo de 48 com piso `minHeight` + `paddingVertical`,
 * sem `fontWeight`, contraste de 4,5:1 nos dois temas, fonte até 3,571× e
 * "Reduzir movimento" desligando animação.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import PublishScreen from '@/app/comunidade/publicar';
import { createCommunityApi, type CommunityApi, type CommunityClient } from '@/community/api';
import { _resetMarksCacheForTests, MARKS_KEY } from '@/marks/marksStore';
import { setBibleProvider, type BibleTextProvider } from '@/reader/provider';
import { attachSummary } from '@/ui/comunidade/publicar/rascunho';
import {
  ACEITE_LINE,
  ACEITE_LINE_LINK,
  ACEITE_LINE_SPOKEN,
  CAMPOS,
  type CampoId,
} from '@/ui/comunidade/publicar/textos';
import { palettes } from '@/ui/theme';

import { AX5, resetViewport, setViewport } from './support/viewport';

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

jest.mock('@/journey/useJourney', () => ({ useJourney: () => ({ phase: 'running', officialDay: 5 }) }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', plugins: [] } },
}));

const mockLaunch = jest.fn();
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

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
    ministry: null,
    ministry_answered: true,
    avatar_path: null,
    avatar_status: 'none',
    age_confirmed: true,
    profile_complete: true,
    ...overrides,
  };
}

function useFakeApi(options: { status?: Record<string, unknown> } = {}) {
  const rpc = jest.fn(async (fn: string) => {
    if (fn === 'my_community_status') return { data: [statusRow(options.status)], error: null };
    if (fn === 'create_community_post') return { data: [{ post_id: POST, status: 'published' }], error: null };
    return { data: null, error: null };
  });
  const upload = jest.fn(async () => ({ data: { path: 'ok' }, error: null }));
  const remove = jest.fn(async () => ({ data: [], error: null }));
  const createSignedUrls = jest.fn(async () => ({ data: [], error: null }));
  const client: CommunityClient = { rpc, storage: { from: () => ({ upload, createSignedUrls, remove }) } };
  const base = createCommunityApi(client, { randomUUID: () => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE' });
  const createPost = jest.fn(async (_input: unknown) => ({ id: POST, status: 'published' as const }));
  mockApi = { ...base, createPost } as CommunityApi;
  return { rpc, createPost };
}

/** Texto da Bíblia como o provedor empacotado devolve: capítulo inteiro ou faixa. */
const CHAPTER: Record<number, string> = {
  1: 'No princípio, Deus criou os céus e a terra.',
  2: 'A terra era sem forma e vazia.',
  3: 'Deus disse: Haja luz; e houve luz.',
  4: 'Deus viu que a luz era boa.',
};

function fakeBible(isDevPlaceholder = false): BibleTextProvider {
  return {
    getMetadata: () => ({
      id: isDevPlaceholder ? 'dev-placeholder' : 'blivre',
      name: isDevPlaceholder ? 'Texto de exemplo (desenvolvimento)' : 'Bíblia Livre',
      abbreviation: isDevPlaceholder ? 'DEV' : 'BLIVRE',
      language: 'pt-BR',
      copyrightNotice: 'CC BY',
      attributionRequired: true,
      cachePolicy: 'bundled',
      offlineAvailable: true,
      isDevPlaceholder,
    }),
    getPassage: async (reference) => {
      const all = Object.entries(CHAPTER).map(([verse, text]) => ({ verse: Number(verse), text }));
      const start = reference.verseStart;
      const end = reference.verseEnd ?? start;
      return {
        reference: `${reference.book} ${reference.chapterStart}`,
        book: reference.book,
        bookName: reference.book,
        chapter: reference.chapterStart,
        heading: null,
        verses: start === null ? all : all.filter((v) => v.verse >= start && v.verse <= (end ?? start)),
      };
    },
  };
}

async function seedMarks() {
  await AsyncStorage.setItem(
    MARKS_KEY,
    JSON.stringify({
      byVerse: {
        'JHN.3.16': {
          book: 'JHN',
          chapter: 3,
          verse: 16,
          color: 'amarelo',
          note: 'MINHA ANOTAÇÃO SECRETA',
          updatedAt: '',
        },
      },
    }),
  );
  _resetMarksCacheForTests();
}

const ORIGINAL_CAMPOS = { ...CAMPOS };
function fillCampos(version: string) {
  for (const key of Object.keys(CAMPOS) as CampoId[]) CAMPOS[key] = `valor-${key}`;
  CAMPOS.versaoRegras = version;
  CAMPOS.versaoConsentimento = version;
}

const MY_FILES = [
  'src/app/comunidade/publicar.tsx',
  'src/app/comunidade/regras.tsx',
  'src/app/comunidade/consentimento.tsx',
  'src/ui/comunidade/publicar/VersiculoSheet.tsx',
  'src/ui/comunidade/publicar/pecas.tsx',
  'src/ui/comunidade/publicar/aceite.ts',
  'src/ui/comunidade/publicar/fluxo.ts',
  'src/ui/comunidade/publicar/textos.ts',
  'src/ui/comunidade/publicar/rascunho.ts',
];

const sourceOf = (file: string) => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = (hex.replace('#', '').match(/../g) ?? []).map((pair) => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

beforeEach(async () => {
  mockParams = {};
  mockApi = null;
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockLaunch.mockReset();
  jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled').mockImplementation(async () => false);
  await AsyncStorage.clear();
  _resetMarksCacheForTests();
  setBibleProvider(fakeBible());
  Object.assign(CAMPOS, ORIGINAL_CAMPOS);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/* ------------------------------------------- 1 · a linha, no lugar da tela */

describe('1 · a tela de aceite saiu; a linha fica embaixo do botão', () => {
  test('a frase é a do fundador, palavra por palavra, e o link está dentro dela', () => {
    expect(ACEITE_LINE).toBe(
      'Ao publicar, você confirma que tem 16 anos ou mais e aceita as regras do Juntos.',
    );
    expect(ACEITE_LINE).toContain(ACEITE_LINE_LINK);
    expect(ACEITE_LINE_LINK).toBe('regras do Juntos');
    expect(ACEITE_LINE_SPOKEN.startsWith(ACEITE_LINE)).toBe(true);
  });

  test('a linha está embaixo do botão, é um link de alvo 48 e abre as regras', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('publish-input');
    const line = screen.getByTestId('aceite-line');
    // Um elemento só para o leitor de tela: papel de link e a frase inteira.
    expect(line.props.accessibilityRole).toBe('link');
    expect(line.props.accessibilityLabel).toBe(ACEITE_LINE_SPOKEN);
    const style = StyleSheet.flatten(line.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    expect(style.paddingVertical).toBeGreaterThan(0);
    // Embaixo do botão, dentro do rodapé.
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('publish-send')).toBeLessThan(json.indexOf('aceite-line'));

    await fireEvent.press(line);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/comunidade/regras', params: { ler: '1' } });
  });

  test('nenhuma tela no meio: a tela de publicar não empurra mais a rota do aceite', () => {
    const source = sourceOf('src/app/comunidade/publicar.tsx');
    expect(source).not.toMatch(/ROUTES\.consentimento/);
    expect(source).not.toMatch(/comunidade\/consentimento/);
  });

  test('o toque em Publicar registra 16+, regras e consentimento e publica na sequência', async () => {
    fillCampos('1.0');
    const { rpc } = useFakeApi({
      status: {
        needs_rules: true,
        needs_publish_consent: true,
        rules_version: '1.0',
        publish_consent_version: '1.0',
        age_confirmed: false,
        can_publish: false,
      },
    });
    await render(<PublishScreen />);
    await fireEvent.changeText(await screen.findByTestId('publish-input'), 'Hoje Deus falou comigo.');
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    const order = rpc.mock.calls.map(([name]) => name).filter((name: string) => name !== 'my_community_status');
    expect(order).toEqual(['set_community_profile', 'accept_community_terms', 'accept_community_terms']);
    // Nada de navegação: o aceite não é mais uma tela.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('fonte máxima (3,571×): a linha continua com alvo de 48 e com a frase inteira', async () => {
    setViewport(AX5);
    useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('publish-input');
    const line = screen.getByTestId('aceite-line');
    expect(StyleSheet.flatten(line.props.style).minHeight).toBeGreaterThanOrEqual(48);
    expect(line.props.accessibilityLabel).toBe(ACEITE_LINE_SPOKEN);
    await cleanup();
    resetViewport();
  });
});

/* ----------------------------------- 2 · versículo: a Bíblia inteira */

describe('2 · Versículo: qualquer versículo da Bíblia', () => {
  test('marcados no topo como atalho, e o caminho livro → capítulo → versículo', async () => {
    await seedMarks();
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));

    // O atalho vem primeiro: o que a pessoa marcou, sem a anotação dela.
    expect(await screen.findByTestId('verse-marked')).toBeTruthy();
    expect(screen.getByTestId('verse-option-JHN.3.16')).toBeTruthy();
    expect(screen.queryByText(/MINHA ANOTAÇÃO SECRETA/)).toBeNull();

    // E dá para procurar qualquer outro.
    await fireEvent.press(screen.getByTestId('verse-open-bible'));
    expect(await screen.findByTestId('verse-books')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verse-book-GEN'));
    expect(await screen.findByTestId('verse-chapters')).toBeTruthy();
    // Gênesis tem 50 capítulos, e cada célula é um alvo de pelo menos 48.
    expect(screen.getByTestId('verse-chapter-50')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('verse-chapter-1').props.style).minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent.press(screen.getByTestId('verse-chapter-1'));

    // Os versículos do capítulo, com o texto da Bíblia Livre à mostra.
    expect(await screen.findByTestId('verse-option-GEN.1.3')).toBeTruthy();
    expect(screen.getByText('Deus disse: Haja luz; e houve luz.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verse-option-GEN.1.3'));
    await fireEvent.press(screen.getByTestId('verse-attach'));
    await waitFor(() => expect(screen.getByTestId('chip-versiculo-label').props.children).toBe('Gênesis 1:3'));

    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    const sentInput = createPost.mock.calls[0][0];
    expect(sentInput).toMatchObject({
      verse: { book: 'GEN', chapter: 1, verseStart: 3, verseEnd: null },
      kind: 'versiculo',
    });
    // Só a referência sai do aparelho: nem o texto bíblico, nem a anotação, nem a cor.
    expect(JSON.stringify(sentInput)).not.toMatch(/Haja luz|Bíblia Livre|ANOTAÇÃO|amarelo/);
  });

  test('sem nenhuma marca a folha abre na Bíblia, e cada passo tem volta', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));
    expect(await screen.findByTestId('verse-books')).toBeTruthy();
    // Sem marcas não há para onde voltar no primeiro passo.
    expect(screen.queryByTestId('verse-back')).toBeNull();
    await fireEvent.press(screen.getByTestId('verse-book-PSA'));
    expect(await screen.findByTestId('verse-chapters')).toBeTruthy();
    expect(screen.getByText('Escolher outro livro')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verse-chapter-23'));
    await screen.findByTestId('verse-verses');
    expect(screen.getByText('Escolher outro capítulo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verse-back'));
    expect(await screen.findByTestId('verse-chapters')).toBeTruthy();
  });

  test('provedor de exemplo: os números aparecem, o texto NÃO (nada se passa por versículo)', async () => {
    setBibleProvider(fakeBible(true));
    const { createPost } = useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-versiculo'));
    await fireEvent.press(await screen.findByTestId('verse-book-GEN'));
    await fireEvent.press(await screen.findByTestId('verse-chapter-1'));
    expect(await screen.findByTestId('verse-option-GEN.1.1')).toBeTruthy();
    expect(screen.queryByText('No princípio, Deus criou os céus e a terra.')).toBeNull();
    await fireEvent.press(screen.getByTestId('verse-option-GEN.1.1'));
    await fireEvent.press(screen.getByTestId('verse-attach'));
    await waitFor(() => expect(screen.getByTestId('chip-versiculo-label').props.children).toBe('Gênesis 1:1'));
    // Sem prévia: a referência é tudo o que existe.
    expect(screen.queryByTestId('verse-preview')).toBeNull();
    await fireEvent.press(screen.getByTestId('publish-send'));
    await screen.findByText('Publicado');
    expect(JSON.stringify(createPost.mock.calls[0][0])).not.toMatch(/princípio/);
  });
});

/* --------------------------------------- 3 e 4 · foto e resumo do que vai */

describe('3 · foto sem aviso antes', () => {
  test('tocar em Galeria abre a galeria, e nada mais', async () => {
    useFakeApi();
    mockLaunch.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///galeria/0.jpg', width: 800, height: 600 }],
    });
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-galeria'));
    expect(await screen.findByTestId('photo-thumb-0')).toBeTruthy();
    expect(screen.queryByTestId('photo-warning')).toBeNull();
    expect(mockLaunch).toHaveBeenCalledTimes(1);
  });

  test('nenhum texto de aviso sobrou no código da tela', () => {
    const publicar = sourceOf('src/app/comunidade/publicar.tsx');
    const textos = sourceOf('src/ui/comunidade/publicar/textos.ts');
    expect(publicar).not.toMatch(/PHOTO_WARNING|photo-warning|photo-pick/);
    expect(textos).not.toMatch(/export const PHOTO_WARNING/);
  });
});

describe('4 · resumo discreto do que vai junto', () => {
  test('soma anexos e fotos numa linha; sem nada, não existe', () => {
    expect(attachSummary([], 0)).toBeNull();
    expect(attachSummary([], 1)).toBe('Vai junto: 1 foto');
    expect(
      attachSummary([{ kind: 'leitura', day: 5, reference: 'Gênesis 1–3' }, { kind: 'oracao' }], 2),
    ).toBe('Vai junto: Dia 5 · Gênesis 1–3 · Oração · 2 fotos');
  });

  test('a linha aparece com os chips, e não é passo nenhum', async () => {
    useFakeApi();
    await render(<PublishScreen />);
    await screen.findByTestId('attach-bar');
    expect(screen.queryByTestId('attach-summary')).toBeNull();
    await fireEvent.press(screen.getByTestId('attach-oracao'));
    expect(screen.getByTestId('attach-summary').props.children).toBe('Vai junto: Oração');
    // Continua sendo possível publicar sem tocar em nada disso.
    expect(screen.getByTestId('publish-send').props.accessibilityState.disabled).toBe(false);
  });
});

/* ------------------------------------------------ tokens e acessibilidade */

describe('tokens, contraste e movimento', () => {
  test('nada de fontWeight e nada de cor crua nos arquivos desta parte', () => {
    for (const file of MY_FILES) {
      // Sem comentários: os arquivos EXPLICAM que o peso vem da face, nunca de `fontWeight`.
      const source = sourceOf(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(source).not.toMatch(/fontWeight/);
      // Cor só por token do tema (src/ui/theme.ts).
      expect(source.replace(/#\d+/g, '')).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
  });

  test('a linha do aceite passa de 4,5:1 nos dois temas (legenda e link)', () => {
    for (const palette of [palettes.light, palettes.dark]) {
      expect(contrastRatio(palette.textMuted, palette.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.text, palette.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('com "Reduzir movimento", os chips entram sem animação', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    useFakeApi();
    await render(<PublishScreen />);
    await fireEvent.press(await screen.findByTestId('attach-oracao'));
    await act(async () => {});
    const chip = screen.getByTestId('chip-oracao');
    expect(chip.props.entering).toBeUndefined();
    expect(chip.props.exiting).toBeUndefined();
  });
});
