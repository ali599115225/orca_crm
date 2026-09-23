import {
  isCanonicalStaffPlacementEvidence,
  resolveCanonicalStaffPlacement,
  type CanonicalStaffPlacementEvidence,
  type OrgPlacementLoader,
  type OrgPlacementSnapshot,
} from "@/lib/authz/org-placement";
import { describe, expect, it } from "vitest";

function loader(
  snapshot: OrgPlacementSnapshot,
): OrgPlacementLoader {
  return {
    async load() {
      return snapshot;
    },
  };
}

const units = [
  {
    id: "company-1",
    parentId: null,
    type: "COMPANY",
  },
  {
    id: "branch-1",
    parentId: "company-1",
    type: "BRANCH",
  },
  {
    id: "branch-2",
    parentId: "company-1",
    type: "BRANCH",
  },
  {
    id: "department-1",
    parentId: "branch-1",
    type: "DEPARTMENT",
  },
  {
    id: "team-1",
    parentId: "department-1",
    type: "TEAM",
  },
] as const;

describe("canonical staff placement", () => {
  it("accepts direct Branch placement", async () => {
    const evidence =
      await resolveCanonicalStaffPlacement(
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
          now: new Date(
            "2026-09-22T00:00:00.000Z",
          ),
        },
        {
          loader: loader({
            units,
            assignments: [
              {
                id: "assignment-1",
                orgUnitId: "branch-1",
              },
            ],
          }),
        },
      );

    expect(evidence).not.toBeNull();

    expect(
      isCanonicalStaffPlacementEvidence(
        evidence!,
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
        },
      ),
    ).toBe(true);
  });

  it("accepts Department and Team descendants of the Branch", async () => {
    for (const orgUnitId of [
      "department-1",
      "team-1",
    ]) {
      const evidence =
        await resolveCanonicalStaffPlacement(
          {
            tenantId: "tenant-1",
            userId: "staff-1",
            branchId: "branch-1",
          },
          {
            loader: loader({
              units,
              assignments: [
                {
                  id: `assignment-${orgUnitId}`,
                  orgUnitId,
                },
              ],
            }),
          },
        );

      expect(evidence).not.toBeNull();
    }
  });

  it("accepts Company placement for a Branch under that Company", async () => {
    const evidence =
      await resolveCanonicalStaffPlacement(
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
        },
        {
          loader: loader({
            units,
            assignments: [
              {
                id: "assignment-company",
                orgUnitId: "company-1",
              },
            ],
          }),
        },
      );

    expect(evidence).not.toBeNull();
  });

  it("rejects placement under another Branch", async () => {
    const evidence =
      await resolveCanonicalStaffPlacement(
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
        },
        {
          loader: loader({
            units,
            assignments: [
              {
                id: "assignment-branch-2",
                orgUnitId: "branch-2",
              },
            ],
          }),
        },
      );

    expect(evidence).toBeNull();
  });

  it("fails closed for missing or malformed hierarchy", async () => {
    const evidence =
      await resolveCanonicalStaffPlacement(
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
        },
        {
          loader: loader({
            units: [
              {
                id: "branch-1",
                parentId: "missing-company",
                type: "BRANCH",
              },
            ],
            assignments: [
              {
                id: "assignment-1",
                orgUnitId: "missing-team",
              },
            ],
          }),
        },
      );

    expect(evidence).toBeNull();
  });

  it("rejects forged placement evidence", () => {
    const forged: CanonicalStaffPlacementEvidence = {
      tenantId: "tenant-1",
      userId: "staff-1",
      branchId: "branch-1",
      assignmentId: "forged-assignment",
      orgUnitId: "branch-1",
      resolvedAt: new Date(),
    };

    expect(
      isCanonicalStaffPlacementEvidence(
        forged,
        {
          tenantId: "tenant-1",
          userId: "staff-1",
          branchId: "branch-1",
        },
      ),
    ).toBe(false);
  });
});
