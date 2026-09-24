import "server-only";

import { assertServerActionRole } from "@/lib/api-auth-guard";
import type { DashboardCapabilities } from "../model";

import { CONTRACT_WRITER_ROLES } from "@/lib/auth/contract-access-policy";

type GuardSession = Parameters<typeof assertServerActionRole>[0];

export async function getDashboardCapabilities(
  session: unknown,
): Promise<DashboardCapabilities> {
  if (!session) return { canIssueContract: false };

  try {
    await assertServerActionRole(
      session as GuardSession,
      CONTRACT_WRITER_ROLES,
    );
    return { canIssueContract: true };
  } catch {
    return { canIssueContract: false };
  }
}
