import { Pressable, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/ui/components';
import { ProfileAvatar } from '@/ui/comunidade/perfil/ProfileAvatar';
import { Icon } from '@/ui/icons';
import { MIN_TOUCH, MOTION_MS, spacing, useReducedMotion, useTheme } from '@/ui/theme';

import { type AmenFace, amenSpoken, MAX_FACES } from './v2';

/**
 * Amém (REGRAS 19 e 33, F3): as DUAS MÃOS em oração, que marcam e desmarcam,
 * alternando contorno (`bold`) e cheio (`fill`). "Amém" é o nome acessível; o
 * estado vai em `checked`, então a forma e o leitor de tela dizem a mesma coisa,
 * sem depender de cor.
 *
 * Cor do marcado: `blue`, a cor de marca do Juntos (a mesma do botão "Publicar",
 * da linha de atividade do cartão e do aviso de quem vê).
 * CORREÇÃO TÉCNICA sobre "cheio na cor de marca" (pedido de 2026-09-22): o
 * amarelo da marca mede 1,46:1 sobre o fundo claro do feed — abaixo dos 3:1 que a
 * WCAG 2.1 (1.4.11) pede para objeto gráfico, e muito abaixo dos 4,5:1 pedidos
 * aqui: a mão marcada sumiria no tema claro. O azul mede 8,48:1 no claro
 * (#2A4C86 sobre branco) e 10,47:1 no escuro (#A9C2E8 sobre #111111). O amarelo
 * continua sendo preenchimento de superfície (`markSurface`/`onMark`), nunca
 * tinta sobre claro.
 *
 * Movimento: ao marcar, a mão cheia entra com um zoom curto. Com "Reduzir
 * movimento", troca na hora.
 */
export function AmenButton({
  checked,
  onToggle,
  size = 27,
  disabled = false,
  label = 'Amém',
  testID,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  /** 27 no cartão (C1), 22 no comentário (C6). */
  size?: number;
  disabled?: boolean;
  /** Nome acessível. No comentário diz de quem é ("Amém, comentário de Ana"). */
  label?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      disabled={disabled}
      accessibilityRole="togglebutton"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      testID={testID}
      hitSlop={0}
      style={({ pressed }) => [
        { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.72 },
      ]}
    >
      <Animated.View
        key={checked ? 'on' : 'off'}
        entering={checked && !reduced ? ZoomIn.duration(MOTION_MS) : undefined}
      >
        <Icon name={checked ? 'amen-filled' : 'amen'} size={size} color={checked ? colors.blue : colors.text} />
      </Animated.View>
    </Pressable>
  );
}

const FACE = 24;
const OVERLAP = 8;

/**
 * Até 3 rostinhos sobrepostos de quem disse Amém e o número (F3, decisão do
 * fundador de 2026-09-22, que substitui a regra antiga de não mostrar contagem).
 * Sem ninguém, nada aparece: zero não vira número na tela.
 *
 * Um só elemento para o leitor de tela ("Você e mais 2 pessoas disseram Amém").
 */
export function AmenSummary({
  count,
  iSaidAmen,
  faces,
  urls,
  testID,
}: {
  count: number;
  iSaidAmen: boolean;
  faces: AmenFace[];
  /** Fotos de perfil assinadas, por caminho. */
  urls: Map<string, string>;
  testID?: string;
}) {
  const { colors } = useTheme();
  if (count <= 0) return null;
  const shown = faces.slice(0, MAX_FACES);
  return (
    <View
      accessible
      accessibilityLabel={amenSpoken(count, iSaidAmen, shown)}
      testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH }}
    >
      {shown.length ? (
        <View style={{ flexDirection: 'row' }} aria-hidden>
          {shown.map((face, index) => (
            <View
              key={`${face.name}-${index}`}
              testID={testID ? `${testID}-face` : undefined}
              style={{
                marginLeft: index === 0 ? 0 : -OVERLAP,
                borderRadius: (FACE + 4) / 2,
                borderWidth: 2,
                borderColor: colors.background,
                zIndex: shown.length - index,
              }}
            >
              <ProfileAvatar name={face.name} uri={face.avatarPath ? urls.get(face.avatarPath) : undefined} size={FACE} />
            </View>
          ))}
        </View>
      ) : null}
      <AppText variant="rowLabel" testID={testID ? `${testID}-count` : undefined}>
        {count.toLocaleString('pt-BR')}
      </AppText>
    </View>
  );
}
