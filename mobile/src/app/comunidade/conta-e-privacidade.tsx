import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { signOut } from '@/cloud/auth';
import { demoSignOut } from '@/community/demoApi';
import { CloudError } from '@/cloud/errors';
import type { CommunityApi } from '@/community/api';
import type { CommunityStatus, MyBlock } from '@/community/types';
import { AppText, Button, Cap, Rule, SettingRow } from '@/ui/components';
import { AccountDeletionSection } from '@/ui/comunidade/perfil/AccountDeletionSection';
import { COMMUNITY_ENTRY_ROUTE, MY_POSTS_ROUTE } from '@/ui/comunidade/perfil/routes';
import {
  AccountStateView,
  ActionError,
  ConfirmSheet,
  ProfileScreen,
} from '@/ui/comunidade/perfil/parts';
import { communityMessage, useCommunityAccount } from '@/ui/comunidade/perfil/useCommunityAccount';
import { spacing } from '@/ui/theme';

/**
 * Conta e privacidade da Comunidade.
 *
 * - Sair da conta.
 * - Apagar tudo o que publiquei (`revoke_community_publish_consent`): tira do ar
 *   e apaga posts, comentários e Améns, e retira o consentimento de publicar. A
 *   pessoa continua lendo; para publicar de novo, aceita outra vez.
 * - Deixar de participar da comunidade (`leave_community`): é a revogação
 *   completa. Um toque e uma confirmação, tão fácil quanto aceitar.
 * - Pessoas que bloqueei, com "Desbloquear".
 * - Excluir a conta: AccountDeletionSection, o mesmo bloco de /conta, que não
 *   depende da Comunidade (explica o que some, confirmação forte e o caminho
 *   pela web; sem a exclusão pronta, diz a verdade sem botão morto).
 *
 * Nenhum dado além do e-mail e do nome escolhido: sem CPF, telefone ou data de nascimento.
 */

type Sheet = 'purge' | 'leave' | { unblock: MyBlock } | null;

export default function CommunityAccountScreen() {
  const account = useCommunityAccount();
  if (account.kind !== 'ready') return <AccountStateView account={account} />;
  return (
    <AccountAndPrivacy api={account.api} status={account.status} email={account.email} />
  );
}

