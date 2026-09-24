import { prisma } from "./prisma";
import { getActiveTenant } from "./tenant";
import { getSession } from "./session";
import {
isKnownAgentCode,
normalizeAgentPlan,
resolveAgentAccessSource,
} from "./agents/entitlements";
import { getDeploymentLicenseMode } from "./deployment-license";

export async function authorizeAgentAccess(agentName: string): Promise<{
authorized: boolean;
message?: string;
}> {
const startTime = Date.now();

let tenantId = "";
let userId: string | null = null;
let authorized = false;
let message = "";
let accessSource = "LOCKED";
const licenseMode = getDeploymentLicenseMode();

try {
const session = await getSession();

if (session) {
  userId = session.userId as string;
}

const tenant = await getActiveTenant();
tenantId = tenant.id;

const canonicalPlan = normalizeAgentPlan(tenant.subscriptionPlan);
const requestedAgent = String(agentName || "").trim().toUpperCase();

if (!isKnownAgentCode(requestedAgent)) {
  message = "نوع الوكيل غير مسجل في كتالوج ORCA.";
} else {
  const activeSubscription =
    licenseMode === "SAAS"
      ? await prisma.agentLease.findFirst({
          where: {
            tenantId,
            agentId: requestedAgent,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
          select: { id: true },
        })
      : null;

  accessSource = resolveAgentAccessSource({
    licenseMode,
    plan: canonicalPlan,
    agentCode: requestedAgent,
    hasActiveSubscription: Boolean(activeSubscription),
  });

  authorized = accessSource !== "LOCKED";

  if (!authorized) {
    message =
      "الوكيل غير مشمول في الباقة الحالية ولا يوجد له اشتراك نشط.";
  }

  if (
    authorized &&
    licenseMode === "SAAS" &&
    canonicalPlan === "basic" &&
    requestedAgent === "MANSOUR"
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyChatsCount = await prisma.mansourChat.count({
      where: {
        tenantId,
        createdAt: { gte: today },
      },
    });

    if (dailyChatsCount >= 10) {
      authorized = false;
      message =
        "تم الوصول إلى الحد اليومي لمحادثات منصور في الباقة الأساسية.";
    }
  }
}

} catch (error: unknown) {
authorized = false;
message =
error instanceof Error
? error.message
: "حدث خطأ أثناء فحص رخصة الوكيل.";
}

const responseTime = Date.now() - startTime;

if (tenantId) {
try {
await prisma.auditLog.create({
data: {
tenantId,
userId,
action: authorized
? "AGENT_ACCESS_GRANTED"
: "AGENT_ACCESS_DENIED",
tableName: "agent_entitlements",
recordId: agentName,
details: [
"agent=" + agentName,
"authorized=" + String(authorized),
"licenseMode=" + licenseMode,
"source=" + accessSource,
"responseTimeMs=" + String(responseTime),
"message=" + (message || "success"),
].join("; "),
},
});
} catch (auditError) {
console.error(
"Failed to write agent licensing audit log:",
auditError,
);
}
}

return {
authorized,
message: message || undefined,
};
}
