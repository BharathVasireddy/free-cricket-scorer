import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { SavedPlayer, PlayerRoster } from '../types';

const ROSTERS_COLLECTION = 'playerRosters';

const sanitizeFirestoreData = <T>(data: T): T => {
    if (Array.isArray(data)) {
        return data
            .map(item => sanitizeFirestoreData(item))
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

        acc[key] = sanitizeFirestoreData(value);
        return acc;
    }, {});

    return sanitized as T;
};

// Get user's player roster
export const getUserRoster = async (userId: string): Promise<PlayerRoster | null> => {
    const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
    const rosterSnap = await getDoc(rosterRef);

    if (!rosterSnap.exists()) {
        return null;
    }

    const data = rosterSnap.data();
    return {
        userId,
        players: data.players || [],
        updatedAt: data.updatedAt?.toDate() || new Date()
    };
};

// Save a new player to roster
export const savePlayerToRoster = async (userId: string, player: Omit<SavedPlayer, 'id' | 'createdAt'>): Promise<void> => {
    const roster = await getUserRoster(userId);
    const newPlayer: SavedPlayer = {
        ...player,
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        createdAt: new Date()
    };

    const players = roster ? [...roster.players, newPlayer] : [newPlayer];

    const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
    await setDoc(rosterRef, sanitizeFirestoreData({
        userId,
        players,
        updatedAt: Timestamp.now()
    }));
};

// Update an existing player in roster
export const updatePlayerInRoster = async (
    userId: string,
    playerId: string,
    updates: Partial<Omit<SavedPlayer, 'id' | 'createdAt'>>
): Promise<void> => {
    const roster = await getUserRoster(userId);
    if (!roster) {
        throw new Error('Roster not found');
    }

    const players = roster.players.map(p =>
        p.id === playerId ? { ...p, ...updates } : p
    );

    const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
    await updateDoc(rosterRef, sanitizeFirestoreData({
        players,
        updatedAt: Timestamp.now()
    }));
};

// Delete a player from roster
export const deletePlayerFromRoster = async (userId: string, playerId: string): Promise<void> => {
    const roster = await getUserRoster(userId);
    if (!roster) {
        throw new Error('Roster not found');
    }

    const players = roster.players.filter(p => p.id !== playerId);

    const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
    await updateDoc(rosterRef, sanitizeFirestoreData({
        players,
        updatedAt: Timestamp.now()
    }));
};

// Bulk save players (useful for importing from a match)
export const bulkSavePlayers = async (userId: string, playerNames: string[]): Promise<void> => {
    const roster = await getUserRoster(userId);
    const existingNames = new Set(roster?.players.map(p => p.name.toUpperCase()) || []);

    // Only add players that don't already exist
    const newPlayers: SavedPlayer[] = playerNames
        .filter(name => !existingNames.has(name.toUpperCase()))
        .map(name => ({
            id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            name: name.toUpperCase(),
            createdAt: new Date()
        }));

    if (newPlayers.length === 0) {
        return;
    }

    const players = roster ? [...roster.players, ...newPlayers] : newPlayers;

    const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
    await setDoc(rosterRef, sanitizeFirestoreData({
        userId,
        players,
        updatedAt: Timestamp.now()
    }));
};
