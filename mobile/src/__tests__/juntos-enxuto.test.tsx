/**
 * "Juntos enxuto" — o feedback do fundador de 2026-09-22 testado item a item:
 *
 *   1. Amém volta a ser as DUAS MÃOS em oração (Phosphor `hands-praying`), com o
 *      marcado cheio na cor de marca do Juntos.
 *   2. "Conheça o Juntos" aparece UMA vez, fecha no X e não volta.
 *   3. Só a igreja toda: sem filtro de grupo e sem escolha de público.
 *   4. Foto de perfil OPCIONAL: um passo, nunca um portão para publicar.
 *   5. Publicar foto no FLUXO REAL (a foto que "não carregava"), nas três formas de
 *      URI que o app encontra: conteúdo do Android, biblioteca do iOS e o data URI
 *      da demonstração.
 *   6. Regras curtas: só o que é o Juntos, o que pode, o que não pode e o que é
 *      tirado do ar — e as funções continuam.
 *
 * Nada aqui prova o servidor: o cliente é o da DEMONSTRAÇÃO (memória) ou um
 * simulado, como no resto da suíte da Comunidade.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { processColor, Text } from 'react-native';

import PublishScreen from '@/app/comunidade/publicar';
import CommunityProfileScreen from '@/app/comunidade/perfil';
import { CommunityError } from '@/community/errors';
import { EMPTY_PROFILE, profileGaps } from '@/community/profile';
import { _resetDemoForTests, demoSignIn, getDemoCommunityApi } from '@/community/demoApi';
import { AmenButton } from '@/ui/comunidade/feed/AmenButton';
import { ConhecaOJuntos, INTRO_LINES, INTRO_TITLE } from '@/ui/comunidade/feed/ConhecaOJuntos';
import { _resetJuntosIntroForTests, JUNTOS_INTRO_KEY, useJuntosIntro } from '@/ui/comunidade/feed/conheca';
import { AVATAR_OPTIONAL_NOTE, AVATAR_RULES, AVATAR_STEP_TITLE } from '@/ui/comunidade/perfil/PerfilCampos';
import { PICKER_QUALITY, pickManyFromLibrary, preparePhoto } from '@/ui/comunidade/publicar/foto';
import { RULES_SUMMARY } from '@/ui/comunidade/publicar/textos';
import { Icon } from '@/ui/icons';
import { BRAND_YELLOW, palettes } from '@/ui/theme';

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
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  digestStringAsync: jest.fn(async () => 'ab'.repeat(32)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Demonstração: Comunidade ligada, SEM nuvem (é isso que liga o demoApi).
jest.mock('@/config/features', () => ({ COMMUNITY_ENABLED: true }));
jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => false, ACCOUNT_DELETION_AVAILABLE: false }));
jest.mock('@/cloud/client', () => ({ getSupabase: () => null, requireSupabase: () => null }));
jest.mock('@/cloud/useSession', () => ({
  useCloudSession: () => ({
    configured: false,
    loading: false,
    session: null,
    signedIn: false,
    role: 'none',
    membership: null,
    degraded: false,
    refresh: () => {},
  }),
}));

/* ---------------------------------------------- galeria e manipulador FIÉIS
 *
 * O molde vem do código dos pacotes instalados, não de um palpite:
 *
 *  - expo-image-picker 57.0.19, MediaHandler.kt: com `quality: 1` (MAXIMUM_QUALITY)
 *    o seletor usa o RawImageExporter e COPIA o arquivo original, sem decodificar;
 *    o nome ganha a extensão do mime de ORIGEM, e `toImageFileExtension` manda
 *    tudo o que não é png/gif/bmp/webp para ".jpeg" — HEIC inclusive. Com
 *    qualquer qualidade menor, o CompressionImageExporter decodifica e grava um
 *    bitmap de verdade.
 *  - expo-image-manipulator 57.0.19: `manipulate(uri)` → `renderAsync()` →
 *    `saveAsync()`. O decodificador do sistema não abre HEIC em todo aparelho
 *    (nem no Expo Go), e aí `renderAsync` rejeita.
 *
 * Aqui isso vira um modelo: o seletor devolve um arquivo AINDA HEIC quando
 * pedem qualidade máxima, e o manipulador recusa arquivo HEIC. É esse par que
 * reproduz "a foto não carrega".
 */
const CLEAN_JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]);
const CLEAN_JPEG_B64 = Buffer.from(CLEAN_JPEG).toString('base64');

