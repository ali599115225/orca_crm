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
const VITEST_CONFIG = path.join(ROOT, "vitest.config.ts");
const FINAL_GUARDS = ["hasDatabaseRole", "requireAgentAccess"] as const;

const SOURCE_CACHE = new Map<string, ts.SourceFile>();

type ExecutableTest = {
  name: string;
  callback: ts.ArrowFunction | ts.FunctionExpression;
};

type CallAssertion = {
  target: string;
  negated: boolean;
};

type MockCall = {
  method: "mock" | "doMock" | "spyOn";
  moduleName: string | null;
  node: ts.CallExpression;
  source: ts.SourceFile;
};

function sourceFile(relativePath: string): ts.SourceFile {
  const cached = SOURCE_CACHE.get(relativePath);
  if (cached) return cached;
  const absolute = path.join(ROOT, relativePath);
  const source = ts.createSourceFile(
    absolute,
    fs.readFileSync(absolute, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  SOURCE_CACHE.set(relativePath, source);
  return source;
}

function sourceFileFromText(name: string, content: string): ts.SourceFile {
  return ts.createSourceFile(
    name,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function executableTests(source: ts.SourceFile): Map<string, ExecutableTest> {
  const tests = new Map<string, ExecutableTest>();
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["it", "test"].includes(node.expression.text) &&
      node.arguments.length >= 2 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (ts.isArrowFunction(node.arguments[1]) ||
        ts.isFunctionExpression(node.arguments[1]))
    ) {
      const name = node.arguments[0].text;
      if (tests.has(name)) throw new Error(`Duplicate executable test: ${name}`);
      tests.set(name, { name, callback: node.arguments[1] });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return tests;
}

function variableInitializer(
  source: ts.SourceFile,
  name: string,
): ts.Expression | null {
  let result: ts.Expression | null = null;
  const visit = (node: ts.Node) => {
    if (
      !result &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      result = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function literalString(
  expression: ts.Expression,
  source: ts.SourceFile,
  seen = new Set<string>(),
): string | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text)) return null;
    seen.add(expression.text);
    const initializer = variableInitializer(source, expression.text);
    return initializer ? literalString(initializer, source, seen) : null;
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literalString(expression.left, source, seen);
    const right = literalString(expression.right, source, seen);
    return left !== null && right !== null ? `${left}${right}` : null;
  }
  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(expression.expression.expression)
  ) {
    const delimiter = expression.arguments[0]
      ? literalString(expression.arguments[0], source, seen)
      : ",";
    if (delimiter === null) return null;
    const items = expression.expression.expression.elements.map((element) =>
      ts.isExpression(element) ? literalString(element, source, seen) : null,
    );
    return items.every((item): item is string => item !== null)
      ? items.join(delimiter)
      : null;
  }
  return null;
}

function hasStaticImport(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidenceCandidate,
): boolean {
  return source.statements.some((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== row.entryPointModule
    ) {
      return false;
    }
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) return false;
    return bindings.elements.some((element) => {
      const imported = element.propertyName?.text ?? element.name.text;
      return (
        imported === row.entryPointExport &&
        element.name.text === row.entryPointLocalName
      );
    });
  });
}

