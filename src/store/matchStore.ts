import { create } from 'zustand';
import type { MatchState, Match, Ball, Over, Innings, BatsmanStats } from '../types';
import { createMatch as createMatchFirebase, updateMatchRealtime } from '../lib/matchService';

interface MatchStore extends MatchState {
  // Firebase integration
  firebaseDocId: string | null;
  matchCode: string | null;
  lastSaveTime: Date | null;
  
  // Actions
  createMatch: (match: Omit<Match, 'id' | 'createdAt'>, userId?: string, isGuest?: boolean) => Promise<void>;
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

export const useMatchStore = create<MatchStore>((set, get) => ({
  ...initialState,

  createMatch: async (matchData, userId, isGuest = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const match: Match = {
        ...matchData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
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
    const { matchCode, docId } = await createMatchFirebase(match, userId, isGuest);

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
  } catch (error: any) {
    console.error('Error creating match:', error);
    set({
      error: error.message || 'Failed to create match',
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
      if (match.isSingleSide) {
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
            if (match.isSingleSide) {
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
    
    // Find current bowler
    let currentBowler = null;
    if (currentOver) {
      currentBowler = {
        playerId: currentOver.bowlerId,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      };
    }

    set({
      match,
      currentInnings,
      currentOver,
      currentBatsmen,
      currentBowler,
      isLoading: false,
      error: null,
    });
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
    let updatedBatsmen: BatsmanStats | [BatsmanStats, BatsmanStats] = state.match.isSingleSide
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
    if (!state.match.isSingleSide && updatedOver.completed) {
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

    // Check if innings should end
    // Calculate total wickets available based on players + joker
    const totalPlayersAvailable = state.match.playersPerTeam + (state.match.hasJoker ? 1 : 0);
    const maxWickets = state.match.isSingleSide 
      ? totalPlayersAvailable  // Single-side: all players can bat
      : totalPlayersAvailable - 1; // Standard: need one batsman left (not out)
    
    const shouldEndInnings = 
      updatedInnings.totalWickets >= maxWickets || // All out
      updatedInnings.totalBalls >= state.match.overs * 6 || // Overs completed
      (updatedInnings.target && updatedInnings.totalRuns >= updatedInnings.target); // Target achieved

    if (shouldEndInnings) {
      updatedInnings.isCompleted = true;
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
      },
    });

    // First innings completed - let UI handle innings break and player selection
    if (shouldEndInnings && state.match.currentInning === 1) {
      // Don't auto-create second innings - let user go through innings break and player selection
      // The second innings will be created when players are selected
    }

    // Auto-save to Firebase after every ball
    setTimeout(() => {
      const currentState = get();
      if (currentState.firebaseDocId) {
        currentState.saveToFirebase();
      }
    }, 100); // Small delay to ensure state is updated
  },

  startNewOver: (bowlerId) => {
    const state = get();
    if (!state.currentInnings) return;

    const newOver: Over = {
      number: state.currentInnings.overs.length + 1,
      bowlerId,
      balls: [],
      runs: 0,
      wickets: 0,
      completed: false,
    };

    set({
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
  },

  completeInnings: () => {
    const state = get();
    if (!state.match || !state.currentInnings) return;
    
    console.log('completeInnings called:', { 
      inningsNumber: state.currentInnings.number,
      isCompleted: state.currentInnings.isCompleted,
      totalRuns: state.currentInnings.totalRuns,
      totalWickets: state.currentInnings.totalWickets
    });

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
    } else {
      // Match completed - Calculate winner and margin
      const firstInnings = state.match.innings[0];
      const secondInnings = updatedInnings;
      
      let winner = '';
      let winMargin = '';
      
      if (secondInnings.totalRuns > firstInnings.totalRuns) {
        // Second batting team won
        const winningTeam = state.match.teams.find(t => t.id === secondInnings.battingTeamId);
        const totalPlayersAvailable = state.match.playersPerTeam + (state.match.hasJoker ? 1 : 0);
        const maxPossibleWickets = state.match.isSingleSide 
          ? totalPlayersAvailable  // Single-side: all players can bat
          : totalPlayersAvailable - 1; // Standard: need one batsman left
        const wicketsRemaining = maxPossibleWickets - secondInnings.totalWickets;
        winner = winningTeam?.name || '';
        winMargin = `${wicketsRemaining} wickets`;
      } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
        // First batting team won
        const winningTeam = state.match.teams.find(t => t.id === firstInnings.battingTeamId);
        const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
        winner = winningTeam?.name || '';
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
    }
  },

  changeBatsman: (outBatsmanId, newBatsmanId) => {
    const state = get();
    if (!state.currentBatsmen || !state.match) return;

    if (state.match.isSingleSide) {
      // For single-side, just replace the single batsman
      set({
        currentBatsmen: {
          playerId: newBatsmanId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        }
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

      set({ currentBatsmen: updatedBatsmen });
    }
  },

  changeBowler: (newBowlerId) => {
    set({
      currentBowler: {
        playerId: newBowlerId,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        maidens: 0,
      },
      currentOver: null,
    });
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
  },

  startMatchWithPlayers: (selectedBatsmen, selectedBowler) => {
    const state = get();
    if (!state.match || !state.currentInnings) return;

    console.log('startMatchWithPlayers called:', { 
      inningsNumber: state.currentInnings.number,
      currentIsCompleted: state.currentInnings.isCompleted,
      selectedBatsmen,
      selectedBowler,
      matchCurrentInning: state.match.currentInning
    });

    // Check if we need to create the second innings
    const isStartingSecondInnings = state.currentInnings.isCompleted && state.currentInnings.number === 1;
    
    if (isStartingSecondInnings) {
      console.log('Creating second innings...');
      
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

      console.log('Second innings created:', {
        number: secondInnings.number,
        target: secondInnings.target,
        battingTeamId: secondInnings.battingTeamId
      });
      
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

    console.log('Updated innings after startMatchWithPlayers:', {
      number: updatedInnings.number,
      isCompleted: updatedInnings.isCompleted,
      totalRuns: updatedInnings.totalRuns,
      totalWickets: updatedInnings.totalWickets
    });

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
    } else {
      // Match completed - Calculate winner and margin
      const firstInnings = state.match.innings[0];
      const secondInnings = updatedInnings;
      
      let winner = '';
      let winMargin = '';
      
      if (secondInnings.totalRuns > firstInnings.totalRuns) {
        // Second batting team won
        const winningTeam = state.match.teams.find(t => t.id === secondInnings.battingTeamId);
        const wicketsRemaining = state.match.playersPerTeam - secondInnings.totalWickets - 1;
        winner = winningTeam?.name || '';
        winMargin = `${wicketsRemaining} wickets`;
      } else if (firstInnings.totalRuns > secondInnings.totalRuns) {
        // First batting team won
        const winningTeam = state.match.teams.find(t => t.id === firstInnings.battingTeamId);
        const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
        winner = winningTeam?.name || '';
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
    }
  },

  isLastManStanding: () => {
    const state = get();
    if (!state.match || !state.currentInnings || !state.currentBatsmen) return null;

    // Only check for last man standing if it's NOT already a single-side match
    if (state.match.isSingleSide) return null;

    const currentBatsmen = state.currentBatsmen as [BatsmanStats, BatsmanStats];
    const remainingBatsmen = currentBatsmen.filter(b => !b.isOut);
    
    if (remainingBatsmen.length === 1) {
      return { isLastMan: true, remainingBatsmanId: remainingBatsmen[0].playerId };
    }

    return { isLastMan: false };
  },

  resetMatch: () => {
    set(initialState);
  },

  setError: (error) => {
    set({ error });
  },

  saveToFirebase: async () => {
    const state = get();
    if (!state.match || !state.firebaseDocId) return;

    try {
      await updateMatchRealtime(state.firebaseDocId, state.match);
      set({ lastSaveTime: new Date() });
      console.log('Match saved to Firebase at:', new Date().toISOString());
    } catch (error: any) {
      console.error('Failed to save match to Firebase:', error);
      set({ error: 'Failed to save match - will retry' });
    }
  },
})); 