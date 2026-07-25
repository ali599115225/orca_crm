"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { EXEC_003_DATABASE_ROLES } from "@/lib/auth/exec-003-permission-assignments";
import { assertExec003ServerActionPermission } from "@/lib/auth/exec-003-shared-guard";

export async function getRentalContractsAction() {
  try {
    const session = await assertExec003ServerActionPermission(
      await getSession(),
      EXEC_003_DATABASE_ROLES,
      "rentals.contracts.read",
    );

    const contracts = await prisma.contract.findMany({
      where: {
        unit: {
          project: {
            tenantId: session.tenantId,
          },
        },
      },
      include: {
        unit: true,
        installments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedRentals = contracts.map((contract) => {
      const totalPaid = contract.installments
        .filter((installment) => installment.paymentStatus === "Paid")
        .reduce(
          (sum, installment) => sum + Number(installment.amountSar),
          0,
        );

      const nextDueInstallment = contract.installments
        .filter((installment) => installment.paymentStatus !== "Paid")
        .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())[0];

      let status = "غير مدفوع";
      if (totalPaid >= Number(contract.totalVolumeSar)) {
        status = "مدفوع";
      } else if (
        nextDueInstallment &&
        nextDueInstallment.dueDate < new Date()
      ) {
        status = "متأخر";
      }

      return {
        id: contract.id,
        unit: contract.unit.unitNumber,
        tenant: contract.buyerName,
        phone: contract.buyerPhone,
        rent: Number(contract.totalVolumeSar),
        paid: totalPaid,
        due: nextDueInstallment
          ? nextDueInstallment.dueDate.toISOString().split("T")[0]
          : "مكتمل",
        status,
        months: contract.installments.length,
      };
    });

    return { success: true, rentals: mappedRentals };
  } catch (error: unknown) {
    console.error("Error fetching rentals:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر جلب العقود.",
    };
  }
}
