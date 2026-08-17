export const W1J_CONTENT_SCHEMA_VERSION = "W1J_CONTENT_V1" as const;
export const W1J_STRUCTURE_SCHEMA_VERSION = "W1J_STRUCTURE_V1" as const;
export const W1J_VARIABLE_SCHEMA_VERSION = "W1J_VARIABLE_SCHEMA_V1" as const;
export const W1J_BINDINGS_SCHEMA_VERSION = "W1J_BINDINGS_V1" as const;
export const W1J_CLAUSE_OVERRIDES_SCHEMA_VERSION = "W1J_CLAUSE_OVERRIDES_V1" as const;

export class W1ContractRenderingError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "W1ContractRenderingError";
  }
}

type JsonObject = Record<string, unknown>;

type TextNode = {
  type: "TEXT";
  value: string;
};

type VariableNode = {
  type: "VARIABLE";
  key: string;
};

type RenderNode = TextNode | VariableNode;

type ContentSection = {
  id: string;
  overrideMode: "LOCKED" | "CONTROLLED_EDITABLE";
  nodes: RenderNode[];
};

type VariableDefinition = {
  key: string;
  source: "FACT" | "BINDING";
  path?: string;
  bindingKey?: string;
  valueType: "STRING" | "DECIMAL" | "ISO_DATE" | "ISO_DATETIME";
  required: boolean;
};

export type W1CanonicalRenderingInput = {
  sourceContentJson: unknown;
  structuredFacts: unknown;
  clauseSnapshot: unknown;
};

const IDENTIFIER_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const SECTION_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const FACT_PATH_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/;
const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const W1I_STRUCTURED_FACTS_SCHEMA_VERSION = "W1I_CANONICAL_SNAPSHOT_FACTS_V1" as const;
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function fail(code: string): never {
  throw new W1ContractRenderingError(code);
}

function asObject(value: unknown, code: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as JsonObject;
}

function asArray(value: unknown, code: string): unknown[] {
  if (!Array.isArray(value)) fail(code);
  return value;
}

function asString(value: unknown, code: string): string {
  if (typeof value !== "string") fail(code);
  return value;
}

function asBoolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") fail(code);
  return value;
}

