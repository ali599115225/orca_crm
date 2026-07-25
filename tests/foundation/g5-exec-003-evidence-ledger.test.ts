import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import { EXEC_003_OPERATION_ASSIGNMENTS } from "@/lib/auth/exec-003-permission-assignments";
import {
  EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES,
  EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE,
  EXEC_003_PROGRESSIVE_DENY_ENTRYPOINT_PROOF,
  type Exec003BehaviorEvidenceCandidate,
} from "@/tests/foundation/g5-exec-003-behavior-evidence-manifest";

const ROOT = process.cwd();
const FINAL_GUARD_NAMES = new Set(["hasDatabaseRole", "requireAgentAccess"]);
const SOURCE_CACHE = new Map<string, ts.SourceFile>();

type TestCallback = ts.ArrowFunction | ts.FunctionExpression;
type TestRecord = { name: string; callback: TestCallback };
type CallAssertion = { target: string; negated: boolean };

function parseFile(relativePath: string): ts.SourceFile {
  const cached = SOURCE_CACHE.get(relativePath);
  if (cached) return cached;
  const absolute = path.join(ROOT, relativePath);
  const parsed = ts.createSourceFile(
    absolute,
    fs.readFileSync(absolute, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  SOURCE_CACHE.set(relativePath, parsed);
  return parsed;
}

function parseText(name: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    name,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function testRecords(source: ts.SourceFile): Map<string, TestRecord> {
  const result = new Map<string, TestRecord>();
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === "it" || node.expression.text === "test") &&
      node.arguments.length >= 2 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (ts.isArrowFunction(node.arguments[1]) ||
        ts.isFunctionExpression(node.arguments[1]))
    ) {
      const name = node.arguments[0].text;
      if (result.has(name)) throw new Error(`Duplicate executable test: ${name}`);
      result.set(name, { name, callback: node.arguments[1] });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function findVariableInitializer(
  source: ts.SourceFile,
  name: string,
): ts.Expression | null {
  let found: ts.Expression | null = null;
  function visit(node: ts.Node): void {
    if (
      found === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function resolveExpression(
  source: ts.SourceFile,
  expression: ts.Expression,
  seen: Set<string> = new Set(),
): ts.Expression {
  if (!ts.isIdentifier(expression) || seen.has(expression.text)) return expression;
  seen.add(expression.text);
  const initializer = findVariableInitializer(source, expression.text);
  return initializer ? resolveExpression(source, initializer, seen) : expression;
}

function resolveString(
  expression: ts.Expression,
  source: ts.SourceFile,
  seen: Set<string> = new Set(),
): string | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text)) return null;
    seen.add(expression.text);
    const initializer = findVariableInitializer(source, expression.text);
    return initializer ? resolveString(initializer, source, seen) : null;
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = resolveString(expression.left, source, seen);
    const right = resolveString(expression.right, source, seen);
    return left !== null && right !== null ? `${left}${right}` : null;
  }
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(expression.expression.expression)
  ) {
    const separator = expression.arguments[0]
      ? resolveString(expression.arguments[0], source, seen)
      : ",";
    if (separator === null) return null;
    const parts: string[] = [];
    for (const element of expression.expression.expression.elements) {
      if (ts.isSpreadElement(element)) return null;
      const value = resolveString(element, source, seen);
      if (value === null) return null;
      parts.push(value);
    }
    return parts.join(separator);
  }
  return null;
}

function collectViAliases(source: ts.SourceFile): Set<string> {
  const aliases = new Set<string>();
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === "vitest"
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const imported = element.propertyName?.text ?? element.name.text;
          if (imported === "vi") aliases.add(element.name.text);
        }
      }
    }
  }

  let expanded = true;
  while (expanded) {
    expanded = false;
    function visit(node: ts.Node): void {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isIdentifier(node.initializer) &&
        aliases.has(node.initializer.text) &&
        !aliases.has(node.name.text)
      ) {
        aliases.add(node.name.text);
        expanded = true;
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return aliases;
}

function hasStaticEntryPoint(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidenceCandidate,
): boolean {
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== row.entryPointModule
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    if (
      bindings.elements.some((element) => {
        const imported = element.propertyName?.text ?? element.name.text;
        return (
          imported === row.entryPointExport &&
          element.name.text === row.entryPointLocalName
        );
      })
    ) {
      return true;
    }
  }
  return false;
}

