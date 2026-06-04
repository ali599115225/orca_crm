// lib/prisma.ts
// Prisma 7 يتطلب adapter إلزامياً - نستخدم @prisma/adapter-pg مع timeout مناسب لـ Neon serverless
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { tenantContext } from "./tenant-context";

function createRawPrismaClient(): PrismaClient {
  // ─── تنظيف رابط قاعدة البيانات من channel_binding غير المدعوم في Neon Pooler
  const rawUrl = (process.env.DATABASE_URL ?? "").replace(/[&?]channel_binding=require/gi, "");
  const sslConfig = (process.env.NODE_ENV === "production" || rawUrl.includes("neon.tech") || rawUrl.includes("sslmode=require"))
    ? { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    : false;
  
  console.log("Prisma init - rawUrl length:", rawUrl.length, "sslConfig:", !!sslConfig);

  const pool = new pg.Pool({
    connectionString: rawUrl,
    // ⏱️ timeouts لمنع التجميد في Vercel serverless + Neon cold start
    connectionTimeoutMillis: 10000,  // أقصى 10 ثانية لإنشاء الاتصال
    idleTimeoutMillis: 10000,        // إغلاق الاتصال غير المستخدم بعد 10 ثواني
    max: 1,                          // حد أقصى اتصال واحد في serverless
    // ─── SSL: مرن في التطوير، صارم ومتوافق مع Neon في الإنتاج
    ssl: sslConfig,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Singleton للعميل الخام (بدون ملحقات أو عزل تلقائي للتنفيذ الخاص)
export const rawPrisma = global.rawPrisma ?? createRawPrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.rawPrisma = rawPrisma;
}

function createExtendedPrismaClient() {
  return rawPrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // جلب سياق المستأجر النشط من مخزن الـ Context الخاص بـ Server Action
          const context = tenantContext.getStore();
          const tenantId = context?.tenantId;
          const userId = context?.userId;

          // الجداول المعزولة التي تحتوي على حقل tenant_id
          const modelsWithTenantId = [
            "User",
            "Project",
            "Lead",
            "LeadActivity",
            "Task",
            "Ticket",
            "AgentSlot",
            "UsageMeter",
            "PayrollCommission",
            "AgentTelemetryLog",
            "AuditLog",
            "AgentLease"
          ];

          const hasTenantIsolation = tenantId && modelsWithTenantId.includes(model);

          if (hasTenantIsolation) {
            const queryArgs = args as any;
            if (!queryArgs.where && ["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy", "update", "delete", "upsert", "updateMany", "deleteMany"].includes(operation)) {
              queryArgs.where = {};
            }

            // 1. فرض العزل على استعلامات القراءة
            if (["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)) {
              queryArgs.where.tenantId = tenantId;
            }
            // 2. فرض العزل على عمليات الكتابة والتحديث والحذف
            else if (operation === "create") {
              queryArgs.data = { ...queryArgs.data, tenantId };
            } else if (operation === "update" || operation === "delete") {
              queryArgs.where.tenantId = tenantId;
            } else if (operation === "upsert") {
              queryArgs.create = { ...queryArgs.create, tenantId };
              queryArgs.update = { ...queryArgs.update, tenantId };
              queryArgs.where.tenantId = tenantId;
            } else if (operation === "createMany") {
              if (Array.isArray(queryArgs.data)) {
                queryArgs.data = queryArgs.data.map((item: any) => ({ ...item, tenantId }));
              }
            } else if (operation === "updateMany" || operation === "deleteMany") {
              queryArgs.where.tenantId = tenantId;
            }
          }

          // تنفيذ الاستعلام الأصلي
          const result = await query(args);

          // 3. كتابة سجلات التدقيق والتوقيع الرقمي للعمليات (تلقائياً وبشكل غير متزامن)
          const isWrite = ["create", "update", "delete", "upsert", "createMany", "updateMany", "deleteMany"].includes(operation);
          if (isWrite && model !== "AuditLog" && tenantId) {
            (async () => {
              try {
                let recordId = "unknown";
                if (result) {
                  if (typeof result === "object" && "id" in result) {
                    recordId = String((result as any).id);
                  } else if (Array.isArray(result) && result.length > 0 && "id" in result[0]) {
                    recordId = String(result[0].id);
                  }
                }

                // نستخدم العميل الخام لتفادي التكرار اللانهائي في الميدل وير
                await rawPrisma.auditLog.create({
                  data: {
                    tenantId,
                    userId: userId || null,
                    action: operation.toUpperCase(),
                    tableName: model,
                    recordId,
                    details: JSON.stringify({
                      args: args
                    }),
                  },
                });
              } catch (e) {
                console.error("[AuditLog Error] Failed to write db action log:", e);
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
