import { communityError } from './errors';

/**
 * Fotos da Comunidade: bucket PRIVADO, arquivo '<uuid>.jpg' sem user_id no nome,
 * leitura só por URL assinada curta.
 *
 * Preparação no aparelho (quem faz é a tela, com expo-image-manipulator, que ainda
 * NÃO está instalado — pedido registrado): redimensionar para no máximo
 * PHOTO_MAX_DIMENSION px no lado maior e reencodar em JPEG com PHOTO_JPEG_QUALITY.
 * Reencodar deveria descartar o EXIF, mas isso NÃO está confirmado na documentação
 * (docs/product/comunidade/03-dados-e-seguranca.md §2.6). Por isso este módulo
 * inspeciona os bytes e RECUSA subir um JPEG que ainda tenha EXIF (onde mora o GPS),
 * XMP ou IPTC. Sem essa prova, a tela não pode prometer "sem localização".
 */

export const PHOTO_BUCKET = 'community-photos';
export const PHOTO_MAX_DIMENSION = 1600;
export const PHOTO_JPEG_QUALITY = 0.8;
/** Igual ao file_size_limit do bucket (20260921130200_comunidade_storage.sql). */
export const PHOTO_MAX_BYTES = 1_572_864;
/** Validade da URL assinada, em segundos. Curta: arquivo apagado para de valer logo. */
export const SIGNED_URL_TTL_SECONDS = 3600;

const PHOTO_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

/** Nome do arquivo no bucket: só um uuid aleatório. */
export function newPhotoPath(randomUUID: () => string): string {
  const path = `${randomUUID().toLowerCase()}.jpg`;
  if (!PHOTO_PATH.test(path)) throw communityError('invalid_input');
  return path;
}

export function isPhotoPath(value: string): boolean {
  return PHOTO_PATH.test(value);
}

export type JpegInspection = {
  isJpeg: boolean;
  /** APP1 "Exif\0\0": onde ficam GPS, modelo do aparelho, data. */
  hasExif: boolean;
  /** APP1 XMP: também pode carregar GPS. */
  hasXmp: boolean;
  /** APP13 Photoshop/IPTC: pode carregar local e nome. */
  hasIptc: boolean;
};

function startsWithAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  if (offset + text.length > bytes.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Percorre os segmentos do cabeçalho JPEG até o início da imagem (SOS) e diz que
 * metadados ficaram. Arquivo truncado ou malformado conta como "não é JPEG".
 */
export function inspectJpeg(bytes: Uint8Array): JpegInspection {
  const result: JpegInspection = { isJpeg: false, hasExif: false, hasXmp: false, hasIptc: false };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return result;

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return result; // esperava um marcador
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1; // preenchimento
      continue;
    }
    if (marker === 0xda || marker === 0xd9) {
      // SOS: começa a imagem; EOI: fim. Cabeçalho lido por inteiro.
      result.isJpeg = true;
      return result;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // marcadores sem tamanho
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return result;
    const payload = offset + 4;
    if (marker === 0xe1) {
      if (startsWithAscii(bytes, payload, 'Exif\0\0')) result.hasExif = true;
      if (startsWithAscii(bytes, payload, 'http://ns.adobe.com/xap/1.0/')) result.hasXmp = true;
    }
    if (marker === 0xed) result.hasIptc = true;
    offset += 2 + length;
  }
  return result;
}

/**
 * Tira do JPEG os segmentos de metadado (APP0–APP15 e comentário), que é onde
 * moram EXIF, XMP, IPTC e a localização. O iOS grava EXIF de orientação mesmo
 * no arquivo reencodado pelo manipulador; sem esta limpeza a foto era RECUSADA
 * na última barreira e a pessoa via "não foi possível preparar esta foto" sem
 * entender por quê (relato do fundador, 2026-09-22). Os dados da imagem em si
 * (quantização, Huffman, SOF, SOS) ficam intactos.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const keep: { start: number; end: number }[] = [{ start: 0, end: 2 }];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return bytes; // malformado: não mexe
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) {
      keep.push({ start: offset, end: bytes.length }); // SOS: o resto é imagem
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      keep.push({ start: offset, end: offset + 2 });
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return bytes;
    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) keep.push({ start: offset, end: offset + 2 + length });
    offset += 2 + length;
  }
  const size = keep.reduce((total, part) => total + (part.end - part.start), 0);
  const out = new Uint8Array(size);
  let written = 0;
  for (const part of keep) {
    out.set(bytes.subarray(part.start, part.end), written);
    written += part.end - part.start;
  }
  return out;
}

/**
 * Última barreira antes do upload. Lança CommunityError se a foto não pode subir.
 */
export function assertPhotoSafeToUpload(bytes: Uint8Array): void {
  const inspection = inspectJpeg(bytes);
  if (!inspection.isJpeg) throw communityError('photo_not_jpeg');
  if (bytes.length > PHOTO_MAX_BYTES) throw communityError('photo_too_large');
  if (inspection.hasExif || inspection.hasXmp || inspection.hasIptc) {
    throw communityError('photo_has_metadata');
  }
}
