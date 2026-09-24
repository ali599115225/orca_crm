import { headers } from "next/headers";
import { getSession } from "./session";
import { cache } from "react";
import { setTenantContext } from "@/lib/tenant-context";
import { isPrivilegedSessionPayload } from "./platform-identity";
import {
  tenantResolutionFindActiveById,
  tenantResolutionFindActiveBySubdomain,
  tenantResolutionFindFirstActive,
} from "./system-prisma-boundary";

export type TenantResolutionCode =
  | "TENANT_SESSION_NOT_FOUND"
  | "TENANT_SESSION_INACTIVE"
  | "TENANT_HOST_NOT_FOUND"
  | "TENANT_PRIVILEGED_FALLBACK_NOT_FOUND"
  | "TENANT_RESOLVED_FROM_SESSION"
  | "TENANT_RESOLVED_FROM_HOST"
  | "TENANT_RESOLVED_FROM_PRIVILEGED_FALLBACK";

export class TenantResolutionError extends Error {
  constructor(readonly code: TenantResolutionCode) {
    super(code);
    this.name = "TenantResolutionError";
  }
}

function logTenantResolution(code: TenantResolutionCode): void {
  console.info("[TenantDiagnostics]", { code });
}

function sessionUserId(session: Record<string, unknown> | null): string | undefined {
  return typeof session?.userId === "string" ? session.userId : undefined;
}

export const getActiveTenant = cache(
  async function getActiveTenantInternal(hostOverride?: string) {
    const session = await getSession();
    const privileged = isPrivilegedSessionPayload(session);

    if (session?.tenantId) {
      const tenant = await tenantResolutionFindActiveById(
        session.tenantId as string,
      );

      if (tenant) {
        logTenantResolution("TENANT_RESOLVED_FROM_SESSION");
        setTenantContext({
          tenantId: tenant.id,
          userId: sessionUserId(session),
        });

        return tenant;
      }

      logTenantResolution("TENANT_SESSION_INACTIVE");
      if (!privileged) {
        throw new TenantResolutionError("TENANT_SESSION_INACTIVE");
      }
    } else if (session) {
      logTenantResolution("TENANT_SESSION_NOT_FOUND");
      if (!privileged) {
        throw new TenantResolutionError("TENANT_SESSION_NOT_FOUND");
      }
    }

    let host = hostOverride || "";

    if (!host) {
      try {
        const headersList = await headers();
        host = headersList.get("host") || "";
      } catch {
        host = "";
      }
    }

    const domainParts = host.split(".");
    let subdomain = "dar-al-amar";

    if (domainParts.length > 2) {
      subdomain = domainParts[0];
    }

    let tenant =
      await tenantResolutionFindActiveBySubdomain(subdomain);

    if (tenant) {
      logTenantResolution("TENANT_RESOLVED_FROM_HOST");
    }

    if (!tenant && privileged) {
      tenant = await tenantResolutionFindFirstActive();
      if (tenant) {
        logTenantResolution("TENANT_RESOLVED_FROM_PRIVILEGED_FALLBACK");
      } else {
        logTenantResolution("TENANT_PRIVILEGED_FALLBACK_NOT_FOUND");
      }
    }

    if (!tenant) {
      if (!privileged) {
        logTenantResolution("TENANT_HOST_NOT_FOUND");
      }

      throw new TenantResolutionError(
        privileged
          ? "TENANT_PRIVILEGED_FALLBACK_NOT_FOUND"
          : "TENANT_HOST_NOT_FOUND",
      );
    }

    if (sessionUserId(session)) {
      setTenantContext({
        tenantId: tenant.id,
        userId: sessionUserId(session),
      });
    }

    return tenant;
  },
);
