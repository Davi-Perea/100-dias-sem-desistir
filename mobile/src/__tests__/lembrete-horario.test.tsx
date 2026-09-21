import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import LembreteStep from '@/app/onboarding/lembrete';
import { getCampaign, getDay, resetToBundledContent } from '@/journey/datasetSource';
import { readingSummary } from '@/journey/readingSummary';
import { DAILY_TITLE, dailyBody, dailyReminderPlan, localDateTimeForDay } from '@/reminders/reminders';
import { _resetSettingsCacheForTests, getCachedSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { PRESET_TIMES, ReminderTimePicker, type ReminderChoice } from '@/ui/lembrete/ReminderTimePicker';

/**
 * Lembrete com horário (pedido do fundador, 2026-09-21): chips 6:00, 7:00,
 * 12:00, 19:00, 21:00, "Outro horário" com o seletor do sistema, "Sem lembrete",
 * e todo dia da campanha chega "Hora de ler a Bíblia" com a leitura daquele dia.
 */

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  setNotificationChannelAsync: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
}));

// Seletor do sistema falso: a roda do iOS vira um botão que "gira" para 06:45,
// e o diálogo do Android devolve 05:30 como se a pessoa tivesse tocado em OK.
const mockAndroidOpen = jest.fn();
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  const Picker = ({ onValueChange, testID }: { onValueChange: (e: unknown, d: Date) => void; testID: string }) => (
    <Pressable
      testID={testID}
      onPress={() => {
        const d = new Date();
        d.setHours(6, 45, 0, 0);
        onValueChange({ nativeEvent: { timestamp: d.getTime(), utcOffset: 0 } }, d);
      }}
    >
      <Text>roda</Text>
    </Pressable>
  );
  return {
    __esModule: true,
    default: Picker,
    DateTimePickerAndroid: { open: (args: unknown) => mockAndroidOpen(args) },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: View,
    SafeAreaProvider: View,
  };
});

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() } }));

const mockSchedule = jest.fn();
jest.mock('@/reminders/reminders', () => {
  const actual = jest.requireActual('@/reminders/reminders');
  return {
    ...actual,
    scheduleDailyReminder: (...args: unknown[]) => mockSchedule(...args),
    cancelDailyReminder: jest.fn().mockResolvedValue(undefined),
  };
});

const originalOS = Platform.OS;
function setPlatform(os: string) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

const OFF: ReminderChoice = { slot: 'none', hour: 7, minute: 0 };

beforeEach(async () => {
  resetToBundledContent();
  setPlatform('ios');
  mockAndroidOpen.mockReset();
  mockSchedule.mockReset();
  mockSchedule.mockResolvedValue({ ok: true });
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
});

afterAll(() => setPlatform(originalOS));

/* -------------------------------------------------------- seletor único */

