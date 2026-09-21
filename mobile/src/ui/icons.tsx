import Svg, { Circle, G, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Ícones: convencionais, traço de 2px (2,5 no cadeado), caixa de 24, `currentColor`.
 *
 * São desenhados aqui em vez de virem de uma biblioteca porque o traço e a caixa
 * fazem parte da direção visual — o handoff permite trocar por Lucide/SF Symbols,
 * mas manter o mesmo peso de traço em todos os tamanhos é mais simples assim.
 *
 * Nenhum ícone carrega significado sozinho: todo destino tem rótulo em texto.
 */
export type IconName =
  | 'home'
  | 'flag'
  | 'users'
  | 'person'
  | 'book'
  | 'note'
  | 'clock'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'lock'
  | 'check'
  | 'close'
  | 'more'
  | 'text-size'
  | 'bell'
  | 'share'
  | 'flag-finish'
  | 'alert'
  // Barra de navegação do redesenho (TOKENS §5, "Ícones").
  | 'journey'
  | 'community'
  | 'you';

type Props = {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /**
   * Cor do fundo onde o ícone está. Só o ícone de comunidade usa: o círculo da
   * direita é preenchido com ela para recortar o da esquerda, como no desenho.
   */
  cutout?: string;
};

// Traço de 2px (TOKENS §5, "Ícones"); 2,5 no cadeado.
export function Icon({ name, size = 22, color, strokeWidth = 2, cutout = 'transparent' }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {name === 'home' ? (
        <G>
          <Path d="M3.5 10.2 12 3.5l8.5 6.7V20a.8.8 0 0 1-.8.8h-4.4v-6h-6.6v6H4.3a.8.8 0 0 1-.8-.8Z" {...common} />
        </G>
      ) : null}
      {name === 'flag' ? (
        <G>
          <Path d="M6 21V3.8" {...common} />
          <Path d="M6 4.2h11.5l-2.2 3.9 2.2 3.9H6" {...common} />
        </G>
      ) : null}
      {name === 'users' ? (
        <G>
          <Circle cx={9} cy={8} r={3.4} {...common} />
          <Path d="M2.8 20.2a6.4 6.4 0 0 1 12.4 0" {...common} />
          <Path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6" {...common} />
          <Path d="M17.6 14.4a6.4 6.4 0 0 1 3.6 5.8" {...common} />
        </G>
      ) : null}
      {name === 'person' ? (
        <G>
          <Circle cx={12} cy={7.8} r={3.6} {...common} />
          <Path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" {...common} />
        </G>
      ) : null}
      {name === 'book' ? (
        <G>
          <Path d="M12 6.6C10.4 5.3 8.3 4.7 5.4 4.7a.9.9 0 0 0-.9.9v11.2c0 .5.4.9.9.9 2.9 0 5 .6 6.6 1.9" {...common} />
          <Path d="M12 6.6c1.6-1.3 3.7-1.9 6.6-1.9a.9.9 0 0 1 .9.9v11.2a.9.9 0 0 1-.9.9c-2.9 0-5 .6-6.6 1.9" {...common} />
          <Path d="M12 6.6v13" {...common} />
        </G>
      ) : null}
      {name === 'note' ? (
        <G>
          <Path d="M6.6 3.6h7.1l4.7 4.7v12.1a.9.9 0 0 1-.9.9H6.6a.9.9 0 0 1-.9-.9V4.5a.9.9 0 0 1 .9-.9Z" {...common} />
          <Path d="M13.5 3.8v4.6h4.6" {...common} />
          <Path d="M8.8 13h6.4M8.8 16.4h4.4" {...common} />
        </G>
      ) : null}
      {name === 'clock' ? (
        <G>
          <Circle cx={12} cy={12} r={8.4} {...common} />
          <Polyline points="12,7.2 12,12 15.4,13.8" {...common} />
        </G>
      ) : null}
      {name === 'chevron-right' ? <Polyline points="9,5 16,12 9,19" {...common} /> : null}
      {name === 'chevron-left' ? <Polyline points="15,5 8,12 15,19" {...common} /> : null}
      {name === 'chevron-down' ? <Polyline points="5,9 12,16 19,9" {...common} /> : null}
      {name === 'lock' ? (
        <G>
          <Rect x={4.6} y={10.2} width={14.8} height={10.2} rx={2.4} {...common} strokeWidth={2.5} />
          <Path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6" {...common} strokeWidth={2.5} />
        </G>
      ) : null}
      {name === 'check' ? <Polyline points="4.5,12.4 9.6,17.5 19.5,7" {...common} /> : null}
      {name === 'close' ? <Path d="M6 6l12 12M18 6 6 18" {...common} /> : null}
      {name === 'more' ? (
        <G>
          <Circle cx={5.4} cy={12} r={1.5} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.5} fill={color} stroke="none" />
          <Circle cx={18.6} cy={12} r={1.5} fill={color} stroke="none" />
        </G>
      ) : null}
      {name === 'text-size' ? (
        <G>
          <Path d="M2.6 18 7 6.4 11.4 18" {...common} />
          <Path d="M4.1 14.2h5.8" {...common} />
          <Path d="M13.6 18 17.4 8.6 21.2 18" {...common} />
          <Path d="M14.9 15.2h5" {...common} />
        </G>
      ) : null}
      {name === 'bell' ? (
        <G>
          <Path d="M6 10.2a6 6 0 0 1 12 0c0 4 1.4 5.4 1.4 5.4H4.6S6 14.2 6 10.2Z" {...common} />
          <Path d="M10.2 18.6a2 2 0 0 0 3.6 0" {...common} />
        </G>
      ) : null}
      {name === 'share' ? (
        <G>
          <Path d="M12 15.6V4.2" {...common} />
          <Polyline points="8.2,7.6 12,3.9 15.8,7.6" {...common} />
          <Path d="M5.4 13.4v5.8a.9.9 0 0 0 .9.9h11.4a.9.9 0 0 0 .9-.9v-5.8" {...common} />
        </G>
      ) : null}
      {name === 'flag-finish' ? (
        <G>
          <Path d="M6 21V3.8" {...common} />
          <Rect x={6} y={4.4} width={12} height={7.6} {...common} />
          <Path d="M6 4.4h6v3.8H6zM12 8.2h6V12h-6z" fill={color} stroke="none" />
        </G>
      ) : null}
      {name === 'alert' ? (
        <G>
          <Circle cx={12} cy={12} r={8.4} {...common} />
          <Path d="M12 7.6v5" {...common} />
          <Circle cx={12} cy={16.2} r={1.1} fill={color} stroke="none" />
        </G>
      ) : null}
      {name === 'journey' ? (
        // A régua dos cem dias reduzida: quatro traços de 2,5 de largura, alturas
        // 9 / 16 / 12 / 6, intervalo 3, alinhados pela base. Raio 1,5 pedido; numa
        // largura de 2,5 ele é reduzido a 1,25 — o mesmo que o CSS do desenho faz.
        // Medidas em pixels quando o ícone é desenhado em 24 (1 unidade = 1px).
        <G>
          <Rect x={2.5} y={11} width={2.5} height={9} rx={1.25} fill={color} />
          <Rect x={8} y={4} width={2.5} height={16} rx={1.25} fill={color} />
          <Rect x={13.5} y={8} width={2.5} height={12} rx={1.25} fill={color} />
          <Rect x={19} y={14} width={2.5} height={6} rx={1.25} fill={color} />
        </G>
      ) : null}
      {name === 'community' ? (
        // Dois círculos vazados de 12 e 14, traço 2; o da direita recorta o outro.
        <G>
          <Circle cx={8.5} cy={12} r={6} stroke={color} strokeWidth={2} fill="none" />
          <Circle cx={15} cy={12} r={7} stroke={color} strokeWidth={2} fill={cutout} />
        </G>
      ) : null}
      {name === 'you' ? (
        // Cabeça de 9 sobre ombros de 18×8 com topo arredondado e sem base.
        <G>
          <Circle cx={12} cy={7.5} r={4.5} stroke={color} strokeWidth={2} fill="none" />
          <Path d="M3 21 A9 8 0 0 1 21 21" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
      ) : null}
    </Svg>
  );
}
