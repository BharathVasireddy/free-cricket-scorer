import type { Ball, Team } from '../types';

const isJokerPlayerId = (playerId?: string): boolean =>
  Boolean(playerId && playerId.toLowerCase().includes('joker'));

export const getTeamPlayerName = (
  team: Team | undefined,
  playerId?: string,
  jokerName?: string
): string | undefined => {
  if (!playerId) {
    return undefined;
  }

  const playerName = team?.players.find(player => player.id === playerId)?.name;
  if (playerName) {
    return playerName;
  }

  if (isJokerPlayerId(playerId) && jokerName) {
    return jokerName;
  }

  return undefined;
};

export const formatDismissal = (
  ball: Ball,
  bowlingTeam: Team | undefined,
  jokerName?: string
): string => {
  if (!ball.wicket) {
    return '';
  }

  const bowlerName = getTeamPlayerName(bowlingTeam, ball.bowlerId, jokerName);
  const fielderName = getTeamPlayerName(bowlingTeam, ball.fielderId, jokerName);

  switch (ball.wicketType) {
    case 'bowled':
      return bowlerName ? `b ${bowlerName}` : 'bowled';
    case 'caught':
      if (ball.fielderId && ball.fielderId === ball.bowlerId && bowlerName) {
        return `c & b ${bowlerName}`;
      }
      if (fielderName && bowlerName) {
        return `c ${fielderName} b ${bowlerName}`;
      }
      if (bowlerName) {
        return `caught b ${bowlerName}`;
      }
      return 'caught';
    case 'lbw':
      return bowlerName ? `lbw b ${bowlerName}` : 'lbw';
    case 'stumped':
      if (fielderName && bowlerName) {
        return `st ${fielderName} b ${bowlerName}`;
      }
      if (bowlerName) {
        return `stumped b ${bowlerName}`;
      }
      return 'stumped';
    case 'runout':
      return fielderName ? `run out (${fielderName})` : 'run out';
    case 'hitwicket':
      return 'hit wicket';
    case 'out':
    default:
      return 'out';
  }
};

export const creditsBowlerWicket = (ball: Pick<Ball, 'wicket' | 'wicketType'>): boolean =>
  ball.wicket && ball.wicketType !== 'runout';
