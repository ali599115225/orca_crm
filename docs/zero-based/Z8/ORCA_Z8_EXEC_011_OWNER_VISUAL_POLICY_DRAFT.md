# ORCA Z8 — EXEC-011 Owner Visual Policy (Draft)

- Package: `EXEC-011 — Item-level visual and accessibility closure`
- Status: `OWNER APPROVAL REQUIRED / PRE-FREEZE ONLY`
- Date: `2026-08-11`

## Proposed OWN-A05

1. One surface only per cycle: one page, one tab, or one overlay.
2. Every surface requires one owner-approved target reference before Runtime/UI modification.
3. Unapproved adjacent tabs/surfaces are out of scope and must not be batched.
4. Verification is independent from the implementation pass and includes two separate visual passes: (a) structure/layout, then (b) detail/state/accessibility.
5. Acceptance covers Light/Dark where applicable, RTL/LTR behavior where applicable, responsive states, empty/loading/error/selected/hover/focus states, forms/overlays, keyboard navigation, visible focus, and WCAG 2.2 AA-oriented automated/manual evidence.
6. Functional contracts, APIs, database behavior, RBAC, providers, migrations, and business logic remain out of scope unless a visual surface cannot render because of a directly proven pre-existing blocker; such a blocker is recorded separately and not silently repaired inside EXEC-011.
7. No Merge, Deploy, Production, or provider activation is authorized by a surface closure.

## First proposed surface

`EXEC-011-S01 — Login page`

Reason: smallest isolated entry surface and suitable for establishing the visual/a11y closure template before larger workspaces.

Runtime/UI modification remains unauthorized until an exact visual reference for S01 is approved by the owner.

Approval phrase:

`APPROVED — EXEC-011 OWN-A05 AND S01 LOGIN AS FIRST SURFACE`
