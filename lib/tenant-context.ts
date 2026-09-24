import { AsyncLocalStorage } from "async_hooks";

export interface TenantContext {
  readonly tenantId: string;
  readonly userId?: string;
}

const globalForTenantContext = globalThis as typeof globalThis & {
  __orcaTenantContext?: AsyncLocalStorage<TenantContext>;
};

export const tenantContext =
  globalForTenantContext.__orcaTenantContext ??
  new AsyncLocalStorage<TenantContext>();

globalForTenantContext.__orcaTenantContext = tenantContext;

function validateTenantContext(context: TenantContext): void {
  if (
    !context ||
    typeof context.tenantId !== "string" ||
    context.tenantId.trim() === ""
  ) {
    throw new Error("TENANT_CONTEXT_INVALID_TENANT_ID");
  }
}

function freezeContext(context: TenantContext): TenantContext {
  return Object.freeze({ ...context });
}

export function runWithTenantContext<T>(
  context: TenantContext,
  operation: () => T,
): T {
  validateTenantContext(context);
  return tenantContext.run(freezeContext(context), operation);
}

/**
 * @deprecated Transitional compatibility bridge for boundaries whose existing
 * signatures cannot wrap the downstream operation with runWithTenantContext.
 * Prefer runWithTenantContext for all new code.
 */
export function setTenantContext(context: TenantContext): void {
  validateTenantContext(context);
  tenantContext.enterWith(freezeContext(context));
}

export function getTenantContext(): TenantContext | null {
  const store = tenantContext.getStore();
  if (!store) return null;
  return freezeContext(store);
}

export function requireTenantContext(): TenantContext {
  const store = tenantContext.getStore();
  if (!store || typeof store.tenantId !== "string" || store.tenantId.trim() === "") {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
  return freezeContext(store);
}

export function runPlatformOperation<T>(operation: () => T): T {
  return tenantContext.run(undefined as unknown as TenantContext, operation);
}
