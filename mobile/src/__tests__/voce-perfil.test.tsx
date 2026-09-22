/**
 * F7 · Você como perfil (decisão do fundador, 2026-09-22):
 *  - contador de dias lidos (nunca zera, nunca "perdeu") e engrenagem "Ajustes";
 *  - nome ou "Você", ministério (ou "Sem ministério"), avatar, "Editar perfil" (/perfil-editar);
 *  - "Complete seu perfil N/6" em carrossel; cada cartão some quando feito;
 *  - /ajustes com a lista antiga; /perfil-editar grava nome e metas no aparelho.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import YouScreen from '@/app/(tabs)/voce';
import SettingsScreen from '@/app/ajustes';
import EditProfileScreen from '@/app/perfil-editar';
import { _resetFastingCacheForTests } from '@/fasting/fastingStore';
import { BUNDLED_CONTENT, loadDataset, resetToBundledContent } from '@/journey/datasetSource';
import { calendarDateInCampaignTz } from '@/journey/officialDay';
import { _resetMarksCacheForTests, saveVerseMark } from '@/marks/marksStore';
import { _resetCompletionsCacheForTests, setDayCompleted } from '@/progress/completionsStore';
import { _resetReflectionsCacheForTests } from '@/reflections/reflectionsStore';
import { _resetSettingsCacheForTests, loadSettings, SETTINGS_KEY } from '@/settings/settingsStore';
import { ProfileExtras } from '@/ui/voce/ProfileExtras';
import { ministryLabel } from '@/ui/voce/ProfileHeader';

jest.mock('react-native-reanimated', () => jest.requireActual('./support/reanimatedVoceMock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
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
jest.mock('@/cloud/config', () => ({ isCloudConfigured: () => false }));

const mockRouter = jest.requireMock('expo-router') as {
  router: { push: jest.Mock };
  useLocalSearchParams: jest.Mock;
};
const CAMPAIGN = BUNDLED_CONTENT.campaign.id;
jest.setTimeout(20_000);

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
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ onboardingCompleted: true, readingMode: 'in_app', ...patch }));
  _resetSettingsCacheForTests();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _resetSettingsCacheForTests();
  _resetCompletionsCacheForTests();
  _resetFastingCacheForTests();
  _resetReflectionsCacheForTests();
  _resetMarksCacheForTests();
  mockRouter.router.push.mockClear();
  mockRouter.useLocalSearchParams.mockReturnValue({});
  resetToBundledContent();
  loadCampaignOnDay(10);
});

afterAll(() => {
  resetToBundledContent();
});

describe('F7 · cabeçalho do perfil', () => {
  test('sem nome mostra "Você"; o contador soma os dias lidos e não fala em sequência', async () => {
    await seedSettings();
    for (const day of [1, 4, 9]) await setDayCompleted(CAMPAIGN, day, true);
    _resetCompletionsCacheForTests();

    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByTestId('read-counter-count').props.children).toBe(3));
    expect(screen.getByTestId('voce-title').props.children).toBe('Você');
    expect(screen.getByLabelText('3 dias lidos no total')).toBeTruthy();
    // Nunca punir: nada de "perdeu", "sequência" ou "recomeçar".
    expect(screen.queryByText(/perdeu|sequência|recomeç/i)).toBeNull();
  });

  test('nenhum dia lido: 0, no singular certo depois; nunca some', async () => {
    await seedSettings({ profile: { name: 'Ana', goals: [] } });
    await render(<YouScreen />);
    await screen.findByTestId('read-counter');
    expect(screen.getByLabelText('0 dias lidos no total')).toBeTruthy();
    expect(screen.getByTestId('voce-title').props.children).toBe('Ana');
  });

  test('ministério embaixo do nome, no mesmo bloco falado; sem escolha, "Sem ministério"', async () => {
    await seedSettings({ profile: { name: 'Davi', goals: [] }, ministry: 'Acolher' });
    const view = await render(<YouScreen />);
    await screen.findByTestId('voce-ministry');
    expect(screen.getByTestId('voce-ministry').props.children).toBe('Ministério Acolher');
    expect(screen.getByRole('header', { name: 'Davi, Ministério Acolher' })).toBeTruthy();
    await view.unmount();

    await seedSettings({ profile: { name: 'Ana', goals: [] } });
    await render(<YouScreen />);
    await screen.findByTestId('voce-ministry');
    expect(screen.getByTestId('voce-ministry').props.children).toBe('Sem ministério');
    expect(screen.getByRole('header', { name: 'Ana, Sem ministério' })).toBeTruthy();
  });

  test('ministryLabel não repete "Ministério" nem estraga "Min."', () => {
    expect(ministryLabel('Comunicação')).toBe('Ministério Comunicação');
    expect(ministryLabel('Min. de Pais')).toBe('Min. de Pais');
    expect(ministryLabel('Ministério Infantil')).toBe('Ministério Infantil');
    expect(ministryLabel('  ')).toBeNull();
    expect(ministryLabel(null)).toBeNull();
  });

  test('um dia lido usa o singular', async () => {
    await seedSettings();
    await setDayCompleted(CAMPAIGN, 2, true);
    _resetCompletionsCacheForTests();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByLabelText('1 dia lido no total')).toBeTruthy());
  });

  test('a engrenagem "Ajustes" tem alvo de 48 e abre /ajustes; "Editar perfil" abre /perfil-editar', async () => {
    await seedSettings();
    await render(<YouScreen />);
    const gear = await screen.findByLabelText('Ajustes');
    const style = [gear.props.style].flat(Infinity).reduce((acc, s) => ({ ...acc, ...(s || {}) }), {});
    expect(style.minWidth).toBeGreaterThanOrEqual(48);
    expect(style.minHeight).toBeGreaterThanOrEqual(48);
    await fireEvent.press(gear);
    expect(mockRouter.router.push).toHaveBeenLastCalledWith('/ajustes');
    await fireEvent.press(screen.getByTestId('edit-profile'));
    expect(mockRouter.router.push).toHaveBeenLastCalledWith('/perfil-editar');
  });

  test('a lista antiga não está mais na aba; ProfileExtras não desenha nada no main', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await screen.findByTestId('progress-block');
    expect(screen.queryAllByTestId(/^row-/)).toHaveLength(0);
    const extras = await render(<ProfileExtras />);
    expect(extras.toJSON()).toBeNull();
  });
});

describe('F7 · Complete seu perfil', () => {
  test('seis cartões, 0/6, cada ação leva ao lugar certo', async () => {
    await seedSettings();
    await render(<YouScreen />);
    await screen.findByTestId('complete-profile');
    expect(screen.getByTestId('complete-profile-count').props.children).toEqual([0, '/', 6]);
    expect(screen.getByLabelText('Complete seu perfil, 0 de 6 feitos')).toBeTruthy();

    const expected: [string, unknown][] = [
      ['name', '/perfil-editar?secao=nome'],
      ['ministry', '/ministerio'],
      ['goals', '/perfil-editar'],
      ['reminder', '/lembrete'],
      ['firstReading', { pathname: '/dia/[day]', params: { day: '10' } }],
      ['firstNote', '/biblia'],
    ];
    for (const [id, route] of expected) {
      await fireEvent.press(screen.getByTestId(`profile-step-${id}-action`));
      expect(mockRouter.router.push).toHaveBeenLastCalledWith(route);
    }
  });

  test('o que está feito some e o número sobe', async () => {
    await seedSettings({ profile: { name: 'Davi', goals: ['jejuar'] }, ministry: 'Acolher' });
    await setDayCompleted(CAMPAIGN, 1, true);
    _resetCompletionsCacheForTests();
    await render(<YouScreen />);
    await waitFor(() => expect(screen.getByLabelText('Complete seu perfil, 4 de 6 feitos')).toBeTruthy());
    expect(screen.queryByTestId('profile-step-ministry')).toBeNull();
    expect(screen.queryByTestId('profile-step-name')).toBeNull();
    expect(screen.queryByTestId('profile-step-goals')).toBeNull();
    expect(screen.queryByTestId('profile-step-firstReading')).toBeNull();
    expect(screen.getByTestId('profile-step-reminder')).toBeTruthy();
    expect(screen.getByTestId('profile-step-firstNote')).toBeTruthy();
  });

  test('marca sem anotação não conta; com anotação conta; com os seis o carrossel some', async () => {
    await seedSettings({
      profile: { name: 'Davi', goals: ['jejuar'] },
      ministry: 'Acolher',
      reminder: { slot: 'morning', hour: 7, minute: 0 },
    });
    await setDayCompleted(CAMPAIGN, 1, true);
    _resetCompletionsCacheForTests();
    await saveVerseMark({ book: 'JHN', chapter: 3, verse: 16 }, { color: 'amarelo' });

    await render(<YouScreen />);
    await screen.findByTestId('profile-step-firstNote');

    await act(async () => {
      await saveVerseMark({ book: 'JHN', chapter: 3, verse: 16 }, { note: 'minha anotação' });
    });
    await waitFor(() => expect(screen.queryByTestId('complete-profile')).toBeNull());
    expect(screen.getByTestId('progress-block')).toBeTruthy();
  });
});

describe('F7 · Ajustes e Editar perfil', () => {
  test('/ajustes tem título "Ajustes" e as dez linhas', async () => {
    await seedSettings();
    await render(<SettingsScreen />);
    await screen.findByTestId('row-reflections');
    expect(screen.getByRole('header', { name: 'Ajustes' })).toBeTruthy();
    expect(screen.getAllByTestId(/^row-/)).toHaveLength(10);
  });

  test('/perfil-editar grava o nome limpo e as metas só no aparelho', async () => {
    await seedSettings();
    mockRouter.useLocalSearchParams.mockReturnValue({ secao: 'nome' });
    await render(<EditProfileScreen />);
    const input = await screen.findByTestId('profile-edit-name');
    expect(input.props.autoFocus).toBe(true);
    await fireEvent.changeText(input, '  Maria  ');
    await fireEvent.press(screen.getByTestId('profile-goal-jejuar'));
    await waitFor(async () => {
      _resetSettingsCacheForTests();
      const saved = await loadSettings();
      expect(saved.profile).toEqual({ name: 'Maria', goals: ['jejuar'] });
    });
  });
});
