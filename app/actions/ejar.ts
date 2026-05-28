// app/actions/ejar.ts
// 🏛️ ربط نظام إيجار التشريعي - Ejar API Integration
// تسجيل العقود العقارية وحساب عمولات الموظفين
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";
import { sendAdminEmailAlert } from "@/lib/email";
import { revalidatePath } from "next/cache";

// ===================================================
// 📋 واجهة بيانات العقد العقاري
// ===================================================
export interface EjarContractData {
  leadId: string;
  propertyType: "APARTMENT" | "VILLA" | "LAND" | "COMMERCIAL";
  propertyAddress: string;
  landlordNationalId: string;
  tenantNationalId: string;
  contractStartDate: string;
  contractEndDate: string;
  monthlyRent: number;
  totalContractValue: number;
  salesRepUserId: string;
}

export interface EjarContractResponse {
  success: boolean;
  ejarContractId?: string;
  contractNumber?: string;
  registrationTimestamp?: string;
  commissionCalculated?: number;
  error?: string;
}

// ===================================================
// 1. تسجيل العقد في منصة إيجار وحساب العمولة
// ===================================================
export async function submitContractToEjarAction(
  data: EjarContractData
): Promise<EjarContractResponse> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");

    const tenant = await getActiveTenant();

    // ===================================================
    // 2. التحقق من صحة البيانات قبل الإرسال لإيجار
    // ===================================================
    if (!data.landlordNationalId || data.landlordNationalId.length !== 10) {
      return { success: false, error: "رقم الهوية الوطنية للمؤجر يجب أن يكون 10 أرقام." };
    }
    if (!data.tenantNationalId || data.tenantNationalId.length !== 10) {
      return { success: false, error: "رقم الهوية الوطنية للمستأجر يجب أن يكون 10 أرقام." };
    }
    if (data.totalContractValue <= 0) {
      return { success: false, error: "قيمة العقد يجب أن تكون أكبر من صفر." };
    }

    // ===================================================
    // 3. إرسال العقد لـ Ejar API (محاكاة Sandbox)
    // ===================================================
    const EJAR_API_URL = process.env.EJAR_API_URL || "https://api.ejar.sa/sandbox/v1";
    const EJAR_API_KEY = process.env.EJAR_API_KEY || "sandbox_key_demo";

    const ejarPayload = {
      contractType: "RESIDENTIAL",
      propertyType: data.propertyType,
      propertyAddress: data.propertyAddress,
      landlord: {
        nationalId: data.landlordNationalId,
        type: "INDIVIDUAL",
      },
      tenant: {
        nationalId: data.tenantNationalId,
        type: "INDIVIDUAL",
      },
      contractPeriod: {
        startDate: data.contractStartDate,
        endDate: data.contractEndDate,
      },
      financials: {
        monthlyRent: data.monthlyRent,
        totalValue: data.totalContractValue,
        currency: "SAR",
      },
      agencyInfo: {
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
      },
    };

    let ejarResponse: any;
    let ejarContractId: string;
    let contractNumber: string;

    try {
      // في البيئة التجريبية نحاكي الاستجابة
      if (EJAR_API_KEY === "sandbox_key_demo") {
        // محاكاة Ejar Sandbox Response
        ejarContractId = `EJAR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        contractNumber = `CR-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999)}`;
        ejarResponse = { status: "REGISTERED", contractId: ejarContractId };
      } else {
        // الاتصال الحقيقي بـ Ejar API
        const response = await fetch(`${EJAR_API_URL}/contracts/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${EJAR_API_KEY}`,
            "X-Agency-Id": tenant.subdomain,
          },
          body: JSON.stringify(ejarPayload),
        });

        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(`Ejar API Error: ${errorBody.message || response.statusText}`);
        }

        ejarResponse = await response.json();
        ejarContractId = ejarResponse.contractId;
        contractNumber = ejarResponse.contractNumber;
      }
    } catch (apiError: any) {
      return {
        success: false,
        error: `فشل التواصل مع منصة إيجار: ${apiError.message}`,
      };
    }

    // ===================================================
    // 4. حساب عمولة الموظف (2.5% من قيمة العقد)
    // ===================================================
    const COMMISSION_RATE = 0.025; // 2.5%
    const commissionAmount = data.totalContractValue * COMMISSION_RATE;

    // تسجيل العمولة في قاعدة البيانات
    const commission = await prisma.payrollCommission.create({
      data: {
        tenantId: tenant.id,
        userId: data.salesRepUserId,
        amount: commissionAmount,
        contractId: ejarContractId,
        status: "PENDING",
      },
    });

    // ===================================================
    // 5. تحديث حالة العميل إلى CONTRACT_SIGNED
    // ===================================================
    await prisma.lead.update({
      where: { id: data.leadId, tenantId: tenant.id },
      data: {
        status: "CONTRACT_SIGNED",
        updatedAt: new Date(),
      },
    });

    // تسجيل النشاط في خط زمن العميل
    await prisma.leadActivity.create({
      data: {
        tenantId: tenant.id,
        leadId: data.leadId,
        userId: session.userId as string,
        activityType: "CONTRACT_SIGNED",
        description: `✅ تم توقيع وتسجيل العقد عبر منصة إيجار بنجاح. رقم العقد: ${contractNumber}. العمولة المحسوبة: ${commissionAmount.toFixed(2)} ر.س`,
      },
    });

    // ===================================================
    // 6. إشعار المسؤول العام بالبريد الإلكتروني
    // ===================================================
    const salesRep = await prisma.user.findUnique({
      where: { id: data.salesRepUserId },
    });

    const emailHtml = `
      <div style="font-family: 'Calibri', Arial, sans-serif; direction: rtl; text-align: right; padding: 30px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 12px;">
          🏛️ إيجار: تم تسجيل عقد عقاري جديد بنجاح
        </h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p><strong>الشركة:</strong> ${tenant.companyName}</p>
          <p><strong>رقم العقد:</strong> ${contractNumber}</p>
          <p><strong>قيمة العقد:</strong> ${data.totalContractValue.toLocaleString("ar-SA")} ر.س</p>
          <p><strong>مندوب المبيعات:</strong> ${salesRep?.name || "غير محدد"}</p>
          <p><strong>العمولة المستحقة:</strong> <span style="color: #10b981; font-weight: bold;">${commissionAmount.toFixed(2)} ر.س</span></p>
          <p><strong>تاريخ التسجيل:</strong> ${new Date().toLocaleDateString("ar-SA")}</p>
        </div>
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          تم توليد هذا الإشعار آلياً من نظام ORCA CRM عبر تكامل منصة إيجار.
        </p>
      </div>
    `;

    await sendAdminEmailAlert(
      `🏛️ عقد إيجار جديد: ${tenant.companyName} - قيمة ${data.totalContractValue.toLocaleString("ar-SA")} ر.س`,
      emailHtml
    );

    revalidatePath("/operations/leads");
    revalidatePath("/operations/sales");
    revalidatePath("/operations/agents");

    return {
      success: true,
      ejarContractId,
      contractNumber,
      registrationTimestamp: new Date().toISOString(),
      commissionCalculated: commissionAmount,
    };
  } catch (error: any) {
    console.error("خطأ ربط إيجار:", error);
    return { success: false, error: error.message };
  }
}

// ===================================================
// 7. جلب عمولات موظفي الشركة
// ===================================================
export async function getPayrollCommissionsAction(userId?: string) {
  try {
    const tenant = await getActiveTenant();

    const where: any = { tenantId: tenant.id };
    if (userId) where.userId = userId;

    const commissions = await prisma.payrollCommission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalPending = commissions
      .filter((c) => c.status === "PENDING")
      .reduce((acc, c) => acc + Number(c.amount), 0);

    const totalPaid = commissions
      .filter((c) => c.status === "PAID")
      .reduce((acc, c) => acc + Number(c.amount), 0);

    return { success: true, commissions, totalPending, totalPaid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===================================================
// 8. تحديث حالة العمولة (PENDING → PAID)
// ===================================================
export async function markCommissionPaidAction(commissionId: string) {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول.");

    const tenant = await getActiveTenant();

    await prisma.payrollCommission.update({
      where: { id: commissionId, tenantId: tenant.id },
      data: { status: "PAID" },
    });

    revalidatePath("/operations/sales");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
