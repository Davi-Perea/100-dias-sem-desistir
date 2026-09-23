import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { SUPPORT_EMAIL } from '@/config/contato';
import { FUTURE_DAYS_OPEN } from '@/config/features';
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
  // Nada de rótulo sem valor (feedback do fundador, 2026-09-22): `null`, string
  // vazia e espaços em branco são a MESMA coisa — não há contato. O `''` já caía
  // fora pela veracidade; `'   '` passava e renderizaria "Enviar um e-mail" com
  // um valor invisível ao lado.
  const supportEmail = SUPPORT_EMAIL?.trim() || null;
  const metadata = getBibleProvider().getMetadata();
  // Mesma regra do leitor: sem tradução licenciada não há aviso de copyright a
  // mostrar. O do provedor de desenvolvimento é texto de placeholder (2.1).
  const hasLicensedText = !metadata.isDevPlaceholder;
  const rights = RIGHTS_LABEL[dataset.provenance.rights_status] ?? 'situação não informada';

  return (
    <SubScreen
      // Sem contato preenchido o título não promete um (1.5).
      title={supportEmail ? 'Ajuda e contato' : 'Ajuda'}
      // Só o aviso de conteúdo FICTÍCIO desenha aqui. A pendência de autorização
      // da igreja saiu das telas em 2026-09-22 e virou uma linha em Ajustes.
      banner={<DevContentBanner state={contentState()} compact />}
    >
      <View style={{ gap: spacing.md }}>
        <Cap>Como funciona</Cap>
        {/*
          A frase antiga dizia que o dia futuro "abre na data". Com
          FUTURE_DAYS_OPEN ligado (decisão do fundador), os 100 dias abrem desde
          o começo, e a pessoa derrubava a frase com um toque. O texto passa a
          descrever o que o app faz de verdade, incluindo a parte que não é
          óbvia: ler adiantado não empurra o progresso (auditoria de 2026-09-23).
        */}
        <AppText variant="bodySm">
          {FUTURE_DAYS_OPEN
            ? 'A igreja inteira segue o mesmo dia. O dia oficial não retrocede quando você falta: os dias que passaram continuam abertos, e os que ainda não chegaram você pode ler adiantado — só que o progresso continua seguindo o dia da igreja.'
            : 'A igreja inteira segue o mesmo dia. O dia oficial não retrocede quando você falta: os dias que passaram continuam abertos e os que ainda não chegaram abrem na data.'}
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
        Apple 1.5: contato alcançável no app. Sem e-mail em config/contato.ts a
        seção INTEIRA some — filete, cap "Fale com a gente" e linha. Nunca um
        rótulo sem valor, nunca um link quebrado, nunca um endereço inventado.
      */}
      {supportEmail ? (
        <>
          <Rule />
          <View style={{ gap: spacing.md }}>
            <Cap>Fale com a gente</Cap>
            <SettingRow
              label="Enviar um e-mail"
              value={supportEmail}
              onPress={() => {
                Linking.openURL(`mailto:${supportEmail}`).catch(() => {});
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
        {hasLicensedText ? (
          <AppText variant="caption" testID="help-copyright">
            {metadata.copyrightNotice}
          </AppText>
        ) : null}
      </View>
    </SubScreen>
  );
}
