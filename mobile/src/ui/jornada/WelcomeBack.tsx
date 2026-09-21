import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

import type { EntryMessage } from '@/journey/returnGap';

import { AppText, Button } from '../components';
import { faces, spacing, useTheme } from '../theme';

/**
 * Mensagem de entrada da Jornada (substitui a acolhida A2 "Que bom ter você de volta").
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-21: pedido do fundador — a pessoa
 * precisa saber que tem dias em aberto, com o número, mas o destaque continua
 * sendo hoje): substitui a acolhida sem número (D-3/REGRAS 9). Sem culpa: a
 * cópia diz "em aberto", nunca "perdeu", "atrasado" ou "pendente". Nada de
 * vermelho: `blueSoft` raio 18 padding 16, texto em `onBlueSoft` (14,05:1).
 *
 * Duas variantes (a conta é de `entryMessage`, em `returnGap.ts`):
 *   - quem nunca concluiu nada: "A igreja está no Dia X." + "Os dias anteriores continuam abertos para você."
 *   - quem já leu antes: "Você tem N dias em aberto." + "Quer retomar?"
 */
export function entryTitle(message: EntryMessage): string {
  return message.variant === 'first_time'
    ? `A igreja está no Dia ${message.todayDay}.`
    : `Você tem ${message.openCount} dias em aberto.`;
}

export function entryBody(message: EntryMessage): string {
  return message.variant === 'first_time' ? 'Os dias anteriores continuam abertos para você.' : 'Quer retomar?';
}

export function entryAction(message: EntryMessage): string {
  return message.variant === 'first_time' ? `Começar pelo Dia ${message.firstOpen}` : `Retomar pelo Dia ${message.firstOpen}`;
}

export function EntryMessageCard({
  message,
  onStart,
  onGoToday,
  onLayout,
}: {
  message: EntryMessage;
  onStart: () => void;
  onGoToday: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const title = entryTitle(message);
  const body = entryBody(message);
  const action = entryAction(message);
  return (
    // O `paddingBottom` separa a mensagem das linhas; ele entra na altura medida,
    // que é a que a lista declara.
    <View onLayout={onLayout} style={{ paddingBottom: spacing.md }} testID="entry-message">
      <View style={{ backgroundColor: colors.blueSoft, borderRadius: 18, padding: spacing.lg, gap: spacing.sm }}>
        <View style={{ gap: spacing.xs }}>
          <AppText
            variant="action"
            accessibilityRole="header"
            style={{ fontFamily: faces.sg700, fontSize: 19, lineHeight: 24, color: colors.onBlueSoft }}
          >
            {title}
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.onBlueSoft }}>
            {body}
          </AppText>
        </View>
        <Button
          title={action}
          variant="blue"
          onPress={onStart}
          testID="entry-message-start"
          accessibilityHint={`Abre o Dia ${message.firstOpen}, o primeiro dia em aberto`}
        />
        <Button
          title="Ir para hoje"
          variant="underline"
          onPress={onGoToday}
          testID="entry-message-today"
          accessibilityLabel={`Ir para hoje, Dia ${message.todayDay}`}
          accessibilityHint="Fecha este aviso até amanhã e mostra o dia de hoje"
        />
      </View>
    </View>
  );
}
