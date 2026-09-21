import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MilestoneScreen from '@/app/marco/[day]';
import { formatReference } from '@/bible/references';
import { getDay, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { devDataset } from '@/journey/fixtures/devCampaign';
import { milestoneForDay } from '@/journey/milestones';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, getCachedSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
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

let mockParams: { day: string } = { day: '25' };

const mockRouter = jest.requireMock('expo-router').router as { back: jest.Mock; replace: jest.Mock };

const CAMPAIGN = 'dev-fixture-campaign';

/** Coloca a campanha ativa no dia informado, sem depender do relógio da máquina. */
function loadCampaignOnDay(day: number) {
  const base = devDataset();
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('fixture inválida no teste');
}

async function completeDays(days: number[]) {
  for (const day of days) await setDayCompleted(CAMPAIGN, day, true);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.back.mockClear();
  mockRouter.replace.mockClear();
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, milestonesSeen: [] }));
  _resetSettingsCacheForTests();
  // A igreja está no dia 60; a pessoa entrou tarde e só agora fez a 25ª leitura.
  loadCampaignOnDay(60);
});

afterEach(() => {
  resetToBundledContent();
});

/**
 * O marco é disparado pela CONTAGEM de leituras da pessoa, não pelo dia oficial
 * da igreja. A tela não pode, portanto, descrever o dia de calendário homônimo:
 * quem entra atrasado leria a data, o monte e a ênfase de um dia que talvez nem
 * tenha lido. A separação entre progresso pessoal e dia oficial é a espinha do
 * produto.
 */
