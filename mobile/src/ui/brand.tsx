import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useTheme } from './theme';

const BLACK = require('../../assets/brand/dove-black.png');
const WHITE = require('../../assets/brand/dove-white.png');

/** Proporção do asset entregue (224×144). Nunca deformar a marca. */
const RATIO = 224 / 144;

export type DoveRole = 'marker' | 'signature' | 'decorative';

type Props = {
  /** Largura em px; a altura sai da proporção do asset. */
  width: number;
  /**
   * Sem valor, a marca acompanha o tema: preta sobre página clara, branca sobre
   * página escura. Só as telas de fundo FIXO passam o tom (marco, bloco tinta
   * do Juntos), porque lá o fundo não muda com o tema.
   */
  tone?: 'black' | 'white';
  /**
   * `marker` = "Você está aqui" (posição na jornada).
   * `signature` = "Lagoinha" (assinatura de marca).
   * `decorative` = já explicada pelo texto ao lado; some do leitor de tela.
   */
  role?: DoveRole;
  style?: StyleProp<ImageStyle>;
};

/**
 * Pomba da Lagoinha.
 *
 * PENDENTE DE PRODUÇÃO: estes PNGs foram extraídos do arquivo do cliente pelo
 * time de design, que pede explicitamente o SVG oficial para substituí-los — em
 * produção a marca precisa ser vetor (nítida em qualquer escala e tingível por
 * código). Trocar aqui é mudança de asset, não de layout.
 */
export function Dove({ width, tone, role = 'decorative', style }: Props) {
  const { isDark } = useTheme();
  const useWhite = tone ? tone === 'white' : isDark;
  const label = role === 'marker' ? 'Você está aqui' : role === 'signature' ? 'Lagoinha' : undefined;
  return (
    <Image
      source={useWhite ? WHITE : BLACK}
      style={[{ width, height: Math.round((width / RATIO) * 10) / 10 }, style]}
      resizeMode="contain"
      accessible={label !== undefined}
      accessibilityRole={label !== undefined ? 'image' : undefined}
      accessibilityLabel={label}
      aria-hidden={label === undefined}
    />
  );
}
