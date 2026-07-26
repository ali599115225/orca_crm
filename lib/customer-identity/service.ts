import {
  CustomerIdentityError,
  type AuditEntry,
  type CommandContext,
  type CommunicationPreference,
  type CreateLeadCommand,
  type CreateOpportunityCommand,
  type CreatePartyCommand,
  type CustomerAccount,
  type CustomerIdentityState,
  type CustomerLead,
  type CustomerOpportunity,
  type DuplicateReason,
  type DuplicateSuggestion,
  type FieldProvenanceSource,
  type MergeFieldChoice,
  type MergePartiesCommand,
  type MergePreview,
  type MoveOpportunityStageCommand,
  type OpportunityStage,
  type Party,
  type PartyField,
  type PartyFieldInput,
  type PartyMergeRecord,
  type ReassignOpportunityCommand,
  type ResourceScope,
  type SetCommunicationPreferenceCommand,
  type UpdatePartyFieldCommand,
  type ConvertLeadCommand,
} from "@/lib/customer-identity/contracts";
import {
  assertCustomerAuthority,
  validateCommandContext,
} from "@/lib/customer-identity/authority";
import {
  normalizePartyField,
  similarity,
} from "@/lib/customer-identity/normalize";
import {
  appendAudit,
  nextEntityId,
  type CustomerIdentityRepository,
} from "@/lib/customer-identity/repository";

const PROTECTED_FIELDS = new Set([
  "nationalId",
  "residencyId",
  "commercialRegistry",
  "externalId",
  "verificationStatus",
  "consentSource",
  "doNotContact",
]);

const STRONG_MATCH_FIELDS = [
  "nationalId",
  "residencyId",
  "commercialRegistry",
  "externalId",
  "email",
  "phone",
] as const;

const FINAL_OPPORTUNITY_STAGES = new Set<OpportunityStage>([
  "WON",
  "LOST",
  "CANCELLED",
]);

const OPPORTUNITY_TRANSITIONS: Readonly<
  Record<OpportunityStage, readonly OpportunityStage[]>
> = {
  NEW: ["QUALIFICATION", "CANCELLED"],
  QUALIFICATION: ["NEEDS_ANALYSIS", "LOST", "CANCELLED"],
  NEEDS_ANALYSIS: ["PROPOSAL", "LOST", "CANCELLED"],
  PROPOSAL: ["NEGOTIATION", "LOST", "CANCELLED"],
  NEGOTIATION: ["APPROVAL", "LOST", "CANCELLED"],
  APPROVAL: ["WON", "LOST", "CANCELLED"],
  WON: [],
  LOST: [],
  CANCELLED: [],
};

const PROVENANCE_STRENGTH: Readonly<Record<FieldProvenanceSource, number>> = {
  DERIVED: 1,
  INTEGRATION: 2,
  IMPORTED: 3,
  USER_ENTERED: 4,
  SYSTEM: 4,
  MERGED: 5,
  VERIFIED: 6,
};

function now(context: CommandContext): Date {
  return context.timestamp ?? new Date();
}

function requireReason(context: CommandContext, operation: string): string {
  const reason = context.reason?.trim();
  if (!reason) {
    throw new CustomerIdentityError(
      "MISSING_REASON",
      `${operation} requires a reason`,
    );
  }
  return reason;
}

function requireIdempotencyKey(
  context: CommandContext,
  operation: string,
): string {
  const key = context.idempotencyKey?.trim();
  if (!key) {
    throw new CustomerIdentityError(
      "MISSING_IDEMPOTENCY_KEY",
      `${operation} requires an idempotency key`,
    );
  }
  return key;
}

function assertExpectedVersion(
  expectedVersion: number | null | undefined,
  actualVersion: number,
): void {
  if (expectedVersion !== null && expectedVersion !== undefined) {
    if (expectedVersion !== actualVersion) {
      throw new CustomerIdentityError(
        "CONCURRENCY_CONFLICT",
        "Expected version does not match current version",
        { expectedVersion, actualVersion },
      );
    }
  }
}

function resourceForParty(party: Party): ResourceScope {
  return {
    branchId: party.branchId,
    departmentId: party.departmentId,
    teamId: party.teamId,
    resourceType: "PARTY",
    resourceId: party.id,
  };
}

function resourceForLead(lead: CustomerLead): ResourceScope {
  return {
    branchId: lead.branchId,
    departmentId: lead.departmentId,
    teamId: lead.teamId,
    resourceType: "LEAD",
    resourceId: lead.id,
  };
}

function resourceForOpportunity(
  opportunity: CustomerOpportunity,
): ResourceScope {
  return {
    branchId: opportunity.branchId,
    departmentId: opportunity.departmentId,
    teamId: opportunity.teamId,
    resourceType: "OPPORTUNITY",
    resourceId: opportunity.id,
  };
}

function createField(
  field: string,
  input: PartyFieldInput,
  context: CommandContext,
): PartyField {
  const timestamp = now(context);
  return {
    value: input.value,
    normalizedValue: normalizePartyField(field, input.value),
    source: input.source,
    verified: input.verified ?? input.source === "VERIFIED",
    protected: input.protected ?? PROTECTED_FIELDS.has(field),
    updatedAt: timestamp,
    updatedByActorId: context.actorId,
    history: [
      {
        value: input.value,
        source: input.source,
        changedAt: timestamp,
        changedByActorId: context.actorId,
        correlationId: context.auditCorrelationId,
      },
    ],
  };
}

function resolvePartyId(state: CustomerIdentityState, partyId: string): string {
  return state.aliases.get(partyId) ?? partyId;
}

function requireParty(
  state: CustomerIdentityState,
  tenantId: string,
  partyId: string,
  resolveAlias = true,
): Party {
  const resolvedId = resolveAlias ? resolvePartyId(state, partyId) : partyId;
  const party = state.parties.get(resolvedId);
  if (!party) {
    throw new CustomerIdentityError("NOT_FOUND", "Party was not found", {
      partyId,
    });
  }
  if (party.tenantId !== tenantId) {
    throw new CustomerIdentityError(
      "TENANT_SCOPE_MISMATCH",
      "Party tenant does not match command tenant",
    );
  }
  return party;
}

function requireLead(
  state: CustomerIdentityState,
  tenantId: string,
  leadId: string,
): CustomerLead {
  const lead = state.leads.get(leadId);
  if (!lead) {
    throw new CustomerIdentityError("NOT_FOUND", "Lead was not found", {
      leadId,
    });
  }
  if (lead.tenantId !== tenantId) {
    throw new CustomerIdentityError(
      "TENANT_SCOPE_MISMATCH",
      "Lead tenant does not match command tenant",
    );
  }
  return lead;
}

