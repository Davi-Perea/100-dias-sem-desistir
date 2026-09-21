import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import ReaderScreen from '@/app/reader/[day]';
import { expandChapters, parseReference } from '@/bible/references';
import { getDay, loadDataset } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import type { JourneyDataset } from '@/journey/types';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { BIBLIA_LIVRE_NOTICE, bibliaLivreProvider } from '@/reader/bibliaLivreProvider';
import { setBibleProvider } from '@/reader/provider';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, SETTINGS_KEY } from '@/settings/settingsStore';

import { resetViewport } from './support/viewport';

let mockDay = '17';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ day: mockDay }),
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const TODAY = 17;

function loadCampaignOnDay(day: number) {
  const base: JourneyDataset = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error(result.validation.issues.map((i) => i.message).join('\n'));
}

function ref(raw: string) {
  const parsed = parseReference(raw);
  if (!parsed) throw new Error(raw);
  return parsed;
}

describe('provedor da Bíblia Livre', () => {
  test('metadados: Bíblia Livre, texto real, atribuição CC BY e indicação de alteração', () => {
    const meta = bibliaLivreProvider.getMetadata();
    expect(meta.name).toBe('Bíblia Livre');
    expect(meta.isDevPlaceholder).toBe(false);
    expect(meta.attributionRequired).toBe(true);
    expect(meta.cachePolicy).toBe('bundled');
    expect(meta.offlineAvailable).toBe(true);
    expect(meta.copyrightNotice).toBe(BIBLIA_LIVRE_NOTICE);
    expect(meta.copyrightNotice).toContain('Diego Santos, Mario Sérgio, e Marco Teles');
    expect(meta.copyrightNotice).toContain('Creative Commons Atribuição 4.0 Brasil');
    expect(meta.copyrightNotice).toContain('não endossam necessariamente');
    expect(meta.copyrightNotice).toContain('sem itálico');
  });

  test('Gênesis 1 e João 3 vêm com versículos numerados pela fonte', async () => {
    const gen = await bibliaLivreProvider.getPassage(ref('GEN 1'));
    expect(gen.bookName).toBe('Gênesis');
    expect(gen.verses).toHaveLength(31);
    expect(gen.verses[0]).toEqual({ verse: 1, text: 'No princípio criou Deus os céus e a terra.' });
    const jhn = await bibliaLivreProvider.getPassage(ref('JHN 3:16'));
    expect(jhn.verses).toHaveLength(1);
    expect(jhn.verses[0].verse).toBe(16);
    expect(jhn.verses[0].text).toMatch(/^Porque Deus amou ao mundo de tal maneira/);
  });

  test('título do salmo sai em heading, fora dos versículos', async () => {
    const psa = await bibliaLivreProvider.getPassage(ref('PSA 3'));
    expect(psa.heading).toMatch(/^Salmo de Davi/);
    expect(psa.verses[0].text).toMatch(/^Ah SENHOR/);
  });

  test('capítulo ou livro inexistente é erro (o leitor mostra o F5), nunca texto inventado', async () => {
    await expect(bibliaLivreProvider.getPassage(ref('GEN 51'))).rejects.toThrow();
    await expect(bibliaLivreProvider.getPassage({ ...ref('GEN 1'), book: 'XYZ' })).rejects.toThrow();
  });

  test('carrega cada livro sob demanda: importar o provedor não lê livro nenhum', async () => {
    const loaded: string[] = [];
    await jest.isolateModulesAsync(async () => {
      for (const id of ['GEN', 'EXO', 'JHN']) {
        jest.doMock(`../../content/biblia-livre/livros/${id}.json`, () => {
          loaded.push(id);
          return JSON.parse(readFileSync(join(__dirname, '..', '..', 'content', 'biblia-livre', 'livros', `${id}.json`), 'utf8'));
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { bibliaLivreProvider: fresh } = require('@/reader/bibliaLivreProvider') as typeof import('@/reader/bibliaLivreProvider');
      fresh.getMetadata();
      expect(loaded).toEqual([]);
      await fresh.getPassage(ref('GEN 1'));
      expect(loaded).toEqual(['GEN']);
      await fresh.getPassage(ref('GEN 2'));
      expect(loaded).toEqual(['GEN']);
      await fresh.getPassage(ref('JHN 3'));
      expect(loaded).toEqual(['GEN', 'JHN']);
    });
  });

  test('o _layout registra a Bíblia Livre, não o provedor de desenvolvimento', () => {
    const source = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
    expect(source).toContain('setBibleProvider(bibliaLivreProvider)');
    expect(source).not.toContain('setBibleProvider(devBibleProvider)');
  });
});

describe('leitor do dia com a Bíblia Livre', () => {
  beforeEach(async () => {
    resetViewport();
    await AsyncStorage.clear();
    _resetCompletionsCacheForTests();
    _resetReflectionsCacheForTests();
    setBibleProvider(bibliaLivreProvider);
    mockDay = String(TODAY);
    loadCampaignOnDay(TODAY);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app' }));
    _resetSettingsCacheForTests();
  });

  test('sai do modo guia sozinho: mostra o texto do capítulo e a atribuição no fim', async () => {
    const first = (getDay(TODAY)?.readings ?? []).flatMap((r) => expandChapters(r.canonical_reference))[0];
    const passage = await bibliaLivreProvider.getPassage(ref(`${first.book} ${first.chapter}`));

    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-attribution')).toBeTruthy());
    expect(screen.queryByTestId('reader-guide')).toBeNull();
    expect(screen.getByTestId('reader-attribution').props.children).toBe(BIBLIA_LIVRE_NOTICE);
    expect(screen.getByLabelText(`Versículo 1. ${passage.verses[0].text}`)).toBeTruthy();
    expect(screen.getAllByLabelText(/^Versículo \d+\. /)).toHaveLength(passage.verses.length);
  });

  test('nenhuma nota de rodapé nem marcador USFM chega à tela (Gênesis 3)', async () => {
    const provider = {
      ...bibliaLivreProvider,
      getPassage: () => bibliaLivreProvider.getPassage(ref('GEN 3')),
    };
    setBibleProvider(provider);
    await render(<ReaderScreen />);
    await waitFor(() => expect(screen.getByTestId('reader-attribution')).toBeTruthy());
    const verse5 = screen.getByLabelText(/^Versículo 5\. /);
    expect(verse5.props.accessibilityLabel).toContain('e sereis como deuses, sabendo o bem e o mal.');
    // A nota de Gn 3:5 era "Ou: sereis como Deus"; a de 3:15, "Lit. ele".
    expect(screen.queryByText(/Ou: sereis como Deus/)).toBeNull();
    expect(screen.queryByText(/Lit\. ele/)).toBeNull();
    for (const node of screen.getAllByLabelText(/^Versículo \d+\. /)) {
      expect(node.props.accessibilityLabel).not.toMatch(/\\/);
    }
  });
});