describe('ReminderTimePicker', () => {
  test('mostra os cinco horários prontos, "Outro horário" e "Sem lembrete", como rádios', async () => {
    await render(<ReminderTimePicker current={OFF} onChoose={jest.fn()} testIDPrefix="t" />);
    for (const label of ['6:00', '7:00', '12:00', '19:00', '21:00', 'Outro horário', 'Sem lembrete']) {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    }
    expect(PRESET_TIMES.map((t) => t.hour)).toEqual([6, 7, 12, 19, 21]);
    expect(screen.getByRole('radio', { name: 'Sem lembrete' }).props.accessibilityState.selected).toBe(true);
  });

  test('horário pronto escolhe na hora, com a faixa do dia no slot', async () => {
    const onChoose = jest.fn();
    await render(<ReminderTimePicker current={OFF} onChoose={onChoose} testIDPrefix="t" />);
    await fireEvent.press(screen.getByTestId('t-0600'));
    await fireEvent.press(screen.getByTestId('t-1200'));
    await fireEvent.press(screen.getByTestId('t-2100'));
    expect(onChoose.mock.calls.map((c) => c[0])).toEqual([
      { slot: 'morning', hour: 6, minute: 0 },
      { slot: 'afternoon', hour: 12, minute: 0 },
      { slot: 'evening', hour: 21, minute: 0 },
    ]);
  });

  test('o horário gravado aparece marcado', async () => {
    await render(
      <ReminderTimePicker current={{ slot: 'evening', hour: 19, minute: 0 }} onChoose={jest.fn()} testIDPrefix="t" />,
    );
    expect(screen.getByTestId('t-1900').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('t-0700').props.accessibilityState.selected).toBe(false);
    expect(screen.getByTestId('t-none').props.accessibilityState.selected).toBe(false);
  });

  test('horário fora da lista fica em "Outro", que diz o horário', async () => {
    await render(
      <ReminderTimePicker current={{ slot: 'custom', hour: 6, minute: 45 }} onChoose={jest.fn()} testIDPrefix="t" />,
    );
    expect(screen.getByText('Outro: 6:45')).toBeTruthy();
    expect(screen.getByTestId('t-other').props.accessibilityState.selected).toBe(true);
  });

  test('iOS: "Outro horário" abre a folha; nada é escolhido até o "Pronto"', async () => {
    const onChoose = jest.fn();
    await render(<ReminderTimePicker current={OFF} onChoose={onChoose} testIDPrefix="t" />);
    expect(screen.queryByTestId('t-spinner')).toBeNull();
    await fireEvent.press(screen.getByTestId('t-other'));
    await fireEvent.press(screen.getByTestId('t-spinner'));
    expect(onChoose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('t-done'));
    expect(onChoose).toHaveBeenCalledWith({ slot: 'custom', hour: 6, minute: 45 });
  });

  test('iOS: "Cancelar" fecha sem escolher', async () => {
    const onChoose = jest.fn();
    await render(<ReminderTimePicker current={OFF} onChoose={onChoose} testIDPrefix="t" />);
    await fireEvent.press(screen.getByTestId('t-other'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(onChoose).not.toHaveBeenCalled();
  });

  test('Android: abre o diálogo de hora do sistema em 24 h; o OK escolhe', async () => {
    setPlatform('android');
    const onChoose = jest.fn();
    await render(<ReminderTimePicker current={OFF} onChoose={onChoose} testIDPrefix="t" />);
    await fireEvent.press(screen.getByTestId('t-other'));
    expect(mockAndroidOpen).toHaveBeenCalledWith(expect.objectContaining({ mode: 'time', is24Hour: true }));
    const { onValueChange } = mockAndroidOpen.mock.calls[0][0];
    const picked = new Date();
    picked.setHours(5, 30, 0, 0);
    onValueChange({}, picked);
    expect(onChoose).toHaveBeenCalledWith({ slot: 'custom', hour: 5, minute: 30 });
  });

  test('ocupado: nenhum chip responde', async () => {
    const onChoose = jest.fn();
    await render(<ReminderTimePicker current={OFF} onChoose={onChoose} disabled testIDPrefix="t" />);
    await fireEvent.press(screen.getByTestId('t-0700'));
    await fireEvent.press(screen.getByTestId('t-other'));
    expect(onChoose).not.toHaveBeenCalled();
    expect(mockAndroidOpen).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------ onboarding com o seletor */

describe('Onboarding · passo do lembrete com horário próprio', () => {
  test('o horário do seletor do sistema é agendado e gravado como "custom"', async () => {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({}));
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-other'));
    await fireEvent.press(screen.getByTestId('onboarding-reminder-spinner'));
    await fireEvent.press(screen.getByTestId('onboarding-reminder-done'));
    await waitFor(() => expect(mockSchedule).toHaveBeenCalledWith(6, 45));
    await waitFor(() => expect(getCachedSettings()?.reminder).toEqual({ slot: 'custom', hour: 6, minute: 45 }));
  });

  test('recusa da permissão desfaz o horário próprio', async () => {
    mockSchedule.mockResolvedValue({ ok: false, reason: 'Permissão de notificações negada.' });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({}));
    await render(<LembreteStep />);
    await fireEvent.press(screen.getByTestId('onboarding-reminder-other'));
    await fireEvent.press(screen.getByTestId('onboarding-reminder-done'));
    await waitFor(() => expect(getCachedSettings()?.reminder.slot).toBe('none'));
    expect(screen.getByText('Continuar sem lembrete')).toBeTruthy();
  });
});

/* ------------------------------------------------ texto da notificação */

describe('Texto da notificação: "Hora de ler a Bíblia" com a leitura do dia', () => {
  const campaign = () => getCampaign();
  const eve = () => localDateTimeForDay(1, campaign(), { hour: 8, minute: 0 }, -1);

  test('título fixo e corpo com a referência DAQUELE dia', () => {
    const plan = dailyReminderPlan({ hour: 7, minute: 0 }, campaign(), eve(), 100);
    expect(plan).toHaveLength(100);
    for (const item of plan) {
      expect(item.title).toBe('Hora de ler a Bíblia');
      const label = readingSummary(getDay(item.day))?.label;
      expect(label).toBeTruthy();
      expect(item.body).toBe(`Leitura de hoje: ${label}`);
    }
    expect(plan[0].body).not.toBe(plan[1].body);
    expect(DAILY_TITLE).toBe('Hora de ler a Bíblia');
  });

  test('dia sem leitura no dataset não inventa passagem', () => {
    expect(dailyBody(999)).toBe('Abra o app para a leitura do Dia 999.');
  });

  test('fora da campanha nada é agendado', () => {
    const after = localDateTimeForDay(100, campaign(), { hour: 8, minute: 0 }, 1);
    expect(dailyReminderPlan({ hour: 7, minute: 0 }, campaign(), after)).toEqual([]);
  });
});
