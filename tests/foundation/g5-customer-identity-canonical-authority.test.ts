import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const contracts = readFileSync(
  resolve(process.cwd(), "lib/customer-identity/contracts.ts"),
  "utf8",
);

const authority = readFileSync(
  resolve(process.cwd(), "lib/customer-identity/authority.ts"),
  "utf8",
);

const service = readFileSync(
  resolve(process.cwd(), "lib/customer-identity/service.ts"),
  "utf8",
);

describe("Customer Identity final G3 cutover", () => {
  it("requires canonical AccessContext in command context", () => {
    expect(contracts).toContain(
      "authorizationContext: AccessContext",
    );

    expect(contracts).not.toContain(
      "authorizationContext?: AccessContext",
    );
  });

  it("requires canonical approver context only on MergePartiesCommand", () => {
    const mergeStart = contracts.indexOf(
      "export type MergePartiesCommand",
    );

    const recordStart = contracts.indexOf(
      "export type PartyMergeRecord",
    );

    expect(mergeStart).toBeGreaterThanOrEqual(0);
    expect(recordStart).toBeGreaterThanOrEqual(0);

    const mergeBlock = contracts.slice(
      mergeStart,
      contracts.indexOf("}>;", mergeStart) + 3,
    );

    const recordBlock = contracts.slice(
      recordStart,
      contracts.indexOf("}>;", recordStart) + 3,
    );

    expect(mergeBlock).toContain(
      "approverAuthorizationContext: AccessContext",
    );

    expect(recordBlock).not.toContain(
      "approverAuthorizationContext",
    );
  });

  it("removes EXEC-004 authority inputs", () => {
    expect(contracts).not.toContain(
      "OrganizationScopeAssignment",
    );

    expect(contracts).not.toContain(
      "EnabledBranchService",
    );

    expect(contracts).not.toContain(
      "approverAssignments",
    );

    expect(authority).not.toContain(
      "evaluateOrganizationAuthority",
    );

    expect(authority).not.toContain(
      "@/lib/organization/",
    );
  });

  it("uses canonical G3 authorization only", () => {
    expect(authority).toContain("requirePermission(");
    expect(authority).toContain(
      "accessContext.permissionKeys.has(permission)",
    );
  });

  it("keeps merge approval on independent canonical context", () => {
    expect(service).toContain(
      "authorizationContext: command.approverAuthorizationContext",
    );

    expect(service).not.toContain(
      "command.approverAssignments",
    );
  });
});
