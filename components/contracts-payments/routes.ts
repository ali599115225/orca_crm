import type { ContractsPaymentsPane } from './ContractsPaymentsShell';

export const CONTRACTS_PAYMENTS_ROUTES: Record<ContractsPaymentsPane, string> = {
  leases: '/operations/rental/leases',
  sales: '/operations/rental/sales',
  invoices: '/operations/rental/invoices',
  payments: '/operations/rental/payments',
  reconciliation: '/operations/rental/reconciliation',
  settlements: '/operations/rental/settlements',
};
