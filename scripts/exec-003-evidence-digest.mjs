import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path, { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const MANIFEST_PATH =
  "tests/foundation/g5-exec-003-behavior-evidence-manifest.ts";

const REQUIRED_SECURITY_MODULES = Object.freeze([
  "@/lib/api-auth-guard",
  "@/lib/agents/access",
  "@/lib/auth/exec-003-shared-guard",
  "@/lib/auth/exec-003-permission-assignments",
  "@/lib/system-prisma-boundary",
]);

const REQUIRED_SUPPORT_FILES = Object.freeze([
  "scripts/exec-003-evidence-digest.mjs",
  "scripts/exec-003-registry-reconcile.mjs",
  "tests/foundation/g5-exec-003-auth-bootstrap-active-user.test.ts",
  "tests/foundation/g5-exec-003-contract-wiring.test.ts",
  "tests/foundation/g5-exec-003-cookie-guard.test.ts",
  "tests/foundation/g5-exec-003-evidence-identity.test.ts",
  "tests/foundation/g5-exec-003-evidence-ledger.test.ts",
  "tests/foundation/g5-exec-003-registry-reconciliation.test.ts",
  "tests/foundation/g5-exec-003-shared-guard.test.ts",
]);

const CONFIG_FILE_PATTERN = /^vitest\.(?:config|workspace)\.[cm]?[jt]s$/;
const SOURCE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?)$/;
const SETUP_PROPERTY_NAMES = new Set(["setupFiles", "globalSetup"]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
]);

function normalizeRelative(root, absolutePath) {
  return relative(root, absolutePath).replaceAll("\\", "/");
}

