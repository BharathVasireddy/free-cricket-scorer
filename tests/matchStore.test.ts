import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatsmanStats, Innings, Match } from '../src/types';

vi.mock('../src/lib/matchService', () => ({
  createMatch: vi.fn(async (match: Match) => ({
    matchCode: 'MATCH01',
    docId: match.id,
  })),
  updateMatchRealtime: vi.fn(async () => undefined),
}));

import { useMatchStore } from '../src/store/matchStore';
import { updateMatchRealtime } from '../src/lib/matchService';

const buildMatchInput = ({
  overs = 2,
  playersPerTeam = 4,
  hasJoker = false,
  isSingleSide = false,
}: {
  overs?: number;
  playersPerTeam?: number;
  hasJoker?: boolean;
  isSingleSide?: boolean;
}) => ({
  teams: [
    {
      id: 'team1',
      name: 'TEAM A',
      players: Array.from({ length: playersPerTeam }, (_, index) => ({
        id: `team1_player_${index + 1}`,
        name: `TEAM A PLAYER ${index + 1}`,
        role: 'allrounder' as const,
      })),
    },
    {
      id: 'team2',
      name: 'TEAM B',
      players: Array.from({ length: playersPerTeam }, (_, index) => ({
        id: `team2_player_${index + 1}`,
        name: `TEAM B PLAYER ${index + 1}`,
        role: 'allrounder' as const,
      })),
    },
  ],
  overs,
  playersPerTeam,
  hasJoker,
  jokerName: hasJoker ? 'THE JOKER' : undefined,
  isSingleSide,
  wideRunPenalty: true,
  noBallRunPenalty: true,
  currentInning: 1,
  innings: [],
  status: 'active' as const,
});

const createMatch = async (options?: Parameters<typeof buildMatchInput>[0]) => {
  await useMatchStore.getState().createMatch(buildMatchInput(options ?? {}), 'user-1');
};

const dismissBatsman = (batsmanId: string) => {
  const bowlerId = useMatchStore.getState().currentBowler!.playerId;
  useMatchStore.getState().addBall({
    runs: 0,
    extras: null,
    wicket: true,
    wicketType: 'bowled',
    batsmanId,
    bowlerId,
  });
};

const scoreLegalBall = (runs = 0) => {
  const state = useMatchStore.getState();
  const batsmanId = Array.isArray(state.currentBatsmen)
    ? state.currentBatsmen[0].playerId
    : state.currentBatsmen!.playerId;

  useMatchStore.getState().addBall({
    runs,
    extras: null,
    wicket: false,
    batsmanId,
    bowlerId: state.currentBowler!.playerId,
  });
};

const switchToLastManState = async () => {
  await createMatch({ playersPerTeam: 3, isSingleSide: false });

  dismissBatsman('team1_player_1');
  useMatchStore.getState().changeBatsman('team1_player_1', 'team1_player_3');
  dismissBatsman('team1_player_2');
  useMatchStore.getState().switchToSingleBatting('team1_player_3');

  return useMatchStore.getState().currentBowler!.playerId;
};

const makeBatsmanStats = (playerId: string, overrides: Partial<BatsmanStats> = {}): BatsmanStats => ({
  playerId,
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  strikeRate: 0,
  isOut: false,
  ...overrides,
});

beforeEach(() => {
  useMatchStore.getState().resetMatch();
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  useMatchStore.getState().resetMatch();
});

