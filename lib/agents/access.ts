import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const AGENT_MANAGER_ROLES = ["ADMIN", "SALES_MANAGER"] as const;
export const AGENT_READ_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
  "READ_ONLY",
] as const;

export class AgentAccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AgentAccessError";
  }
}

export interface AgentAccessContext {
  tenantId: string;
  userId: string;
  role: string;
  email: string;
}

export async function requireAgentAccess(options?: {
  roles?: readonly string[];
}): Promise<AgentAccessContext> {
  const session = await getSession();
  const tenantId = String(session?.tenantId || "");
  const userId = String(session?.userId || "");
  if (!tenantId || !userId) {
    throw new AgentAccessError(
      "AGENT_UNAUTHENTICATED",
      401,
      "Authentication is required.",
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      role: true,
      email: true,
    },
  });
  if (!user) {
    throw new AgentAccessError(
      "AGENT_USER_NOT_FOUND",
      401,
      "Active tenant user was not found.",
    );
  }

  const role = String(user.role);
  if (options?.roles && !options.roles.includes(role)) {
    throw new AgentAccessError(
      "AGENT_FORBIDDEN",
      403,
      "Insufficient permission for this agent operation.",
    );
  }

  return {
    tenantId: user.tenantId,
    userId: user.id,
    role,
    email: user.email,
  };
}

export async function requirePlatformOwnerAccess() {
  const session = await getSession();
  const email = String(session?.email || "").trim().toLowerCase();
  const allowed = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!email || !allowed.includes(email)) {
    throw new AgentAccessError(
      "PLATFORM_OWNER_REQUIRED",
      403,
      "Platform owner access is required.",
    );
  }

  return {
    email,
    userId: String(session?.userId || ""),
    tenantId: String(session?.tenantId || ""),
  };
}

export function agentErrorResponse(error: unknown): {
  status: number;
  body: { success: false; code: string; error: string };
} {
  if (error instanceof AgentAccessError) {
    return {
      status: error.status,
      body: {
        success: false,
        code: error.code,
        error: error.message,
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      code: "AGENT_INTERNAL_ERROR",
      error: "Agent operation failed.",
    },
  };
}
