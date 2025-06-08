import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
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

// Save match to Firebase
export const saveMatch = async (matchData: Match): Promise<string> => {
  try {
    const matchCode = generateMatchCode();
    const matchToSave = {
      ...matchData,
      matchCode,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'matches'), matchToSave);
    console.log('Match saved with ID: ', docRef.id, 'Code:', matchCode);
    return matchCode;
  } catch (error) {
    console.error('Error saving match: ', error);
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