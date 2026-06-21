import { prisma } from "@/lib/prisma";

export async function assertTenantOwnership(
  tenantId: string,
  model: "lead" | "opportunity" | "tour" | "offer" | "contract" | "invoice" | "installment" | "unit" | "project" | "contact",
  id: string,
  label?: string,
): Promise<void> {
  const scope: Record<string, any> = { id, tenantId };

  if (model === "unit") {
    const record = await prisma.unit.findFirst({
      where: { id, project: { tenantId } },
    });
    if (!record) throw new Error(label || `Unit does not belong to this tenant.`);
    return;
  }

  const finder = (prisma as any)[model];
  if (!finder) throw new Error(`Unknown model: ${model}`);

  const record = await finder.findFirst({ where: scope });
  if (!record) throw new Error(label || `${model} does not belong to this tenant or does not exist.`);
}

export async function assertTenantOwnershipInTx(
  tx: any,
  model: "lead" | "opportunity" | "tour" | "offer" | "contract" | "invoice" | "installment" | "unit" | "project" | "contact",
  id: string,
  tenantId: string,
  label?: string,
): Promise<void> {
  if (model === "unit") {
    const record = await tx.unit.findFirst({
      where: { id, project: { tenantId } },
    });
    if (!record) throw new Error(label || `Unit does not belong to this tenant.`);
    return;
  }

  const finder = tx[model];
  if (!finder) throw new Error(`Unknown model: ${model}`);

  const record = await finder.findFirst({ where: { id, tenantId } });
  if (!record) throw new Error(label || `${model} does not belong to this tenant or does not exist.`);
}
