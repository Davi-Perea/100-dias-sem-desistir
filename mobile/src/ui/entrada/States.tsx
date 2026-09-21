import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button, IconCircle, StateLayout, useFace } from '../components';
import type { IconName } from '../icons';
import { faces, spacing, useTheme } from '../theme';

/**
 * F5 e F6 com a cópia e as ações do desenho. A moldura, a tipografia e o
 * espaçamento NÃO moram aqui: vêm do StateLayout de components.tsx, o molde
 * único que o StateView também usa (R4-15). Aqui só entram o glifo e as saídas.
 */

/** Círculo de 56 em `surfaceMuted` com "!" (F5). Decorativo: o título diz o que houve. */
function BangCircle() {
  const { colors } = useTheme();
  const face = useFace();
  return (
    <View
      aria-hidden
      testID="error-circle"
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.surfaceMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* O círculo tem medida fixa e o glifo é decorativo: ele não escala com a
          fonte do sistema para não atravessar a borda. */}
      <Text allowFontScaling={false} style={{ fontFamily: face(faces.sg800), fontSize: 26, lineHeight: 30, color: colors.text }}>
        !
      </Text>
    </View>
  );
}

/** F5 · Erro. Cópia padrão do TELAS; uma saída sempre. */
export function ErrorState({
  title = 'Não deu para carregar',
  message = 'A leitura de hoje não veio. Sua jornada e as suas reflexões estão salvas — nada foi perdido.',
  onRetry,
  retryVariant = 'primary',
  secondary,
  testID = 'error-state',
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  /**
   * "Tentar de novo" é o primário por padrão. Onde a tela já tem um primário
   * fora do estado (o rodapé do leitor), ele vai contornado: um primário por
   * tela (TOKENS §5; R1-12).
   */
  retryVariant?: 'primary' | 'outline';
  /** Sublinhado abaixo do primário. No leitor: "Ler na minha Bíblia". */
  secondary?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  return (
    <StateLayout
      kind="error"
      inset="vertical"
      glyph={<BangCircle />}
      title={title}
      message={message}
      testID={testID}
      titleTestID="error-title"
      messageTestID="error-message"
    >
      <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button title="Tentar de novo" variant={retryVariant} onPress={onRetry} testID="error-retry" />
        {secondary ? (
          <Button title={secondary.label} variant="underline" onPress={secondary.onPress} testID={secondary.testID} />
        ) : null}
      </View>
    </StateLayout>
  );
}

/** F6 · Lista vazia. */
export function EmptyState({
  icon,
  glyph,
  title,
  message,
  action,
  testID = 'empty-state',
}: {
  /** Ícone do conjunto, num IconCircle de 56. */
  icon?: IconName;
  /**
   * Círculo pronto, quando o desenho tem glifo próprio: o cadeado do F6 é o
   * mesmo do A4 (LockCircle), não o "lock" genérico do conjunto (R4-9).
   */
  glyph?: ReactNode;
  title: string;
  message: string;
  /** Ação única. F6 usa o botão contornado. */
  action?: ReactNode;
  testID?: string;
}) {
  return (
    <StateLayout
      kind="empty"
      inset="vertical"
      glyph={glyph ?? (icon ? <IconCircle name={icon} size={56} /> : null)}
      title={title}
      message={message}
      testID={testID}
      titleTestID="empty-title"
      messageTestID="empty-message"
    >
      {action ? <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>{action}</View> : null}
    </StateLayout>
  );
}
