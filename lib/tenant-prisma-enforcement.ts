import {
  isOptionalTenantModel,
  isRequiredTenantModel,
} from "@/lib/tenant-model-policy";
import type { TenantContext } from "@/lib/tenant-context";

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

const DELETE_OR_UPDATE_OPERATIONS = new Set([
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

export const TENANT_CONTEXT_REQUIRED_ERROR = "TENANT_CONTEXT_REQUIRED";

type QueryArgs = Record<string, unknown>;

function isRecord(value: unknown): value is QueryArgs {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneArgs(args: unknown): QueryArgs {
  return isRecord(args) ? { ...args } : {};
}

function withTenantWhere(where: unknown, tenantId: string): QueryArgs {
  return isRecord(where) ? { ...where, tenantId } : { tenantId };
}

function withTenantData(data: unknown, tenantId: string): QueryArgs {
  return isRecord(data) ? { ...data, tenantId } : { tenantId };
}

function withTenantCreateManyData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((entry) => withTenantData(entry, tenantId));
  }

  if (isRecord(data)) {
    return withTenantData(data, tenantId);
  }

  return data;
}

export function shouldEnforceTenantIsolation(model: string | undefined): boolean {
  return Boolean(model && isRequiredTenantModel(model));
}

export function isTenantPolicyOptionalModel(model: string | undefined): boolean {
  return Boolean(model && isOptionalTenantModel(model));
}

export function isTenantScopedWriteOperation(operation: string): boolean {
  return WRITE_OPERATIONS.has(operation);
}

export function applyTenantIsolationToQuery(args: unknown, input: {
  model: string | undefined;
  operation: string;
  context: TenantContext | null;
  failClosed: boolean;
}): unknown {
  const { model, operation, context, failClosed } = input;

  if (!model || !shouldEnforceTenantIsolation(model)) {
    return args;
  }

  const tenantId = context?.tenantId;
  if (!tenantId) {
    if (failClosed) {
      throw new Error(TENANT_CONTEXT_REQUIRED_ERROR);
    }

    return args;
  }

  const nextArgs = cloneArgs(args);

  if (READ_OPERATIONS.has(operation) || DELETE_OR_UPDATE_OPERATIONS.has(operation)) {
    nextArgs.where = withTenantWhere(nextArgs.where, tenantId);
  }

  if (operation === "create") {
    nextArgs.data = withTenantData(nextArgs.data, tenantId);
  }

  if (operation === "createMany") {
    nextArgs.data = withTenantCreateManyData(nextArgs.data, tenantId);
  }

  if (operation === "update") {
    nextArgs.data = withTenantData(nextArgs.data, tenantId);
  }

  if (operation === "updateMany") {
    nextArgs.data = withTenantData(nextArgs.data, tenantId);
  }

  if (operation === "upsert") {
    nextArgs.create = withTenantData(nextArgs.create, tenantId);
    nextArgs.update = withTenantData(nextArgs.update, tenantId);
  }

  return nextArgs;
}
