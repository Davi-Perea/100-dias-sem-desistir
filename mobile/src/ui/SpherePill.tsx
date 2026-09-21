import { Text, View } from 'react-native';

import { SPHERE_LABEL, type Sphere } from '@/journey/spheres';

import { useFace } from './components';
import { BRAND_YELLOW, faces, radius, useTheme } from './theme';

/**
 * Pílula do monte do dia ("GOVERNO"), TELAS A1: piso 30, raio 999, fundo
 * `markSurface`, calha lateral 14, rótulo Schibsted 700 11/14 com tracking +1,4
 * em caixa alta, na cor `onMark`. É o "marcado" da marca: inverte no tema escuro.
 *
 * Piso, não altura: "ARTES E ENTRETENIMENTO" quebra em duas linhas em telas
 * estreitas, e com altura travada a borda cortava o rótulo no meio. O rótulo é
 * conteúdo da igreja, então não tem teto de escala.
 *
 * Nas superfícies fixas o tema não vale: sobre tinta a pílula é amarela com
 * tinta; sobre amarelo, tinta com amarelo.
 */
export function SpherePill({
  sphere,
  tone = 'theme',
  testID,
}: {
  sphere: Sphere;
  tone?: 'theme' | 'onInk' | 'yellow' | 'ink';
  testID?: string;
}) {
  const { colors } = useTheme();
  const face = useFace();
  const fill = tone === 'onInk' ? BRAND_YELLOW : tone === 'yellow' ? '#111111' : colors.markSurface;
  const ink = tone === 'onInk' ? '#111111' : tone === 'yellow' ? BRAND_YELLOW : colors.onMark;
  return (
    <View
      accessible
      accessibilityLabel={`Monte do dia: ${SPHERE_LABEL[sphere]}`}
      testID={testID}
      style={{
        alignSelf: 'flex-start',
        minHeight: 30,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: face(faces.sg700),
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: ink,
        }}
      >
        {SPHERE_LABEL[sphere]}
      </Text>
    </View>
  );
}