function normalizedText(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function readSchemaVersion(object: JsonObject, expected: string, code: string): void {
  if (object.schemaVersion !== expected) fail(code);
}

function readRenderNode(value: unknown): RenderNode {
  const node = asObject(value, "W1_RENDER_NODE_INVALID");
  const type = asString(node.type, "W1_RENDER_NODE_TYPE_REQUIRED");

  if (type === "TEXT") {
    return {
      type,
      value: normalizedText(asString(node.value, "W1_RENDER_TEXT_VALUE_REQUIRED")),
    };
  }

  if (type === "VARIABLE") {
    const key = asString(node.key, "W1_RENDER_VARIABLE_KEY_REQUIRED");
    if (!IDENTIFIER_PATTERN.test(key)) fail("W1_RENDER_VARIABLE_KEY_INVALID");
    return { type, key };
  }

  return fail("W1_RENDER_NODE_TYPE_UNSUPPORTED");
}

function readContentSections(sourceContentJson: unknown): ContentSection[] {
  const content = asObject(sourceContentJson, "W1_RENDER_CONTENT_INVALID");
  readSchemaVersion(content, W1J_CONTENT_SCHEMA_VERSION, "W1_RENDER_CONTENT_SCHEMA_UNSUPPORTED");

  const rawSections = asArray(content.sections, "W1_RENDER_CONTENT_SECTIONS_REQUIRED");
  if (rawSections.length === 0) fail("W1_RENDER_CONTENT_SECTIONS_REQUIRED");

  const seen = new Set<string>();
  return rawSections.map((value) => {
    const section = asObject(value, "W1_RENDER_SECTION_INVALID");
    const id = asString(section.id, "W1_RENDER_SECTION_ID_REQUIRED");
    if (!SECTION_ID_PATTERN.test(id)) fail("W1_RENDER_SECTION_ID_INVALID");
    if (seen.has(id)) fail("W1_RENDER_SECTION_ID_DUPLICATE");
    seen.add(id);

    const overrideMode = asString(
      section.overrideMode,
      "W1_RENDER_SECTION_OVERRIDE_MODE_REQUIRED",
    );
    if (overrideMode !== "LOCKED" && overrideMode !== "CONTROLLED_EDITABLE") {
      fail("W1_RENDER_SECTION_OVERRIDE_MODE_UNSUPPORTED");
    }

    const nodes = asArray(section.nodes, "W1_RENDER_SECTION_NODES_REQUIRED").map(readRenderNode);
    if (nodes.length === 0) fail("W1_RENDER_SECTION_NODES_REQUIRED");

    return { id, overrideMode, nodes };
  });
}

function readSectionOrder(structureJson: unknown, knownSections: Set<string>): string[] {
  const structure = asObject(structureJson, "W1_RENDER_STRUCTURE_INVALID");
  readSchemaVersion(
    structure,
    W1J_STRUCTURE_SCHEMA_VERSION,
    "W1_RENDER_STRUCTURE_SCHEMA_UNSUPPORTED",
  );

  const order = asArray(structure.sectionOrder, "W1_RENDER_STRUCTURE_ORDER_REQUIRED").map((value) =>
    asString(value, "W1_RENDER_STRUCTURE_SECTION_ID_INVALID"),
  );

  if (order.length !== knownSections.size) fail("W1_RENDER_STRUCTURE_SECTION_SET_MISMATCH");
  const seen = new Set<string>();
  for (const id of order) {
    if (!knownSections.has(id)) fail("W1_RENDER_STRUCTURE_UNKNOWN_SECTION");
    if (seen.has(id)) fail("W1_RENDER_STRUCTURE_SECTION_DUPLICATE");
    seen.add(id);
  }
  if (seen.size !== knownSections.size) fail("W1_RENDER_STRUCTURE_SECTION_SET_MISMATCH");
  return order;
}

function readVariableDefinitions(variableSchemaJson: unknown): Map<string, VariableDefinition> {
  const schema = asObject(variableSchemaJson, "W1_RENDER_VARIABLE_SCHEMA_INVALID");
  readSchemaVersion(
    schema,
    W1J_VARIABLE_SCHEMA_VERSION,
    "W1_RENDER_VARIABLE_SCHEMA_UNSUPPORTED",
  );

  const definitions = new Map<string, VariableDefinition>();
  for (const value of asArray(schema.variables, "W1_RENDER_VARIABLES_REQUIRED")) {
    const variable = asObject(value, "W1_RENDER_VARIABLE_DEFINITION_INVALID");
    const key = asString(variable.key, "W1_RENDER_VARIABLE_KEY_REQUIRED");
    if (!IDENTIFIER_PATTERN.test(key)) fail("W1_RENDER_VARIABLE_KEY_INVALID");
    if (definitions.has(key)) fail("W1_RENDER_VARIABLE_KEY_DUPLICATE");

    const source = asString(variable.source, "W1_RENDER_VARIABLE_SOURCE_REQUIRED");
    if (source !== "FACT" && source !== "BINDING") {
      fail("W1_RENDER_VARIABLE_SOURCE_UNSUPPORTED");
    }

    const valueType = asString(variable.valueType, "W1_RENDER_VARIABLE_VALUE_TYPE_REQUIRED");
    if (
      valueType !== "STRING" &&
      valueType !== "DECIMAL" &&
      valueType !== "ISO_DATE" &&
      valueType !== "ISO_DATETIME"
    ) {
      fail("W1_RENDER_VARIABLE_VALUE_TYPE_UNSUPPORTED");
    }

    const required = asBoolean(variable.required, "W1_RENDER_VARIABLE_REQUIRED_FLAG_INVALID");
    let path: string | undefined;
    let bindingKey: string | undefined;

    if (source === "FACT") {
      path = asString(variable.path, "W1_RENDER_FACT_PATH_REQUIRED");
      if (!FACT_PATH_PATTERN.test(path)) fail("W1_RENDER_FACT_PATH_INVALID");
      for (const segment of path.split(".")) {
        if (FORBIDDEN_PATH_SEGMENTS.has(segment)) fail("W1_RENDER_FACT_PATH_FORBIDDEN");
      }
      if (variable.bindingKey !== undefined) fail("W1_RENDER_FACT_BINDING_KEY_FORBIDDEN");
    } else {
      bindingKey = asString(variable.bindingKey, "W1_RENDER_BINDING_KEY_REQUIRED");
      if (!IDENTIFIER_PATTERN.test(bindingKey)) fail("W1_RENDER_BINDING_KEY_INVALID");
      if (variable.path !== undefined) fail("W1_RENDER_BINDING_FACT_PATH_FORBIDDEN");
    }

    definitions.set(key, {
      key,
      source,
      path,
      bindingKey,
      valueType,
      required,
    });
  }

  return definitions;
}

function readBindingValues(dataBindingsJson: unknown): Record<string, unknown> {
  const bindings = asObject(dataBindingsJson, "W1_RENDER_BINDINGS_INVALID");
  readSchemaVersion(bindings, W1J_BINDINGS_SCHEMA_VERSION, "W1_RENDER_BINDINGS_SCHEMA_UNSUPPORTED");
  return asObject(bindings.values, "W1_RENDER_BINDING_VALUES_REQUIRED");
}

function readOverrides(
  clauseOverridesJson: unknown,
  sections: Map<string, ContentSection>,
): Map<string, RenderNode[]> {
  const overrides = asObject(clauseOverridesJson, "W1_RENDER_CLAUSE_OVERRIDES_INVALID");
  readSchemaVersion(
    overrides,
    W1J_CLAUSE_OVERRIDES_SCHEMA_VERSION,
    "W1_RENDER_CLAUSE_OVERRIDES_SCHEMA_UNSUPPORTED",
  );

  const replacements = new Map<string, RenderNode[]>();
  for (const value of asArray(overrides.replacements, "W1_RENDER_CLAUSE_REPLACEMENTS_REQUIRED")) {
    const replacement = asObject(value, "W1_RENDER_CLAUSE_REPLACEMENT_INVALID");
    const sectionId = asString(replacement.sectionId, "W1_RENDER_CLAUSE_SECTION_ID_REQUIRED");
    const section = sections.get(sectionId);
    if (!section) fail("W1_RENDER_CLAUSE_UNKNOWN_SECTION");
    if (section.overrideMode !== "CONTROLLED_EDITABLE") {
      fail("W1_RENDER_CLAUSE_LOCKED_OVERRIDE_FORBIDDEN");
    }
    if (replacements.has(sectionId)) fail("W1_RENDER_CLAUSE_OVERRIDE_DUPLICATE");

    const nodes = asArray(replacement.nodes, "W1_RENDER_CLAUSE_OVERRIDE_NODES_REQUIRED").map(
      readRenderNode,
    );
    if (nodes.length === 0) fail("W1_RENDER_CLAUSE_OVERRIDE_NODES_REQUIRED");
    replacements.set(sectionId, nodes);
  }

  return replacements;
}

function resolvePath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (FORBIDDEN_PATH_SEGMENTS.has(segment)) fail("W1_RENDER_FACT_PATH_FORBIDDEN");
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = (current as JsonObject)[segment];
  }
  return current;
}

