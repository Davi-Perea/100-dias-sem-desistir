/**
 * Fotos da Comunidade: o app recusa subir JPEG que ainda tenha EXIF (GPS), XMP
 * ou IPTC, e o nome do arquivo nunca leva user_id. Cliente Supabase simulado.
 */
import { createCommunityApi, type CommunityClient } from '@/community/api';
import { CommunityError } from '@/community/errors';
import { assertPhotoSafeToUpload, inspectJpeg, newPhotoPath, PHOTO_MAX_BYTES } from '@/community/photos';

// jest.mock é içado pelo babel-jest para antes dos imports.
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

function segment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

const SOI = [0xff, 0xd8];
const APP0_JFIF = segment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const APP1_EXIF = segment(0xe1, [...ascii('Exif\0\0'), 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8]);
const APP1_XMP = segment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/\0'), ...ascii('<x:xmpmeta/>')]);
const APP13_IPTC = segment(0xed, ascii('Photoshop 3.0\0'));
const SOS_AND_DATA = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x12, 0x34, 0xff, 0xd9];

const jpeg = (...parts: number[][]) => new Uint8Array(parts.flat());
const clean = jpeg(SOI, APP0_JFIF, SOS_AND_DATA);

describe('inspeção do JPEG', () => {
  test('JPEG limpo (reencodado, só JFIF)', () => {
    expect(inspectJpeg(clean)).toEqual({ isJpeg: true, hasExif: false, hasXmp: false, hasIptc: false });
  });

  test('detecta EXIF (onde mora o GPS)', () => {
    expect(inspectJpeg(jpeg(SOI, APP1_EXIF, SOS_AND_DATA)).hasExif).toBe(true);
  });

  test('detecta XMP e IPTC', () => {
    const inspection = inspectJpeg(jpeg(SOI, APP0_JFIF, APP1_XMP, APP13_IPTC, SOS_AND_DATA));
    expect(inspection).toMatchObject({ isJpeg: true, hasXmp: true, hasIptc: true });
  });

  test('arquivo que não é JPEG, ou truncado no cabeçalho, não passa', () => {
    expect(inspectJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47])).isJpeg).toBe(false);
    expect(inspectJpeg(jpeg(SOI, APP0_JFIF.slice(0, 6))).isJpeg).toBe(false);
  });
});

describe('barreira antes do upload', () => {
  test.each([
    ['com EXIF', jpeg(SOI, APP1_EXIF, SOS_AND_DATA), 'photo_has_metadata'],
    ['PNG', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]), 'photo_not_jpeg'],
  ])('%s é recusado', (_, bytes, code) => {
    expect(() => assertPhotoSafeToUpload(bytes)).toThrow(CommunityError);
    try {
      assertPhotoSafeToUpload(bytes);
    } catch (error) {
      expect((error as CommunityError).code).toBe(code);
    }
  });

  test('maior que o limite do bucket é recusado', () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(clean);
    expect(() => assertPhotoSafeToUpload(big)).toThrow(expect.objectContaining({ code: 'photo_too_large' }));
  });

  test('o nome do arquivo é só um uuid aleatório', () => {
    expect(newPhotoPath(() => 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE')).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg');
    expect(() => newPhotoPath(() => '00000000-0000-4000-8000-00000000000a/../x')).toThrow(CommunityError);
  });
});

describe('upload e URLs assinadas', () => {
  function setup() {
    const upload = jest.fn(async () => ({ data: {}, error: null }));
    const createSignedUrls = jest.fn(async (paths: string[]) => ({
      data: paths.map((path, i) =>
        i === 0 ? { path, signedUrl: `https://assinada/${path}`, error: null } : { path, signedUrl: null, error: 'Not found' },
      ),
      error: null,
    }));
    const remove = jest.fn(async () => ({ data: [], error: null }));
    const from = jest.fn(() => ({ upload, createSignedUrls, remove }));
    const client: CommunityClient = { rpc: jest.fn(), storage: { from } };
    const community = createCommunityApi(client, { randomUUID: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
    return { community, upload, createSignedUrls, from };
  }

  test('foto com EXIF não chega a tocar a rede', async () => {
    const { community, upload } = setup();
    await expect(community.uploadPhoto(jpeg(SOI, APP1_EXIF, SOS_AND_DATA))).rejects.toMatchObject({
      code: 'photo_has_metadata',
    });
    expect(upload).not.toHaveBeenCalled();
  });

  test('foto limpa sobe no bucket privado, como JPEG, sem sobrescrever', async () => {
    const { community, upload, from } = setup();
    await expect(community.uploadPhoto(clean)).resolves.toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg');
    expect(from).toHaveBeenCalledWith('community-photos');
    expect(upload).toHaveBeenCalledWith('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg', clean, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  });

  test('assina em lote, sem repetir e sem caminhos estranhos; o que o servidor recusa não volta', async () => {
    const { community, createSignedUrls } = setup();
    const a = '11111111-1111-4111-8111-111111111111.jpg';
    const b = '22222222-2222-4222-8222-222222222222.jpg';
    const urls = await community.signPhotoUrls([a, null, a, b, '../x.jpg']);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith([a, b], 3600);
    expect([...urls.keys()]).toEqual([a]);
  });

  test('sem fotos na página, nenhuma chamada', async () => {
    const { community, createSignedUrls } = setup();
    await expect(community.signPhotoUrls([null, null])).resolves.toEqual(new Map());
    expect(createSignedUrls).not.toHaveBeenCalled();
  });
});
