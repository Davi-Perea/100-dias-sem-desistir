import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'fs';
import path from 'path';

/**
 * Configuração do app por variante (APP_VARIANT = development | preview | production).
 * Documentação e decisões: docs/technical/BUILD_E_IDENTIFICADORES.md
 *
 * - development: development build (expo-dev-client), precisa do Metro rodando no computador.
 * - preview:     build de release instalável (APK), SEM Metro. Enquanto a igreja não autorizar
 *                (rights_status = pending_authorization) o portão de produção BLOQUEIA a abertura.
 * - production:  loja (com.cemdiassemdesistir.app). Recusa gerar config enquanto o dataset embarcado não estiver com rights_status = "authorized"
 *                (DIR-06: o portão de direitos também barra a GERAÇÃO do build de loja, não só a abertura).
 *
 * Sem APP_VARIANT definida, assume development (o caso de `npx expo start` local).
 */

type Variant = 'development' | 'preview' | 'production';

const VARIANTS: readonly Variant[] = ['development', 'preview', 'production'];

function readVariant(): Variant {
  const raw = process.env.APP_VARIANT ?? 'development';
  if (!(VARIANTS as readonly string[]).includes(raw)) {
    throw new Error(`APP_VARIANT inválida: "${raw}". Use development, preview ou production.`);
  }
  return raw as Variant;
}

/**
 * IDENTIFICADOR DE PRODUÇÃO (android.package e ios.bundleIdentifier) — CARO DE REVERTER.
 * Depois do primeiro envio às lojas ele não muda nunca mais (mudar = app novo, usuários perdidos).
 * Decidido pelo fundador em 2026-09-21 (publicação expressa pela conta de desenvolvedor pessoa física dele;
 * a da igreja depende de D-U-N-S). Por isso ele não cita a pessoa física: INFERÊNCIA (reverificar na doc
 * da Apple antes de transferir) a transferência de app para a conta da organização mantém o bundle ID.
 * Ver docs/technical/BUILD_E_IDENTIFICADORES.md §6.
 */
const PRODUCTION_IDENTIFIER: string | null = 'com.cemdiassemdesistir.app';

/**
 * Identificadores PROVISÓRIOS e DESCARTÁVEIS, só para builds de teste interno.
 * Não vão para loja nenhuma. Quando o identificador de produção existir, eles passam a
 * ser `${PRODUCTION_IDENTIFIER}.dev` / `.preview` (reinstalar o app de teste; nada se perde
 * além de dados locais de teste).
 */
const PROVISIONAL_BASE = 'br.provisorio.bibliaapp';

/** ID do projeto EAS. Preencher com o valor que `eas init` imprimir. */
const EAS_PROJECT_ID: string | null = null;

/** Cores do tema do app (mobile/src/ui/theme.ts: `background` claro e escuro). */
const THEME_BACKGROUND_LIGHT = '#FFFFFF';
const THEME_BACKGROUND_DARK = '#111111';

function identifierFor(variant: Variant): string {
  if (variant === 'production') {
    if (!PRODUCTION_IDENTIFIER) {
      throw new Error(
        'Variante production bloqueada: PRODUCTION_IDENTIFIER ainda é null em app.config.ts. ' +
          'Ele depende da entidade dona e do domínio (PLANO_DE_LANCAMENTO D1/D3/D8). ' +
          'Veja docs/technical/BUILD_E_IDENTIFICADORES.md.',
      );
    }
    return PRODUCTION_IDENTIFIER;
  }
  const base = PRODUCTION_IDENTIFIER ?? PROVISIONAL_BASE;
  return variant === 'development' ? `${base}.dev` : `${base}.preview`;
}

const NAMES: Record<Variant, string> = {
  development: '100 dias (dev)',
  preview: '100 dias (preview)',
  // Nome SOB O ÍCONE (decisão do fundador, 2026-09-21): curto para não ser cortado na tela inicial.
  // O nome longo "100 dias sem desistir" é o da LOJA e é definido no App Store Connect / Play Console, não aqui.
  production: '100 dias',
};

/** Esquema de deep link. Um por variante, para dev/preview/produção conviverem no mesmo celular. */
const SCHEMES: Record<Variant, string> = {
  development: 'bibliaapp-dev',
  preview: 'bibliaapp-preview',
  production: 'bibliaapp',
};

