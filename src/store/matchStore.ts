import { create } from 'zustand';
import type { MatchState, Match, Ball, Over, Innings, BatsmanStats } from '../types';
import { createMatch as createMatchFirebase, updateMatchRealtime } from '../lib/matchService';
import { getErrorMessage } from '../lib/errorUtils';
import { clearStoredActiveMatch, setStoredActiveMatch } from '../lib/activeMatchStorage';

interface MatchStore extends MatchState {
  // Firebase integration
  firebaseDocId: string | null;
  matchCode: string | null;
  lastSaveTime: Date | null;

  // Actions
  createMatch: (match: Omit<Match, 'id' | 'createdAt'>, userId: string) => Promise<void>;
  loadMatch: (match: Match) => void;
  addBall: (ball: Omit<Ball, 'overNumber' | 'ballNumber'>) => void;
  startNewOver: (bowlerId: string) => void;
  completeInnings: () => void;
  changeBatsman: (outBatsmanId: string, newBatsmanId: string) => void;
  changeBowler: (newBowlerId: string) => void;
  setTossWinner: (teamId: string, choice: 'bat' | 'bowl') => void;
  startMatchWithPlayers: (selectedBatsmen: string[], selectedBowler: string) => void;
  switchToSingleBatting: (remainingBatsmanId: string) => void;
  endInningsEarly: () => void;
  isLastManStanding: () => { isLastMan: boolean; remainingBatsmanId?: string } | null;
  checkAndAbandonMatch: () => boolean;
  undoLastBall: () => void;
  resetMatch: () => void;
  setError: (error: string | null) => void;
  saveToFirebase: () => Promise<void>;
}

const initialState: MatchState & {
  firebaseDocId: string | null;
  matchCode: string | null;
  lastSaveTime: Date | null;
} = {
  match: null,
  currentInnings: null,
  currentOver: null,
  currentBatsmen: null,
  currentBowler: null,
  isLoading: false,
  error: null,
  firebaseDocId: null,
  matchCode: null,
  lastSaveTime: null,
};

const syncActiveMatchPersistence = (match: Match | null, firebaseDocId: string | null): void => {
  if (!match || !firebaseDocId || match.status === 'completed') {
    clearStoredActiveMatch();
    return;
  }

  setStoredActiveMatch({
    matchId: firebaseDocId,
    userId: match.userId,
    updatedAt: new Date().toISOString(),
  });
};

const scheduleAutoSave = (getState: () => MatchStore): void => {
  setTimeout(() => {
    const currentState = getState();
    if (currentState.match && (currentState.firebaseDocId || currentState.match.id)) {
      void currentState.saveToFirebase();
    }
  }, 100);
};

const isJokerPlayerId = (playerId: string): boolean => playerId.toLowerCase().includes('joker');

const getActiveBatsmanIds = (
  innings: Innings,
  currentBatsmen: MatchState['currentBatsmen']
): string[] => {
  if (Array.isArray(currentBatsmen)) {
    return currentBatsmen.map(batsman => batsman.playerId);
  }

  if (currentBatsmen) {
    return [currentBatsmen.playerId];
  }

  return Array.isArray(innings.currentBatsmanIds)
    ? innings.currentBatsmanIds
    : [innings.currentBatsmanIds];
};

const getDismissedBatsmanIds = (innings: Innings): Set<string> => {
  const dismissed = new Set<string>();

  innings.overs.forEach(over => {
    over.balls.forEach(ball => {
      if (ball.wicket && ball.batsmanId) {
        dismissed.add(ball.batsmanId);
      }
    });
  });

  return dismissed;
};

const getAvailableReplacementCount = (
  match: Match,
  innings: Innings,
  currentBatsmen: MatchState['currentBatsmen']
): number => {
  const battingTeam = match.teams.find(team => team.id === innings.battingTeamId);
  const currentBatsmanIds = getActiveBatsmanIds(innings, currentBatsmen);
  const dismissedBatsmanIds = getDismissedBatsmanIds(innings);

  const availableTeamPlayers = battingTeam?.players.filter(player =>
    !currentBatsmanIds.includes(player.id) && !dismissedBatsmanIds.has(player.id)
  ).length ?? 0;

  const jokerAvailable = match.hasJoker
    && !currentBatsmanIds.some(isJokerPlayerId)
    && !Array.from(dismissedBatsmanIds).some(isJokerPlayerId)
    ? 1
    : 0;

  return availableTeamPlayers + jokerAvailable;
};

const isSingleBatterMode = (
  match: Match,
  currentBatsmen: MatchState['currentBatsmen']
): boolean => match.isSingleSide || Boolean(currentBatsmen && !Array.isArray(currentBatsmen));

const isSingleBatterInnings = (match: Match, innings: Innings): boolean =>
  match.isSingleSide || !Array.isArray(innings.currentBatsmanIds);

const getMaxWickets = (
  match: Match,
  currentBatsmen: MatchState['currentBatsmen']
): number => {
  const totalPlayersAvailable = match.playersPerTeam + (match.hasJoker ? 1 : 0);
  return isSingleBatterMode(match, currentBatsmen)
    ? totalPlayersAvailable
    : totalPlayersAvailable - 1;
};

const getWicketsRemaining = (
  match: Match,
  totalWickets: number,
  currentBatsmen: MatchState['currentBatsmen']
): number => Math.max(0, getMaxWickets(match, currentBatsmen) - totalWickets);

