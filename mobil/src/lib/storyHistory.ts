import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export type StoryAgeRange = '3-5' | '6-8';
export type StoryLength = 'short' | 'medium';
export type StoryTheme = 'friendship' | 'courage' | 'sharing' | 'emotions';

export interface StoryHistoryEntry {
  id: string;
  topic: string;
  story: string;
  audioBase64?: string;
  audioFileUri?: string;
  mimeType?: string;
  ageRange: StoryAgeRange;
  length: StoryLength;
  theme: StoryTheme;
  createdAt: string;
  storyLength: number;
  isFavorite?: boolean;
}

interface SaveStoryHistoryInput {
  topic: string;
  story: string;
  audioBase64?: string;
  mimeType?: string;
  ageRange: StoryAgeRange;
  length: StoryLength;
  theme: StoryTheme;
}

const AUDIO_STORAGE_DIRECTORY = `${FileSystem.documentDirectory}story-history-audio`;

const STORAGE_PREFIX = 'masal-kutusu:story-history';
const MAX_STORY_HISTORY = 20;
const MAX_AUDIO_BASE64_LENGTH = 350_000;

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

async function ensureAudioStorageDirectory() {
  const info = await FileSystem.getInfoAsync(AUDIO_STORAGE_DIRECTORY);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_STORAGE_DIRECTORY, { intermediates: true });
  }
}

function getAudioFileExtension(mimeType?: string) {
  if (!mimeType) {
    return 'audio';
  }

  if (mimeType.includes('mpeg')) {
    return 'mp3';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return 'audio';
}

async function persistAudioToFile(entryId: string, audioBase64?: string, mimeType?: string) {
  if (!audioBase64 || !mimeType) {
    return null;
  }

  await ensureAudioStorageDirectory();
  const fileUri = `${AUDIO_STORAGE_DIRECTORY}/${entryId}.${getAudioFileExtension(mimeType)}`;
  await FileSystem.writeAsStringAsync(fileUri, audioBase64, { encoding: 'base64' });
  return fileUri;
}

function normalizeHistoryEntry(entry: StoryHistoryEntry): StoryHistoryEntry {
  const normalizedEntry = {
    ...entry,
    isFavorite: entry.isFavorite ?? false,
  };

  if (!normalizedEntry.audioBase64 || normalizedEntry.audioBase64.length <= MAX_AUDIO_BASE64_LENGTH) {
    return normalizedEntry;
  }

  return {
    ...normalizedEntry,
    audioFileUri: normalizedEntry.audioFileUri,
    audioBase64: undefined,
    mimeType: normalizedEntry.mimeType,
  };
}

function sortHistoryEntries(entries: StoryHistoryEntry[]) {
  return entries.sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return Number(right.isFavorite) - Number(left.isFavorite);
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

async function createHistoryEntry(userEntry: SaveStoryHistoryInput): Promise<StoryHistoryEntry> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const audioFileUri = await persistAudioToFile(id, userEntry.audioBase64, userEntry.mimeType);

  return normalizeHistoryEntry({
    id,
    topic: userEntry.topic,
    story: userEntry.story,
    audioBase64: userEntry.audioBase64,
    audioFileUri: audioFileUri ?? undefined,
    mimeType: userEntry.mimeType,
    ageRange: userEntry.ageRange,
    length: userEntry.length,
    theme: userEntry.theme,
    createdAt: new Date().toISOString(),
    storyLength: userEntry.story.length,
  });
}

export async function getStoryHistory(userId: string) {
  try {
    const rawValue = await AsyncStorage.getItem(getStorageKey(userId));

    if (!rawValue) {
      return [] as StoryHistoryEntry[];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? (parsedValue as StoryHistoryEntry[]).map(normalizeHistoryEntry)
      : [] as StoryHistoryEntry[];
  } catch {
    return [] as StoryHistoryEntry[];
  }
}

export async function saveStoryToHistory(userId: string, entry: SaveStoryHistoryInput) {
  const nextEntry = await createHistoryEntry(entry);

  const existingHistory = await getStoryHistory(userId);
  const filteredHistory = existingHistory.filter((item) => item.story !== nextEntry.story);
  const nextHistory = sortHistoryEntries([nextEntry, ...filteredHistory]).slice(0, MAX_STORY_HISTORY);

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));

  return nextEntry;
}

export async function toggleFavoriteStory(userId: string, storyId: string) {
  const existingHistory = await getStoryHistory(userId);
  const nextHistory = sortHistoryEntries(
    existingHistory.map((item) => item.id === storyId ? { ...item, isFavorite: !item.isFavorite } : item),
  );

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));
  return nextHistory;
}

export async function removeStoryFromHistory(userId: string, storyId: string) {
  const existingHistory = await getStoryHistory(userId);
  const nextHistory = existingHistory.filter((item) => item.id !== storyId);
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));
  return nextHistory;
}
