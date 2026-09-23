import { router } from 'expo-router';
import { View } from 'react-native';

import { isCloudConfigured } from '@/cloud/config';
import type { ContentState } from '@/journey/datasetSource';
import { formatDayDate } from '@/journey/officialDay';
import type { Campaign } from '@/journey/types';
import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';

import { AppText, Button, DevContentBanner, Highlight, Screen, ScreenScroll } from '../components';
import { HundredDayRuler } from '../HundredDayRuler';
import { spacing } from '../theme';
import { COUNTDOWN_NUMERAL, useDisplayNumeral } from './displayNumeral';
import { extensoCap } from './extenso';
import { JourneyHeader } from './JourneyHeader';

/**
 * A5 · antes da campanha. Nenhum conteúdo do dia 1 é revelado: nem leitura, nem
 * monte, nem ênfase — só a contagem, as datas das pontas e a régua inativa.
 */
export function BeforeCampaign({
  campaign,
  daysToStart,
  contentState,
}: {
  campaign: Campaign;
  daysToStart: number;
  contentState: ContentState;
}) {
  const total = campaign.total_days;
  const start = formatDayDate(1, campaign);
  const end = formatDayDate(total, campaign);
  // Correção de concordância: com um dia só, "Falta 1 dia".
  const lead = daysToStart === 1 ? 'Falta' : 'Faltam';
  const count = daysToStart === 1 ? '1 dia' : `${daysToStart} dias`;
  // Fonte grande: a política do numeral do marco (ver displayNumeral). A maior
  // palavra da frase ("Faltam") é a que não pode quebrar ao meio.
  const numeral = useDisplayNumeral(lead, COUNTDOWN_NUMERAL);
  // D-7: sem nuvem configurada (e, pela D-6, em release até existir exclusão de
  // conta), "Criar meu perfil" não aparece — nunca leva a uma tela "indisponível".
  const cloud = isCloudConfigured();

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        {/* Antes do Dia 1 não há dia lido: o contador entra com a campanha. */}
        <JourneyHeader />
        {/* Só o aviso de conteúdo FICTÍCIO (fixtures DEV). A pendência de
            autorização da igreja não aparece na Jornada — mora em Ajustes, em uma
            linha (feedback do fundador, 2026-09-22). */}
        <DevContentBanner state={contentState} compact />

        <View style={{ gap: spacing.lg }} onLayout={numeral.onLayout} testID="before-start-card">
          <AppText
            variant="displayXl"
            accessibilityRole="header"
            accessibilityLabel={`${lead} ${count}`}
            // TELAS A5: 52/52 −2,4 (o TOKENS diz 50/50 para "Faltam N dias"; a tela vence).
            style={numeral.style}
            maxFontSizeMultiplier={numeral.maxFontSizeMultiplier}
            testID="before-numeral"
          >
            {`${lead} `}
            <Highlight>{count}</Highlight>
          </AppText>
          {/* PROVISÓRIO (sem pergunta própria ao designer — LACUNAS C25): cópia literal do
              TELAS, que afirma "jejum"; a igreja ainda não confirmou jejum oficial
              (REGRAS §5.4). O total vem da campanha, não do texto. */}
          <AppText variant="read" style={{ fontSize: 20, lineHeight: 32 }}>
            {`A igreja começa em ${start}. ${extensoCap(total)} dias de jejum, oração e Palavra, todos juntos.`}
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <HundredDayRuler
            totalDays={total}
            officialDay={0}
            completed={[]}
            variant="inactive"
            accessibilityLabel={`A jornada de ${total} dias ainda não começou.`}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
            <AppText variant="caption" accessibilityLabel={`Dia 1, ${start}`}>
              {`Dia 1 · ${start}`}
            </AppText>
            <AppText variant="caption" accessibilityLabel={`Dia ${total}, ${end}`}>
              {`Dia ${total} · ${end}`}
            </AppText>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {/* PROVISÓRIO (sem pergunta própria ao designer — LACUNAS C27): o destino de
              "Ajustar meu lembrete" não foi definido; fica a tela de lembrete de hoje,
              que só pede a permissão sob o gesto de escolher um horário.
              No navegador o botão some: não há lembrete a ajustar (23/09/2026). */}
          {REMINDERS_AVAILABLE ? (
            <Button title="Ajustar meu lembrete" onPress={() => router.push('/lembrete')} testID="before-reminder" />
          ) : null}
          {/* PROVISÓRIO (pergunta 12 ao designer — LACUNAS B25): o D2 ("Criar perfil")
              ainda não existe como rota. Com a nuvem ligada, vai para a conta de hoje,
              que entra por e-mail; sem nuvem, o botão some (decisão D-7). */}
          {cloud ? (
            <Button
              title="Criar meu perfil"
              variant="outline"
              onPress={() => router.push('/conta')}
              testID="before-profile"
            />
          ) : null}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
