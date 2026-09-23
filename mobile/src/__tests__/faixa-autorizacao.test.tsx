/**
 * Faixa de autorização e contato (feedback do fundador, 2026-09-22, na prévia
 * do Dia 23).
 *
 * 1. A faixa "Conteúdo real dos 100 Dias, aguardando autorização…" saiu de
 *    TODAS as telas. Como toda tela tirava essa faixa do mesmo componente
 *    (`DevContentBanner`), a garantia é dupla: o componente não desenha nada
 *    fora das fixtures DEV, e nenhuma tela escreve a faixa por conta própria.
 *    No lugar ficou uma linha discreta em Ajustes, que some sozinha quando o
 *    dataset virar `authorized`.
 *
 *    O que NÃO é aferido aqui porque não mudou: a trava de publicação
 *    (`assertRightsForStore` no app.config.ts e `assertProductionReady` na
 *    abertura de um release), coberta por `nuvem-correcoes` e `content100Dias`.
 *
 * 2. Nada de rótulo de e-mail sem e-mail: sem `SUPPORT_EMAIL` a seção de
 *    contato da Ajuda some inteira — cap, filete e linha.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';
import { Linking } from 'react-native';

import SettingsScreen from '@/app/ajustes';
import HelpScreen from '@/app/ajuda';
import PrivacyScreen from '@/app/privacidade';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { devBibleProvider } from '@/reader/devProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';
import { DevContentBanner } from '@/ui/components';

jest.mock('react-native-reanimated', () => jest.requireActual('./support/reanimatedVoceMock'));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({}),
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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// O contato é do fundador e chega vazio no repositório; o teste o controla.
const mockContact: { email: string | null; privacy: string | null } = { email: null, privacy: null };
jest.mock('@/config/contato', () => ({
  get SUPPORT_EMAIL() {
    return mockContact.email;
  },
  get PRIVACY_URL() {
    return mockContact.privacy;
  },
}));

const SRC = path.join(__dirname, '..');

/** Todo arquivo de tela e de interface (fora dos testes). */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(path.join(SRC, 'app'));
  walk(path.join(SRC, 'ui'));
  return out;
}

/**
 * Cópia PENDENTE do conteúdo real. Desde 23/09/2026 o dataset embarcado está
 * autorizado, então o estado pendente precisa ser construído aqui para ser
 * testado. Isso deixa estas provas independentes da situação de direitos do
 * dia: elas testam a TELA, não a autorização vigente.
 */
function pendingCopy(): JourneyDataset {
  return {
    ...BUNDLED_CONTENT,
    provenance: {
      ...BUNDLED_CONTENT.provenance,
      rights_status: 'pending_authorization',
      rights_reference: null,
    },
  };
}

/** Cópia autorizada do conteúdo real. O `dataset.json` NUNCA é editado. */
function authorizedCopy(): JourneyDataset {
  return {
    ...BUNDLED_CONTENT,
    provenance: {
      ...BUNDLED_CONTENT.provenance,
      rights_status: 'authorized',
      // O validador exige a referência da autorização junto com o status.
      rights_reference: 'autorizacao-de-teste',
    },
  };
}

async function seedSettings() {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }),
  );
  _resetSettingsCacheForTests();
}

let openURL: jest.SpyInstance;

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockContact.email = null;
  mockContact.privacy = null;
  setBibleProvider(devBibleProvider);
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  resetToBundledContent();
});

afterEach(() => {
  openURL.mockRestore();
});

afterAll(() => {
  resetToBundledContent();
});

describe('a faixa de autorização saiu das telas', () => {
  test('o conteúdo real pendente não desenha faixa nenhuma', async () => {
    const { toJSON } = await render(<DevContentBanner state="pending" />);
    expect(toJSON()).toBeNull();
  });

  test('o conteúdo autorizado também não desenha faixa', async () => {
    const { toJSON } = await render(<DevContentBanner state="authorized" />);
    expect(toJSON()).toBeNull();
  });

  test('a fixture DEV continua avisada em toda tela (REGRAS §17–18)', async () => {
    await render(<DevContentBanner state="fixture" compact />);
    expect(screen.getByTestId('content-banner')).toBeTruthy();
    expect(screen.getByText('Conteúdo de desenvolvimento.')).toBeTruthy();
  });

  test('a cópia da faixa não sobrou escrita em nenhum arquivo de tela', () => {
    const sobras = sourceFiles().filter((file) => {
      const code = fs.readFileSync(file, 'utf8');
      return (
        code.includes('Conteúdo real dos 100 Dias') ||
        code.includes('Aguardando autorização da igreja.') ||
        code.includes('Não distribuir esta versão')
      );
    });
    expect(sobras).toEqual([]);
  });

  test('nenhuma tela monta a faixa por fora do componente', () => {
    const donos = sourceFiles()
      .filter((file) => fs.readFileSync(file, 'utf8').includes('content-banner'))
      .map((file) => path.relative(SRC, file).replace(/\\/g, '/'));
    expect(donos).toEqual(['ui/components.tsx']);
  });

  test('Ajuda mostra a situação dos direitos em texto, sem faixa em cima', async () => {
    await render(<HelpScreen />);
    await waitFor(() => expect(screen.getByTestId('help-rights')).toBeTruthy());
    expect(screen.queryByTestId('content-banner')).toBeNull();
    // A linha de direitos continua, em palavras e sem o valor técnico (F5).
    expect(screen.getByTestId('help-rights').props.children.join('')).toMatch(
      // Autorizado pela igreja em 23/09/2026 (autorizacao-2026-09-23).
      /Situação dos direitos: autorizado pela igreja./,
    );
    expect(screen.queryByText(/pending_authorization/)).toBeNull();
  });
});

