import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import YouScreen from '@/app/(tabs)/voce';
import MinistryScreen from '@/app/ministerio';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, getDay, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { altarOfDay, listMinistries } from '@/journey/ministries';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetCompletionsCacheForTests } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
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

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Na RNTL 14, `fireEvent.press` é assíncrono (envolve `act`). Um toque não
// aguardado no fim de um teste sobrepõe o `act` da limpeza automática e deixa
// as renderizações seguintes presas no estado de carregamento: por isso todo
// `fireEvent.press` abaixo é aguardado.
jest.mock('@/reminders/reminders', () => ({
  syncMinistryReminders: jest.fn().mockResolvedValue({ ok: true }),
  syncAltarReminders: jest.fn().mockResolvedValue({ ok: true }),
}));

const mockRouter = jest.requireMock('expo-router').router as { push: jest.Mock };
const reminders = jest.requireMock('@/reminders/reminders') as {
  syncMinistryReminders: jest.Mock;
  syncAltarReminders: jest.Mock;
};
const CAMPAIGN = BUNDLED_CONTENT.campaign.id;

/**
 * Coloca o conteúdo REAL da igreja no dia informado. É o dataset embarcado, com
 * a escala de 39 ministérios; só a data de início muda, para que "hoje" seja o
 * dia pedido independentemente de quando o teste roda.
 */
function loadCampaignOnDay(day: number) {
  const base = BUNDLED_CONTENT;
  const [y, m, d] = calendarDateInCampaignTz(new Date(), base.campaign).split('-').map(Number);
  const startMs = Date.UTC(y, m - 1, d) - (day - 1) * 86_400_000;
  const result = loadDataset(
    { ...base, campaign: { ...base.campaign, start_date: new Date(startMs).toISOString().slice(0, 10) } },
    'development',
  );
  if (!result.ok) throw new Error('O dataset de teste não passou no validador.');
}

async function seedSettings(patch: Record<string, unknown> = {}) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }),
  );
  _resetSettingsCacheForTests();
}

const indexOf = (name: string) => listMinistries().findIndex((m) => m.name === name);

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  mockRouter.push.mockClear();
  reminders.syncMinistryReminders.mockClear();
  reminders.syncAltarReminders.mockClear();
  loadCampaignOnDay(17);
});

afterAll(() => {
  resetToBundledContent();
});

describe('tela Meu ministério', () => {
  test('lista os 39 ministérios da escala real, sem nomes de líderes, com "Não faço parte" marcado', async () => {
    await seedSettings();
    await render(<MinistryScreen />);
    await waitFor(() => expect(screen.getByTestId('ministry-none')).toBeTruthy());

    expect(screen.getAllByTestId(/^ministry-\d+$/)).toHaveLength(39);
    expect(screen.getByText('À Mesa')).toBeTruthy();
    expect(screen.getByText('Kids')).toBeTruthy();
    expect(screen.getByText(/Dias 30 e 80 · \d\d\/\d\d e \d\d\/\d\d/)).toBeTruthy();
    expect(screen.getByText(/24 dias · a cada 4 a 5 dias, a partir de \d\d\/\d\d/)).toBeTruthy();

    // Sem escolha: nenhum dia destacado e a primeira opção marcada.
    expect(screen.getByTestId('ministry-none').props.accessibilityState.checked).toBe(true);
    expect(screen.queryByTestId('ministry-days')).toBeNull();

    // Os nomes das pessoas da escala existem no dataset e NUNCA chegam à tela.
    for (const day of [1, 17, 30]) {
      const label = getDay(day)?.altar?.leaders_label;
      expect(label).toBeTruthy();
      expect(screen.queryByText(label as string, { exact: false })).toBeNull();
    }
    expect(screen.getByText(/Fica só neste aparelho/)).toBeTruthy();
    expect(screen.getByTestId('content-banner')).toBeTruthy();
  });

  test('escolher "Kids" grava só neste aparelho, mostra os dias no altar e agenda as vésperas', async () => {
    await seedSettings();
    await render(<MinistryScreen />);
    await waitFor(() => expect(screen.getByTestId('ministry-none')).toBeTruthy());

    await fireEvent.press(screen.getByTestId(`ministry-${indexOf('Kids')}`));

    await waitFor(() => expect(screen.getByTestId('ministry-days')).toBeTruthy());
    expect((await loadSettings()).ministry).toBe('Kids');
    expect(screen.getByText('Seus dias no altar')).toBeTruthy();
    expect(screen.getByText(/^Dia 30 · \d\d\/\d\d\/\d{4} · Família$/)).toBeTruthy();
    expect(screen.getByText(/^Dia 80 · \d\d\/\d\d\/\d{4} · Educação$/)).toBeTruthy();
    expect(screen.getByTestId(`ministry-${indexOf('Kids')}`).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId('ministry-none').props.accessibilityState.checked).toBe(false);
    expect(reminders.syncMinistryReminders).toHaveBeenCalledWith(
      'Kids',
      [30, 80],
      expect.objectContaining({ id: CAMPAIGN }),
      expect.any(Date),
    );
    expect(screen.queryByTestId('ministry-notice')).toBeNull();

    // "Não faço parte" zera a escolha e some com o bloco de dias.
    await fireEvent.press(screen.getByTestId('ministry-none'));
    await waitFor(async () => expect((await loadSettings()).ministry).toBeNull());
    await waitFor(() => expect(screen.queryByTestId('ministry-days')).toBeNull());
    expect(screen.getByTestId('ministry-none').props.accessibilityState.checked).toBe(true);
  });

  test('a intercessão, com 24 dias, lista todos eles no bloco de destaque', async () => {
    await seedSettings({ ministry: 'Intercessão/Bálsamo' });
    await render(<MinistryScreen />);
    await waitFor(() => expect(screen.getByTestId('ministry-days')).toBeTruthy());
    expect(screen.getAllByText(/^Dia \d+ · \d\d\/\d\d\/\d{4} · /)).toHaveLength(24);
    expect(screen.getByText(/^Dia 1 · \d\d\/\d\d\/\d{4} · Igreja$/)).toBeTruthy();
    expect(screen.getByText(/^Dia 100 · \d\d\/\d\d\/\d{4} · Família$/)).toBeTruthy();
  });

  test('quando o sistema recusa agendar, mostra o motivo e mantém a escolha', async () => {
    reminders.syncMinistryReminders.mockResolvedValueOnce({
      ok: false,
      reason: 'Permissão de notificações negada. Você pode ativar nos ajustes do sistema.',
    });
    await seedSettings();
    await render(<MinistryScreen />);
    await waitFor(() => expect(screen.getByTestId('ministry-none')).toBeTruthy());

    await fireEvent.press(screen.getByTestId(`ministry-${indexOf('Kids')}`));

    await waitFor(() => expect(screen.getByTestId('ministry-notice')).toBeTruthy());
    expect(screen.getByText(/Permissão de notificações negada/)).toBeTruthy();
    // Destacar os dias não depende do aviso: a escolha fica.
    expect((await loadSettings()).ministry).toBe('Kids');
    expect(screen.getByTestId('ministry-days')).toBeTruthy();
  });
});