function viAliases(source: ts.SourceFile): Set<string> {
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

  let changed = true;
  while (changed) {
    changed = false;
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isIdentifier(node.initializer) &&
        aliases.has(node.initializer.text) &&
        !aliases.has(node.name.text)
      ) {
        aliases.add(node.name.text);
        changed = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return aliases;
}

function hasDynamicActualBinding(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidenceCandidate,
): boolean {
  const aliases = viAliases(source);
  let importsExactModule = false;
  let bindsExport = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      aliases.has(node.expression.expression.text) &&
      node.expression.name.text === "importActual" &&
      node.arguments[0] &&
      literalString(node.arguments[0], source) === row.entryPointModule
    ) {
      importsExactModule = true;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      node.left.text === row.entryPointLocalName &&
      ts.isPropertyAccessExpression(node.right) &&
      node.right.name.text === row.entryPointExport
    ) {
      bindsExport = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return importsExactModule && bindsExport;
}

function invokesEntryPoint(
  test: ExecutableTest,
  localName: string,
): boolean {
  let invoked = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === localName
    ) {
      invoked = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(test.callback);
  return invoked;
}

function callAssertions(
  source: ts.SourceFile,
  test: ExecutableTest,
): CallAssertion[] {
  const assertions: CallAssertion[] = [];
  const matchers = new Set([
    "toHaveBeenCalled",
    "toHaveBeenCalledWith",
    "toHaveBeenCalledOnce",
    "toHaveBeenCalledTimes",
  ]);
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      matchers.has(node.expression.name.text)
    ) {
      let expectation: ts.Expression = node.expression.expression;
      let negated = false;
      if (
        ts.isPropertyAccessExpression(expectation) &&
        expectation.name.text === "not"
      ) {
        negated = true;
        expectation = expectation.expression;
      }
      if (
        ts.isCallExpression(expectation) &&
        ts.isIdentifier(expectation.expression) &&
        expectation.expression.text === "expect" &&
        expectation.arguments.length === 1
      ) {
        assertions.push({
          target: expectation.arguments[0].getText(source),
          negated,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(test.callback);
  return assertions;
}

function hasResponseStatusAssertion(
  source: ts.SourceFile,
  test: ExecutableTest,
  expectedStatus: number,
): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "toBe" &&
      node.arguments[0] &&
      ts.isNumericLiteral(node.arguments[0]) &&
      Number(node.arguments[0].text) === expectedStatus
    ) {
      const expectation = node.expression.expression;
      if (
        ts.isCallExpression(expectation) &&
        ts.isIdentifier(expectation.expression) &&
        expectation.expression.text === "expect" &&
        expectation.arguments[0] &&
        ts.isPropertyAccessExpression(expectation.arguments[0]) &&
        expectation.arguments[0].name.text === "status"
      ) {
        found = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(test.callback);
  return found;
}

function hasResultObjectAssertion(
  source: ts.SourceFile,
  test: ExecutableTest,
  entryPointLocalName: string,
  requiredText: readonly string[],
): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["toEqual", "toMatchObject"].includes(node.expression.name.text) &&
      node.arguments[0]
    ) {
      const matcherTarget = node.expression.expression;
      if (
        ts.isPropertyAccessExpression(matcherTarget) &&
        matcherTarget.name.text === "resolves" &&
        ts.isCallExpression(matcherTarget.expression) &&
        ts.isIdentifier(matcherTarget.expression.expression) &&
        matcherTarget.expression.expression.text === "expect" &&
        matcherTarget.expression.arguments[0]
      ) {
        const invocation = matcherTarget.expression.arguments[0];
        const invokes =
          ts.isCallExpression(invocation) &&
          ts.isIdentifier(invocation.expression) &&
          invocation.expression.text === entryPointLocalName;
        const assertionText = node.arguments[0].getText(source);
        if (invokes && requiredText.every((text) => assertionText.includes(text))) {
          found = true;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(test.callback);
  return found;
}

function mockCalls(source: ts.SourceFile): MockCall[] {
  const aliases = viAliases(source);
  const calls: MockCall[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      aliases.has(node.expression.expression.text) &&
      ["mock", "doMock", "spyOn"].includes(node.expression.name.text)
    ) {
      const method = node.expression.name.text as MockCall["method"];
      const moduleName =
        method === "spyOn" || !node.arguments[0]
          ? null
          : literalString(node.arguments[0], source);
      calls.push({ method, moduleName, node, source });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return calls;
}

function factoryReturnedExpression(
  factory: ts.Expression,
): ts.Expression | null {
  if (ts.isArrowFunction(factory)) {
    if (!ts.isBlock(factory.body)) return factory.body;
    for (const statement of factory.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression) {
        return statement.expression;
      }
    }
  }
  if (ts.isFunctionExpression(factory)) {
    for (const statement of factory.body.statements) {
      if (ts.isReturnStatement(statement) && statement.expression) {
        return statement.expression;
      }
    }
  }
  return null;
}

function importOriginalResultNames(
  source: ts.SourceFile,
  factory: ts.Expression,
  expectedModule: string,
): Set<string> {
  const trusted = new Set<string>();
  const callbackParameter =
    (ts.isArrowFunction(factory) || ts.isFunctionExpression(factory)) &&
    factory.parameters[0] &&
    ts.isIdentifier(factory.parameters[0].name)
      ? factory.parameters[0].name.text
      : null;
  const aliases = viAliases(source);
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isAwaitExpression(node.initializer) &&
      ts.isCallExpression(node.initializer.expression)
    ) {
      const call = node.initializer.expression;
      const callbackImport =
        callbackParameter &&
        ts.isIdentifier(call.expression) &&
        call.expression.text === callbackParameter;
      const directImport =
        ts.isPropertyAccessExpression(call.expression) &&
        ts.isIdentifier(call.expression.expression) &&
        aliases.has(call.expression.expression.text) &&
        call.expression.name.text === "importActual" &&
        call.arguments[0] &&
        literalString(call.arguments[0], source) === expectedModule;
      if (callbackImport || directImport) trusted.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(factory);
  return trusted;
}

function resolveExpression(
  source: ts.SourceFile,
  expression: ts.Expression,
  seen = new Set<string>(),
): ts.Expression {
  if (!ts.isIdentifier(expression) || seen.has(expression.text)) return expression;
  seen.add(expression.text);
  return variableInitializer(source, expression.text) ?? expression;
}

function factoryViolations(
  source: ts.SourceFile,
  moduleName: string,
  factory: ts.Expression | undefined,
  forbiddenSymbol: string,
): string[] {
  if (!factory) return [`${moduleName} automatic mock has no auditable factory`];
  const violations: string[] = [];
  const trustedActuals = importOriginalResultNames(source, factory, moduleName);
  const returned = factoryReturnedExpression(factory);
  if (!returned) return [`${moduleName} mock factory has no auditable return value`];
  const resolved = resolveExpression(source, returned);

  const inspect = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node)) {
      const propertyName = node.name.getText(source).replace(/["']/g, "");
      if (propertyName === forbiddenSymbol) {
        violations.push(`${moduleName} replaces ${forbiddenSymbol}`);
      }
    }
    if (
      ts.isShorthandPropertyAssignment(node) &&
      node.name.text === forbiddenSymbol
    ) {
      violations.push(`${moduleName} replaces ${forbiddenSymbol} indirectly`);
    }
    if (ts.isSpreadAssignment(node)) {
      if (!ts.isIdentifier(node.expression) || !trustedActuals.has(node.expression.text)) {
        violations.push(`${moduleName} uses an untrusted object spread in its mock factory`);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(resolved);
  return violations;
}

function resolveModuleFile(moduleName: string): string | null {
  if (!moduleName.startsWith("@/")) return null;
  const base = path.join(ROOT, moduleName.slice(2));
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate)) return path.relative(ROOT, candidate).replaceAll("\\", "/");
  }
  return null;
}

function moduleExportsForbiddenGuard(
  relativePath: string,
  forbiddenSymbol: string,
  finalModule: string,
): boolean {
  const source = sourceFile(relativePath);
  let reexports = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (
        node.moduleSpecifier.text === finalModule &&
        (!node.exportClause ||
          (ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.some(
              (element) =>
                (element.propertyName?.text ?? element.name.text) === forbiddenSymbol,
            )))
      ) {
        reexports = true;
      }
    }
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableStatement(node)) &&
      node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) &&
      node.getText(source).includes(forbiddenSymbol)
    ) {
      reexports = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return reexports;
}

function finalGuardMockViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  for (const call of mockCalls(source)) {
    if (call.method === "spyOn") {
      const property = call.node.arguments[1];
      const propertyName = property
        ? literalString(property, source)
        : call.node.getText(source);
      if (propertyName && FINAL_GUARDS.includes(propertyName as never)) {
        violations.push(`${source.fileName} spies on ${propertyName}`);
      }
      continue;
    }

    if (!call.moduleName) {
      violations.push(`${source.fileName} contains a dynamic ${call.method} module`);
      continue;
    }

    for (const row of EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES) {
      if (!row.finalGuardModule || !row.forbiddenMockedGuardSymbol) continue;
      if (call.moduleName === row.finalGuardModule) {
        violations.push(
          ...factoryViolations(
            source,
            call.moduleName,
            call.node.arguments[1],
            row.forbiddenMockedGuardSymbol,
          ),
        );
      } else {
        const mockedPath = resolveModuleFile(call.moduleName);
        if (
          mockedPath &&
          moduleExportsForbiddenGuard(
            mockedPath,
            row.forbiddenMockedGuardSymbol,
            row.finalGuardModule,
          )
        ) {
          violations.push(
            `${call.moduleName} is a mocked intermediary re-export of ${row.forbiddenMockedGuardSymbol}`,
          );
        }
      }
    }
  }
  return violations;
}