function isInsideRoot(root, absolutePath) {
  const rootAbsolute = resolve(root);
  const candidate = resolve(absolutePath);
  const rel = relative(rootAbsolute, candidate);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function parseFile(absolutePath) {
  return ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function unwrapExpression(expression) {
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

function variableInitializer(source, name) {
  let result = null;
  function visit(node) {
    if (
      result === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      result = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function resolveStaticString(expression, source, seen = new Set()) {
  const current = unwrapExpression(expression);
  if (
    ts.isStringLiteral(current) ||
    ts.isNoSubstitutionTemplateLiteral(current)
  ) {
    return current.text;
  }
  if (ts.isIdentifier(current)) {
    if (seen.has(current.text)) return null;
    const initializer = variableInitializer(source, current.text);
    return initializer
      ? resolveStaticString(initializer, source, new Set(seen).add(current.text))
      : null;
  }
  if (
    ts.isBinaryExpression(current) &&
    current.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = resolveStaticString(current.left, source, new Set(seen));
    const right = resolveStaticString(current.right, source, new Set(seen));
    return left !== null && right !== null ? `${left}${right}` : null;
  }
  if (
    ts.isCallExpression(current) &&
    ts.isPropertyAccessExpression(current.expression) &&
    current.expression.name.text === "join" &&
    ts.isArrayLiteralExpression(current.expression.expression)
  ) {
    const separator = current.arguments[0]
      ? resolveStaticString(current.arguments[0], source, new Set(seen))
      : ",";
    if (separator === null) return null;
    const parts = [];
    for (const element of current.expression.expression.elements) {
      if (ts.isSpreadElement(element)) return null;
      const value = resolveStaticString(element, source, new Set(seen));
      if (value === null) return null;
      parts.push(value);
    }
    return parts.join(separator);
  }
  if (
    ts.isNewExpression(current) &&
    ts.isIdentifier(current.expression) &&
    current.expression.text === "URL" &&
    current.arguments?.[0]
  ) {
    return resolveStaticString(current.arguments[0], source, new Set(seen));
  }
  if (
    ts.isCallExpression(current) &&
    ts.isIdentifier(current.expression) &&
    current.expression.text === "fileURLToPath" &&
    current.arguments[0]
  ) {
    return resolveStaticString(current.arguments[0], source, new Set(seen));
  }
  return null;
}

function resolveManifestStaticStringList(expression, source, operationId) {
  const current = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(current)) {
    throw new Error(
      `${operationId} securityDependencyModules must be a static string array`,
    );
  }
  const values = [];
  for (const element of current.elements) {
    if (ts.isSpreadElement(element)) {
      throw new Error(
        `${operationId} securityDependencyModules may not contain spreads`,
      );
    }
    const value = resolveStaticString(element, source);
    if (value === null) {
      throw new Error(
        `${operationId} securityDependencyModules contains a non-static value`,
      );
    }
    values.push(value);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${operationId} contains duplicate security dependencies`);
  }
  return values;
}

function findObjectVariable(source, name) {
  const initializer = variableInitializer(source, name);
  if (!initializer) throw new Error(`Missing ${name} in ${source.fileName}`);
  const object = unwrapExpression(initializer);
  if (!ts.isObjectLiteralExpression(object)) {
    throw new Error(`${name} must remain a statically auditable object literal`);
  }
  return object;
}

export function deriveManifestBindings(root = process.cwd()) {
  const manifestAbsolute = resolve(root, MANIFEST_PATH);
  const source = parseFile(manifestAbsolute);
  const object = findObjectVariable(source, "BINDING_BY_OPERATION");
  const bindings = [];

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error("BINDING_BY_OPERATION contains a non-property binding");
    }
    const operationId = property.name.getText(source).replaceAll(/["']/g, "");
    const call = unwrapExpression(property.initializer);
    if (
      !ts.isCallExpression(call) ||
      !ts.isIdentifier(call.expression) ||
      call.expression.text !== "binding"
    ) {
      throw new Error(`${operationId} is not bound through binding(...)`);
    }
    const testFile = call.arguments[0]
      ? resolveStaticString(call.arguments[0], source)
      : null;
    const entryPointModule = call.arguments[1]
      ? resolveStaticString(call.arguments[1], source)
      : null;
    const entryPointExport = call.arguments[2]
      ? resolveStaticString(call.arguments[2], source)
      : null;
    if (!testFile || !entryPointModule || !entryPointExport) {
      throw new Error(`${operationId} contains a non-static evidence binding`);
    }
    const securityDependencyModules = call.arguments[10]
      ? resolveManifestStaticStringList(call.arguments[10], source, operationId)
      : [];
    bindings.push({
      operationId,
      testFile,
      entryPointModule,
      entryPointExport,
      securityDependencyModules,
    });
  }

  if (bindings.length !== 32) {
    throw new Error(`Expected 32 operation bindings, found ${bindings.length}`);
  }
  if (new Set(bindings.map((binding) => binding.operationId)).size !== 32) {
    throw new Error("Duplicate Operation ID in BINDING_BY_OPERATION");
  }
  const registeredDependencies = bindings.flatMap(
    (binding) => binding.securityDependencyModules,
  );
  if (new Set(registeredDependencies).size !== registeredDependencies.length) {
    throw new Error("Duplicate security dependency module in Manifest bindings");
  }
  return bindings;
}

function fileCandidates(base) {
  return SOURCE_FILE_PATTERN.test(base)
    ? [base]
    : [
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.mts`,
        `${base}.cts`,
        `${base}.js`,
        `${base}.mjs`,
        `${base}.cjs`,
        path.join(base, "index.ts"),
        path.join(base, "index.tsx"),
        path.join(base, "index.js"),
        path.join(base, "index.mjs"),
      ];
}

function resolveExistingFile(root, input, description) {
  const base = input.startsWith("@/")
    ? resolve(root, input.slice(2))
    : resolve(root, input);
  if (!isInsideRoot(root, base)) {
    throw new Error(`${description} escapes repository: ${input}`);
  }
  const found = fileCandidates(base).find(
    (candidate) =>
      isInsideRoot(root, candidate) &&
      existsSync(candidate) &&
      statSync(candidate).isFile(),
  );
  if (!found) throw new Error(`${description} is missing or unreadable: ${input}`);
  return normalizeRelative(root, found);
}

export function resolveSecurityDependencyFiles(root, modules) {
  if (!Array.isArray(modules) || modules.some((value) => typeof value !== "string")) {
    throw new Error("Security dependency modules must be static strings");
  }
  if (new Set(modules).size !== modules.length) {
    throw new Error("Duplicate security dependency module");
  }
  const files = modules.map((module) =>
    resolveExistingFile(root, module, "security dependency module"),
  );
  if (new Set(files).size !== files.length) {
    throw new Error("Duplicate security dependency file");
  }
  return files.sort();
}

function walkConfigFiles(root, directory = root, depth = 0, result = []) {
  if (depth > 4) return result;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        walkConfigFiles(root, path.join(directory, entry.name), depth + 1, result);
      }
      continue;
    }
    if (CONFIG_FILE_PATTERN.test(entry.name)) {
      result.push(normalizeRelative(root, path.join(directory, entry.name)));
    }
  }
  return result;
}

function resolveLocalImport(root, sourceFile, moduleSpecifier) {
  if (!moduleSpecifier.startsWith(".")) return null;
  const base = resolve(dirname(sourceFile), moduleSpecifier);
  if (!isInsideRoot(root, base)) {
    throw new Error(`Vitest config import escapes repository: ${moduleSpecifier}`);
  }
  const found = fileCandidates(base).find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
  if (!found) {
    throw new Error(`Vitest config import is missing: ${moduleSpecifier}`);
  }
  return found;
}

function resolveStaticStringList(
  expression,
  source,
  sourceFile,
  root,
  seen = new Set(),
) {
  const current = unwrapExpression(expression);
  const direct = resolveStaticString(current, source, new Set(seen));
  if (direct !== null) return [direct];
  if (ts.isArrayLiteralExpression(current)) {
    const values = [];
    for (const element of current.elements) {
      values.push(
        ...resolveStaticStringList(
          ts.isSpreadElement(element) ? element.expression : element,
          source,
          sourceFile,
          root,
          new Set(seen),
        ),
      );
    }
    return values;
  }
  if (ts.isIdentifier(current)) {
    if (seen.has(current.text)) {
      throw new Error(`Circular Vitest config value: ${current.text}`);
    }
    const nextSeen = new Set(seen).add(current.text);
    const local = variableInitializer(source, current.text);
    if (local) {
      return resolveStaticStringList(local, source, sourceFile, root, nextSeen);
    }
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue;
      }
      const importedFile = resolveLocalImport(
        root,
        sourceFile,
        statement.moduleSpecifier.text,
      );
      if (!importedFile) continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        const match = bindings.elements.find(
          (element) => element.name.text === current.text,
        );
        if (match) {
          const importedSource = parseFile(importedFile);
          const importedName = match.propertyName?.text ?? match.name.text;
          const importedInitializer = variableInitializer(importedSource, importedName);
          if (!importedInitializer) {
            throw new Error(`Imported Vitest config value is not static: ${importedName}`);
          }
          return resolveStaticStringList(
            importedInitializer,
            importedSource,
            importedFile,
            root,
            nextSeen,
          );
        }
      }
    }
  }
  throw new Error("Vitest setup/globalSetup value is not statically auditable");
}

