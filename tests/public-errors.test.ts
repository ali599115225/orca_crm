import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorCode,
  classifyError,
  publicError,
  setPublicErrorLoggerForTest,
  statusForErrorCode,
} from '../lib/errors';

describe('Public error envelope and request id', () => {
  const logMessages: string[] = [];

  beforeEach(() => {
    logMessages.length = 0;
    setPublicErrorLoggerForTest((message) => {
      logMessages.push(message);
    });
  });

  afterEach(() => {
    setPublicErrorLoggerForTest(null);
    vi.clearAllMocks();
  });

  it('returns the safe public envelope without internal details', () => {
    const rawError = new Error(
      'PrismaClientKnownRequestError: P2002 duplicate at C:\\Users\\ali59\\Desktop\\REDC-orca-repair\\app\\api\\x\\route.ts SELECT * FROM users',
    );
    rawError.stack = 'Error\n    at C:\\Users\\ali59\\Desktop\\REDC-orca-repair\\app\\api\\x\\route.ts:10:1';

    const result = publicError(
      ErrorCode.INTERNAL_ERROR,
      'POST /internal.operation failed',
      rawError,
      'req-public-errors-1',
    );
    const publicText = JSON.stringify(result);

    expect(result.error).toEqual({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'حدث خطأ داخلي. يرجى المحاولة لاحقًا.',
      requestId: 'req-public-errors-1',
    });
    expect(result.requestId).toBe('req-public-errors-1');
    expect(publicText).not.toMatch(/Prisma|P2002|SELECT|route\.ts|C:\\|stack|internal\.operation/i);
  });

  it('correlates response request id with server log metadata', () => {
    const result = publicError(ErrorCode.FORBIDDEN, 'authorization failed', undefined, 'req-match-1');
    const logText = logMessages.join('\n');

    expect(result.error.requestId).toBe('req-match-1');
    expect(logText).toContain('requestId=req-match-1');
  });

  it('keeps required status classifications', () => {
    expect(statusForErrorCode(ErrorCode.VALIDATION_ERROR)).toBe(400);
    expect(statusForErrorCode(ErrorCode.UNAUTHORIZED)).toBe(401);
    expect(statusForErrorCode(ErrorCode.FORBIDDEN)).toBe(403);
    expect(statusForErrorCode(ErrorCode.NOT_FOUND)).toBe(404);
    expect(statusForErrorCode(ErrorCode.CONFLICT)).toBe(409);
    expect(statusForErrorCode(ErrorCode.INTERNAL_ERROR)).toBe(500);
  });

  it('classifies Prisma details to safe public codes', () => {
    expect(classifyError({ code: 'P2002' })).toBe(ErrorCode.CONFLICT);
    expect(classifyError({ code: 'P2025' })).toBe(ErrorCode.NOT_FOUND);
    expect(classifyError({ code: 'P2012' })).toBe(ErrorCode.VALIDATION_ERROR);
    expect(classifyError(new Error('database unavailable'))).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
