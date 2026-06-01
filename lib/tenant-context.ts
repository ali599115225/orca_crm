// lib/tenant-context.ts
import { AsyncLocalStorage } from "async_hooks";

export interface TenantContext {
  tenantId: string;
  userId?: string;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();
