import { Alert, Linking, Platform, View } from 'react-native';

import { isCloudConfigured } from '@/cloud/config';
import { PRIVACY_URL } from '@/config/contato';
import { wipeLocalData } from '@/settings/wipeLocalData';
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
    Alert.alert(
      'Apagar seus dados deste aparelho?',
      'Progresso, reflexões, jejum e preferências serão apagados. Não dá para desfazer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          // Com as preferências no padrão, o portão do onboarding recomeça o app
          // e os lembretes agendados são cancelados pela sincronização.
          onPress: () => {
            wipeLocalData().catch(() =>
              Alert.alert('Não foi possível apagar', 'Tente de novo. Se continuar, reinicie o app.'),
            );
          },
        },
      ],
    );

  return (
    <SubScreen title="Privacidade" testID="privacy-screen">
      <View style={{ gap: spacing.md }}>
        <Cap>Fica neste aparelho</Cap>
        <AppText variant="bodySm">
          Seu progresso, suas reflexões, seu jejum e suas preferências ficam guardados só neste aparelho.
        </AppText>
        {/*
          Precisão, não ressalva jurídica (auditoria de 2026-09-23): no Android o
          backup na nuvem está desligado no app.config (allowBackup: false). No
          iPhone, o backup do iCloud é do sistema e leva os dados do app junto —
          para o iCloud da própria pessoa, nunca para a igreja. Dizer "só neste
          aparelho" sem essa linha era promessa que o app não cumpre sozinho.
        */}
        {Platform.OS === 'ios' ? (
          <AppText variant="bodySm" testID="privacy-icloud">
            Se você usa o backup do iCloud, essas informações entram no seu próprio backup, como as dos outros
            apps. Elas continuam sendo suas: não vão para a igreja nem para a liderança.
          </AppText>
        ) : null}
        {cloud ? null : (
          <AppText variant="bodySm" testID="privacy-no-send">
            Nesta versão o app não envia seus dados a ninguém. Não há conta, anúncio nem rastreamento. Os
            lembretes são avisos do próprio aparelho.
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
