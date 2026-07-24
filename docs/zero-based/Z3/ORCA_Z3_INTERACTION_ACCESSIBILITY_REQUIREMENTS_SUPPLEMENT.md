# ORCA Z3 — Independent Interaction and Accessibility Requirements Supplement

- **Document ID:** ORCA-Z3-RTM-SUP-001
- **Date:** 2026-07-22
- **Status:** `REQUIREMENTS PREPARED / VISUAL REFERENCE RECONCILIATION PENDING`
- **Production action authorized:** `false`

| ID | Requirement | Priority | Acceptance | Verification | Status |
|---|---|---:|---|---|---|
| Z3R-001 | Mixed Arabic/Latin/numeric content preserves correct visual and logical bidi order | P0 | phones, emails, references, dates, currency and punctuation remain unambiguous and copyable | bidi content matrix + screen-reader review | TEXT_CONTRACT_DEFINED |
| Z3R-002 | Async validation, save, refresh, selection, provider and session changes use concise deduplicated announcements | P0 | important change is perceivable without focus theft or announcement flooding | live-region/manual screen-reader tests | TEXT_CONTRACT_DEFINED |
| Z3R-003 | Session expiry/revocation supports warning, safe reauthentication and context recovery without executing pending actions | P0 | no lost context, duplicate mutation or unauthorized continuation | expiry/revocation/reauth E2E tests | TEXT_CONTRACT_DEFINED |
| Z3R-004 | Critical surfaces support zoom, text spacing and narrow reflow without clipped actions or inaccessible content | P0 | 200%/400% and text-spacing scenarios remain operable | zoom/reflow/manual visual tests | TEXT_CONTRACT_DEFINED |
| Z3R-005 | Focus, selection, status and disabled/destructive meaning survives forced-colors/high-contrast modes | P0 | no state depends solely on background, shadow or subtle color | forced-colors review | TEXT_CONTRACT_DEFINED |
| Z3R-006 | Virtualized lists/grids preserve accessible position/count, focus, selection and keyboard behavior | P0 | mounting/unmounting rows does not lose context; fallback exists where needed | AT/keyboard/virtualization tests | TEXT_CONTRACT_DEFINED |
| Z3R-007 | Decision-relevant charts provide textual insight and accessible data alternatives | P1 | chart data/meaning is available without vision or color perception | chart/table/legend accessibility review | TEXT_CONTRACT_DEFINED |
| Z3R-008 | Drag, resize, reorder, map, timeline and gesture operations provide equivalent non-pointer paths | P0 | every pointer-only outcome has keyboard/button alternative | pointer/keyboard equivalence tests | TEXT_CONTRACT_DEFINED |
| Z3R-009 | Keyboard shortcuts are discoverable, conflict-safe, scoped and never bypass business controls | P1 | shortcut can be disabled/remapped where required and respects focus/authority | shortcut/input-method tests | TEXT_CONTRACT_DEFINED |
| Z3R-010 | Mobile overlays/forms handle virtual keyboards, safe areas, touch targets, sticky actions and back navigation | P0 | focused fields/errors/actions remain visible and operable | mobile viewport/touch/orientation tests | TEXT_CONTRACT_DEFINED |
| Z3R-011 | Long-running work exposes truthful progress, cancellation, background state, timeout/unknown and accessible result | P0 | no fabricated progress or hidden completion/failure | async job/provider UI tests | TEXT_CONTRACT_DEFINED |
| Z3R-012 | Print/PDF/official outputs are independently approved and preserve direction, pagination, evidence and authority | P0 | screen approval cannot close printed output; no truncation or unapproved template | print/PDF/template review | OWNER_REFERENCE_REQUIRED |

## Reconciliation rule

These requirements must be applied to each relevant page/tab/overlay reference and linked to Z5 accessibility/security tests, Z6 operational behavior, and Z7 current-component evidence. Z3 remains partial until named owner-approved references exist.

```text
SUPPLEMENTAL Z3 REQUIREMENTS: 12
P0: 10
P1: 2
OWNER OUTPUT REFERENCE REQUIRED: 1
PAGE IMPLEMENTATION AUTHORIZED: NO
PRODUCTION ACTION: NONE
```
