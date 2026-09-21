import { View } from 'react-native';

import { fastingKeptCount, fastingKeptDays, useFasting } from '@/fasting/fastingStore';
import { formatDayDate } from '@/journey/officialDay';
import { useJourney } from '@/journey/useJourney';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Rule, Screen, SettingRow, StateView } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { SubScreen } from '@/ui/voce/SubScreen';
import { ToggleRow } from '@/ui/voce/ToggleRow';

/**
 * Meu jejum. Registro privado, guardado só neste aparelho.
 *
 * O app nunca pergunta do que a pessoa jejua, por quanto tempo ou por quê. Só
 * existe a marcação de ter cumprido o próprio propósito no dia.
 *
 * PROVISÓRIO (pergunta 12 ao designer): tela não desenhada; mesma função de
 * antes, com os componentes novos. O jejum inteiro depende de confirmação da
 * igreja (REGRAS §5 item 4).
 */
export default function FastingScreen() {
  const journey = useJourney();
  const settings = useSettings();
  const fasting = useFasting(journey.campaign.id);

  if (!settings || !fasting) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const days = fastingKeptDays(fasting);
  const kept = fastingKeptCount(fasting);

  return (
    <SubScreen title="Meu jejum" gap={spacing.lg}>
      {/*
        "·" vira pausa para o leitor de tela (REGRAS 32). Sem papel de cabeçalho:
        o título "Meu jejum" logo acima já é o cabeçalho, e dois seguidos com o
        mesmo nome confundem a navegação por cabeçalhos.
      */}
      <AppText variant="cap" accessibilityLabel="Meu jejum, só você vê">
        Meu jejum · só você vê
      </AppText>

      <ToggleRow
        label="Participar do propósito de jejum"
        caption="Não perguntamos do que você jejua. O registro fica neste aparelho."
        checked={settings.fastingEnabled}
        // PER-02: se o disco recusar, o store não muda e o interruptor fica como está salvo.
        onToggle={() => updateSettings((s) => ({ ...s, fastingEnabled: !s.fastingEnabled })).catch(() => undefined)}
        first
        testID="fasting-enabled"
      />

      <Rule />

      <AppText variant="blockTitle" testID="fasting-count">
        {kept} {kept === 1 ? 'dia cumprido' : 'dias cumpridos'}
      </AppText>

      {days.length === 0 ? (
        <AppText variant="bodySm">Nada registrado ainda.</AppText>
      ) : (
        <View>
          {days.map((day, index) => (
            <SettingRow key={day} label={`Dia ${day}`} value={formatDayDate(day, journey.campaign)} first={index === 0} />
          ))}
        </View>
      )}
    </SubScreen>
  );
}
