import { describe, expect, it } from "vitest";

import {
  CustomerIdentityError,
  type CommandContext,
  type CreatePartyCommand,
} from "@/lib/customer-identity/contracts";
import { InMemoryCustomerIdentityRepository } from "@/lib/customer-identity/repository";
import { CustomerIdentityService } from "@/lib/customer-identity/service";
import type {
  OrganizationScopeAssignment,
  OrganizationSecurityRole,
} from "@/lib/organization/contracts";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";
const TEAM_A = "team-a";
const TEAM_B = "team-b";
const WRITER = "writer";
const APPROVER = "approver";

function assignment(
  userId: string,
  options: Readonly<{
    tenantId?: string;
    role?: OrganizationSecurityRole;
    scopeType?: OrganizationScopeAssignment["scopeType"];
    branchId?: string | null;
    teamId?: string | null;
    active?: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }> = {},
): OrganizationScopeAssignment {
  const scopeType = options.scopeType ?? "BRANCH";
  return {
    id: `assignment-${userId}-${scopeType}-${options.branchId ?? "company"}`,
    tenantId: options.tenantId ?? TENANT_A,
    userId,
    securityRole: options.role ?? "SALES_LEASING_MANAGER",
    scopeType,
    branchId: scopeType === "COMPANY" ? null : options.branchId ?? BRANCH_A,
    departmentId: null,
    teamId: scopeType === "TEAM" ? options.teamId ?? TEAM_A : null,
    assignedResourceType: null,
    assignedResourceId: null,
    active: options.active ?? true,
    startsAt: options.startsAt ?? null,
    endsAt: options.endsAt ?? null,
  };
}

function context(
  overrides: Partial<CommandContext> = {},
): CommandContext {
  const actorId = overrides.actorId ?? WRITER;
  const tenantId = overrides.tenantId ?? TENANT_A;
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
      [BRANCH_A, BRANCH_B].map((candidateBranchId) => ({
        branchId: candidateBranchId,
        serviceLine: "SALES" as const,
        enabled: true,
      })),
    idempotencyKey: overrides.idempotencyKey ?? null,
    expectedVersion: overrides.expectedVersion ?? null,
    reason: overrides.reason ?? "test reason",
    timestamp: overrides.timestamp ?? new Date("2026-07-26T09:00:00.000Z"),
    auditCorrelationId: overrides.auditCorrelationId ?? "corr-test",
  };
}

function setup(): Readonly<{
  repository: InMemoryCustomerIdentityRepository;
  service: CustomerIdentityService;
}> {
  const repository = new InMemoryCustomerIdentityRepository();
  return { repository, service: new CustomerIdentityService(repository) };
}

function createPartyCommand(
  type: CreatePartyCommand["type"],
  name: string,
  overrides: Partial<CreatePartyCommand> = {},
): CreatePartyCommand {
  return {
    context: overrides.context ?? context(),
    type,
    fields:
      overrides.fields ??
      (type === "PERSON"
        ? {
            displayName: { value: name, source: "USER_ENTERED" },
          }
        : {
            organizationName: { value: name, source: "USER_ENTERED" },
          }),
  };
}

function createPerson(
  service: CustomerIdentityService,
  name = "Ali Customer",
  commandContext = context(),
) {
  return service.createParty(createPartyCommand("PERSON", name, {
    context: commandContext,
  }));
}

function createLead(
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
    teamId: commandContext.scope.teamId ?? null,
  });
}

function createOpportunity(
  service: CustomerIdentityService,
  partyId: string,
  commandContext = context(),
) {
  return service.createOpportunity({
    context: commandContext,
    partyId,
    branchId: commandContext.scope.branchId ?? BRANCH_A,
    teamId: commandContext.scope.teamId ?? null,
    serviceLine: "SALES",
    expectedValue: 500000,
    probability: 40,
    creationSource: "DIRECT",
  });
}

function mergeContexts(branchId = BRANCH_A) {
  return {
    executor: context({
      scope: { branchId },
      idempotencyKey: "merge-key",
      reason: "confirmed duplicate",
      assignments: [assignment(WRITER, { branchId })],
    }),
    approverAssignments: [assignment(APPROVER, { branchId })],
  };
}

function expectCode(operation: () => unknown, code: CustomerIdentityError["code"]) {
  try {
    operation();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CustomerIdentityError);
    expect((error as CustomerIdentityError).code).toBe(code);
  }
}