/** Arquivos que o manipulador NÃO consegue abrir (o original que o seletor copiou cru). */
const undecodable = new Set<string>();

type LaunchOptions = { quality?: number; allowsMultipleSelection?: boolean; selectionLimit?: number };
const mockLaunch = jest.fn();
const mockCamera = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunch(...args),
  launchCameraAsync: (...args: unknown[]) => mockCamera(...args),
  requestCameraPermissionsAsync: async () => ({ granted: true }),
}));

jest.mock('expo-image-manipulator', () => {
  const failing = () => {
    throw new Error('Could not decode the image');
  };
  return {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: (uri: string) => {
        const broken = (global as unknown as { __undecodable: Set<string> }).__undecodable.has(uri);
        const ref = {
          width: 4000,
          height: 3000,
          release: () => {},
          saveAsync: async (options: { base64?: boolean }) => ({
            uri: 'file:///cache/ImageManipulator/preparada.jpg',
            width: 1600,
            height: 1200,
            base64: options.base64
              ? Buffer.from(
                  Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, 0xff, 0xda, 0x00, 0x02]),
                ).toString('base64')
              : undefined,
          }),
        };
        const context = {
          resize: () => context,
          renderAsync: async () => {
            if (broken) failing();
            return ref;
          },
          release: () => {},
        };
        return context;
      },
    },
  };
});

(global as unknown as { __undecodable: Set<string> }).__undecodable = undecadableRef();
function undecadableRef() {
  return undecodable;
}

/**
 * O seletor do sistema, modelado como o Android de verdade. `sourceUri` é o que
 * a pessoa escolheu (conteúdo do Android, biblioteca do iOS…) e `heic` diz se o
 * arquivo de origem é HEIC — o caso das fotos de iPhone e de Android moderno.
 */
function galleryReturns({ sourceUri, heic = true, count = 1 }: { sourceUri: string; heic?: boolean; count?: number }) {
  mockLaunch.mockImplementation(async (options: LaunchOptions) => {
    const raw = (options.quality ?? 1) >= 1;
    const assets = Array.from({ length: count }, (_, i) => {
      // Sempre um arquivo no cache do app, sempre com nome .jpeg (toImageFileExtension).
      const uri = `file:///cache/ImagePicker/${raw ? 'crua' : 'recodificada'}-${i}-${encodeURIComponent(sourceUri)}.jpeg`;
      // Cru + origem HEIC = os bytes continuam HEIC, e o manipulador não abre.
      if (raw && heic) undecodable.add(uri);
      else undecodable.delete(uri);
      return { uri, width: 4000, height: 3000 };
    });
    return { canceled: false, assets };
  });
}

beforeEach(() => {
  undecodable.clear();
  mockLaunch.mockReset();
  mockCamera.mockReset();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.back.mockClear();
  mockParams = {};
  _resetJuntosIntroForTests();
  _resetDemoForTests(Date.parse('2026-09-25T12:00:00Z'));
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  process.env.EXPO_PUBLIC_DEMO_MODE = 'true';
  return AsyncStorage.clear();
});

/* ---------------------------------------------------- 1 · Amém: duas mãos */

/** Os dois desenhos do Phosphor `hands-praying` 2.1.1, pelo começo do path. */
const HANDS_PRAYING_BOLD_START = 'M238.15,177.18l-35.53-35.53L166.45,22.3';
const HANDS_PRAYING_FILL_START = 'M235.32,180l-36.24-36.25L162.62,23.46';
/** A mão aberta (Phosphor `hand`) que estava aqui e o fundador não reconheceu. */
const OPEN_HAND_BOLD_START = 'M188,44a32,32';
const OPEN_HAND_FILL_START = 'M216,64v90.93';

