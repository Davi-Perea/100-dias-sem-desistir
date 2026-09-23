import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

import { CommunityError, communityError } from '@/community/errors';
import { assertPhotoSafeToUpload, PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION, stripJpegMetadata } from '@/community/photos';

/**
 * Foto da publicação (C3): escolher na galeria e preparar no aparelho.
 *
 * Preparar = redimensionar para no máximo PHOTO_MAX_DIMENSION px no lado maior e
 * reencodar em JPEG com PHOTO_JPEG_QUALITY (expo-image-manipulator). Depois,
 * `assertPhotoSafeToUpload` inspeciona os BYTES e recusa um JPEG que ainda tenha
 * EXIF (onde fica o GPS), XMP ou IPTC. A recusa acontece aqui, na escolha, para a
 * pessoa saber antes de tocar em "Publicar"; o upload confere de novo.
 *
 * Nada sobe para a rede nesta etapa. A foto só é enviada quando a pessoa publica.
 *
 * Galeria (até 4 fotos, F2) e câmera. No iOS 14+ e no Android 13+ o seletor do
 * sistema não pede permissão de fotos. A câmera pede a permissão só quando a
 * pessoa toca em "Câmera", e só se a build declarou o texto de finalidade
 * (`cameraConfigured`). A foto da câmera passa pela MESMA preparação (1600 px,
 * JPEG 0,8, sem EXIF/XMP/IPTC) antes de qualquer envio.
 *
 * ---------------------------------------------------------------------------
 * POR QUE `PICKER_QUALITY` NÃO É 1 ("a foto não carrega", 2026-09-22)
 *
 * EVIDÊNCIA (lido no código do pacote instalado, expo-image-picker 57.0.19,
 * android/src/main/java/expo/modules/imagepicker/MediaHandler.kt, `handleImage`):
 *
 *     val exporter = if (options.quality == MAXIMUM_QUALITY) RawImageExporter()
 *                    else CompressionImageExporter(...)
 *     val outputFile = createOutputFile(cacheDirectory, mimeType.toImageFileExtension())
 *
 * Com `quality: 1` (o valor de `MAXIMUM_QUALITY`) o seletor NÃO decodifica nada:
 * o `RawImageExporter` copia o arquivo ORIGINAL byte a byte para o cache. E
 * `String.toImageFileExtension` (ImagePickerUtils.kt) só preserva png/gif/bmp/webp
 * — todo o resto, `image/heic` e `image/heif` incluídos, vira ".jpeg". Ou seja: o
 * app recebia um arquivo HEIC com nome .jpeg (foto de iPhone, e de Android com
 * "economia de espaço"), ainda com o EXIF e o GPS do original, e entregava isso ao
 * expo-image-manipulator. O decodificador de HEIC depende de versão de sistema e
 * não existe no Expo Go de muitos aparelhos: `renderAsync` falha, a prévia nunca
 * aparece e a publicação fica sem foto — "não carrega".
 *
 * Sem `quality: 1`, o seletor usa o `CompressionImageExporter`, que decodifica com
 * o carregador de imagens dele (esse sim abre HEIC) e grava um bitmap comprimido
 * de verdade. `PICKER_QUALITY` é alto de propósito: quem redimensiona e comprime
 * para valer é o `preparePhoto`, logo depois; esta etapa só precisa entregar um
 * arquivo que o manipulador consiga abrir.
 *
 * O `CompressionImageExporter` faz `copyExifData(source, output, ...)` — ele
 * COPIA o EXIF de volta para o arquivo dele. Por isso a barreira de metadados não
 * muda de lugar: quem garante "sem localização" continua sendo o reencode do
 * `preparePhoto` mais a inspeção de bytes de `assertPhotoSafeToUpload`.
 */

/**
 * Qualidade pedida ao seletor. Precisa ser < 1: em 1 o expo-image-picker devolve
 * o arquivo original sem decodificar (ver o bloco acima).
 */
export const PICKER_QUALITY = 0.95;

export type PickedAsset = { uri: string; width: number; height: number; base64?: string | null };

