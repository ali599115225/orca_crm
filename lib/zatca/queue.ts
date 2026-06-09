const BACKOFF_DELAYS_SECONDS = [5, 15, 45, 135, 405];

export function getNextRetryDelay(retryCount: number): number {
  if (retryCount >= BACKOFF_DELAYS_SECONDS.length) {
    return BACKOFF_DELAYS_SECONDS[BACKOFF_DELAYS_SECONDS.length - 1];
  }
  return BACKOFF_DELAYS_SECONDS[retryCount];
}

export function computeNextRetryAt(retryCount: number): Date {
  const delayMs = getNextRetryDelay(retryCount) * 1000;
  return new Date(Date.now() + delayMs);
}

export function isRetryable(status: string): boolean {
  return ['PENDING', 'RETRYING', 'FAILED'].includes(status);
}

export function isExpired(retryCount: number, maxRetries: number): boolean {
  return retryCount >= maxRetries;
}
