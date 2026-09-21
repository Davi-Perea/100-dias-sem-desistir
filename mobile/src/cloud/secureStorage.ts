import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Armazenamento da sessão do Supabase.
 *
 * O SecureStore tem limite prático de ~2 KB por valor, e uma sessão com access e
 * refresh token passa disso. O padrão recomendado é guardar apenas a CHAVE no
 * SecureStore (Keychain / Keystore) e o texto cifrado no AsyncStorage.
 *
 * Na web não existe SecureStore; ali a sessão fica no AsyncStorage sem cifra,
 * e a web não é plataforma de produção deste app.
 */

/**
 * Prefixo da chave no SecureStore. O expo-secure-store só aceita nomes que casem
 * com /^[\w.-]+$/ e LANÇA "Invalid key provided to SecureStore" para qualquer
 * outro caractere. Por isso o separador é ponto, nunca dois-pontos (SEC-01): com
 * "session-key:" o verifyOtp consumia o código e a sessão nunca era gravada.
 */
const KEY_PREFIX = 'session-key.';

/** Nome aceito pelo SecureStore para a chave de cifra de `name`. */
export function secureKeyName(name: string): string {
  return `${KEY_PREFIX}${name.replace(/[^\w.-]/g, '_')}`;
}

/**
 * Formato gravado no AsyncStorage (PER-07/SEC-11):
 *   "v2:" + contador inicial aleatório (16 bytes em hex) + ":" + texto cifrado em hex.
 * O contador é novo a cada gravação, então dois refreshes da sessão nunca reusam o
 * mesmo keystream do AES-CTR. O formato antigo (só o hex, contador fixo em 1) ainda
 * é lido, para quem já tinha sessão gravada; a próxima gravação já sai em v2.
 */
const FORMAT_V2 = 'v2';
const COUNTER_BYTES = 16;
const HEX = /^[0-9a-f]*$/i;

async function getOrCreateEncryptionKey(name: string): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(secureKeyName(name));
  if (stored) return aesjs.utils.hex.toBytes(stored);
  const fresh = Crypto.getRandomBytes(32);
  await SecureStore.setItemAsync(secureKeyName(name), aesjs.utils.hex.fromBytes(fresh), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return fresh;
}

export async function encrypt(name: string, value: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(name);
  const counter = Crypto.getRandomBytes(COUNTER_BYTES);
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counter));
  const body = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
  return `${FORMAT_V2}:${aesjs.utils.hex.fromBytes(counter)}:${body}`;
}

export async function decrypt(name: string, stored: string): Promise<string | null> {
  const keyHex = await SecureStore.getItemAsync(secureKeyName(name));
  if (!keyHex) return null;
  const key = aesjs.utils.hex.toBytes(keyHex);

  let counter: aesjs.Counter;
  let body: string;
  if (stored.startsWith(`${FORMAT_V2}:`)) {
    const [, counterHex, cipherHex] = stored.split(':');
    if (!counterHex || counterHex.length !== COUNTER_BYTES * 2 || !HEX.test(counterHex) || cipherHex === undefined) {
      throw new Error('sessão cifrada em formato inválido');
    }
    counter = new aesjs.Counter(aesjs.utils.hex.toBytes(counterHex));
    body = cipherHex;
  } else {
    // Formato antigo: contador fixo em 1.
    counter = new aesjs.Counter(1);
    body = stored;
  }
  if (!HEX.test(body)) throw new Error('sessão cifrada em formato inválido');
  const cipher = new aesjs.ModeOfOperation.ctr(key, counter);
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(body)));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    if (Platform.OS === 'web') return raw;
    try {
      return await decrypt(key, raw);
    } catch {
      // Chave perdida ou dado corrompido: trate como "sem sessão", nunca quebre.
      await AsyncStorage.removeItem(key);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },

  /** Logout precisa apagar o texto cifrado E a chave (spec §15). */
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(secureKeyName(key)).catch(() => {});
    }
  },
};
