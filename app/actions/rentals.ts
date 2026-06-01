"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { getSession } from "@/lib/session";

export async function getRentalContractsAction() {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول أولاً.");
    const tenant = await getActiveTenant();
    
    const contracts = await prisma.contract.findMany({
      where: {
        unit: {
          project: {
            tenantId: tenant.id
          }
        }
      },
      include: {
        unit: true,
        installments: true
      },
      orderBy: { createdAt: "desc" }
    });

    const mappedRentals = contracts.map(c => {
      const totalPaid = c.installments
        .filter(i => i.paymentStatus === "Paid")
        .reduce((sum, i) => sum + Number(i.amountSar), 0);
      
      const nextDueInstallment = c.installments
        .filter(i => i.paymentStatus !== "Paid")
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

      let status = "غير مدفوع";
      if (totalPaid >= Number(c.totalVolumeSar)) {
        status = "مدفوع";
      } else if (nextDueInstallment && nextDueInstallment.dueDate < new Date()) {
        status = "متأخر";
      } else if (totalPaid > 0) {
        status = "غير مدفوع"; // could be partially paid, but mock only has 3 states
      }

      return {
        id: c.id,
        unit: c.unit.unitNumber,
        tenant: c.buyerName,
        phone: c.buyerPhone,
        rent: Number(c.totalVolumeSar),
        paid: totalPaid,
        due: nextDueInstallment ? nextDueInstallment.dueDate.toISOString().split('T')[0] : "مكتمل",
        status,
        months: c.installments.length
      };
    });

    return { success: true, rentals: mappedRentals };
  } catch (error: any) {
    console.error("Error fetching rentals:", error);
    return { success: false, error: error.message };
  }
}