describe("EXEC-005 customer identity and opportunity lifecycle", () => {
  it("1. creates a Person Party", () => {
    const { service } = setup();
    const party = createPerson(service);
    expect(party.type).toBe("PERSON");
    expect(party.lifecycleState).toBe("ACTIVE");
  });

  it("2. creates an Organization Party", () => {
    const { service } = setup();
    const party = service.createParty(
      createPartyCommand("ORGANIZATION", "ORCA Holdings"),
    );
    expect(party.type).toBe("ORGANIZATION");
    expect(party.fields.organizationName.value).toBe("ORCA Holdings");
  });

  it("3. creates multiple Leads for the same Party without duplicating identity", () => {
    const { repository, service } = setup();
    const party = createPerson(service);
    const first = createLead(service, party.id);
    const second = service.createLead({
      context: context(),
      partyId: party.id,
      serviceLine: "LEASING",
      source: "CAMPAIGN",
      campaignId: "campaign-2",
      branchId: BRANCH_A,
    });
    expect(first.partyId).toBe(party.id);
    expect(second.partyId).toBe(party.id);
    expect(repository.snapshot().parties.size).toBe(1);
    expect(repository.snapshot().leads.size).toBe(2);
  });

  it("4. creates multiple independent Opportunities for one Party", () => {
    const { repository, service } = setup();
    const party = createPerson(service);
    const first = createOpportunity(service, party.id);
    const second = createOpportunity(service, party.id);
    expect(first.id).not.toBe(second.id);
    expect(repository.snapshot().opportunities.size).toBe(2);
  });

  it("5. converts a Lead idempotently", () => {
    const { service } = setup();
    const lead = createLead(service, null);
    const conversionContext = context({
      idempotencyKey: "convert-one",
      expectedVersion: lead.version,
    });
    const command = {
      context: conversionContext,
      leadId: lead.id,
      createParty: {
        type: "PERSON" as const,
        fields: {
          displayName: { value: "Converted Person", source: "USER_ENTERED" as const },
        },
      },
      createCustomerAccount: true,
      customerRelationshipRoles: ["BUYER" as const],
      createOpportunity: true,
      opportunity: {
        expectedValue: 300000,
        probability: 30,
        creationSource: "LEAD_CONVERSION",
      },
    };
    const first = service.convertLead(command);
    const second = service.convertLead(command);
    expect(second.lead.id).toBe(first.lead.id);
    expect(second.party.id).toBe(first.party.id);
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
  });

  it("6. repeated conversion with a new key does not create a second Opportunity without an explicit request", () => {
    const { repository, service } = setup();
    const party = createPerson(service);
    const lead = createLead(service, party.id);
    const first = service.convertLead({
      context: context({ idempotencyKey: "convert-a" }),
      leadId: lead.id,
      createOpportunity: true,
      opportunity: {
        expectedValue: 100,
        probability: 10,
        creationSource: "LEAD_CONVERSION",
      },
    });
    const second = service.convertLead({
      context: context({ idempotencyKey: "convert-b" }),
      leadId: lead.id,
      createOpportunity: true,
      opportunity: {
        expectedValue: 200,
        probability: 20,
        creationSource: "LEAD_CONVERSION",
      },
    });
    expect(second.opportunity?.id).toBe(first.opportunity?.id);
    expect(repository.snapshot().opportunities.size).toBe(1);
  });

  it("7. detects an exact duplicate after normalization", () => {
    const { service } = setup();
    service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        displayName: { value: "Ali", source: "USER_ENTERED" },
        phone: { value: "050 123 4567", source: "VERIFIED", verified: true },
      },
    });
    const candidate = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        displayName: { value: "Different Name", source: "USER_ENTERED" },
        phone: { value: "+966501234567", source: "VERIFIED", verified: true },
      },
    });
    const suggestions = service.suggestDuplicates(context(), candidate.id);
    expect(suggestions[0].level).toBe("DETERMINISTIC_MATCH");
    expect(suggestions[0].reasons.map((reason) => reason.code)).toContain(
      "VERIFIED_PHONE_MATCH",
    );
  });

  it("8. explains a possible duplicate", () => {
    const { service } = setup();
    createPerson(service, "Mohammed Al Qahtani");
    const candidate = createPerson(service, "Mohammad Alqahtani");
    const suggestion = service.suggestDuplicates(context(), candidate.id)[0];
    expect(suggestion.level).toBe("POSSIBLE_MATCH");
    expect(suggestion.reasons[0].explanation.length).toBeGreaterThan(10);
  });

  it("9. never allows auto-merge from name similarity alone", () => {
    const { service } = setup();
    createPerson(service, "Sara Ahmed");
    const candidate = createPerson(service, "Sarah Ahmed");
    const suggestion = service.suggestDuplicates(context(), candidate.id)[0];
    expect(suggestion.level).toBe("POSSIBLE_MATCH");
    expect(suggestion.autoMergeAllowed).toBe(false);
  });

  it("10. produces a field-by-field Merge Preview", () => {
    const { service } = setup();
    const survivor = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        displayName: { value: "Primary", source: "VERIFIED", verified: true },
      },
    });
    const loser = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        displayName: { value: "Secondary", source: "USER_ENTERED" },
      },
    });
    const preview = service.previewMerge(
      context(),
      survivor.id,
      loser.id,
      [{ field: "displayName", sourcePartyId: survivor.id }],
    );
    expect(preview.conflicts).toContain("displayName");
    expect(preview.survivorBefore.id).toBe(survivor.id);
    expect(preview.mergedBefore.id).toBe(loser.id);
  });

  it("11. applies explicit field survivorship", () => {
    const { service } = setup();
    const survivor = createPerson(service, "Old Name");
    const loser = createPerson(service, "Chosen Name");
    const merge = mergeContexts();
    const record = service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [{ field: "displayName", sourcePartyId: loser.id }],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    expect(record.survivorAfter.fields.displayName.value).toBe("Chosen Name");
  });

  it("12. preserves provenance history during merge", () => {
    const { service } = setup();
    const survivor = createPerson(service, "A");
    const loser = createPerson(service, "B");
    const merge = mergeContexts();
    const record = service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [{ field: "displayName", sourcePartyId: loser.id }],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    expect(record.survivorAfter.fields.displayName.source).toBe("MERGED");
    expect(record.survivorAfter.fields.displayName.history.length).toBe(2);
  });

  it("13. transfers relationships but keeps Opportunities independent", () => {
    const { repository, service } = setup();
    const survivor = createPerson(service, "Survivor");
    const loser = createPerson(service, "Loser");
    const lead = createLead(service, loser.id);
    const firstOpportunity = createOpportunity(service, loser.id);
    const secondOpportunity = createOpportunity(service, loser.id);
    const merge = mergeContexts();
    service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    const snapshot = repository.snapshot();
    expect(snapshot.leads.get(lead.id)?.partyId).toBe(survivor.id);
    expect(snapshot.opportunities.get(firstOpportunity.id)?.partyId).toBe(
      survivor.id,
    );
    expect(snapshot.opportunities.get(secondOpportunity.id)?.partyId).toBe(
      survivor.id,
    );
    expect(snapshot.opportunities.size).toBe(2);
  });

  it("14. denies cross-tenant merge", () => {
    const { service } = setup();
    const survivor = createPerson(service);
    const tenantBContext = context({
      tenantId: TENANT_B,
      actorId: "writer-b",
      assignments: [
        assignment("writer-b", {
          tenantId: TENANT_B,
          branchId: BRANCH_A,
        }),
      ],
    });
    const outsider = createPerson(service, "Other Tenant", tenantBContext);
    const merge = mergeContexts();
    expectCode(
      () =>
        service.mergeParties({
          context: merge.executor,
          survivorPartyId: survivor.id,
          mergedPartyId: outsider.id,
          fieldChoices: [],
          approvedByActorId: APPROVER,
          approverAssignments: merge.approverAssignments,
        }),
      "TENANT_SCOPE_MISMATCH",
    );
  });

  it("15. denies cross-branch merge without company-wide authority", () => {
    const { service } = setup();
    const survivor = createPerson(service, "A", context({ scope: { branchId: BRANCH_A } }));
    const loser = createPerson(
      service,
      "B",
      context({
        scope: { branchId: BRANCH_B },
        assignments: [assignment(WRITER, { branchId: BRANCH_B })],
      }),
    );
    const merge = mergeContexts(BRANCH_A);
    expectCode(
      () =>
        service.mergeParties({
          context: merge.executor,
          survivorPartyId: survivor.id,
          mergedPartyId: loser.id,
          fieldChoices: [],
          approvedByActorId: APPROVER,
          approverAssignments: merge.approverAssignments,
        }),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("16. denies merge self-approval", () => {
    const { service } = setup();
    const survivor = createPerson(service, "A");
    const loser = createPerson(service, "B");
    expectCode(
      () =>
        service.mergeParties({
          context: context({ idempotencyKey: "merge-self" }),
          survivorPartyId: survivor.id,
          mergedPartyId: loser.id,
          fieldChoices: [],
          approvedByActorId: WRITER,
          approverAssignments: [assignment(WRITER)],
        }),
      "SELF_APPROVAL_DENIED",
    );
  });

  it("17. prevents merging the same losing Party twice", () => {
    const { service } = setup();
    const survivor = createPerson(service, "A");
    const loser = createPerson(service, "B");
    const third = createPerson(service, "C");
    const merge = mergeContexts();
    service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    expectCode(
      () =>
        service.mergeParties({
          context: context({
            idempotencyKey: "merge-second",
            reason: "second merge",
          }),
          survivorPartyId: third.id,
          mergedPartyId: loser.id,
          fieldChoices: [],
          approvedByActorId: APPROVER,
          approverAssignments: merge.approverAssignments,
        }),
      "DUPLICATE_MERGE_DENIED",
    );
  });

  it("18. reverses a safe merge and restores original relationships", () => {
    const { repository, service } = setup();
    const survivor = createPerson(service, "A");
    const loser = createPerson(service, "B");
    const lead = createLead(service, loser.id);
    const merge = mergeContexts();
    const record = service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    const reversed = service.reversePartyMerge(
      context({ reason: "merge was incorrect" }),
      record.id,
    );
    expect(reversed.reversedAt).not.toBeNull();
    expect(repository.snapshot().leads.get(lead.id)?.partyId).toBe(loser.id);
    expect(repository.snapshot().aliases.has(loser.id)).toBe(false);
  });

  it("19. blocks reversal after a recorded dependency", () => {
    const { service } = setup();
    const survivor = createPerson(service, "A");
    const loser = createPerson(service, "B");
    const merge = mergeContexts();
    const record = service.mergeParties({
      context: merge.executor,
      survivorPartyId: survivor.id,
      mergedPartyId: loser.id,
      fieldChoices: [],
      approvedByActorId: APPROVER,
      approverAssignments: merge.approverAssignments,
    });
    service.registerMergeDependency(context(), record.id, {
      type: "CONTRACT",
      id: "contract-1",
    });
    expectCode(
      () =>
        service.reversePartyMerge(
          context({ reason: "attempt reversal" }),
          record.id,
        ),
      "BLOCKED_BY_DEPENDENCY",
    );
  });

  it("20. preserves marketing opt-out without blocking separately granted transactional contact", () => {
    const { service } = setup();
    const party = createPerson(service);
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

  it("21. records consent withdrawal without deleting history", () => {
    const { service } = setup();
    const party = createPerson(service);
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
    expect(withdrawn.history.map((entry) => entry.consentState)).toEqual([
      "GRANTED",
      "WITHDRAWN",
    ]);
  });

  it("22. legal hold blocks deletion", () => {
    const { service } = setup();
    const party = createPerson(service);
    service.applyLegalHold(context({ reason: "litigation" }), party.id);
    expectCode(
      () =>
        service.requestDeletion(
          context({ reason: "customer request" }),
          party.id,
        ),
      "LEGAL_HOLD",
    );
  });

  it("23. archival preserves append-only audit evidence", () => {
    const { service } = setup();
    const party = createPerson(service);
    const before = service.listAudit(context()).length;
    const archived = service.archiveParty(
      context({ reason: "retention policy" }),
      party.id,
    );
    const audit = service.listAudit(context());
    expect(archived.lifecycleState).toBe("ARCHIVED");
    expect(audit.length).toBe(before + 1);
    expect(audit.at(-1)?.action).toBe("ArchiveParty");
  });

  it("24. denies a forged branch scope", () => {
    const { service } = setup();
    const forged = context({
      scope: { branchId: BRANCH_B },
      assignments: [assignment(WRITER, { branchId: BRANCH_A })],
    });
    expectCode(
      () => createPerson(service, "Forged", forged),
      "RESOURCE_SCOPE_DENIED",
    );
  });

  it("25. rejects an expired assignment", () => {
    const { service } = setup();
    const expired = context({
      timestamp: new Date("2026-07-26T09:00:00.000Z"),
      assignments: [
        assignment(WRITER, {
          branchId: BRANCH_A,
          endsAt: new Date("2026-07-26T08:59:59.000Z"),
        }),
      ],
    });
    expectCode(
      () => createPerson(service, "Expired", expired),
      "AUTHORITY_DENIED",
    );
  });

  it("26. fails closed when actor identity is missing", () => {
    const { service } = setup();
    expectCode(
      () =>
        createPerson(
          service,
          "Missing Actor",
          context({ actorId: "", assignments: [] }),
        ),
      "MISSING_ACTOR",
    );
  });

  it("27. rejects an optimistic concurrency conflict", () => {
    const { service } = setup();
    const party = createPerson(service);
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

  it("28. audit snapshots cannot mutate the repository audit", () => {
    const { repository, service } = setup();
    createPerson(service);
    const snapshot = repository.snapshot();
    snapshot.audit.push({
      sequence: 999,
      tenantId: TENANT_A,
      actorId: WRITER,
      action: "FORGED",
      entityType: "PARTY",
      entityId: "forged",
      beforeState: null,
      afterState: null,
      reason: null,
      correlationId: "forged",
      occurredAt: new Date(),
    });
    expect(service.listAudit(context()).some((entry) => entry.action === "FORGED"))
      .toBe(false);
  });

  it("29. Platform Owner has no automatic customer-data write authority", () => {
    const { service } = setup();
    const platformOwnerContext = context({
      actorId: "platform-owner",
      assignments: [
        assignment("platform-owner", {
          role: "PLATFORM_OWNER",
          branchId: BRANCH_A,
        }),
      ],
    });
    expectCode(
      () => createPerson(service, "Denied", platformOwnerContext),
      "AUTHORITY_DENIED",
    );
  });

  it("30. System Administrator has no automatic customer-data authority", () => {
    const { service } = setup();
    const administratorContext = context({
      actorId: "system-admin",
      assignments: [
        assignment("system-admin", {
          role: "SYSTEM_ADMINISTRATOR",
          branchId: BRANCH_A,
        }),
      ],
    });
    expectCode(
      () => createPerson(service, "Denied", administratorContext),
      "AUTHORITY_DENIED",
    );
  });

  it("31. prevents replacing a verified field with weaker provenance", () => {
    const { service } = setup();
    const party = service.createParty({
      context: context(),
      type: "PERSON",
      fields: {
        displayName: { value: "Ali", source: "USER_ENTERED" },
        nationalId: { value: "1234567890", source: "VERIFIED", verified: true },
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

  it("32. requires a reason for LOST and records stage history", () => {
    const { service } = setup();
    const party = createPerson(service);
    let opportunity = createOpportunity(service, party.id);
    opportunity = service.moveOpportunityStage({
      context: context({ expectedVersion: opportunity.version }),
      opportunityId: opportunity.id,
      nextStage: "QUALIFICATION",
    });
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: opportunity.version }),
          opportunityId: opportunity.id,
          nextStage: "LOST",
        }),
      "REASON_REQUIRED",
    );
    const lost = service.moveOpportunityStage({
      context: context({ expectedVersion: opportunity.version }),
      opportunityId: opportunity.id,
      nextStage: "LOST",
      outcomeReason: "budget mismatch",
    });
    expect(lost.history.at(-1)?.previousStage).toBe("QUALIFICATION");
    expect(lost.stage).toBe("LOST");
  });

  it("33. WON does not create contracts and rejects self-approval", () => {
    const { repository, service } = setup();
    const party = createPerson(service);
    let opportunity = createOpportunity(service, party.id);
    for (const nextStage of [
      "QUALIFICATION",
      "NEEDS_ANALYSIS",
      "PROPOSAL",
      "NEGOTIATION",
      "APPROVAL",
    ] as const) {
      opportunity = service.moveOpportunityStage({
        context: context({ expectedVersion: opportunity.version }),
        opportunityId: opportunity.id,
        nextStage,
      });
    }
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: opportunity.version }),
          opportunityId: opportunity.id,
          nextStage: "WON",
          initiatedByActorId: WRITER,
        }),
      "SELF_APPROVAL_DENIED",
    );
    const won = service.moveOpportunityStage({
      context: context({ expectedVersion: opportunity.version }),
      opportunityId: opportunity.id,
      nextStage: "WON",
      initiatedByActorId: "initiator-other",
    });
    expect(won.stage).toBe("WON");
    expect(repository.snapshot().opportunities.size).toBe(1);
  });

  it("34. permits audited reopen only with explicit authorization", () => {
    const { service } = setup();
    const party = createPerson(service);
    let opportunity = createOpportunity(service, party.id);
    opportunity = service.moveOpportunityStage({
      context: context({ expectedVersion: opportunity.version }),
      opportunityId: opportunity.id,
      nextStage: "CANCELLED",
    });
    expectCode(
      () =>
        service.moveOpportunityStage({
          context: context({ expectedVersion: opportunity.version }),
          opportunityId: opportunity.id,
          nextStage: "QUALIFICATION",
        }),
      "INVALID_STATE_TRANSITION",
    );
    const reopened = service.moveOpportunityStage({
      context: context({
        expectedVersion: opportunity.version,
        reason: "manager-approved reopen",
      }),
      opportunityId: opportunity.id,
      nextStage: "QUALIFICATION",
      reopenAuthorized: true,
    });
    expect(reopened.history.at(-1)?.eventType).toBe("REOPENED");
  });
});
