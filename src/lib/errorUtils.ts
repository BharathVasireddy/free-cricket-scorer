interface ErrorWithMessage {
  message: string;
}

interface ErrorWithCode {
  code: string;
}

const hasMessage = (error: unknown): error is ErrorWithMessage => {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string';
};

const hasCode = (error: unknown): error is ErrorWithCode => {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string';
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (hasMessage(error)) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};

export const getErrorCode = (error: unknown): string | null => {
  return hasCode(error) ? error.code : null;
};
