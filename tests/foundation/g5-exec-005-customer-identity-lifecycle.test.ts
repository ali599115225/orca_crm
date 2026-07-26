import { describe, expect, it } from "vitest";

import {
  CustomerIdentityError,
  type CommandContext,
} from "@/lib/customer-identity/contracts";
import { InMemoryCustomerIdentityRepository } from "@/lib/customer-identity/repository";
import { CustomerIdentityService } from "@/lib/customer-identity/service";
import type {
  OrganizationScopeAssignment,
  OrganizationSecurityRole,
} from "@/lib/organization/contracts";

const TENANT = "tenant-a";
const OTHER_TENANT = "tenant-b";
const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";
const ACTOR = "actor-a";
const APPROVER = "approver-a";

function assignment(
  userId: string,
  options: Partial<OrganizationScopeAssignment> & {
    securityRole?: OrganizationSecurityRole;
  } = {},
): OrganizationScopeAssignment {
  const scopeType = options.scopeType ?? "BRANCH";
  return {
    id: options.id ?? `assignment-${userId}-${scopeType}-${options.branchId ?? "company"}`,
    tenantId: options.tenantId ?? TENANT,
    userId,
    securityRole: options.securityRole ?? "SALES_LEASING_MANAGER",
    scopeType,
    branchId: scopeType === "COMPANY" ? null : options.branchId ?? BRANCH_A,
    departmentId: options.departmentId ?? null,
    teamId: options.teamId ?? null,
    assignedResourceType: options.assignedResourceType ?? null,
    assignedResourceId: options.assignedResourceId ?? null,
    active: options.active ?? true,
    startsAt: options.startsAt ?? null,
    endsAt: options.endsAt ?? null,
  };
}

function context(overrides: Partial<CommandContext> = {}): CommandContext {
  const actorId = overrides.actorId ?? ACTOR;
  const tenantId = overrides.tenantId ?? TENANT;
  const branchId = overrides.scope?.branchId ?? BRANCH_A;
  return {
    actorId,
    tenantId,
    scope: {
      branchId,
      departmentId: overrides.scope?.departmentId ?? null,
      teamId: overrides.scope?.teamId ?? null,
      resourceType: overrides.scope?.resourceType ?? null,
      resourceId: overrides.scope?.resourceId ?? null,
    },
    assignments:
      overrides.assignments ??
      [assignment(actorId, { tenantId, branchId: branchId ?? BRANCH_A })],
    enabledBranchServices:
      overrides.enabledBranchServices ??
      [BRANCH_A, BRANCH_B].map((branch) => ({
        branchId: branch,
        serviceLine: "SALES" as const,
        enabled: true,
      })),
    idempotencyKey: overrides.idempotencyKey ?? null,
    expectedVersion: overrides.expectedVersion ?? null,
    reason: overrides.reason ?? "test reason",
    timestamp: overrides.timestamp ?? new Date("2026-07-26T10:00:00.000Z"),
    auditCorrelationId: overrides.auditCorrelationId ?? "corr-a",
  };
}

function setup(policy: ConstructorParameters<typeof CustomerIdentityService>[1] = {}) {
  const repository = new InMemoryCustomerIdentityRepository();
  const service = new CustomerIdentityService(repository, policy);
  return { repository, service };
}

function person(
  service: CustomerIdentityService,
  name = "Ali Customer",
  commandContext = context(),
) {
  return service.createParty({
    context: commandContext,
    type: "PERSON",
    fields: {
      displayName: { value: name, source: "USER_ENTERED" },
    },
  });
}

function organization(service: CustomerIdentityService, name = "ORCA Holdings") {
  return service.createParty({
    context: context(),
    type: "ORGANIZATION",
    fields: {
      organizationName: { value: name, source: "USER_ENTERED" },
    },
  });
}

function lead(
  service: CustomerIdentityService,
  partyId: string | null,
  commandContext = context(),
) {
  return service.createLead({
    context: commandContext,
    partyId,
    serviceLine: "SALES",
    source: "WEB",
    branchId: commandContext.scope.branchId ?? BRANCH_A,
  });
}

