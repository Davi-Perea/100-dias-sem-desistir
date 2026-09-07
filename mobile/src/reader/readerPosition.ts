import AsyncStorage from '@react-native-async-storage/async-storage';

/** Última posição de leitura (spec §7: "restaurar posição"). LOCAL-ONLY. */
export type ReaderPosition = { dayNumber: number; readingIndex: number; chapterIndex: number };

const KEY = 'reader-position:v1';

export async function saveReaderPosition(position: ReaderPosition): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(position));
}

export async function loadReaderPosition(): Promise<ReaderPosition | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReaderPosition>;
    if (!Number.isInteger(parsed.dayNumber)) return null;
    return {
      dayNumber: parsed.dayNumber as number,
      readingIndex: Number.isInteger(parsed.readingIndex) ? (parsed.readingIndex as number) : 0,
      chapterIndex: Number.isInteger(parsed.chapterIndex) ? (parsed.chapterIndex as number) : 0,
    };
  } catch {
    return null;
  }
}
