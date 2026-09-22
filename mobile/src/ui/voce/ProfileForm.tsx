import { useState } from 'react';
import { View } from 'react-native';

import { GOALS, type GoalId } from '@/config/goals';
import { PROFILE_NAME_MAX, normalizeProfileName, updateSettings, type Profile } from '@/settings/settingsStore';

import { AppText, Cap, SaveErrorNotice } from '../components';
import { TextField } from '../TextField';
import { spacing } from '../theme';
import { SubScreen } from './SubScreen';
import { ToggleRow } from './ToggleRow';

/**
 * F7 · "Editar perfil": nome e metas, os dois campos que o perfil da V1 tem.
 * Tudo em `settings.profile`, SÓ neste aparelho — metas como "jejuar" e "orar
 * todo dia" são prática religiosa, dado sensível (LGPD art. 5º, II).
 *
 * Grava a cada mudança, como /metas: sair da tela sem fechar o teclado não
 * perde o nome. `focusName` abre com o campo do nome em foco (cartão "Seu nome").
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) O mesmo ritmo de
 * /metas; o pedido de /metas passar a usar este formulário está no relatório.
 */
export function ProfileForm({
  profile: saved,
  focusName,
  title,
}: {
  profile: Profile;
  focusName: boolean;
  title: string;
}) {
  const [name, setName] = useState(saved.name ?? '');
  const [saveError, setSaveError] = useState(false);
  const goals = saved.goals;

  const save = (patch: (profile: Profile) => Profile) =>
    updateSettings((s) => ({ ...s, profile: patch(s.profile) }))
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));

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

  return (
    <SubScreen title={title} gap={spacing.xl} testID="profile-edit">
      <View style={{ gap: spacing.sm }}>
        <AppText variant="blockTitle" accessibilityRole="header" nativeID="profile-edit-name-label">
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
          accessibilityLabelledBy="profile-edit-name-label"
          testID="profile-edit-name"
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
              testID={`profile-goal-${goal.id}`}
            />
          ))}
        </View>
      </View>

      {saveError ? <SaveErrorNotice testID="profile-edit-save-error" /> : null}
    </SubScreen>
  );
}
