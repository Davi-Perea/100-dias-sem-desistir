import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { SUPPORT_EMAIL } from '@/config/contato';
import { contentState } from '@/journey/datasetSource';
import type { RightsStatus } from '@/journey/types';
import { useDataset } from '@/journey/useJourney';
import { getBibleProvider } from '@/reader/provider';
import { AppText, Cap, DevContentBanner, Rule, SettingRow } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SubScreen } from '@/ui/voce/SubScreen';

/**
 * A situação dos direitos em palavras. O valor técnico do dado
 * (`pending_authorization` e afins) nunca aparece para quem usa o app (F5/REGRAS).
 */
const RIGHTS_LABEL: Record<RightsStatus, string> = {
  dev_fixture: 'conteúdo de desenvolvimento, fictício',
  pending_authorization: 'aguardando autorização escrita da igreja',
  partially_authorized: 'autorizado em parte pela igreja',
  authorized: 'autorizado pela igreja',
};

/**
 * Ajuda: o que o app faz, o que fica privado e de onde vem o conteúdo.
 * PROVISÓRIO (pergunta 12 ao designer): tela não desenhada; mesma função de
 * antes, com os componentes novos.
 */
export default function HelpScreen() {
  const dataset = useDataset();
  const metadata = getBibleProvider().getMetadata();
  const rights = RIGHTS_LABEL[dataset.provenance.rights_status] ?? 'situação não informada';

  return (
    <SubScreen
      title="Ajuda e contato"
      // PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo compacto, abaixo do cabeçalho.
      banner={<DevContentBanner state={contentState()} compact />}
    >
      <View style={{ gap: spacing.md }}>
        <Cap>Como funciona</Cap>
        <AppText variant="bodySm">
          A igreja inteira segue o mesmo dia. O dia oficial não retrocede quando você falta: os dias que
          passaram continuam abertos e os que ainda não chegaram abrem na data.
        </AppText>
        <SettingRow label="Sobre os 100 dias" onPress={() => router.push('/proposito')} first testID="help-proposito" />
      </View>

      <Rule />

      <View style={{ gap: spacing.md }}>
        <Cap>O que fica só com você</Cap>
        {/*
          Texto do app (não da igreja). Sem "insight" nem "grupo": o redesenho
          trocou o insight por "escrever para a igreja" (B4/C3), que ainda não
          existe, e o grupo (D4) não foi decidido.
        */}
        <AppText variant="bodySm">
          Suas reflexões, seu jejum e seu progresso ficam neste aparelho. Nada disso vai para a liderança ou
          para um relatório. Se um dia existir um espaço para escrever para a igreja, o que você escrever lá
          será sempre um texto novo: a reflexão privada nunca vira publicação.
        </AppText>
      </View>

      {/*
        Apple 1.5: contato alcançável no app. Sem e-mail preenchido em
        config/contato.ts a seção não aparece (nunca um link quebrado).
      */}
      {SUPPORT_EMAIL ? (
        <>
          <Rule />
          <View style={{ gap: spacing.md }}>
            <Cap>Fale com a gente</Cap>
            <SettingRow
              label="Enviar um e-mail"
              value={SUPPORT_EMAIL}
              onPress={() => {
                Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
              }}
              first
              testID="help-contact"
            />
          </View>
        </>
      ) : null}

      <Rule />

      <View style={{ gap: spacing.md }}>
        <Cap>Conteúdo e direitos</Cap>
        <AppText variant="bodySm" testID="help-rights">
          Fonte editorial: {dataset.provenance.source_name}. Situação dos direitos: {rights}.
        </AppText>
        <AppText variant="caption">{metadata.copyrightNotice}</AppText>
      </View>
    </SubScreen>
  );
}
