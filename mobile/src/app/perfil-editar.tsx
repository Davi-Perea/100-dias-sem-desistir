import { useLocalSearchParams } from 'expo-router';

import { useSettings } from '@/settings/settingsStore';
import { Screen, StateView } from '@/ui/components';
import { ProfileForm } from '@/ui/voce/ProfileForm';

/**
 * F7 · Editar perfil (nome e metas). `?secao=nome` abre com o nome em foco.
 * Só neste aparelho; nada vai ao servidor.
 */
export default function EditProfileScreen() {
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
  return <ProfileForm profile={settings.profile} focusName={secao === 'nome'} title="Editar perfil" />;
}
