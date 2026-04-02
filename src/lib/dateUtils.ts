import type { StoredDate, TimestampLike } from '../types';

export const isTimestampLike = (value: unknown): value is TimestampLike => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof value.seconds === 'number'
  );
};

export const toDate = (value: StoredDate | undefined | null): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (isTimestampLike(value)) {
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    return new Date(value.seconds * 1000);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatStoredDate = (value: StoredDate | undefined | null): string => {
  const date = toDate(value);

  if (!date) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const toUnixSeconds = (value: StoredDate | undefined | null): number => {
  const date = toDate(value);
  return date ? Math.floor(date.getTime() / 1000) : 0;
};