function hasDynamicActualEntryPoint(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidenceCandidate,
): boolean {
  const aliases = collectViAliases(source);
  let exactImport = false;
  let exportBound = false;
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      aliases.has(node.expression.expression.text) &&
      node.expression.name.text === "importActual" &&
      node.arguments[0] &&
      resolveString(node.arguments[0], source) === row.entryPointModule
    ) {
      exactImport = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      node.left.text === row.entryPointLocalName &&
      ts.isPropertyAccessExpression(node.right) &&
      node.right.name.text === row.entryPointExport
    ) {
      exportBound = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return exactImport && exportBound;
}

function invokes(test: TestRecord, localName: string): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === localName
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(test.callback);
  return found;
}

function callAssertions(source: ts.SourceFile, test: TestRecord): CallAssertion[] {
  const result: CallAssertion[] = [];
  const matchers = new Set([
    "toHaveBeenCalled",
    "toHaveBeenCalledWith",
    "toHaveBeenCalledOnce",
    "toHaveBeenCalledTimes",
  ]);
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      matchers.has(node.expression.name.text)
    ) {
      let targetExpression: ts.Expression = node.expression.expression;
      let negated = false;
      if (
        ts.isPropertyAccessExpression(targetExpression) &&
        targetExpression.name.text === "not"
      ) {
        negated = true;
        targetExpression = targetExpression.expression;
      }
      if (
        ts.isCallExpression(targetExpression) &&
        ts.isIdentifier(targetExpression.expression) &&
        targetExpression.expression.text === "expect" &&
        targetExpression.arguments.length === 1
      ) {
        result.push({
          target: targetExpression.arguments[0].getText(source),
          negated,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(test.callback);
  return result;
}

function hasStatusAssertion(
  source: ts.SourceFile,
  test: TestRecord,
  expected: number,
): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "toBe" &&
      node.arguments[0] &&
      ts.isNumericLiteral(node.arguments[0]) &&
      Number(node.arguments[0].text) === expected
    ) {
      const expectCall = node.expression.expression;
      if (
        ts.isCallExpression(expectCall) &&
        ts.isIdentifier(expectCall.expression) &&
        expectCall.expression.text === "expect" &&
        expectCall.arguments[0] &&
        ts.isPropertyAccessExpression(expectCall.arguments[0]) &&
        expectCall.arguments[0].name.text === "status"
      ) {
        found = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(test.callback);
  return found;
}

function hasResultAssertion(
  source: ts.SourceFile,
  test: TestRecord,
  entryPoint: string,
  requiredText: readonly string[],
): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === "toEqual" ||
        node.expression.name.text === "toMatchObject") &&
      node.arguments[0]
    ) {
      const resolves = node.expression.expression;
      if (
        ts.isPropertyAccessExpression(resolves) &&
        resolves.name.text === "resolves" &&
        ts.isCallExpression(resolves.expression) &&
        ts.isIdentifier(resolves.expression.expression) &&
        resolves.expression.expression.text === "expect" &&
        resolves.expression.arguments[0] &&
        ts.isCallExpression(resolves.expression.arguments[0]) &&
        ts.isIdentifier(resolves.expression.arguments[0].expression) &&
        resolves.expression.arguments[0].expression.text === entryPoint
      ) {
        const assertionText = node.arguments[0].getText(source);
        if (requiredText.every((text) => assertionText.includes(text))) found = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(test.callback);
  return found;
}

function factoryReturnExpression(factory: ts.Expression): ts.Expression | null {
  const resolved = factory;
  if (ts.isArrowFunction(resolved)) {
    if (!ts.isBlock(resolved.body)) return resolved.body;
    for (const statement of resolved.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression) {
        return statement.expression;
      }
    }
  }
  if (ts.isFunctionExpression(resolved)) {
    for (const statement of resolved.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression) {
        return statement.expression;
      }
    }
  }
  return null;
}

