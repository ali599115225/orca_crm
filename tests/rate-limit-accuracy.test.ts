import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

// ── rateLimit unit tests ──
describe('rateLimit() — memory backend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns allowed=true on first request', async () => {
    const result = await rateLimit('test:key1', 3, 60_000, false);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('returns allowed=true until limit exhausted', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit('test:key2', 5, 60_000, false);
      if (i < 5) {
        expect(result.allowed).toBe(true);
      }
    }
  });

  it('returns allowed=false with resetIn on 6th hit when limit=5', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit('test:key3', 5, 60_000, false);
    }
    const result = await rateLimit('test:key3', 5, 60_000, false);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('resets after window expires (no refresh extension)', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit('test:key4', 5, 60_000, false);
    }
    // Blocked
    const blocked = await rateLimit('test:key4', 5, 60_000, false);
    expect(blocked.allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    // Should be allowed again
    const after = await rateLimit('test:key4', 5, 60_000, false);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(4);
  });
});

// ── 429 response structure tests ──
describe('429 response shape', () => {
  it('rateLimit returns resetIn for retryAfterSeconds', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit('429:shape', 5, 60_000, false);
    }
    const result = await rateLimit('429:shape', 5, 60_000, false);
    expect(result.allowed).toBe(false);
    expect(result.resetIn).toBeTypeOf('number');
    expect(result.resetIn).toBeGreaterThan(0);

    // Simulate retryAfterSeconds = ceil(resetIn / 1000)
    const retryAfterSeconds = Math.ceil(result.resetIn / 1000);
    expect(retryAfterSeconds).toBeGreaterThan(0);
    expect(Number.isInteger(retryAfterSeconds)).toBe(true);
  });
});

// ── Countdown logic (pure function, no React) ──
describe('Client-side countdown logic', () => {
  it('counts down from retryAfterSeconds to 0', () => {
    let countdown: number | null = 10;
    const ticks: (number | null)[] = [];

    const tick = () => {
      if (countdown === null || countdown <= 1) {
        countdown = null;
        return;
      }
      countdown -= 1;
    };

    for (let i = 0; i < 12; i++) {
      ticks.push(countdown);
      tick();
    }

    // After 10 ticks, should be null
    expect(ticks[0]).toBe(10);
    expect(ticks[9]).toBe(1);
    expect(ticks[10]).toBeNull();
    expect(ticks[11]).toBeNull();
  });

  it('does not extend cooldown on refresh (new server call gives remaining not full window)', async () => {
    // Use fake timers to control the window precisely
    vi.useFakeTimers();

    // Exhaust the 5-request limit
    for (let i = 0; i < 5; i++) {
      await rateLimit('no-extend:key', 5, 60_000, false);
    }
    const blocked = await rateLimit('no-extend:key', 5, 60_000, false);
    expect(blocked.allowed).toBe(false);

    const firstRetryAfter = Math.ceil(blocked.resetIn / 1000);
    expect(firstRetryAfter).toBeGreaterThan(0);

    // Advance 10 seconds (simulate page refresh after partial countdown)
    vi.advanceTimersByTime(10_000);

    // New server call — the remaining window shrunk, not reset
    const blockedAgain = await rateLimit('no-extend:key', 5, 60_000, false);
    expect(blockedAgain.allowed).toBe(false);

    const secondRetryAfter = Math.ceil(blockedAgain.resetIn / 1000);

    // The countdown should reflect the remaining time (≈ 50s), NOT a full 60s
    expect(secondRetryAfter).toBeLessThan(firstRetryAfter);
    expect(secondRetryAfter).toBeGreaterThan(0);

    // Advance past the original window
    vi.advanceTimersByTime(51_000);

    // Now the window has expired — should be allowed again
    const allowed = await rateLimit('no-extend:key', 5, 60_000, false);
    expect(allowed.allowed).toBe(true);

    vi.useRealTimers();
  });
});