describe('Você: comunidade e aviso do altar', () => {
  test('"Meu ministério" e "Altar de hoje" substituem "Meu grupo"', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-ministry')).toBeTruthy());

    expect(screen.queryByTestId('row-group')).toBeNull();
    expect(screen.getByText('Escolher')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('row-ministry'));
    expect(mockRouter.push).toHaveBeenCalledWith('/ministerio');

    // O altar de hoje vem já filtrado: ministério sim, nome de pessoa não.
    const today = altarOfDay(17);
    expect(today?.ministry).toBeTruthy();
    expect(today?.leaders_label).toBeNull();
    expect(screen.getByText(today?.ministry as string)).toBeTruthy();
    const rawLabel = getDay(17)?.altar?.leaders_label as string;
    expect(rawLabel).toBeTruthy();
    expect(screen.queryByText(rawLabel, { exact: false })).toBeNull();
    await fireEvent.press(screen.getByTestId('row-altar-today'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/juntos');
  });

  test('a linha mostra o ministério escolhido', async () => {
    await seedSettings({ ministry: 'Kids' });
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('row-ministry')).toBeTruthy());
    expect(screen.getByText('Kids')).toBeTruthy();
    expect(screen.queryByText('Escolher')).toBeNull();
  });

  test('o aviso do altar liga, agenda a janela e desliga', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-reminder-toggle')).toBeTruthy());
    expect(screen.getByTestId('altar-reminder-toggle').props.accessibilityState.checked).toBe(false);
    expect(screen.getByText('Um aviso local por dia com quem conduz o altar. Só neste aparelho.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));
    await waitFor(async () => expect((await loadSettings()).altarReminder).toBe(true));
    await waitFor(() =>
      expect(reminders.syncAltarReminders).toHaveBeenCalledWith(
        true,
        expect.objectContaining({ id: CAMPAIGN }),
        expect.any(Date),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('altar-reminder-toggle').props.accessibilityState.checked).toBe(true),
    );
    expect(screen.queryByTestId('altar-reminder-notice')).toBeNull();

    // Desligar só grava a preferência; o hook do layout cancela os agendamentos.
    reminders.syncAltarReminders.mockClear();
    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));
    await waitFor(async () => expect((await loadSettings()).altarReminder).toBe(false));
    await waitFor(() =>
      expect(screen.getByTestId('altar-reminder-toggle').props.accessibilityState.checked).toBe(false),
    );
    expect(reminders.syncAltarReminders).not.toHaveBeenCalled();
  });

  test('sem permissão (ou na web) o motivo aparece como aviso e a caixa volta a desligada', async () => {
    reminders.syncAltarReminders.mockResolvedValueOnce({
      ok: false,
      reason: 'Notificações locais não são suportadas na web.',
    });
    await seedSettings();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('altar-reminder-toggle')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('altar-reminder-toggle'));

    await waitFor(() => expect(screen.getByTestId('altar-reminder-notice')).toBeTruthy());
    expect(screen.getByText('Notificações locais não são suportadas na web.')).toBeTruthy();
    expect((await loadSettings()).altarReminder).toBe(false);
    expect(screen.getByTestId('altar-reminder-toggle').props.accessibilityState.checked).toBe(false);
  });
});
