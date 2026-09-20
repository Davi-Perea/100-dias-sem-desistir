import { useState } from 'react';
import { View } from 'react-native';

import { getDay } from '@/journey/datasetSource';
import { daysForMinistry, listMinistries } from '@/journey/ministries';
import { dateOfDay, formatDayDate } from '@/journey/officialDay';
import { SPHERE_LABEL } from '@/journey/spheres';
import type { Campaign } from '@/journey/types';
import { useJourney } from '@/journey/useJourney';
import { syncMinistryReminders } from '@/reminders/reminders';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Block, Cap, ChoiceRow, DevContentBanner, Screen, ScreenScroll, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';

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
 */
export default function MinistryScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const [notice, setNotice] = useState<string | null>(null);

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
    await updateSettings((s) => ({ ...s, ministry: name }));
    // Sem ministério não há véspera a agendar; o hook do layout cancela as antigas.
    if (!name) return;
    const result = await syncMinistryReminders(name, daysForMinistry(name), campaign, new Date());
    // Web (sem notificações locais) e permissão negada chegam pelo mesmo caminho.
    // A escolha fica: destacar os dias não depende de aviso.
    if (!result.ok) setNotice(result.reason);
  };

  return (
    <Screen>
      <ScreenScroll gap={spacing.lg}>
        <DevContentBanner state={journey.contentState} compact />

        <View style={{ gap: spacing.xs }}>
          <Cap>Meu ministério</Cap>
          <AppText variant="secondary">
            Fica só neste aparelho. Serve para destacar os dias em que o seu ministério conduz o altar das 12h30 e
            avisar você na véspera, às 19h.
          </AppText>
        </View>

        {mine ? (
          <Block>
            <View style={{ gap: spacing.sm }} testID="ministry-days">
              <Cap>Seus dias no altar</Cap>
              {myDays.map((day) => {
                const sphere = getDay(day)?.sphere ?? null;
                const line = `Dia ${day} · ${formatDayDate(day, campaign)}${sphere ? ` · ${SPHERE_LABEL[sphere]}` : ''}`;
                return (
                  <AppText key={day} variant="item">
                    {line}
                  </AppText>
                );
              })}
            </View>
          </Block>
        ) : null}

        {notice ? (
          <AppText variant="caption" accessibilityLiveRegion="polite" testID="ministry-notice">
            {notice}
          </AppText>
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
            <ChoiceRow
              key={entry.name}
              label={entry.name}
              description={describeDays(entry.days, campaign)}
              compact
              selected={mine === entry.name}
              onPress={() => choose(entry.name)}
              testID={`ministry-${index}`}
            />
          ))}
        </View>
      </ScreenScroll>
    </Screen>
  );
}
