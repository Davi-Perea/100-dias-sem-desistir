import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import {
  _resetFastingCacheForTests,
  fastingKeptCount,
  fastingKeptDays,
  isFastingKept,
  loadFasting,
  resetFasting,
  setFastingKept,
} from '@/fasting/fastingStore';
import {
  _resetCompletionsCacheForTests,
  completedCount,
  completedDayNumbers,
  COMPLETIONS_PREFIX,
  daysSinceLastCompletion,
  isDayCompleted,
  loadCompletions,
  pendingDaysUpTo,
  setDayCompleted,
} from '@/progress/completionsStore';
import {
  _resetReflectionsCacheForTests,
  deleteReflection,
  getReflection,
  loadReflections,
  reflectionCount,
  saveReflection,
} from '@/reflections/reflectionsStore';

const CAMPAIGN = 'dev-fixture-campaign';

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
});

describe('progresso local', () => {
  test('marcar um dia grava no disco e sobrevive a uma nova sessão', async () => {
    await setDayCompleted(CAMPAIGN, 17, true);
    const raw = await AsyncStorage.getItem(`${COMPLETIONS_PREFIX}${CAMPAIGN}`);
    expect(Object.keys(JSON.parse(raw!).days)).toEqual(['17']);

    _resetCompletionsCacheForTests();
    const reloaded = await loadCompletions(CAMPAIGN);
    expect(isDayCompleted(reloaded, 17)).toBe(true);
    expect(completedCount(reloaded)).toBe(1);
  });

  test('desfazer remove o dia e é idempotente', async () => {
    await setDayCompleted(CAMPAIGN, 17, true);
    await setDayCompleted(CAMPAIGN, 17, true);
    await setDayCompleted(CAMPAIGN, 17, false);
    await setDayCompleted(CAMPAIGN, 17, false);
    expect(completedDayNumbers(await loadCompletions(CAMPAIGN))).toEqual([]);
  });

  test('entrada tardia: concluir o dia 17 não exige os dias 1 a 16', async () => {
    await setDayCompleted(CAMPAIGN, 17, true);
    const completions = await loadCompletions(CAMPAIGN);
    expect(completedCount(completions)).toBe(1);
    // Os dias anteriores continuam disponíveis e pendentes, nunca "falhados".
    expect(pendingDaysUpTo(completions, 17)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  test('retomada após intervalo é medida em dias, sem punição', async () => {
    await setDayCompleted(CAMPAIGN, 12, true);
    const completions = await loadCompletions(CAMPAIGN);
    expect(daysSinceLastCompletion(completions, 17)).toBe(5);
    expect(daysSinceLastCompletion(null, 17)).toBeNull();
  });

  test('dados corrompidos no disco não quebram o app', async () => {
    await AsyncStorage.setItem(`${COMPLETIONS_PREFIX}${CAMPAIGN}`, '{quebrado');
    expect(completedCount(await loadCompletions(CAMPAIGN))).toBe(0);
  });
});

describe('jejum (privado)', () => {
  test('registra e limpa dias', async () => {
    await setFastingKept(CAMPAIGN, 17, true);
    expect(isFastingKept(await loadFasting(CAMPAIGN), 17)).toBe(true);
    expect(fastingKeptDays(await loadFasting(CAMPAIGN))).toEqual([17]);

    await setFastingKept(CAMPAIGN, 17, false);
    expect(fastingKeptCount(await loadFasting(CAMPAIGN))).toBe(0);
  });

  test('vive numa chave própria, separada de progresso e reflexões', async () => {
    await setDayCompleted(CAMPAIGN, 17, true);
    await setFastingKept(CAMPAIGN, 17, true);
    await saveReflection(CAMPAIGN, 17, 'texto');
    const keys = [...(await AsyncStorage.getAllKeys())];
    expect(keys.sort()).toEqual([
      `completions:v1:${CAMPAIGN}`,
      `fasting:v1:${CAMPAIGN}`,
      `reflections:v1:${CAMPAIGN}`,
    ]);
  });

  test('apagar o jejum não afeta o progresso', async () => {
    await setDayCompleted(CAMPAIGN, 17, true);
    await setFastingKept(CAMPAIGN, 17, true);
    await resetFasting(CAMPAIGN);
    expect(fastingKeptCount(await loadFasting(CAMPAIGN))).toBe(0);
    expect(completedCount(await loadCompletions(CAMPAIGN))).toBe(1);
  });
});

describe('reflexões privadas', () => {
  test('salvar, editar e excluir', async () => {
    await saveReflection(CAMPAIGN, 17, '  primeira versão  ');
    expect(getReflection(await loadReflections(CAMPAIGN), 17)).toBe('primeira versão');

    await saveReflection(CAMPAIGN, 17, 'segunda versão');
    expect(getReflection(await loadReflections(CAMPAIGN), 17)).toBe('segunda versão');

    await deleteReflection(CAMPAIGN, 17);
    expect(reflectionCount(await loadReflections(CAMPAIGN))).toBe(0);
  });

  test('texto em branco não cria registro', async () => {
    await saveReflection(CAMPAIGN, 17, '   ');
    expect(reflectionCount(await loadReflections(CAMPAIGN))).toBe(0);
  });
});

/**
 * Garantia estrutural do spec §9 e §11: jejum e reflexão são local-only.
 * Se alguém acrescentar um caminho de rede a esses módulos, este teste quebra.
 */
describe('garantia de privacidade local', () => {
  const read = (relative: string) =>
    fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');

  test.each([['fasting/fastingStore.ts'], ['reflections/reflectionsStore.ts']])(
    '%s não contém caminho de rede',
    (file) => {
      const source = read(file);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/XMLHttpRequest|axios|supabase|https?:\/\//i);
    },
  );

  /**
   * O spec permite saber SE a pessoa optou pelo jejum no onboarding, mas proíbe
   * analytics do conteúdo: reflexão, texto de insight, oração, e-mail e nome.
   * Aqui checamos que nenhum evento declara campo capaz de carregar esse conteúdo.
   */
  test('nenhum evento de analytics declara campo de conteúdo do usuário', () => {
    const source = read('analytics/analytics.ts');
    const forbiddenFields = /\b(body|text|content|reflection|note|prayer|insightText|email|displayName|userName)\s*[?]?\s*:/;
    const eventTypes = source.slice(source.indexOf('export type AnalyticsEvent'));
    expect(eventTypes).not.toMatch(forbiddenFields);
  });

  test('o registro de jejum diário nunca é enviado a analytics', () => {
    const source = read('analytics/analytics.ts');
    expect(source).not.toMatch(/fasting_(kept|completed|logged)/);
    // O único uso permitido é o booleano de opt-in no fim do onboarding.
    const fastingMentions = source.match(/fasting/g) ?? [];
    expect(fastingMentions).toHaveLength(1);
  });
});
