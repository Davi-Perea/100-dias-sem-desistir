import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText, Checkbox, Rule } from '../components';
import { MIN_TOUCH, spacing } from '../theme';
import { announceNotice } from './announce';

/**
 * Linha de liga/desliga no mesmo ritmo de `SettingRow` (D1): piso 48, rótulo
 * `rowLabel`, legenda opcional e a caixa de marcação à direita, com filete
 * acima quando não é a primeira do grupo.
 *
 * PROVISÓRIO (pergunta 13 ao designer): o interruptor desligado não foi
 * especificado. Fica a caixa de marcação de 28 que o app já usa para estas
 * preferências, com alvo de 48×48.
 *
 * `notice` é o motivo de uma recusa (permissão negada, web): tinta de legenda,
 * nunca amarelo, colado ao controle tocado e anunciado pelo leitor de tela:
 * live region no Android, `announceForAccessibility` no iOS (onde a live
 * region não existe).
 */
export function ToggleRow({
  label,
  caption,
  checked,
  onToggle,
  first = false,
  notice,
  testID,
  noticeTestID,
}: {
  label: string;
  caption?: string;
  checked: boolean;
  onToggle: () => void;
  first?: boolean;
  notice?: string | null;
  testID?: string;
  noticeTestID?: string;
}) {
  useEffect(() => {
    announceNotice(notice);
  }, [notice]);

  return (
    <View>
      {first ? null : <Rule />}
      <View
        style={{
          minHeight: MIN_TOUCH,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="rowLabel">{label}</AppText>
          {caption ? <AppText variant="caption">{caption}</AppText> : null}
        </View>
        <Checkbox checked={checked} onToggle={onToggle} label={label} testID={testID} />
      </View>
      {notice ? (
        <AppText
          variant="caption"
          accessibilityLiveRegion="polite"
          style={{ paddingBottom: spacing.sm }}
          testID={noticeTestID}
        >
          {notice}
        </AppText>
      ) : null}
    </View>
  );
}
