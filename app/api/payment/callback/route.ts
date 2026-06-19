// R2 FIXED: Session auth + replay protection + verified invoice metadata
import { NextRequest, NextResponse } from "next/server";
import { handleSuccessfulPaymentInternal } from "@/lib/server/internal";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY || "";

export async function GET(request: NextRequest) {
  const session = await authenticateRequest(request);
  if (!session) {
    const fallbackUrl = new URL("/login", request.url);
    return NextResponse.redirect(fallbackUrl);
  }

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("id");
  const status = searchParams.get("status");

  const fallbackUrl = new URL("/operations", request.url);
  fallbackUrl.searchParams.set("tab", "settings");

  if (!invoiceId || status !== "paid") {
    fallbackUrl.searchParams.set("error", "فشلت عملية الدفع أو تم إلغاؤها.");
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const existing = await prisma.zatcaQueue.findFirst({
      where: { invoiceId, status: "COMPLETED" },
    });
    if (existing) {
      const successUrl = new URL("/operations", request.url);
      successUrl.searchParams.set("tab", "settings");
      successUrl.searchParams.set("success", "تم تفعيل الاشتراك مسبقًا.");
      return NextResponse.redirect(successUrl);
    }

    const response = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
      headers: {
        "Authorization": `Basic ${Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error("لم نتمكن من التحقق من صحة الفاتورة عبر بوابة ميسر.");
    }

    const invoice = await response.json();

    if (invoice.status === "paid") {
      const tenantId = invoice.metadata.tenantId;
      const type = invoice.metadata.type;

      if (!tenantId) {
        throw new Error("رقم المنشأة غير موجود في الفاتورة.");
      }
      if (tenantId !== session.tenantId) {
        throw new Error("الفاتورة لا تخص هذه المنشأة.");
      }

      const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenantExists) {
        throw new Error("المنشأة غير موجودة.");
      }

      if (type === "addon") {
        const agentCount = parseInt(invoice.metadata.agentCount || "0", 10);
        if (agentCount <= 0 || agentCount > 100) {
          throw new Error("عدد الوكلاء غير صالح.");
        }
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { extraAgents: { increment: agentCount } },
        });

        await writeAuditLog({
          tenantId,
          userId: session.userId,
          action: "SUBSCRIPTION_CHANGED",
          tableName: "tenants",
          recordId: tenantId,
          details: `Purchased ${agentCount} additional agents (Moyasar: ${invoiceId})`,
        });

        const successUrl = new URL("/operations", request.url);
        successUrl.searchParams.set("tab", "settings");
        successUrl.searchParams.set("success", `تم شراء عدد ${agentCount} وكلاء إضافيين بنجاح!`);
        return NextResponse.redirect(successUrl);
      } else {
        const plan = invoice.metadata.plan;
        if (!plan) throw new Error("خطة الاشتراك غير موجودة.");
        await handleSuccessfulPaymentInternal(tenantId, plan, "MONTHLY");

        await writeAuditLog({
          tenantId,
          userId: session.userId,
          action: "SUBSCRIPTION_CHANGED",
          tableName: "tenants",
          recordId: tenantId,
          details: `Plan upgraded to ${plan} (Moyasar: ${invoiceId})`,
        });

        const successUrl = new URL("/operations", request.url);
        successUrl.searchParams.set("tab", "settings");
        successUrl.searchParams.set("success", "تم ترقية الخطة بنجاح!");
        return NextResponse.redirect(successUrl);
      }
    }

    fallbackUrl.searchParams.set("error", "الفاتورة لم يتم دفعها بعد.");
    return NextResponse.redirect(fallbackUrl);

  } catch (error: any) {
    console.error("Payment callback error:", error);
    fallbackUrl.searchParams.set("error", "حدث خطأ أثناء تفعيل الاشتراك.");
    return NextResponse.redirect(fallbackUrl);
  }
}