function AccountAndPrivacy({
  api,
  status,
  email,
}: {
  api: CommunityApi;
  status: CommunityStatus;
  email: string;
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<MyBlock[] | null>(null);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [blocksTick, setBlocksTick] = useState(0);

  // Depois de sair, a tela muda na hora, sem recarregar (a confirmação continua à vista).
  const [left, setLeft] = useState(false);
  const member = status.isMember && !left;

  useEffect(() => {
    if (!member) return;
    let alive = true;
    api.myBlocks().then(
      (list) => {
        if (alive) {
          setBlocks(list);
          setBlocksError(null);
        }
      },
      (error: unknown) => {
        if (alive) setBlocksError(communityMessage(error));
      },
    );
    return () => {
      alive = false;
    };
  }, [api, member, blocksTick]);

  const open = useCallback((next: Sheet) => {
    setSheetError(null);
    setNotice(null);
    setSheet(next);
  }, []);

  const run = async (action: () => Promise<void>, done: string | null, after?: () => void) => {
    setBusy(true);
    setSheetError(null);
    try {
      await action();
      setSheet(null);
      if (done) setNotice(done);
      after?.();
    } catch (error) {
      setSheetError(
        error instanceof CloudError ? error.message : communityMessage(error, 'Não foi possível concluir agora. Tente de novo.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const leaveAccount = async () => {
    setBusy(true);
    setSignOutError(null);
    try {
      await signOut();
      demoSignOut();
      router.replace('/');
    } catch (error) {
      setSignOutError(error instanceof CloudError ? error.message : 'Não foi possível sair da conta.');
    } finally {
      setBusy(false);
    }
  };

  const unblockTarget = sheet && typeof sheet === 'object' ? sheet.unblock : null;

  return (
    <ProfileScreen testID="community-account">
      <AppText variant="screenTitle" accessibilityRole="header">
        Conta e privacidade
      </AppText>

      <View style={{ gap: spacing.xs }}>
        <Cap>Sua conta</Cap>
        <SettingRow first label="E-mail" value={email} testID="account-email" />
        {member && status.displayName ? (
          <SettingRow label="Nome na comunidade" value={status.displayName} testID="account-display-name" />
        ) : null}
        {!member ? (
          <SettingRow
            label="Entrar na comunidade"
            onPress={() => router.push(COMMUNITY_ENTRY_ROUTE)}
            testID="account-enter"
          />
        ) : null}
        <AppText variant="caption">Ninguém na comunidade vê o seu e-mail.</AppText>
      </View>

      {notice ? (
        <AppText variant="rowLabel" accessibilityLiveRegion="polite" accessibilityRole="alert" testID="account-notice">
          {notice}
        </AppText>
      ) : null}

      {member ? (
        <View style={{ gap: spacing.xs }}>
          <Cap>Minha participação</Cap>
          <SettingRow
            first
            label="Minhas publicações"
            onPress={() => router.push(MY_POSTS_ROUTE)}
            testID="account-my-posts"
          />
        </View>
      ) : null}

      {member ? (
        <View style={{ gap: spacing.sm }} testID="account-blocks">
          <Cap>Pessoas que bloqueei</Cap>
          <AppText variant="caption">
            Você não vê o que elas publicam, e elas não veem o que você publica. Elas não são avisadas.
          </AppText>
          {blocksError ? (
            <View style={{ gap: spacing.sm }}>
              <ActionError message={blocksError} testID="account-blocks-error" />
              <Button title="Tentar de novo" variant="underline" onPress={() => setBlocksTick((v) => v + 1)} />
            </View>
          ) : blocks === null ? (
            <AppText variant="caption" accessibilityLiveRegion="polite">
              Carregando…
            </AppText>
          ) : blocks.length === 0 ? (
            <AppText variant="bodySm" testID="account-blocks-empty">
              Você não bloqueou ninguém.
            </AppText>
          ) : (
            blocks.map((block, index) => (
              <View key={block.blockId}>
                {index > 0 ? <Rule /> : null}
                <View
                  style={{
                    minHeight: 48,
                    paddingVertical: spacing.sm,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: spacing.md,
                  }}
                >
                  <AppText variant="rowLabel" style={{ flexGrow: 1, flexShrink: 1 }}>
                    {block.displayName}
                  </AppText>
                  <Button
                    title="Desbloquear"
                    variant="underline"
                    accessibilityLabel={`Desbloquear ${block.displayName}`}
                    onPress={() => open({ unblock: block })}
                    testID={`account-unblock-${block.blockId}`}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {member ? (
        <View style={{ gap: spacing.md }} testID="account-privacy">
          <Cap>Privacidade</Cap>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="action">Apagar tudo o que publiquei</AppText>
            <AppText variant="bodySm">
              Suas publicações, comentários e Améns saem do ar e são apagados. Você continua lendo a comunidade. Para
              publicar de novo, o app pede o seu consentimento outra vez.
            </AppText>
            <Button
              title="Apagar tudo o que publiquei"
              variant="outline"
              onPress={() => open('purge')}
              testID="account-purge"
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="action">Deixar de participar da comunidade</AppText>
            <AppText variant="bodySm">
              Retira o seu consentimento e apaga tudo o que você fez na comunidade: publicações, comentários, Améns,
              bloqueios e o seu nome. A sua conta e a sua jornada continuam. Para voltar, é preciso um código da
              igreja.
            </AppText>
            <Button
              title="Deixar de participar da comunidade"
              variant="outline"
              onPress={() => open('leave')}
              testID="account-leave"
            />
          </View>
        </View>
      ) : null}

      <AccountDeletionSection />

      <View style={{ gap: spacing.sm }}>
        <Rule />
        <ActionError message={signOutError} testID="account-sign-out-error" />
        <Button
          title="Sair desta conta"
          variant="outline"
          onPress={leaveAccount}
          loading={busy && sheet === null}
          testID="account-sign-out"
        />
      </View>

      <ConfirmSheet
        visible={sheet === 'purge'}
        title="Apagar tudo o que você publicou?"
        message="Suas publicações, comentários e Améns saem do ar e são apagados. Não dá para desfazer. As pessoas que você bloqueou continuam bloqueadas."
        confirmLabel="Apagar tudo"
        onConfirm={() =>
          run(() => api.revokePublishConsent(), 'Tudo o que você publicou foi apagado.', () =>
            setBlocksTick((value) => value + 1),
          )
        }
        onClose={() => setSheet(null)}
        busy={busy}
        error={sheetError}
        testID="sheet-purge"
      />

      <ConfirmSheet
        visible={sheet === 'leave'}
        title="Deixar de participar da comunidade?"
        message="Tudo o que você fez na comunidade é apagado e o seu consentimento é retirado. Sua conta e a sua jornada continuam."
        confirmLabel="Deixar de participar"
        onConfirm={() => run(() => api.leaveCommunity(), 'Você saiu da comunidade.', () => setLeft(true))}
        onClose={() => setSheet(null)}
        busy={busy}
        error={sheetError}
        testID="sheet-leave"
      />

      <ConfirmSheet
        visible={unblockTarget !== null}
        title={unblockTarget ? `Desbloquear ${unblockTarget.displayName}?` : 'Desbloquear?'}
        message="Vocês voltam a ver o que o outro publica. A pessoa não é avisada."
        confirmLabel="Desbloquear"
        onConfirm={() => {
          if (!unblockTarget) return;
          run(
            () => api.unblock(unblockTarget.blockId),
            `${unblockTarget.displayName} foi desbloqueado.`,
            () => setBlocks((current) => (current ?? []).filter((b) => b.blockId !== unblockTarget.blockId)),
          );
        }}
        onClose={() => setSheet(null)}
        busy={busy}
        error={sheetError}
        testID="sheet-unblock"
      />
    </ProfileScreen>
  );
}