describe('a pendência vira uma linha discreta em Ajustes', () => {
  test('com o conteúdo real pendente, a linha aparece uma vez e explica', async () => {
    expect(loadDataset(pendingCopy(), 'development').ok).toBe(true);
    await seedSettings();
    await render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('row-reflections')).toBeTruthy());

    expect(screen.getAllByTestId('rights-pending-note')).toHaveLength(1);
    expect(screen.getByText('Conteúdo aguardando autorização da igreja')).toBeTruthy();
    expect(screen.getByText(/ainda não foi autorizada por escrito/)).toBeTruthy();
    // Nem faixa nem o valor técnico do dado.
    expect(screen.queryByTestId('content-banner')).toBeNull();
    expect(screen.queryByText(/pending_authorization/)).toBeNull();
  });

  test('a linha não é alarme: nada de alerta para o leitor de tela', async () => {
    expect(loadDataset(pendingCopy(), 'development').ok).toBe(true);
    await seedSettings();
    await render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('rights-pending-note')).toBeTruthy());
    expect(screen.getByTestId('rights-pending-note').props.accessibilityRole).toBeUndefined();
  });

  test('com a autorização da igreja, a linha some sozinha', async () => {
    const result = loadDataset(authorizedCopy(), 'development');
    expect(result.ok).toBe(true);
    await seedSettings();
    await render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('row-reflections')).toBeTruthy());

    expect(screen.queryByTestId('rights-pending-note')).toBeNull();
    expect(screen.queryByText(/autorização/i)).toBeNull();
  });
});

describe('contato: nada de rótulo sem valor', () => {
  test('sem e-mail, a seção inteira some e o título não promete contato', async () => {
    await render(<HelpScreen />);
    await waitFor(() => expect(screen.getByText('Ajuda')).toBeTruthy());
    expect(screen.queryByText('Ajuda e contato')).toBeNull();
    expect(screen.queryByTestId('help-contact')).toBeNull();
    expect(screen.queryByText('Fale com a gente')).toBeNull();
    expect(screen.queryByText('Enviar um e-mail')).toBeNull();
  });

  test('e-mail só com espaços vale como e-mail nenhum', async () => {
    mockContact.email = '   ';
    await render(<HelpScreen />);
    await waitFor(() => expect(screen.getByText('Ajuda')).toBeTruthy());
    expect(screen.queryByTestId('help-contact')).toBeNull();
    expect(screen.queryByText('Enviar um e-mail')).toBeNull();
  });

  test('com e-mail preenchido, a linha aparece com o valor e abre o mailto', async () => {
    mockContact.email = 'contato@exemplo.org';
    await render(<HelpScreen />);
    await waitFor(() => expect(screen.getByText('Ajuda e contato')).toBeTruthy());
    const row = screen.getByTestId('help-contact');
    // O rótulo e o valor andam juntos, inclusive para o leitor de tela.
    expect(row.props.accessibilityLabel).toBe('Enviar um e-mail, contato@exemplo.org');
    await fireEvent.press(row);
    expect(openURL).toHaveBeenCalledWith('mailto:contato@exemplo.org');
  });

  test('espaços em volta do e-mail não vazam para a tela nem para o mailto', async () => {
    mockContact.email = '  contato@exemplo.org  ';
    await render(<HelpScreen />);
    await waitFor(() => expect(screen.getByTestId('help-contact')).toBeTruthy());
    expect(screen.getByText('contato@exemplo.org')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('help-contact'));
    expect(openURL).toHaveBeenCalledWith('mailto:contato@exemplo.org');
  });

  /*
   * A MESMA regra na outra superfície de contato (revisão final, 2026-09-22): a
   * Privacidade tem a linha "Política de privacidade completa", que só existe se
   * houver endereço. Sem este trim, uma URL só com espaços desenharia a linha e o
   * toque não abriria nada — rótulo sem valor, exatamente o que o fundador apontou.
   */
  test('sem endereço de política, a linha da Privacidade não existe', async () => {
    await render(<PrivacyScreen />);
    await waitFor(() => expect(screen.getByTestId('privacy-wipe')).toBeTruthy());
    expect(screen.queryByTestId('privacy-policy-link')).toBeNull();
    expect(screen.queryByText('Política de privacidade completa')).toBeNull();
  });

  test('endereço só com espaços vale como endereço nenhum', async () => {
    mockContact.privacy = '   ';
    await render(<PrivacyScreen />);
    await waitFor(() => expect(screen.getByTestId('privacy-wipe')).toBeTruthy());
    expect(screen.queryByTestId('privacy-policy-link')).toBeNull();
  });

  test('com endereço preenchido, a linha aparece e abre o endereço sem os espaços', async () => {
    mockContact.privacy = '  https://exemplo.org/privacidade  ';
    await render(<PrivacyScreen />);
    const row = await screen.findByTestId('privacy-policy-link');
    await fireEvent.press(row);
    expect(openURL).toHaveBeenCalledWith('https://exemplo.org/privacidade');
  });
});
