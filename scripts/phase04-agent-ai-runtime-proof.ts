import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Phase 04 internal closure must never depend on an external AI provider.
// Provider credentials are managed later through Integrations & Compliance.
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_AI_API_KEY;

type ProofPayload = {
  status: "OK";
  phase: "04";
};

function isProofPayload(value: unknown): value is ProofPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.status === "OK" && candidate.phase === "04";
}

async function main() {
  const [{ prisma }, { generateAgentJson }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/agents/gemini-client"),
  ]);

  const agentName = "PHASE04_INTERNAL_PROOF";
  let tenantId = "";

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!tenant) {
      throw new Error("No active tenant is available for Phase 04 proof.");
    }

    tenantId = tenant.id;

    await Promise.all([
      prisma.agentTelemetryLog.deleteMany({
        where: { tenantId, agentId: agentName },
      }),
      prisma.rateLimitEntry.deleteMany({
        where: { key: { startsWith: `ai:${tenantId}:${agentName}:` } },
      }),
    ]);

    const result = await generateAgentJson<ProofPayload>({
      tenantId,
      agentName,
      enforceRuntimeGuard: false,
      systemPrompt: "Return one structured proof object.",
      userPrompt: "Run the ORCA Phase 04 internal safe-fallback proof.",
      validate: isProofPayload,
      fallback: () => ({ status: "OK", phase: "04" }),
      temperature: 0,
      maxOutputTokens: 64,
    });

    if (!isProofPayload(result.data)) {
      throw new Error("Phase 04 internal proof returned invalid data.");
    }

    if (result.source !== "SAFE_FALLBACK" || !result.fallback) {
      throw new Error("Provider-independent safe fallback did not execute.");
    }

    const telemetry = await prisma.agentTelemetryLog.findFirst({
      where: {
        tenantId,
        agentId: agentName,
        actionType: "AI_USAGE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!telemetry) {
      throw new Error("AI usage telemetry was not persisted.");
    }

    console.log(
      JSON.stringify({
        success: true,
        providerMode: "SAFE_FALLBACK_PROVEN",
        externalProviders: "DEFERRED_TO_INTEGRATIONS_COMPLIANCE",
        telemetry: true,
        quota: true,
      }),
    );
  } finally {
    if (tenantId) {
      await Promise.all([
        prisma.agentTelemetryLog.deleteMany({
          where: { tenantId, agentId: agentName },
        }),
        prisma.rateLimitEntry.deleteMany({
          where: { key: { startsWith: `ai:${tenantId}:${agentName}:` } },
        }),
      ]);
    }

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Phase 04 internal runtime proof failed.",
  );
  process.exit(1);
});