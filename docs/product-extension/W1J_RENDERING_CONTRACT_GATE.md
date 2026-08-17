# ORCA W1J — Deterministic Contract Rendering Gate

Status: DRAFT IMPLEMENTATION GATE — NOT PUBLISHED

Base: `132be495fe08f349857ecc94167a095e89a3b13f`

W1J follows the merged W1I Canonical Snapshot Assembler. It does not create a new historical STEP and does not reopen STEP 0–14.

## Objective

Freeze and implement the smallest deterministic server-side rendering contract that can turn W1I's approved persisted source payload into the plain-text `renderedContent` required by `ContractSnapshot`.

W1J does not issue a snapshot and does not expose an HTTP command.

## Authoritative input boundary

The renderer accepts only the W1I-shaped values:

- `sourceContentJson`
- `structuredFacts`
- `clauseSnapshot`

No caller may supply `renderedContent`, authoritative contract amounts, property facts, finance facts, approval state, or snapshot digest to the renderer.

W1I remains authoritative for tenant-bound persisted facts. W1J performs no DB reads and no writes.

## Frozen JSON contracts

### `contentJson`

Schema marker: `W1J_CONTENT_V1`.

Contains ordered source sections by stable ID. Each section is either:

- `LOCKED`; or
- `CONTROLLED_EDITABLE`.

Each section contains only explicit nodes:

- `TEXT { value }`
- `VARIABLE { key }`

No Mustache, Handlebars, Liquid, executable expressions, HTML execution model, or arbitrary interpolation grammar exists in W1J.

### `structureJson`

Schema marker: `W1J_STRUCTURE_V1`.

Contains exactly one `sectionOrder` list. Every content section must appear exactly once. Unknown, duplicate, or missing section identities fail closed.

### `variableSchemaJson`

Schema marker: `W1J_VARIABLE_SCHEMA_V1`.

Every variable is declared exactly once with:

- stable uppercase key;
- source `FACT` or `BINDING`;
- a safe dot path for `FACT`, or an explicit binding key for `BINDING`;
- value type `STRING`, `DECIMAL`, `ISO_DATE`, or `ISO_DATETIME`;
- required flag.

`FACT` values are read only from W1I `structuredFacts`. `dataBindingsJson` cannot override a `FACT` variable even when it contains the same key.

### `dataBindingsJson`

Schema marker: `W1J_BINDINGS_V1`.

Contains `values`. Those values are reachable only through variables explicitly declared with source `BINDING`.

### `clauseOverridesJson`

Schema marker: `W1J_CLAUSE_OVERRIDES_V1`.

Contains section replacements. A replacement may target only a `CONTROLLED_EDITABLE` section. Any attempt to replace a `LOCKED` section fails closed.

## Determinism rules

- renderer is a pure function;
- no DB, network, provider, environment, locale, clock, random, or filesystem dependency;
- line endings are normalized to LF;
- section separator is exactly two LF characters;
- decimal values remain validated canonical strings; no JavaScript number conversion;
- date values are rendered only from explicitly typed canonical strings;
- `ISO_DATETIME` accepts the exact UTC shape produced by `Date.toISOString()`;
- same canonical input produces byte-identical output.

## Security and integrity rules

- unknown variable references fail closed;
- missing required variables fail closed;
- unsafe fact path segments (`__proto__`, `prototype`, `constructor`) fail closed;
- unknown schema versions fail closed;
- structure/content identity drift fails closed;
- duplicate section, variable, or override identities fail closed;
- renderer produces plain text only and does not interpret HTML or script.

## Allowed W1J slice

- `lib/domain/contract-finance/contract-renderer.ts`
- `tests/foundation/g8-w1j-rendering-contract.test.ts`
- `docs/product-extension/W1J_RENDERING_CONTRACT_GATE.md`

## Explicit exclusions

- no change to `canonical-snapshot-assembler.ts`;
- no change to `contract-snapshot-service.ts`;
- no application-facade or HTTP route wiring;
- no snapshot issuance mutation;
- no Prisma schema or migration change;
- no PDF generation, signature, execution, amendment flow, or signed-copy generation;
- no Transaction Spine mutation;
- no provider call or credential access;
- no deploy, production action, production migration, backfill, or environment activation.

## Acceptance

W1J is ready for publication only when one exact source head proves:

1. the three-file allowlist is preserved;
2. deterministic rendering produces byte-identical text from identical canonical input;
3. authoritative FACT variables cannot be overridden by draft bindings;
4. missing/undeclared variables fail closed;
5. LOCKED clauses cannot be overridden;
6. CONTROLLED_EDITABLE replacements preserve deterministic section ordering;
7. decimal/date strings remain canonical without locale/timezone conversion;
8. unsafe fact paths and unsupported schemas fail closed;
9. focused G8 passes;
10. repository typecheck passes;
11. full ORCA CI through Build passes;
12. independent review has no unresolved Critical/Major finding;
13. no issuance endpoint, migration, deploy, provider activation, or production action occurs.

A later slice may wire `W1I assembler -> W1J renderer -> issueApprovedContractSnapshot` only after this contract is published and verified.
