import { Linking, View } from 'react-native';

import { isCloudConfigured } from '@/cloud/config';
import { PRIVACY_URL } from '@/config/contato';
import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';
import { wipeLocalData } from '@/settings/wipeLocalData';
import { confirmar, avisar } from '@/ui/confirmar';
import { AppText, Button, Cap, Rule, SettingRow } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SubScreen } from '@/ui/voce/SubScreen';

/**
 * Privacidade (Você → Privacidade). O que fica no aparelho, o que sai (nada,
 * nesta versão) e como apagar tudo.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: tela nova, sem desenho, pedida
 * pelo fundador para a V1 sem nuvem; usa a casca `SubScreen` das telas do Você).
 *
 * A frase "o app não envia seus dados a ninguém" só é verdade com a nuvem
 * desligada. Se um dia a nuvem estiver configurada, a frase some em vez de
 * mentir (LGPD: convicção religiosa é dado sensível).
 */
export default function PrivacyScreen() {
  const cloud = isCloudConfigured();
  // Nada de rótulo sem valor (regra em config/contato.ts, feedback do fundador
  // de 2026-09-22): espaço em branco é a MESMA coisa que endereço nenhum. Sem
  // isto, uma URL só com espaços desenharia "Política de privacidade completa"
  // e o toque não abriria nada — o mesmo buraco que a Ajuda já fechou.
  const privacyUrl = PRIVACY_URL?.trim() || null;

  const confirmWipe = () =>
    confirmar(
      {
        titulo: 'Apagar seus dados deste aparelho?',
        mensagem: 'Progresso, reflexões, jejum e preferências serão apagados. Não dá para desfazer.',
        confirmar: 'Apagar',
        destrutivo: true,
      },
      // Com as preferências no padrão, o portão do onboarding recomeça o app
      // e os lembretes agendados são cancelados pela sincronização.
      () => {
        wipeLocalData().catch(() => avisar('Não foi possível apagar', 'Tente de novo. Se continuar, reinicie o app.'));
      },
    );

  return (
    <SubScreen title="Privacidade" testID="privacy-screen">
      <View style={{ gap: spacing.md }}>
        <Cap>Fica neste aparelho</Cap>
        <AppText variant="bodySm">
          Seu progresso, suas reflexões, seu jejum e suas preferências ficam guardados só neste aparelho.
        </AppText>
        {/*
          "Só neste aparelho" é literal, e os dois sistemas são barrados de forma
          explícita (auditoria externa de 2026-09-23, revalidada aqui):
            · Android — `android.allowBackup: false` no app.config: nada vai para
              o backup do Google Drive.
            · iOS — `RCTAsyncStorageExcludeFromBackup: true` no Info.plist, pelo
              mesmo app.config. A biblioteca já exclui por padrão, mas um padrão
              de terceiro pode mudar numa atualização; a promessa da tela não
              pode depender disso. O teste de app.config trava os dois.
          Nenhum destes dados sai por rede: não há chamada que os envie.
        */}
        {cloud ? null : (
          <AppText variant="bodySm" testID="privacy-no-send">
            Nesta versão o app não envia seus dados a ninguém. Não há conta, anúncio nem rastreamento.
            {/* A frase do lembrete só aparece onde o lembrete existe: no
                navegador ela descreveria uma função que não está lá. */}
            {REMINDERS_AVAILABLE ? ' Os lembretes são avisos do próprio aparelho.' : ''}
          </AppText>
        )}
      </View>

      <Rule />

      <View style={{ gap: spacing.md }}>
        <Cap>Apagar</Cap>
        <AppText variant="bodySm">
          Apaga tudo o que o app guardou neste aparelho e recomeça do início.
        </AppText>
        <Button
          title="Apagar meus dados deste aparelho"
          variant="danger"
          onPress={confirmWipe}
          accessibilityHint="Pede confirmação antes de apagar."
          testID="privacy-wipe"
        />
      </View>

      {privacyUrl ? (
        <>
          <Rule />
          <SettingRow
            label="Política de privacidade completa"
            onPress={() => {
              Linking.openURL(privacyUrl).catch(() => {});
            }}
            first
            testID="privacy-policy-link"
          />
        </>
      ) : null}
    </SubScreen>
  );
}
