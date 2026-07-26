import type {
  AuditEntry,
  CustomerIdentityState,
} from "@/lib/customer-identity/contracts";

export interface CustomerIdentityRepository {
  read<T>(reader: (state: Readonly<CustomerIdentityState>) => T): T;
  transaction<T>(
    operation: (state: CustomerIdentityState) => T,
  ): T;
}

function createEmptyState(): CustomerIdentityState {
  return {
    parties: new Map(),
    customerAccounts: new Map(),
    leads: new Map(),
    opportunities: new Map(),
    communicationPreferences: new Map(),
    duplicateSuggestions: new Map(),
    mergeRecords: new Map(),
    aliases: new Map(),
    idempotencyResults: new Map(),
    audit: [],
    nextId: 1,
    nextAuditSequence: 1,
  };
}

export class InMemoryCustomerIdentityRepository
  implements CustomerIdentityRepository
{
  private state: CustomerIdentityState;

  constructor(seed?: Partial<CustomerIdentityState>) {
    this.state = {
      ...createEmptyState(),
      ...seed,
    };
  }

  read<T>(reader: (state: Readonly<CustomerIdentityState>) => T): T {
    return reader(structuredClone(this.state));
  }

  transaction<T>(operation: (state: CustomerIdentityState) => T): T {
    const working = structuredClone(this.state);
    const result = operation(working);
    this.state = working;
    return structuredClone(result);
  }

  snapshot(): Readonly<CustomerIdentityState> {
    return structuredClone(this.state);
  }
}

export function nextEntityId(
  state: CustomerIdentityState,
  prefix: string,
): string {
  const value = `${prefix}-${String(state.nextId).padStart(6, "0")}`;
  state.nextId += 1;
  return value;
}

export function appendAudit(
  state: CustomerIdentityState,
  entry: Omit<AuditEntry, "sequence">,
): AuditEntry {
  const record: AuditEntry = {
    ...structuredClone(entry),
    sequence: state.nextAuditSequence,
  };
  state.nextAuditSequence += 1;
  state.audit.push(record);
  return record;
}
