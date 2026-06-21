import { NextRequest } from 'next/server';
import {
  requireAuth,
  type SessionPayload,
} from '@/lib/api-auth-guard';

/**
 * Backward-compatible wrapper. New sensitive routes should import
 * requireAuth() and hasDatabaseRole() from api-auth-guard directly.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  return requireAuth(request);
}
