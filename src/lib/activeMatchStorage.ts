const ACTIVE_MATCH_STORAGE_KEY = 'cricket_scorer_active_match';

export interface ActiveMatchRef {
  matchId: string;
  userId?: string;
  updatedAt: string;
}

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  return window.localStorage;
};

export const getStoredActiveMatch = (): ActiveMatchRef | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(ACTIVE_MATCH_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<ActiveMatchRef>;
    if (!parsed.matchId || !parsed.updatedAt) {
      storage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
      return null;
    }

    return {
      matchId: parsed.matchId,
      userId: parsed.userId,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    storage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
    return null;
  }
};

export const setStoredActiveMatch = (activeMatch: ActiveMatchRef): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(activeMatch));
};

export const clearStoredActiveMatch = (): void => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(ACTIVE_MATCH_STORAGE_KEY);
};
