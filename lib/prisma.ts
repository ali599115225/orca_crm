import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { tenantContext } from "@/lib/tenant-context";
import { redactPrismaArgs } from "./privacy-mask";
import {
  applyTenantIsolationToQuery,
  isTenantScopedWriteOperation,
} from "./tenant-prisma-enforcement";

function createRawPrismaClient(): PrismaClient {
  const rawUrl = (process.env.DATABASE_URL ?? "").replace(/[&?]channel_binding=require/gi, "");
  const isProduction = process.env.NODE_ENV === "production" || rawUrl.includes("neon.tech") || rawUrl.includes("sslmode=require");

  const sslConfig = isProduction
    ? { rejectUnauthorized: true }
    : false;

  const pool = new pg.Pool({
    connectionString: rawUrl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: isProduction ? 5 : 3,
    ssl: sslConfig,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const rawPrisma = global.rawPrisma ?? createRawPrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.rawPrisma = rawPrisma;
}

function createExtendedPrismaClient() {
  return rawPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const context = tenantContext.getStore() ?? null;
          const tenantId = context?.tenantId;
          const userId = context?.userId;
          const nextArgs = applyTenantIsolationToQuery(args, {
            model,
            operation,
            context,
            failClosed: true,
          });

          const result = await query(nextArgs as typeof args);

          if (
            isTenantScopedWriteOperation(operation) &&
            model !== "AuditLog" &&
            model !== "RateLimitEntry" &&
            model !== "UserFavorite" &&
            model !== "FailedLoginAttempt" &&
            tenantId
          ) {
            (async () => {
              try {
                let recordId = "unknown";
                if (result) {
                  if (typeof result === "object" && "id" in result) {
                    recordId = String((result as Record<string, unknown>).id);
                  } else if (Array.isArray(result) && result.length > 0 && "id" in result[0]) {
                    recordId = String((result[0] as Record<string, unknown>).id);
                  }
                }

                await rawPrisma.auditLog.create({
                  data: {
                    tenantId,
                    userId: userId || null,
                    action: operation.toUpperCase(),
                    tableName: model,
                    recordId,
                    details: JSON.stringify({ args: redactPrismaArgs(nextArgs) }),
                  },
                });
              } catch (e) {
                console.error("[AuditLog Error] Failed to write db action log");
              }
            })();
          }

          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>;

declare global {
  // eslint-disable-next-line no-var
  var rawPrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prisma: ExtendedPrismaClient | undefined;
}

export const prisma = global.prisma ?? createExtendedPrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
