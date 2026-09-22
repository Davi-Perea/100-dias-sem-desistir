import { Pressable, View } from 'react-native';

import { AppText, Avatar, Button } from '../components';
import { MIN_TOUCH, radius, spacing, useTheme } from '../theme';
import { FlameIcon, GearIcon } from './ProfileIcons';

/**
 * F7 · Cabeçalho do perfil (aba Você).
 *
 * Linha de cima: à esquerda o contador — chama + total de DIAS LIDOS. Decisão
 * do fundador (2026-09-22): conta os dias lidos e NUNCA zera; não é sequência,
 * não existe "perdeu" nem "recomeçar". À direita a engrenagem, "Ajustes".
 *
 * Abaixo: avatar com iniciais, o nome (ou "Você"), o ministério escolhido em
 * Ajustes (settings.ministry, local) e "Editar perfil".
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22: sem desenho) O contador é uma
 * pílula `accentSoft` com tinta `text` (≥ 12:1 nos dois temas); a chama segue a
 * tinta, nunca o amarelo puro, que some sobre branco.
 */
/**
 * "Ministério Comunicação". Nomes da escala que já começam com "Min." ou
 * "Ministério" ficam como estão (mesma regra do ministryLabel da Comunidade).
 */
export function ministryLabel(ministry: string | null): string | null {
  const name = ministry?.trim();
  if (!name) return null;
  return /^min(.|istério)/i.test(name) ? name : `Ministério ${name}`;
}

export function ProfileHeader({
  name,
  ministry,
  readCount,
  onOpenSettings,
  onEditProfile,
}: {
  name: string;
  ministry: string | null;
  readCount: number;
  onOpenSettings: () => void;
  onEditProfile: () => void;
}) {
  const { colors } = useTheme();
  const daysWord = readCount === 1 ? 'dia lido' : 'dias lidos';
  const ministryText = ministryLabel(ministry) ?? 'Sem ministério';

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View
          accessible
          accessibilityLabel={`${readCount} ${daysWord} no total`}
          testID="read-counter"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
            gap: spacing.xs,
            minHeight: 40,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.accentSoft,
          }}
        >
          <FlameIcon size={20} color={colors.text} />
          <AppText variant="rowLabel" testID="read-counter-count">
            {readCount}
          </AppText>
          <AppText variant="caption" style={{ color: colors.text, flexShrink: 1 }}>
            {daysWord}
          </AppText>
        </View>
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          testID="open-settings"
          style={({ pressed }) => [
            {
              minWidth: MIN_TOUCH,
              minHeight: MIN_TOUCH,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { opacity: 0.72 },
          ]}
        >
          <GearIcon size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Avatar name={name} size={72} />
        {/* Nome e ministério num só bloco acessível: "Davi, Ministério Comunicação". */}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={`${name}, ${ministryText}`}
          style={{ flex: 1, gap: spacing.xs }}
        >
          <AppText variant="screenTitle" testID="voce-title">
            {name}
          </AppText>
          <AppText variant="caption" testID="voce-ministry">
            {ministryText}
          </AppText>
        </View>
      </View>

      <Button title="Editar perfil" variant="outline" onPress={onEditProfile} testID="edit-profile" />
    </View>
  );
}
