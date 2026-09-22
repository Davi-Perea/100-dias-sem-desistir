import { router, useFocusEffect } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import type { CommunityApi } from '@/community/api';
import { DEMO_BADGE, DEMO_LABELS_ON_SCREEN, isCommunityDemo } from '@/community/demoApi';
import type { CommunityStatus } from '@/community/types';
import { useJourney } from '@/journey/useJourney';
import { useOnline } from '@/net/useOnline';
import { AppText, Button, DevContentBanner, OfflineBanner, Rule, SaveErrorNotice, Screen } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons';
import { MAX_CONTENT_WIDTH, MIN_TOUCH, spacing, useTheme } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

import { CommentsSheet, type CommentsTarget } from '../sheets/CommentsSheet';
import { ReportSheet, type SheetTarget } from '../sheets/ReportSheet';
import { useJuntosIntro } from './conheca';
import { ConhecaOJuntos } from './ConhecaOJuntos';
import { FeedEmpty, FeedEnd, FeedError, FeedSkeleton, GateView } from './FeedStates';
import { PostCard } from './PostCard';
import { aceiteDocs, aceiteNeeds, availabilityNotice, nameOk, useAceite } from '../publicar/aceite';
import { AceiteLine } from '../publicar/pecas';
import { ACEITE_NEEDS_NAME } from '../publicar/textos';
import { ACTIVITY_ROUTE, COMMUNITY_ROUTES, readerHref, verseHref } from './rotas';
import { needsConsent, useCommunity } from './useCommunity';
import { useFeed } from './useFeed';
import { hasNewActivity } from './v2';

/** Calha das telas de lista e feed (TELAS, convenções): 20. */
const FEED_GUTTER = 20;
/** Dito no primeiro Amém, que é o toque que registra o aceite (2026-09-22). */
export const AFTER_CONSENT_FEED = 'Pronto. Seu Amém foi registrado.';

const COLUMN = { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH + FEED_GUTTER * 2, alignSelf: 'center' } as const;

/**
 * C1 · Juntos, o "diário compartilhado" (FEEDBACK_DAVI_2026-09-22, F1–F8):
 * cada pessoa conta o seu dia com a Bíblia, e a igreja acompanha.
 *
 * Quem abre a aba já está dentro (2026-09-22): a entrada é automática
 * (useCommunity), sem tela de entrar, sem código, sem perfil.
 *
 * O ACEITE NÃO É MAIS UMA TELA (decisão do fundador, 2026-09-22): enquanto ele
 * falta, a linha "Ao publicar, você confirma que tem 16 anos ou mais e aceita as
 * regras do Juntos." fica no topo do feed, com link para as regras, e o próprio
 * toque no Amém registra o aceite antes de o Amém ir ao servidor.
 *
 * Topo: "Juntos", o sino da Atividade (F8, com ponto quando há novidade) e
 * "Publicar" (o rótulo é este desde 2026-09-22: é o que o botão faz, e é a mesma
 * palavra da tela que ele abre). Embaixo, dois atalhos que antes só existiam
 * fora da aba — "Seu perfil" (onde se coloca ou troca a foto) e "Minhas
 * publicações". Depois os posts do dia e o fim explícito.
 *
 * SÓ A IGREJA TODA (pedido do fundador, 2026-09-22): saíram o filtro "Meu
 * ministério" do topo e a escolha de público ao publicar. Um feed só, para todo
 * mundo; o ministério continua no perfil, mas não divide mais o que se lê.
 *
 * Na PRIMEIRA vez que a aba abre, "Conheça o Juntos" aparece por cima (mesmo
 * padrão do aviso do versículo do dia) e não volta depois de fechado.
 *
 * Estados: sem servidor, suspensa, entrando/carregando (esqueleto
 * na forma do post), erro (F5), vazio (C2) e sem internet (o feed fica
 * indisponível, a jornada não).
 */
