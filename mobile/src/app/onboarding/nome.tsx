import { router } from 'expo-router';
import { useState } from 'react';

import { normalizeProfileName, PROFILE_NAME_MAX, updateSettings, useSettings } from '@/settings/settingsStore';
import { Button, SAVE_ERROR_COPY, SaveErrorNotice } from '@/ui/components';
import { ONBOARDING_STEP, OnboardingStep, StepSupport } from '@/ui/OnboardingStep';
import { TextField } from '@/ui/TextField';

/**
 * E4 · "Como podemos te chamar?" — passo 1 de 4. Opcional: "Pular" segue sem
 * nome e sem apagar um nome já gravado (quem voltou só para passar adiante não
 * perde o que escreveu antes).
 *
 * O nome fica SÓ neste aparelho (settings.profile), serve para o app falar com a
 * pessoa e não vai para analytics nem servidor. Não é o nome da comunidade.
 */
export default function NameStep() {
  const settings = useSettings();
  // Rascunho local; enquanto a pessoa não digita, mostra o que já está gravado.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const value = draft ?? settings?.profile.name ?? '';
  const name = normalizeProfileName(value);

  const next = () => router.push('/onboarding/metas');

  const save = async () => {
    if (!name || busy) return;
    setBusy(true);
    setError(false);
    try {
      await updateSettings((s) => ({ ...s, profile: { ...s.profile, name } }));
      next();
    } catch {
      // PER-02: sem gravar, não avança fingindo que guardou.
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingStep
      step={ONBOARDING_STEP.nome}
      title="Como podemos te chamar?"
      support={
        <>
          {error ? <SaveErrorNotice message={SAVE_ERROR_COPY} testID="name-save-error" /> : null}
          <StepSupport testID="name-support">Fica só neste aparelho. Você pode mudar depois, em Você.</StepSupport>
        </>
      }
      footer={
        <>
          <Button title="Continuar" onPress={save} disabled={!name} loading={busy} testID="name-continue" />
          <Button title="Pular" variant="underline" onPress={next} testID="name-skip" />
        </>
      }
    >
      <TextField
        minHeight={56}
        multiline={false}
        value={value}
        onChangeText={setDraft}
        accessibilityLabel="Seu nome"
        placeholder="Seu nome ou apelido"
        maxLength={PROFILE_NAME_MAX}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={() => (name ? save() : next())}
        testID="name-input"
      />
    </OnboardingStep>
  );
}