export const useMatchStore = create<MatchStore>((set, get) => ({
  ...initialState,

  createMatch: async (matchData, userId) => {
    set({ isLoading: true, error: null });

    try {
      const match: Match = {
        ...matchData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        userId: userId,
      };

      // Create first innings
      const firstInnings: Innings = {
        number: 1,
        battingTeamId: match.teams[0].id,
        bowlingTeamId: match.teams[1].id,
        overs: [],
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
        currentBatsmanIds: match.isSingleSide
          ? match.teams[0].players[0].id
          : [match.teams[0].players[0].id, match.teams[0].players[1].id],
        isCompleted: false,
      };

      match.innings = [firstInnings];

      // Initialize current batsmen based on single-side or standard format
      const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = match.isSingleSide
        ? {
          playerId: match.teams[0].players[0].id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        }
        : [
          {
            playerId: match.teams[0].players[0].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
          {
            playerId: match.teams[0].players[1].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
        ];

      // Save to Firebase and get document ID
      const { matchCode, docId } = await createMatchFirebase(match, userId);

      set({
        match,
        currentInnings: firstInnings,
        currentBatsmen,
        currentBowler: {
          playerId: match.teams[1].players[0].id,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          maidens: 0,
        },
        firebaseDocId: docId,
        matchCode,
        lastSaveTime: new Date(),
        isLoading: false,
        error: null,
      });

      syncActiveMatchPersistence(match, docId);
    } catch (error) {
      set({
        error: getErrorMessage(error, 'Failed to create match'),
        isLoading: false,
      });
      throw error;
    }
  },

  loadMatch: (match) => {
    // Load an existing match from Firebase (for recovery)
    const currentInnings = match.innings[match.currentInning - 1];

    // Reconstruct current batsmen state
    let currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] | null = null;

    if (currentInnings && !currentInnings.isCompleted) {
      const singleBatterInnings = isSingleBatterInnings(match, currentInnings);

      if (singleBatterInnings) {
        const batsmanId = typeof currentInnings.currentBatsmanIds === 'string'
          ? currentInnings.currentBatsmanIds
          : currentInnings.currentBatsmanIds[0];

        currentBatsmen = {
          playerId: batsmanId,
          runs: 0, // Will be calculated from balls
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        };
      } else {
        const batsmanIds = Array.isArray(currentInnings.currentBatsmanIds)
          ? currentInnings.currentBatsmanIds
          : [currentInnings.currentBatsmanIds];

        currentBatsmen = [
          {
            playerId: batsmanIds[0],
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
          {
            playerId: batsmanIds[1] || batsmanIds[0],
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
        ];
      }

      // Recalculate batsman stats from all balls
      for (const over of currentInnings.overs) {
        for (const ball of over.balls) {
          if (ball.batsmanId) {
            if (singleBatterInnings) {
              const batsman = currentBatsmen as BatsmanStats;
              if (batsman.playerId === ball.batsmanId) {
                batsman.runs += ball.runs;
                batsman.balls += (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1);
                batsman.fours += (ball.runs === 4 ? 1 : 0);
                batsman.sixes += (ball.runs === 6 ? 1 : 0);
                batsman.strikeRate = batsman.balls > 0 ? (batsman.runs / batsman.balls) * 100 : 0;
                if (ball.wicket && ball.batsmanId === batsman.playerId) {
                  batsman.isOut = true;
                  batsman.dismissalType = ball.wicketType;
                }
              }
            } else {
              const batsmen = currentBatsmen as [BatsmanStats, BatsmanStats];
              for (const batsman of batsmen) {
                if (batsman.playerId === ball.batsmanId) {
                  batsman.runs += ball.runs;
                  batsman.balls += (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1);
                  batsman.fours += (ball.runs === 4 ? 1 : 0);
                  batsman.sixes += (ball.runs === 6 ? 1 : 0);
                  batsman.strikeRate = batsman.balls > 0 ? (batsman.runs / batsman.balls) * 100 : 0;
                  if (ball.wicket && ball.batsmanId === batsman.playerId) {
                    batsman.isOut = true;
                    batsman.dismissalType = ball.wicketType;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Find current over
    const currentOver = currentInnings?.overs.find(o => !o.completed) || null;

    // Find current bowler - CRITICAL FIX: Always set currentBowler, even when currentOver is null
    let currentBowler = null;
    if (currentInnings) {
      const bowlingTeam = match.teams.find(t => t.id === currentInnings.bowlingTeamId);

      if (currentOver) {
        // Active over exists - use its bowler and calculate stats
        const bowlerId = currentOver.bowlerId;
        let balls = 0, runs = 0, wickets = 0, maidens = 0;

        // Calculate bowler stats from all overs
        currentInnings.overs.forEach(over => {
          if (over.bowlerId === bowlerId) {
            const ballsInOver = over.balls.filter(b => !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'noball')).length;
            balls += ballsInOver;
            runs += over.runs;
            wickets += over.wickets;
            if (over.runs === 0 && ballsInOver === 6) maidens++;
          }
        });

        currentBowler = {
          playerId: bowlerId,
          overs: Math.floor(balls / 6),
          balls,
          runs,
          wickets,
          economy: balls > 0 ? (runs / balls) * 6 : 0,
          maidens,
        };
      } else if (currentInnings.overs.length > 0) {
        // No active over but overs exist - use last over's bowler
        const lastOver = currentInnings.overs[currentInnings.overs.length - 1];
        const bowlerId = lastOver.bowlerId;
        let balls = 0, runs = 0, wickets = 0, maidens = 0;

        // Calculate bowler stats from all overs
        currentInnings.overs.forEach(over => {
          if (over.bowlerId === bowlerId) {
            const ballsInOver = over.balls.filter(b => !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'noball')).length;
            balls += ballsInOver;
            runs += over.runs;
            wickets += over.wickets;
            if (over.runs === 0 && ballsInOver === 6) maidens++;
          }
        });

        currentBowler = {
          playerId: bowlerId,
          overs: Math.floor(balls / 6),
          balls,
          runs,
          wickets,
          economy: balls > 0 ? (runs / balls) * 6 : 0,
          maidens,
        };
      } else if (bowlingTeam && bowlingTeam.players.length > 0) {
        // No overs yet - use first bowler from bowling team
        currentBowler = {
          playerId: bowlingTeam.players[0].id,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          maidens: 0,
        };
      }
    }

    set({
      match,
      currentInnings,
      currentOver,
      currentBatsmen,
      currentBowler,
      firebaseDocId: match.id,
      matchCode: match.matchCode ?? null,
      lastSaveTime: new Date(),
      isLoading: false,
      error: null,
    });

    syncActiveMatchPersistence(match, match.id);
  },

  addBall: (ballData) => {
    const state = get();
    if (!state.match || !state.currentInnings || !state.currentBatsmen) return;

    const currentOver = state.currentOver || {
      number: state.currentInnings.overs.length + 1,
      bowlerId: state.currentBowler!.playerId,
      balls: [],
      runs: 0,
      wickets: 0,
      completed: false,
    };

    const ball: Ball = {
      ...ballData,
      overNumber: currentOver.number,
      ballNumber: currentOver.balls.length + 1,
    };

    // Update over
    const updatedOver: Over = {
      ...currentOver,
      balls: [...currentOver.balls, ball],
      runs: currentOver.runs + ball.runs + (ball.extras?.runs || 0),
      wickets: currentOver.wickets + (ball.wicket ? 1 : 0),
    };

    // Check if over is completed (6 legal balls)
    const legalBalls = updatedOver.balls.filter(b => !b.extras || (b.extras.type !== 'wide' && b.extras.type !== 'noball'));
    if (legalBalls.length >= 6) {
      updatedOver.completed = true;
    }

    // Update innings
    let updatedInnings: Innings = {
      ...state.currentInnings,
      overs: state.currentInnings.overs.map(o =>
        o.number === updatedOver.number ? updatedOver : o
      ),
      totalRuns: state.currentInnings.totalRuns + ball.runs + (ball.extras?.runs || 0),
      totalWickets: state.currentInnings.totalWickets + (ball.wicket ? 1 : 0),
      totalBalls: state.currentInnings.totalBalls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1),
    };

    // If this is a new over, add it to innings
    if (!state.currentInnings.overs.find(o => o.number === updatedOver.number)) {
      updatedInnings.overs.push(updatedOver);
    }

    // Update batsman stats
    const singleBatterMode = isSingleBatterMode(state.match, state.currentBatsmen);

    let updatedBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = singleBatterMode
      ? (() => {
        const batsman = state.currentBatsmen as BatsmanStats;
        if (batsman.playerId === ball.batsmanId) {
          const newRuns = batsman.runs + ball.runs;
          const newBalls = batsman.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1);
          return {
            ...batsman,
            runs: newRuns,
            balls: newBalls,
            fours: batsman.fours + (ball.runs === 4 ? 1 : 0),
            sixes: batsman.sixes + (ball.runs === 6 ? 1 : 0),
            strikeRate: newBalls > 0 ? (newRuns / newBalls) * 100 : 0,
            isOut: ball.wicket && ball.batsmanId === batsman.playerId,
            dismissalType: ball.wicket && ball.batsmanId === batsman.playerId ? ball.wicketType : batsman.dismissalType,
          };
        }
        return batsman;
      })()
      : (state.currentBatsmen as [BatsmanStats, BatsmanStats]).map(batsman => {
        if (batsman.playerId === ball.batsmanId) {
          const newRuns = batsman.runs + ball.runs;
          const newBalls = batsman.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1);
          return {
            ...batsman,
            runs: newRuns,
            balls: newBalls,
            fours: batsman.fours + (ball.runs === 4 ? 1 : 0),
            sixes: batsman.sixes + (ball.runs === 6 ? 1 : 0),
            strikeRate: newBalls > 0 ? (newRuns / newBalls) * 100 : 0,
            isOut: ball.wicket && ball.batsmanId === batsman.playerId,
            dismissalType: ball.wicket && ball.batsmanId === batsman.playerId ? ball.wicketType : batsman.dismissalType,
          };
        }
        return batsman;
      }) as [BatsmanStats, BatsmanStats];

    // Automatic strike rotation after over completion (for standard batting only)
    if (!isSingleBatterMode(state.match, updatedBatsmen) && updatedOver.completed) {
      // Switch the strike (reverse the batsmen order)
      updatedBatsmen = [
        (updatedBatsmen as [BatsmanStats, BatsmanStats])[1],
        (updatedBatsmen as [BatsmanStats, BatsmanStats])[0]
      ];

      // Update innings currentBatsmanIds to reflect the new strike order
      updatedInnings = {
        ...updatedInnings,
        currentBatsmanIds: [
          (updatedBatsmen as [BatsmanStats, BatsmanStats])[0].playerId,
          (updatedBatsmen as [BatsmanStats, BatsmanStats])[1].playerId
        ]
      };
    }

    // Update bowler stats
    const updatedBowler = {
      ...state.currentBowler!,
      balls: state.currentBowler!.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1),
      runs: state.currentBowler!.runs + ball.runs + (ball.extras?.runs || 0),
      wickets: state.currentBowler!.wickets + (ball.wicket ? 1 : 0),
      overs: Math.floor((state.currentBowler!.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1)) / 6),
      economy: (state.currentBowler!.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1)) > 0
        ? ((state.currentBowler!.runs + ball.runs + (ball.extras?.runs || 0)) / (state.currentBowler!.balls + (ball.extras?.type === 'wide' || ball.extras?.type === 'noball' ? 0 : 1))) * 6
        : 0,
    };

    const remainingCurrentBatsmen = Array.isArray(updatedBatsmen)
      ? updatedBatsmen.filter(batsman => !batsman.isOut).length
      : updatedBatsmen.isOut ? 0 : 1;
    const availableReplacementCount = getAvailableReplacementCount(state.match, updatedInnings, updatedBatsmen);
    const shouldPauseForLastManDecision =
      !isSingleBatterMode(state.match, updatedBatsmen) &&
      remainingCurrentBatsmen === 1 &&
      availableReplacementCount === 0;
    const maxWickets = getMaxWickets(state.match, updatedBatsmen);

    const shouldEndInnings =
      (!shouldPauseForLastManDecision && updatedInnings.totalWickets >= maxWickets) || // All out
      updatedInnings.totalBalls >= state.match.overs * 6 || // Overs completed
      (updatedInnings.target && updatedInnings.totalRuns >= updatedInnings.target); // Target achieved

    // Calculate winner if match is ending
    let winner = state.match.winner;
    let winMargin = state.match.winMargin;

    if (shouldEndInnings) {
      updatedInnings.isCompleted = true;

      // If match is completing (2nd innings ending), calculate winner
      if (state.match.currentInning === 2) {
        const firstInnings = state.match.innings[0];
        const secondInnings = updatedInnings;

        if (secondInnings.totalRuns > firstInnings.totalRuns) {
          // Second batting team won
          const winningTeam = state.match.teams.find(t => t.id === secondInnings.battingTeamId);
          const wicketsRemaining = getWicketsRemaining(state.match, secondInnings.totalWickets, updatedBatsmen);
          winner = winningTeam?.name || 'Unknown Team';
          winMargin = `${wicketsRemaining} wickets`;
        } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
          // First batting team won
          const winningTeam = state.match.teams.find(t => t.id === firstInnings.battingTeamId);
          const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
          winner = winningTeam?.name || 'Unknown Team';
          winMargin = `${runMargin} runs`;
        } else {
          // Match tied
          winner = 'Match Tied';
          winMargin = '';
        }
      }
    }

    set({
      currentInnings: updatedInnings,
      currentOver: updatedOver.completed ? null : updatedOver,
      currentBatsmen: updatedBatsmen,
      currentBowler: updatedBowler,
      match: {
        ...state.match,
        innings: state.match.innings.map(i =>
          i.number === updatedInnings.number ? updatedInnings : i
        ),
        status: shouldEndInnings && state.match.currentInning === 2 ? 'completed' : state.match.status,
        currentInning: shouldEndInnings && state.match.currentInning === 1 ? 2 : state.match.currentInning,
        winner,
        winMargin,
      },
    });

    const currentState = get();
    syncActiveMatchPersistence(currentState.match, currentState.firebaseDocId);

    // First innings completed - let UI handle innings break and player selection
    if (shouldEndInnings && state.match.currentInning === 1) {
      // Don't auto-create second innings - let user go through innings break and player selection
      // The second innings will be created when players are selected
    }

    // Auto-save to Firebase after every ball
    scheduleAutoSave(get);
  },

  startNewOver: (bowlerId) => {
    const state = get();
    if (!state.currentInnings || !state.match) return;

    const newOver: Over = {
      number: state.currentInnings.overs.length + 1,
      bowlerId,
      balls: [],
      runs: 0,
      wickets: 0,
      completed: false,
    };

    const existingOpenOver = state.currentInnings.overs.find(over => !over.completed);
    const updatedInnings: Innings = existingOpenOver && existingOpenOver.balls.length === 0
      ? {
        ...state.currentInnings,
        overs: state.currentInnings.overs.map(over =>
          over.number === existingOpenOver.number ? newOver : over
        ),
      }
      : {
        ...state.currentInnings,
        overs: [...state.currentInnings.overs, newOver],
      };

    const updatedMatch: Match = {
      ...state.match,
      innings: state.match.innings.map(innings =>
        innings.number === updatedInnings.number ? updatedInnings : innings
      ),
    };

    set({
      match: updatedMatch,
      currentInnings: updatedInnings,
      currentOver: newOver,
      currentBowler: {
        playerId: bowlerId,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      },
    });

    syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
    scheduleAutoSave(get);
  },

  completeInnings: () => {
    const state = get();
    if (!state.match || !state.currentInnings) return;
    const updatedInnings = {
      ...state.currentInnings,
      isCompleted: true,
    };

    // If this is the first innings, start second innings
    if (state.currentInnings.number === 1) {
      const secondInnings: Innings = {
        number: 2,
        battingTeamId: state.currentInnings.bowlingTeamId,
        bowlingTeamId: state.currentInnings.battingTeamId,
        overs: [],
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
        currentBatsmanIds: state.match.isSingleSide
          ? state.match.teams[1].players[0].id
          : [state.match.teams[1].players[0].id, state.match.teams[1].players[1].id],
        isCompleted: false,
        target: updatedInnings.totalRuns + 1,
      };

      const updatedMatch = {
        ...state.match,
        currentInning: 2,
        innings: [updatedInnings, secondInnings],
      };

      const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
        ? {
          playerId: state.match.teams[1].players[0].id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        }
        : [
          {
            playerId: state.match.teams[1].players[0].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
          {
            playerId: state.match.teams[1].players[1].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
        ];

      set({
        match: updatedMatch,
        currentInnings: secondInnings,
        currentOver: null,
        currentBatsmen,
      });

      syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
      scheduleAutoSave(get);
    } else {
      // Match completed - Calculate winner and margin
      const firstInnings = state.match.innings[0];
      const secondInnings = updatedInnings;
      let winner = '';
      let winMargin = '';

      if (secondInnings.totalRuns > firstInnings.totalRuns) {
        // Second batting team won
        const winningTeam = state.match.teams.find(t => t.id === secondInnings.battingTeamId);
        const wicketsRemaining = getWicketsRemaining(state.match, secondInnings.totalWickets, state.currentBatsmen);
        winner = winningTeam?.name || 'Unknown Team';
        winMargin = `${wicketsRemaining} wickets`;
      } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
        // First batting team won
        const winningTeam = state.match.teams.find(t => t.id === firstInnings.battingTeamId);
        const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
        winner = winningTeam?.name || 'Unknown Team';
        winMargin = `${runMargin} runs`;
      } else {
        // Match tied
        winner = 'Match Tied';
        winMargin = '';
      }
      set({
        match: {
          ...state.match,
          status: 'completed',
          winner,
          winMargin,
          innings: state.match.innings.map(i =>
            i.number === updatedInnings.number ? updatedInnings : i
          ),
        },
        currentInnings: updatedInnings,
      });

      const currentState = get();
      syncActiveMatchPersistence(currentState.match, currentState.firebaseDocId);
      scheduleAutoSave(get);
    }
  },

  changeBatsman: (outBatsmanId, newBatsmanId) => {
    const state = get();
    if (!state.currentBatsmen || !state.currentInnings || !state.match) return;

    if (isSingleBatterMode(state.match, state.currentBatsmen)) {
      // For single-side, just replace the single batsman
      const updatedInnings = {
        ...state.currentInnings,
        currentBatsmanIds: newBatsmanId,
      };

      set({
        currentBatsmen: {
          playerId: newBatsmanId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        },
        currentInnings: updatedInnings,
        match: {
          ...state.match,
          innings: state.match.innings.map(innings =>
            innings.number === updatedInnings.number ? updatedInnings : innings
          ),
        },
      });
    } else {
      // For standard batting, replace the specific batsman in the pair
      const updatedBatsmen = (state.currentBatsmen as [BatsmanStats, BatsmanStats]).map(batsman =>
        batsman.playerId === outBatsmanId
          ? {
            playerId: newBatsmanId,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          }
          : batsman
      ) as [BatsmanStats, BatsmanStats];

      const updatedInnings = {
        ...state.currentInnings,
        currentBatsmanIds: updatedBatsmen.map(batsman => batsman.playerId) as [string, string],
      };

      set({
        currentBatsmen: updatedBatsmen,
        currentInnings: updatedInnings,
        match: {
          ...state.match,
          innings: state.match.innings.map(innings =>
            innings.number === updatedInnings.number ? updatedInnings : innings
          ),
        },
      });
    }

    const currentState = get();
    syncActiveMatchPersistence(currentState.match, currentState.firebaseDocId);
    scheduleAutoSave(get);
  },

  changeBowler: (newBowlerId) => {
    const state = get();
    if (!state.currentInnings || !state.match) return;

    // Calculate the bowler's stats from all balls they've bowled in this innings
    const bowlerStats = {
      playerId: newBowlerId,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      economy: 0,
      maidens: 0,
    };

    // Go through all overs and count balls bowled by this bowler
    state.currentInnings.overs.forEach(over => {
      if (over.bowlerId === newBowlerId) {
        over.balls.forEach(ball => {
          // Count legal balls (not wides or no-balls)
          const isLegalBall = !ball.extras || (ball.extras.type !== 'wide' && ball.extras.type !== 'noball');
          if (isLegalBall) {
            bowlerStats.balls++;
          }

          // Add runs (including extras)
          bowlerStats.runs += ball.runs + (ball.extras?.runs || 0);

          // Count wickets
          if (ball.wicket) {
            bowlerStats.wickets++;
          }
        });
      }
    });

    // Calculate overs and economy
    bowlerStats.overs = Math.floor(bowlerStats.balls / 6);
    bowlerStats.economy = bowlerStats.balls > 0
      ? (bowlerStats.runs / bowlerStats.balls) * 6
      : 0;

    const openOverFromInnings = state.currentInnings.overs.find(over => !over.completed) ?? null;
    const pendingOver = openOverFromInnings || state.currentOver;
    let updatedInnings = state.currentInnings;
    let updatedMatch = state.match;
    let updatedCurrentOver = state.currentOver;

    if (!pendingOver || pendingOver.completed) {
      const nextOver: Over = {
        number: state.currentInnings.overs.length + 1,
        bowlerId: newBowlerId,
        balls: [],
        runs: 0,
        wickets: 0,
        completed: false,
      };

      updatedInnings = {
        ...state.currentInnings,
        overs: [...state.currentInnings.overs, nextOver],
      };
      updatedMatch = {
        ...state.match,
        innings: state.match.innings.map(innings =>
          innings.number === updatedInnings.number ? updatedInnings : innings
        ),
      };
      updatedCurrentOver = nextOver;
    } else if (pendingOver.balls.length === 0 && pendingOver.bowlerId !== newBowlerId) {
      const nextOver: Over = {
        ...pendingOver,
        bowlerId: newBowlerId,
      };

      updatedInnings = {
        ...state.currentInnings,
        overs: state.currentInnings.overs.map(over =>
          over.number === pendingOver.number ? nextOver : over
        ),
      };
      updatedMatch = {
        ...state.match,
        innings: state.match.innings.map(innings =>
          innings.number === updatedInnings.number ? updatedInnings : innings
        ),
      };
      updatedCurrentOver = nextOver;
    }

    set({
      match: updatedMatch,
      currentInnings: updatedInnings,
      currentOver: updatedCurrentOver,
      currentBowler: bowlerStats,
    });

    syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
    scheduleAutoSave(get);
  },

  setTossWinner: (teamId, choice) => {
    const state = get();
    if (!state.match) return;

    // Determine which team bats first based on toss result
    const tossWinnerTeam = state.match.teams.find(t => t.id === teamId);
    const otherTeam = state.match.teams.find(t => t.id !== teamId);

    if (!tossWinnerTeam || !otherTeam) return;

    const battingTeamId = choice === 'bat' ? teamId : otherTeam.id;
    const bowlingTeamId = choice === 'bat' ? otherTeam.id : teamId;

    // Update the first innings with correct team order based on toss
    const updatedMatch = {
      ...state.match,
      tossWinner: tossWinnerTeam.name,
      tossWinnerId: teamId,
      tossChoice: choice,
    };

    const updatedInnings: Innings = {
      ...state.currentInnings!,
      battingTeamId,
      bowlingTeamId,
      currentBatsmanIds: state.match.isSingleSide
        ? state.match.teams.find(t => t.id === battingTeamId)!.players[0].id
        : [
          state.match.teams.find(t => t.id === battingTeamId)!.players[0].id,
          state.match.teams.find(t => t.id === battingTeamId)!.players[1].id
        ],
    };

    updatedMatch.innings = [updatedInnings];

    // Set up current batsmen for the batting team
    const battingTeam = state.match.teams.find(t => t.id === battingTeamId)!;
    const bowlingTeam = state.match.teams.find(t => t.id === bowlingTeamId)!;

    const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
      ? {
        playerId: battingTeam.players[0].id,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      }
      : [
        {
          playerId: battingTeam.players[0].id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        },
        {
          playerId: battingTeam.players[1].id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        },
      ];

    set({
      match: updatedMatch,
      currentInnings: updatedInnings,
      currentBatsmen,
      currentBowler: {
        playerId: bowlingTeam.players[0].id,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      },
    });

    syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
    scheduleAutoSave(get);
  },

  startMatchWithPlayers: (selectedBatsmen, selectedBowler) => {
    const state = get();
    if (!state.match || !state.currentInnings) return;
    // Check if we need to create the second innings
    const isStartingSecondInnings = state.currentInnings.isCompleted && state.currentInnings.number === 1;

    if (isStartingSecondInnings) {
      // Create the second innings
      const firstInnings = state.currentInnings;
      const secondInnings: Innings = {
        number: 2,
        battingTeamId: firstInnings.bowlingTeamId,
        bowlingTeamId: firstInnings.battingTeamId,
        overs: [],
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
        currentBatsmanIds: state.match.isSingleSide
          ? selectedBatsmen[0]
          : [selectedBatsmen[0], selectedBatsmen[1]] as [string, string],
        isCompleted: false,
        target: firstInnings.totalRuns + 1,
      };

      const updatedMatch = {
        ...state.match,
        currentInning: 2,
        innings: [firstInnings, secondInnings],
      };

      const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
        ? {
          playerId: selectedBatsmen[0],
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        }
        : [
          {
            playerId: selectedBatsmen[0],
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
          {
            playerId: selectedBatsmen[1],
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
        ];

      set({
        match: updatedMatch,
        currentInnings: secondInnings,
        currentBatsmen,
        currentOver: null,
        currentBowler: {
          playerId: selectedBowler,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
          maidens: 0,
        },
      });
      syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
      scheduleAutoSave(get);
      return;
    }

    // Handle first innings or existing second innings
    const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
      ? {
        playerId: selectedBatsmen[0],
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
      }
      : [
        {
          playerId: selectedBatsmen[0],
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        },
        {
          playerId: selectedBatsmen[1],
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        },
      ];

    // Update the innings with selected batsmen - ENSURE isCompleted is false
    const updatedInnings = {
      ...state.currentInnings,
      currentBatsmanIds: state.match.isSingleSide
        ? selectedBatsmen[0]
        : [selectedBatsmen[0], selectedBatsmen[1]],
      isCompleted: false, // Explicitly set to false to ensure the innings is active
      // Reset innings stats for second innings if needed
      ...(state.currentInnings.number === 2 ? {
        overs: [],
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
      } : {})
    };
    // Update the match with the new innings - handle both first and second innings
    const updatedMatch = {
      ...state.match,
      status: 'active' as const,
      innings: state.match.innings.map(i =>
        i.number === updatedInnings.number ? updatedInnings : i
      ),
    };

    set({
      match: updatedMatch,
      currentInnings: updatedInnings,
      currentBatsmen,
      currentOver: null, // Reset current over for new innings
      currentBowler: {
        playerId: selectedBowler,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      },
    });

    syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
    scheduleAutoSave(get);
  },

  switchToSingleBatting: (remainingBatsmanId) => {
    const state = get();
    if (!state.match || !state.currentInnings || !state.currentBatsmen) return;

    // Find the remaining batsman's current stats
    const currentBatsmenArray = state.currentBatsmen as [BatsmanStats, BatsmanStats];
    const remainingBatsman = currentBatsmenArray.find(b => b.playerId === remainingBatsmanId && !b.isOut);

    if (!remainingBatsman) return;

    // Convert to single batsman mode
    const updatedInnings = {
      ...state.currentInnings,
      currentBatsmanIds: remainingBatsmanId,
    };

    // Update the match to reflect single batting mode for this innings
    const updatedMatch = {
      ...state.match,
      innings: state.match.innings.map(i =>
        i.number === updatedInnings.number ? updatedInnings : i
      ),
    };

    set({
      match: updatedMatch,
      currentInnings: updatedInnings,
      currentBatsmen: remainingBatsman, // Single batsman stats
    });

    syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
    scheduleAutoSave(get);
  },

  endInningsEarly: () => {
    const state = get();
    if (!state.match || !state.currentInnings) return;

    const updatedInnings = {
      ...state.currentInnings,
      isCompleted: true,
    };

    // If this is the first innings, start second innings
    if (state.currentInnings.number === 1) {
      const secondInnings: Innings = {
        number: 2,
        battingTeamId: state.currentInnings.bowlingTeamId,
        bowlingTeamId: state.currentInnings.battingTeamId,
        overs: [],
        totalRuns: 0,
        totalWickets: 0,
        totalBalls: 0,
        currentBatsmanIds: state.match.isSingleSide
          ? state.match.teams[1].players[0].id
          : [state.match.teams[1].players[0].id, state.match.teams[1].players[1].id],
        isCompleted: false,
        target: updatedInnings.totalRuns + 1,
      };

      const updatedMatch = {
        ...state.match,
        currentInning: 2,
        innings: [updatedInnings, secondInnings],
      };

      const currentBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
        ? {
          playerId: state.match.teams[1].players[0].id,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        }
        : [
          {
            playerId: state.match.teams[1].players[0].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
          {
            playerId: state.match.teams[1].players[1].id,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
          },
        ];

      set({
        match: updatedMatch,
        currentInnings: secondInnings,
        currentOver: null,
        currentBatsmen,
      });

      syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
      scheduleAutoSave(get);
    } else {
      // Match completed - Calculate winner and margin
      const firstInnings = state.match.innings[0];
      const secondInnings = updatedInnings;

      let winner = '';
      let winMargin = '';

      if (secondInnings.totalRuns > firstInnings.totalRuns) {
        // Second batting team won
        const winningTeam = state.match.teams.find(t => t.id === secondInnings.battingTeamId);
        const wicketsRemaining = getWicketsRemaining(state.match, secondInnings.totalWickets, state.currentBatsmen);
        winner = winningTeam?.name || 'Unknown Team';
        winMargin = `${wicketsRemaining} wickets`;
      } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
        // First batting team won
        const winningTeam = state.match.teams.find(t => t.id === firstInnings.battingTeamId);
        const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
        winner = winningTeam?.name || 'Unknown Team';
        winMargin = `${runMargin} runs`;
      } else {
        // Match tied
        winner = 'Match Tied';
        winMargin = '';
      }
      set({
        match: {
          ...state.match,
          status: 'completed',
          winner,
          winMargin,
          innings: state.match.innings.map(i =>
            i.number === updatedInnings.number ? updatedInnings : i
          ),
        },
        currentInnings: updatedInnings,
      });

      const currentState = get();
      syncActiveMatchPersistence(currentState.match, currentState.firebaseDocId);
      scheduleAutoSave(get);
    }
  },

  isLastManStanding: () => {
    const state = get();
    if (!state.match || !state.currentInnings || !state.currentBatsmen) return null;

    // Only check for last man standing if it's NOT already a single-side match
    if (isSingleBatterMode(state.match, state.currentBatsmen) || !Array.isArray(state.currentBatsmen)) return null;

    const remainingBatsmen = state.currentBatsmen.filter(b => !b.isOut);
    const availableReplacementCount = getAvailableReplacementCount(state.match, state.currentInnings, state.currentBatsmen);

    if (remainingBatsmen.length === 1 && availableReplacementCount === 0) {
      return { isLastMan: true, remainingBatsmanId: remainingBatsmen[0].playerId };
    }

    return { isLastMan: false };
  },

  resetMatch: () => {
    clearStoredActiveMatch();
    set(initialState);
  },

  setError: (error) => {
    set({ error });
  },

  checkAndAbandonMatch: () => {
    const state = get();
    if (!state.match || !state.currentInnings) return false;

    const now = Date.now();
    const lastSaveTime = state.lastSaveTime?.getTime() || now;
    const timeSinceLastSave = now - lastSaveTime;

    // If more than 30 minutes since last activity, mark as abandoned
    if (timeSinceLastSave > 30 * 60 * 1000) {
      const updatedMatch: Match = {
        ...state.match,
        status: 'completed',
        winner: 'Match Abandoned',
        winMargin: '',
      };

      set({
        match: updatedMatch,
      });

      syncActiveMatchPersistence(updatedMatch, state.firebaseDocId);
      scheduleAutoSave(get);
      return true;
    }

    return false;
  },

  undoLastBall: () => {
    const state = get();
    if (!state.match || !state.currentInnings) return;

    // Get the current over
    const currentOver = state.currentInnings.overs[state.currentInnings.overs.length - 1];
    if (!currentOver || currentOver.balls.length === 0) {      return;
    }

    // Get the last ball
    const lastBall = currentOver.balls[currentOver.balls.length - 1];

    // Remove the last ball from the over
    const updatedBalls = currentOver.balls.slice(0, -1);
    const updatedOver: Over = {
      ...currentOver,
      balls: updatedBalls,
      runs: currentOver.runs - lastBall.runs - (lastBall.extras?.runs || 0),
      wickets: currentOver.wickets - (lastBall.wicket ? 1 : 0),
      completed: false,
    };

    // Update innings totals
    const isLegalBall = !lastBall.extras || (lastBall.extras.type !== 'wide' && lastBall.extras.type !== 'noball');
    const updatedInnings: Innings = {
      ...state.currentInnings,
      overs: state.currentInnings.overs.map(o =>
        o.number === updatedOver.number ? updatedOver : o
      ),
      totalRuns: state.currentInnings.totalRuns - lastBall.runs - (lastBall.extras?.runs || 0),
      totalWickets: state.currentInnings.totalWickets - (lastBall.wicket ? 1 : 0),
      totalBalls: state.currentInnings.totalBalls - (isLegalBall ? 1 : 0),
      isCompleted: false,
    };

    // Recalculate batsman stats
    let updatedBatsmen = state.currentBatsmen;
    if (lastBall.batsmanId) {
      if (isSingleBatterMode(state.match, state.currentBatsmen)) {
        const batsman = state.currentBatsmen as BatsmanStats;
        if (batsman.playerId === lastBall.batsmanId) {
          updatedBatsmen = {
            ...batsman,
            runs: batsman.runs - lastBall.runs,
            balls: batsman.balls - (isLegalBall ? 1 : 0),
            fours: batsman.fours - (lastBall.runs === 4 ? 1 : 0),
            sixes: batsman.sixes - (lastBall.runs === 6 ? 1 : 0),
            strikeRate: (batsman.balls - (isLegalBall ? 1 : 0)) > 0
              ? ((batsman.runs - lastBall.runs) / (batsman.balls - (isLegalBall ? 1 : 0))) * 100
              : 0,
            isOut: false,
          };
        }
      } else {
        updatedBatsmen = (state.currentBatsmen as [BatsmanStats, BatsmanStats]).map(batsman => {
          if (batsman.playerId === lastBall.batsmanId) {
            return {
              ...batsman,
              runs: batsman.runs - lastBall.runs,
              balls: batsman.balls - (isLegalBall ? 1 : 0),
              fours: batsman.fours - (lastBall.runs === 4 ? 1 : 0),
              sixes: batsman.sixes - (lastBall.runs === 6 ? 1 : 0),
              strikeRate: (batsman.balls - (isLegalBall ? 1 : 0)) > 0
                ? ((batsman.runs - lastBall.runs) / (batsman.balls - (isLegalBall ? 1 : 0))) * 100
                : 0,
              isOut: false,
            };
          }
          return batsman;
        }) as [BatsmanStats, BatsmanStats];
      }
    }

    // Recalculate bowler stats
    const updatedBowler = {
      ...state.currentBowler!,
      balls: state.currentBowler!.balls - (isLegalBall ? 1 : 0),
      runs: state.currentBowler!.runs - lastBall.runs - (lastBall.extras?.runs || 0),
      wickets: state.currentBowler!.wickets - (lastBall.wicket ? 1 : 0),
      overs: Math.floor((state.currentBowler!.balls - (isLegalBall ? 1 : 0)) / 6),
      economy: (state.currentBowler!.balls - (isLegalBall ? 1 : 0)) > 0
        ? ((state.currentBowler!.runs - lastBall.runs - (lastBall.extras?.runs || 0)) / (state.currentBowler!.balls - (isLegalBall ? 1 : 0))) * 6
        : 0,
    };

    set({
      currentInnings: updatedInnings,
      currentOver: updatedBalls.length > 0 ? updatedOver : null,
      currentBatsmen: updatedBatsmen,
      currentBowler: updatedBowler,
      match: {
        ...state.match,
        innings: state.match.innings.map(i =>
          i.number === updatedInnings.number ? updatedInnings : i
        ),
        status: 'active',
      },
    });

    const currentState = get();
    syncActiveMatchPersistence(currentState.match, currentState.firebaseDocId);
    scheduleAutoSave(get);
  },

  saveToFirebase: async () => {
    const state = get();
    if (!state.match) return;

    const matchId = state.firebaseDocId ?? state.match.id;
    if (!matchId) return;

    try {
      await updateMatchRealtime(matchId, state.match);
      set({ firebaseDocId: matchId, lastSaveTime: new Date() });
      syncActiveMatchPersistence(state.match, matchId);
    } catch {
      set({ error: 'Failed to save match - will retry' });
    }
  },
}));
