import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import type { ReminderSlot } from '@/settings/settingsStore';

import { AppText, Button, Sheet } from '../components';
import { MIN_TOUCH, radius, spacing, useTheme } from '../theme';

/**
 * Seletor único do horário do lembrete de leitura, usado na tela Lembretes e no
 * passo 3 do onboarding (pedido do fundador, 2026-09-21): horários prontos em
 * chips, "Outro horário" com o seletor de hora do sistema, e "Sem lembrete".
 *
 * Ele só ESCOLHE: quem agenda, pede a permissão (no gesto) e desfaz a escolha na
 * recusa é a tela que o usa, pelo `onChoose`.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: sem desenho do designer):
 * horários 6:00, 7:00, 12:00, 19:00 e 21:00, chips com o molde da `Pill`, piso
 * de 48. O seletor do sistema é o @react-native-community/datetimepicker, que
 * já vem no Expo Go: no Android abre o diálogo nativo de hora; no iOS, a roda de
 * hora numa folha com "Pronto".
 */

export type ReminderTime = { hour: number; minute: number };
export type ReminderChoice = { slot: ReminderSlot } & ReminderTime;

export const PRESET_TIMES: readonly ReminderTime[] = [
  { hour: 6, minute: 0 },
  { hour: 7, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 19, minute: 0 },
  { hour: 21, minute: 0 },
];

/** "6:00", "19:30": como se escreve hora no Brasil, sem zero à esquerda. */
export function formatChipTime({ hour, minute }: ReminderTime): string {
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

/** Id estável para testes: "0600", "1930". */
export function timeKey({ hour, minute }: ReminderTime): string {
  return `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
}

/**
 * A faixa do dia continua gravada em `slot` (a analytics do onboarding só
 * conhece a faixa, nunca o horário). Horário do seletor do sistema é 'custom'.
 */
export function slotForPreset({ hour }: ReminderTime): Exclude<ReminderSlot, 'custom' | 'none'> {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function isPreset(time: ReminderTime): boolean {
  return PRESET_TIMES.some((p) => p.hour === time.hour && p.minute === time.minute);
}

/** O seletor do sistema só existe nos aparelhos; na web o lembrete nem é suportado. */
const HAS_SYSTEM_PICKER = Platform.OS === 'ios' || Platform.OS === 'android';

function dateAt({ hour, minute }: ReminderTime): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function ReminderTimePicker({
  current,
  onChoose,
  disabled = false,
  testIDPrefix,
  label = 'Horário do lembrete',
}: {
  /** Escolha gravada hoje. */
  current: ReminderChoice;
  onChoose: (choice: ReminderChoice) => void;
  disabled?: boolean;
  /** Prefixo dos testIDs: `${prefix}-0700`, `${prefix}-other`, `${prefix}-none`. */
  testIDPrefix: string;
  /** Nome falado do grupo de opções. */
  label?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => dateAt(current));
  const { colors, isDark } = useTheme();

  const on = current.slot !== 'none';
  const customSelected = on && !isPreset(current);

  const openSystemPicker = () => {
    if (disabled) return;
    const initial = on ? { hour: current.hour, minute: current.minute } : { hour: 7, minute: 0 };
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateAt(initial),
        mode: 'time',
        is24Hour: true,
        // O "OK" do diálogo é o gesto: a tela pode pedir a permissão aqui.
        onValueChange: (_event, date) => onChoose({ slot: 'custom', hour: date.getHours(), minute: date.getMinutes() }),
      });
      return;
    }
    setDraft(dateAt(initial));
    setSheetOpen(true);
  };

  const confirmSheet = () => {
    setSheetOpen(false);
    onChoose({ slot: 'custom', hour: draft.getHours(), minute: draft.getMinutes() });
  };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {PRESET_TIMES.map((time) => {
          const selected = on && current.hour === time.hour && current.minute === time.minute;
          return (
            <TimeChip
              key={timeKey(time)}
              label={formatChipTime(time)}
              selected={selected}
              disabled={disabled}
              onPress={() => onChoose({ slot: slotForPreset(time), ...time })}
              testID={`${testIDPrefix}-${timeKey(time)}`}
            />
          );
        })}
        {HAS_SYSTEM_PICKER ? (
          <TimeChip
            // Escolhido pelo seletor, o chip mostra o horário que ficou gravado.
            label={customSelected ? `Outro: ${formatChipTime(current)}` : 'Outro horário'}
            accessibilityLabel={customSelected ? `Outro horário, ${formatChipTime(current)}` : 'Outro horário'}
            accessibilityHint="Abre o seletor de hora do sistema."
            selected={customSelected}
            disabled={disabled}
            onPress={openSystemPicker}
            testID={`${testIDPrefix}-other`}
          />
        ) : null}
        <TimeChip
          label="Sem lembrete"
          selected={!on}
          disabled={disabled}
          onPress={() => onChoose({ slot: 'none', hour: current.hour, minute: current.minute })}
          testID={`${testIDPrefix}-none`}
        />
      </View>

      {Platform.OS === 'ios' ? (
        <Sheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Escolha o horário"
          testID={`${testIDPrefix}-sheet`}
        >
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            locale="pt-BR"
            themeVariant={isDark ? 'dark' : 'light'}
            textColor={colors.text}
            onValueChange={(_event, date) => setDraft(date)}
            accessibilityLabel="Horário do lembrete"
            testID={`${testIDPrefix}-spinner`}
          />
          <Button title="Pronto" onPress={confirmSheet} testID={`${testIDPrefix}-done`} />
          <Button title="Cancelar" variant="underline" onPress={() => setSheetOpen(false)} />
        </Sheet>
      ) : null}
    </View>
  );
}

/**
 * Chip de escolha única no molde da `Pill` (contornado = livre; `markSurface`
 * com texto `onMark` = escolhido), com piso de toque de 48 e texto que quebra
 * linha em vez de sair da tela na fonte grande (3,571×).
 */
function TimeChip({
  label,
  selected,
  disabled,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, checked: selected, disabled }}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          minWidth: 72,
          maxWidth: '100%',
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.markSurface : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.controlBorder,
        },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.72 },
      ]}
    >
      <AppText variant="action" style={{ color: selected ? colors.onMark : colors.text, textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
