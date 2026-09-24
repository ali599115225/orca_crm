# ORCA CRM — Source of Truth

Generated: 2026-06-25

---

## Repository

| Field | Value |
|-------|-------|
| Repository root | `C:/Users/ali59/Desktop/REDC-INTEGRATION` |
| Official remote (origin) | `https://github.com/ali599115225/orca_crm.git` |
| Canonical branch | `integration/revenue-integrity` |
| Canonical HEAD | `af85521` |
| Canonical HEAD message | `fix(prisma): restore contacts baseline migration` |

---

## Branch Matrix

| Branch | HEAD | Tracking | Ahead of origin | Notes |
|--------|------|----------|-----------------|-------|
| `integration/revenue-integrity` | `af85521` | none | N/A | **Active ORCA gate branch** |
| `main` | `396f2bf` | `origin/main` (ahead 4) | 4 | Local main diverged from origin |
| `origin/main` | `93128c0` | — | — | Remote HEAD |
| `backup/whatsapp-p0-20260620-090434` | `7cd203c` | none | — | Backup branch |
| `feat/settings-agents-final` | `1632b8d` | none | — | Feature branch |
| `feature/leads-section` | `68f4127` | none | — | Feature branch |
| `fix/card-stretch-layout` | `766b82c` | `origin/fix/card-stretch-layout` | 0 | Merged remotely |
| `refactor/language-theme-foundation` | `f03ad3e` | none | — | Worktree branch |
| `work/claude-authorization-audit` | `13f44ed` | none | — | Worktree branch |
| `work/claude-revenue-authorization` | `ee7b49b` | none | — | Feature branch |
| `work/claude-saudi-trust-gates` | `da40fb9` | none | — | Feature branch |
| `work/codex-accessibility-v2` | `140654d` | none | — | Worktree branch |
| `work/login-final-design` | `1632b8d` | none | — | Worktree branch |
| `work/opencode-conversation-to-action` | `d56b876` | none | — | Feature branch |
| `work/opencode-predictive-intellligence` | `7cfad8a` | none | — | Worktree branch |
| `work/opencode-rental-whatsapp-v2` | `e4c2eb8` | none | — | Feature branch |
| `work/security-final-closure` | `2429f12` | none | — | Worktree branch |

---

## Worktree Matrix

| Worktree Path | Branch | HEAD |
|---------------|--------|------|
| `C:/Users/ali59/Desktop/REDC` | `main` | `396f2bf` |
| `C:/Users/ali59/Desktop/REDC-claude` | `work/claude-authorization-audit` | `13f44ed` |
| `C:/Users/ali59/Desktop/REDC-codex` | `work/codex-accessibility-v2` | `140654d` |
| `C:/Users/ali59/Desktop/REDC-INTEGRATION` | `integration/revenue-integrity` | `af85521` |
| `C:/Users/ali59/Desktop/REDC-LANGUAGE-THEME` | `refactor/language-theme-foundation` | `f03ad3e` |
| `C:/Users/ali59/Desktop/REDC-login` | `work/login-final-design` | `1632b8d` |
| `C:/Users/ali59/Desktop/REDC-opencode` | `work/opencode-predictive-intellligence` | `7cfad8a` |
| `C:/Users/ali59/Desktop/REDC-security` | `work/security-final-closure` | `2429f12` |

---

## Unmerged Commits

`integration/revenue-integrity` is **15 commits ahead of `main`**.

Key unmerged commits on `integration/revenue-integrity` (not in `main`):

| Commit | Message |
|--------|---------|
| `af85521` | fix(prisma): restore contacts baseline migration |
| `9394e85` | test(revenue-integrity): add Saudi trust auth audit closure |
| `7cfad8a` | feat(predictive-intelligence): final closure |
| `d56b876` | feat(revenue): complete conversation-to-action |
| `1632b8d` | feat(platform): establish revenue integrity and integrations baseline |
| `e3398fc` | fix(settings-staff): adjust column widths |
| `3f37cc7` | fix(settings-agents): finalize standalone agents |
| `1b4eb7e` | fix(settings-agents): unify final theme and layout |
| `e6d1449` | refactor(settings-agents): rebuild final workspaces |
| `ac28ab6` | feat(agents): honor deployment license during activation |
| `14c4cd3` | feat(settings): expose dedicated license mode |
| `7902b45` | fix(licensing): block purchases for dedicated copies |
| `95ace24` | feat(licensing): support SaaS and dedicated copy modes |
| `7a19723` | refactor(settings): rebuild settings navigation shell |
| `8019f6a` | refactor(agents): centralize plan entitlements |

---

## Prisma Source

| Field | Value |
|-------|-------|
| Schema path | `prisma/schema.prisma` |
| Config path | `prisma.config.ts` |
| Migration directory | `prisma/migrations/` |
| Migration count | **34** |
| First migration | `20260524004442_init_database` |
| Last migration | `20260624000100_add_revenue_intelligence_scores` |

