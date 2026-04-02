export type PlayerRole = 'batsman' | 'bowler' | 'allrounder';
export type WicketType = 'out' | 'bowled' | 'caught' | 'lbw' | 'stumped' | 'runout' | 'hitwicket';

export interface TimestampLike {
  seconds: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

export type StoredDate = Date | string | TimestampLike;

export interface Player {
  id: string;
  name: string;
  role?: PlayerRole;
  phoneNumber?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface Ball {
  runs: number;
  extras: { type: 'wide' | 'noball' | 'bye' | 'legbye'; runs: number } | null;
  wicket: boolean;
  wicketType?: WicketType;
  fielderId?: string;
  batsmanId?: string;
  bowlerId: string;
  overNumber: number;
  ballNumber: number;
}

export interface Over {
  number: number;
  bowlerId: string;
  balls: Ball[];
  runs: number;
  wickets: number;
  completed: boolean;
}

export interface Innings {
  number: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  overs: Over[];
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  currentBatsmanIds: string | string[]; // Single string for single-side, array for standard
  isCompleted: boolean;
  target?: number;
}

export interface Match {
  id: string;
  teams: Team[];
  overs: number;
  playersPerTeam: number;
  hasJoker: boolean;
  jokerName?: string;
  isSingleSide: boolean;
  wideRunPenalty: boolean;  // Whether wide balls include +1 run penalty (default: true)
  noBallRunPenalty: boolean; // Whether no-balls include +1 run penalty (default: true)
  currentInning: number;
  innings: Innings[];
  status: 'setup' | 'active' | 'completed';
  createdAt: StoredDate;
  createdBy?: string;
  tossWinner?: string;
  tossChoice?: 'bat' | 'bowl';
  tossWinnerId?: string;
  tossDecision?: 'bat' | 'bowl';
  winner?: string;
  winMargin?: string;
  userId?: string;
  matchCode?: string;
}

// Extended type for Firebase stored matches
export interface FirebaseMatch extends Match {
  userId?: string;
  isGuest?: boolean;
  isPublic?: boolean;
  updatedAt?: StoredDate;
  format?: string;
}

export interface BatsmanStats {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: string;
}

export interface BowlerStats {
  playerId: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  economy: number;
  maidens: number;
}

export interface MatchState {
  match: Match | null;
  currentInnings: Innings | null;
  currentOver: Over | null;
  currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] | null; // Single for single-side, pair for standard
  currentBowler: BowlerStats | null;
  isLoading: boolean;
  error: string | null;
}

// Player Roster Management
export interface SavedPlayer {
  id: string;
  name: string;
  phoneNumber?: string;
  role?: PlayerRole;
  createdAt: StoredDate;
}

export interface PlayerRoster {
  userId: string;
  players: SavedPlayer[];
  updatedAt: StoredDate;
}
