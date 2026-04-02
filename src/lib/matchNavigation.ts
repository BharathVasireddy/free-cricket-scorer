import type { Match } from '../types';

export const isBetweenInnings = (match: Match | null | undefined): boolean =>
  Boolean(
    match &&
    match.status !== 'completed' &&
    match.innings[0]?.isCompleted &&
    !match.innings[1]
  );

export const getMatchContinueRoute = (match: Match | null | undefined): string => {
  if (!match) {
    return '/setup';
  }

  if (match.status === 'completed') {
    return '/winner';
  }

  if (isBetweenInnings(match)) {
    return '/innings-break';
  }

  return '/live';
};