function configuredSetupFiles(): string[] {
  const content = fs.readFileSync(VITEST_CONFIG, "utf8");
  const match = content.match(/setupFiles\s*:\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) =>
    item[1].replace(/^\.\//, ""),
  );
}

function candidateViolations(
  row: Exec003BehaviorEvidenceCandidate,
): string[] {
  const violations: string[] = [];
  if (row.candidateClass !== "CANDIDATE_DIRECT_BEHAVIORAL") {
    violations.push(`${row.operationId} is self-credited by the manifest`);
  }
  if (row.allowTestName === row.denyTestName) {
    violations.push(`${row.operationId} ALLOW and DENY share one test name`);
  }

  const source = sourceFile(row.testFile);
  const tests = executableTests(source);
  const allow = tests.get(row.allowTestName);
  const deny = tests.get(row.denyTestName);
  if (!allow) violations.push(`${row.operationId} ALLOW test is missing`);
  if (!deny) violations.push(`${row.operationId} DENY test is missing`);
  if (!allow || !deny) return violations;
  if (allow.callback.pos === deny.callback.pos) {
    violations.push(`${row.operationId} ALLOW and DENY share one callback`);
  }

  const entryPointBound =
    row.importMode === "STATIC"
      ? hasStaticImport(source, row)
      : hasDynamicActualBinding(source, row);
  if (!entryPointBound) {
    violations.push(
      `${row.operationId} does not bind ${row.entryPointExport} from ${row.entryPointModule}`,
    );
  }
  if (!invokesEntryPoint(allow, row.entryPointLocalName)) {
    violations.push(`${row.operationId} ALLOW does not invoke the entry point`);
  }
  if (!invokesEntryPoint(deny, row.entryPointLocalName)) {
    violations.push(`${row.operationId} DENY does not invoke the entry point`);
  }

  if (row.assertionContract.kind === "DOWNSTREAM_CALL") {
    const allowAssertions = callAssertions(source, allow);
    const denyAssertions = callAssertions(source, deny);
    if (
      !allowAssertions.some(
        (assertion) =>
          assertion.target === row.assertionContract.symbol && !assertion.negated,
      )
    ) {
      violations.push(`${row.operationId} ALLOW lacks downstream reachability proof`);
    }
    if (
      !denyAssertions.some(
        (assertion) =>
          assertion.target === row.assertionContract.symbol && assertion.negated,
      )
    ) {
      violations.push(`${row.operationId} DENY lacks downstream non-execution proof`);
    }
  } else if (row.assertionContract.kind === "RESPONSE_STATUS") {
    if (
      !hasResponseStatusAssertion(
        source,
        allow,
        row.assertionContract.allowStatus,
      )
    ) {
      violations.push(`${row.operationId} ALLOW lacks its exact response status`);
    }
    if (
      !hasResponseStatusAssertion(source, deny, row.assertionContract.denyStatus)
    ) {
      violations.push(`${row.operationId} DENY lacks its exact response status`);
    }
  } else {
    if (
      !hasResultObjectAssertion(
        source,
        allow,
        row.entryPointLocalName,
        row.assertionContract.allowRequiredText,
      )
    ) {
      violations.push(`${row.operationId} ALLOW lacks its exact result contract`);
    }
    if (
      !hasResultObjectAssertion(
        source,
        deny,
        row.entryPointLocalName,
        row.assertionContract.denyRequiredText,
      )
    ) {
      violations.push(`${row.operationId} DENY lacks its exact result contract`);
    }
  }

  violations.push(...finalGuardMockViolations(source));
  return [...new Set(violations)];
}

