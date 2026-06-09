import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { tenantContext } from "@/lib/tenant-context";

export async function getTenantAndUser(request: NextRequest) {
  let tenantId: string | null = null;
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const session = await getSession();
    if (session) {
      tenantId = (session.tenantId as string) || null;
      userId = (session.userId as string) || (session as any).id || null;
      userRole = (session.role as string) || null;
      if (tenantId) {
        tenantContext.enterWith({ tenantId, userId: userId || undefined });
      }
    }
  } catch (e) {}

  return { tenantId, userId, userRole };
}