function renderValue(value: unknown, definition: VariableDefinition): string {
  const missing = value === undefined || value === null || value === "";
  if (missing) {
    if (definition.required) fail("W1_RENDER_REQUIRED_VARIABLE_MISSING");
    return "";
  }

  if (typeof value !== "string") fail("W1_RENDER_VARIABLE_VALUE_NOT_STRING");
  const normalized = normalizedText(value);

  if (definition.required && normalized.trim().length === 0) {
    fail("W1_RENDER_REQUIRED_VARIABLE_MISSING");
  }

  switch (definition.valueType) {
    case "STRING":
      return normalized;
    case "DECIMAL":
      if (!DECIMAL_PATTERN.test(normalized)) fail("W1_RENDER_DECIMAL_INVALID");
      return normalized;
    case "ISO_DATE": {
      if (!ISO_DATE_PATTERN.test(normalized)) fail("W1_RENDER_ISO_DATE_INVALID");
      const instant = new Date(`${normalized}T00:00:00.000Z`);
      if (
        !Number.isFinite(instant.getTime()) ||
        instant.toISOString().slice(0, 10) !== normalized
      ) {
        fail("W1_RENDER_ISO_DATE_INVALID");
      }
      return normalized;
    }
    case "ISO_DATETIME": {
      if (!ISO_DATETIME_PATTERN.test(normalized)) fail("W1_RENDER_ISO_DATETIME_INVALID");
      const instant = new Date(normalized);
      if (!Number.isFinite(instant.getTime()) || instant.toISOString() !== normalized) {
        fail("W1_RENDER_ISO_DATETIME_INVALID");
      }
      return normalized;
    }
  }
}

