import { describe, expect, it } from 'vitest';
import type { Match } from '../src/types';
import { getMatchContinueRoute, isBetweenInnings } from '../src/lib/matchNavigation';

const buildMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match-1',
  teams: [
    { id: 'team1', name: 'TEAM A', players: [] },
    { id: 'team2', name: 'TEAM B', players: [] },
  ],
  overs: 2,
  playersPerTeam: 3,
  hasJoker: false,
  isSingleSide: false,
  wideRunPenalty: true,
  noBallRunPenalty: true,
  currentInning: 1,
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
  status: 'active',
  createdAt: new Date(),
  ...overrides,
});

describe('matchNavigation', () => {
  it('detects the innings break state before the chase has been created', () => {
    const match = buildMatch({
      currentInning: 2,
      innings: [
        {
          number: 1,
          battingTeamId: 'team1',
          bowlingTeamId: 'team2',
          overs: [],
          totalRuns: 10,
          totalWickets: 1,
          totalBalls: 12,
          currentBatsmanIds: 'team1_player_3',
          isCompleted: true,
        },
      ],
    });

    expect(isBetweenInnings(match)).toBe(true);
    expect(getMatchContinueRoute(match)).toBe('/innings-break');
  });

  it('keeps active matches on the live route once the chase exists', () => {
    const match = buildMatch({
      currentInning: 2,
      innings: [
        {
          number: 1,
          battingTeamId: 'team1',
          bowlingTeamId: 'team2',
          overs: [],
          totalRuns: 10,
          totalWickets: 1,
          totalBalls: 12,
          currentBatsmanIds: 'team1_player_3',
          isCompleted: true,
        },
        {
          number: 2,
          battingTeamId: 'team2',
          bowlingTeamId: 'team1',
          overs: [],
          totalRuns: 0,
          totalWickets: 0,
          totalBalls: 0,
          currentBatsmanIds: ['team2_player_1', 'team2_player_2'],
          isCompleted: false,
          target: 11,
        },
      ],
    });

    expect(isBetweenInnings(match)).toBe(false);
    expect(getMatchContinueRoute(match)).toBe('/live');
  });

  it('sends completed matches to the result route', () => {
    const match = buildMatch({ status: 'completed' });

    expect(getMatchContinueRoute(match)).toBe('/winner');
  });
});