function trustedActualNames(
  source: ts.SourceFile,
  factory: ts.Expression,
  moduleName: string,
): Set<string> {
  const trusted = new Set<string>();
  const resolvedFactory = resolveExpression(source, factory);
  if (!ts.isArrowFunction(resolvedFactory) && !ts.isFunctionExpression(resolvedFactory)) {
    return trusted;
  }
  const callbackParameter =
    resolvedFactory.parameters[0] && ts.isIdentifier(resolvedFactory.parameters[0].name)
      ? resolvedFactory.parameters[0].name.text
      : null;
  const aliases = collectViAliases(source);
  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isAwaitExpression(node.initializer) &&
      ts.isCallExpression(node.initializer.expression)
    ) {
      const call = node.initializer.expression;
      const callbackActual =
        callbackParameter !== null &&
        ts.isIdentifier(call.expression) &&
        call.expression.text === callbackParameter;
      const explicitActual =
        ts.isPropertyAccessExpression(call.expression) &&
        ts.isIdentifier(call.expression.expression) &&
        aliases.has(call.expression.expression.text) &&
        call.expression.name.text === "importActual" &&
        call.arguments[0] &&
        resolveString(call.arguments[0], source) === moduleName;
      if (callbackActual || explicitActual) trusted.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(resolvedFactory);
  return trusted;
}

