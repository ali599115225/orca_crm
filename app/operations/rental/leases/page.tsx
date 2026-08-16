import ContractsPaymentsCenter from '@/components/contracts-payments/ContractsPaymentsCenter';
import RentFlexLeaseWorkspacePanel from '@/components/rent-flex/RentFlexLeaseWorkspacePanel';

export default function LeasesWorkspacePage() {
  return (
    <>
      <RentFlexLeaseWorkspacePanel />
      <ContractsPaymentsCenter defaultPane="leases" />
    </>
  );
}
