import { Fragment, useState } from 'react';
import { View } from 'react-native';

import { getDay } from '@/journey/datasetSource';
import { daysForMinistry, listMinistries } from '@/journey/ministries';
import { dateOfDay, formatDayDate } from '@/journey/officialDay';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { Campaign } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { REMINDERS_AVAILABLE } from '@/reminders/disponibilidade';
import { syncMinistryReminders } from '@/reminders/reminders';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Block, Cap, ChoiceRow, DevContentBanner, SAVE_ERROR_COPY, Screen, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { announceNotice } from '@/ui/voce/announce';
import { SubScreen } from '@/ui/voce/SubScreen';

/** "dd/mm", sem o ano, para as descrições curtas da lista. */
function shortDate(dayNumber: number, campaign: Campaign): string {
  const [, month, day] = dateOfDay(dayNumber, campaign).split('-');
  return `${day}/${month}`;
}

const SMALL_NUMBERS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];

/**
 * Descrição da escala de um ministério, lida do dataset. Dois dias é o caso
 * comum; a intercessão conduz o altar a cada quatro ou cinco dias, e a lista completa
 * dos dias fica no bloco "Seus dias no altar" quando ela é a escolhida.
 */
function describeDays(days: number[], campaign: Campaign): string {
  if (days.length === 0) return 'Sem dia na escala';
  if (days.length === 1) return `Dia ${days[0]} · ${shortDate(days[0], campaign)}`;
  if (days.length === 2) {
    return `Dias ${days[0]} e ${days[1]} · ${shortDate(days[0], campaign)} e ${shortDate(days[1], campaign)}`;
  }
  const gaps = days.slice(1).map((day, i) => day - days[i]);
  const shortest = Math.min(...gaps);
  const longest = Math.max(...gaps);
  const cadence =
    shortest >= 2
      ? ` · a cada ${shortest === longest ? (SMALL_NUMBERS[shortest] ?? shortest) : `${shortest} a ${longest}`} dias`
      : '';
  return `${days.length} dias${cadence}, a partir de ${shortDate(days[0], campaign)}`;
}

/**
 * Meu ministério. Escolha LOCAL, sem conta e sem papel: serve só para destacar
 * os dias em que o ministério conduz o altar das 12h30 e avisar na véspera.
 * Os nomes das pessoas da escala nunca aparecem aqui; só o ministério.
 *
 * PROVISÓRIO (pergunta 12 ao designer): tela não desenhada; mesma função de
 * antes, com os componentes novos. A permissão só é pedida no gesto de escolher
 * um ministério (REGRAS 13); recusa mantém a escolha e mostra o motivo.
 */
export default function MinistryScreen() {
  const journey = useJourney();
  const settings = useSettings();
  // O motivo de uma recusa fica colado ao ministério tocado, não no topo de
  // uma lista de ~40 opções, e é anunciado no iOS (onde a live region não existe).
  const [notice, setNotice] = useState<{ ministry: string; reason: string } | null>(null);

  if (!settings || !journey.ready) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const { campaign } = journey;
  const ministries = listMinistries();
  const mine = settings.ministry;
  const myDays = daysForMinistry(mine);

  const choose = async (name: string | null) => {
    setNotice(null);
    try {
      await updateSettings((s) => ({ ...s, ministry: name }));
    } catch {
      // PER-02: a escolha não gravou; o aviso aparece logo abaixo do ministério tocado.
      if (name) {
        setNotice({ ministry: name, reason: SAVE_ERROR_COPY });
        announceNotice(SAVE_ERROR_COPY);
      }
      return;
    }
    // Sem ministério não há véspera a agendar; o hook do layout cancela as antigas.
    if (!name) return;
    const result = await syncMinistryReminders(name, daysForMinistry(name), campaign, new Date(), { requestPermission: true });
    // Web (sem notificações locais) e permissão negada chegam pelo mesmo caminho.
    // A escolha fica: destacar os dias não depende de aviso.
    if (!result.ok) {
      setNotice({ ministry: name, reason: result.reason });
      announceNotice(result.reason);
    }
  };

  return (
    <SubScreen
      title="Meu ministério"
      gap={spacing.lg}
      // PROVISÓRIO (pergunta 5 ao designer): aviso de conteúdo compacto, abaixo do cabeçalho.
      banner={<DevContentBanner state={journey.contentState} compact />}
    >
      {/* Pelo navegador não há aviso na véspera: prometer um é prometer o que
          não vem (23/09/2026). Destacar os dias vale nos dois. */}
      <AppText variant="bodySm">
        {REMINDERS_AVAILABLE
          ? 'Fica só neste aparelho. Serve para destacar os dias em que o seu ministério conduz o altar das 12h30 e avisar você na véspera, às 19h.'
          : 'Fica só neste aparelho. Serve para destacar os dias em que o seu ministério conduz o altar das 12h30.'}
      </AppText>

      {mine ? (
        <Block>
          <View style={{ gap: spacing.sm }} testID="ministry-days">
            <Cap>Seus dias no altar</Cap>
            {myDays.map((day) => {
              const sphere = getDay(day)?.sphere ?? null;
              const line = `Dia ${day} · ${formatDayDate(day, campaign)}${sphere ? ` · ${SPHERE_LABEL[sphere]}` : ''}`;
              return (
                // "·" vira pausa para o leitor de tela (REGRAS 32).
                <AppText key={day} variant="item" accessibilityLabel={line.replace(/ · /g, ', ')}>
                  {line}
                </AppText>
              );
            })}
          </View>
        </Block>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <ChoiceRow
          label="Não faço parte de um ministério"
          compact
          selected={!mine}
          onPress={() => choose(null)}
          testID="ministry-none"
        />
        {ministries.map((entry, index) => (
          <Fragment key={entry.name}>
            <ChoiceRow
              label={entry.name}
              description={describeDays(entry.days, campaign)}
              // REGRAS 32: o leitor de tela não lê o "·" da descrição.
              accessibilityLabel={`${entry.name}. ${describeDays(entry.days, campaign).replace(/ · /g, ', ')}`}
              compact
              selected={mine === entry.name}
              onPress={() => choose(entry.name)}
              testID={`ministry-${index}`}
            />
            {notice && notice.ministry === entry.name ? (
              <AppText variant="caption" accessibilityLiveRegion="polite" testID="ministry-notice">
                {notice.reason}
              </AppText>
            ) : null}
          </Fragment>
        ))}
      </View>
    </SubScreen>
  );
}