function directFactoryViolations(
  source: ts.SourceFile,
  moduleName: string,
  factoryInput: ts.Expression | undefined,
  forbiddenName: string,
): string[] {
  if (!factoryInput) return [`${moduleName} has an unauditable automatic mock`];
  const factory = resolveExpression(source, factoryInput);
  const returned = factoryReturnExpression(factory);
  if (!returned) return [`${moduleName} mock factory has no auditable return`];
  const objectExpression = resolveExpression(source, returned);
  const trusted = trustedActualNames(source, factory, moduleName);
  const violations: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(source).replace(/["']/g, "");
      if (name === forbiddenName) violations.push(`${moduleName} replaces ${forbiddenName}`);
    }
    if (ts.isShorthandPropertyAssignment(node) && node.name.text === forbiddenName) {
      violations.push(`${moduleName} replaces ${forbiddenName} through shorthand`);
    }
    if (ts.isSpreadAssignment(node)) {
      if (!ts.isIdentifier(node.expression) || !trusted.has(node.expression.text)) {
        violations.push(`${moduleName} uses an untrusted mock object spread`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(objectExpression);
  return violations;
}

function resolveModuleFile(moduleName: string): string | null {
  if (!moduleName.startsWith("@/")) return null;
  const base = path.join(ROOT, moduleName.slice(2));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  const absolute = candidates.find((candidate) => fs.existsSync(candidate));
  return absolute ? path.relative(ROOT, absolute).replaceAll("\\", "/") : null;
}

function reexportsFinalGuard(
  relativePath: string,
  finalModule: string,
  forbiddenName: string,
): boolean {
  const source = parseFile(relativePath);
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === finalModule
    ) {
      if (!node.exportClause) {
        found = true;
      } else if (
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.some(
          (element) =>
            (element.propertyName?.text ?? element.name.text) === forbiddenName,
        )
      ) {
        found = true;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function finalGuardMockViolations(source: ts.SourceFile): string[] {
  const aliases = collectViAliases(source);
  const violations: string[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      aliases.has(node.expression.expression.text)
    ) {
      const method = node.expression.name.text;
      if (method === "spyOn") {
        const property = node.arguments[1]
          ? resolveString(node.arguments[1], source)
          : null;
        if (property !== null && FINAL_GUARD_NAMES.has(property)) {
          violations.push(`${source.fileName} spies on ${property}`);
        }
      }
      if (method === "mock" || method === "doMock") {
        const moduleName = node.arguments[0]
          ? resolveString(node.arguments[0], source)
          : null;
        if (moduleName === null) {
          violations.push(`${source.fileName} has a dynamic ${method} module`);
        } else {
          for (const candidate of EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES) {
            if (!candidate.finalGuardModule || !candidate.forbiddenMockedGuardSymbol) {
              continue;
            }
            if (moduleName === candidate.finalGuardModule) {
              violations.push(
                ...directFactoryViolations(
                  source,
                  moduleName,
                  node.arguments[1],
                  candidate.forbiddenMockedGuardSymbol,
                ),
              );
            } else {
              const mockedFile = resolveModuleFile(moduleName);
              if (
                mockedFile &&
                reexportsFinalGuard(
                  mockedFile,
                  candidate.finalGuardModule,
                  candidate.forbiddenMockedGuardSymbol,
                )
              ) {
                violations.push(
                  `${moduleName} is a mocked intermediary for ${candidate.forbiddenMockedGuardSymbol}`,
                );
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...new Set(violations)];
}

function setupFiles(): string[] {
  const config = fs.readFileSync(path.join(ROOT, "vitest.config.ts"), "utf8");
  const block = config.match(/setupFiles\s*:\s*\[([\s\S]*?)\]/)?.[1];
  if (!block) return [];
  return [...block.matchAll(/["']([^"']+)["']/g)].map((match) =>
    match[1].replace(/^\.\//, ""),
  );
}

function candidateViolations(row: Exec003BehaviorEvidenceCandidate): string[] {
  const violations: string[] = [];
  if (row.candidateClass !== "CANDIDATE_DIRECT_BEHAVIORAL") {
    violations.push(`${row.operationId} is self-credited`);
  }
  if (row.allowTestName === row.denyTestName) {
    violations.push(`${row.operationId} shares one ALLOW/DENY test name`);
  }

  const source = parseFile(row.testFile);
  const tests = testRecords(source);
  const allow = tests.get(row.allowTestName);
  const deny = tests.get(row.denyTestName);
  if (!allow) violations.push(`${row.operationId} ALLOW test missing`);
  if (!deny) violations.push(`${row.operationId} DENY test missing`);
  if (!allow || !deny) return violations;
  if (allow.callback.pos === deny.callback.pos) {
    violations.push(`${row.operationId} ALLOW/DENY callbacks are identical`);
  }

  const bound =
    row.importMode === "STATIC"
      ? hasStaticEntryPoint(source, row)
      : hasDynamicActualEntryPoint(source, row);
  if (!bound) violations.push(`${row.operationId} entry point binding missing`);
  if (!invokes(allow, row.entryPointLocalName)) {
    violations.push(`${row.operationId} ALLOW does not invoke entry point`);
  }
  if (!invokes(deny, row.entryPointLocalName)) {
    violations.push(`${row.operationId} DENY does not invoke entry point`);
  }

  const contract = row.assertionContract;
  if (contract.kind === "DOWNSTREAM_CALL") {
    const allowAssertions = callAssertions(source, allow);
    const denyAssertions = callAssertions(source, deny);
    if (
      !allowAssertions.some(
        (assertion) => assertion.target === contract.symbol && !assertion.negated,
      )
    ) {
      violations.push(`${row.operationId} ALLOW downstream proof missing`);
    }
    if (
      !denyAssertions.some(
        (assertion) => assertion.target === contract.symbol && assertion.negated,
      )
    ) {
      violations.push(`${row.operationId} DENY downstream block missing`);
    }
  } else if (contract.kind === "RESPONSE_STATUS") {
    if (!hasStatusAssertion(source, allow, contract.allowStatus)) {
      violations.push(`${row.operationId} ALLOW status contract missing`);
    }
    if (!hasStatusAssertion(source, deny, contract.denyStatus)) {
      violations.push(`${row.operationId} DENY status contract missing`);
    }
  } else {
    if (
      !hasResultAssertion(
        source,
        allow,
        row.entryPointLocalName,
        contract.allowRequiredText,
      )
    ) {
      violations.push(`${row.operationId} ALLOW result contract missing`);
    }
    if (
      !hasResultAssertion(
        source,
        deny,
        row.entryPointLocalName,
        contract.denyRequiredText,
      )
    ) {
      violations.push(`${row.operationId} DENY result contract missing`);
    }
  }

  violations.push(...finalGuardMockViolations(source));
  return [...new Set(violations)];
}

function operationIdAt(index: number): string {
  const operation = EXEC_003_OPERATION_ASSIGNMENTS[index];
  const ordinal = EXEC_003_OPERATION_ASSIGNMENTS.slice(0, index + 1).filter(
    (candidate) => candidate.contractId === operation.contractId,
  ).length;
  return `${operation.contractId}-O${String(ordinal).padStart(2, "0")}`;
}

function fingerprintAt(index: number): string {
  const operation = EXEC_003_OPERATION_ASSIGNMENTS[index];
  return [
    operation.method,
    operation.routeOrContract,
    operation.permissionKey,
    operation.legacyGuardKind,
  ].join("|");
}

function matrixViolations(entry: {
  testFile: string;
  testName: string;
  entryPointLocalName: string;
  downstreamSymbol: string;
}): string[] {
  const source = parseFile(entry.testFile);
  const test = testRecords(source).get(entry.testName);
  if (!test) return [`${entry.testName} missing`];
  const violations: string[] = [];
  if (!invokes(test, entry.entryPointLocalName)) {
    violations.push(`${entry.testName} entry point invocation missing`);
  }
  if (!test.callback.getText(source).includes("userActive = false")) {
    violations.push(`${entry.testName} inactive-user state missing`);
  }
  if (
    !callAssertions(source, test).some(
      (assertion) =>
        assertion.target === entry.downstreamSymbol && assertion.negated,
    )
  ) {
    violations.push(`${entry.testName} downstream block missing`);
  }
  return violations;
}

const RESULTS = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => ({
  row,
  violations: candidateViolations(row),
}));
const VALIDATED = RESULTS.filter((result) => result.violations.length === 0).map(
  (result) => result.row,
);

describe("EXEC-003 v2 semantic evidence ledger", () => {
  it("keeps rows candidate-only and grants credit only after semantic validation", () => {
    expect(EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES).toHaveLength(32);
    expect(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.every(
        (row) => row.candidateClass === "CANDIDATE_DIRECT_BEHAVIORAL",
      ),
    ).toBe(true);
    expect(RESULTS.flatMap((result) => result.violations)).toEqual([]);
  });

  it("requires independent ALLOW and DENY tests and callbacks", () => {
    for (const row of EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES) {
      expect(row.allowTestName).not.toBe(row.denyTestName);
      const tests = testRecords(parseFile(row.testFile));
      const allow = tests.get(row.allowTestName);
      const deny = tests.get(row.denyTestName);
      expect(allow).toBeDefined();
      expect(deny).toBeDefined();
      expect(allow?.callback.pos).not.toBe(deny?.callback.pos);
    }
  });

  it("pins positional IDs to method-route-permission-boundary fingerprints", () => {
    expect(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => ({
        id: row.operationId,
        fingerprint: row.operationFingerprint,
      })),
    ).toEqual(
      EXEC_003_OPERATION_ASSIGNMENTS.map((_operation, index) => ({
        id: operationIdAt(index),
        fingerprint: fingerprintAt(index),
      })),
    );
  });

  it("scans registered tests and Vitest setup files for final-guard replacement", () => {
    const files = new Set(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => row.testFile),
    );
    for (const setupFile of setupFiles()) files.add(setupFile);
    expect(
      [...files].flatMap((file) => finalGuardMockViolations(parseFile(file))),
    ).toEqual([]);
  });

  it("detects mock, doMock, spyOn, aliases, object spreads and indirect factories", () => {
    const fixtures = [
      `import { vi } from "vitest"; vi.mock("@/lib/api-auth-guard", () => ({ hasDatabaseRole: vi.fn() }));`,
      `import { vi } from "vitest"; vi.doMock("@/lib/agents/access", () => ({ requireAgentAccess: vi.fn() }));`,
      `import { vi } from "vitest"; vi.spyOn(auth, "hasDatabaseRole");`,
      `import { vi as v } from "vitest"; v.mock("@/lib/agents/access", () => ({ requireAgentAccess: v.fn() }));`,
      `import { vi } from "vitest"; const replacement = { hasDatabaseRole: vi.fn() }; vi.mock("@/lib/api-auth-guard", () => replacement);`,
      `import { vi } from "vitest"; const replacement = { requireAgentAccess: vi.fn() }; const factory = () => replacement; vi.doMock("@/lib/agents/access", factory);`,
      `import { vi } from "vitest"; const replacement = { other: vi.fn() }; vi.mock("@/lib/api-auth-guard", () => ({ ...replacement }));`,
    ];
    for (const [index, fixture] of fixtures.entries()) {
      expect(
        finalGuardMockViolations(parseText(`fixture-${index}.ts`, fixture)).length,
      ).toBeGreaterThan(0);
    }
  });

  it("proves inactive-user denial across bearer, Cookie, Server Action, read, mutation and sensitive read", () => {
    expect(
      EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE.flatMap((entry) =>
        matrixViolations(entry),
      ),
    ).toEqual([]);
    expect(
      new Set(
        EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE.flatMap((entry) => [
          ...entry.coverage,
        ]),
      ),
    ).toEqual(
      new Set([
        "ROUTE_BEARER_CAPABLE",
        "COOKIE_ONLY_ROUTE",
        "SERVER_ACTION",
        "READ",
        "MUTATION",
        "SENSITIVE_READ",
      ]),
    );
  });

  it("proves Legacy allow plus Progressive deny from an actual frozen entry point", () => {
    const proof = EXEC_003_PROGRESSIVE_DENY_ENTRYPOINT_PROOF;
    const source = parseFile(proof.testFile);
    const test = testRecords(source).get(proof.testName);
    expect(test).toBeDefined();
    if (!test) return;
    expect(invokes(test, proof.entryPointLocalName)).toBe(true);
    expect(test.callback.getText(source)).toContain(proof.permissionKey);
    expect(
      callAssertions(source, test).some(
        (assertion) =>
          assertion.target === proof.downstreamSymbol && assertion.negated,
      ),
    ).toBe(true);
  });

  it("derives direct credit and the remaining gap from validated operations only", () => {
    const contracts = new Set(VALIDATED.map((row) => row.contractId));
    const byPriority = new Map<string, Set<string>>();
    for (const row of VALIDATED) {
      const assignment = EXEC_003_OPERATION_ASSIGNMENTS.find(
        (candidate) =>
          candidate.contractId === row.contractId &&
          candidate.permissionKey === row.permissionKey,
      );
      if (!assignment) continue;
      const credited = byPriority.get(assignment.priority) ?? new Set<string>();
      credited.add(row.contractId);
      byPriority.set(assignment.priority, credited);
    }
    expect({
      contracts: contracts.size,
      operations: VALIDATED.length,
      remaining: 59 - contracts.size,
      P0: 11 - (byPriority.get("P0_SECURITY_CRITICAL_SURFACE")?.size ?? 0),
      P1_MUTATION: 8 - (byPriority.get("P1_MUTATION_SURFACE")?.size ?? 0),
      P1_SENSITIVE_READ:
        6 - (byPriority.get("P1_SENSITIVE_READ_SURFACE")?.size ?? 0),
      P2: 16,
      P3: 16,
      P4: 2,
    }).toEqual({
      contracts: 25,
      operations: 32,
      remaining: 34,
      P0: 0,
      P1_MUTATION: 0,
      P1_SENSITIVE_READ: 0,
      P2: 16,
      P3: 16,
      P4: 2,
    });
  });

  it("prevents same-file spillover and out-of-freeze credit", () => {
    const owners = new Map<string, Set<string>>();
    for (const row of VALIDATED) {
      for (const testName of [row.allowTestName, row.denyTestName]) {
        const key = `${row.testFile}::${testName}`;
        const current = owners.get(key) ?? new Set<string>();
        current.add(row.contractId);
        owners.set(key, current);
      }
    }
    expect([...owners.values()].every((set) => set.size === 1)).toBe(true);
    expect(new Set(VALIDATED.map((row) => row.contractId))).toEqual(
      new Set(EXEC_003_OPERATION_ASSIGNMENTS.map((row) => row.contractId)),
    );
  });
});