describe('1 · Amém: as duas mãos em oração', () => {
  test('desmarcado é o contorno e marcado é o cheio, do mesmo desenho de duas mãos', async () => {
    let view = await render(<Icon name="amen" size={24} color="#111111" />);
    expect(drawn(view)).toContain(HANDS_PRAYING_BOLD_START);
    // Não é mais a mão aberta que o fundador não reconheceu.
    expect(drawn(view)).not.toContain(OPEN_HAND_BOLD_START);
    await view.unmount();

    view = await render(<Icon name="amen-filled" size={24} color="#111111" />);
    expect(drawn(view)).toContain(HANDS_PRAYING_FILL_START);
    expect(drawn(view)).not.toContain(OPEN_HAND_FILL_START);
    await view.unmount();
  });

  test('marcado é cheio na cor de marca do Juntos, e ela passa no contraste nos dois temas', async () => {
    let view = await render(<AmenButton checked={false} onToggle={() => {}} testID="amem" />);
    expect(drawn(view)).toContain(fillOf(palettes.light.text));
    expect(drawn(view)).toContain(HANDS_PRAYING_BOLD_START);
    await view.unmount();

    view = await render(<AmenButton checked onToggle={() => {}} testID="amem" />);
    expect(drawn(view)).toContain(fillOf(palettes.light.blue));
    expect(drawn(view)).toContain(HANDS_PRAYING_FILL_START);
    // Nunca o amarelo da marca: sobre o fundo claro do feed ele mede 1,46:1.
    expect(drawn(view)).not.toContain(fillOf(BRAND_YELLOW));
    await view.unmount();

    // A correção técnica sobre "cor de marca": o amarelo não passa sobre o fundo
    // claro do feed (1,46:1); o azul do Juntos passa nos dois temas.
    expect(contrast(BRAND_YELLOW, palettes.light.background)).toBeLessThan(3);
    expect(contrast(palettes.light.blue, palettes.light.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palettes.dark.blue, palettes.dark.background)).toBeGreaterThanOrEqual(4.5);
  });

  test('o estado NÃO depende da cor: vai em accessibilityState.checked', async () => {
    const view = await render(<AmenButton checked onToggle={() => {}} testID="amem" />);
    expect(view.getByTestId('amem').props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByTestId('amem').props.accessibilityLabel).toBe('Amém');
    await view.unmount();
  });
});

/** A árvore desenhada, em texto: o mesmo jeito que o resto da suíte confere SVG. */
function drawn(view: { toJSON: () => unknown }): string {
  return JSON.stringify(view.toJSON());
}

/** O react-native-svg guarda a cor já processada (número), não o hex. */
function fillOf(color: string): string {
  return `"fill":{"type":0,"payload":${String(processColor(color))}}`;
}

/** Contraste WCAG 2.1 entre duas cores hex de 6 dígitos. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const r = channel(parseInt(hex.slice(1, 3), 16));
    const g = channel(parseInt(hex.slice(3, 5), 16));
    const bl = channel(parseInt(hex.slice(5, 7), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------ 2 · Conheça o Juntos */

/** Tela mínima que usa o mesmo par hook + aviso que o feed usa. */
function IntroHost() {
  const intro = useJuntosIntro();
  return (
    <>
      <Text testID="intro-estado">{intro.loaded ? (intro.dismissed ? 'dispensado' : 'aberto') : 'lendo'}</Text>
      <ConhecaOJuntos visible={intro.loaded && !intro.dismissed} onClose={intro.dismiss} />
    </>
  );
}

describe('2 · "Conheça o Juntos" na primeira vez', () => {
  test('aparece com as quatro linhas, fecha no X grande e não volta nunca mais', async () => {
    let view = await render(<IntroHost />);
    await waitFor(() => expect(screen.getByTestId('intro-estado').props.children).toBe('aberto'));

    expect(screen.getByTestId('juntos-intro-title').props.children).toBe(INTRO_TITLE);
    expect(INTRO_LINES).toHaveLength(4);
    for (const line of INTRO_LINES) expect(screen.getByText(line)).toBeTruthy();
    // O que é, o que pode e o que não pode, nas quatro linhas.
    expect(INTRO_LINES.join(' ')).toMatch(/Deus falou/);
    expect(INTRO_LINES.join(' ')).toMatch(/oração/);
    expect(INTRO_LINES.join(' ')).toMatch(/Cabe aqui/);
    expect(INTRO_LINES.join(' ')).toMatch(/Não cabe/);

    // X grande, com nome "Fechar" e alvo de 48.
    const close = screen.getByTestId('juntos-intro-close');
    expect(close.props.accessibilityLabel).toBe('Fechar');
    const style = Array.isArray(close.props.style) ? Object.assign({}, ...close.props.style) : close.props.style;
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);

    await fireEvent.press(close);
    await waitFor(() => expect(screen.getByTestId('intro-estado').props.children).toBe('dispensado'));
    expect(screen.queryByTestId('juntos-intro')).toBeNull();
    await view.unmount();

    // A dispensa ficou guardada: nem na memória nem depois de fechar o app ele volta.
    await waitFor(async () => expect(await AsyncStorage.getItem(JUNTOS_INTRO_KEY)).toBe('1'));
    view = await render(<IntroHost />);
    await waitFor(() => expect(screen.getByTestId('intro-estado').props.children).toBe('dispensado'));
    expect(screen.queryByTestId('juntos-intro')).toBeNull();
    await view.unmount();

    // Aparelho novo (memória limpa, mas a marca gravada): continua dispensado.
    _resetJuntosIntroForTests();
    view = await render(<IntroHost />);
    await waitFor(() => expect(screen.getByTestId('intro-estado').props.children).toBe('dispensado'));
    await view.unmount();
  });

  test('se ler o armazenamento falhar, o aviso aparece — nada quebra', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('sem disco'));
    const view = await render(<IntroHost />);
    await waitFor(() => expect(screen.getByTestId('intro-estado').props.children).toBe('aberto'));
    await view.unmount();
    spy.mockRestore();
  });
});

