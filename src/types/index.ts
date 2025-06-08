export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder';
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
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'stumped' | 'runout' | 'hitwicket';
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
  currentInning: number;
  innings: Innings[];
  status: 'setup' | 'active' | 'completed';
  createdAt: Date;
  createdBy?: string;
  tossWinner?: string;
  tossChoice?: 'bat' | 'bowl';
  tossWinnerId?: string;
  tossDecision?: 'bat' | 'bowl';
  winner?: string;
  winMargin?: string;
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