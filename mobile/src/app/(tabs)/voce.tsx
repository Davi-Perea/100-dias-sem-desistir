import { router } from 'expo-router';

import { SUPPORT_EMAIL } from '@/config/contato';
import { isDemoMode } from '@/config/demo';
import { fastingKeptCount, useFasting } from '@/fasting/fastingStore';
import { useJourney } from '@/journey/useJourney';
import { completedDayNumbers } from '@/progress/completionsStore';
import { reflectionCount, useReflections } from '@/reflections/reflectionsStore';
import { useSettings } from '@/settings/settingsStore';
import { AppText, Button, Screen, ScreenScroll, SettingRow, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { ProgressBlock } from '@/ui/voce/ProgressBlock';
import { StartHereCard, type StartStepId } from '@/ui/voce/StartHereCard';
import { RowGroup } from '@/ui/voce/SubScreen';

const READING_MODE_LABEL: Record<string, string> = {
  in_app: 'No app',
  own_bible: 'Minha Bíblia',
  both: 'Vou alternar',
};

/**
 * D1 · Você. Só o que tem destaque fica à vista: MEU PROGRESSO e uma lista curta
 * de linhas com chevron. O resto existe e mora dentro de cada linha, como nos
 * Ajustes do iPhone (pedido do fundador, 2026-09-21).
 *
 * Todo número desta tela é real e local (dias lidos, reflexões, jejum).
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: pedido de simplicidade do
 * fundador para a V1 sem nuvem). Saíram daqui, sem apagar as rotas:
 * - a identidade (avatar e nome): sem conta, dizia só "Sem conta conectada";
 * - "Conta e privacidade" (/conta): a nuvem está desligada na V1; a privacidade
 *   ganhou tela própria (/privacidade);
 * - o grupo Liderança (/grupo, /admin): depende de servidor;
 * - "Altar de hoje": abria Comunidade, que fica fora da V1; com ela saiu a faixa C-07
 *   daqui, porque esta tela deixou de mostrar conteúdo da igreja;
 * - o interruptor do aviso do altar das 12h30: foi para Lembretes (/lembrete).
 *
 * V1 (feedback do fundador, 2026-09-22): cartão "Comece por aqui" (nome, metas,
 * lembrete; some com os três feitos) e as linhas "Minhas metas" e "Minhas
 * anotações". Nome e metas saem de settings.profile, só neste aparelho.
 */
const START_ROUTES: Record<StartStepId, () => void> = {
  name: () => router.push({ pathname: '/metas', params: { secao: 'nome' } }),
  goals: () => router.push('/metas'),
  reminder: () => router.push('/lembrete'),
};

export default function YouScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const reflections = useReflections(journey.campaign.id);
  const fasting = useFasting(journey.campaign.id);

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const reminder = settings.reminder;
  const reminderLabel =
    reminder.slot === 'none'
      ? 'Desligado'
      : `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;
  const kept = fastingKeptCount(fasting);
  const goalCount = settings.profile.goals.length;

  return (
    <Screen>
      <ScreenScroll gap={spacing.xl}>
        <AppText variant="screenTitle" accessibilityRole="header" testID="voce-title">
          Você
        </AppText>

        {/* ------------------------------------------------- comece por aqui */}
        <StartHereCard settings={settings} onOpen={(step) => START_ROUTES[step]()} />

        {/* ---------------------------------------------------- meu progresso */}
        <ProgressBlock
          completedDays={completedDayNumbers(journey.completions)}
          totalDays={journey.campaign.total_days}
          officialDay={journey.officialDay}
          phase={journey.phase}
        />

        {/* ---------------------------------------------------- minha jornada */}
        <RowGroup title="Minha jornada">
          <SettingRow
            label="Minhas reflexões"
            value={String(reflectionCount(reflections))}
            onPress={() => router.push('/reflexoes')}
            first
            testID="row-reflections"
          />
          {/* B2: marca-texto e anotações ficam só no aparelho. */}
          <SettingRow label="Minhas anotações" onPress={() => router.push('/anotacoes')} testID="row-notes" />
          <SettingRow
            label="Minhas metas"
            value={goalCount === 0 ? 'Escolher' : `${goalCount} ${goalCount === 1 ? 'meta' : 'metas'}`}
            onPress={() => router.push('/metas')}
            testID="row-goals"
          />
          <SettingRow
            label="Meu ministério"
            value={settings.ministry ?? 'Escolher'}
            onPress={() => router.push('/ministerio')}
            testID="row-ministry"
          />
          {/* REGRAS §5 item 4: o jejum foi desenhado para sair sem refazer a tela. */}
          <SettingRow
            label="Meu jejum"
            value={settings.fastingEnabled ? `${kept} ${kept === 1 ? 'dia' : 'dias'}` : 'Desligado'}
            onPress={() => router.push('/jejum')}
            testID="row-fasting"
          />
        </RowGroup>

        {/* ----------------------------------------------------- preferências */}
        <RowGroup title="Preferências">
          <SettingRow
            label="Lembretes"
            value={reminderLabel}
            onPress={() => router.push('/lembrete')}
            first
            testID="row-reminder"
          />
          {/* Tamanho da letra e modo de leitura moram na mesma tela. */}
          <SettingRow
            label="Leitura"
            value={settings.readingMode ? READING_MODE_LABEL[settings.readingMode] : undefined}
            // Abre com "Como eu leio" em primeiro (o valor da linha) e o tamanho logo abaixo.
            onPress={() => router.push({ pathname: '/aparencia', params: { secao: 'leitura' } })}
            testID="row-reading"
          />
        </RowGroup>

        {/* ------------------------------------------------------------ sobre */}
        <RowGroup title="Sobre">
          <SettingRow
            label="Sobre os 100 dias"
            onPress={() => router.push('/proposito')}
            first
            testID="row-proposito"
          />
          <SettingRow label="Privacidade" onPress={() => router.push('/privacidade')} testID="row-privacy" />
          <SettingRow label={SUPPORT_EMAIL ? 'Ajuda e contato' : 'Ajuda'} onPress={() => router.push('/ajuda')} testID="row-help" />
        </RowGroup>

        {/* Modo demonstração (config/demo.ts): o app aparece como a pessoa o verá, sem o painel. */}
        {__DEV__ && !isDemoMode() ? (
          <Button title="Painel de desenvolvimento" variant="underline" onPress={() => router.push('/dev')} />
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}