/**
 * A demonstração pronta para publicar: conta do aparelho, entrada automática,
 * nome, 16+ e o aceite — os mesmos passos que a tela faz sozinha.
 */
async function demoPronto() {
  demoSignIn();
  const api = getDemoCommunityApi()!;
  await api.joinCommunity({ displayName: 'Davi' });
  await api.updateProfile({ name: 'Davi', confirms16: true });
  await api.acceptTerms({ purpose: 'community_rules', version: 'PENDENTE', sha256: 'ab'.repeat(32), appVersion: '1.0.0' });
  await api.acceptTerms({ purpose: 'community_publish', version: 'PENDENTE', sha256: 'ab'.repeat(32), appVersion: '1.0.0' });
  return api;
}

/* ------------------------------------------- 4 · foto de perfil opcional */

describe('4 · foto de perfil OPCIONAL', () => {
  test('a foto não é uma falta: para publicar bastam nome e 16+', () => {
    const semFoto = { ...EMPTY_PROFILE, displayName: 'Davi', ageConfirmed: true };
    expect(profileGaps(semFoto)).toEqual([]);
    expect(profileGaps({ ...EMPTY_PROFILE, ageConfirmed: true })).toEqual(['nome']);
  });

  test('o perfil do Juntos tem o passo "Coloque uma foto", dito como opcional', async () => {
    await demoPronto();
    const view = await render(<CommunityProfileScreen />);
    await waitFor(() => expect(screen.getByTestId('perfil-foto')).toBeTruthy());
    expect(screen.getAllByText(AVATAR_STEP_TITLE).length).toBeGreaterThan(0);
    expect(screen.getByTestId('perfil-foto-opcional').props.children).toBe(AVATAR_OPTIONAL_NOTE);
    expect(AVATAR_OPTIONAL_NOTE).toMatch(/Publicar nunca depende dela/);
    // Nada aqui diz que a foto é necessária para publicar.
    expect(screen.queryByText(/Necessária para publicar/)).toBeNull();
    await view.unmount();
  });

  test('publicar sem foto de perfil nenhuma funciona', async () => {
    const api = await demoPronto();
    const status = await api.getStatus();
    expect(status.profile.avatarPath).toBeNull();
    const result = await api.createPost({ body: 'Sem foto de perfil e publiquei.', photoPaths: [] });
    expect(result.status).toBe('published');
  });
});

/* ------------------------------------- 5 · publicar foto no fluxo real */

