import { describe, expect, it } from 'vitest';
import type { Ball, Team } from '../src/types';
import { creditsBowlerWicket, formatDismissal } from '../src/lib/dismissalUtils';

const bowlingTeam: Team = {
  id: 'team2',
  name: 'TEAM B',
  players: [
    { id: 'team2_player_1', name: 'Bowler One', role: 'allrounder' },
    { id: 'team2_player_2', name: 'Fielder Two', role: 'allrounder' },
  ],
};

const buildWicketBall = (overrides: Partial<Ball> = {}): Ball => ({
  runs: 0,
  extras: null,
  wicket: true,
  wicketType: 'caught',
  batsmanId: 'team1_player_1',
  bowlerId: 'team2_player_1',
  overNumber: 1,
  ballNumber: 1,
  ...overrides,
});

describe('formatDismissal', () => {
  it('formats caught dismissals with fielder and bowler names', () => {
    const dismissal = formatDismissal(
      buildWicketBall({ fielderId: 'team2_player_2' }),
      bowlingTeam
    );

    expect(dismissal).toBe('c Fielder Two b Bowler One');
  });

  it('formats caught and bowled dismissals when the bowler is also the catcher', () => {
    const dismissal = formatDismissal(
      buildWicketBall({ fielderId: 'team2_player_1' }),
      bowlingTeam
    );

    expect(dismissal).toBe('c & b Bowler One');
  });

  it('falls back to bowler notation for bowled dismissals', () => {
    const dismissal = formatDismissal(
      buildWicketBall({ wicketType: 'bowled' }),
      bowlingTeam
    );

    expect(dismissal).toBe('b Bowler One');
  });

  it('formats run out dismissals with the selected fielder', () => {
    const dismissal = formatDismissal(
      buildWicketBall({ wicketType: 'runout', fielderId: 'team2_player_2' }),
      bowlingTeam
    );

    expect(dismissal).toBe('run out (Fielder Two)');
  });

  it('formats stumped dismissals with the selected fielder and bowler', () => {
    const dismissal = formatDismissal(
      buildWicketBall({ wicketType: 'stumped', fielderId: 'team2_player_2' }),
      bowlingTeam
    );

    expect(dismissal).toBe('st Fielder Two b Bowler One');
  });

  it('does not credit the bowler with a wicket for run outs', () => {
    expect(creditsBowlerWicket(buildWicketBall({ wicketType: 'runout' }))).toBe(false);
    expect(creditsBowlerWicket(buildWicketBall({ wicketType: 'caught' }))).toBe(true);
  });
});
