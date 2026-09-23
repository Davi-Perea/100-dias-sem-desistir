/**
 * A VERSÃO WEB SEM LEMBRETE (decisão do fundador, 23/09/2026).
 *
 * Lembrete no app é notificação LOCAL, agendada pelo celular. No navegador não
 * existe. Até hoje a entrada perguntava o horário assim mesmo: a pessoa
 * escolhia, nada era agendado, e ela só descobria depois. Um passo que não pode
 * dar certo é pior que passo nenhum.
 *
 * Este arquivo roda com `REMINDERS_AVAILABLE` desligado — é assim que o app se
 * comporta no navegador — e prova que TODA superfície some junto. A suíte
 * `correcoes-usuario-real` cobre o outro lado: no celular, tudo continua.
 */
import { render, screen, waitFor } from '@testing-library/react-native';

import { DEFAULT_SETTINGS } from '@/settings/settingsStore';
import { ONBOARDING_STEPS } from '@/ui/OnboardingStep';
import { profileSteps } from '@/ui/voce/CompleteProfile';
import { SettingsList } from '@/ui/voce/SettingsList';

// O Babel eleva esta linha acima dos imports; ela fica aqui para o lint não
// reclamar de import no corpo do módulo, e vale para o arquivo inteiro.
jest.mock('@/reminders/disponibilidade', () => ({ REMINDERS_AVAILABLE: false }));

test('a entrada tem três passos, não quatro', () => {
  // Com quatro, a barra diria "Passo 3 de 4" e ficaria faltando para sempre um
  // passo que nunca chega.
  expect(ONBOARDING_STEPS).toBe(3);
});

test('"Um lembrete" não é um passo do complete-seu-perfil', () => {
  // Seria o único cartão impossível de concluir: nada agenda, nada marca feito.
  const ids = profileSteps({ settings: DEFAULT_SETTINGS, readCount: 0, marks: null }).map((s) => s.id);
  expect(ids).not.toContain('reminder');
  // Os outros continuam todos lá: o que saiu foi um, e só um.
  expect(ids).toEqual(['name', 'ministry', 'goals', 'firstReading', 'firstNote']);
});

describe('a lista de ajustes', () => {
  const renderizar = () =>
    render(
      <SettingsList
        settings={DEFAULT_SETTINGS}
        reflections={null}
        fasting={null}
      />,
    );

  test('não tem a linha "Lembretes"', async () => {
    renderizar();
    // Via waitFor: o `screen` do RNTL só fica pronto depois de um ciclo.
    await waitFor(() => expect(screen.getByTestId('row-reading')).toBeTruthy());
    expect(screen.queryByTestId('row-reminder')).toBeNull();
    expect(screen.queryByText('Lembretes')).toBeNull();
  });

  test('o grupo "Preferências" continua com uma primeira linha', async () => {
    // Sem isto o grupo perde a borda de cima e a lista parece cortada.
    renderizar();
    await waitFor(() => expect(screen.getByTestId('row-reading')).toBeTruthy());
  });
});
