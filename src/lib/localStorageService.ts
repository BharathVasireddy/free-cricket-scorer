// Local Storage fallback service for when Firestore is not available
import type { Match, FirebaseMatch } from '../types';

const LOCAL_STORAGE_KEYS = {
  MATCHES: 'cricket_scorer_matches',
  USER_MATCHES: 'cricket_scorer_user_matches',
  COMMUNITY_MATCHES: 'cricket_scorer_community_matches'
};

// Generate unique match code
const generateMatchCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Convert Match to FirebaseMatch format
const convertToFirebaseMatch = (match: Match, userId?: string, isGuest: boolean = false): FirebaseMatch => {
  return {
    ...match,
    matchCode: (match as any).matchCode || generateMatchCode(),
    userId: userId || undefined,
    isGuest,
    isPublic: isGuest,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Local Storage Match Service
export const localStorageService = {
  // Save match locally
  async saveMatch(matchData: Match, userId?: string, isGuest: boolean = false): Promise<string> {
    try {
      console.log('💾 Saving match locally...', { userId, isGuest });

      const matchCode = generateMatchCode();
      const firebaseMatch = convertToFirebaseMatch(matchData, userId, isGuest);
      firebaseMatch.matchCode = matchCode;

      // Save to general matches
      const allMatches = this.getAllMatches();
      allMatches.push({ ...firebaseMatch, id: Date.now().toString() });
      localStorage.setItem(LOCAL_STORAGE_KEYS.MATCHES, JSON.stringify(allMatches));

      // Save to user-specific matches if logged in
      if (userId && !isGuest) {
        const userMatches = this.getUserMatches(userId);
        userMatches.push({ ...firebaseMatch, id: Date.now().toString() });
        localStorage.setItem(`${LOCAL_STORAGE_KEYS.USER_MATCHES}_${userId}`, JSON.stringify(userMatches));
      }

      // Save to community matches if public
      if (isGuest || firebaseMatch.isPublic) {
        const communityMatches = this.getCommunityMatches();
        communityMatches.push({ ...firebaseMatch, id: Date.now().toString() });
        localStorage.setItem(LOCAL_STORAGE_KEYS.COMMUNITY_MATCHES, JSON.stringify(communityMatches));
      }

      console.log('✅ Match saved locally with code:', matchCode);
      return matchCode;
    } catch (error) {
      console.error('❌ Failed to save match locally:', error);
      throw error;
    }
  },

  // Create match locally
  async createMatch(matchData: Match, userId?: string, isGuest: boolean = false): Promise<{ matchCode: string; docId: string }> {
    const matchCode = await this.saveMatch(matchData, userId, isGuest);
    return { matchCode, docId: Date.now().toString() };
  },

  // Get user matches
  getUserMatches(userId: string): (FirebaseMatch & { id: string })[] {
    try {
      const stored = localStorage.getItem(`${LOCAL_STORAGE_KEYS.USER_MATCHES}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get user matches from localStorage:', error);
      return [];
    }
  },

  // Get community matches
  getCommunityMatches(): (FirebaseMatch & { id: string })[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.COMMUNITY_MATCHES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get community matches from localStorage:', error);
      return [];
    }
  },

  // Get all matches
  getAllMatches(): (FirebaseMatch & { id: string })[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.MATCHES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get all matches from localStorage:', error);
      return [];
    }
  },

  // Get match by code
  getMatchByCode(matchCode: string): Match | null {
    try {
      const allMatches = this.getAllMatches();
      const match = allMatches.find(m => m.matchCode === matchCode);
      return match || null;
    } catch (error) {
      console.error('❌ Failed to get match by code from localStorage:', error);
      return null;
    }
  },

  // Update match
  async updateMatch(matchId: string, matchData: Match): Promise<void> {
    try {
      const allMatches = this.getAllMatches();
      const index = allMatches.findIndex(m => m.id === matchId);

      if (index !== -1) {
        allMatches[index] = { ...allMatches[index], ...matchData, updatedAt: new Date() };
        localStorage.setItem(LOCAL_STORAGE_KEYS.MATCHES, JSON.stringify(allMatches));
        console.log('✅ Match updated locally');
      }
    } catch (error) {
      console.error('❌ Failed to update match locally:', error);
      throw error;
    }
  },

  // Clear all local data
  clearAllData(): void {
    Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🗑️ All local match data cleared');
  }
}; 