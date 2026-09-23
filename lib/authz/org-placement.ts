import { rawPrisma } from "@/lib/prisma";

export type OrgPlacementUnit = Readonly<{
  id: string;
  parentId: string | null;
  type: "COMPANY" | "BRANCH" | "DEPARTMENT" | "TEAM";
}>;

export type OrgPlacementAssignment = Readonly<{
  id: string;
  orgUnitId: string;
}>;

export type OrgPlacementSnapshot = Readonly<{
  assignments: readonly OrgPlacementAssignment[];
  units: readonly OrgPlacementUnit[];
}>;

export interface OrgPlacementLoader {
  load(input: Readonly<{
    tenantId: string;
    userId: string;
    now: Date;
  }>): Promise<OrgPlacementSnapshot>;
}

export type CanonicalStaffPlacementEvidence = Readonly<{
  tenantId: string;
  userId: string;
  branchId: string;
  assignmentId: string;
  orgUnitId: string;
  resolvedAt: Date;
}>;

const CANONICAL_STAFF_PLACEMENT =
  Symbol("ORCA_CANONICAL_STAFF_PLACEMENT");

type BrandedCanonicalStaffPlacementEvidence =
  CanonicalStaffPlacementEvidence &
  Readonly<{
    [CANONICAL_STAFF_PLACEMENT]: true;
  }>;

export const prismaOrgPlacementLoader: OrgPlacementLoader = {
  async load(input) {
    const [assignments, units] = await Promise.all([
      rawPrisma.orgAssignment.findMany({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          status: "ACTIVE",
          validFrom: {
            lte: input.now,
          },
          OR: [
            {
              validUntil: null,
            },
            {
              validUntil: {
                gt: input.now,
              },
            },
          ],
        },
        select: {
          id: true,
          orgUnitId: true,
        },
      }),

      rawPrisma.orgUnit.findMany({
        where: {
          tenantId: input.tenantId,
          isActive: true,
        },
        select: {
          id: true,
          parentId: true,
          type: true,
        },
      }),
    ]);

    return {
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        orgUnitId: assignment.orgUnitId,
      })),
      units: units.map((unit) => ({
        id: unit.id,
        parentId: unit.parentId,
        type: unit.type,
      })),
    };
  },
};

function lineageContains(
  startId: string,
  targetId: string,
  units: ReadonlyMap<string, OrgPlacementUnit>,
): boolean {
  const visited = new Set<string>();
  let currentId: string | null = startId;

  while (currentId) {
    if (currentId === targetId) {
      return true;
    }

    if (visited.has(currentId)) {
      return false;
    }

    visited.add(currentId);

    const current = units.get(currentId);

    if (!current) {
      return false;
    }

    currentId = current.parentId;
  }

  return false;
}

function assignmentMatchesBranch(
  assignment: OrgPlacementAssignment,
  branchId: string,
  units: ReadonlyMap<string, OrgPlacementUnit>,
): boolean {
  const assignedUnit = units.get(assignment.orgUnitId);
  const branchUnit = units.get(branchId);

  if (
    !assignedUnit ||
    !branchUnit ||
    branchUnit.type !== "BRANCH"
  ) {
    return false;
  }

  if (assignedUnit.type === "COMPANY") {
    return lineageContains(
      branchId,
      assignedUnit.id,
      units,
    );
  }

  return lineageContains(
    assignedUnit.id,
    branchId,
    units,
  );
}

export async function resolveCanonicalStaffPlacement(
  input: Readonly<{
    tenantId: string;
    userId: string;
    branchId: string;
    now?: Date;
  }>,
  options: Readonly<{
    loader?: OrgPlacementLoader;
  }> = {},
): Promise<CanonicalStaffPlacementEvidence | null> {
  const tenantId = input.tenantId.trim();
  const userId = input.userId.trim();
  const branchId = input.branchId.trim();

  if (!tenantId || !userId || !branchId) {
    return null;
  }

  const now = input.now ?? new Date();

  const snapshot = await (
    options.loader ?? prismaOrgPlacementLoader
  ).load({
    tenantId,
    userId,
    now,
  });

  const units = new Map(
    snapshot.units.map((unit) => [
      unit.id,
      unit,
    ]),
  );

  const assignment = snapshot.assignments.find(
    (candidate) =>
      assignmentMatchesBranch(
        candidate,
        branchId,
        units,
      ),
  );

  if (!assignment) {
    return null;
  }

  const evidence: BrandedCanonicalStaffPlacementEvidence =
    Object.freeze({
      tenantId,
      userId,
      branchId,
      assignmentId: assignment.id,
      orgUnitId: assignment.orgUnitId,
      resolvedAt: now,
      [CANONICAL_STAFF_PLACEMENT]: true as const,
    });

  return evidence;
}

export function isCanonicalStaffPlacementEvidence(
  value: CanonicalStaffPlacementEvidence,
  expected: Readonly<{
    tenantId: string;
    userId: string;
    branchId: string;
  }>,
): boolean {
  const candidate =
    value as BrandedCanonicalStaffPlacementEvidence;

  return (
    candidate[CANONICAL_STAFF_PLACEMENT] === true &&
    value.tenantId === expected.tenantId &&
    value.userId === expected.userId &&
    value.branchId === expected.branchId
  );
}
