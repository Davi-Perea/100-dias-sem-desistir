import { useState } from 'react';
import { Image, type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, useWindowDimensions, View } from 'react-native';

import { AppText, Rule } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/**
 * Fotos do post (F1): de ponta a ponta, 1:1, até 4, em carrossel que a pessoa
 * arrasta. Com mais de uma, o indicador embaixo mostra em qual está — pela
 * FORMA (o ponto atual é mais largo), não só pela cor — e cada foto diz ao
 * leitor de tela "Foto 2 de 3".
 *
 * A URL é assinada e curta; sem ela (ainda assinando, ou o servidor recusou)
 * fica o quadro vazio, e se a imagem falhar a tela diz isso.
 */
export function PhotoCarousel({
  paths,
  urls,
  authorName,
  testID = 'post-photos',
}: {
  paths: string[];
  urls: Map<string, string>;
  authorName: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const screenSize = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const size = width || screenSize.width;
  const many = paths.length > 1;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!size) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / size);
    if (next !== index && next >= 0 && next < paths.length) setIndex(next);
  };

  return (
    <View testID={testID} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <Rule />
      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={many}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}
        testID={`${testID}-scroll`}
      >
        {paths.map((path, i) => (
          <Photo
            key={path}
            url={urls.get(path)}
            size={size}
            label={many ? `Foto ${i + 1} de ${paths.length}, publicada por ${authorName}` : `Foto publicada por ${authorName}`}
            testID={i === 0 ? 'post-photo' : `post-photo-${i + 1}`}
          />
        ))}
      </ScrollView>
      <Rule />
      {many ? (
        <View
          aria-hidden
          testID={`${testID}-indicator`}
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: spacing.sm }}
        >
          {paths.map((path, i) => (
            <View
              key={path}
              testID={i === index ? `${testID}-dot-active` : undefined}
              style={{
                width: i === index ? 18 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === index ? colors.text : colors.controlBorder,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Photo({ url, size, label, testID }: { url: string | undefined; size: number; label: string; testID: string }) {
  const { colors } = useTheme();
  /**
   * AUDITORIA EXTERNA 2026-09-23: a URL das fotos é assinada e vence. Quando
   * vencia, a imagem falhava, um `failed` booleano virava true — e ficava true
   * para sempre. O feed até pedia uma URL nova e a entregava a este mesmo
   * componente montado, mas ele continuava mostrando "não foi possível".
   *
   * Guardar QUAL url falhou, em vez de "falhou", resolve sem efeito nenhum: a
   * falha vale para aquele endereço, e um endereço novo nasce limpo. O erro da
   * url nova continua aparecendo normalmente.
   */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = url !== undefined && failedUrl === url;
  return (
    <View style={{ width: size, height: size, backgroundColor: colors.surfaceSunken, justifyContent: 'center' }}>
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          onError={() => setFailedUrl(url)}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          accessible
          accessibilityRole="image"
          accessibilityLabel={label}
          testID={testID}
        />
      ) : failed ? (
        <AppText variant="caption" style={{ textAlign: 'center', padding: spacing.lg }}>
          Não foi possível mostrar a foto agora.
        </AppText>
      ) : (
        // Sem URL ainda: em rede lenta, isto era um quadrado do tamanho da tela
        // que o leitor de tela pulava em silêncio, entre o texto e o Amém.
        <AppText
          variant="caption"
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', padding: spacing.lg, color: colors.textSecondary }}
          testID={`${testID}-carregando`}
        >
          Carregando a foto…
        </AppText>
      )}
    </View>
  );
}