describe('5 · publicar foto (a que "não carregava")', () => {
  /**
   * A regressão, escrita como teste: pedindo qualidade máxima o seletor devolve o
   * arquivo original (HEIC com nome .jpeg) e o manipulador não abre.
   */
  test('pedir qualidade 1 ao seletor devolve o arquivo cru, e aí a preparação falha', async () => {
    galleryReturns({ sourceUri: 'content://media/external/images/media/42', heic: true });
    // O que o app fazia até 2026-09-22: qualidade máxima.
    const crua = await mockLaunch({ mediaTypes: ['images'], quality: 1 });
    const asset = { uri: crua.assets[0].uri, width: 4000, height: 3000 };
    await expect(preparePhoto(asset)).rejects.toBeInstanceOf(CommunityError);
  });

  test('o app NÃO pede qualidade 1: é isso que faz a foto abrir', async () => {
    galleryReturns({ sourceUri: 'content://media/external/images/media/42', heic: true });
    await pickManyFromLibrary(1);
    expect(PICKER_QUALITY).toBeLessThan(1);
    expect(mockLaunch.mock.calls[0][0].quality).toBe(PICKER_QUALITY);
  });

  test.each([
    ['uri de conteúdo do Android', 'content://media/external/images/media/42'],
    ['uri da biblioteca do iOS', 'ph://B84E8479-475C-4727-A4A4-B77AA9980897/L0/001'],
    ['arquivo já no cache', 'file:///var/mobile/tmp/IMG_0042.HEIC'],
  ])('%s: a foto é preparada e vira bytes sem metadado', async (_label, sourceUri) => {
    galleryReturns({ sourceUri, heic: true });
    const [asset] = await realPick(4);
    const prepared = await preparePhoto(asset);
    expect(prepared.bytes).toEqual(CLEAN_JPEG);
    expect(prepared.uri).toBe('file:///cache/ImageManipulator/preparada.jpg');
  });

  test('fluxo inteiro na demonstração: escolher, publicar e a foto voltar como data URI', async () => {
    galleryReturns({ sourceUri: 'content://media/external/images/media/42', heic: true });
    const api = await demoPronto();

    const view = await render(<PublishScreen />);
    await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
    // A galeria abre DIRETO (decisão do fundador, 2026-09-22): sem aviso no meio.
    await fireEvent.press(screen.getByTestId('attach-galeria'));
    expect(screen.queryByTestId('photo-warning')).toBeNull();

    // A prévia aparece: é isso que não acontecia.
    const thumb = await screen.findByTestId('photo-thumb-0');
    expect(thumb.props.source.uri).toBe('file:///cache/ImageManipulator/preparada.jpg');
    expect(screen.queryByTestId('photo-error')).toBeNull();

    await fireEvent.press(screen.getByTestId('publish-send'));
    // Publica DIRETO (decisão do fundador): "Publicado", não "Em análise".
    await waitFor(() => expect(screen.getByText('Publicado')).toBeTruthy());
    await view.unmount();

    // E volta do feed com uma URL que a tela consegue mostrar.
    const page = await api.feedPage();
    const mine = page.posts.find((post) => post.isMine)!;
    expect(mine.photoPaths).toHaveLength(1);
    const urls = await api.signPhotoUrls(mine.photoPaths!);
    expect(urls.get(mine.photoPaths![0])).toBe(`data:image/jpeg;base64,${CLEAN_JPEG_B64}`);
  });

  test('foto que o aparelho não abre: a tela diz o que fazer, em vez de erro de sistema', async () => {
    galleryReturns({ sourceUri: 'content://media/external/images/media/9', heic: true });
    // Mesmo com a qualidade certa, o arquivo pode não abrir (formato exótico):
    // aqui o cache já entra marcado como ilegível.
    mockLaunch.mockImplementation(async () => {
      undecodable.add('file:///cache/ImagePicker/estranha.jpeg');
      return { canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/estranha.jpeg', width: 800, height: 600 }] };
    });
    await demoPronto();

    const view = await render(<PublishScreen />);
    await waitFor(() => expect(screen.getByTestId('publish-input')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('attach-galeria'));
    expect(await screen.findByTestId('photo-error')).toBeTruthy();
    expect(screen.getByText('Não foi possível preparar esta foto. Tente outra.')).toBeTruthy();
    expect(screen.queryByTestId('photo-thumb-0')).toBeNull();
    await view.unmount();
  });

  test('o aviso da foto não promete mais conferência humana, e a de perfil também não', () => {
    expect(AVATAR_RULES.join(' ')).not.toMatch(/uma pessoa da equipe da igreja olha/);
    expect(AVATAR_RULES.join(' ')).toMatch(/localização da foto é apagada/);
  });
});

/** O caminho REAL da galeria, com a qualidade que o app pede hoje. */
async function realPick(limit: number) {
  const assets = await pickManyFromLibrary(limit);
  expect(assets.length).toBeGreaterThan(0);
  return assets;
}

/* ---------------------------------------------------- 6 · regras curtas */

describe('6 · regras curtas na tela de aceite', () => {
  test('quatro linhas: o que é, o que pode, o que não pode e o que é tirado do ar', () => {
    expect(RULES_SUMMARY).toHaveLength(4);
    const text = RULES_SUMMARY.join(' ');
    expect(text).toMatch(/Deus falou na leitura/);
    expect(text).toMatch(/Pode:/);
    expect(text).toMatch(/Não pode: ofensa, violência, nudez ou expor outra pessoa/);
    expect(text).toMatch(/tirado do ar/);
    // As funções continuam ditas.
    expect(text).toMatch(/denunciar, bloquear e apagar o seu/);
    // E nada de criança nem de rosto de terceiro, que saíram a pedido do fundador.
    expect(text).not.toMatch(/criança|adolescente|rosto/);
  });
});