function renderNodes(
  nodes: RenderNode[],
  definitions: Map<string, VariableDefinition>,
  structuredFacts: JsonObject,
  bindings: Record<string, unknown>,
): string {
  return nodes
    .map((node) => {
      if (node.type === "TEXT") return node.value;

      const definition = definitions.get(node.key);
      if (!definition) fail("W1_RENDER_VARIABLE_UNDECLARED");

      const value =
        definition.source === "FACT"
          ? resolvePath(structuredFacts, definition.path as string)
          : bindings[definition.bindingKey as string];

      return renderValue(value, definition);
    })
    .join("");
}

export function renderCanonicalContract(input: W1CanonicalRenderingInput): string {
  const structuredFacts = asObject(input.structuredFacts, "W1_RENDER_STRUCTURED_FACTS_INVALID");
  readSchemaVersion(
    structuredFacts,
    W1I_STRUCTURED_FACTS_SCHEMA_VERSION,
    "W1_RENDER_STRUCTURED_FACTS_SCHEMA_UNSUPPORTED",
  );
  const templateVersion = asObject(
    structuredFacts.templateVersion,
    "W1_RENDER_TEMPLATE_VERSION_FACTS_REQUIRED",
  );
  const variableSchemaJson = templateVersion.variableSchemaJson;
  const dataBindingsJson = structuredFacts.dataBindingsJson;

  const clauseSnapshot = asObject(input.clauseSnapshot, "W1_RENDER_CLAUSE_SNAPSHOT_INVALID");
  if (clauseSnapshot.schemaVersion !== "W1I_CLAUSE_SOURCE_V1") {
    fail("W1_RENDER_CLAUSE_SNAPSHOT_SCHEMA_UNSUPPORTED");
  }

  const sections = readContentSections(input.sourceContentJson);
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const sectionOrder = readSectionOrder(clauseSnapshot.structureJson, new Set(sectionMap.keys()));
  const definitions = readVariableDefinitions(variableSchemaJson);
  const bindings = readBindingValues(dataBindingsJson);
  const overrides = readOverrides(clauseSnapshot.clauseOverridesJson, sectionMap);

  return sectionOrder
    .map((sectionId) => {
      const section = sectionMap.get(sectionId);
      if (!section) fail("W1_RENDER_STRUCTURE_UNKNOWN_SECTION");
      const nodes = overrides.get(sectionId) ?? section.nodes;
      return renderNodes(nodes, definitions, structuredFacts, bindings);
    })
    .join("\n\n");
}