describe('matchStore edge cases', () => {
  it('updates innings batter ids when replacing a batter in standard batting', async () => {
    await createMatch({ playersPerTeam: 4, isSingleSide: false });

    useMatchStore.getState().changeBatsman('team1_player_1', 'team1_player_3');

    const state = useMatchStore.getState();

    expect(Array.isArray(state.currentBatsmen)).toBe(true);
    expect((state.currentBatsmen as BatsmanStats[]).map(batsman => batsman.playerId)).toEqual([
      'team1_player_3',
      'team1_player_2',
    ]);
    expect(state.currentInnings?.currentBatsmanIds).toEqual(['team1_player_3', 'team1_player_2']);
    expect(state.match?.innings[0].currentBatsmanIds).toEqual(['team1_player_3', 'team1_player_2']);
  });

  it('updates innings batter id when replacing a batter in single-side mode', async () => {
    await createMatch({ playersPerTeam: 3, isSingleSide: true });

    useMatchStore.getState().changeBatsman('team1_player_1', 'team1_player_2');

    const state = useMatchStore.getState();

    expect(state.currentBatsmen).toMatchObject({ playerId: 'team1_player_2' });
    expect(state.currentInnings?.currentBatsmanIds).toBe('team1_player_2');
    expect(state.match?.innings[0].currentBatsmanIds).toBe('team1_player_2');
  });

  it('does not report last man standing while replacement players are still available', async () => {
    await createMatch({ playersPerTeam: 4, isSingleSide: false });

    dismissBatsman('team1_player_1');

    const state = useMatchStore.getState();

    expect(state.currentInnings?.isCompleted).toBe(false);
    expect(state.isLastManStanding()).toEqual({ isLastMan: false });
  });

  it('keeps the innings active when one batter remains and no replacements are left', async () => {
    await createMatch({ playersPerTeam: 3, isSingleSide: false });

    dismissBatsman('team1_player_1');
    useMatchStore.getState().changeBatsman('team1_player_1', 'team1_player_3');
    dismissBatsman('team1_player_2');

    const state = useMatchStore.getState();

    expect(state.currentInnings?.isCompleted).toBe(false);
    expect(state.match?.status).toBe('active');
    expect(state.isLastManStanding()).toEqual({
      isLastMan: true,
      remainingBatsmanId: 'team1_player_3',
    });
  });

  it('treats an unused joker as an available replacement before last-man mode', async () => {
    await createMatch({ playersPerTeam: 3, hasJoker: true, isSingleSide: false });

    dismissBatsman('team1_player_1');
    useMatchStore.getState().changeBatsman('team1_player_1', 'team1_player_3');
    dismissBatsman('team1_player_2');

    let state = useMatchStore.getState();
    expect(state.currentInnings?.isCompleted).toBe(false);
    expect(state.isLastManStanding()).toEqual({ isLastMan: false });

    useMatchStore.getState().changeBatsman('team1_player_2', 'joker-team1');
    dismissBatsman('joker-team1');

    state = useMatchStore.getState();
    expect(state.currentInnings?.isCompleted).toBe(false);
    expect(state.isLastManStanding()).toEqual({
      isLastMan: true,
      remainingBatsmanId: 'team1_player_3',
    });
  });

  it('counts the joker when calculating wickets remaining after ending the chase early', async () => {
    await createMatch({ playersPerTeam: 3, hasJoker: true, isSingleSide: false });

    const state = useMatchStore.getState();
    const firstInnings: Innings = {
      ...state.match!.innings[0],
      isCompleted: true,
      totalRuns: 10,
      totalWickets: 2,
      totalBalls: 12,
    };
    const secondInnings: Innings = {
      number: 2,
      battingTeamId: 'team2',
      bowlingTeamId: 'team1',
      overs: [],
      totalRuns: 11,
      totalWickets: 3,
      totalBalls: 10,
      currentBatsmanIds: 'team2_player_3',
      isCompleted: false,
      target: 11,
    };

    useMatchStore.setState({
      match: {
        ...state.match!,
        currentInning: 2,
        innings: [firstInnings, secondInnings],
        status: 'active',
      },
      currentInnings: secondInnings,
      currentOver: null,
      currentBatsmen: makeBatsmanStats('team2_player_3'),
      currentBowler: {
        playerId: 'team1_player_1',
        overs: 1,
        balls: 6,
        runs: 11,
        wickets: 3,
        economy: 11,
        maidens: 0,
      },
    });

    useMatchStore.getState().endInningsEarly();

    const updatedState = useMatchStore.getState();
    expect(updatedState.match?.status).toBe('completed');
    expect(updatedState.match?.winner).toBe('TEAM B');
    expect(updatedState.match?.winMargin).toBe('1 wickets');
  });

  it('continues scoring correctly after switching to single batting in a standard match', async () => {
    const bowlerId = await switchToLastManState();

    expect(() => {
      useMatchStore.getState().addBall({
        runs: 4,
        extras: null,
        wicket: false,
        batsmanId: 'team1_player_3',
        bowlerId,
      });
    }).not.toThrow();

    const state = useMatchStore.getState();

    expect(Array.isArray(state.currentBatsmen)).toBe(false);
    expect(state.currentBatsmen).toMatchObject({
      playerId: 'team1_player_3',
      runs: 4,
      balls: 1,
    });
    expect(state.currentInnings?.totalRuns).toBe(4);
    expect(state.currentInnings?.totalBalls).toBe(3);
  });

  it('undoes the latest ball correctly after switching to single batting in a standard match', async () => {
    const bowlerId = await switchToLastManState();

    useMatchStore.getState().addBall({
      runs: 2,
      extras: null,
      wicket: false,
      batsmanId: 'team1_player_3',
      bowlerId,
    });

    expect(() => {
      useMatchStore.getState().undoLastBall();
    }).not.toThrow();

    const state = useMatchStore.getState();

    expect(state.currentBatsmen).toMatchObject({
      playerId: 'team1_player_3',
      runs: 0,
      balls: 0,
    });
    expect(state.currentInnings?.totalRuns).toBe(0);
    expect(state.currentInnings?.totalBalls).toBe(2);
    expect(state.currentInnings?.totalWickets).toBe(2);
  });

  it('restores single-batter recovery state when reloading a standard match', () => {
    const loadedMatch: Match = {
      ...buildMatchInput({ playersPerTeam: 3, isSingleSide: false }),
      id: 'match-1',
      createdAt: new Date(),
      userId: 'user-1',
      innings: [
        {
          number: 1,
          battingTeamId: 'team1',
          bowlingTeamId: 'team2',
          overs: [
            {
              number: 1,
              bowlerId: 'team2_player_1',
              balls: [
                {
                  runs: 0,
                  extras: null,
                  wicket: true,
                  wicketType: 'bowled',
                  batsmanId: 'team1_player_1',
                  bowlerId: 'team2_player_1',
                  overNumber: 1,
                  ballNumber: 1,
                },
                {
                  runs: 0,
                  extras: null,
                  wicket: true,
                  wicketType: 'bowled',
                  batsmanId: 'team1_player_2',
                  bowlerId: 'team2_player_1',
                  overNumber: 1,
                  ballNumber: 2,
                },
                {
                  runs: 2,
                  extras: null,
                  wicket: false,
                  batsmanId: 'team1_player_3',
                  bowlerId: 'team2_player_1',
                  overNumber: 1,
                  ballNumber: 3,
                },
              ],
              runs: 2,
              wickets: 2,
              completed: false,
            },
          ],
          totalRuns: 2,
          totalWickets: 2,
          totalBalls: 3,
          currentBatsmanIds: 'team1_player_3',
          isCompleted: false,
        },
      ],
    };

    useMatchStore.getState().loadMatch(loadedMatch);

    const state = useMatchStore.getState();

    expect(Array.isArray(state.currentBatsmen)).toBe(false);
    expect(state.currentBatsmen).toMatchObject({
      playerId: 'team1_player_3',
      runs: 2,
      balls: 1,
      isOut: false,
    });
  });

  it('restores the firestore document id when loading a saved match so future saves continue working', async () => {
    const loadedMatch: Match = {
      ...buildMatchInput({ playersPerTeam: 3, isSingleSide: false }),
      id: 'match-firestore-1',
      createdAt: new Date(),
      userId: 'user-1',
      matchCode: 'MATCH01',
      innings: [
        {
          number: 1,
          battingTeamId: 'team1',
          bowlingTeamId: 'team2',
          overs: [],
          totalRuns: 0,
          totalWickets: 0,
          totalBalls: 0,
          currentBatsmanIds: ['team1_player_1', 'team1_player_2'],
          isCompleted: false,
        },
      ],
    };

    useMatchStore.getState().loadMatch(loadedMatch);
    await useMatchStore.getState().saveToFirebase();

    expect(useMatchStore.getState().firebaseDocId).toBe('match-firestore-1');
    expect(vi.mocked(updateMatchRealtime)).toHaveBeenCalledWith(
      'match-firestore-1',
      expect.objectContaining({ id: 'match-firestore-1' })
    );
  });

  it('persists the next selected bowler as a pending over for refresh recovery', async () => {
    await createMatch({ playersPerTeam: 3, isSingleSide: false });

    for (let ball = 0; ball < 6; ball += 1) {
      scoreLegalBall();
    }

    useMatchStore.getState().changeBowler('team2_player_2');

    const state = useMatchStore.getState();
    const pendingOver = state.currentInnings?.overs[state.currentInnings.overs.length - 1];

    expect(state.currentOver).toMatchObject({
      number: 2,
      bowlerId: 'team2_player_2',
      balls: [],
      completed: false,
    });
    expect(pendingOver).toMatchObject({
      number: 2,
      bowlerId: 'team2_player_2',
      balls: [],
      completed: false,
    });
    expect(state.match?.innings[0].overs[state.match.innings[0].overs.length - 1]).toMatchObject({
      number: 2,
      bowlerId: 'team2_player_2',
      balls: [],
      completed: false,
    });
  });
});
