import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GOALS, normalizeCustomGoal, type GoalId } from '@/config/goals';
import {
  PROFILE_NAME_MAX,
  normalizeProfileName,
  updateSettings,
  useSettings,
  type Profile,
} from '@/settings/settingsStore';
import { AppText, Cap, SaveErrorNotice, Screen, StateView } from '@/ui/components';
import { CustomGoalRow } from '@/ui/entrada/CustomGoalRow';
import { TextField } from '@/ui/TextField';
import { spacing } from '@/ui/theme';
import { SubScreen } from '@/ui/voce/SubScreen';
import { ToggleRow } from '@/ui/voce/ToggleRow';

/**
 * Minhas metas (V1, feedback do fundador, 2026-09-22): o nome e as metas que a
 * pessoa escolheu na entrada, editáveis a qualquer momento. Tudo em
 * `settings.profile`, SÓ neste aparelho: "jejuar" e "orar todo dia" são prática
 * religiosa, dado sensível (LGPD art. 5º, II).
 *
 * `?secao=nome` (do cartão "Comece por aqui") abre com o campo do nome em foco.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) Campo de uma linha
 * com o mesmo `TextField` da reflexão e as metas como caixas de marcação, no
 * ritmo das outras telas de Você.
 */
export default function GoalsScreen() {
  const settings = useSettings();
  const { secao } = useLocalSearchParams<{ secao?: string }>();

  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }
  // O campo nasce com o nome salvo: o formulário só monta depois de o disco responder.
  return <GoalsForm profile={settings.profile} focusName={secao === 'nome'} />;
}

function GoalsForm({ profile: saved, focusName }: { profile: Profile; focusName: boolean }) {
  const [name, setName] = useState(saved.name ?? '');
  const [saveError, setSaveError] = useState(false);
  const goals = saved.goals;

  const save = (patch: (profile: Profile) => Profile) =>
    updateSettings((s) => ({ ...s, profile: patch(s.profile) }))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));

  // Grava a cada letra (sair da tela sem fechar o teclado não perde o nome) e,
  // ao sair do campo, mostra o nome como ficou salvo.
  const changeName = (text: string) => {
    setName(text);
    const clean = normalizeProfileName(text);
    if (clean !== saved.name) save((profile) => ({ ...profile, name: clean }));
  };
  const tidyName = () => setName(normalizeProfileName(name) ?? '');

  const toggleGoal = (id: GoalId) =>
    save((profile) => ({
      ...profile,
      goals: profile.goals.includes(id) ? profile.goals.filter((g) => g !== id) : [...profile.goals, id],
    }));

  // "Outra meta": a mesma linha e a mesma regra da entrada, no molde de Você.
  const changeCustomGoal = (next: string | null) => {
    const clean = normalizeCustomGoal(next);
    if (clean !== saved.customGoal) save((profile) => ({ ...profile, customGoal: clean }));
  };

  return (
    <SubScreen title="Minhas metas" gap={spacing.xl}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="blockTitle" accessibilityRole="header" nativeID="profile-name-label">
          Como podemos te chamar?
        </AppText>
        <TextField
          value={name}
          onChangeText={changeName}
          onBlur={tidyName}
          onSubmitEditing={tidyName}
          multiline={false}
          minHeight={56}
          maxLength={PROFILE_NAME_MAX}
          autoFocus={focusName}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="done"
          placeholder="Seu nome"
          accessibilityLabel="Como podemos te chamar?"
          accessibilityLabelledBy="profile-name-label"
          testID="profile-name-input"
        />
        <AppText variant="caption">Só para o app falar com você. Fica neste aparelho.</AppText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Cap>Suas metas para os 100 dias</Cap>
        <AppText variant="caption">Escolha quantas quiser e mude quando quiser. Ficam só neste aparelho.</AppText>
        <View>
          {GOALS.map((goal, index) => (
            <ToggleRow
              key={goal.id}
              label={goal.label}
              checked={goals.includes(goal.id)}
              onToggle={() => toggleGoal(goal.id)}
              first={index === 0}
              testID={`goal-${goal.id}`}
            />
          ))}
          <CustomGoalRow value={saved.customGoal} onChange={changeCustomGoal} row={ToggleRow} />
        </View>
      </View>

      {saveError ? <SaveErrorNotice testID="goals-save-error" /> : null}
    </SubScreen>
  );
}
