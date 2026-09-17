# ORCA Visual Contract Auditor

This package adds a discovery-only audit. It does not change product code, database state, migrations, commits, pushes, or deployments.

## Files

- `ORCA-VISUAL-CONTRACT-AUDIT.ps1`
- `scripts/orca-visual-contract-audit.mjs`

Copy both paths into the repository root exactly as packaged.

## One-command run

From the repository root:

```powershell
.\ORCA-VISUAL-CONTRACT-AUDIT.ps1
```

The auditor:

1. Scans `app/`, `components/`, and `features/` for visual-contract drift.
2. Discovers `app/operations/**/page.tsx` routes.
3. Reuses an existing local ORCA server, or starts `npm run dev -- -p 3000`.
4. Runs a Playwright browser audit when authentication is available.
5. Crawls same-origin `/operations` links without clicking actions or submitting business forms.
6. Saves full-page screenshots and both Markdown/JSON reports under:
   `artifacts/orca-visual-contract-audit/<timestamp>/`

## Browser authentication

The static scan always runs.

For authenticated browser coverage, use one of these options before the command:

### Option A — dedicated audit account

```powershell
$env:ORCA_AUDIT_EMAIL="your-audit-user@example.com"
$env:ORCA_AUDIT_PASSWORD="your-password"
.\ORCA-VISUAL-CONTRACT-AUDIT.ps1
```

The values are read from process environment only; the auditor does not write them to the report.

### Option B — Playwright storage state

```powershell
$env:ORCA_AUDIT_STORAGE_STATE="path\to\storage-state.json"
.\ORCA-VISUAL-CONTRACT-AUDIT.ps1
```

## Useful optional settings

```powershell
$env:ORCA_AUDIT_BASE_URL="http://127.0.0.1:3000"
$env:ORCA_AUDIT_MAX_PAGES="80"
$env:ORCA_AUDIT_HEADED="1"
$env:ORCA_AUDIT_FAIL_ON_VIOLATION="1"
```

`ORCA_AUDIT_FAIL_ON_VIOLATION=1` is intended for CI later. Discovery mode defaults to reporting issues without failing the shell.

## Current contracts checked

Static:
- native `<select>` use
- explicit 9px/10px typography
- primary/blue pagination Next controls
- arbitrary fixed-height nested vertical scrolling
- overscroll containment candidates
- tables without `<thead>`
- locked PAGE_SIZE for Projects / Properties / Staff
- known 10px row-action conflict

Browser:
- page-wide horizontal overflow
- visible native selects
- interactive controls under 44px
- visible tables without headers
- table-header typography different from 12px
- KPI text under 12px
- clipped KPI text
- unapproved nested vertical scrolling
- raw English statuses in RTL UI
- visible UUIDs
- raw null/undefined text
- pagination height and primary styling

## Important

This first version is **contract discovery**, not a screenshot-baseline approval tool. After the current violations are closed, approved screenshots can be promoted into a baseline phase.
