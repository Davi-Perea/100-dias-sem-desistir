import * as ExpoClipboard from 'expo-clipboard';

/** Copiar para a área de transferência (expo-clipboard, incluído no Expo Go e no SDK 57). */
export async function copyText(text: string): Promise<void> {
  await ExpoClipboard.setStringAsync(text);
}
