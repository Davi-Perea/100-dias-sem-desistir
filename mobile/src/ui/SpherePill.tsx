import { Text, View } from 'react-native';

import { SPHERE_LABEL, type Sphere } from '@/journey/spheres';

import { BRAND_YELLOW, fonts, radius, useTheme } from './theme';

/**
 * Pílula do monte do dia ("GOVERNO"). Contornada em tinta sobre superfície clara;
 * nas telas invertidas (marco, Dia 100) a tinta acompanha o fundo.
 *
 * Amarelo nunca vira texto: a variante `yellow` só preenche o fundo.
 */
export function SpherePill({
  sphere,
  tone = 'ink',
  testID,
}: {
  sphere: Sphere;
  tone?: 'ink' | 'onInk' | 'yellow';
  testID?: string;
}) {
  const { colors } = useTheme();
  const ink = tone === 'onInk' ? '#FFFFFF' : tone === 'yellow' ? '#111111' : colors.text;
  return (
    <View
      accessible
      accessibilityLabel={`Monte do dia: ${SPHERE_LABEL[sphere]}`}
      testID={testID}
      style={{
        alignSelf: 'flex-start',
        height: 28,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        borderWidth: tone === 'yellow' ? 0 : 1.5,
        borderColor: ink,
        backgroundColor: tone === 'yellow' ? BRAND_YELLOW : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: fonts.label,
          fontSize: 11,
          letterSpacing: 1.54,
          textTransform: 'uppercase',
          color: ink,
        }}
      >
        {SPHERE_LABEL[sphere]}
      </Text>
    </View>
  );
}