export type PreparedPhoto = {
  /** Arquivo reencodado, no cache do app (para a prévia). */
  uri: string;
  width: number;
  height: number;
  /** Os bytes que vão subir, já sem metadados. */
  bytes: Uint8Array;
};

/** Novo tamanho, ou null se a foto já cabe. Só um lado é dado: o outro segue a proporção. */
export function fitWithin(
  width: number,
  height: number,
  max: number = PHOTO_MAX_DIMENSION,
): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0)) return null;
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_INDEX = (() => {
  const index = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64.length; i++) index[BASE64.charCodeAt(i)] = i;
  return index;
})();

/** Base64 (padrão, com ou sem "=") para bytes. Lança se houver caractere inválido. */
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[\s=]/g, '');
  if (clean.length % 4 === 1) throw new Error('base64 inválido');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const value = code < 128 ? BASE64_INDEX[code] : -1;
    if (value < 0) throw new Error('base64 inválido');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return out;
}

/** O que a preparação precisa do manipulador (injetável nos testes). */
export type PhotoEncoder = (
  uri: string,
  plan: (size: { width: number; height: number }) => { width: number } | { height: number } | null,
) => Promise<{ uri: string; width: number; height: number; base64: string }>;

/**
 * Implementação real com a API de contexto do expo-image-manipulator.
 *
 * Qualquer falha de decodificação vira `photo_not_jpeg` ("Não foi possível
 * preparar esta foto. Tente outra."): a pessoa precisa de uma saída, não de uma
 * mensagem do sistema. Antes, um erro nativo cru subia como erro desconhecido e a
 * tela ficava sem dizer o que fazer.
 */
export const encodeWithManipulator: PhotoEncoder = async (uri, plan) => {
  let context: ReturnType<typeof ImageManipulator.manipulate>;
  try {
    // Pode lançar já aqui quando o arquivo não abre (o caso do HEIC no Expo Go).
    context = ImageManipulator.manipulate(uri);
  } catch {
    throw communityError('photo_not_jpeg');
  }
  const refs: { release: () => void }[] = [];
  try {
    // Primeiro a imagem como está, para saber o tamanho REAL (já com a rotação
    // aplicada); o que o seletor informa pode vir antes da rotação.
    let image = await context.renderAsync();
    refs.push(image);
    const resize = plan({ width: image.width, height: image.height });
    if (resize) {
      image = await context.resize(resize).renderAsync();
      refs.push(image);
    }
    const saved = await image.saveAsync({ compress: PHOTO_JPEG_QUALITY, format: SaveFormat.JPEG, base64: true });
    if (!saved.base64) throw communityError('photo_not_jpeg');
    return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 };
  } catch (failure) {
    if (failure instanceof CommunityError) throw failure;
    throw communityError('photo_not_jpeg');
  } finally {
    for (const ref of refs) ref.release();
    context.release();
  }
};

/**
 * Redimensiona, reencoda e confere os bytes. Lança CommunityError
 * (photo_not_jpeg, photo_too_large, photo_has_metadata) se a foto não pode subir.
 */
export async function preparePhoto(asset: PickedAsset, encode: PhotoEncoder = encodeWithManipulator): Promise<PreparedPhoto> {
  let encoded: { uri: string; width: number; height: number; base64: string };
  try {
    encoded = await encode(asset.uri, ({ width, height }) => fitWithin(width, height));
  } catch (failure) {
    // PLANO B (relato do fundador, 2026-09-22: "a foto não sobe"): quando o
    // manipulador não abre o arquivo — acontece com HEIC dentro do Expo Go —,
    // usamos os bytes que o PRÓPRIO seletor já decodificou e comprimiu em JPEG
    // (pedimos base64 a ele). Sem redimensionar: o tamanho é conferido abaixo.
    if (!asset.base64) throw failure;
    encoded = { uri: asset.uri, width: asset.width, height: asset.height, base64: asset.base64 };
  }
  // Limpa EXIF/XMP/IPTC antes de conferir: o iOS grava EXIF de orientação mesmo
  // no arquivo reencodado, e a conferência recusava a foto por causa disso.
  const bytes = stripJpegMetadata(base64ToBytes(encoded.base64));
  assertPhotoSafeToUpload(bytes);
  return { uri: encoded.uri, width: encoded.width, height: encoded.height, bytes };
}

