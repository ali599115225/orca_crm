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

    const leases = await prisma.rentalLease.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
    });

    const mappedRentals = leases.map((lease) => ({
      id: lease.id,
      unit: lease.unitName,
      tenant: lease.tenantName,
      phone: "",
      rent: Number(lease.rentAmount),
      paid: 0,
      due: lease.endDate.toISOString().split("T")[0],
      status: lease.status,
      months: 0,
      unitName: lease.unitName,
      tenantName: lease.tenantName,
      rentAmount: Number(lease.rentAmount),
      startDate: lease.startDate.toISOString().split("T")[0],
      endDate: lease.endDate.toISOString().split("T")[0],
    }));

    return { success: true, rentals: mappedRentals };
  } catch (error: unknown) {
    console.error("Error fetching rentals:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر جلب العقود.",
    };
  }
}