function opportunity(
  service: CustomerIdentityService,
  partyId: string,
  commandContext = context(),
) {
  return service.createOpportunity({
    context: commandContext,
    partyId,
    branchId: commandContext.scope.branchId ?? BRANCH_A,
    serviceLine: "SALES",
    expectedValue: 500000,
    probability: 40,
    creationSource: "DIRECT",
  });
}

function mergeInput(
  survivorPartyId: string,
  mergedPartyId: string,
  overrides: Partial<CommandContext> = {},
) {
  return {
    context: context({
      idempotencyKey: "merge-key",
      reason: "confirmed duplicate",
      ...overrides,
    }),
    survivorPartyId,
    mergedPartyId,
    fieldChoices: [] as const,
    approvedByActorId: APPROVER,
    approverAssignments: [assignment(APPROVER)],
  };
}

function expectCode(
  operation: () => unknown,
  expected: CustomerIdentityError["code"],
) {
  try {
    operation();
    throw new Error(`Expected ${expected}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CustomerIdentityError);
    expect((error as CustomerIdentityError).code).toBe(expected);
  }
}

describe("EXEC-005 direct customer identity behavior", () => {
  it("01 creates Person", () => {
    const { service } = setup();
    expect(person(service).type).toBe("PERSON");
  });

  it("02 creates Organization", () => {
    const { service } = setup();
    expect(organization(service).type).toBe("ORGANIZATION");
  });

  it("03 creates multiple Leads for one Party", () => {
    const { repository, service } = setup();
    const party = person(service);
    lead(service, party.id);
    service.createLead({
      context: context(),
      partyId: party.id,
      serviceLine: "LEASING",
      source: "CAMPAIGN",
      branchId: BRANCH_A,
    });
    expect(repository.snapshot().parties.size).toBe(1);
    expect(repository.snapshot().leads.size).toBe(2);
  });

  it("04 creates independent Opportunities for one Party", () => {
    const { repository, service } = setup();
    const party = person(service);
    const first = opportunity(service, party.id);
    const second = opportunity(service, party.id);
    expect(first.id).not.toBe(second.id);
    expect(repository.snapshot().opportunities.size).toBe(2);
  });

  it("05 converts Lead idempotently", () => {
    const { service } = setup();
    const source = lead(service, null);
    const command = {
      context: context({
        idempotencyKey: "convert-1",
        expectedVersion: source.version,
      }),
      leadId: source.id,
      createParty: {
        type: "PERSON" as const,
        fields: {
          displayName: {
            value: "Converted",
            source: "USER_ENTERED" as const,
          },
        },
      },
      createCustomerAccount: true,
      createOpportunity: true,
      opportunity: {
        expectedValue: 1000,
        probability: 20,
        creationSource: "CONVERSION",
      },
    };
    const first = service.convertLead(command);
    const second = service.convertLead(command);
    expect(second.party.id).toBe(first.party.id);
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
  });

  it("06 prevents an implicit second conversion Opportunity", () => {
    const { repository, service } = setup();
    const party = person(service);
    const source = lead(service, party.id);
    const first = service.convertLead({
      context: context({ idempotencyKey: "convert-a" }),
      leadId: source.id,
      createOpportunity: true,
      opportunity: {
        expectedValue: 100,
        probability: 10,
        creationSource: "CONVERSION",
      },
    });
    const second = service.convertLead({
      context: context({ idempotencyKey: "convert-b" }),
      leadId: source.id,
      createOpportunity: true,
      opportunity: {
        expectedValue: 200,
        probability: 20,
        creationSource: "CONVERSION",
      },
    });
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
    expect(repository.snapshot().opportunities.size).toBe(1);
  });

  it("07 detects deterministic normalized identity match", () => {
    const { service } = setup();
    service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        nationalId: {
          value: "1234-567-890",
          source: "VERIFIED",
          verified: true,
        },
      },
    });
    const candidate = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        nationalId: {
          value: "1234567890",
          source: "VERIFIED",
          verified: true,
        },
      },
    });
    const match = service.suggestDuplicates(context(), candidate.id)[0];
    expect(match.level).toBe("DETERMINISTIC_MATCH");
    expect(match.reasons[0].code).toBe("VERIFIED_IDENTITY_MATCH");
  });

  it("08 explains possible match", () => {
    const { service } = setup();
    person(service, "Mohammed Al Qahtani");
    const candidate = person(service, "Mohammad Alqahtani");
    const match = service.suggestDuplicates(context(), candidate.id)[0];
    expect(match.level).toBe("POSSIBLE_MATCH");
    expect(match.reasons[0].explanation.length).toBeGreaterThan(10);
  });

  it("09 does not auto-merge by name", () => {
    const { service } = setup();
    person(service, "Sara Ahmed");
    const candidate = person(service, "Sarah Ahmed");
    const match = service.suggestDuplicates(context(), candidate.id)[0];
    expect(match.autoMergeAllowed).toBe(false);
  });

  it("10 creates Merge Preview", () => {
    const { service } = setup();
    const survivor = person(service, "First");
    const loser = person(service, "Second");
    const preview = service.previewMerge(
      context(),
      survivor.id,
      loser.id,
      [{ field: "displayName", sourcePartyId: survivor.id }],
    );
    expect(preview.conflicts).toContain("displayName");
    expect(preview.survivorBefore.id).toBe(survivor.id);
  });

  it("11 applies explicit field survivorship", () => {
    const { service } = setup();
    const survivor = person(service, "Old");
    const loser = person(service, "Chosen");
    const input = mergeInput(survivor.id, loser.id);
    const record = service.mergeParties({
      ...input,
      fieldChoices: [{ field: "displayName", sourcePartyId: loser.id }],
    });
    expect(record.survivorAfter.fields.displayName.value).toBe("Chosen");
  });

  it("12 preserves provenance during merge", () => {
    const { service } = setup();
    const survivor = person(service, "A");
    const loser = person(service, "B");
    const record = service.mergeParties({
      ...mergeInput(survivor.id, loser.id),
      fieldChoices: [{ field: "displayName", sourcePartyId: loser.id }],
    });
    expect(record.survivorAfter.fields.displayName.source).toBe("MERGED");
    expect(record.survivorAfter.fields.displayName.history).toHaveLength(2);
  });

  it("13 transfers relationships without merging Opportunities", () => {
    const { repository, service } = setup();
    const survivor = person(service, "A");
    const loser = person(service, "B");
    const sourceLead = lead(service, loser.id);
    const first = opportunity(service, loser.id);
    const second = opportunity(service, loser.id);
    service.mergeParties(mergeInput(survivor.id, loser.id));
    const snapshot = repository.snapshot();
    expect(snapshot.leads.get(sourceLead.id)?.partyId).toBe(survivor.id);
    expect(snapshot.opportunities.get(first.id)?.partyId).toBe(survivor.id);
    expect(snapshot.opportunities.get(second.id)?.partyId).toBe(survivor.id);
    expect(snapshot.opportunities.size).toBe(2);
  });

  it("14 denies cross-tenant merge", () => {
    const { service } = setup();
    const survivor = person(service);
    const otherContext = context({
      tenantId: OTHER_TENANT,
      actorId: "actor-b",
      assignments: [
        assignment("actor-b", {
          tenantId: OTHER_TENANT,
          branchId: BRANCH_A,
        }),
      ],
    });
    const outsider = person(service, "Other", otherContext);
    expectCode(
      () =>
        service.mergeParties(mergeInput(survivor.id, outsider.id)),
      "TENANT_SCOPE_MISMATCH",
    );
  });

  it("15 denies cross-branch merge without company scope", () => {
    const { service } = setup();
    const survivor = person(service);
    const branchBContext = context({
      scope: { branchId: BRANCH_B },
      assignments: [assignment(ACTOR, { branchId: BRANCH_B })],
    });
    const loser = person(service, "B", branchBContext);
    expectCode(
      () => service.mergeParties(mergeInput(survivor.id, loser.id)),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("16 denies self-approval", () => {
    const { service } = setup();
    const survivor = person(service);
    const loser = person(service, "B");
    expectCode(
      () =>
        service.mergeParties({
          ...mergeInput(survivor.id, loser.id),
          approvedByActorId: ACTOR,
          approverAssignments: [assignment(ACTOR)],
        }),
      "SELF_APPROVAL_DENIED",
    );
  });

  it("17 prevents duplicate merge", () => {
    const { service } = setup();
    const survivor = person(service);
    const loser = person(service, "B");
    const third = person(service, "C");
    service.mergeParties(mergeInput(survivor.id, loser.id));
    expectCode(
      () =>
        service.mergeParties(
          mergeInput(third.id, loser.id, { idempotencyKey: "merge-2" }),
        ),
      "DUPLICATE_MERGE_DENIED",
    );
  });

  it("18 reverses safe merge", () => {
    const { repository, service } = setup();
    const survivor = person(service);
    const loser = person(service, "B");
    const source = lead(service, loser.id);
    const merge = service.mergeParties(mergeInput(survivor.id, loser.id));
    service.reversePartyMerge(
      context({ reason: "incorrect merge" }),
      merge.id,
    );
    expect(repository.snapshot().leads.get(source.id)?.partyId).toBe(loser.id);
    expect(repository.snapshot().aliases.has(loser.id)).toBe(false);
  });

  it("19 blocks reversal by explicit dependency", () => {
    const { service } = setup();
    const survivor = person(service);
    const loser = person(service, "B");
    const merge = service.mergeParties(mergeInput(survivor.id, loser.id));
    service.registerMergeDependency(context(), merge.id, {
      type: "CONTRACT",
      id: "contract-1",
    });
    expectCode(
      () =>
        service.reversePartyMerge(
          context({ reason: "reverse" }),
          merge.id,
        ),
      "BLOCKED_BY_DEPENDENCY",
    );
  });

  it("20 preserves marketing opt-out separately from transactional consent", () => {
    const { service } = setup();
    const party = person(service);
    service.setCommunicationPreference({
      context: context(),
      partyId: party.id,
      channel: "WHATSAPP",
      purpose: "MARKETING",
      consentState: "WITHDRAWN",
      source: "USER_ENTERED",
    });
    service.setCommunicationPreference({
      context: context(),
      partyId: party.id,
      channel: "WHATSAPP",
      purpose: "TRANSACTIONAL",
      consentState: "GRANTED",
      source: "VERIFIED",
    });
    expect(
      service.canCommunicate(context(), party.id, "WHATSAPP", "MARKETING"),
    ).toBe(false);
    expect(
      service.canCommunicate(
        context(),
        party.id,
        "WHATSAPP",
        "TRANSACTIONAL",
      ),
    ).toBe(true);
  });

  it("21 preserves withdrawal history", () => {
    const { service } = setup();
    const party = person(service);
    const granted = service.setCommunicationPreference({
      context: context(),
      partyId: party.id,
      channel: "EMAIL",
      purpose: "MARKETING",
      consentState: "GRANTED",
      source: "USER_ENTERED",
    });
    const withdrawn = service.setCommunicationPreference({
      context: context({ expectedVersion: granted.version }),
      partyId: party.id,
      channel: "EMAIL",
      purpose: "MARKETING",
      consentState: "WITHDRAWN",
      source: "USER_ENTERED",
    });
    expect(withdrawn.withdrawnAt).not.toBeNull();
    expect(withdrawn.history.map((item) => item.consentState)).toEqual([
      "GRANTED",
      "WITHDRAWN",
    ]);
  });

  it("22 legal hold blocks deletion", () => {
    const { service } = setup();
    const party = person(service);
    service.applyLegalHold(context({ reason: "legal case" }), party.id);
    expectCode(
      () =>
        service.requestDeletion(
          context({ reason: "customer request" }),
          party.id,
        ),
      "LEGAL_HOLD",
    );
  });

  it("23 archival preserves audit", () => {
    const { service } = setup();
    const party = person(service);
    const before = service.listAudit(context()).length;
    const archived = service.archiveParty(
      context({ reason: "retention" }),
      party.id,
    );
    expect(archived.lifecycleState).toBe("ARCHIVED");
    expect(service.listAudit(context())).toHaveLength(before + 1);
  });

  it("24 denies forged scope", () => {
    const { service } = setup();
    expectCode(
      () =>
        person(
          service,
          "Forged",
          context({
            scope: { branchId: BRANCH_B },
            assignments: [assignment(ACTOR, { branchId: BRANCH_A })],
          }),
        ),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("25 denies expired assignment", () => {
    const { service } = setup();
    expectCode(
      () =>
        person(
          service,
          "Expired",
          context({
            timestamp: new Date("2026-07-26T10:00:00.000Z"),
            assignments: [
              assignment(ACTOR, {
                endsAt: new Date("2026-07-26T09:59:59.000Z"),
              }),
            ],
          }),
        ),
      "AUTHORITY_DENIED",
    );
  });

  it("26 fails closed without actor", () => {
    const { service } = setup();
    expectCode(
      () => person(service, "Missing", context({ actorId: "", assignments: [] })),
      "MISSING_ACTOR",
    );
  });

  it("27 detects concurrency conflict", () => {
    const { service } = setup();
    const party = person(service);
    expectCode(
      () =>
        service.updatePartyField({
          context: context({ expectedVersion: 99 }),
          partyId: party.id,
          field: "city",
          value: "Riyadh",
          source: "USER_ENTERED",
        }),
      "CONCURRENCY_CONFLICT",
    );
  });

  it("28 keeps audit append-only through repository snapshots", () => {
    const { repository, service } = setup();
    person(service);
    const snapshot = repository.snapshot();
    snapshot.audit.length = 0;
    expect(service.listAudit(context()).length).toBeGreaterThan(0);
  });

  it("29 gives Platform Owner no automatic write authority", () => {
    const { service } = setup();
    expectCode(
      () =>
        person(
          service,
          "Denied",
          context({
            actorId: "owner",
            assignments: [
              assignment("owner", { securityRole: "PLATFORM_OWNER" }),
            ],
          }),
        ),
      "AUTHORITY_DENIED",
    );
  });

  it("30 gives System Administrator no customer-data authority", () => {
    const { service } = setup();
    expectCode(
      () =>
        person(
          service,
          "Denied",
          context({
            actorId: "admin",
            assignments: [
              assignment("admin", { securityRole: "SYSTEM_ADMINISTRATOR" }),
            ],
          }),
        ),
      "AUTHORITY_DENIED",
    );
  });

  it("31 keeps verified phone possible unless uniqueness policy is enabled", () => {
    const firstSetup = setup();
    for (const name of ["First", "Second"]) {
      firstSetup.service.createParty({
        context: context(),
        type: "PERSON",
        fields: {
          displayName: { value: name, source: "USER_ENTERED" },
          phone: {
            value: name === "First" ? "050 123 4567" : "+966501234567",
            source: "VERIFIED",
            verified: true,
          },
        },
      });
    }
    const candidate = [...firstSetup.repository.snapshot().parties.values()][1];
    expect(
      firstSetup.service.suggestDuplicates(context(), candidate.id)[0].level,
    ).toBe("POSSIBLE_MATCH");

    const uniqueSetup = setup({ verifiedPhoneIsUniquePerParty: true });
    for (const name of ["First", "Second"]) {
      uniqueSetup.service.createParty({
        context: context(),
        type: "PERSON",
        fields: {
          displayName: { value: name, source: "USER_ENTERED" },
          phone: {
            value: name === "First" ? "050 123 4567" : "+966501234567",
            source: "VERIFIED",
            verified: true,
          },
        },
      });
    }
    const uniqueCandidate = [...uniqueSetup.repository.snapshot().parties.values()][1];
    expect(
      uniqueSetup.service.suggestDuplicates(context(), uniqueCandidate.id)[0]
        .level,
    ).toBe("DETERMINISTIC_MATCH");
  });

  it("32 confirms duplicate through append-only audit", () => {
    const { service } = setup();
    person(service, "Sara Ahmed");
    const candidate = person(service, "Sarah Ahmed");
    const suggestion = service.suggestDuplicates(context(), candidate.id)[0];
    service.confirmDuplicate(
      context({ reason: "human confirmed" }),
      suggestion.reviewId,
    );
    expect(
      service
        .listAudit(context())
        .some((entry) => entry.action === "ConfirmDuplicate"),
    ).toBe(true);
  });

  it("33 blocks reversal after post-merge field mutation", () => {
    const { service } = setup();
    const survivor = person(service);
    const loser = person(service, "B");
    const merge = service.mergeParties(mergeInput(survivor.id, loser.id));
    service.updatePartyField({
      context: context({ expectedVersion: merge.survivorAfter.version }),
      partyId: survivor.id,
      field: "city",
      value: "Riyadh",
      source: "USER_ENTERED",
    });
    expectCode(
      () =>
        service.reversePartyMerge(
          context({ reason: "reverse" }),
          merge.id,
        ),
      "BLOCKED_BY_DEPENDENCY",
    );
  });

  it("34 rejects mismatched Party and Customer Account subjects", () => {
    const { service } = setup();
    const first = person(service, "First");
    const second = person(service, "Second");
    const account = service.createCustomerAccount(context(), first.id, ["BUYER"]);
    expectCode(
      () =>
        service.createOpportunity({
          context: context(),
          partyId: second.id,
          customerAccountId: account.id,
          branchId: BRANCH_A,
          serviceLine: "SALES",
          expectedValue: 10,
          probability: 10,
          creationSource: "DIRECT",
        }),
      "VALIDATION_ERROR",
    );
  });

  it("35 protects verified fields from weaker ownership", () => {
    const { service } = setup();
    const party = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        nationalId: {
          value: "1234567890",
          source: "VERIFIED",
          verified: true,
        },
      },
    });
    expectCode(
      () =>
        service.updatePartyField({
          context: context({ expectedVersion: party.version }),
          partyId: party.id,
          field: "nationalId",
          value: "9999999999",
          source: "INTEGRATION",
        }),
      "VERIFIED_FIELD_DOWNGRADE_DENIED",
    );
  });

  it("36 enforces deterministic Opportunity transitions and LOST reason", () => {
    const { service } = setup();
    const party = person(service);
    let item = opportunity(service, party.id);
    item = service.moveOpportunityStage({
      context: context({ expectedVersion: item.version }),
      opportunityId: item.id,
      nextStage: "QUALIFICATION",
    });
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: item.version }),
          opportunityId: item.id,
          nextStage: "LOST",
        }),
      "REASON_REQUIRED",
    );
    const lost = service.moveOpportunityStage({
      context: context({ expectedVersion: item.version }),
      opportunityId: item.id,
      nextStage: "LOST",
      outcomeReason: "budget mismatch",
    });
    expect(lost.history.at(-1)?.previousStage).toBe("QUALIFICATION");
  });

  it("37 WON requires independent initiator and creates no contract truth", () => {
    const { repository, service } = setup();
    const party = person(service);
    let item = opportunity(service, party.id);
    for (const nextStage of [
      "QUALIFICATION",
      "NEEDS_ANALYSIS",
      "PROPOSAL",
      "NEGOTIATION",
      "APPROVAL",
    ] as const) {
      item = service.moveOpportunityStage({
        context: context({ expectedVersion: item.version }),
        opportunityId: item.id,
        nextStage,
      });
    }
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: item.version }),
          opportunityId: item.id,
          nextStage: "WON",
          initiatedByActorId: ACTOR,
        }),
      "SELF_APPROVAL_DENIED",
    );
    const won = service.moveOpportunityStage({
      context: context({ expectedVersion: item.version }),
      opportunityId: item.id,
      nextStage: "WON",
      initiatedByActorId: "different-initiator",
    });
    expect(won.stage).toBe("WON");
    expect(repository.snapshot().opportunities.size).toBe(1);
  });

  it("38 reopens a final Opportunity only through explicit audited authorization", () => {
    const { service } = setup();
    const party = person(service);
    let item = opportunity(service, party.id);
    item = service.moveOpportunityStage({
      context: context({ expectedVersion: item.version }),
      opportunityId: item.id,
      nextStage: "CANCELLED",
    });
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: item.version }),
          opportunityId: item.id,
          nextStage: "QUALIFICATION",
        }),
      "INVALID_STATE_TRANSITION",
    );
    const reopened = service.moveOpportunityStage({
      context: context({
        expectedVersion: item.version,
        reason: "manager authorized",
      }),
      opportunityId: item.id,
      nextStage: "QUALIFICATION",
      reopenAuthorized: true,
    });
    expect(reopened.history.at(-1)?.eventType).toBe("REOPENED");
  });
});
