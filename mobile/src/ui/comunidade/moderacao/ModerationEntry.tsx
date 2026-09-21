import { router } from 'expo-router';

import { SettingRow } from '@/ui/components';
import { useCommunityStatus } from '@/ui/comunidade/publicar/useCommunityStatus';
import { RowGroup } from '@/ui/voce/SubScreen';

/**
 * Entrada "Moderação" em Você. Só é montada com COMMUNITY_ENABLED (quem chama
 * decide), e só aparece quando o SERVIDOR diz que a pessoa modera
 * (my_community_status.is_moderator). Carregando, sem conta, sem servidor ou com
 * erro: nada aparece. A rota /moderacao se protege sozinha de novo.
 */
export function ModerationEntry() {
  const state = useCommunityStatus();
  if (state.kind !== 'ready' || !state.status.isModerator) return null;
  return (
    <RowGroup title="Equipe da igreja" testID="group-moderation">
      <SettingRow label="Moderação" onPress={() => router.push('/moderacao')} first testID="row-moderation" />
    </RowGroup>
  );
}
