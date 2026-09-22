import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Icon } from '@/ui/icons';

/**
 * Ícones da linha de anexos do "Criar post" (F2). Mesma gramática do
 * `src/ui/icons.tsx` (grade 24, traço de 2px, pontas redondas, cor do token);
 * nada vem do app de referência. Leitura e Oração reaproveitam `book` e `amen`.
 * Decorativos: todo botão tem rótulo falado e escrito.
 */
export type AttachIconName = 'leitura' | 'versiculo' | 'oracao' | 'jejum' | 'galeria' | 'camera';

export function AttachIcon({ name, size = 24, color }: { name: AttachIconName; size?: number; color: string }) {
  if (name === 'leitura') return <Icon name="book" size={size} color={color} />;
  if (name === 'oracao') return <Icon name="amen" size={size} color={color} />;
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === 'versiculo' ? (
        // Marcador de página sobre uma linha de texto: "o versículo que eu marquei".
        <G>
          <Path d="M7 3.8h10a.9.9 0 0 1 .9.9v15.6l-5.9-3.9-5.9 3.9V4.7a.9.9 0 0 1 .9-.9Z" {...common} />
          <Path d="M9.4 8.4h5.2" {...common} />
        </G>
      ) : null}
      {name === 'jejum' ? (
        // Prato vazio com talheres de lado.
        <G>
          <Circle cx={13} cy={12} r={7.2} {...common} />
          <Circle cx={13} cy={12} r={3.6} {...common} />
          <Path d="M3 4.5v15" {...common} />
        </G>
      ) : null}
      {name === 'galeria' ? (
        <G>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={2} {...common} />
          <Circle cx={9} cy={9.6} r={1.6} {...common} />
          <Path d="m4 17.6 4.6-4.4 3.4 3.1 3.1-2.9 5.4 4.8" {...common} />
        </G>
      ) : null}
      {name === 'camera' ? (
        <G>
          <Path
            d="M4.4 7.4h3.1l1.6-2.3h5.8l1.6 2.3h3.1a.9.9 0 0 1 .9.9v10.4a.9.9 0 0 1-.9.9H4.4a.9.9 0 0 1-.9-.9V8.3a.9.9 0 0 1 .9-.9Z"
            {...common}
          />
          <Circle cx={12} cy={13.2} r={3.4} {...common} />
        </G>
      ) : null}
    </Svg>
  );
}
