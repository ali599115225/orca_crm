import ContractsPaymentsCenter from "@/components/contracts-payments/ContractsPaymentsCenter";

export default async function RentalLeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ContractsPaymentsCenter defaultPane="leases" detailLeaseId={id} />;
}
