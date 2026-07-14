import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPTIONAL_TENANT_MODELS,
  REQUIRED_TENANT_MODELS,
  isOptionalTenantModel,
  isRequiredTenantModel,
} from "@/lib/tenant-model-policy";

type SchemaTenantModel = {
  model: string;
  tenantIdType: "required" | "optional";
};

export function parseSchemaTenantModels(schema: string): SchemaTenantModel[] {
  const modelBlockPattern = /model\s+(\w+)\s*\{([\s\S]*?)(?:\r?\n)\}/g;
  const models: SchemaTenantModel[] = [];

  for (const match of schema.matchAll(modelBlockPattern)) {
    const model = match[1];
    const body = match[2];
    const tenantIdMatch = body.match(/(?:\r?\n)\s*tenantId\s+(String\?|String)(?=[ \t]|$)/);

    if (!tenantIdMatch) {
      continue;
    }

    models.push({
      model,
      tenantIdType: tenantIdMatch[1] === "String?" ? "optional" : "required",
    });
  }

  return models;
}

function readSchemaTenantModels(): SchemaTenantModel[] {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  return parseSchemaTenantModels(schema);
}

describe("R01 tenant model policy registry", () => {
  const schemaTenantModels = readSchemaTenantModels();
  const schemaTenantModelNames = schemaTenantModels.map((entry) => entry.model);
  const classifiedModels = [...REQUIRED_TENANT_MODELS, ...OPTIONAL_TENANT_MODELS];

  it("classifies every Prisma model that declares tenantId", () => {
    expect(new Set(classifiedModels)).toEqual(new Set(schemaTenantModelNames));
  });

  it("keeps all required tenant models on non-optional tenantId fields", () => {
    const schemaRequiredModels = schemaTenantModels
      .filter((entry) => entry.tenantIdType === "required")
      .map((entry) => entry.model);

    expect(new Set(REQUIRED_TENANT_MODELS)).toEqual(new Set(schemaRequiredModels));
  });

  it("keeps all optional tenant models on optional tenantId fields", () => {
    const schemaOptionalModels = schemaTenantModels
      .filter((entry) => entry.tenantIdType === "optional")
      .map((entry) => entry.model);

    expect(new Set(OPTIONAL_TENANT_MODELS)).toEqual(new Set(schemaOptionalModels));
  });

  it("never classifies a model that lacks tenantId", () => {
    expect(classifiedModels).toHaveLength(schemaTenantModelNames.length);
  });

  it("has no overlap between required and optional registries", () => {
    const overlap = REQUIRED_TENANT_MODELS.filter((model) => isOptionalTenantModel(model));
    expect(overlap).toEqual([]);
  });

  it("keeps the approved registry counts stable", () => {
    expect(REQUIRED_TENANT_MODELS).toHaveLength(70);
    expect(OPTIONAL_TENANT_MODELS).toHaveLength(3);
    expect(schemaTenantModels).toHaveLength(73);
  });

  it("fails closed on newly added tenantId models until they are classified", () => {
    const unclassified = schemaTenantModelNames.filter(
      (model) => !isRequiredTenantModel(model) && !isOptionalTenantModel(model),
    );

    expect(unclassified).toEqual([]);
  });
});

describe("schema parser regression tests", () => {
  it("parses LF + String as required", () => {
    const schema = `model TestModel {\n  id String @id\n  tenantId String @map("tenant_id")\n}`;
    const models = parseSchemaTenantModels(schema);
    expect(models).toHaveLength(1);
    expect(models[0].model).toBe("TestModel");
    expect(models[0].tenantIdType).toBe("required");
  });

  it("parses LF + String? as optional", () => {
    const schema = `model TestModel {\n  id String @id\n  tenantId String? @map("tenant_id")\n}`;
    const models = parseSchemaTenantModels(schema);
    expect(models).toHaveLength(1);
    expect(models[0].model).toBe("TestModel");
    expect(models[0].tenantIdType).toBe("optional");
  });

  it("parses CRLF + String as required", () => {
    const schema = `model TestModel {\r\n  id String @id\r\n  tenantId String @map("tenant_id")\r\n}`;
    const models = parseSchemaTenantModels(schema);
    expect(models).toHaveLength(1);
    expect(models[0].model).toBe("TestModel");
    expect(models[0].tenantIdType).toBe("required");
  });

  it("parses CRLF + String? as optional", () => {
    const schema = `model TestModel {\r\n  id String @id\r\n  tenantId String? @map("tenant_id")\r\n}`;
    const models = parseSchemaTenantModels(schema);
    expect(models).toHaveLength(1);
    expect(models[0].model).toBe("TestModel");
    expect(models[0].tenantIdType).toBe("optional");
  });
});
