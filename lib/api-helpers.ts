// lib/api-helpers.ts
import { NextRequest } from "next/server";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";

export async function getTenantAndUser(request: NextRequest) {
  let tenantId = request.headers.get("x-company-id");
  let userId: string | null = null;
  let userRole: string | null = null;

  try {
    const session = await getSession();
    if (session) {
      tenantId = tenantId || (session.tenantId as string);
      userId = (session.userId as string) || (session as any).id || null;
      userRole = (session.role as string) || null;
    }
  } catch (e) {}

  if (!tenantId) {
    try {
      const tenant = await getActiveTenant();
      tenantId = tenant.id;
    } catch (e) {}
  }

  return { tenantId, userId, userRole };
}