### Migration Ordering Notes

All 34 migrations sort correctly by alphabetical name. Some migrations share date prefixes without full timestamps (e.g., `20260613_add_*`), but alphabetical ordering within each date group is deterministic and consistent.

### Full Migration Sequence

```
 1. 20260524004442_init_database
 2. 20260526001652_add_contract_terms
 3. 20260526150443_add_saas_billing_fields_for_sanad
 4. 20260611000000_create_contacts_baseline          ← NEW (Gate 1)
 5. 20260611205518_add_email_message
 6. 20260612_fix_leads_schema_drift
 7. 20260612000000_add_lead_last_contacted_at
 8. 20260613_add_execution_payload_to_sentinel_task_orders  ← FIRST BLOCKER
 9. 20260613_add_hash_columns
10. 20260613_add_phonehash_unique
11. 20260613_drop_phone_unique
12. 20260614_add_paylink_gateway_fields
13. 20260619000100_payment_transaction_provider_neutral_security
14. 20260619000200_whatsapp_webhook_persistence_foundation
15. 20260620000100_whatsapp_contact_assignment_archive
16. 20260620000150_whatsapp_enum_prerequisites
17. 20260620000200_whatsapp_multi_tenant_foundation
18. 20260620000201_whatsapp_hardening
19. 20260620000202_whatsapp_p0_final_integrity
20. 20260621000100_security_final_core
21. 20260621000200_transaction_spine
22. 20260621000300_offer_unit_integrity
23. 20260621000400_create_rate_limit_entries
24. 20260621000500_add_tour_offer_relation
25. 20260622060000_phase1_quote_to_cash_closure
26. 20260622070000_accounting_foundation
27. 20260622080000_phase1_cutover_boundary
28. 20260622100000_payment_plan_restructure
29. 20260622110000_deal_passport_foundation
30. 20260622130000_phase02_full_closure
31. 20260622220000_phase03_realtime_sync_foundation
32. 20260623000000_phase04_staff_fields
33. 20260623130000_revenue_integrity_full
34. 20260624000100_add_revenue_intelligence_scores
```

---

## Known Database Environments

| Environment | Type | Notes |
|-------------|------|-------|
| Neon (primary) | Cloud PostgreSQL | Production candidate |
| test_a_fresh | Neon temp | **DELETED** (Gate 1 Test A) |
| test_b_existing | Neon temp | **DELETED** (Gate 1 Test B) |
| test_c_mismatch | Neon temp | **DELETED** (Gate 1 Test C) |

No production credentials or connection strings are recorded in this document.

---

## Contacts Baseline Commit

| Field | Value |
|-------|-------|
| Commit | `af85521` |
| Message | `fix(prisma): restore contacts baseline migration` |
| File | `prisma/migrations/20260611000000_create_contacts_baseline/migration.sql` |
| Lines | 139 |
| Test A (Fresh) | PASS — 14 baseline columns created, FK to tenants verified |
| Test B (Existing) | PASS — zero data loss, zero schema changes, checksum preserved |
| Test C (Mismatch) | PASS — RAISE EXCEPTION on nullable phone column |

---

## Current Migration Blocker

| Field | Value |
|-------|-------|
| Migration | `20260613_add_execution_payload_to_sentinel_task_orders` |
| Position | #8 of 34 |
| Error | `relation "sentinel_task_orders" does not exist` |
| Error code | 42P01 (P3018) |
| SQL | `ALTER TABLE sentinel_task_orders ADD COLUMN IF NOT EXISTS execution_payload TEXT;` |
| Status | **UNRESOLVED** — requires Gate 3 audit |
| Root cause | Table `sentinel_task_orders` has no creation migration in the chain |

---

## Evidence Commands

```powershell
git remote -v
git rev-parse --show-toplevel
git branch --show-current
git branch -vv
git worktree list --porcelain
git log --all --decorate --oneline -50
git log --all --left-right --cherry-pick --oneline integration/revenue-integrity...main
git rev-parse HEAD
git status --short
Get-ChildItem prisma/migrations -Directory | Sort-Object Name
npx prisma migrate status
npx prisma validate
```

---

## Final Verdict

```
CANONICAL_SOURCE = CONFIRMED
```

| Criterion | Status |
|-----------|--------|
| Official Remote | CONFIRMED — `origin` → `https://github.com/ali599115225/orca_crm.git` |
| Canonical Branch | CONFIRMED — `integration/revenue-integrity` |
| Canonical HEAD | CONFIRMED — `af85521` |
| Critical Worktrees | INVENTORIED — 8 worktrees documented |
| Unmerged Commits | DOCUMENTED — 15 commits ahead of `main` |
| Prisma Source | CONFIRMED — `prisma/schema.prisma`, 34 migrations |
| Local main divergence | NOTED — local `main` (`396f2bf`) is 4 commits ahead of `origin/main` (`93128c0`) |