export function FeedScreen() {
  const { gate, reload } = useCommunity();
  const journey = useJourney();
  const online = useOnline();
  const intro = useJuntosIntro();

  const ready = gate.kind === 'ready';
  const header = (
    <FeedHeader
      ready={ready}
      unread={ready ? hasNewActivity(gate.status) : false}
      onPublish={() => ready && router.push(COMMUNITY_ROUTES.publicar)}
    />
  );
  // Espera a leitura da dispensa: piscar o aviso e sumir seria pior que esperar.
  // Só quando a aba abre de verdade (`ready`): a apresentação vale uma vez na
  // vida do aparelho, e gastá-la por cima de "Juntos indisponível" ou de um erro
  // de rede faria a pessoa nunca mais ver o que este lugar é.
  const introOverlay = <ConhecaOJuntos visible={ready && intro.loaded && !intro.dismissed} onClose={intro.dismiss} />;

  if (gate.kind === 'ready') {
    return (
      <Screen>
        <View style={COLUMN}>
          <ReadyFeed
            header={header}
            api={gate.api}
            status={gate.status}
            online={online}
            day={Math.max(1, journey.officialDay)}
            reload={reload}
          />
        </View>
        {introOverlay}
      </Screen>
    );
  }

  let content: ReactNode;
  if (gate.kind === 'loading') {
    content = <FeedSkeleton gutter={FEED_GUTTER} />;
  } else {
    content = (
      <View style={{ paddingHorizontal: FEED_GUTTER, paddingTop: spacing.lg }}>
        {!online && gate.kind === 'error' ? <OfflineNotice /> : null}
        <GateView gate={gate} onRetry={reload} />
      </View>
    );
  }

  return (
    <Screen>
      <View style={COLUMN}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          {header}
          <View style={{ paddingHorizontal: FEED_GUTTER }}>
            <DevContentBanner state={journey.contentState} compact />
          </View>
          {content}
        </ScrollView>
      </View>
      {introOverlay}
    </Screen>
  );
}

function FeedHeader({ ready, unread, onPublish }: { ready: boolean; unread: boolean; onPublish: () => void }) {
  const { colors } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.sm,
          paddingHorizontal: FEED_GUTTER,
          paddingTop: spacing.md,
          paddingBottom: spacing.xs,
        }}
      >
        <AppText variant="screenTitle" accessibilityRole="header" style={{ flex: 1, minWidth: 160 }}>
          Juntos
        </AppText>
        {ready ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Pressable
              onPress={() => router.push(ACTIVITY_ROUTE)}
              accessibilityRole="button"
              accessibilityLabel={unread ? 'Atividade, tem novidade' : 'Atividade'}
              testID="feed-bell"
              style={({ pressed }) => [
                { width: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
                pressed && { opacity: 0.72 },
              ]}
            >
              <View>
                <Icon name="bell" size={24} color={colors.text} />
                {unread ? (
                  // Ponto em `danger` (não amarelo: 1,46:1 no claro) com anel da página.
                  <View
                    testID="feed-bell-dot"
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -3,
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: colors.danger,
                      borderWidth: 2,
                      borderColor: colors.background,
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
            <Pressable
              onPress={onPublish}
              accessibilityRole="button"
              accessibilityLabel="Publicar no Juntos"
              testID="feed-write"
              style={({ pressed }) => [
                {
                  minHeight: MIN_TOUCH,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: 20,
                  borderRadius: 999,
                  backgroundColor: colors.blue,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <AppText variant="action" style={{ color: colors.onBlue }}>
                Publicar
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
      {ready ? <HeaderShortcuts /> : null}
      {DEMO_LABELS_ON_SCREEN && isCommunityDemo() ? <DemoBadge /> : null}
      <Rule />
    </View>
  );
}

/**
 * Os dois atalhos do topo (pedido do fundador, 2026-09-22). Até aqui só se
 * chegava ao perfil da comunidade e a "Minhas publicações" por "Conta e
 * privacidade", fora da aba: quem quisesse colocar a foto ou ver o que publicou
 * não tinha caminho de dentro do Juntos.
 *
 * Linha própria, embaixo do título, para caber com a fonte grande (a linha
 * quebra, não corta) e para não disputar espaço com o sino nem com "Publicar".
 * Cada um tem ícone E texto; o ícone nunca carrega o significado sozinho.
 */
function HeaderShortcuts() {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: spacing.xl,
        paddingHorizontal: FEED_GUTTER,
        paddingBottom: spacing.xs,
      }}
    >
      <HeaderShortcut
        icon="person"
        label="Seu perfil"
        accessibilityLabel="Seu perfil no Juntos: foto, nome e ministério"
        onPress={() => router.push(COMMUNITY_ROUTES.perfil)}
        testID="feed-profile"
      />
      <HeaderShortcut
        icon="note"
        label="Minhas publicações"
        onPress={() => router.push(COMMUNITY_ROUTES.minhas)}
        testID="feed-my-posts"
      />
    </View>
  );
}

function HeaderShortcut({
  icon,
  label,
  accessibilityLabel,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <Icon name={icon} size={20} color={colors.blue} />
      <AppText variant="rowLabel" style={{ color: colors.blue }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Selo discreto da demonstração (demoApi.ts): nada sai do aparelho. */
function DemoBadge() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: FEED_GUTTER, paddingBottom: spacing.xs, flexDirection: 'row' }}>
      <View
        testID="feed-demo-badge"
        accessible
        accessibilityLabel="Demonstração. Nada é enviado."
        style={{
          borderWidth: 1,
          borderColor: colors.controlBorder,
          borderRadius: 999,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
        }}
      >
        <AppText variant="caption" style={{ color: colors.textSecondary }}>
          {DEMO_BADGE}
        </AppText>
      </View>
    </View>
  );
}

function OfflineNotice() {
  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }} testID="feed-offline">
      <OfflineBanner />
      <AppText variant="bodySm">O Juntos volta quando a internet voltar.</AppText>
    </View>
  );
}

