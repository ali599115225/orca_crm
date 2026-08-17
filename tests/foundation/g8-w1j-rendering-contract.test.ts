import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderCanonicalContract,
  W1ContractRenderingError,
} from "@/lib/domain/contract-finance/contract-renderer";

const ROOT = process.cwd();
const RENDERER_SOURCE = readFileSync(
  join(ROOT, "lib", "domain", "contract-finance", "contract-renderer.ts"),
  "utf8",
);

function assembly(overrides: Record<string, unknown> = {}) {
  return {
    sourceContentJson: {
      schemaVersion: "W1J_CONTENT_V1",
      sections: [
        {
          id: "intro",
          overrideMode: "LOCKED",
          nodes: [
            { type: "TEXT", value: "المشتري: " },
            { type: "VARIABLE", key: "BUYER_NAME" },
            { type: "TEXT", value: "\nقيمة العقد: " },
            { type: "VARIABLE", key: "CONTRACT_TOTAL" },
          ],
        },
        {
          id: "notes",
          overrideMode: "CONTROLLED_EDITABLE",
          nodes: [
            { type: "TEXT", value: "مرجع داخلي: " },
            { type: "VARIABLE", key: "REFERENCE_NOTE" },
          ],
        },
      ],
    },
    structuredFacts: {
      schemaVersion: "W1I_CANONICAL_SNAPSHOT_FACTS_V1",
      templateVersion: {
        variableSchemaJson: {
          schemaVersion: "W1J_VARIABLE_SCHEMA_V1",
          variables: [
            {
              key: "BUYER_NAME",
              source: "FACT",
              path: "contract.buyerName",
              valueType: "STRING",
              required: true,
            },
            {
              key: "CONTRACT_TOTAL",
              source: "FACT",
              path: "contract.totalVolumeSar",
              valueType: "DECIMAL",
              required: true,
            },
            {
              key: "REFERENCE_NOTE",
              source: "BINDING",
              bindingKey: "REFERENCE_NOTE",
              valueType: "STRING",
              required: false,
            },
          ],
        },
      },
      dataBindingsJson: {
        schemaVersion: "W1J_BINDINGS_V1",
        values: {
          REFERENCE_NOTE: "REF-001",
          BUYER_NAME: "لا يجوز أن يتجاوز الحقيقة",
        },
      },
      contract: {
        buyerName: "أحمد محمد",
        totalVolumeSar: "1250000.00",
      },
    },
    clauseSnapshot: {
      schemaVersion: "W1I_CLAUSE_SOURCE_V1",
      structureJson: {
        schemaVersion: "W1J_STRUCTURE_V1",
        sectionOrder: ["intro", "notes"],
      },
      clauseOverridesJson: {
        schemaVersion: "W1J_CLAUSE_OVERRIDES_V1",
        replacements: [],
      },
    },
    ...overrides,
  };
}

function expectCode(input: ReturnType<typeof assembly>, code: string) {
  try {
    renderCanonicalContract(input);
    throw new Error("expected rendering failure");
  } catch (error) {
    expect(error).toBeInstanceOf(W1ContractRenderingError);
    expect(error).toMatchObject({ code });
  }
}

describe("W1J deterministic rendering contract", () => {
  it("renders authoritative facts and approved bindings deterministically", () => {
    const input = assembly();
    const first = renderCanonicalContract(input);
    const second = renderCanonicalContract(input);

    expect(first).toBe(
      "المشتري: أحمد محمد\nقيمة العقد: 1250000.00\n\nمرجع داخلي: REF-001",
    );
    expect(second).toBe(first);
  });

  it("does not let draft bindings override authoritative FACT variables", () => {
    const output = renderCanonicalContract(assembly());
    expect(output).toContain("أحمد محمد");
    expect(output).not.toContain("لا يجوز أن يتجاوز الحقيقة");
  });

  it("fails closed for missing required variables", () => {
    const input = assembly();
    (input.structuredFacts as any).contract.buyerName = null;
    expectCode(input, "W1_RENDER_REQUIRED_VARIABLE_MISSING");
  });

  it("fails closed for undeclared variables", () => {
    const input = assembly();
    (input.sourceContentJson as any).sections[0].nodes.push({
      type: "VARIABLE",
      key: "UNKNOWN_VARIABLE",
    });
    expectCode(input, "W1_RENDER_VARIABLE_UNDECLARED");
  });

  it("rejects overrides for LOCKED sections", () => {
    const input = assembly();
    (input.clauseSnapshot as any).clauseOverridesJson.replacements = [
      {
        sectionId: "intro",
        nodes: [{ type: "TEXT", value: "تعديل غير مصرح" }],
      },
    ];
    expectCode(input, "W1_RENDER_CLAUSE_LOCKED_OVERRIDE_FORBIDDEN");
  });

  it("applies approved controlled overrides without changing section order", () => {
    const input = assembly();
    (input.clauseSnapshot as any).clauseOverridesJson.replacements = [
      {
        sectionId: "notes",
        nodes: [
          { type: "TEXT", value: "ملاحظة معتمدة: " },
          { type: "VARIABLE", key: "REFERENCE_NOTE" },
        ],
      },
    ];

    expect(renderCanonicalContract(input)).toBe(
      "المشتري: أحمد محمد\nقيمة العقد: 1250000.00\n\nملاحظة معتمدة: REF-001",
    );
  });

  it("rejects structure drift and duplicate sections", () => {
    const unknown = assembly();
    (unknown.clauseSnapshot as any).structureJson.sectionOrder = ["intro", "other"];
    expectCode(unknown, "W1_RENDER_STRUCTURE_UNKNOWN_SECTION");

    const duplicate = assembly();
    (duplicate.sourceContentJson as any).sections.push(
      (duplicate.sourceContentJson as any).sections[0],
    );
    expectCode(duplicate, "W1_RENDER_SECTION_ID_DUPLICATE");
  });

  it("preserves canonical decimal strings and exact UTC ISO datetimes", () => {
    const input = assembly();
    const facts = input.structuredFacts as any;
    facts.contract.acceptedAt = "2026-08-17T05:30:45.123Z";
    facts.templateVersion.variableSchemaJson.variables.push({
      key: "ACCEPTED_AT",
      source: "FACT",
      path: "contract.acceptedAt",
      valueType: "ISO_DATETIME",
      required: true,
    });
    (input.sourceContentJson as any).sections[1].nodes.push(
      { type: "TEXT", value: "\nوقت القبول: " },
      { type: "VARIABLE", key: "ACCEPTED_AT" },
    );

    const output = renderCanonicalContract(input);
    expect(output).toContain("1250000.00");
    expect(output).toContain("2026-08-17T05:30:45.123Z");
  });

  it("rejects unsafe fact paths", () => {
    const input = assembly();
    (input.structuredFacts as any).templateVersion.variableSchemaJson.variables[0].path =
      "contract.__proto__.polluted";
    expectCode(input, "W1_RENDER_FACT_PATH_FORBIDDEN");
  });

  it("is pure and contains no DB, network, locale, or time-dependent rendering", () => {
    expect(RENDERER_SOURCE).not.toContain("@/lib/prisma");
    expect(RENDERER_SOURCE).not.toContain("fetch(");
    expect(RENDERER_SOURCE).not.toContain("axios");
    expect(RENDERER_SOURCE).not.toContain("Intl.");
    expect(RENDERER_SOURCE).not.toContain("Date.now");
    expect(RENDERER_SOURCE).not.toMatch(/\.(?:create|update|upsert|delete)\s*\(/);
  });
});
