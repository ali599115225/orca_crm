import { execFileSync } from "node:child_process";
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
const DIGEST_SCRIPT = path.join(ROOT, "scripts/exec-003-evidence-digest.mjs");
const FINAL_GUARD_NAMES = new Set(["hasDatabaseRole", "requireAgentAccess"]);
const SOURCE_CACHE = new Map<string, ts.SourceFile>();

type TestCallback = ts.ArrowFunction | ts.FunctionExpression;
type TestRecord = { name: string; callback: TestCallback };
type CallAssertion = { target: string; negated: boolean };
type SourceResolver = (moduleName: string) => ts.SourceFile | null;

type DigestResult = {
  derivedEvidenceFiles: string[];
  entryPointFiles: string[];
  finalGuardFiles: string[];
  configFiles: string[];
  setupFiles: string[];
};

function parseFile(relativePath: string): ts.SourceFile {
  const cached = SOURCE_CACHE.get(relativePath);
  if (cached) return cached;
  const absolute = path.join(ROOT, relativePath);
  const parsed = ts.createSourceFile(
    relativePath,
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

function digestResult(): DigestResult {
  return JSON.parse(
    execFileSync(process.execPath, [DIGEST_SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  ) as DigestResult;
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

function prohibitedTestModifierViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  const prohibitedIdentifiers = new Set([
    "fit",
    "fdescribe",
    "xit",
    "xtest",
    "xdescribe",
  ]);
  const prohibitedProperties = new Set(["skip", "todo", "only", "focus"]);

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        prohibitedIdentifiers.has(node.expression.text)
      ) {
        violations.push(`${source.fileName} uses ${node.expression.text}`);
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        prohibitedProperties.has(node.expression.name.text)
      ) {
        violations.push(
          `${source.fileName} uses test modifier ${node.expression.name.text}`,
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...new Set(violations)];
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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function resolveExpression(
  source: ts.SourceFile,
  expression: ts.Expression,
  seen: Set<string> = new Set(),
): ts.Expression {
  const current = unwrapExpression(expression);
  if (!ts.isIdentifier(current) || seen.has(current.text)) return current;
  seen.add(current.text);
  const initializer = findVariableInitializer(source, current.text);
  return initializer ? resolveExpression(source, initializer, seen) : current;
}

function resolveString(
  expression: ts.Expression,
  source: ts.SourceFile,
  seen: Set<string> = new Set(),
): string | null {
  const current = unwrapExpression(expression);
  if (
    ts.isStringLiteral(current) ||
    ts.isNoSubstitutionTemplateLiteral(current)
  ) {
    return current.text;
  }
  if (ts.isIdentifier(current)) {
    if (seen.has(current.text)) return null;
    seen.add(current.text);
    const initializer = findVariableInitializer(source, current.text);
    return initializer ? resolveString(initializer, source, seen) : null;
  }
  if (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = resolveString(current.left, source, new Set(seen));
    const right = resolveString(current.right, source, new Set(seen));
    return left !== null && right !== null ? `${left}${right}` : null;
  }
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(current.expression.expression)
  ) {
    const separator = current.arguments[0]
      ? resolveString(current.arguments[0], source, new Set(seen))
      : ",";
    if (separator === null) return null;
    const values: string[] = [];
    for (const element of current.expression.expression.elements) {
      if (ts.isSpreadElement(element)) return null;
      const value = resolveString(element, source, new Set(seen));
      if (value === null) return null;
      values.push(value);
    }
    return values.join(separator);
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

function importObjectNames(source: ts.SourceFile, moduleName: string): Set<string> {
  const names = new Set<string>();
  const viAliases = collectViAliases(source);

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) names.add(bindings.name.text);
      if (statement.importClause?.name) names.add(statement.importClause.name.text);
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      const awaited = ts.isAwaitExpression(initializer)
        ? unwrapExpression(initializer.expression)
        : initializer;
      if (
        ts.isCallExpression(awaited) &&
        ts.isPropertyAccessExpression(awaited.expression) &&
        ts.isIdentifier(awaited.expression.expression) &&
        viAliases.has(awaited.expression.expression.text) &&
        awaited.expression.name.text === "importActual" &&
        awaited.arguments[0] &&
        resolveString(awaited.arguments[0], source) === moduleName
      ) {
        names.add(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return names;
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
  const actualObjects = new Set<string>();
  let exportBound = false;

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      const awaited = ts.isAwaitExpression(initializer)
        ? unwrapExpression(initializer.expression)
        : initializer;
      if (
        ts.isCallExpression(awaited) &&
        ts.isPropertyAccessExpression(awaited.expression) &&
        ts.isIdentifier(awaited.expression.expression) &&
        aliases.has(awaited.expression.expression.text) &&
        awaited.expression.name.text === "importActual" &&
        awaited.arguments[0] &&
        resolveString(awaited.arguments[0], source) === row.entryPointModule
      ) {
        actualObjects.add(node.name.text);
      }
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      node.left.text === row.entryPointLocalName &&
      ts.isPropertyAccessExpression(node.right) &&
      ts.isIdentifier(node.right.expression) &&
      actualObjects.has(node.right.expression.text) &&
      node.right.name.text === row.entryPointExport
    ) {
      exportBound = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return actualObjects.size > 0 && exportBound;
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
      node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      const awaited = ts.isAwaitExpression(initializer)
        ? unwrapExpression(initializer.expression)
        : initializer;
      if (ts.isCallExpression(awaited)) {
        const callbackActual =
          callbackParameter !== null &&
          ts.isIdentifier(awaited.expression) &&
          awaited.expression.text === callbackParameter;
        const explicitActual =
          ts.isPropertyAccessExpression(awaited.expression) &&
          ts.isIdentifier(awaited.expression.expression) &&
          aliases.has(awaited.expression.expression.text) &&
          awaited.expression.name.text === "importActual" &&
          awaited.arguments[0] &&
          resolveString(awaited.arguments[0], source) === moduleName;
        if (callbackActual || explicitActual) trusted.add(node.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(resolvedFactory);
  return trusted;
}

function propertyName(node: ts.PropertyName, source: ts.SourceFile): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  if (ts.isComputedPropertyName(node)) {
    return resolveString(node.expression, source);
  }
  return null;
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
      const name = propertyName(node.name, source);
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
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Object" &&
      node.expression.name.text === "assign"
    ) {
      violations.push(`${moduleName} uses Object.assign in a mock factory`);
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

function repositorySourceResolver(moduleName: string): ts.SourceFile | null {
  const file = resolveModuleFile(moduleName);
  return file ? parseFile(file) : null;
}

function sourceReexports(
  source: ts.SourceFile,
  targetModule: string,
  exportName: string,
): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === targetModule
    ) {
      if (!node.exportClause) {
        found = true;
      } else if (
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.some(
          (element) =>
            (element.propertyName?.text ?? element.name.text) === exportName,
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

function assignmentTargetsExport(
  left: ts.Expression,
  objectNames: Set<string>,
  exportName: string,
  source: ts.SourceFile,
): boolean {
  if (
    ts.isPropertyAccessExpression(left) &&
    ts.isIdentifier(left.expression) &&
    objectNames.has(left.expression.text)
  ) {
    return left.name.text === exportName;
  }
  if (
    ts.isElementAccessExpression(left) &&
    ts.isIdentifier(left.expression) &&
    objectNames.has(left.expression.text) &&
    left.argumentExpression
  ) {
    return resolveString(left.argumentExpression, source) === exportName;
  }
  return false;
}

function isTrustedDynamicActualBinding(
  node: ts.BinaryExpression,
  row: Exec003BehaviorEvidenceCandidate,
  entryObjects: Set<string>,
): boolean {
  return (
    ts.isIdentifier(node.left) &&
    node.left.text === row.entryPointLocalName &&
    ts.isPropertyAccessExpression(node.right) &&
    ts.isIdentifier(node.right.expression) &&
    entryObjects.has(node.right.expression.text) &&
    node.right.name.text === row.entryPointExport
  );
}

function entryPointAndGuardViolations(
  source: ts.SourceFile,
  row: Exec003BehaviorEvidenceCandidate,
  sourceResolver: SourceResolver = repositorySourceResolver,
): string[] {
  const aliases = collectViAliases(source);
  const entryObjects = importObjectNames(source, row.entryPointModule);
  const violations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      aliases.has(node.expression.expression.text)
    ) {
      const method = node.expression.name.text;
      if (method === "mock" || method === "doMock") {
        const moduleName = node.arguments[0]
          ? resolveString(node.arguments[0], source)
          : null;
        if (moduleName === null) {
          violations.push(`${source.fileName} has a dynamic ${method} module`);
        } else {
          if (moduleName === row.entryPointModule) {
            violations.push(
              `${row.operationId} mocks registered Entry Point module ${moduleName}`,
            );
          } else {
            const mockedSource = sourceResolver(moduleName);
            if (
              mockedSource &&
              sourceReexports(
                mockedSource,
                row.entryPointModule,
                row.entryPointExport,
              )
            ) {
              violations.push(
                `${row.operationId} mocks intermediary re-export ${moduleName}`,
              );
            }
          }

          if (
            row.finalGuardModule &&
            row.forbiddenMockedGuardSymbol &&
            moduleName === row.finalGuardModule
          ) {
            violations.push(
              ...directFactoryViolations(
                source,
                moduleName,
                node.arguments[1],
                row.forbiddenMockedGuardSymbol,
              ),
            );
          } else if (row.finalGuardModule && row.forbiddenMockedGuardSymbol) {
            const mockedSource = sourceResolver(moduleName);
            if (
              mockedSource &&
              sourceReexports(
                mockedSource,
                row.finalGuardModule,
                row.forbiddenMockedGuardSymbol,
              )
            ) {
              violations.push(
                `${moduleName} is a mocked intermediary for ${row.forbiddenMockedGuardSymbol}`,
              );
            }
          }
        }
      }

      if (method === "spyOn") {
        const property = node.arguments[1]
          ? resolveString(node.arguments[1], source)
          : null;
        const object = node.arguments[0];
        if (
          property === row.entryPointExport &&
          object &&
          ts.isIdentifier(object) &&
          entryObjects.has(object.text)
        ) {
          violations.push(`${row.operationId} spies on registered Entry Point export`);
        }
        if (
          property !== null &&
          row.forbiddenMockedGuardSymbol === property
        ) {
          violations.push(`${source.fileName} spies on final guard ${property}`);
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      if (
        ts.isIdentifier(node.left) &&
        node.left.text === row.entryPointLocalName &&
        !isTrustedDynamicActualBinding(node, row, entryObjects)
      ) {
        violations.push(`${row.operationId} reassigns Entry Point local alias`);
      }
      if (
        assignmentTargetsExport(
          node.left,
          entryObjects,
          row.entryPointExport,
          source,
        )
      ) {
        violations.push(`${row.operationId} mutates Entry Point export`);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "Object" &&
      node.expression.name.text === "assign" &&
      node.arguments[0] &&
      ts.isIdentifier(node.arguments[0]) &&
      entryObjects.has(node.arguments[0].text)
    ) {
      const mutationText = node.arguments.slice(1).map((argument) => argument.getText(source)).join(" ");
      if (mutationText.includes(row.entryPointExport)) {
        violations.push(`${row.operationId} mutates Entry Point through Object.assign`);
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...new Set(violations)];
}

function operationOwnershipViolations(
  rows: readonly Pick<
    Exec003BehaviorEvidenceCandidate,
    "operationId" | "testFile" | "allowTestName" | "denyTestName"
  >[],
): string[] {
  const owners = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const testName of [row.allowTestName, row.denyTestName]) {
      const key = `${row.testFile}::${testName}`;
      const operations = owners.get(key) ?? new Set<string>();
      operations.add(row.operationId);
      owners.set(key, operations);
    }
  }
  return [...owners.entries()]
    .filter(([, operationIds]) => operationIds.size > 1)
    .map(
      ([testKey, operationIds]) =>
        `${testKey} credits multiple Operation IDs: ${[...operationIds].join(", ")}`,
    );
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

function assignmentAt(index: number) {
  return EXEC_003_OPERATION_ASSIGNMENTS[index];
}

function candidateViolations(
  row: Exec003BehaviorEvidenceCandidate,
  index: number,
): string[] {
  const violations: string[] = [];
  const assignment = assignmentAt(index);

  if (row.candidateClass !== "CANDIDATE_DIRECT_BEHAVIORAL") {
    violations.push(`${row.operationId} is self-credited`);
  }
  if (row.allowTestName === row.denyTestName) {
    violations.push(`${row.operationId} shares one ALLOW/DENY test name`);
  }
  if (row.operationId !== operationIdAt(index)) {
    violations.push(`${row.operationId} has an unstable positional Operation ID`);
  }
  if (row.operationFingerprint !== fingerprintAt(index)) {
    violations.push(`${row.operationId} fingerprint mismatch`);
  }
  if (row.permissionKey !== assignment.permissionKey) {
    violations.push(`${row.operationId} Permission Key mismatch`);
  }
  if (row.boundaryType !== assignment.legacyGuardKind) {
    violations.push(`${row.operationId} authentication boundary mismatch`);
  }
  if (JSON.stringify(row.legacyRoles) !== JSON.stringify(assignment.legacyAllowedRoles)) {
    violations.push(`${row.operationId} Legacy roles mismatch`);
  }

  const source = parseFile(row.testFile);
  violations.push(...prohibitedTestModifierViolations(source));
  violations.push(...entryPointAndGuardViolations(source, row));

  const tests = testRecords(source);
  const allow = tests.get(row.allowTestName);
  const deny = tests.get(row.denyTestName);
  if (!allow) violations.push(`${row.operationId} ALLOW test missing`);
  if (!deny) violations.push(`${row.operationId} DENY test missing`);
  if (!allow || !deny) return [...new Set(violations)];
  if (allow.callback.pos === deny.callback.pos) {
    violations.push(`${row.operationId} ALLOW/DENY callbacks are identical`);
  }

  const bound =
    row.importMode === "STATIC"
      ? hasStaticEntryPoint(source, row)
      : hasDynamicActualEntryPoint(source, row);
  if (!bound) violations.push(`${row.operationId} actual Entry Point binding missing`);
  if (!invokes(allow, row.entryPointLocalName)) {
    violations.push(`${row.operationId} ALLOW does not invoke its Entry Point`);
  }
  if (!invokes(deny, row.entryPointLocalName)) {
    violations.push(`${row.operationId} DENY does not invoke its Entry Point`);
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

  return [...new Set(violations)];
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
    violations.push(`${entry.testName} Entry Point invocation missing`);
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

const RESULTS = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row, index) => ({
  row,
  violations: candidateViolations(row, index),
}));
const VALIDATED = RESULTS.filter((result) => result.violations.length === 0).map(
  (result) => result.row,
);

describe("EXEC-003 v2 semantic evidence ledger", () => {
  it("derives credit from 25 Contract IDs and 32 validated Operation IDs", () => {
    expect(EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES).toHaveLength(32);
    expect(
      new Set(
        EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => row.contractId),
      ).size,
    ).toBe(25);
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

  it("pins Operation IDs, fingerprints, Permission Keys, Legacy roles and boundaries", () => {
    expect(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => ({
        id: row.operationId,
        fingerprint: row.operationFingerprint,
        permissionKey: row.permissionKey,
        legacyRoles: row.legacyRoles,
        boundary: row.boundaryType,
      })),
    ).toEqual(
      EXEC_003_OPERATION_ASSIGNMENTS.map((operation, index) => ({
        id: operationIdAt(index),
        fingerprint: fingerprintAt(index),
        permissionKey: operation.permissionKey,
        legacyRoles: operation.legacyAllowedRoles,
        boundary: operation.legacyGuardKind,
      })),
    );
  });

  it("scans registered tests and actual Vitest setup files for substitutions and test modifiers", () => {
    const digest = digestResult();
    expect(digest.configFiles).toContain("vitest.config.ts");
    expect(digest.setupFiles).toEqual([]);

    const violations: string[] = [];
    const registeredFiles = new Set(
      EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.map((row) => row.testFile),
    );
    for (const setupFile of digest.setupFiles) registeredFiles.add(setupFile);

    for (const file of registeredFiles) {
      const source = parseFile(file);
      violations.push(...prohibitedTestModifierViolations(source));
      for (const row of EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES) {
        violations.push(...entryPointAndGuardViolations(source, row));
      }
    }
    expect([...new Set(violations)]).toEqual([]);
  });

  it("rejects mocked Entry Points, spies, mutations and intermediary re-exports", () => {
    const row = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES[0];
    const fixtures = [
      `import { vi } from "vitest"; vi.mock("${row.entryPointModule}", () => ({}));`,
      `import { vi as v } from "vitest"; v.doMock("${row.entryPointModule}", () => ({}));`,
      `import * as endpoint from "${row.entryPointModule}"; import { vi } from "vitest"; vi.spyOn(endpoint, "${row.entryPointExport}");`,
      `import * as endpoint from "${row.entryPointModule}"; endpoint["${row.entryPointExport}"] = () => null;`,
      `import * as endpoint from "${row.entryPointModule}"; Object.assign(endpoint, { ${row.entryPointExport}: () => null });`,
    ];
    for (const [index, fixture] of fixtures.entries()) {
      expect(
        entryPointAndGuardViolations(
          parseText(`entrypoint-negative-${index}.ts`, fixture),
          row,
        ).length,
      ).toBeGreaterThan(0);
    }

    const intermediary = "@/tests/foundation/__synthetic_entrypoint_reexport";
    const fixture = parseText(
      "intermediary-negative.ts",
      `import { vi } from "vitest"; vi.mock("${intermediary}", () => ({}));`,
    );
    const resolver: SourceResolver = (moduleName) =>
      moduleName === intermediary
        ? parseText(
            "synthetic-reexport.ts",
            `export { ${row.entryPointExport} } from "${row.entryPointModule}";`,
          )
        : null;
    expect(entryPointAndGuardViolations(fixture, row, resolver)).toContain(
      `${row.operationId} mocks intermediary re-export ${intermediary}`,
    );
  });

  it("rejects final-guard mocks, spies, aliases, wrong actual paths and indirect factories", () => {
    const row = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.find(
      (candidate) => candidate.forbiddenMockedGuardSymbol === "hasDatabaseRole",
    );
    expect(row).toBeDefined();
    if (!row) return;

    const fixtures = [
      `import { vi } from "vitest"; vi.mock("@/lib/api-auth-guard", () => ({ hasDatabaseRole: vi.fn() }));`,
      `import { vi } from "vitest"; vi.spyOn(auth, "hasDatabaseRole");`,
      `import { vi as v } from "vitest"; const replacement = { hasDatabaseRole: v.fn() }; const factory = () => replacement; v.doMock("@/lib/api-auth-guard", factory);`,
      `import { vi } from "vitest"; vi.mock("@/lib/api-auth-guard", async () => { const actual = await vi.importActual("@/wrong/path"); return { ...actual }; });`,
      `import { vi } from "vitest"; const replacement = { other: vi.fn() }; vi.mock("@/lib/api-auth-guard", () => ({ ...replacement }));`,
      `import { vi } from "vitest"; vi.mock("@/lib/api-auth-guard", () => Object.assign({}, { hasDatabaseRole: vi.fn() }));`,
    ];
    for (const [index, fixture] of fixtures.entries()) {
      expect(
        entryPointAndGuardViolations(
          parseText(`guard-negative-${index}.ts`, fixture),
          row,
        ).length,
      ).toBeGreaterThan(0);
    }
  });

  it("rejects setup-file mocks through the same Entry Point and guard gate", () => {
    const row = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.find(
      (candidate) => candidate.finalGuardModule !== null,
    );
    expect(row).toBeDefined();
    if (!row || !row.finalGuardModule || !row.forbiddenMockedGuardSymbol) return;

    const setupSource = parseText(
      "synthetic-setup.ts",
      `import { vi } from "vitest"; vi.mock("${row.finalGuardModule}", () => ({ ${row.forbiddenMockedGuardSymbol}: vi.fn() }));`,
    );
    expect(entryPointAndGuardViolations(setupSource, row).length).toBeGreaterThan(0);
  });

  it("rejects ALLOW and DENY reuse across different Operation IDs", () => {
    const first = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES[0];
    const second = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES[1];
    const synthetic = [
      first,
      {
        ...second,
        testFile: first.testFile,
        allowTestName: first.allowTestName,
        denyTestName: first.denyTestName,
      },
    ];
    expect(operationOwnershipViolations(synthetic).length).toBeGreaterThan(0);
    expect(
      operationOwnershipViolations(EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES),
    ).toEqual([]);
  });

  it("rejects identical ALLOW and DENY names and wrong dynamic importActual paths", () => {
    const exactRow = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.find(
      (row) => row.importMode === "DYNAMIC_ACTUAL",
    );
    expect(exactRow).toBeDefined();
    if (!exactRow) return;

    const sameName = { ...exactRow, denyTestName: exactRow.allowTestName };
    expect(candidateViolations(sameName, 17)).toContain(
      `${sameName.operationId} shares one ALLOW/DENY test name`,
    );

    const wrongActual = parseText(
      "wrong-actual.ts",
      [
        `import { vi } from "vitest";`,
        `let ${exactRow.entryPointLocalName};`,
        `const actual = await vi.importActual("@/wrong/path");`,
        `${exactRow.entryPointLocalName} = actual.${exactRow.entryPointExport};`,
      ].join("\n"),
    );
    expect(hasDynamicActualEntryPoint(wrongActual, exactRow)).toBe(false);
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

  it("proves C17 Tenant Context is authorization lookup context and suppresses the provider on every DENY", () => {
    const row = EXEC_003_BEHAVIOR_EVIDENCE_CANDIDATES.find(
      (candidate) => candidate.operationId === "EXEC-003-C17-O01",
    );
    expect(row).toBeDefined();
    if (!row) return;

    const source = parseFile(row.testFile);
    const tests = testRecords(source);
    const denyTests = [...tests.values()].filter(
      (test) =>
        test.name.startsWith("DIRECT_BEHAVIORAL EXEC-003-C17-O01 denies") ||
        test.name === row.denyTestName,
    );
    expect(denyTests.length).toBeGreaterThanOrEqual(5);
    for (const denyTest of denyTests) {
      expect(
        callAssertions(source, denyTest).some(
          (assertion) =>
            assertion.target === "providerMocks.generateAgentJson" &&
            assertion.negated,
        ),
      ).toBe(true);
    }

    const allow = tests.get(row.allowTestName);
    expect(allow).toBeDefined();
    if (!allow) return;
    expect(
      callAssertions(source, allow).some(
        (assertion) =>
          assertion.target === "providerMocks.generateAgentJson" &&
          !assertion.negated,
      ),
    ).toBe(true);
    expect(allow.callback.getText(source)).toContain("runWithTenantContext");
  });

  it("proves Legacy allow plus Progressive deny from an actual frozen Entry Point", () => {
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

  it("derives direct credit and remaining gap only from validated Operations", () => {
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

  it("prevents Operation-level spillover and out-of-freeze credit", () => {
    expect(operationOwnershipViolations(VALIDATED)).toEqual([]);
    expect(new Set(VALIDATED.map((row) => row.operationId))).toEqual(
      new Set(
        EXEC_003_OPERATION_ASSIGNMENTS.map((_operation, index) =>
          operationIdAt(index),
        ),
      ),
    );
    expect(new Set(VALIDATED.map((row) => row.contractId))).toEqual(
      new Set(EXEC_003_OPERATION_ASSIGNMENTS.map((row) => row.contractId)),
    );
  });
});
