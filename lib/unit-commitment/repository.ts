import type {
  CommitmentHistoryEntry,
  TourHistoryEntry,
  UnitCommitmentAuditEntry,
  UnitCommitmentState,
  UnitInventoryRecord,
} from "@/lib/unit-commitment/contracts";

export interface UnitCommitmentRepository {
  read<T>(reader: (state: Readonly<UnitCommitmentState>) => T): T;
  transaction<T>(operation: (state: UnitCommitmentState) => T): T;
}

export function createEmptyUnitCommitmentState(): UnitCommitmentState {
  return {
    units: new Map(),
    commitments: new Map(),
    tours: new Map(),
    commitmentHistory: [],
    tourHistory: [],
    audit: [],
    idempotency: new Map(),
    nextEntityId: 1,
    nextHistorySequence: 1,
    nextAuditSequence: 1,
  };
}

export class InMemoryUnitCommitmentRepository
  implements UnitCommitmentRepository
{
  private state: UnitCommitmentState;

  constructor(seed?: Partial<UnitCommitmentState>) {
    this.state = {
      ...createEmptyUnitCommitmentState(),
      ...seed,
    };
  }

  read<T>(reader: (state: Readonly<UnitCommitmentState>) => T): T {
    return reader(structuredClone(this.state));
  }

  transaction<T>(operation: (state: UnitCommitmentState) => T): T {
    const working = structuredClone(this.state);
    const result = operation(working);
    this.state = working;
    return structuredClone(result);
  }

  seedUnit(unit: UnitInventoryRecord): void {
    this.transaction((state) => {
      state.units.set(unit.id, structuredClone(unit));
    });
  }

  snapshot(): Readonly<UnitCommitmentState> {
    return structuredClone(this.state);
  }
}

export function nextUnitCommitmentId(
  state: UnitCommitmentState,
  prefix: string,
): string {
  const id = `${prefix}-${String(state.nextEntityId).padStart(6, "0")}`;
  state.nextEntityId += 1;
  return id;
}

export function appendCommitmentHistory(
  state: UnitCommitmentState,
  entry: Omit<CommitmentHistoryEntry, "sequence">,
): CommitmentHistoryEntry {
  const record: CommitmentHistoryEntry = {
    ...structuredClone(entry),
    sequence: state.nextHistorySequence,
  };
  state.nextHistorySequence += 1;
  state.commitmentHistory.push(record);
  return record;
}

export function appendTourHistory(
  state: UnitCommitmentState,
  entry: Omit<TourHistoryEntry, "sequence">,
): TourHistoryEntry {
  const record: TourHistoryEntry = {
    ...structuredClone(entry),
    sequence: state.nextHistorySequence,
  };
  state.nextHistorySequence += 1;
  state.tourHistory.push(record);
  return record;
}

export function appendUnitCommitmentAudit(
  state: UnitCommitmentState,
  entry: Omit<UnitCommitmentAuditEntry, "sequence">,
): UnitCommitmentAuditEntry {
  const record: UnitCommitmentAuditEntry = {
    ...structuredClone(entry),
    sequence: state.nextAuditSequence,
  };
  state.nextAuditSequence += 1;
  state.audit.push(record);
  return record;
}