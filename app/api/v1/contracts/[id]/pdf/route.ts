import { httpErrorResponse } from "@/lib/http-error-response";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ErrorCode } from "@/lib/errors";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { runWithExec003CookiePermission } from "@/lib/auth/exec-003-shared-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return runWithExec003CookiePermission(
    request,
    EXEC_003_DATABASE_ROLES,
    "contracts.pdf.read",
    async (session) => {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const isDownload = searchParams.get("download") === "1";

      try {
        const contract = await prisma.contract.findFirst({
          where: { id, tenantId: session.tenantId },
          include: {
            unit: {
              select: {
                unitNumber: true,
                projectId: true,
                type: true,
                area: true,
                city: true,
                district: true,
              },
            },
            tenant: {
              select: {
                companyName: true,
                vatNumber: true,
                commercialRegistry: true,
                nationalAddress: true,
              },
            },
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        });

        if (!contract) {
          return NextResponse.json(
            { error: "العقد غير موجود" },
            { status: 404 },
          );
        }

        const total = Number(contract.totalVolumeSar);
        const vatRate = Number(contract.vatRate);
        const vatAmount = (total * vatRate) / 100;
        const grandTotal = total + vatAmount;
        const label = `CONTRACT-${contract.id.substring(0, 8).toUpperCase()}`;

        const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>${label}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
  .contract { max-width: 800px; margin: auto; background: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 8px; }
  h1 { font-size: 24px; color: #1a365d; margin: 0 0 5px; }
  .meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px 0; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
  .seller, .customer { width: 45%; }
  .seller h3, .customer h3 { font-size: 12px; color: #718096; margin: 0 0 5px; text-transform: uppercase; }
  .seller p, .customer p { font-size: 14px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f7fafc; padding: 10px; font-size: 12px; color: #718096; text-align: right; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .totals { margin: 20px 0; text-align: left; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .totals .grand-total { font-size: 18px; font-weight: bold; color: #1a365d; border-top: 2px solid #1a365d; padding-top: 10px; margin-top: 10px; }
  .footer { text-align: center; font-size: 11px; color: #a0aec0; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
  .info-bar { display: flex; justify-content: space-between; background: #f7fafc; padding: 10px 15px; border-radius: 6px; margin: 15px 0; font-size: 12px; color: #4a5568; }
  @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="contract">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h1>${label}</h1>
        <p style="color: #718096; font-size: 14px;">عقد بيع وحدة عقارية / Property Sale Contract</p>
      </div>
      <div style="text-align: left;">
        <p style="font-size: 12px; color: #718096;">${contract.tenant.companyName}</p>
      </div>
    </div>

    <div class="info-bar">
      <span>الحالة: ${contract.status}</span>
      <span>نوع الضريبة: ${contract.vatType}</span>
    </div>

    <div class="meta">
      <div class="seller">
        <h3>البائع / Seller</h3>
        <p><strong>${contract.tenant.companyName}</strong></p>
        <p>الرقم الضريبي: ${contract.tenant.vatNumber || "-"}</p>
        <p>السجل التجاري: ${contract.tenant.commercialRegistry || "-"}</p>
        <p>${contract.tenant.nationalAddress || ""}</p>
      </div>
      <div class="customer">
        <h3>المشتري / Buyer</h3>
        <p><strong>${contract.buyerName}</strong></p>
        <p>رقم الجوال: ${contract.buyerPhone}</p>
        <p>الوحدة: ${contract.unit.unitNumber}</p>
        <p>النوع: ${contract.unit.type || "-"} | المساحة: ${contract.unit.area || "-"}</p>
        ${contract.unit.city ? `<p>المدينة: ${contract.unit.city}${contract.unit.district ? " - " + contract.unit.district : ""}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>البيان / Description</th>
          <th style="text-align: left;">القيمة / Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>إجمالي قيمة العقد</td>
          <td style="text-align: left;">${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><span>قيمة العقد قبل الضريبة / Contract Value</span><span>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</span></div>
      <div><span>نسبة الضريبة / VAT Rate</span><span>${vatRate}%</span></div>
      <div><span>قيمة الضريبة / VAT Amount</span><span>${vatAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</span></div>
      <div class="grand-total"><span>الإجمالي شامل الضريبة / Grand Total</span><span>${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</span></div>
    </div>

    ${
      contract.installments.length > 0
        ? `
    <h3 style="font-size: 16px; color: #1a365d; margin: 20px 0 10px;">جدول الأقساط / Installment Schedule</h3>
    <table>
      <thead>
        <tr>
          <th>رقم القسط</th>
          <th style="text-align: left;">المبلغ</th>
          <th style="text-align: left;">الضريبة</th>
          <th>تاريخ الاستحقاق</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${contract.installments
          .map(
            (installment) => `
        <tr>
          <td>${installment.installmentNumber}</td>
          <td style="text-align: left;">${Number(installment.amountSar).toLocaleString("en-US", { minimumFractionDigits: 2 })} SAR</td>
          <td style="text-align: left;">${installment.vatAmount ? Number(installment.vatAmount).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "-"} SAR</td>
          <td>${new Date(installment.dueDate).toISOString().split("T")[0]}</td>
          <td>${installment.paymentStatus}</td>
        </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    `
        : ""
    }

    <div style="font-size: 11px; color: #718096; text-align: center;">
      <p>تاريخ التوقيع: ${contract.signedAt ? new Date(contract.signedAt).toISOString().split("T")[0] : "غير موقع"} ${contract.endDate ? "| تاريخ الانتهاء: " + new Date(contract.endDate).toISOString().split("T")[0] : ""}</p>
      <p>رقم العقد: ${contract.id}</p>
    </div>

    <div class="footer">
<p>تم إنشاؤها بواسطة ORCA | عقد بيع وحدة عقارية</p>
<p>Generated by ORCA | Property Sale Contract</p>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 20px;">
      <button onclick="window.print()" style="padding: 10px 30px; background: #1a365d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">طباعة / Print</button>
    </div>
  </div>
  ${isDownload ? "<script>window.onload = function() { window.print(); }</script>" : ""}
</body>
</html>`;

        const headers: Record<string, string> = {
          "Content-Type": "text/html; charset=utf-8",
        };
        if (isDownload) {
          headers["Content-Disposition"] =
            `attachment; filename="contract-${label}.html"`;
        }
        return new NextResponse(html, { headers });
      } catch (error: any) {
        return httpErrorResponse(
          request,
          ErrorCode.INTERNAL_ERROR,
          "GET /api/v1/contracts/[id]/pdf failed",
          error,
          500,
        );
      }
    },
  );
}