function addSetupValues({
  expression,
  source,
  absolute,
  root,
  setupFiles,
  propertyName,
}) {
  const values = resolveStaticStringList(expression, source, absolute, root);
  for (const value of values) {
    const setupAbsolute = value.startsWith("@/")
      ? resolve(root, value.slice(2))
      : resolve(dirname(absolute), value.replace(/^\.\//, ""));
    setupFiles.add(
      resolveExistingFile(root, setupAbsolute, `${propertyName} file`),
    );
  }
}

export function discoverVitestConfiguration(root = process.cwd()) {
  const configFiles = [...new Set(walkConfigFiles(root))].sort();
  const dependencyFiles = new Set(configFiles);
  const setupFiles = new Set();
  const visited = new Set();

  function inspect(relativePath) {
    if (visited.has(relativePath)) return;
    visited.add(relativePath);
    const absolute = resolve(root, relativePath);
    const source = parseFile(absolute);

    for (const statement of source.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const imported = resolveLocalImport(
          root,
          absolute,
          statement.moduleSpecifier.text,
        );
        if (imported) {
          const importedRelative = normalizeRelative(root, imported);
          dependencyFiles.add(importedRelative);
          inspect(importedRelative);
        }
      }
    }

    function visit(node) {
      if (ts.isPropertyAssignment(node)) {
        const propertyName = node.name.getText(source).replaceAll(/["']/g, "");
        if (SETUP_PROPERTY_NAMES.has(propertyName)) {
          addSetupValues({
            expression: node.initializer,
            source,
            absolute,
            root,
            setupFiles,
            propertyName,
          });
        }
      }
      if (
        ts.isShorthandPropertyAssignment(node) &&
        SETUP_PROPERTY_NAMES.has(node.name.text)
      ) {
        const initializer = variableInitializer(source, node.name.text);
        if (!initializer) {
          throw new Error(
            `${node.name.text} shorthand has no statically auditable initializer`,
          );
        }
        addSetupValues({
          expression: initializer,
          source,
          absolute,
          root,
          setupFiles,
          propertyName: node.name.text,
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  for (const configFile of configFiles) inspect(configFile);
  return {
    configFiles: [...dependencyFiles].sort(),
    setupFiles: [...setupFiles].sort(),
  };
}

export function deriveExec003EvidenceFiles(root = process.cwd()) {
  const bindings = deriveManifestBindings(root);
  const entryPointFiles = [
    ...new Set(
      bindings.map((binding) =>
        resolveExistingFile(
          root,
          binding.entryPointModule,
          `${binding.operationId} Entry Point`,
        ),
      ),
    ),
  ].sort();
  const manifestTestFiles = [
    ...new Set(
      bindings.map((binding) =>
        resolveExistingFile(root, binding.testFile, `${binding.operationId} test file`),
      ),
    ),
  ].sort();
  const securityDependencyModules = bindings.flatMap(
    (binding) => binding.securityDependencyModules,
  );
  const securityDependencyFiles = resolveSecurityDependencyFiles(
    root,
    securityDependencyModules,
  );
  const finalGuardFiles = REQUIRED_SECURITY_MODULES.slice(0, 2)
    .map((module) => resolveExistingFile(root, module, "final/delegated guard"))
    .sort();
  const securityCoreFiles = REQUIRED_SECURITY_MODULES.map((module) =>
    resolveExistingFile(root, module, "security-influential module"),
  ).sort();
  const supportFiles = REQUIRED_SUPPORT_FILES.map((file) =>
    resolveExistingFile(root, file, "evidence support file"),
  ).sort();
  const manifestFile = resolveExistingFile(root, MANIFEST_PATH, "evidence manifest");
  const { configFiles, setupFiles } = discoverVitestConfiguration(root);

  const derivedEvidenceFiles = [
    ...new Set([
      manifestFile,
      ...entryPointFiles,
      ...securityDependencyFiles,
      ...manifestTestFiles,
      ...securityCoreFiles,
      ...supportFiles,
      ...configFiles,
      ...setupFiles,
    ]),
  ].sort();

  const result = {
    manifestOperationCount: bindings.length,
    derivedEvidenceFiles,
    entryPointFiles,
    securityDependencyModules: [...securityDependencyModules].sort(),
    securityDependencyFiles,
    finalGuardFiles,
    securityCoreFiles,
    manifestTestFiles,
    configFiles,
    setupFiles,
  };
  assertExec003EvidenceCoverage(result);
  return result;
}

export function assertExec003EvidenceCoverage(result) {
  const files = result.derivedEvidenceFiles;
  if (new Set(files).size !== files.length) {
    throw new Error("Duplicate file in EXEC-003 derived evidence coverage");
  }
  if (JSON.stringify(files) !== JSON.stringify([...files].sort())) {
    throw new Error("EXEC-003 derived evidence files must be deterministically sorted");
  }
  const covered = new Set(files);
  const requiredGroups = [
    ["Entry Point", result.entryPointFiles],
    ["security dependency", result.securityDependencyFiles],
    ["final/delegated guard", result.finalGuardFiles],
    ["security core", result.securityCoreFiles],
    ["Manifest test", result.manifestTestFiles],
    ["Vitest config", result.configFiles],
    ["Vitest setup", result.setupFiles],
  ];
  for (const [label, requiredFiles] of requiredGroups) {
    for (const file of requiredFiles) {
      if (!covered.has(file)) {
        throw new Error(`${label} omitted from EXEC-003 evidence digest: ${file}`);
      }
    }
  }
  if (result.manifestOperationCount !== 32) {
    throw new Error("Digest coverage expected 32 operations");
  }
  return true;
}

function normalizedContent(root, relativePath) {
  const absolute = resolve(root, relativePath);
  if (!isInsideRoot(root, absolute)) {
    throw new Error(`Digest file escapes repository: ${relativePath}`);
  }
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    throw new Error(`Digest file is missing or unreadable: ${relativePath}`);
  }
  return readFileSync(absolute, "utf8").replaceAll("\r\n", "\n");
}

export function hashExec003EvidenceFiles(root, evidenceFiles) {
  const files = [...evidenceFiles];
  if (new Set(files).size !== files.length) {
    throw new Error("Duplicate file in EXEC-003 evidence digest");
  }
  if (JSON.stringify(files) !== JSON.stringify([...files].sort())) {
    throw new Error("EXEC-003 evidence files must be deterministically sorted");
  }
  const hash = createHash("sha256");
  for (const relativePath of files) {
    const content = normalizedContent(root, relativePath);
    hash.update(relativePath, "utf8");
    hash.update("\0", "utf8");
    hash.update(String(Buffer.byteLength(content, "utf8")), "utf8");
    hash.update("\0", "utf8");
    hash.update(content, "utf8");
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export function computeExec003EvidenceDigest(root = process.cwd()) {
  const derivation = deriveExec003EvidenceFiles(root);
  return {
    algorithm: "sha256-path-length-content-v3-derived-security-dependencies",
    evidenceDigest: hashExec003EvidenceFiles(
      root,
      derivation.derivedEvidenceFiles,
    ),
    ...derivation,
  };
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  process.stdout.write(
    `${JSON.stringify(computeExec003EvidenceDigest(), null, 2)}\n`,
  );
}
