import { Redirect, router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { getCommunityApi } from '@/community/api';
import { COMMUNITY_ENABLED } from '@/config/features';
import { BackBar, goBackOrHome } from '@/ui/BackBar';
import { Button, Screen, ScreenScroll } from '@/ui/components';
import { getModerationApi } from '@/ui/comunidade/moderacao/moderacaoApi';
import { ModerationQueueScreen } from '@/ui/comunidade/moderacao/ModerationQueueScreen';
import { EmptyState } from '@/ui/entrada/States';
import { useGutter } from '@/ui/theme';

/**
 * Rota da fila de moderação (Comunidade V2).
 *
 * - Comunidade desligada nesta build: a rota não existe para ninguém e volta
 *   para a casa (a V1 não tem superfície da Comunidade).
 * - Ligada, sem servidor configurado: estado honesto, nunca uma fila de mentira.
 * - Sem papel de moderador no servidor: volta para a casa.
 */
export default function ModerationRoute() {
  const inset = useGutter();
  const community = useMemo(() => getCommunityApi(), []);
  const moderation = useMemo(() => getModerationApi(), []);

  if (!COMMUNITY_ENABLED) return <Redirect href="/" />;

  if (!community || !moderation) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingHorizontal: inset }}>
          <BackBar label="Voltar" onBack={goBackOrHome} testID="moderation-back-bar" />
        </View>
        <ScreenScroll>
          <EmptyState
            icon="alert"
            title="A moderação precisa do servidor"
            message="Esta versão do app não está ligada ao servidor da comunidade. Nada aqui é simulado."
            action={<Button title="Voltar" variant="outline" onPress={goBackOrHome} />}
            testID="moderation-no-server"
          />
        </ScreenScroll>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ModerationQueueScreen
        community={community}
        moderation={moderation}
        onNotModerator={() => router.replace('/')}
      />
    </>
  );
}
