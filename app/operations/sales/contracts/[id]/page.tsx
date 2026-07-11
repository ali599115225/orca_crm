import { redirect } from "next/navigation";

export default async function LegacySalesContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/operations/rental/sales/contracts/${id}`);
}