function assignmentOperationId(index: number): string {
  const operation = EXEC_003_OPERATION_ASSIGNMENTS[index];
  const ordinal = EXEC_003_OPERATION_ASSIGNMENTS.slice(0, index + 1).filter(
    (candidate) => candidate.contractId === operation.contractId,
  ).length;
  return `${operation.contractId}-O${String(ordinal).padStart(2, "0")}`;
}

function assignmentFingerprint(index: number): string {
  const operation = EXEC_003_OPERATION_ASSIGNMENTS[index];
  return [
    operation.method,
    operation.routeOrContract,
    operation.permissionKey,
    operation.legacyGuardKind,
  ].join("|");
}

function validateMatrixEntry(entry: {
  testFile: string;
  testName: string;
  entryPointLocalName: string;
  downstreamSymbol: string;
}): string[] {
  const source = sourceFile(entry.testFile);
  const test = executableTests(source).get(entry.testName);
  if (!test) return [`Missing matrix test ${entry.testName}`];
  const violations: string[] = [];
  if (!invokesEntryPoint(test, entry.entryPointLocalName)) {
    violations.push(`${entry.testName} does not invoke its entry point`);
  }
  if (!test.callback.getText(source).includes("userActive = false")) {
    violations.push(`${entry.testName} does not model an inactive user`);
  }
  if (
    !callAssertions(source, test).some(
      (assertion) =>
        assertion.target === entry.downstreamSymbol && assertion.negated,
    )
  ) {
    violations.push(`${entry.testName} does not block downstream execution`);
  }
  return violations;
}

