import {
  collection,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  limit,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Match, FirebaseMatch } from '../types';
import { trackFirebaseOperation, CacheTracker } from '../utils/performanceMonitor';
import { getErrorCode, getErrorMessage } from './errorUtils';

// Cache for connection status and data
let connectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';
let connectionTestPromise: Promise<boolean> | null = null;
type CachedMatchList = (FirebaseMatch & { id: string })[];

const matchesCache = new Map<string, { data: CachedMatchList; timestamp: number }>();
const CACHE_DURATION = 60000; // Increased to 60 seconds for better performance
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const isRetryableError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  return code === 'unavailable' || code === 'deadline-exceeded';
};

const toCachedMatch = (matchDoc: QueryDocumentSnapshot<DocumentData>): FirebaseMatch & { id: string } => {
  const data = matchDoc.data() as FirebaseMatch;
  return { ...data, id: matchDoc.id };
};

// Enhanced retry logic
const withRetry = async <T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
};

// Data sanitization function to remove undefined values (Firestore doesn't accept undefined)
const sanitizeMatchData = <T>(data: T): T => {
  if (Array.isArray(data)) {
    return data
      .map(item => sanitizeMatchData(item))
      .filter(item => item !== undefined) as T;
  }

  if (
    data === null ||
    data === undefined ||
    typeof data !== 'object' ||
    data instanceof Date ||
    data instanceof Timestamp
  ) {
    return data;
  }

  const sanitized = Object.entries(data as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    acc[key] = sanitizeMatchData(value);
    return acc;
  }, {});

  return sanitized as T;
};

// Generate unique 6-character match code
export const generateMatchCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Optimized connection test with caching and singleton pattern
export const testFirestoreConnection = async (): Promise<boolean> => {
  // Return cached result if available
  if (connectionStatus === 'connected') {
    return true;
  }

  // Return ongoing test if already in progress
  if (connectionTestPromise) {
    return connectionTestPromise;
  }

  connectionTestPromise = (async () => {
    try {
      // Use a very lightweight operation with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      const testPromise = getDocs(query(collection(db, 'matches'), limit(1)));

      await Promise.race([testPromise, timeoutPromise]);

      connectionStatus = 'connected'; return true;
    } catch {
      connectionStatus = 'failed';
      return false;
    } finally {
      // Reset the promise after 5 seconds to allow retry
      setTimeout(() => {
        connectionTestPromise = null;
        if (connectionStatus === 'failed') {
          connectionStatus = 'unknown'; // Allow retry
        }
      }, 5000);
    }
  })();

  return connectionTestPromise;
};

// Helper function to check cache
const getCachedData = (cacheKey: string): CachedMatchList | null => {
  const cached = matchesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    CacheTracker.recordHit();
    return cached.data;
  }
  CacheTracker.recordMiss();
  return null;
};

// Helper function to set cache
const setCachedData = (cacheKey: string, data: CachedMatchList): void => {
  matchesCache.set(cacheKey, { data, timestamp: Date.now() });
};

// Optimized save function - remove redundant connection test
export const saveMatch = async (matchData: Match, userId: string): Promise<string> => {
  return withRetry(async () => {
    const matchCode = matchData.matchCode || generateMatchCode();
    const matchToSave = sanitizeMatchData({
      ...matchData,
      matchCode,
      userId,
      isGuest: false,
      isPublic: false,
      createdAt: matchData.createdAt || Timestamp.now(), // Preserve original creation time
      updatedAt: Timestamp.now()
    });

    // Use setDoc with the match ID to prevent duplicates
    await setDoc(doc(db, 'matches', matchData.id), matchToSave);
    // Clear relevant cache
    matchesCache.clear();

    return matchCode;
  });
};

// Optimized real-time update
export const updateMatchRealtime = async (matchId: string, matchData: Match): Promise<void> => {
  return withRetry(async () => {
    const matchRef = doc(db, 'matches', matchId);
    const sanitizedData = sanitizeMatchData({
      ...matchData,
      updatedAt: Timestamp.now()
    });
    await updateDoc(matchRef, sanitizedData);
  });
};

