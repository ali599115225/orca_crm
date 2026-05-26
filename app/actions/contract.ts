// app/actions/contract.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function saveContractTermsAction(terms: string) {
  try {
    const tenant = await getActiveTenant();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { contractTerms: terms },
    });
    revalidatePath("/operations/analytics");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
