import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export async function authenticateRequest(request: NextRequest): Promise<{ tenantId: string; userId?: string; role?: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (sessionToken) {
      const payload = await decrypt(sessionToken);
      if (payload && payload.tenantId) return payload as any;
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await decrypt(token);
      if (payload && payload.tenantId) return payload as any;
    }
  } catch {}

  return null;
}
