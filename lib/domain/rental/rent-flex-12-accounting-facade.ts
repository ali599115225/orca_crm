import "server-only";

import {
  ACCOUNTING_WRITE_ROLES,
  hasDatabaseRole,
  type SessionPayload,
} from "@/lib/api-auth-guard";
import {
  authorizeW1eActor,
  W1eAuthorizationError,
} from "@/lib/auth/w1e-contract-finance-permissions";
import { runWithTenantContext } from "@/lib/tenant-context";
import { activateRentFlexDirectInvoices } from "./rent-flex-12-accounting-service";

export async function rf12ActivateDirectInvoices(
  session: unknown,
  selectionId: string,
) {
  // Reuse the current database-backed finance decision boundary to normalize
  // actor identity, then narrow again to the repository's ADMIN-only accounting
  // write role before any invoice or journal mutation.
  const actor = await authorizeW1eActor(session, "finance-case.transition");
  const accountingSession: SessionPayload = {
    tenantId: actor.tenantId,
    userId: actor.userId,
    role: "",
  };
  if (!(await hasDatabaseRole(accountingSession, ACCOUNTING_WRITE_ROLES))) {
    throw new W1eAuthorizationError("W1E_FORBIDDEN");
  }

  return await runWithTenantContext(
    { tenantId: actor.tenantId, userId: actor.userId },
    async () =>
      await activateRentFlexDirectInvoices({
        tenantId: actor.tenantId,
        selectionId,
        actorId: actor.userId,
      }),
  );
}