/**
 * Portão de direitos na geração do build de loja (DIR-06). Lê o que vai para o
 * binário (provenance do dataset.json) e recusa a variante production sem a
 * autorização escrita da igreja. preview não é barrada aqui: ela é teste interno
 * e fecha na abertura pelo portão de produção (src/journey/datasetSource.ts).
 */
export function assertRightsForStore(projectRoot: string): void {
  const datasetPath = path.join(projectRoot, 'content', '100-dias-2026', 'dataset.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8')) as {
    provenance?: { rights_status?: string; rights_reference?: string | null };
  };
  const status = dataset.provenance?.rights_status;
  if (status !== 'authorized' || !dataset.provenance?.rights_reference) {
    throw new Error(
      `Variante production bloqueada: o dataset embarcado está com rights_status "${status}". ` +
        'Build de loja exige a autorização escrita da igreja (content/100-dias-2026/rights.json → ' +
        'npm run content:convert). Veja content/source/README.md, item 3.',
    );
  }
}

/**
 * Contato e política na geração do build de loja. A App Store pede contato
 * alcançável no app (1.5) e a política de privacidade acessível de dentro dele
 * (5.1.1(i)). Enquanto SUPPORT_EMAIL ou PRIVACY_URL (src/config/contato.ts)
 * forem null, as telas escondem a linha (nunca um link quebrado) e a variante
 * production é recusada aqui. Lê o arquivo como texto para não depender de o
 * carregador do Expo resolver imports TypeScript do app.
 */
export function assertContactForStore(projectRoot: string): void {
  const source = fs.readFileSync(path.join(projectRoot, 'src', 'config', 'contato.ts'), 'utf8');
  const read = (name: string): string | null => {
    const match = new RegExp(`export const ${name}: string \\| null = (null|'([^']*)'|"([^"]*)");`).exec(source);
    if (!match) throw new Error(`Variante production bloqueada: ${name} não encontrado em src/config/contato.ts.`);
    return match[1] === 'null' ? null : (match[2] ?? match[3] ?? '').trim() || null;
  };
  const email = read('SUPPORT_EMAIL');
  const url = read('PRIVACY_URL');
  const missing: string[] = [];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) missing.push('SUPPORT_EMAIL (e-mail válido)');
  if (!url || !/^https:\/\/\S+$/.test(url)) missing.push('PRIVACY_URL (https)');
  if (missing.length > 0) {
    throw new Error(
      `Variante production bloqueada: preencha ${missing.join(' e ')} em src/config/contato.ts ` +
        '(App Store 1.5 e 5.1.1(i): contato e política de privacidade dentro do app).',
    );
  }
}

/**
 * NSPrivacyCollectedDataTypes. Vazio = V1-A (nada sai do aparelho). Um build de loja com a
 * Comunidade é recusado por assertCommunityForStore enquanto isto estiver vazio: preencher
 * (e-mail, nome, conteúdo do usuário e fotos, vinculados à conta, sem rastreamento) junto com
 * o rótulo de privacidade do App Store Connect, nunca um sem o outro.
 */
type CollectedDataType = {
  NSPrivacyCollectedDataType: string;
  NSPrivacyCollectedDataTypeLinked: boolean;
  NSPrivacyCollectedDataTypeTracking: boolean;
  NSPrivacyCollectedDataTypePurposes: string[];
};
const COLLECTED_DATA_TYPES: readonly CollectedDataType[] = [];

/**
 * Comunidade no build de loja. Com EXPO_PUBLIC_COMMUNITY_ENABLED=true a aba aparece,
 * mas em release a nuvem só liga com ACCOUNT_DELETION_AVAILABLE (src/cloud/config.ts):
 * sem isso a aba ficaria sempre "indisponível" (App Store 2.1). A Comunidade cria conta,
 * então a exclusão tem de existir no app (5.1.1(v)) e na web (política do Google Play),
 * e o manifesto de privacidade tem de declarar o que é coletado (e-mail, nome, conteúdo
 * e fotos). Lê os arquivos como texto, como assertContactForStore.
 */
