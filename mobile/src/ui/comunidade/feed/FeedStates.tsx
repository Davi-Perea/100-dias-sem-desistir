import { router } from 'expo-router';
import { View } from 'react-native';

import { isCommunityDemo } from '@/community/demoApi';
import { Dove } from '@/ui/brand';
import {
  AppText,
  Block,
  Button,
  IconCircle,
  LoadingCaption,
  Rule,
  SkeletonBlock,
  StateLayout,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { COMMUNITY_ROUTES } from './rotas';
import type { CommunityGate } from './useCommunity';

/** Esqueleto na forma do post (C1, estado carregando). Sem brilho animado (F3). */
export function FeedSkeleton({ gutter }: { gutter: number }) {
  return (
    <View testID="feed-loading" style={{ gap: spacing.lg, paddingVertical: spacing.lg }}>
      <View aria-hidden style={{ gap: spacing.lg }}>
        {[0, 1].map((index) => (
          <View key={index} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: gutter }}>
              <SkeletonBlock width={42} height={42} radius={21} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <SkeletonBlock width="40%" height={15} />
                <SkeletonBlock width="25%" height={12} />
              </View>
            </View>
            <SkeletonBlock height={220} radius={0} />
            <View style={{ paddingHorizontal: gutter, gap: spacing.sm }}>
              <SkeletonBlock height={17} />
              <SkeletonBlock width="70%" height={17} />
            </View>
            <Rule />
          </View>
        ))}
      </View>
      <LoadingCaption />
    </View>
  );
}

/**
 * C2: feed vazio. Sem cara de erro, sem ilustração de caixa vazia. "Hoje
 * começa." só no primeiro dia; depois disso, a frase não diz que é o começo.
 *
 * O desenho diz "Quando você terminar a leitura de hoje, o app pergunta se você
 * quer dizer alguma coisa". Isso depende da ponte B4 existir nesta build; a
 * frase aqui só convida, sem prometer o que outra tela faz.
 */
export function FeedEmpty({ day, firstDay }: { day: number; firstDay: boolean }) {
  return (
    <StateLayout
      kind="empty"
      inset="vertical"
      testID="feed-empty"
      glyph={<Dove width={84} />}
      title={firstDay ? 'Hoje começa.' : 'Ninguém escreveu ainda.'}
      message={
        firstDay
          ? 'Ninguém escreveu nada ainda — o primeiro dia é assim. Quando terminar a leitura de hoje, conte aqui o que ficou com você. Pode ser a sua a primeira.'
          : 'Quando terminar a leitura de hoje, conte aqui o que ficou com você. Pode ser a sua a primeira.'
      }
    >
      <Button
        title={`Ler o dia ${day}`}
        onPress={() => router.navigate(COMMUNITY_ROUTES.jornada)}
        testID="feed-empty-read"
        style={{ alignSelf: 'stretch' }}
      />
    </StateLayout>
  );
}

/**
 * Fim do feed, explícito (ECA Digital / Decreto 12.880: não esconder o ponto
 * de parada). Não há rolagem infinita: a página seguinte só vem por toque.
 */
export function FeedEnd() {
  return (
    <View
      testID="feed-end"
      accessible
      accessibilityLabel="Fim. Você viu todas as publicações da comunidade."
      style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}
    >
      <IconCircle name="check" size={48} />
      <AppText variant="action" style={{ textAlign: 'center' }}>
        Fim
      </AppText>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        Você viu todas as publicações da comunidade.
      </AppText>
    </View>
  );
}

/**
 * Tudo o que vem antes do feed: sem servidor, sem conta, sem código, suspensa
 * ou erro ao perguntar o estado. Cada um diz o que é e dá uma saída; nenhum
 * mostra feed falso nem código técnico.
 */
export function GateView({ gate, onRetry }: { gate: Exclude<CommunityGate, { kind: 'ready' | 'loading' }>; onRetry: () => void }) {
  switch (gate.kind) {
    case 'no_server':
      return (
        <StateLayout
          kind="empty"
          inset="vertical"
          testID="gate-no-server"
          glyph={<IconCircle name="community" />}
          title="A comunidade não está ligada nesta versão"
          message="Esta versão do app não está conectada ao servidor da comunidade. Sua leitura, seu progresso e as suas reflexões continuam funcionando."
        >
          <Button title="Ir para a Jornada" variant="outline" onPress={() => router.navigate(COMMUNITY_ROUTES.jornada)} style={{ alignSelf: 'stretch' }} />
        </StateLayout>
      );
    case 'signed_out':
      return (
        <Block tone="warm" testID="gate-signed-out">
          <View style={{ gap: spacing.md }}>
            <AppText variant="blockTitle" accessibilityRole="header">
              A comunidade é para quem tem 18 anos ou mais
            </AppText>
            <AppText variant="bodySm">
              Para ler e escrever aqui, entre com o seu e-mail e depois use o código que a sua igreja passou. Sua
              leitura, seu progresso e as suas reflexões continuam funcionando sem conta.
            </AppText>
            <Button
              title="Entrar com meu e-mail"
              onPress={() => router.push(isCommunityDemo() ? COMMUNITY_ROUTES.entrar : COMMUNITY_ROUTES.conta)}
              testID="gate-sign-in"
            />
          </View>
        </Block>
      );
    case 'not_member':
      return (
        <Block tone="warm" testID="gate-not-member">
          <View style={{ gap: spacing.md }}>
            <AppText variant="blockTitle" accessibilityRole="header">
              Entre com o código da sua igreja
            </AppText>
            <AppText variant="bodySm">
              A comunidade é só para quem recebeu um código de um líder ou de um ministério. Sem código, a sua jornada
              continua igual.
            </AppText>
            <Button title="Tenho um código" onPress={() => router.push(COMMUNITY_ROUTES.entrar)} testID="gate-enter-code" />
          </View>
        </Block>
      );
    case 'suspended':
      return (
        <StateLayout
          kind="empty"
          inset="vertical"
          testID="gate-suspended"
          glyph={<IconCircle name="lock" />}
          title="Sua participação está suspensa"
          message="Você não pode ler nem escrever na comunidade por enquanto. Sua leitura, seu progresso e as suas reflexões continuam funcionando."
        >
          <Button title="Ir para a Jornada" variant="outline" onPress={() => router.navigate(COMMUNITY_ROUTES.jornada)} style={{ alignSelf: 'stretch' }} />
        </StateLayout>
      );
    case 'error':
      return <FeedError message={gate.message} onRetry={onRetry} testID="gate-error" />;
  }
}

/** F5 dentro da comunidade: uma saída sempre, nenhum código técnico. */
export function FeedError({ message, onRetry, testID = 'feed-error' }: { message: string; onRetry: () => void; testID?: string }) {
  return (
    <StateLayout
      kind="error"
      inset="vertical"
      testID={testID}
      glyph={<IconCircle name="alert" />}
      title="Não deu para carregar"
      message={`${message} Sua jornada e as suas reflexões estão salvas.`}
    >
      <Button title="Tentar de novo" onPress={onRetry} testID={`${testID}-retry`} style={{ alignSelf: 'stretch' }} />
      <Button title="Ir para a Jornada" variant="underline" onPress={() => router.navigate(COMMUNITY_ROUTES.jornada)} />
    </StateLayout>
  );
}