describe('E3 · marco intermediário', () => {
  // 25 leituras SALTEADAS, espalhadas entre os dias 11 e 59: nunca "de 1 até 25".
  const READ = Array.from({ length: 25 }, (_, i) => 11 + i * 2);

  beforeEach(async () => {
    mockParams = { day: '25' };
    await completeDays(READ);
  });

  test('fala em leituras concluídas, não no dia do calendário', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Marco · 25 de 100 dias lidos')).toBeTruthy());
    // Sem o "·" no leitor de tela (REGRAS 32).
    expect(screen.getByLabelText('Marco: 25 de 100 dias lidos')).toBeTruthy();
    // Nenhuma data: o dia 25 da igreja não tem relação com a 25ª leitura dela.
    expect(screen.queryByText(/\d\d\/\d\d\/\d{4}/)).toBeNull();
  });

  test('não descreve o monte nem a ênfase do dia homônimo', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-continue')).toBeTruthy());
    const day25 = getDay(25);
    if (!day25?.title) throw new Error('fixture do dia 25 sem título');
    expect(screen.queryByText(day25.title)).toBeNull();
    expect(screen.queryByLabelText(/Monte do dia/)).toBeNull();
  });

  test('cópia do desenho: rótulo, frase, botões', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-label')).toBeTruthy());
    expect(screen.getByText('Um quarto da jornada')).toBeTruthy();
    expect(screen.getByText('Vinte e cinco dias de Palavra. Você não desistiu.')).toBeTruthy();
    expect(screen.getByText('Continuar a jornada')).toBeTruthy();
    expect(screen.getByText('Guardar este marco')).toBeTruthy();
    // O aviso de conteúdo (C-07) continua obrigatório.
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('a régua marca os dias que a pessoa leu, não 1 até o número do marco', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByLabelText('Régua com os 25 dias que você já leu, de 100.')).toBeTruthy());
  });

  test('é gravado como visto ao abrir, não só no botão (aparece uma vez)', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(getCachedSettings()?.milestonesSeen).toEqual([25]));
  });

  test('"Guardar este marco" grava de verdade antes de confirmar, e não promete um lugar em Você', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(getCachedSettings()?.milestonesSeen).toEqual([25]));
    // Apaga o registro da abertura: a confirmação tem de vir da gravação do toque.
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, milestonesSeen: [] }));
    _resetSettingsCacheForTests();
    fireEvent.press(screen.getByTestId('milestone-keep'));
    await waitFor(() => expect(screen.getByText('Marco guardado')).toBeTruthy());
    const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_KEY)) ?? '{}');
    expect(stored.milestonesSeen).toEqual([25]);
    expect(screen.queryByText(/em Você/)).toBeNull();
    // Retorno em cor plena: o botão não fica desabilitado a 0,45 (R3-5).
    expect(screen.getByTestId('milestone-keep').props.accessibilityState).toMatchObject({ disabled: false });
  });

  test('"Continuar a jornada" fecha a tela', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-continue')).toBeTruthy());
    fireEvent.press(screen.getByTestId('milestone-continue'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test.each([7, 50, 75])('o marco %i usa o rótulo do desenho', async (n) => {
    mockParams = { day: String(n) };
    await completeDays(Array.from({ length: n }, (_, i) => i + 1));
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-label')).toBeTruthy());
    expect(screen.getByText(milestoneForDay(n)!.label)).toBeTruthy();
  });
});

describe('E3/E4 · a rota só existe para quem alcançou o marco', () => {
  test('/marco/25 com 2 leituras não afirma "25 dias lidos"', async () => {
    mockParams = { day: '25' };
    await completeDays([3, 47]);
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Marco não encontrado')).toBeTruthy());
    expect(screen.queryByText(/25 de 100 dias lidos/)).toBeNull();
    expect(getCachedSettings()?.milestonesSeen).toEqual([]);
  });

  test('/marco/100 antes das 100 leituras não revela nada do Dia 100', async () => {
    mockParams = { day: '100' };
    await completeDays([1, 2, 3]);
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Marco não encontrado')).toBeTruthy());
    expect(screen.queryByTestId('milestone-verse')).toBeNull();
    expect(screen.queryByText(/Chegada/)).toBeNull();
  });
});

describe('E4 · chegada do Dia 100', () => {
  beforeEach(async () => {
    mockParams = { day: '100' };
    loadCampaignOnDay(100);
    await completeDays(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  test('mantém o dia e a data, porque 100 leituras implicam ter lido o Dia 100', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText(/^Chegada · Dia 100 · \d\d\/\d\d\/\d{4}$/)).toBeTruthy());
    expect(screen.getByLabelText(/^Chegada, dia 100, \d\d\/\d\d\/\d{4}$/)).toBeTruthy();
  });

  test('título do desenho e referência do versículo-base vinda do dataset', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Cem dias. Você atravessou a jornada inteira.')).toBeTruthy());
    const ref = getDay(100)?.key_verse_reference;
    if (!ref) throw new Error('fixture do dia 100 sem versículo-base');
    // Só a referência — nunca o versículo.
    expect(screen.getByTestId('milestone-verse').props.children).toBe(formatReference(ref));
    // A ênfase do Dia 100 não é mais o título (TELAS E4).
    const title = getDay(100)?.title;
    if (title) expect(screen.queryByText(title)).toBeNull();
  });

  test('três números reais e locais, empilhados, e o jejum pode sair sem mudar a forma', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByTestId('milestone-stats')).toBeTruthy());
    expect(screen.getByLabelText('100 dias lidos')).toBeTruthy();
    expect(screen.getByLabelText('0 reflexões escritas')).toBeTruthy();
    expect(screen.getByLabelText('0 dias de jejum')).toBeTruthy();
    // Pilha (coluna), não linha de três colunas.
    const stack = screen.getByTestId('milestone-stats');
    expect([undefined, 'column']).toContain((stack.props.style ?? {}).flexDirection);
  });

  test('botões do desenho, e "Ver minhas reflexões" vai às reflexões', async () => {
    await render(<MilestoneScreen />);
    await waitFor(() => expect(screen.getByText('Continuar a jornada')).toBeTruthy());
    expect(screen.queryByText('Guardar minha jornada')).toBeNull();
    expect(screen.getByTestId('content-banner')).toBeTruthy();
    fireEvent.press(screen.getByTestId('milestone-reflections'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/reflexoes');
    // Já estava gravado como visto antes do toque: a chegada não volta.
    await waitFor(() => expect(getCachedSettings()?.milestonesSeen).toContain(100));
  });
});
