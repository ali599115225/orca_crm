import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as ts from "typescript";
import { EXEC_003_OPERATION_ASSIGNMENTS } from "@/lib/auth/exec-003-permission-assignments";
import {
  EXEC_003_BEHAVIOR_EVIDENCE,
  EXEC_003_EVIDENCE_IDENTITY,
  type Exec003BehaviorEvidence,
} from "@/tests/foundation/g5-exec-003-behavior-evidence-manifest";

const ROOT = process.cwd();
const LEDGER_PATH = path.join(
  ROOT,
  "docs/zero-based/Z8/ORCA_Z8_EXEC_003_V2_EVIDENCE_LEDGER.md",
);

const OLD_IDENTITIES = [
  "3dc4b8d865212716e5bfdb844a85e7d9c90e17ea",
  "#365",
  "0ea28c491d67fee8356f566a34861daf0b956474",
] as const;

type ExecutableTest = {
  name: string;
  callback: ts.ArrowFunction | ts.FunctionExpression;
};

function sourceFile(testFile: string): ts.SourceFile {
  const absolute = path.join(ROOT, testFile);
  return ts.createSourceFile(
    absolute,
    fs.readFileSync(absolute, "utf8"),
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

function hasStaticImport(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidence,
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

function hasDynamicActualBinding(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidence,
): boolean {
  let importsActual = false;
  let bindsExport = false;

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "vi" &&
      node.expression.name.text === "importActual"
    ) {
      importsActual = true;
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
  return importsActual && bindsExport;
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

type CallAssertion = {
  target: string;
  negated: boolean;
};

function callAssertions(
  source: ts.SourceFile,
  test: ExecutableTest,
): CallAssertion[] {
  const assertions: CallAssertion[] = [];
  const matchers = new Set([
    "toHaveBeenCalled",
    "toHaveBeenCalledWith",
    "toHaveBeenCalledOnce",
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

function hasAnyExpectation(test: ExecutableTest): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "expect"
    ) {
      found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(test.callback);
  return found;
}

function mockedGuardSymbols(source: ts.SourceFile): Map<string, Set<string>> {
  const mocked = new Map<string, Set<string>>();

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "vi" &&
      node.expression.name.text === "mock" &&
      node.arguments.length >= 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const moduleName = node.arguments[0].text;
      const symbols = mocked.get(moduleName) ?? new Set<string>();
      const factory = node.arguments[1];
      if (factory) {
        const inspectFactory = (child: ts.Node) => {
          if (ts.isPropertyAssignment(child)) {
            const name = child.name.getText(source).replace(/["']/g, "");
            symbols.add(name);
          } else if (ts.isShorthandPropertyAssignment(child)) {
            symbols.add(child.name.text);
          }
          ts.forEachChild(child, inspectFactory);
        };
        inspectFactory(factory);
      }
      mocked.set(moduleName, symbols);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return mocked;
}

function validateEvidenceRow(row: Exec003BehaviorEvidence): void {
  const source = sourceFile(row.testFile);
  const tests = executableTests(source);
  const allow = tests.get(row.allowTestName);
  const deny = tests.get(row.denyTestName);

  expect(allow, `${row.operationId} ALLOW test must be executable`).toBeDefined();
  expect(deny, `${row.operationId} DENY test must be executable`).toBeDefined();
  if (!allow || !deny) return;

  const entryPointBound =
    row.importMode === "STATIC"
      ? hasStaticImport(source, row)
      : hasDynamicActualBinding(source, row);
  expect(
    entryPointBound,
    `${row.operationId} must bind ${row.entryPointExport} from ${row.entryPointModule}`,
  ).toBe(true);

  expect(
    invokesEntryPoint(allow, row.entryPointLocalName),
    `${row.operationId} ALLOW must invoke the actual entry point`,
  ).toBe(true);
  expect(
    invokesEntryPoint(deny, row.entryPointLocalName),
    `${row.operationId} DENY must invoke the actual entry point`,
  ).toBe(true);

  if (row.downstreamSymbol) {
    const allowAssertions = callAssertions(source, allow);
    const denyAssertions = callAssertions(source, deny);
    expect(
      allowAssertions.some(
        (assertion) =>
          assertion.target === row.downstreamSymbol && !assertion.negated,
      ),
      `${row.operationId} ALLOW must prove downstream reachability`,
    ).toBe(true);
    expect(
      denyAssertions.some(
        (assertion) =>
          assertion.target === row.downstreamSymbol && assertion.negated,
      ),
      `${row.operationId} DENY must prove downstream non-execution`,
    ).toBe(true);
  } else {
    expect(hasAnyExpectation(allow)).toBe(true);
    expect(hasAnyExpectation(deny)).toBe(true);
  }

  if (row.finalGuardModule && row.forbiddenMockedGuardSymbol) {
    const mocks = mockedGuardSymbols(source);
    expect(
      mocks.get(row.finalGuardModule)?.has(row.forbiddenMockedGuardSymbol) ??
        false,
      `${row.operationId} must not mock ${row.forbiddenMockedGuardSymbol}`,
    ).toBe(false);
  }
}

describe("EXEC-003 v2 semantic direct-behavior evidence ledger", () => {
  it("contains exactly the frozen 25 contracts and 32 unique operations", () => {
    expect(EXEC_003_BEHAVIOR_EVIDENCE).toHaveLength(32);
    expect(
      new Set(EXEC_003_BEHAVIOR_EVIDENCE.map((row) => row.operationId)).size,
    ).toBe(32);
    expect(
      new Set(EXEC_003_BEHAVIOR_EVIDENCE.map((row) => row.contractId)).size,
    ).toBe(25);
  });

  it("matches Assignment Registry permission keys, boundaries and Legacy roles", () => {
    const assignments = EXEC_003_OPERATION_ASSIGNMENTS.map(
      (operation, index) => ({
        operationId: `${operation.contractId}-O${String(
          EXEC_003_OPERATION_ASSIGNMENTS.slice(0, index + 1).filter(
            (candidate) => candidate.contractId === operation.contractId,
          ).length,
        ).padStart(2, "0")}`,
        permissionKey: operation.permissionKey,
        boundaryType: operation.legacyGuardKind,
        legacyRoles: [...operation.legacyAllowedRoles],
      }),
    );

    expect(
      EXEC_003_BEHAVIOR_EVIDENCE.map((row) => ({
        operationId: row.operationId,
        permissionKey: row.permissionKey,
        boundaryType: row.boundaryType,
        legacyRoles: [...row.legacyRoles],
      })),
    ).toEqual(assignments);
  });

  it("binds every credit to executable ALLOW and DENY behavior without final-guard mocks", () => {
    for (const row of EXEC_003_BEHAVIOR_EVIDENCE) {
      validateEvidenceRow(row);
    }
  });

  it("prevents same-file spillover and out-of-freeze credit", () => {
    const testOwners = new Map<string, Set<string>>();
    for (const row of EXEC_003_BEHAVIOR_EVIDENCE) {
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
    expect(
      new Set(EXEC_003_BEHAVIOR_EVIDENCE.map((row) => row.contractId)),
    ).toEqual(
      new Set(EXEC_003_OPERATION_ASSIGNMENTS.map((row) => row.contractId)),
    );
  });

  it("derives strict direct credit and the remaining gap from executable evidence", () => {
    const directOperations = EXEC_003_BEHAVIOR_EVIDENCE.length;
    const directContracts = new Set(
      EXEC_003_BEHAVIOR_EVIDENCE.map((row) => row.contractId),
    ).size;
    const remainingGap = 59 - directContracts;
    const remainingByPriority = {
      P0: 11 -
        new Set(
          EXEC_003_BEHAVIOR_EVIDENCE.filter(
            (row) =>
              EXEC_003_OPERATION_ASSIGNMENTS.find(
                (assignment) =>
                  assignment.contractId === row.contractId &&
                  assignment.permissionKey === row.permissionKey,
              )?.priority === "P0_SECURITY_CRITICAL_SURFACE",
          ).map((row) => row.contractId),
        ).size,
      P1_MUTATION: 8 -
        new Set(
          EXEC_003_BEHAVIOR_EVIDENCE.filter(
            (row) =>
              EXEC_003_OPERATION_ASSIGNMENTS.find(
                (assignment) =>
                  assignment.contractId === row.contractId &&
                  assignment.permissionKey === row.permissionKey,
              )?.priority === "P1_MUTATION_SURFACE",
          ).map((row) => row.contractId),
        ).size,
      P1_SENSITIVE_READ: 6 -
        new Set(
          EXEC_003_BEHAVIOR_EVIDENCE.filter(
            (row) =>
              EXEC_003_OPERATION_ASSIGNMENTS.find(
                (assignment) =>
                  assignment.contractId === row.contractId &&
                  assignment.permissionKey === row.permissionKey,
              )?.priority === "P1_SENSITIVE_READ_SURFACE",
          ).map((row) => row.contractId),
        ).size,
    };

    expect(directOperations).toBe(32);
    expect(directContracts).toBe(25);
    expect(remainingGap).toBe(34);
    expect(remainingByPriority).toEqual({
      P0: 0,
      P1_MUTATION: 0,
      P1_SENSITIVE_READ: 0,
    });
  });

  it("rejects stale evidence identity without deriving credit from Markdown", () => {
    const ledger = fs.readFileSync(LEDGER_PATH, "utf8");
    for (const stale of OLD_IDENTITIES) expect(ledger).not.toContain(stale);

    const identityValues = Object.values(EXEC_003_EVIDENCE_IDENTITY);
    expect(
      identityValues.every(
        (value) =>
          value === "PENDING FINAL VALIDATION" ||
          /^[a-f0-9]{40}$/.test(value) ||
          /^#?\d+(?: \/ SUCCESS)?$/.test(value) ||
          value === "PR_MERGE_REF",
      ),
    ).toBe(true);
  });
});
