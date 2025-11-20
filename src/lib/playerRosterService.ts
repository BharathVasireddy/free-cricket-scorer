import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { SavedPlayer, PlayerRoster } from '../types';

const ROSTERS_COLLECTION = 'playerRosters';

// Get user's player roster
export const getUserRoster = async (userId: string): Promise<PlayerRoster | null> => {
    try {
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
    } catch (error) {
        console.error('Error fetching user roster:', error);
        throw error;
    }
};

// Save a new player to roster
export const savePlayerToRoster = async (userId: string, player: Omit<SavedPlayer, 'id' | 'createdAt'>): Promise<void> => {
    try {
        const roster = await getUserRoster(userId);
        const newPlayer: SavedPlayer = {
            ...player,
            id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date()
        };

        const players = roster ? [...roster.players, newPlayer] : [newPlayer];

        const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
        await setDoc(rosterRef, {
            userId,
            players,
            updatedAt: Timestamp.now()
        });

        console.log('Player saved to roster:', newPlayer.name);
    } catch (error) {
        console.error('Error saving player to roster:', error);
        throw error;
    }
};

// Update an existing player in roster
export const updatePlayerInRoster = async (
    userId: string,
    playerId: string,
    updates: Partial<Omit<SavedPlayer, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const roster = await getUserRoster(userId);
        if (!roster) {
            throw new Error('Roster not found');
        }

        const players = roster.players.map(p =>
            p.id === playerId ? { ...p, ...updates } : p
        );

        const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
        await updateDoc(rosterRef, {
            players,
            updatedAt: Timestamp.now()
        });

        console.log('Player updated in roster:', playerId);
    } catch (error) {
        console.error('Error updating player in roster:', error);
        throw error;
    }
};

// Delete a player from roster
export const deletePlayerFromRoster = async (userId: string, playerId: string): Promise<void> => {
    try {
        const roster = await getUserRoster(userId);
        if (!roster) {
            throw new Error('Roster not found');
        }

        const players = roster.players.filter(p => p.id !== playerId);

        const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
        await updateDoc(rosterRef, {
            players,
            updatedAt: Timestamp.now()
        });

        console.log('Player deleted from roster:', playerId);
    } catch (error) {
        console.error('Error deleting player from roster:', error);
        throw error;
    }
};

// Bulk save players (useful for importing from a match)
export const bulkSavePlayers = async (userId: string, playerNames: string[]): Promise<void> => {
    try {
        const roster = await getUserRoster(userId);
        const existingNames = new Set(roster?.players.map(p => p.name.toUpperCase()) || []);

        // Only add players that don't already exist
        const newPlayers: SavedPlayer[] = playerNames
            .filter(name => !existingNames.has(name.toUpperCase()))
            .map(name => ({
                id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name.toUpperCase(),
                createdAt: new Date()
            }));

        if (newPlayers.length === 0) {
            console.log('No new players to add');
            return;
        }

        const players = roster ? [...roster.players, ...newPlayers] : newPlayers;

        const rosterRef = doc(db, ROSTERS_COLLECTION, userId);
        await setDoc(rosterRef, {
            userId,
            players,
            updatedAt: Timestamp.now()
        });

        console.log(`${newPlayers.length} players added to roster`);
    } catch (error) {
        console.error('Error bulk saving players:', error);
        throw error;
    }
};