/** Abre a galeria do sistema. null = a pessoa desistiu. */
export async function pickFromLibrary(): Promise<PickedAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    // Sem EXIF e sem base64 do original: o que vale é o reencodado.
    exif: false,
    // Plano B: se o manipulador falhar (HEIC no Expo Go), usamos estes bytes.
    base64: true,
    quality: PICKER_QUALITY,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0, base64: asset.base64 ?? null };
}

/**
 * Galeria com várias fotos (F2: até 4 por post). `limit` = quantas ainda cabem.
 * Com 1, é o mesmo seletor de sempre. Cada foto ainda passa por `preparePhoto`.
 *
 * AUDITORIA EXTERNA 2026-09-23 (pico de memória): este é o ÚNICO caminho que
 * traz mais de uma foto, e era o único que multiplicava o custo. Com
 * `base64: true`, o seletor devolvia, de uma vez, o texto base64 de TODAS as
 * fotos escolhidas — e base64 ocupa cerca de 1,33× os bytes do arquivo. Quatro
 * fotos de celular moderno viravam quatro strings grandes vivas ao mesmo tempo,
 * ainda antes de o app tocar na primeira, e por cima disso vinha a imagem
 * manipulada e o base64 dela. Em Android intermediário é onde o app morria.
 *
 * Aqui o base64 deixa de ser pedido: o caminho normal é URI → manipulador →
 * bytes finais, uma foto por vez. O plano B (base64 do próprio seletor)
 * continua existindo onde o custo é de UMA foto: câmera e foto de perfil.
 * Com seleção múltipla, uma falha do manipulador vira erro na tela, com o nome
 * da foto — que é melhor do que o app fechar sozinho.
 */
export async function pickManyFromLibrary(limit: number): Promise<PickedAsset[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    // Só faz sentido com seleção múltipla; com uma foto o iOS ignora.
    orderedSelection: limit > 1,
    exif: false,
    // Uma foto só: cabe o plano B. Várias: só URI (ver o bloco acima).
    base64: limit === 1,
    quality: PICKER_QUALITY,
  });
  if (result.canceled) return [];
  return (result.assets ?? [])
    .filter((asset) => Boolean(asset?.uri))
    .slice(0, limit)
    .map((asset) => ({ uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0, base64: asset.base64 ?? null }));
}

/**
 * A câmera só existe se a build declarar o texto de finalidade da câmera
 * (plugin `expo-image-picker`, `cameraPermission`). Sem ele, o iOS encerra o app
 * ao pedir a permissão; por isso a tela pergunta aqui antes de abrir.
 */
export function cameraConfigured(config: unknown = Constants.expoConfig): boolean {
  const plugins = (config as { plugins?: unknown[] } | null | undefined)?.plugins;
  if (!Array.isArray(plugins)) return false;
  return plugins.some(
    (entry) =>
      Array.isArray(entry) &&
      entry[0] === 'expo-image-picker' &&
      typeof (entry[1] as { cameraPermission?: unknown } | undefined)?.cameraPermission === 'string',
  );
}

export type CameraResult = { kind: 'photo'; asset: PickedAsset } | { kind: 'canceled' } | { kind: 'denied' };

/** Tira uma foto agora. Pede a permissão da câmera só neste momento (nunca antes). */
export async function takePhoto(): Promise<CameraResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { kind: 'denied' };
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    exif: false,
    // Plano B: se o manipulador falhar (HEIC no Expo Go), usamos estes bytes.
    base64: true,
    quality: PICKER_QUALITY,
  });
  if (result.canceled) return { kind: 'canceled' };
  const asset = result.assets?.[0];
  if (!asset?.uri) return { kind: 'canceled' };
  // AUDITORIA EXTERNA 2026-09-23: o `base64: true` acima era pedido e jogado
  // fora aqui. A galeria guardava o seu; a câmera, não. O plano B existia no
  // papel e nunca funcionava para quem tirasse a foto na hora. É uma foto só —
  // o custo de memória é limitado, ao contrário da seleção múltipla.
  return {
    kind: 'photo',
    asset: { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0, base64: asset.base64 ?? null },
  };
}
