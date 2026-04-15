import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoryAgeRange = '3-5' | '6-8';
export type StoryLength = 'short' | 'medium';
export type StoryTheme = 'friendship' | 'courage' | 'sharing' | 'emotions';

export interface StoryHistoryEntry {
  id: string;
  topic: string;
  story: string;
  ageRange: StoryAgeRange;
  length: StoryLength;
  theme: StoryTheme;
  createdAt: string;
  storyLength: number;
}

interface SaveStoryHistoryInput {
  topic: string;
  story: string;
  ageRange: StoryAgeRange;
  length: StoryLength;
  theme: StoryTheme;
}

const STORAGE_PREFIX = 'masal-kutusu:story-history';
const MAX_STORY_HISTORY = 20;

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export async function getStoryHistory(userId: string) {
  try {
    const rawValue = await AsyncStorage.getItem(getStorageKey(userId));

    if (!rawValue) {
      return [] as StoryHistoryEntry[];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue as StoryHistoryEntry[] : [];
  } catch {
    return [] as StoryHistoryEntry[];
  }
}

export async function saveStoryToHistory(userId: string, entry: SaveStoryHistoryInput) {
  const nextEntry: StoryHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic: entry.topic,
    story: entry.story,
    ageRange: entry.ageRange,
    length: entry.length,
    theme: entry.theme,
    createdAt: new Date().toISOString(),
    storyLength: entry.story.length,
  };

  const existingHistory = await getStoryHistory(userId);
  const filteredHistory = existingHistory.filter((item) => item.story !== nextEntry.story);
  const nextHistory = [nextEntry, ...filteredHistory].slice(0, MAX_STORY_HISTORY);

  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));

  return nextEntry;
}

export async function removeStoryFromHistory(userId: string, storyId: string) {
  const existingHistory = await getStoryHistory(userId);
  const nextHistory = existingHistory.filter((item) => item.id !== storyId);
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextHistory));
  return nextHistory;
}
