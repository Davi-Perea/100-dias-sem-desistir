import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { assertPhotoSafeToUpload, PHOTO_JPEG_QUALITY, PHOTO_MAX_DIMENSION } from '@/community/photos';

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
 * Só a galeria: sem câmera (o desenho C3 pede "Escolher uma foto"), o que evita
 * pedir a permissão da câmera. No iOS 14+ e no Android 13+ o seletor do sistema
 * não pede permissão de fotos.
 */

export type PickedAsset = { uri: string; width: number; height: number };

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

/** Implementação real com a API de contexto do expo-image-manipulator. */
export const encodeWithManipulator: PhotoEncoder = async (uri, plan) => {
  const context = ImageManipulator.manipulate(uri);
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
    if (!saved.base64) throw new Error('sem bytes');
    return { uri: saved.uri, width: saved.width, height: saved.height, base64: saved.base64 };
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
  const encoded = await encode(asset.uri, ({ width, height }) => fitWithin(width, height));
  const bytes = base64ToBytes(encoded.base64);
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
    base64: false,
    quality: 1,
  });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 };
}
