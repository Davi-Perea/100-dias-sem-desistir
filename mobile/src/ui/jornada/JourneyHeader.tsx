import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Dove } from '../brand';
import { AppText } from '../components';
import { Icon } from '../icons';
import { MIN_TOUCH, faces, spacing, useTheme } from '../theme';

/**
 * Cabeçalho da casa (A1, A2, A5, E5), piso 48: pomba 30×19 (proporção 224×144),
 * "100 dias sem desistir" Schibsted 700 15/20 tracking −0,2 e o círculo de conta
 * de 48×48, raio 24, em `surfaceMuted` com borda de 1,5px em `border`, que abre
 * o Você (D1).
 *
 * O círculo é o alvo inteiro (48), então não há área de toque menor que o piso.
 * A borda de 1,5px em `border` é decorativa (1,27:1): quem diz que é botão é o
 * papel acessível e o ícone de pessoa em `textMuted` (cerca de 6,0:1 sobre
 * `surfaceMuted` no claro), não o contorno.
 */
export function JourneyHeader() {
  const { colors } = useTheme();
  return (
    <View
      style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      testID="journey-header"
    >
      {/* A pomba acompanha o nome escrito ao lado: é decorativa para o leitor de tela. */}
      <Dove width={30} />
      <AppText
        variant="rowLabel"
        accessibilityRole="header"
        style={{ flex: 1, fontFamily: faces.sg700, letterSpacing: -0.2 }}
      >
        100 dias sem desistir
      </AppText>
      <Pressable
        onPress={() => router.push('/voce')}
        accessibilityRole="button"
        accessibilityLabel="Você"
        accessibilityHint="Abre seu progresso e suas preferências"
        testID="account-button"
        style={({ pressed }) => [
          {
            width: MIN_TOUCH,
            height: MIN_TOUCH,
            borderRadius: MIN_TOUCH / 2,
            backgroundColor: colors.surfaceMuted,
            borderWidth: 1.5,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed && { opacity: 0.72 },
        ]}
      >
        <Icon name="you" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