function requireOpportunity(
  state: CustomerIdentityState,
  tenantId: string,
  opportunityId: string,
): CustomerOpportunity {
  const opportunity = state.opportunities.get(opportunityId);
  if (!opportunity) {
    throw new CustomerIdentityError(
      "NOT_FOUND",
      "Opportunity was not found",
      { opportunityId },
    );
  }
  if (opportunity.tenantId !== tenantId) {
    throw new CustomerIdentityError(
      "TENANT_SCOPE_MISMATCH",
      "Opportunity tenant does not match command tenant",
    );
  }
  return opportunity;
}

function writeAudit(
  state: CustomerIdentityState,
  context: CommandContext,
  action: string,
  entityType: string,
  entityId: string,
  beforeState: unknown,
  afterState: unknown,
): AuditEntry {
  return appendAudit(state, {
    tenantId: context.tenantId,
    actorId: context.actorId,
    action,
    entityType,
    entityId,
    beforeState,
    afterState,
    reason: context.reason ?? null,
    correlationId: context.auditCorrelationId,
    occurredAt: now(context),
  });
}

function createPartyInState(
  state: CustomerIdentityState,
  command: CreatePartyCommand,
): Party {
  validateCommandContext(command.context);
  const context = command.context;
  const branchId = context.scope.branchId ?? null;
  assertCustomerAuthority(context, "WRITE", {
    ...context.scope,
    resourceType: "PARTY",
    resourceId: "NEW",
  });

  const id = nextEntityId(state, "party");
  if (state.aliases.has(id)) {
    throw new CustomerIdentityError(
      "ALIAS_REUSE_DENIED",
      "A merged alias cannot be reused as a new Party ID",
    );
  }

  const timestamp = now(context);
  const fields = Object.fromEntries(
    Object.entries(command.fields).map(([field, input]) => [
      field,
      createField(field, input, context),
    ]),
  );
  const party: Party = {
    id,
    tenantId: context.tenantId,
    type: command.type,
    lifecycleState: "ACTIVE",
    branchId,
    departmentId: context.scope.departmentId ?? null,
    teamId: context.scope.teamId ?? null,
    fields,
    aliases: [],
    mergedIntoPartyId: null,
    legalHoldReason: null,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdByActorId: context.actorId,
  };
  state.parties.set(id, party);
  writeAudit(state, context, "CreateParty", "PARTY", id, null, party);
  return party;
}

