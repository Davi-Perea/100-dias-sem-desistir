import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { requestAccountDeletion, signOut } from '@/cloud/auth';
import { ACCOUNT_DELETION_AVAILABLE } from '@/cloud/config';
import { CloudError } from '@/cloud/errors';
import { COMMUNITY_ENABLED } from '@/config/features';
import { AppText, Block, Button, Cap } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { accountDeletionUrl } from './copy';
import { ConfirmSheet, LineField } from './parts';

export const DELETE_WORD = 'EXCLUIR';

/**
 * "Excluir a conta" (Apple 5.1.1(v), LGPD art. 18). Depende só da conta, nunca da
 * Comunidade: não chama CommunityApi nem my_community_status, para que um erro
 * no servidor da comunidade não esconda a exclusão de quem tem sessão válida.
 * Montada em /conta (sempre que a exclusão existe) e em "Conta e privacidade"
 * da comunidade.
 *
 * O botão só aparece quando a exclusão existe de verdade
 * (`ACCOUNT_DELETION_AVAILABLE`, a Edge Function `delete-account`); antes disso
 * a seção diz a verdade, sem botão morto. Confirmação forte: digitar EXCLUIR.
 */
export function AccountDeletionSection() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webUrl = accountDeletionUrl();

  const explanation = COMMUNITY_ENABLED
    ? 'Excluir a conta apaga a sua conta e tudo o que você fez na comunidade: publicações, comentários, fotos e ' +
      'Améns somem para todos. Sua leitura, seu jejum e as suas reflexões ficam neste aparelho, que não depende da ' +
      'conta.'
    : 'Excluir a conta apaga a sua conta e o que está guardado nela no servidor. Sua leitura, seu jejum e as suas ' +
      'reflexões ficam neste aparelho, que não depende da conta.';
  const sheetMessage = COMMUNITY_ENABLED
    ? 'A conta e tudo o que você fez na comunidade são apagados para sempre: publicações, comentários, fotos e Améns. Não dá para desfazer.'
    : 'A conta e o que está guardado nela no servidor são apagados para sempre. Não dá para desfazer.';

  const confirmDeletion = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestAccountDeletion();
      await signOut().catch(() => {});
      setOpen(false);
      router.replace('/');
    } catch (err) {
      setError(err instanceof CloudError ? err.message : 'Não foi possível excluir a conta agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }} testID="account-delete-section">
      <Cap>Excluir a conta</Cap>
      <Block tone="muted">
        <AppText variant="bodySm" style={{ color: colors.textSecondary }}>
          {explanation}
        </AppText>
      </Block>
      {webUrl ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="bodySm">Também dá para excluir pela web, sem o app:</AppText>
          <Button
            title="Abrir a página de exclusão"
            variant="underline"
            accessibilityHint="Abre o navegador"
            onPress={() => {
              Linking.openURL(webUrl).catch(() => {});
            }}
            testID="account-delete-web"
          />
        </View>
      ) : null}
      {ACCOUNT_DELETION_AVAILABLE ? (
        <Button
          title="Excluir minha conta"
          variant="danger"
          onPress={() => {
            setError(null);
            setTyped('');
            setOpen(true);
          }}
          testID="account-delete"
        />
      ) : (
        <AppText variant="caption" testID="account-delete-unavailable">
          A exclusão da conta pelo app ainda não está disponível nesta versão de teste.
        </AppText>
      )}

      <ConfirmSheet
        visible={open}
        title="Excluir a sua conta?"
        message={sheetMessage}
        confirmLabel="Excluir minha conta"
        confirmDisabled={typed.trim().toUpperCase() !== DELETE_WORD}
        onConfirm={confirmDeletion}
        onClose={() => setOpen(false)}
        busy={busy}
        error={error}
        testID="sheet-delete"
      >
        <View style={{ gap: spacing.sm }}>
          <AppText variant="rowLabel">Para confirmar, digite {DELETE_WORD}.</AppText>
          <LineField
            value={typed}
            onChangeText={setTyped}
            accessibilityLabel={`Digite ${DELETE_WORD} para confirmar`}
            autoCapitalize="characters"
            testID="sheet-delete-input"
          />
        </View>
      </ConfirmSheet>
    </View>
  );
}
