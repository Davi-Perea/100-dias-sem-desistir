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
const KEY_PREFIX = 'session-key:';

async function getOrCreateEncryptionKey(name: string): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(`${KEY_PREFIX}${name}`);
  if (stored) return aesjs.utils.hex.toBytes(stored);
  const fresh = Crypto.getRandomBytes(32);
  await SecureStore.setItemAsync(`${KEY_PREFIX}${name}`, aesjs.utils.hex.fromBytes(fresh), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return fresh;
}

async function encrypt(name: string, value: string): Promise<string> {
  const key = await getOrCreateEncryptionKey(name);
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
  return aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
}

async function decrypt(name: string, cipherText: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(`${KEY_PREFIX}${name}`);
  if (!stored) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(stored), new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(cipherText)));
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
      await SecureStore.deleteItemAsync(`${KEY_PREFIX}${key}`).catch(() => {});
    }
  },
};