function createCustomerAccountInState(
  state: CustomerIdentityState,
  context: CommandContext,
  party: Party,
  relationshipRoles: CustomerAccount["relationshipRoles"],
): CustomerAccount {
  assertCustomerAuthority(context, "WRITE", resourceForParty(party));
  const timestamp = now(context);
  const account: CustomerAccount = {
    id: nextEntityId(state, "account"),
    tenantId: context.tenantId,
    partyId: party.id,
    relationshipRoles: [...new Set(relationshipRoles)],
    organizationContactPartyIds: [],
    lifecycleState: "ACTIVE",
    branchId: party.branchId,
    departmentId: party.departmentId,
    teamId: party.teamId,
    ownerUserId: context.actorId,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.customerAccounts.set(account.id, account);
  writeAudit(
    state,
    context,
    "CreateCustomerAccount",
    "CUSTOMER_ACCOUNT",
    account.id,
    null,
    account,
  );
  return account;
}

function createOpportunityInState(
  state: CustomerIdentityState,
  command: CreateOpportunityCommand,
): CustomerOpportunity {
  const context = command.context;
  validateCommandContext(context);
  if (!command.partyId && !command.customerAccountId) {
    throw new CustomerIdentityError(
      "VALIDATION_ERROR",
      "Opportunity requires a Party or Customer Account",
    );
  }
  if (command.probability < 0 || command.probability > 100) {
    throw new CustomerIdentityError(
      "VALIDATION_ERROR",
      "Opportunity probability must be between 0 and 100",
    );
  }
  if (command.expectedValue < 0) {
    throw new CustomerIdentityError(
      "VALIDATION_ERROR",
      "Opportunity expected value cannot be negative",
    );
  }

  assertCustomerAuthority(context, "WRITE", {
    branchId: command.branchId,
    departmentId: command.departmentId,
    teamId: command.teamId,
    resourceType: "OPPORTUNITY",
    resourceId: "NEW",
  });

  const partyId = command.partyId
    ? requireParty(state, context.tenantId, command.partyId).id
    : null;
  const account = command.customerAccountId
    ? state.customerAccounts.get(command.customerAccountId)
    : null;
  if (command.customerAccountId && !account) {
    throw new CustomerIdentityError(
      "NOT_FOUND",
      "Customer Account was not found",
    );
  }
  if (account && account.tenantId !== context.tenantId) {
    throw new CustomerIdentityError(
      "TENANT_SCOPE_MISMATCH",
      "Customer Account tenant does not match command tenant",
    );
  }
  if (command.sourceLeadId) {
    requireLead(state, context.tenantId, command.sourceLeadId);
  }

  const timestamp = now(context);
  const opportunity: CustomerOpportunity = {
    id: nextEntityId(state, "opportunity"),
    tenantId: context.tenantId,
    partyId: partyId ?? account?.partyId ?? null,
    customerAccountId: account?.id ?? null,
    sourceLeadId: command.sourceLeadId ?? null,
    legacyOpportunityId: command.legacyOpportunityId ?? null,
    branchId: command.branchId,
    departmentId: command.departmentId ?? null,
    teamId: command.teamId ?? null,
    ownerUserId: command.ownerUserId ?? null,
    serviceLine: command.serviceLine,
    projectId: command.projectId ?? null,
    unitId: command.unitId ?? null,
    expectedValue: command.expectedValue,
    stage: "NEW",
    probability: command.probability,
    expectedCloseAt: command.expectedCloseAt ?? null,
    outcomeReason: null,
    creationSource: command.creationSource,
    version: 1,
    history: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.opportunities.set(opportunity.id, opportunity);
  writeAudit(
    state,
    context,
    "CreateOpportunity",
    "OPPORTUNITY",
    opportunity.id,
    null,
    opportunity,
  );
  return opportunity;
}

function duplicateReasons(candidate: Party, other: Party): DuplicateReason[] {
  const reasons: DuplicateReason[] = [];

  for (const field of STRONG_MATCH_FIELDS) {
    const left = candidate.fields[field];
    const right = other.fields[field];
    if (
      !left?.normalizedValue ||
      !right?.normalizedValue ||
      left.normalizedValue !== right.normalizedValue
    ) {
      continue;
    }

    if (field === "nationalId" || field === "residencyId") {
      if (left.verified && right.verified) {
        reasons.push({
          field,
          code: "VERIFIED_IDENTITY_MATCH",
          explanation: "Verified normalized identity identifiers match",
        });
      }
    } else if (field === "commercialRegistry") {
      if (left.verified && right.verified) {
        reasons.push({
          field,
          code: "VERIFIED_COMMERCIAL_REGISTRY_MATCH",
          explanation: "Verified normalized commercial registries match",
        });
      }
    } else if (field === "externalId") {
      if (left.verified && right.verified) {
        reasons.push({
          field,
          code: "TRUSTED_EXTERNAL_ID_MATCH",
          explanation: "Trusted normalized external identifiers match",
        });
      }
    } else if (field === "email") {
      reasons.push({
        field,
        code:
          left.verified && right.verified
            ? "VERIFIED_EMAIL_MATCH"
            : "UNVERIFIED_EMAIL_MATCH",
        explanation: "Normalized email values match",
      });
    } else if (field === "phone") {
      reasons.push({
        field,
        code:
          left.verified && right.verified
            ? "VERIFIED_PHONE_MATCH"
            : "UNVERIFIED_PHONE_MATCH",
        explanation: "Normalized phone values match",
      });
    }
  }

  const nameFields =
    candidate.type === "ORGANIZATION"
      ? (["organizationName"] as const)
      : (["displayName", "firstName"] as const);
  for (const field of nameFields) {
    const left = candidate.fields[field]?.normalizedValue;
    const right = other.fields[field]?.normalizedValue;
    if (left && right && similarity(left, right) >= 0.82) {
      reasons.push({
        field,
        code:
          candidate.type === "ORGANIZATION"
            ? "ORGANIZATION_NAME_SIMILARITY"
            : "NAME_SIMILARITY",
        explanation: "Normalized names are similar and require human review",
      });
      break;
    }
  }

  for (const [field, code] of [
    ["dateOfBirth", "DATE_OF_BIRTH_MATCH"],
    ["city", "CITY_MATCH"],
    ["employer", "EMPLOYER_MATCH"],
  ] as const) {
    const left = candidate.fields[field]?.normalizedValue;
    const right = other.fields[field]?.normalizedValue;
    if (left && right && left === right) {
      reasons.push({
        field,
        code,
        explanation: `Normalized ${field} values match`,
      });
    }
  }

  return reasons;
}

function isDeterministic(reasons: readonly DuplicateReason[]): boolean {
  return reasons.some((reason) =>
    [
      "VERIFIED_IDENTITY_MATCH",
      "VERIFIED_COMMERCIAL_REGISTRY_MATCH",
      "TRUSTED_EXTERNAL_ID_MATCH",
      "VERIFIED_EMAIL_MATCH",
      "VERIFIED_PHONE_MATCH",
    ].includes(reason.code),
  );
}

export class CustomerIdentityService {
  constructor(private readonly repository: CustomerIdentityRepository) {}

  createParty(command: CreatePartyCommand): Party {
    return this.repository.transaction((state) =>
      createPartyInState(state, command),
    );
  }

  getParty(context: CommandContext, partyId: string): Party {
    return this.repository.read((state) => {
      const party = requireParty(
        state as CustomerIdentityState,
        context.tenantId,
        partyId,
      );
      assertCustomerAuthority(context, "READ", resourceForParty(party));
      return party;
    });
  }

  updatePartyField(command: UpdatePartyFieldCommand): Party {
    return this.repository.transaction((state) => {
      const context = command.context;
      const party = requireParty(state, context.tenantId, command.partyId);
      assertCustomerAuthority(context, "WRITE", resourceForParty(party));
      assertExpectedVersion(context.expectedVersion, party.version);
      const current = party.fields[command.field];
      if (
        current?.verified &&
        PROVENANCE_STRENGTH[command.source] < PROVENANCE_STRENGTH.VERIFIED &&
        !command.elevatedVerifiedOverride
      ) {
        throw new CustomerIdentityError(
          "VERIFIED_FIELD_DOWNGRADE_DENIED",
          "A verified field cannot be replaced by weaker provenance",
          { field: command.field },
        );
      }

      const timestamp = now(context);
      const replacement: PartyField = {
        value: command.value,
        normalizedValue: normalizePartyField(command.field, command.value),
        source: command.source,
        verified: command.source === "VERIFIED",
        protected: current?.protected ?? PROTECTED_FIELDS.has(command.field),
        updatedAt: timestamp,
        updatedByActorId: context.actorId,
        history: [
          ...(current?.history ?? []),
          {
            value: command.value,
            source: command.source,
            changedAt: timestamp,
            changedByActorId: context.actorId,
            correlationId: context.auditCorrelationId,
          },
        ],
      };
      const updated: Party = {
        ...party,
        fields: { ...party.fields, [command.field]: replacement },
        version: party.version + 1,
        updatedAt: timestamp,
      };
      state.parties.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "UpdatePartyField",
        "PARTY",
        updated.id,
        party,
        updated,
      );
      return updated;
    });
  }

  verifyIdentityField(
    command: Omit<UpdatePartyFieldCommand, "source">,
  ): Party {
    return this.updatePartyField({ ...command, source: "VERIFIED" });
  }

  createCustomerAccount(
    context: CommandContext,
    partyId: string,
    relationshipRoles: CustomerAccount["relationshipRoles"],
  ): CustomerAccount {
    return this.repository.transaction((state) => {
      const party = requireParty(state, context.tenantId, partyId);
      return createCustomerAccountInState(
        state,
        context,
        party,
        relationshipRoles,
      );
    });
  }

  createLead(command: CreateLeadCommand): CustomerLead {
    return this.repository.transaction((state) => {
      const context = command.context;
      validateCommandContext(context);
      assertCustomerAuthority(context, "WRITE", {
        branchId: command.branchId,
        departmentId: command.departmentId,
        teamId: command.teamId,
        resourceType: "LEAD",
        resourceId: "NEW",
      });

      const party = command.partyId
        ? requireParty(state, context.tenantId, command.partyId)
        : null;
      const account = command.customerAccountId
        ? state.customerAccounts.get(command.customerAccountId)
        : null;
      if (command.customerAccountId && !account) {
        throw new CustomerIdentityError(
          "NOT_FOUND",
          "Customer Account was not found",
        );
      }
      if (account && account.tenantId !== context.tenantId) {
        throw new CustomerIdentityError(
          "TENANT_SCOPE_MISMATCH",
          "Customer Account tenant does not match command tenant",
        );
      }

      const timestamp = now(context);
      const lead: CustomerLead = {
        id: nextEntityId(state, "lead"),
        tenantId: context.tenantId,
        partyId: party?.id ?? account?.partyId ?? null,
        customerAccountId: account?.id ?? null,
        legacyLeadId: command.legacyLeadId ?? null,
        serviceLine: command.serviceLine,
        projectId: command.projectId ?? null,
        unitId: command.unitId ?? null,
        source: command.source,
        campaignId: command.campaignId ?? null,
        purpose: command.purpose ?? null,
        branchId: command.branchId,
        departmentId: command.departmentId ?? null,
        teamId: command.teamId ?? null,
        ownerUserId: command.ownerUserId ?? null,
        stage: "NEW",
        disqualificationReason: null,
        conversion: null,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.leads.set(lead.id, lead);
      writeAudit(state, context, "CreateLead", "LEAD", lead.id, null, lead);
      return lead;
    });
  }

  qualifyLead(context: CommandContext, leadId: string): CustomerLead {
    return this.repository.transaction((state) => {
      const lead = requireLead(state, context.tenantId, leadId);
      assertCustomerAuthority(context, "WRITE", resourceForLead(lead));
      assertExpectedVersion(context.expectedVersion, lead.version);
      if (["CONVERTED", "ARCHIVED", "DISQUALIFIED"].includes(lead.stage)) {
        throw new CustomerIdentityError(
          "INVALID_STATE_TRANSITION",
          `Lead cannot be qualified from ${lead.stage}`,
        );
      }
      const updated: CustomerLead = {
        ...lead,
        stage: "QUALIFIED",
        version: lead.version + 1,
        updatedAt: now(context),
      };
      state.leads.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "QualifyLead",
        "LEAD",
        lead.id,
        lead,
        updated,
      );
      return updated;
    });
  }

  disqualifyLead(context: CommandContext, leadId: string): CustomerLead {
    return this.repository.transaction((state) => {
      const lead = requireLead(state, context.tenantId, leadId);
      assertCustomerAuthority(context, "WRITE", resourceForLead(lead));
      const reason = requireReason(context, "DisqualifyLead");
      assertExpectedVersion(context.expectedVersion, lead.version);
      const updated: CustomerLead = {
        ...lead,
        stage: "DISQUALIFIED",
        disqualificationReason: reason,
        version: lead.version + 1,
        updatedAt: now(context),
      };
      state.leads.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "DisqualifyLead",
        "LEAD",
        lead.id,
        lead,
        updated,
      );
      return updated;
    });
  }

  reopenLead(context: CommandContext, leadId: string): CustomerLead {
    return this.repository.transaction((state) => {
      const lead = requireLead(state, context.tenantId, leadId);
      assertCustomerAuthority(context, "WRITE", resourceForLead(lead));
      requireReason(context, "ReopenLead");
      if (!["DISQUALIFIED", "ARCHIVED"].includes(lead.stage)) {
        throw new CustomerIdentityError(
          "INVALID_STATE_TRANSITION",
          "Only disqualified or archived Leads may be reopened",
        );
      }
      const updated: CustomerLead = {
        ...lead,
        stage: "QUALIFYING",
        disqualificationReason: null,
        version: lead.version + 1,
        updatedAt: now(context),
      };
      state.leads.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "ReopenLead",
        "LEAD",
        lead.id,
        lead,
        updated,
      );
      return updated;
    });
  }

  convertLead(command: ConvertLeadCommand): Readonly<{
    lead: CustomerLead;
    party: Party;
    customerAccount: CustomerAccount | null;
    opportunity: CustomerOpportunity | null;
  }> {
    return this.repository.transaction((state) => {
      const context = command.context;
      const key = requireIdempotencyKey(context, "ConvertLead");
      const cacheKey = `ConvertLead:${context.tenantId}:${command.leadId}:${key}`;
      const cached = state.idempotencyResults.get(cacheKey);
      if (cached) {
        return cached as Readonly<{
          lead: CustomerLead;
          party: Party;
          customerAccount: CustomerAccount | null;
          opportunity: CustomerOpportunity | null;
        }>;
      }

      const lead = requireLead(state, context.tenantId, command.leadId);
      assertCustomerAuthority(context, "CONVERT", resourceForLead(lead));
      assertExpectedVersion(context.expectedVersion, lead.version);

      if (lead.conversion && !command.allowAdditionalOpportunityExplicit) {
        const existingParty = requireParty(
          state,
          context.tenantId,
          lead.conversion.partyId,
        );
        const existingAccount = lead.conversion.customerAccountId
          ? state.customerAccounts.get(lead.conversion.customerAccountId) ?? null
          : null;
        const existingOpportunity = lead.conversion.opportunityId
          ? state.opportunities.get(lead.conversion.opportunityId) ?? null
          : null;
        const existingResult = {
          lead,
          party: existingParty,
          customerAccount: existingAccount,
          opportunity: existingOpportunity,
        };
        state.idempotencyResults.set(cacheKey, existingResult);
        return existingResult;
      }

      let party = lead.partyId
        ? requireParty(state, context.tenantId, lead.partyId)
        : null;
      if (!party) {
        if (!command.createParty) {
          throw new CustomerIdentityError(
            "VALIDATION_ERROR",
            "Lead conversion requires an existing Party or CreateParty input",
          );
        }
        party = createPartyInState(state, {
          context: {
            ...context,
            scope: {
              branchId: lead.branchId,
              departmentId: lead.departmentId,
              teamId: lead.teamId,
            },
          },
          type: command.createParty.type,
          fields: command.createParty.fields,
        });
      }

      let customerAccount = lead.customerAccountId
        ? state.customerAccounts.get(lead.customerAccountId) ?? null
        : null;
      if (!customerAccount && command.createCustomerAccount) {
        customerAccount = createCustomerAccountInState(
          state,
          context,
          party,
          command.customerRelationshipRoles ?? ["OTHER"],
        );
      }

      let opportunity: CustomerOpportunity | null = null;
      if (command.createOpportunity) {
        if (!command.opportunity) {
          throw new CustomerIdentityError(
            "VALIDATION_ERROR",
            "CreateOpportunity input is required",
          );
        }
        opportunity = createOpportunityInState(state, {
          context,
          partyId: party.id,
          customerAccountId: customerAccount?.id ?? null,
          sourceLeadId: lead.id,
          branchId: lead.branchId,
          departmentId: lead.departmentId,
          teamId: lead.teamId,
          ownerUserId: lead.ownerUserId,
          serviceLine: lead.serviceLine,
          projectId: command.opportunity.projectId ?? lead.projectId,
          unitId: command.opportunity.unitId ?? lead.unitId,
          expectedValue: command.opportunity.expectedValue,
          probability: command.opportunity.probability,
          expectedCloseAt: command.opportunity.expectedCloseAt,
          creationSource: command.opportunity.creationSource,
        });
      }

      const converted: CustomerLead = {
        ...lead,
        partyId: party.id,
        customerAccountId: customerAccount?.id ?? null,
        stage: "CONVERTED",
        conversion: {
          convertedAt: now(context),
          convertedByActorId: context.actorId,
          partyId: party.id,
          customerAccountId: customerAccount?.id ?? null,
          opportunityId: opportunity?.id ?? null,
          idempotencyKey: key,
        },
        version: lead.version + 1,
        updatedAt: now(context),
      };
      state.leads.set(converted.id, converted);
      writeAudit(
        state,
        context,
        "ConvertLead",
        "LEAD",
        converted.id,
        lead,
        converted,
      );
      const result = {
        lead: converted,
        party,
        customerAccount,
        opportunity,
      };
      state.idempotencyResults.set(cacheKey, result);
      return result;
    });
  }

  createOpportunity(command: CreateOpportunityCommand): CustomerOpportunity {
    return this.repository.transaction((state) =>
      createOpportunityInState(state, command),
    );
  }

  moveOpportunityStage(
    command: MoveOpportunityStageCommand,
  ): CustomerOpportunity {
    return this.repository.transaction((state) => {
      const context = command.context;
      const opportunity = requireOpportunity(
        state,
        context.tenantId,
        command.opportunityId,
      );
      assertCustomerAuthority(
        context,
        "OPPORTUNITY_STAGE",
        resourceForOpportunity(opportunity),
      );
      assertExpectedVersion(context.expectedVersion, opportunity.version);

      const isReopen = FINAL_OPPORTUNITY_STAGES.has(opportunity.stage);
      if (isReopen) {
        if (!command.reopenAuthorized || command.nextStage !== "QUALIFICATION") {
          throw new CustomerIdentityError(
            "INVALID_STATE_TRANSITION",
            "Final Opportunity stage requires an authorized audited reopen",
          );
        }
        requireReason(context, "ReopenOpportunity");
      } else if (
        !OPPORTUNITY_TRANSITIONS[opportunity.stage].includes(command.nextStage)
      ) {
        throw new CustomerIdentityError(
          "INVALID_STATE_TRANSITION",
          `Opportunity cannot move from ${opportunity.stage} to ${command.nextStage}`,
        );
      }

      if (command.nextStage === "LOST" && !command.outcomeReason?.trim()) {
        throw new CustomerIdentityError(
          "REASON_REQUIRED",
          "LOST requires an outcome reason",
        );
      }
      if (
        command.nextStage === "WON" &&
        (!command.initiatedByActorId ||
          command.initiatedByActorId === context.actorId)
      ) {
        throw new CustomerIdentityError(
          "SELF_APPROVAL_DENIED",
          "WON requires independent initiator evidence",
        );
      }

      const timestamp = now(context);
      const updated: CustomerOpportunity = {
        ...opportunity,
        stage: command.nextStage,
        outcomeReason: command.outcomeReason ?? null,
        version: opportunity.version + 1,
        updatedAt: timestamp,
        history: [
          ...opportunity.history,
          {
            eventType: isReopen ? "REOPENED" : "STAGE_CHANGED",
            previousStage: opportunity.stage,
            nextStage: command.nextStage,
            previousExpectedValue: opportunity.expectedValue,
            nextExpectedValue: opportunity.expectedValue,
            previousOwnerUserId: opportunity.ownerUserId,
            nextOwnerUserId: opportunity.ownerUserId,
            previousBranchId: opportunity.branchId,
            nextBranchId: opportunity.branchId,
            previousTeamId: opportunity.teamId,
            nextTeamId: opportunity.teamId,
            changedAt: timestamp,
            changedByActorId: context.actorId,
            correlationId: context.auditCorrelationId,
            reason: context.reason ?? command.outcomeReason ?? null,
          },
        ],
      };
      state.opportunities.set(updated.id, updated);
      writeAudit(
        state,
        context,
        isReopen ? "ReopenOpportunity" : "MoveOpportunityStage",
        "OPPORTUNITY",
        updated.id,
        opportunity,
        updated,
      );
      return updated;
    });
  }

  reassignOpportunity(
    command: ReassignOpportunityCommand,
  ): CustomerOpportunity {
    return this.repository.transaction((state) => {
      const context = command.context;
      const opportunity = requireOpportunity(
        state,
        context.tenantId,
        command.opportunityId,
      );
      requireReason(context, "ReassignOpportunity");
      assertCustomerAuthority(
        context,
        "OPPORTUNITY_REASSIGN",
        resourceForOpportunity(opportunity),
      );
      assertCustomerAuthority(context, "OPPORTUNITY_REASSIGN", {
        branchId: command.nextBranchId,
        departmentId: command.nextDepartmentId,
        teamId: command.nextTeamId,
        resourceType: "OPPORTUNITY",
        resourceId: opportunity.id,
      });
      assertExpectedVersion(context.expectedVersion, opportunity.version);

      const timestamp = now(context);
      const updated: CustomerOpportunity = {
        ...opportunity,
        branchId: command.nextBranchId,
        departmentId: command.nextDepartmentId ?? null,
        teamId: command.nextTeamId ?? null,
        ownerUserId: command.nextOwnerUserId ?? null,
        version: opportunity.version + 1,
        updatedAt: timestamp,
        history: [
          ...opportunity.history,
          {
            eventType: "REASSIGNED",
            previousStage: opportunity.stage,
            nextStage: opportunity.stage,
            previousExpectedValue: opportunity.expectedValue,
            nextExpectedValue: opportunity.expectedValue,
            previousOwnerUserId: opportunity.ownerUserId,
            nextOwnerUserId: command.nextOwnerUserId ?? null,
            previousBranchId: opportunity.branchId,
            nextBranchId: command.nextBranchId,
            previousTeamId: opportunity.teamId,
            nextTeamId: command.nextTeamId ?? null,
            changedAt: timestamp,
            changedByActorId: context.actorId,
            correlationId: context.auditCorrelationId,
            reason: context.reason ?? null,
          },
        ],
      };
      state.opportunities.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "ReassignOpportunity",
        "OPPORTUNITY",
        updated.id,
        opportunity,
        updated,
      );
      return updated;
    });
  }

  suggestDuplicates(
    context: CommandContext,
    candidatePartyId: string,
  ): readonly DuplicateSuggestion[] {
    return this.repository.transaction((state) => {
      const candidate = requireParty(
        state,
        context.tenantId,
        candidatePartyId,
      );
      assertCustomerAuthority(
        context,
        "MERGE_PREVIEW",
        resourceForParty(candidate),
      );

      const suggestions: DuplicateSuggestion[] = [];
      for (const other of state.parties.values()) {
        if (
          other.id === candidate.id ||
          other.tenantId !== candidate.tenantId ||
          other.lifecycleState === "MERGED"
        ) {
          continue;
        }
        const reasons = duplicateReasons(candidate, other);
        if (reasons.length === 0) continue;
        const level = isDeterministic(reasons)
          ? "DETERMINISTIC_MATCH"
          : "POSSIBLE_MATCH";
        const suggestion: DuplicateSuggestion = {
          reviewId: nextEntityId(state, "duplicate-review"),
          tenantId: context.tenantId,
          candidatePartyId: candidate.id,
          matchedPartyId: other.id,
          level,
          reasons,
          autoMergeAllowed: false,
          minimalDisclosure: {
            level,
            reasonCodes: reasons.map((reason) => reason.code),
            reviewId: "",
          },
        };
        const completeSuggestion: DuplicateSuggestion = {
          ...suggestion,
          minimalDisclosure: {
            ...suggestion.minimalDisclosure,
            reviewId: suggestion.reviewId,
          },
        };
        state.duplicateSuggestions.set(
          completeSuggestion.reviewId,
          completeSuggestion,
        );
        suggestions.push(completeSuggestion);
      }
      writeAudit(
        state,
        context,
        "SuggestDuplicate",
        "PARTY",
        candidate.id,
        null,
        suggestions.map((suggestion) => suggestion.minimalDisclosure),
      );
      return suggestions;
    });
  }

  confirmDuplicate(
    context: CommandContext,
    reviewId: string,
  ): DuplicateSuggestion {
    return this.repository.read((state) => {
      const suggestion = state.duplicateSuggestions.get(reviewId);
      if (!suggestion) {
        throw new CustomerIdentityError(
          "NOT_FOUND",
          "Duplicate suggestion was not found",
        );
      }
      if (suggestion.tenantId !== context.tenantId) {
        throw new CustomerIdentityError(
          "TENANT_SCOPE_MISMATCH",
          "Duplicate suggestion tenant does not match command tenant",
        );
      }
      const candidate = requireParty(
        state as CustomerIdentityState,
        context.tenantId,
        suggestion.candidatePartyId,
      );
      assertCustomerAuthority(
        context,
        "MERGE_PREVIEW",
        resourceForParty(candidate),
      );
      return suggestion;
    });
  }

  previewMerge(
    context: CommandContext,
    survivorPartyId: string,
    mergedPartyId: string,
    fieldChoices: readonly MergeFieldChoice[],
  ): MergePreview {
    return this.repository.read((state) =>
      this.previewMergeInState(
        state as CustomerIdentityState,
        context,
        survivorPartyId,
        mergedPartyId,
        fieldChoices,
      ),
    );
  }

  private previewMergeInState(
    state: CustomerIdentityState,
    context: CommandContext,
    survivorPartyId: string,
    mergedPartyId: string,
    fieldChoices: readonly MergeFieldChoice[],
  ): MergePreview {
    if (survivorPartyId === mergedPartyId) {
      throw new CustomerIdentityError(
        "SELF_MERGE_DENIED",
        "A Party cannot be merged into itself",
      );
    }
    const survivor = requireParty(
      state,
      context.tenantId,
      survivorPartyId,
      false,
    );
    const merged = requireParty(
      state,
      context.tenantId,
      mergedPartyId,
      false,
    );
    if (
      survivor.lifecycleState === "MERGED" ||
      merged.lifecycleState === "MERGED"
    ) {
      throw new CustomerIdentityError(
        "DUPLICATE_MERGE_DENIED",
        "A merged Party cannot be merged again",
      );
    }
    const crossBranch = survivor.branchId !== merged.branchId;
    assertCustomerAuthority(
      context,
      "MERGE_PREVIEW",
      resourceForParty(survivor),
      { requireCompanyScope: crossBranch },
    );
    assertCustomerAuthority(
      context,
      "MERGE_PREVIEW",
      resourceForParty(merged),
      { requireCompanyScope: crossBranch },
    );

    const conflicts = [...new Set([
      ...Object.keys(survivor.fields),
      ...Object.keys(merged.fields),
    ])].filter((field) => {
      const left = survivor.fields[field]?.normalizedValue;
      const right = merged.fields[field]?.normalizedValue;
      return Boolean(left && right && left !== right);
    });

    for (const choice of fieldChoices) {
      if (
        choice.sourcePartyId !== survivor.id &&
        choice.sourcePartyId !== merged.id
      ) {
        throw new CustomerIdentityError(
          "VALIDATION_ERROR",
          "Field choice must reference one of the two merge Parties",
          { field: choice.field },
        );
      }
    }

    return {
      tenantId: context.tenantId,
      survivorPartyId: survivor.id,
      mergedPartyId: merged.id,
      survivorBefore: survivor,
      mergedBefore: merged,
      fieldChoices,
      conflicts,
      relationshipsToTransfer: {
        customerAccountIds: [...state.customerAccounts.values()]
          .filter((record) => record.partyId === merged.id)
          .map((record) => record.id),
        leadIds: [...state.leads.values()]
          .filter((record) => record.partyId === merged.id)
          .map((record) => record.id),
        opportunityIds: [...state.opportunities.values()]
          .filter((record) => record.partyId === merged.id)
          .map((record) => record.id),
        communicationPreferenceIds: [
          ...state.communicationPreferences.values(),
        ]
          .filter((record) => record.partyId === merged.id)
          .map((record) => record.id),
      },
    };
  }

  mergeParties(command: MergePartiesCommand): PartyMergeRecord {
    return this.repository.transaction((state) => {
      const context = command.context;
      const key = requireIdempotencyKey(context, "MergeParties");
      const reason = requireReason(context, "MergeParties");
      if (command.approvedByActorId === context.actorId) {
        throw new CustomerIdentityError(
          "SELF_APPROVAL_DENIED",
          "Party merge requires an independent approver",
        );
      }
      const cacheKey = `MergeParties:${context.tenantId}:${command.survivorPartyId}:${command.mergedPartyId}:${key}`;
      const cached = state.idempotencyResults.get(cacheKey);
      if (cached) return cached as PartyMergeRecord;

      const preview = this.previewMergeInState(
        state,
        context,
        command.survivorPartyId,
        command.mergedPartyId,
        command.fieldChoices,
      );
      const crossBranch =
        preview.survivorBefore.branchId !== preview.mergedBefore.branchId;
      assertCustomerAuthority(
        context,
        "MERGE_EXECUTE",
        resourceForParty(preview.survivorBefore),
        { requireCompanyScope: crossBranch },
      );
      assertCustomerAuthority(
        context,
        "MERGE_EXECUTE",
        resourceForParty(preview.mergedBefore),
        { requireCompanyScope: crossBranch },
      );
      assertCustomerAuthority(
        context,
        "MERGE_EXECUTE",
        resourceForParty(preview.survivorBefore),
        {
          actorId: command.approvedByActorId,
          assignments: command.approverAssignments,
          initiatedByActorId: context.actorId,
          requireCompanyScope: crossBranch,
        },
      );
      assertExpectedVersion(
        context.expectedVersion,
        preview.survivorBefore.version,
      );

      const timestamp = now(context);
      const choices = new Map(
        command.fieldChoices.map((choice) => [choice.field, choice.sourcePartyId]),
      );
      const fieldNames = new Set([
        ...Object.keys(preview.survivorBefore.fields),
        ...Object.keys(preview.mergedBefore.fields),
      ]);
      const mergedFields: Record<string, PartyField> = {};
      for (const field of fieldNames) {
        const sourcePartyId =
          choices.get(field) ?? preview.survivorBefore.id;
        const source =
          sourcePartyId === preview.mergedBefore.id
            ? preview.mergedBefore.fields[field]
            : preview.survivorBefore.fields[field];
        const fallback =
          sourcePartyId === preview.mergedBefore.id
            ? preview.survivorBefore.fields[field]
            : preview.mergedBefore.fields[field];
        const selected = source ?? fallback;
        if (!selected) continue;
        mergedFields[field] = {
          ...selected,
          source:
            sourcePartyId === preview.mergedBefore.id
              ? "MERGED"
              : selected.source,
          updatedAt: timestamp,
          updatedByActorId: context.actorId,
          history: [
            ...selected.history,
            {
              value: selected.value,
              source: "MERGED",
              changedAt: timestamp,
              changedByActorId: context.actorId,
              correlationId: context.auditCorrelationId,
            },
          ],
        };
      }

      const survivorAfter: Party = {
        ...preview.survivorBefore,
        fields: mergedFields,
        aliases: [
          ...new Set([
            ...preview.survivorBefore.aliases,
            preview.mergedBefore.id,
            ...preview.mergedBefore.aliases,
          ]),
        ],
        version: preview.survivorBefore.version + 1,
        updatedAt: timestamp,
      };
      const mergedAfter: Party = {
        ...preview.mergedBefore,
        lifecycleState: "MERGED",
        mergedIntoPartyId: survivorAfter.id,
        version: preview.mergedBefore.version + 1,
        updatedAt: timestamp,
      };
      state.parties.set(survivorAfter.id, survivorAfter);
      state.parties.set(mergedAfter.id, mergedAfter);
      state.aliases.set(mergedAfter.id, survivorAfter.id);
      for (const alias of preview.mergedBefore.aliases) {
        state.aliases.set(alias, survivorAfter.id);
      }

      for (const id of preview.relationshipsToTransfer.customerAccountIds) {
        const record = state.customerAccounts.get(id);
        if (record) {
          state.customerAccounts.set(id, {
            ...record,
            partyId: survivorAfter.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of preview.relationshipsToTransfer.leadIds) {
        const record = state.leads.get(id);
        if (record) {
          state.leads.set(id, {
            ...record,
            partyId: survivorAfter.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of preview.relationshipsToTransfer.opportunityIds) {
        const record = state.opportunities.get(id);
        if (record) {
          state.opportunities.set(id, {
            ...record,
            partyId: survivorAfter.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of preview.relationshipsToTransfer
        .communicationPreferenceIds) {
        const record = state.communicationPreferences.get(id);
        if (record) {
          state.communicationPreferences.set(id, {
            ...record,
            partyId: survivorAfter.id,
            version: record.version + 1,
          });
        }
      }

      const mergeRecord: PartyMergeRecord = {
        id: nextEntityId(state, "party-merge"),
        tenantId: context.tenantId,
        survivorPartyId: survivorAfter.id,
        mergedPartyId: mergedAfter.id,
        preview,
        survivorAfter,
        executedByActorId: context.actorId,
        approvedByActorId: command.approvedByActorId,
        reason,
        idempotencyKey: key,
        executedAt: timestamp,
        reversedAt: null,
        reversedByActorId: null,
        blockingDependencies: [],
      };
      state.mergeRecords.set(mergeRecord.id, mergeRecord);
      writeAudit(
        state,
        context,
        "MergeParties",
        "PARTY_MERGE",
        mergeRecord.id,
        preview,
        mergeRecord,
      );
      state.idempotencyResults.set(cacheKey, mergeRecord);
      return mergeRecord;
    });
  }

  registerMergeDependency(
    context: CommandContext,
    mergeId: string,
    dependency: Readonly<{ type: string; id: string }>,
  ): PartyMergeRecord {
    return this.repository.transaction((state) => {
      const merge = state.mergeRecords.get(mergeId);
      if (!merge || merge.tenantId !== context.tenantId) {
        throw new CustomerIdentityError(
          "NOT_FOUND",
          "Party merge was not found",
        );
      }
      const survivor = requireParty(
        state,
        context.tenantId,
        merge.survivorPartyId,
      );
      assertCustomerAuthority(
        context,
        "WRITE",
        resourceForParty(survivor),
      );
      const updated: PartyMergeRecord = {
        ...merge,
        blockingDependencies: [
          ...merge.blockingDependencies,
          { ...dependency, createdAt: now(context) },
        ],
      };
      state.mergeRecords.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "RegisterMergeDependency",
        "PARTY_MERGE",
        updated.id,
        merge,
        updated,
      );
      return updated;
    });
  }

  reversePartyMerge(
    context: CommandContext,
    mergeId: string,
  ): PartyMergeRecord {
    return this.repository.transaction((state) => {
      const merge = state.mergeRecords.get(mergeId);
      if (!merge || merge.tenantId !== context.tenantId) {
        throw new CustomerIdentityError(
          "NOT_FOUND",
          "Party merge was not found",
        );
      }
      if (merge.reversedAt) return merge;
      requireReason(context, "ReversePartyMerge");
      if (merge.blockingDependencies.length > 0) {
        throw new CustomerIdentityError(
          "BLOCKED_BY_DEPENDENCY",
          "Party merge reversal is blocked by later dependencies",
          { dependencies: merge.blockingDependencies },
        );
      }
      const crossBranch =
        merge.preview.survivorBefore.branchId !==
        merge.preview.mergedBefore.branchId;
      assertCustomerAuthority(
        context,
        "MERGE_REVERSE",
        resourceForParty(merge.preview.survivorBefore),
        { requireCompanyScope: crossBranch },
      );

      const timestamp = now(context);
      state.parties.set(
        merge.preview.survivorBefore.id,
        merge.preview.survivorBefore,
      );
      state.parties.set(
        merge.preview.mergedBefore.id,
        merge.preview.mergedBefore,
      );
      state.aliases.delete(merge.preview.mergedBefore.id);
      for (const alias of merge.preview.mergedBefore.aliases) {
        state.aliases.delete(alias);
      }

      for (const id of merge.preview.relationshipsToTransfer
        .customerAccountIds) {
        const record = state.customerAccounts.get(id);
        if (record) {
          state.customerAccounts.set(id, {
            ...record,
            partyId: merge.preview.mergedBefore.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of merge.preview.relationshipsToTransfer.leadIds) {
        const record = state.leads.get(id);
        if (record) {
          state.leads.set(id, {
            ...record,
            partyId: merge.preview.mergedBefore.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of merge.preview.relationshipsToTransfer
        .opportunityIds) {
        const record = state.opportunities.get(id);
        if (record) {
          state.opportunities.set(id, {
            ...record,
            partyId: merge.preview.mergedBefore.id,
            version: record.version + 1,
            updatedAt: timestamp,
          });
        }
      }
      for (const id of merge.preview.relationshipsToTransfer
        .communicationPreferenceIds) {
        const record = state.communicationPreferences.get(id);
        if (record) {
          state.communicationPreferences.set(id, {
            ...record,
            partyId: merge.preview.mergedBefore.id,
            version: record.version + 1,
          });
        }
      }

      const reversed: PartyMergeRecord = {
        ...merge,
        reversedAt: timestamp,
        reversedByActorId: context.actorId,
      };
      state.mergeRecords.set(reversed.id, reversed);
      writeAudit(
        state,
        context,
        "ReversePartyMerge",
        "PARTY_MERGE",
        reversed.id,
        merge,
        reversed,
      );
      return reversed;
    });
  }

  setCommunicationPreference(
    command: SetCommunicationPreferenceCommand,
  ): CommunicationPreference {
    return this.repository.transaction((state) => {
      const context = command.context;
      const party = requireParty(state, context.tenantId, command.partyId);
      assertCustomerAuthority(
        context,
        "CONSENT_WRITE",
        resourceForParty(party),
      );
      const timestamp = now(context);
      const existing = [...state.communicationPreferences.values()].find(
        (record) =>
          record.partyId === party.id &&
          record.channel === command.channel &&
          record.purpose === command.purpose &&
          record.branchId === (command.branchId ?? null) &&
          record.serviceLine === (command.serviceLine ?? null),
      );
      if (existing) {
        assertExpectedVersion(context.expectedVersion, existing.version);
      }
      const preference: CommunicationPreference = {
        id: existing?.id ?? nextEntityId(state, "communication-preference"),
        tenantId: context.tenantId,
        partyId: party.id,
        channel: command.channel,
        purpose: command.purpose,
        consentState: command.consentState,
        source: command.source,
        branchId: command.branchId ?? null,
        serviceLine: command.serviceLine ?? null,
        recordedAt: existing?.recordedAt ?? timestamp,
        withdrawnAt:
          command.consentState === "WITHDRAWN"
            ? timestamp
            : existing?.withdrawnAt ?? null,
        history: [
          ...(existing?.history ?? []),
          {
            consentState: command.consentState,
            source: command.source,
            changedAt: timestamp,
            changedByActorId: context.actorId,
            correlationId: context.auditCorrelationId,
          },
        ],
        version: (existing?.version ?? 0) + 1,
      };
      state.communicationPreferences.set(preference.id, preference);
      writeAudit(
        state,
        context,
        "SetCommunicationPreference",
        "COMMUNICATION_PREFERENCE",
        preference.id,
        existing ?? null,
        preference,
      );
      return preference;
    });
  }

  canCommunicate(
    context: CommandContext,
    partyId: string,
    channel: CommunicationPreference["channel"],
    purpose: CommunicationPreference["purpose"],
  ): boolean {
    return this.repository.read((state) => {
      const party = requireParty(
        state as CustomerIdentityState,
        context.tenantId,
        partyId,
      );
      assertCustomerAuthority(context, "READ", resourceForParty(party));
      const preference = [...state.communicationPreferences.values()]
        .filter(
          (record) =>
            record.partyId === party.id &&
            record.channel === channel &&
            record.purpose === purpose,
        )
        .sort((left, right) => right.version - left.version)[0];
      return Boolean(
        preference &&
          ["GRANTED", "NOT_REQUIRED"].includes(preference.consentState),
      );
    });
  }

  applyLegalHold(
    context: CommandContext,
    partyId: string,
  ): Party {
    return this.repository.transaction((state) => {
      const party = requireParty(state, context.tenantId, partyId);
      assertCustomerAuthority(
        context,
        "RETENTION_WRITE",
        resourceForParty(party),
      );
      const reason = requireReason(context, "ApplyLegalHold");
      const updated: Party = {
        ...party,
        lifecycleState: "LEGAL_HOLD",
        legalHoldReason: reason,
        version: party.version + 1,
        updatedAt: now(context),
      };
      state.parties.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "ApplyLegalHold",
        "PARTY",
        updated.id,
        party,
        updated,
      );
      return updated;
    });
  }

  requestDeletion(
    context: CommandContext,
    partyId: string,
  ): Party {
    return this.repository.transaction((state) => {
      const party = requireParty(state, context.tenantId, partyId);
      assertCustomerAuthority(
        context,
        "RETENTION_WRITE",
        resourceForParty(party),
      );
      requireReason(context, "RequestDeletion");
      if (party.lifecycleState === "LEGAL_HOLD") {
        throw new CustomerIdentityError(
          "LEGAL_HOLD",
          "Legal hold blocks deletion requests",
        );
      }
      const updated: Party = {
        ...party,
        lifecycleState: "PENDING_DELETION",
        version: party.version + 1,
        updatedAt: now(context),
      };
      state.parties.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "RequestDeletion",
        "PARTY",
        updated.id,
        party,
        updated,
      );
      return updated;
    });
  }

  archiveParty(context: CommandContext, partyId: string): Party {
    return this.repository.transaction((state) => {
      const party = requireParty(state, context.tenantId, partyId);
      assertCustomerAuthority(
        context,
        "RETENTION_WRITE",
        resourceForParty(party),
      );
      requireReason(context, "ArchiveParty");
      const updated: Party = {
        ...party,
        lifecycleState: "ARCHIVED",
        version: party.version + 1,
        updatedAt: now(context),
      };
      state.parties.set(updated.id, updated);
      writeAudit(
        state,
        context,
        "ArchiveParty",
        "PARTY",
        updated.id,
        party,
        updated,
      );
      return updated;
    });
  }

  listAudit(context: CommandContext): readonly AuditEntry[] {
    validateCommandContext(context);
    return this.repository.read((state) => {
      assertCustomerAuthority(context, "READ", {
        ...context.scope,
        resourceType: "CUSTOMER_IDENTITY_AUDIT",
        resourceId: "ALL",
      });
      return state.audit.filter((entry) => entry.tenantId === context.tenantId);
    });
  }
}
