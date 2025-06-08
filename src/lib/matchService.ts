import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { Match, FirebaseMatch } from '../types';
import { trackFirebaseOperation, CacheTracker } from '../utils/performanceMonitor';

// Cache for connection status and data
let connectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';
let connectionTestPromise: Promise<boolean> | null = null;
let matchesCache: Map<string, { data: any[]; timestamp: number }> = new Map();
const CACHE_DURATION = 30000; // 30 seconds

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
      console.log('🔍 Testing Firestore connection...');
      
      // Use a lightweight read operation instead of scanning a collection
      // This will fail gracefully if collection doesn't exist, but tests connection
      await getDocs(query(collection(db, '_test_'), limit(1)));
      
      connectionStatus = 'connected';
      console.log('✅ Firestore connection successful');
      return true;
    } catch (error: any) {
      connectionStatus = 'failed';
      console.error('❌ Firestore connection failed:', error.code || error.message);
      
      // Don't spam console with full error details
      if (error.code !== 'permission-denied' && error.code !== 'not-found') {
        console.error('Connection error details:', error.code, error.message);  
      }
      return false;
    } finally {
      // Reset the promise after 5 seconds to allow retry
      setTimeout(() => {
        connectionTestPromise = null;
      }, 5000);
    }
  })();
  
  return connectionTestPromise;
};

// Helper function to check cache
const getCachedData = (cacheKey: string): any[] | null => {
  const cached = matchesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Using cached data for ${cacheKey}`);
    CacheTracker.recordHit();
    return cached.data;
  }
  CacheTracker.recordMiss();
  return null;
};

// Helper function to set cache
const setCachedData = (cacheKey: string, data: any[]): void => {
  matchesCache.set(cacheKey, { data, timestamp: Date.now() });
};

// Optimized save function - remove redundant connection test
export const saveMatch = async (matchData: Match, userId?: string, isGuest: boolean = false): Promise<string> => {
  try {
    console.log('💾 Saving match...', { userId, isGuest });

    const matchCode = generateMatchCode();
    const matchToSave = {
      ...matchData,
      matchCode,
      userId: userId || null,
      isGuest,
      isPublic: isGuest,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'matches'), matchToSave);
    console.log('✅ Match saved with ID: ', docRef.id, 'Code:', matchCode);
    
    // Clear relevant cache
    matchesCache.clear();
    
    return matchCode;
  } catch (error: any) {
    console.error('❌ Error saving match:', error.code || error.message);
    throw new Error(`Failed to save match: ${error.message}`);
  }
};

// Optimized real-time update
export const updateMatchRealtime = async (matchId: string, matchData: Match): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      ...matchData,
      updatedAt: Timestamp.now()
    });
    console.log('✅ Match updated in real-time');
  } catch (error: any) {
    console.error('❌ Error updating match:', error.code || error.message);
    throw new Error(`Failed to update match: ${error.message}`);
  }
};

// Optimized create match function
export const createMatch = async (matchData: Match, userId?: string, isGuest: boolean = false): Promise<{ matchCode: string; docId: string }> => {
  try {
    console.log('🆕 Creating new match...', { userId, isGuest });

    const matchCode = generateMatchCode();
    const matchToSave = {
      ...matchData,
      matchCode,
      userId: userId || null,
      isGuest,
      isPublic: isGuest,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'matches'), matchToSave);
    console.log('✅ Match created with ID: ', docRef.id, 'Code:', matchCode);
    
    // Clear cache
    matchesCache.clear();
    
    return { matchCode, docId: docRef.id };
  } catch (error: any) {
    console.error('❌ Error creating match:', error.code || error.message);
    throw new Error(`Failed to create match: ${error.message}`);
  }
};

// Optimized get match by code with better query
export const getMatchByCode = async (matchCode: string): Promise<Match | null> => {
  try {
    console.log('🔍 Getting match by code:', matchCode);
    
    // Use where query instead of scanning all documents
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, where('matchCode', '==', matchCode), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Match not found:', matchCode);
      return null;
    }
    
    const doc = snapshot.docs[0];
    console.log('✅ Match found:', matchCode);
    return doc.data() as Match;
  } catch (error: any) {
    console.error('❌ Error getting match:', error.code || error.message);
    throw new Error(`Failed to get match: ${error.message}`);
  }
};

// Heavily optimized user matches with caching
export const getUserMatches = async (userId: string): Promise<(FirebaseMatch & { id: string })[]> => {
  return trackFirebaseOperation(`getUserMatches_${userId}`, async () => {
    const cacheKey = `user_matches_${userId}`;
    
    try {
      // Check cache first
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      console.log('📊 Getting user matches for:', userId);

      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('userId', '==', userId),
        where('isGuest', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50) // Limit results for better performance
      );
      
      const snapshot = await getDocs(q);
      
      const matches = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as (FirebaseMatch & { id: string })[];
      
      console.log('✅ Found', matches.length, 'user matches');
      
      // Cache the results
      setCachedData(cacheKey, matches);
      
      return matches;
    } catch (error: any) {
      console.error('❌ Error getting user matches:', error.code || error.message);
      
      // Return cached data if available, even if stale
      const staleCache = matchesCache.get(cacheKey);
      if (staleCache) {
        console.log('📦 Returning stale cached data due to error');
        return staleCache.data;
      }
      
      return [];
    }
  });
};

// Heavily optimized community matches with caching
export const getCommunityMatches = async (): Promise<(FirebaseMatch & { id: string })[]> => {
  return trackFirebaseOperation('getCommunityMatches', async () => {
    const cacheKey = 'community_matches';
    
    try {
      // Check cache first
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      console.log('🌍 Getting community matches...');

      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(50) // Limit results for better performance
      );
      
      const snapshot = await getDocs(q);
      
      const matches = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as (FirebaseMatch & { id: string })[];
      
      console.log('✅ Found', matches.length, 'community matches');
      
      // Cache the results
      setCachedData(cacheKey, matches);
      
      return matches;
    } catch (error: any) {
      console.error('❌ Error getting community matches:', error.code || error.message);
      
      // Return cached data if available, even if stale
      const staleCache = matchesCache.get(cacheKey);
      if (staleCache) {
        console.log('📦 Returning stale cached data due to error');
        return staleCache.data;
      }
      
      return [];
    }
  });
};

// Optimized get all matches with pagination
export const getAllMatches = async (limitCount: number = 100): Promise<(FirebaseMatch & { id: string })[]> => {
  const cacheKey = `all_matches_${limitCount}`;
  
  try {
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    console.log('📋 Getting all matches...');
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    const matches = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as (FirebaseMatch & { id: string })[];
    
    console.log('✅ Found', matches.length, 'total matches');
    
    // Cache the results
    setCachedData(cacheKey, matches);
    
    return matches;
  } catch (error: any) {
    console.error('❌ Error getting all matches:', error.code || error.message);
    return [];
  }
};

// Clear cache function for manual cache invalidation
export const clearMatchesCache = (): void => {
  matchesCache.clear();
  console.log('🗑️ Matches cache cleared');
};

// Real-time listener for match updates (unchanged but optimized)
export const subscribeToMatch = (matchId: string, callback: (match: Match | null) => void) => {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (doc: any) => {
    if (doc.exists()) {
      callback(doc.data() as Match);
    } else {
      callback(null);
    }
  }, (error: any) => {
    console.error('❌ Real-time listener error:', error.code || error.message);
    callback(null);
  });
}; 