// Optimized create match function
export const createMatch = async (matchData: Match, userId: string): Promise<{ matchCode: string; docId: string }> => {
  return withRetry(async () => {
    const matchCode = generateMatchCode();
    const matchToSave = sanitizeMatchData({
      ...matchData,
      matchCode,
      userId,
      isGuest: false,
      isPublic: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    // Use setDoc with the match ID to ensure consistency with saveMatch
    await setDoc(doc(db, 'matches', matchData.id), matchToSave);
    // Clear cache
    matchesCache.clear();

    return { matchCode, docId: matchData.id };
  });
};

// Delete match function
export const deleteMatch = async (matchId: string): Promise<void> => {
  return withRetry(async () => {
    const matchRef = doc(db, 'matches', matchId);
    await deleteDoc(matchRef);
    // Clear cache to ensure fresh data on next load
    matchesCache.clear();
  });
};

// Optimized get match by code with better query
export const getMatchByCode = async (matchCode: string): Promise<Match | null> => {
  return withRetry(async () => {
    // Use where query instead of scanning all documents
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('matchCode', '==', matchCode), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const matchDoc = snapshot.docs[0];
    return matchDoc.data() as Match;
  });
};

export const getMatchById = async (matchId: string): Promise<Match | null> => {
  return withRetry(async () => {
    const matchRef = doc(db, 'matches', matchId);
    const snapshot = await getDoc(matchRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as Match;
  });
};

// Heavily optimized user matches with caching and timeout
export const getUserMatches = async (userId: string): Promise<(FirebaseMatch & { id: string })[]> => {
  return trackFirebaseOperation(`getUserMatches_${userId}`, async () => {
    const cacheKey = `user_matches_${userId}`;

    try {
      // Check cache first
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
      // Use a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 10000);
      });

      const queryPromise = withRetry(async () => {
        const matchesRef = collection(db, 'matches');
        const q = query(
          matchesRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(20) // Reduced limit for faster loading
        );

        return await getDocs(q);
      });

      const snapshot = await Promise.race([queryPromise, timeoutPromise]);

      const matches = snapshot.docs.map(toCachedMatch);
      // Cache the results
      setCachedData(cacheKey, matches);

      return matches;
    } catch {
      // Return cached data if available, even if stale
      const staleCache = matchesCache.get(cacheKey);
      if (staleCache) {
        return staleCache.data;
      }

      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  });
};

// Heavily optimized community matches with caching and timeout
export const getCommunityMatches = async (): Promise<(FirebaseMatch & { id: string })[]> => {
  return trackFirebaseOperation('getCommunityMatches', async () => {
    const cacheKey = 'community_matches';

    try {
      // Check cache first
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
      // Use a timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 10000);
      });

      const queryPromise = withRetry(async () => {
        const matchesRef = collection(db, 'matches');
        const q = query(
          matchesRef,
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          limit(20) // Reduced limit for faster loading
        );

        return await getDocs(q);
      });

      const snapshot = await Promise.race([queryPromise, timeoutPromise]);

      const matches = snapshot.docs.map(toCachedMatch);
      // Cache the results
      setCachedData(cacheKey, matches);

      return matches;
    } catch {
      // Return cached data if available, even if stale
      const staleCache = matchesCache.get(cacheKey);
      if (staleCache) {
        return staleCache.data;
      }

      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  });
};

// Optimized get all matches with pagination
export const getAllMatches = async (limitCount: number = 50): Promise<(FirebaseMatch & { id: string })[]> => {
  const cacheKey = `all_matches_${limitCount}`;

  try {
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    const matches = await withRetry(async () => {
      const matchesRef = collection(db, 'matches');
      const q = query(matchesRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(toCachedMatch);
    });
    // Cache the results
    setCachedData(cacheKey, matches);

    return matches;
  } catch {
    return [];
  }
};

// Clear cache function for manual cache invalidation
export const clearMatchesCache = (): void => {
  matchesCache.clear();
};

// Real-time listener for match updates (unchanged but optimized)
export const subscribeToMatch = (matchId: string, callback: (match: Match | null) => void) => {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (snapshot: DocumentSnapshot<DocumentData>) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Match);
    } else {
      callback(null);
    }
  }, () => {
    callback(null);
  });
};

// Simple test function to verify Firestore API is working
export const testFirestoreAPIEnabled = async (): Promise<{ enabled: boolean; message: string }> => {
  try {
    // Try a very simple read operation
    const testCollection = collection(db, 'test');
    const testQuery = query(testCollection, limit(1));

    await getDocs(testQuery);
    return { enabled: true, message: 'Firestore API is enabled and working!' };
  } catch (error) {
    if (getErrorCode(error) === 'permission-denied') {
      return {
        enabled: true,
        message: 'API enabled but needs security rules setup'
      };
    } else if (getErrorMessage(error, '').includes('has not been used') || getErrorMessage(error, '').includes('API')) {
      return {
        enabled: false,
        message: 'Firestore API is not enabled. Please enable it in Google Cloud Console.'
      };
    } else {
      return {
        enabled: false,
        message: `API test failed: ${getErrorMessage(error, 'Unknown error')}`
      };
    }
  }
};
