import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Match } from '../types';

// Generate unique 6-character match code
export const generateMatchCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Save new match to Firebase with user context
export const saveMatch = async (matchData: Match, userId?: string, isGuest: boolean = false): Promise<string> => {
  try {
    const matchCode = generateMatchCode();
    const matchToSave = {
      ...matchData,
      matchCode,
      userId: userId || null,
      isGuest,
      isPublic: isGuest, // Guest matches are public
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'matches'), matchToSave);
    console.log('Match saved with ID: ', docRef.id, 'Code:', matchCode);
    return matchCode;
  } catch (error) {
    console.error('Error saving match: ', error);
    throw error;
  }
};

// Save/Update match in real-time (called after every ball)
export const updateMatchRealtime = async (matchId: string, matchData: Match): Promise<void> => {
  try {
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      ...matchData,
      updatedAt: Timestamp.now()
    });
    console.log('Match updated in real-time');
  } catch (error) {
    console.error('Error updating match: ', error);
    throw error;
  }
};

// Create initial match document and return the document ID for real-time updates
export const createMatch = async (matchData: Match, userId?: string, isGuest: boolean = false): Promise<{ matchCode: string; docId: string }> => {
  try {
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
    console.log('Match created with ID: ', docRef.id, 'Code:', matchCode);
    return { matchCode, docId: docRef.id };
  } catch (error) {
    console.error('Error creating match: ', error);
    throw error;
  }
};

// Get match by code
export const getMatchByCode = async (matchCode: string): Promise<Match | null> => {
  try {
    const matchesRef = collection(db, 'matches');
    const snapshot = await getDocs(matchesRef);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.matchCode === matchCode) {
        return data as Match;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting match: ', error);
    throw error;
  }
};

// Get user's private matches
export const getUserMatches = async (userId: string): Promise<(Match & { id: string })[]> => {
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('userId', '==', userId),
      where('isGuest', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as (Match & { id: string })[];
  } catch (error) {
    console.error('Error getting user matches: ', error);
    throw error;
  }
};

// Get community matches (guest matches)
export const getCommunityMatches = async (): Promise<(Match & { id: string })[]> => {
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as (Match & { id: string })[];
  } catch (error) {
    console.error('Error getting community matches: ', error);
    throw error;
  }
};

// Get all matches (for admin/history purposes)
export const getAllMatches = async (): Promise<(Match & { id: string })[]> => {
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(matchesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    })) as (Match & { id: string })[];
  } catch (error) {
    console.error('Error getting all matches: ', error);
    throw error;
  }
};

// Real-time listener for match updates
export const subscribeToMatch = (matchId: string, callback: (match: Match | null) => void) => {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (doc: any) => {
    if (doc.exists()) {
      callback(doc.data() as Match);
    } else {
      callback(null);
    }
  });
}; 