export function assertCommunityForStore(
  projectRoot: string,
  collectedDataTypes: readonly unknown[] = COLLECTED_DATA_TYPES,
): void {
  if (process.env.EXPO_PUBLIC_COMMUNITY_ENABLED !== 'true') return;
  const cloud = fs.readFileSync(path.join(projectRoot, 'src', 'cloud', 'config.ts'), 'utf8');
  const contato = fs.readFileSync(path.join(projectRoot, 'src', 'config', 'contato.ts'), 'utf8');
  const missing: string[] = [];
  if (!/export const ACCOUNT_DELETION_AVAILABLE = true;/.test(cloud)) {
    missing.push('ACCOUNT_DELETION_AVAILABLE = true (src/cloud/config.ts)');
  }
  if (!/export const ACCOUNT_DELETION_URL: string \| null = ['"]https:\/\/\S+['"];/.test(contato)) {
    missing.push('ACCOUNT_DELETION_URL https (src/config/contato.ts)');
  }
  if (collectedDataTypes.length === 0) {
    missing.push('NSPrivacyCollectedDataTypes (COLLECTED_DATA_TYPES em app.config.ts)');
  }
  if (missing.length > 0) {
    throw new Error(
      'Variante production com Comunidade bloqueada: ' +
        missing.join(' e ') +
        ' (Apple 2.1 e 5.1.1(v); exclusão de conta pela web no Google Play; manifesto de privacidade).',
    );
  }
}

export default ({ config, projectRoot }: ConfigContext): ExpoConfig => {
  const variant = readVariant();
  const identifier = identifierFor(variant);
  if (variant === 'production') {
    assertRightsForStore(projectRoot);
    assertContactForStore(projectRoot);
    // Estava definida e nunca chamada (achado do veredito de lojas, 2026-09-22): sem
    // isto, um build de loja com o Juntos ligado passaria sem exclusão de conta e sem
    // os rótulos de privacidade — reprovação certa na Apple e no Google.
    assertCommunityForStore(projectRoot, COLLECTED_DATA_TYPES);
  }

  return {
    ...config,
    name: NAMES[variant],
    // Slug = nome do projeto no EAS. Neutro de propósito: interno, nunca aparece para o usuário,
    // não amarra o projeto a "100 dias" (há outras jornadas previstas) nem a uma marca não decidida.
    slug: 'biblia-app',
    version: '1.0.0',
    orientation: 'portrait',
    // PROVISÓRIO (decisão do engenheiro, 2026-09-21: o designer ainda não entregou o ícone; "100" tipográfico
    // sobre #FFD100, sem logo da igreja). Gerado por scripts/loja/gerar-icone.mjs a partir de scripts/loja/icone.html.
    icon: './assets/icone/icone-ios.png',
    scheme: SCHEMES[variant],
    userInterfaceStyle: 'automatic',
    ios: {
      // PROVISÓRIO (decisão do engenheiro, 2026-09-21: ícone tipográfico até o designer entregar).
      // PNG 1024x1024 RGB, SEM canal alfa (a App Store recusa ícone com transparência).
      icon: './assets/icone/icone-ios.png',
      bundleIdentifier: identifier,
      // V1 só iPhone: sem iPad não há exigência de capturas de iPad nem layout de iPad não testado.
      // (O app ainda roda em iPad em modo de compatibilidade de iPhone; isso é da Apple, não daqui.)
      supportsTablet: false,
      infoPlist: {
        // Espelho do `android.allowBackup: false`, pelo mesmo motivo (R1-5, LGPD
        // art. 5º, II): a tela Privacidade promete que reflexão, jejum, marcações
        // e progresso ficam "só neste aparelho". Tudo isso mora no AsyncStorage.
        //
        // FATO (lido em node_modules/@react-native-async-storage/async-storage@2.2.0,
        // ios/RNCAsyncStorage.mm:518-527, em 2026-09-23): sem esta chave a
        // biblioteca JÁ exclui o diretório do backup — o padrão dela é excluir.
        // A chave existe aqui para a promessa da tela não depender do padrão de
        // um terceiro, que pode mudar numa atualização sem ninguém notar.
        // O teste de app.config trava este valor.
        RCTAsyncStorageExcludeFromBackup: true,
      },
      config: {
        // Grava ITSAppUsesNonExemptEncryption = NO no Info.plist. Base: docs/product/PRIVACIDADE_NAS_LOJAS_rascunho.md
        // §5 (Criptografia), opção A, recomendada para a V1-A: o build de loja sai SEM as variáveis de nuvem, então o
        // código com aes-js (sessão de login, src/cloud/secureStorage.ts) não executa, e o resto é HTTPS do sistema
        // (isento). INFERÊNCIA, não é parecer jurídico. Se a loja receber build COM nuvem (V1-B), reavaliar (opção B).
        usesNonExemptEncryption: false,
      },
      // Manifesto de privacidade (PrivacyInfo.xcprivacy). Sem ele a Apple recusa o envio. O Expo não junta de forma
      // confiável os manifestos das dependências, então os motivos vão aqui. Fonte: PRIVACIDADE_NAS_LOJAS_rascunho.md §4
      // (lido em node_modules/**/ios/PrivacyInfo.xcprivacy em 2026-09-21; atualizar dependências pode mudar a lista).
      // NSPrivacyCollectedDataTypes: ver COLLECTED_DATA_TYPES (build de loja com Comunidade exige preenchido).
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [...COLLECTED_DATA_TYPES],
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
          },
        ],
      },
    },
    android: {
      package: identifier,
      // R1-5: a reflexão promete "fica neste aparelho" e é dado sensível (LGPD art. 5º, II).
      // O padrão do Android (e do Expo) é true: o AsyncStorage iria para o backup do Google Drive.
      // Com false não há backup nem restauração na nuvem. Ressalva (INFERÊNCIA, doc do Android):
      // a partir do Android 12 isto não desliga a transferência aparelho-a-aparelho feita pelo
      // próprio usuário; ver docs/technical/BUILD_E_IDENTIFICADORES.md.
      allowBackup: false,
      // PROVISÓRIO (decisão do engenheiro, 2026-09-21: ícone tipográfico até o designer entregar).
      // Fundo = amarelo da marca (theme.ts BRAND_YELLOW); frente = "100" dentro da zona segura (66 de 108 dp),
      // conferida pelo gerar-icone.mjs. Monocromo = mesma forma (Android 13+ usa só o alfa).
      adaptiveIcon: {
        backgroundColor: '#FFD100',
        foregroundImage: './assets/icone/android-frente.png',
        monochromeImage: './assets/icone/android-monocromo.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          // PROVISÓRIO: fundo do tema, sem marca. A imagem é um PNG 100% transparente para
          // que nenhum ícone (nem o do template) apareça. Splash definitivo é do designer.
          backgroundColor: THEME_BACKGROUND_LIGHT,
          image: './assets/provisorio/splash-transparente.png',
          imageWidth: 100,
          dark: {
            backgroundColor: THEME_BACKGROUND_DARK,
            image: './assets/provisorio/splash-transparente.png',
          },
        },
      ],
      [
        'expo-notifications',
        {
          // FALTA o ícone de notificação do Android (PNG 96x96, só branco sobre transparente),
          // asset do designer. Sem ele o Android mostra um quadrado/ícone genérico na barra.
          // Quando existir: icon: './assets/notificacao/icone-android.png'
          color: '#2A4C86', // PROVISÓRIO: azul do tema (theme.ts `blue`), tinge o ícone na bandeja.
        },
      ],
      'expo-secure-store',
      'expo-font',
      [
        // Comunidade (C3 + F2 de 2026-09-22): galeria e câmera, sem microfone. A câmera
        // só pede permissão quando a pessoa toca em Câmera no Criar post; sem este
        // texto de finalidade o iOS encerraria o app (ver cameraConfigured em foto.ts). No
        // iOS 14+ e no Android 13+ o seletor do sistema não pede permissão, mas o
        // módulo entra no binário mesmo com a Comunidade desligada, e a App Store
        // recusa binário que cita a fototeca sem texto de finalidade (ITMS-90683).
        'expo-image-picker',
        {
          photosPermission:
            'O app usa a sua galeria só quando você escolhe uma foto para publicar na comunidade da igreja.',
          cameraPermission:
            'O app usa a câmera só quando você escolhe tirar uma foto para publicar na comunidade da igreja.',
          microphonePermission: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      ...config.extra,
      appVariant: variant,
      ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
    },
  };
};
