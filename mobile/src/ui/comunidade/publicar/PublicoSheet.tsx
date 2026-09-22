import { Pressable, View } from 'react-native';

import { ministryLabel } from '@/community/profile';
import { AppText, ChoiceRow, Sheet } from '@/ui/components';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, spacing, useTheme } from '@/ui/theme';

import { audienceLabel, type Audience } from './rascunho';

/**
 * Seletor de público (F2, F6: sem seguidores; a igreja inteira ou o grupo do
 * ministério). A frase de quem vê (C5) continua a do fundador, acima do campo;
 * aqui só se escolhe ONDE o post aparece.
 */
export function AudienceButton({
  audience,
  ministry,
  onPress,
}: {
  audience: Audience;
  ministry: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const label = audienceLabel(audience, ministry);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Onde aparece: ${label}`}
      accessibilityHint="Abre as opções de público"
      testID="audience-button"
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          flexShrink: 1,
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      <AppText variant="rowLabel" style={{ flexShrink: 1 }} testID="audience-label">
        {label}
      </AppText>
      <Icon name="chevron-down" size={18} color={colors.text} />
    </Pressable>
  );
}

export function PublicoSheet({
  visible,
  onClose,
  audience,
  ministry,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  audience: Audience;
  ministry: string | null;
  onChoose: (audience: Audience) => void;
}) {
  const group = ministryLabel(ministry);
  return (
    <Sheet visible={visible} onClose={onClose} title="Onde aparece" testID="audience-sheet">
      <View style={{ gap: spacing.sm }}>
        <ChoiceRow
          label="Toda a igreja"
          description="No feed da comunidade."
          selected={audience === 'igreja'}
          onPress={() => onChoose('igreja')}
          testID="audience-church"
        />
        {group ? (
          <ChoiceRow
            label="Meu ministério"
            description={`No grupo do ${group}.`}
            selected={audience === 'ministerio'}
            onPress={() => onChoose('ministerio')}
            testID="audience-ministry"
          />
        ) : (
          <AppText variant="caption" testID="audience-no-ministry">
            Para publicar no grupo de um ministério, escolha o seu ministério no perfil.
          </AppText>
        )}
      </View>
    </Sheet>
  );
}