type CommentsOpen = { target: CommentsTarget; text: string; notice: string | null };

function ReadyFeed({
  header,
  api,
  status,
  online,
  day,
  reload,
}: {
  header: ReactNode;
  api: CommunityApi;
  status: CommunityStatus;
  online: boolean;
  day: number;
  /** Perguntar o estado de novo (depois do aceite registrado no toque). */
  reload: () => void;
}) {
  const journey = useJourney();
  // Um feed só: toda a igreja. O ministério ainda vem no perfil (o cartão mostra
  // "Nome · Ministério"), mas não escolhe mais o que se lê nem para onde se publica.
  const feed = useFeed(api, status.displayName ?? 'Você', status.profile.ministry, status.profile.avatarPath);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [comments, setComments] = useState<CommentsOpen | null>(null);

  // Carrega ao aparecer e se atualiza ao voltar de Publicar, da Atividade ou do consentimento.
  useFocusEffect(feed.onFocus);

  const gated = needsConsent(status);
  const [consentNotice, setConsentNotice] = useState<string | null>(null);

  /* ------------------------------------------------------------- o aceite
     SEM TELA (decisão do fundador, 2026-09-22): a linha `AceiteLine` fica à
     vista embaixo do topo enquanto o aceite falta, e o PRÓPRIO toque no Amém
     registra 16+, as regras e o consentimento destacado (`useAceite`, as mesmas
     RPCs) antes de o Amém ir ao servidor — como o Google Play e o Apple 1.2
     pedem. Nada de rota no meio, nada de Amém guardado para depois.

     Três coisas podem impedir, e cada uma é dita na hora: texto ainda não
     aprovado pela igreja (Launch Gate), pessoa sem nome nenhum (o servidor
     recusa, CM007; daqui ela vai ao perfil pelo atalho do topo) e recusa do
     servidor. */
  const [docs] = useState(aceiteDocs);
  const aceite = useAceite(docs, { kind: 'ready', status, api });
  const aceiteName = status.displayName ?? status.profile.displayName ?? '';

  /** Registra o aceite, se faltar. false = não deu, e a tela já disse por quê. */
  const ensureAceite = async (): Promise<boolean> => {
    if (!gated) return true;
    // Já está registrando: o segundo toque espera, não vira erro.
    if (aceite.busy) return false;
    const block = aceite.availability !== null ? availabilityNotice(aceite.availability) : null;
    if (block) {
      setConsentNotice(block);
      announceNotice(block);
      return false;
    }
    if (aceiteNeeds(status).name && !nameOk(aceiteName)) {
      setConsentNotice(ACEITE_NEEDS_NAME);
      announceNotice(ACEITE_NEEDS_NAME);
      return false;
    }
    const ok = await aceite.accept({ name: aceiteName });
    if (!ok) {
      const message = aceite.error ?? 'Não deu para registrar agora. Tente de novo.';
      setConsentNotice(message);
      announceNotice(message);
      return false;
    }
    setConsentNotice(AFTER_CONSENT_FEED);
    announceNotice(AFTER_CONSENT_FEED);
    // O estado novo (já liberado) chega pelo recarregar; o Amém não espera por ele.
    reload();
    return true;
  };

  // A conversa abre vazia e fica aberta: não há mais rascunho guardado enquanto a
  // pessoa aceita numa outra tela, porque essa tela não existe (2026-09-22).
  const openComments = (target: CommentsTarget) => setComments({ target, text: '', notice: null });

  const state = feed.state;
  let list: ReactNode;
  if (state.phase === 'loading') {
    list = <FeedSkeleton gutter={FEED_GUTTER} />;
  } else if (state.phase === 'error') {
    list = (
      <View style={{ paddingHorizontal: FEED_GUTTER }}>
        <FeedError message={state.message} onRetry={() => feed.reload()} />
      </View>
    );
  } else if (state.posts.length === 0 && state.inReview.length === 0) {
    list = (
      <View style={{ paddingHorizontal: FEED_GUTTER }}>
        <FeedEmpty day={day} firstDay={day <= 1} />
      </View>
    );
  } else {
    const cards = [...state.inReview, ...state.posts];
    list = (
      <View>
        {cards.map((card) => (
          <PostCard
            key={`${card.inReview ? 'r' : 'p'}-${card.postId}`}
            card={card}
            gutter={FEED_GUTTER}
            photos={feed.photos}
            onAmen={(next) => {
              setConsentNotice(null);
              void (async () => {
                // O aceite, se faltar, é registrado neste toque — e só então o Amém vai.
                if (!(await ensureAceite())) return;
                feed.toggleAmen(card.postId, next);
              })();
            }}
            onComments={() => openComments({ postId: card.postId, authorName: card.authorName })}
            onOpenReading={(target) =>
              router.push(target.kind === 'dia' ? readerHref(target.day) : verseHref(target.verse))
            }
            onMore={() =>
              setSheet({
                kind: 'post',
                postId: card.postId,
                authorName: card.authorName,
                isMine: card.isMine,
                hasPhoto: card.photoPaths.length > 0,
              })
            }
          />
        ))}
        <View style={{ paddingHorizontal: FEED_GUTTER }}>
          {state.ended ? (
            <FeedEnd />
          ) : (
            <View style={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
              <Button
                title="Ver publicações anteriores"
                variant="outline"
                loading={feed.loadingMore}
                onPress={() => feed.loadMore()}
                testID="feed-more"
              />
              {feed.moreError ? <SaveErrorNotice message={feed.moreError} testID="feed-more-error" /> : null}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} accessibilityLabel="Atualizar" />
        }
        testID="feed-scroll"
      >
        {header}
        <View style={{ paddingHorizontal: FEED_GUTTER, gap: spacing.sm }}>
          <DevContentBanner state={journey.contentState} compact />
          {!online ? <OfflineNotice /> : null}
          {/* A linha do aceite, enquanto ele falta: diz o que o próximo toque
              (dizer Amém, comentar, publicar) significa, ANTES do toque, e o link
              abre as regras e o consentimento destacado. Depois do aceite ela sai. */}
          {gated ? (
            <AceiteLine onOpenRules={() => router.push(COMMUNITY_ROUTES.regras)} testID="feed-aceite-line" />
          ) : null}
          {feed.notice ? <SaveErrorNotice message={feed.notice} testID="feed-notice" /> : null}
          {consentNotice ? (
            <AppText variant="rowLabel" accessibilityLiveRegion="polite" testID="feed-consent-notice">
              {consentNotice}
            </AppText>
          ) : null}
        </View>
        {list}
        {state.phase === 'ready' ? (
          // "Minhas publicações" saiu do fim da rolagem: virou atalho do TOPO
          // (2026-09-22), e repetir o mesmo destino duas vezes na mesma tela só
          // daria dois botões com o mesmo nome para o leitor de tela.
          <View style={{ paddingHorizontal: FEED_GUTTER, gap: spacing.xs }}>
            <Button
              title="Regras do Juntos"
              variant="underline"
              onPress={() => router.push(COMMUNITY_ROUTES.regras)}
              testID="feed-rules"
            />
          </View>
        ) : null}
      </ScrollView>
      <ReportSheet
        api={api}
        target={sheet}
        onClose={() => setSheet(null)}
        onDeleted={(t) => t.kind === 'post' && feed.removeCard(t.postId)}
        onHidden={(t) => t.kind === 'post' && feed.removeCard(t.postId)}
        onBlocked={(t) => feed.afterBlock(t.kind === 'post' ? t.postId : null)}
      />
      <CommentsSheet
        api={api}
        status={status}
        target={comments?.target ?? null}
        initialText={comments?.text}
        initialNotice={comments?.notice}
        onClose={() => setComments(null)}
        // A folha registra o aceite no próprio toque (Enviar, ou o Amém de um
        // comentário): ela não fecha e ninguém navega. Só o estado da comunidade
        // precisa ser perguntado de novo depois.
        onAccepted={reload}
        onCountChange={feed.bumpComments}
        onPostGone={() => feed.afterBlock(null)}
      />
    </>
  );
}
