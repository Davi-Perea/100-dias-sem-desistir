import Svg, { Circle, G, Line, Path } from 'react-native-svg';

/**
 * F7 · Dois ícones do perfil que o conjunto do app (`ui/icons.tsx`) ainda não
 * tem: a chama do contador e a engrenagem dos ajustes. Mesmo traço (2px, pontas
 * redondas), mesma caixa de 24 e cor passada por quem usa — desenhos nossos,
 * genéricos, sem copiar ícone de app nenhum.
 *
 * PROVISÓRIO (decisão do engenheiro, 2026-09-22): moram aqui porque `icons.tsx`
 * é de outro dono; o pedido de levá-los para lá está no relatório. Decorativos:
 * o texto ao lado (ou o rótulo do botão) diz o que eles querem dizer.
 */
export function FlameIcon({ size = 22, color, strokeWidth = 2 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden testID="flame-icon">
      <Path
        // Gota alta com uma volta por dentro, como uma chama de vela acesa.
        d="M12 2.8c.9 3.4 5.6 5.6 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-2.4 1.1-4 2.5-5.3.2 1.7 1 2.9 2.2 3.2-.6-3 .1-5.9.9-8.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

export function GearIcon({ size = 22, color, strokeWidth = 2 }: { size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden testID="gear-icon">
      <G stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
        <Circle cx={12} cy={12} r={6.2} />
        <Circle cx={12} cy={12} r={2.4} />
        {TEETH.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <Line
              key={deg}
              x1={12 + Math.cos(rad) * 6.6}
              y1={12 + Math.sin(rad) * 6.6}
              x2={12 + Math.cos(rad) * 9.4}
              y2={12 + Math.sin(rad) * 9.4}
            />
          );
        })}
      </G>
    </Svg>
  );
}
