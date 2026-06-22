import SalesContractWorkspace from "@/components/sales/SalesContractWorkspace";

export default async function SalesContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SalesContractWorkspace contractId={id} />;
}