const CANDIDATE_RESULTS = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => ({
  row,
  violations: candidateViolations(row),
}));
const VALIDATED_ROWS = CANDIDATE_RESULTS.filter(
  (result) => result.violations.length === 0,
).map((result) => result.row);

describe("EXEC-003 v2 semantic direct-behavior evidence gate", () => {
  it("keeps the manifest candidate-only and derives credit from validation", () => {
    expect(EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES).toHaveLength(32);
    expect(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.every(
        (row) => row.candidateClass === "CANDIDATE_DIRECT_BEHAVIORAL",
      ),
    ).toBe(true);
    expect(CANDIDATE_RESULTS.flatMap((result) => result.violations)).toEqual([]);
  });

  it("requires distinct executable ALLOW and DENY callbacks for every operation", () => {
    for (const row of EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES) {
      expect(row.allowTestName).not.toBe(row.denyTestName);
      const tests = executableTests(sourceFile(row.testFile));
      const allow = tests.get(row.allowTestName);
      const deny = tests.get(row.denyTestName);
      expect(allow).toBeDefined();
      expect(deny).toBeDefined();
      expect(allow?.callback.pos).not.toBe(deny?.callback.pos);
    }
  });

  it("binds positional operation IDs to immutable operation fingerprints", () => {
    expect(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => ({
        operationId: row.operationId,
        fingerprint: row.operationFingerprint,
      })),
    ).toEqual(
      EXEC_003_OPERATION_ASSIGNMENTS.map((_operation, index) => ({
        operationId: assignmentOperationId(index),
        fingerprint: assignmentFingerprint(index),
      })),
    );
  });

  it("blocks final-guard mocks in registered tests and external setup files", () => {
    const registeredFiles = new Set(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => row.testFile),
    );
    for (const setupFile of configuredSetupFiles()) registeredFiles.add(setupFile);
    const violations = [...registeredFiles].flatMap((file) =>
      finalGuardMockViolations(sourceFile(file)),
    );
    expect(violations).toEqual([]);
  });

  it("detects vi.mock, vi.doMock, vi.spyOn, aliases and indirect factories", () => {
    const fixtures = [
      `import { vi } from "vitest"; vi.mock("@/lib/api-auth-guard", () => ({ hasDatabaseRole: vi.fn() }));`,
      `import { vi } from "vitest"; vi.doMock("@/lib/agents/access", () => ({ requireAgentAccess: vi.fn() }));`,
      `import { vi } from "vitest"; vi.spyOn(auth, "hasDatabaseRole");`,
      `import { vi as testVi } from "vitest"; testVi.mock("@/lib/agents/access", () => ({ requireAgentAccess: testVi.fn() }));`,
      `import { vi } from "vitest"; const replacement = { hasDatabaseRole: vi.fn() }; vi.mock("@/lib/api-auth-guard", () => replacement);`,
      `import { vi } from "vitest"; const replacement = { requireAgentAccess: vi.fn() }; const factory = () => replacement; vi.doMock("@/lib/agents/access", factory);`,
    ];
    for (const [index, fixture] of fixtures.entries()) {
      expect(
        finalGuardMockViolations(
          sourceFileFromText(`mock-fixture-${index}.ts`, fixture),
        ).length,
      ).toBeGreaterThan(0);
    }
  });

  it("detects intermediary final-guard re-exports", () => {
    const source = sourceFileFromText(
      "intermediary.ts",
      `export { hasDatabaseRole } from "@/lib/api-auth-guard";`,
    );
    let detected = false;
    const visit = (node: ts.Node) => {
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === "@/lib/api-auth-guard" &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.some(
          (element) =>
            (element.propertyName?.text ?? element.name.text) === "hasDatabaseRole",
        )
      ) {
        detected = true;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(detected).toBe(true);
  });

  it("proves inactive-user denial through every required entry-point category", () => {
    const violations = EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE.flatMap(
      validateMatrixEntry,
    );
    expect(violations).toEqual([]);
    const covered = new Set(
      EXEC_003_INACTIVE_USER_ENTRYPOINT_COVERAGE.flatMap((entry) => [
        ...entry.coverage,
      ]),
    );
    expect(covered).toEqual(
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
    const source = sourceFile(proof.testFile);
    const test = executableTests(source).get(proof.testName);
    expect(test).toBeDefined();
    if (!test) return;
    expect(invokesEntryPoint(test, proof.entryPointLocalName)).toBe(true);
    expect(test.callback.getText(source)).toContain(proof.permissionKey);
    expect(
      callAssertions(source, test).some(
        (assertion) =>
          assertion.target === proof.downstreamSymbol && assertion.negated,
      ),
    ).toBe(true);
  });

  it("derives strict direct credit and remaining gaps only from validated rows", () => {
    const directOperations = VALIDATED_ROWS.length;
    const directContracts = new Set(
      VALIDATED_ROWS.map((row) => row.contractId),
    ).size;
    const creditedByPriority = new Map<string, Set<string>>();
    for (const row of VALIDATED_ROWS) {
      const assignment = EXEC_003_OPERATION_ASSIGNMENTS.find(
        (candidate) =>
          candidate.contractId === row.contractId &&
          candidate.permissionKey === row.permissionKey,
      );
      if (!assignment) continue;
      const contracts = creditedByPriority.get(assignment.priority) ?? new Set();
      contracts.add(row.contractId);
      creditedByPriority.set(assignment.priority, contracts);
    }

    expect({
      directContracts,
      directOperations,
      remainingGap: 59 - directContracts,
      P0: 11 -
        (creditedByPriority.get("P0_SECURITY_CRITICAL_SURFACE")?.size ?? 0),
      P1_MUTATION: 8 -
        (creditedByPriority.get("P1_MUTATION_SURFACE")?.size ?? 0),
      P1_SENSITIVE_READ: 6 -
        (creditedByPriority.get("P1_SENSITIVE_READ_SURFACE")?.size ?? 0),
      P2: 16,
      P3: 16,
      P4: 2,
    }).toEqual({
      directContracts: 25,
      directOperations: 32,
      remainingGap: 34,
      P0: 0,
      P1_MUTATION: 0,
      P1_SENSITIVE_READ: 0,
      P2: 16,
      P3: 16,
      P4: 2,
    });
  });

  it("prevents same-file spillover and out-of-freeze credit", () => {
    const testOwners = new Map<string, Set<string>>();
    for (const row of VALIDATED_ROWS) {
      for (const testName of [row.allowTestName, row.denyTestName]) {
        const key = `${row.testFile}::${testName}`;
        const owners = testOwners.get(key) ?? new Set<string>();
        owners.add(row.contractId);
        testOwners.set(key, owners);
      }
    }
    expect(
      [...testOwners.values()].every((contractIds) => contractIds.size === 1),
    ).toBe(true);
    expect(new Set(VALIDATED_ROWS.map((row) => row.contractId))).toEqual(
      new Set(EXEC_003_OPERATION_ASSIGNMENTS.map((row) => row.contractId)),
    );
  });
});
