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
import { COMMUNITY_ENTRY_ROUTE, COMMUNITY_PROFILE_ROUTE, MY_POSTS_ROUTE } from '@/ui/comunidade/perfil/routes';
import {
  AccountStateView,
  ActionError,
  ConfirmSheet,
  ProfileScreen,
} from '@/ui/comunidade/perfil/parts';
import { communityMessage, useCommunityAccount } from '@/ui/comunidade/perfil/useCommunityAccount';
import { spacing } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';

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
 * Desde 2026-09-22 (C2) a conta pode ser só a do aparelho, sem e-mail. O perfil
 * (foto, nome, ministério, bio, 16+ e o e-mail opcional com novidades) tem tela
 * própria. Sem CPF, telefone ou data de nascimento.
 */

type Sheet = 'purge' | 'leave' | 'signout' | { unblock: MyBlock } | null;

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
  email: string | null;
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
      if (done) {
        setNotice(done);
        // accessibilityRole alert não fala sozinho no iOS.
        announceNotice(done);
      }
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
        <SettingRow
          first
          label={email ? 'E-mail da conta' : 'Conta'}
          value={email ?? 'ligada a este celular'}
          testID="account-email"
        />
        {member ? (
          <SettingRow
            label="Perfil na comunidade"
            value={status.displayName ?? undefined}
            onPress={() => router.push(COMMUNITY_PROFILE_ROUTE)}
            testID="account-display-name"
          />
        ) : null}
        {!member ? (
          <SettingRow
            label="Entrar na comunidade"
            onPress={() => router.push(COMMUNITY_ENTRY_ROUTE)}
            testID="account-enter"
          />
        ) : null}
        <AppText variant="caption">
          {email
            ? 'Ninguém na comunidade vê o seu e-mail.'
            : 'Sem e-mail, trocar de celular ou apagar o app faz perder esta conta. No perfil você pode deixar um e-mail (opcional).'}
        </AppText>
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
              bloqueios e o seu nome. A sua conta e a sua jornada continuam. Para participar de novo, crie o perfil
              outra vez.
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
          // Conta só do aparelho: sair perde o acesso para sempre. Pede confirmação.
          onPress={email ? leaveAccount : () => open('signout')}
          loading={busy && sheet === null}
          testID="account-sign-out"
        />
      </View>

      <ConfirmSheet
        visible={sheet === 'signout'}
        title="Sair desta conta?"
        message="Esta conta não tem e-mail: depois de sair, não dá para voltar a ela. Para participar de novo, será preciso criar o perfil outra vez."
        confirmLabel="Sair mesmo assim"
        onConfirm={() => {
          setSheet(null);
          leaveAccount();
        }}
        onClose={() => setSheet(null)}
        busy={busy}
        testID="sheet-signout"
      />

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
            `Você desbloqueou ${unblockTarget.displayName}.`,
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
