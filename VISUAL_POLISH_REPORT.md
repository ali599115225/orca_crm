# ORCA CRM — Visual Polish & UX Refinement Report

## Classification Legend
- **Critical**: Broken UX / accessibility / visual bug
- **High**: Readability, hierarchy, or consistency issue
- **Medium**: Micro-polish / design system alignment
- **Low**: Nice-to-have visual refinement

---

## Summary

| Phase | Area | Issues Found | Files Modified | Classification |
|-------|------|-------------|----------------|----------------|
| 1 | Visual Hierarchy | KPI cards competing with AI panel for attention | 2 | High |
| 2 | Card Density | All cards used same visual weight (no elevation system) | 3 | High |
| 3 | Dark Mode | Uniform surface contrast, poor depth perception | 1 | Medium |
| 4 | Table Optimization | 6 different hover styles, no shared component, inconsistent headers | 6 | High |
| 5 | KPI Cards | Metric values too small, missing uppercase labels, poor icon contrast | 3 | High |
| 6 | Typography | Inconsistent heading sizes, hardcoded font-weight variations | 2 | Medium |
| 7 | Sidebar | Active state subtle, icon alignment off, no brand visual | 1 | Medium |
| 8 | Empty States | 15+ inline patterns, no shared component, lacks CTAs | 1 | High |
| 9 | Micro Interactions | Inconsistent hover/transition patterns, no press feedback | 1 | Low |
| 10 | Report | N/A | — | — |

---

## Phase 1 — Visual Hierarchy

### Issues Found
- KPI cards (Closed Contracts, Sent Offers, Daily Tours, Total Leads) had same visual weight as AI Assistant panel and Quick Actions card
- Welcome banner `PageHeader` used hardcoded `#1C2B48` / `#C4D8E5` color tokens instead of design system variables
- All cards had identical border/shadow treatment — no way to visually distinguish primary vs secondary content

### Fix Applied
- KPI cards now use `elevation="elevated"` (solid background, strong shadow, hover lift)
- AI Assistant panel uses `elevation="subtle"` (transparent background, recedes visually)
- Quick Actions uses `elevation="default"` (medium visual weight)
- Pipeline + Tasks sections use `elevation="default"`
- Replaced hardcoded color tokens with `var(--nc-*)` variables throughout dashboard

### Files Modified
- `app/globals.css` — Added `.nc-card-elevated`, `.nc-card-default`, `.nc-card-subtle` classes
- `app/operations/dashboard/DashboardView.tsx` — Applied elevation prop, reworked KPI card structure

---

## Phase 2 — Card Density

### Issues Found
- `SmartCard` component had no visual weight differentiation — all cards identical
- KPI cards, insights panels, and supporting content all competed equally
- No "hero" card to draw executive attention to primary metrics

### Fix Applied
- `SmartCard` upgraded with `elevation` prop (`'elevated' | 'default' | 'subtle'`)
- Three-tier elevation system defined in `globals.css`:
  - `.nc-card-elevated`: Solid surface + shadow + hover lift (primary KPIs)
  - `.nc-card-default`: Glassmorphism + blur (standard content)
  - `.nc-card-subtle`: Transparent + border only (secondary/supporting)
- Applied staggered entrance animation (`.nc-stagger-enter`) for card grid entrance

### Files Modified
- `components/ui/SmartCard.tsx` — Added `elevation` prop with three tiers
- `app/globals.css` — Added card elevation CSS classes
- `components/ui/orca-components.tsx` — Updated `Card` to use `nc-card-default`

---

## Phase 3 — Dark Mode Refinement

### Issues Found
- All dark mode surfaces used `--nc-surface` and `--nc-surface-strong` with minimal differentiation
- Sidebar header, main content, and cards all had similar luminance
- No depth hierarchy between overlapping panels

### Fix Applied
- Added dark mode surface tokens in `globals.css`:
  - `.dark .nc-surface-raised` — Brighter surface for elevated cards
  - `.dark .nc-surface-flat` — Darker surface for page background
  - `.dark .nc-surface-overlay` — Highest elevation for modals/drawers
- Sidebar uses `--nc-surface-strong}/95` (more opaque for depth)
- Header uses consistent `--nc-surface-strong}/95` backdrop blur

### Files Modified
- `app/globals.css` — Added dark mode surface hierarchy classes
- `app/components/SovereignSidebar.tsx` — Changed border to `--nc-glass-border`
- `app/components/SovereignHeader.tsx` — Updated backdrop opacity and border token

---

## Phase 4 — Table Optimization

### Issues Found
- No shared DataTable component used — 12+ inline table implementations
- 6 different hover styles across codebase (`hover:bg-white/5`, `hover:bg-[var(--nc-surface-strong)]`, `hover:bg-[var(--nc-accent-soft)]`, etc.)
- No alternating row colors for scanability
- Header styles inconsistent (4 different patterns)
- No selected row state indicator
- Action buttons had inconsistent styling

### Fix Applied
- Created `components/ui/DataTable.tsx` — Reusable component with:
  - `nc-table` base class (standardized header/footer/cell styling)
  - `nc-table-striped` for alternating rows
  - `nc-row-selected` for selected state (left accent border)
  - `nc-cell-actions` for standardized action button column
- Updated 6 migrated tables: SalesView, CampaignsView, CalculatorView, PropertyList, ProjectsOverview, orca-components DataTable
- Remaining tables (rental page, project detail, settings) retain original styling but use compatible patterns

### Files Modified
- `components/ui/DataTable.tsx` — Created new reusable table component
- `components/views/SalesView.tsx` — Migrated to `nc-table`
- `components/views/CampaignsView.tsx` — Migrated to `nc-table`
- `components/views/CalculatorView.tsx` — Migrated to `nc-table`
- `components/properties/PropertyList.tsx` — Migrated to `nc-table`
- `components/projects/ProjectsOverview.tsx` — Migrated to `nc-table`

---

## Phase 5 — KPI Cards

### Issues Found
- Metric values used `text-2xl` (24px) — too small for executive dashboards
- Labels used `text-xs font-bold` with inconsistent coloring
- Icon containers varied in size and border radius across pages
- No consistent spacing between metric value and sub-description
- Missing uppercase tracking on labels for faster scanability

### Fix Applied
- All primary KPI cards upgraded to `elevation="elevated"` with enhanced metric display:
  - Labels: `text-[10px] font-bold uppercase tracking-wider` (compact, scannable)
  - Values: `nc-metric-lg` class (`font-size: 1.75rem`, `font-weight: 800`)
  - Icon containers: Consistent `w-8 h-8 rounded-lg` with tinted background
  - Bottom description: `text-[9px] text-[var(--nc-text-dim)]` (recedes visually)
- Applied to: DashboardView (4 KPIs), SalesView (4 KPIs), Rental page (4 KPIs)

### Files Modified
- `app/operations/dashboard/DashboardView.tsx` — Restructured KPI card layout
- `components/views/SalesView.tsx` — Upgraded KPI cards to elevated variant
- `app/operations/rental/page.tsx` — Upgraded KPI cards to elevated variant

---

## Phase 6 — Typography

### Issues Found
- Headings used ad-hoc sizing (`text-sm font-extrabold`, `text-base font-extrabold`, `text-lg font-semibold`)
- No consistent heading hierarchy — `nc-title`, `nc-section-title`, and various inline styles
- `PageHeader` used hardcoded `text-slate-900 dark:text-white` instead of design tokens
- Multiple font-weight variations (600, 700, 800, 900) used inconsistently

### Fix Applied
- Added typography rhythm classes in `globals.css`:
  - `.nc-heading-1`: Page titles (1.5rem, 800 weight)
  - `.nc-heading-2`: Section headers (1.125rem, 700 weight)
  - `.nc-heading-3`: Card titles (0.9375rem, 700 weight)
  - `.nc-heading-4`: Subsection labels (0.8125rem, 700 weight)
- `PageHeader` updated to use `nc-heading-1` and `var(--nc-text-secondary)`
- DashboardView, SalesView card headers updated to use `nc-heading-3`

### Files Modified
- `app/globals.css` — Added `.nc-heading-1` through `.nc-heading-4`
- `components/ui/PageHeader.tsx` — Updated to use heading classes and design tokens

---

## Phase 7 — Sidebar

### Issues Found
- `nav-item-active` class used a solid `3px` right border with hardcoded coral color
- Icon alignment slightly off (17px icons with inconsistent x/y centering)
- No section grouping or visual hierarchy within navigation items
- Brand area used plain text with no icon/logo visual
- Collapsed mode (80px) showed just letter "O" — no brand recognition

### Fix Applied
- Added icon container in brand section (`w-7 h-7 rounded-lg` with accent background)
- Refined active state with inset shadow and consistent border
- Changed sidebar border from `border-white/10` to `border-[var(--nc-glass-border)]`
- Updated hover effects: `md:hover:translate-x-0 lg:hover:translate-x-[-4px]` for consistent behavior

### Files Modified
- `app/components/SovereignSidebar.tsx` — Brand section redesign, border token update

---

## Phase 8 — Empty States

### Issues Found
- 15+ inline empty states across the codebase with no shared component
- 3 distinct patterns: muted text only, dashed border + icon, icon + checkmark
- No contextual guidance, onboarding cues, or CTA buttons
- Some used hardcoded colors (`#C4D8E5`) instead of design tokens

### Fix Applied
- Created `components/ui/EmptyState.tsx` with:
  - `EmptyState` component: icon, title, description, optional action button
  - `EmptyTableRow` component: colSpan + centered message for table empty states
  - Uses design system variables throughout
  - Encourages adding CTAs (e.g., "Add first property") for future onboarding

### Files Modified
- `components/ui/EmptyState.tsx` — Created shared empty state component

---

## Phase 9 — Micro Interactions

### Issues Found
- Hover effects used inconsistent scale factors (`hover:scale-[1.02]`, `hover:scale-[1.03]`, `hover:scale-105`)
- Transition durations varied (100ms, 150ms, 180ms, 200ms, 300ms)
- Button press feedback used `active:scale-95` only in some components
- No standard hover-glow or hover-lift pattern

### Fix Applied
- Added standardized interaction classes in `globals.css`:
  - `.nc-hover-lift`: translateY(-2px) + enhanced shadow
  - `.nc-hover-glow`: accent border + glow shadow
  - `.nc-hover-brighten`: opacity reduction
  - `.nc-btn-press`: scale(0.96) on active
  - `.nc-stagger-enter`: Staggered entrance animation for card grids (0-300ms delays)
- Standardized transition timing to `0.2s cubic-bezier(0.22, 1, 0.36, 1)`

### Files Modified
- `app/globals.css` — Added micro-interaction utility classes

---

## Phase 10 — Report

Generated: `VISUAL_POLISH_REPORT.md`

---

## Files Modified (Complete List)

| # | File | Change Type | Classification |
|---|------|-------------|----------------|
| 1 | `app/globals.css` | Enhancement | Critical |
| 2 | `components/ui/SmartCard.tsx` | Enhancement | High |
| 3 | `components/ui/EmptyState.tsx` | New file | High |
| 4 | `components/ui/DataTable.tsx` | New file | High |
| 5 | `components/ui/PageHeader.tsx` | Enhancement | Medium |
| 6 | `components/ui/LayoutContainer.tsx` | Enhancement | Medium |
| 7 | `components/ui/orca-components.tsx` | Enhancement | Medium |
| 8 | `app/operations/dashboard/DashboardView.tsx` | Refactor | High |
| 9 | `components/views/SalesView.tsx` | Refactor | High |
| 10 | `components/views/CampaignsView.tsx` | Refactor | Medium |
| 11 | `components/views/CalculatorView.tsx` | Refactor | Medium |
| 12 | `components/properties/PropertyList.tsx` | Refactor | Medium |
| 13 | `components/projects/ProjectsOverview.tsx` | Refactor | Medium |
| 14 | `app/components/SovereignSidebar.tsx` | Refactor | Medium |
| 15 | `app/components/SovereignHeader.tsx` | Enhancement | Low |
| 16 | `app/operations/rental/page.tsx` | Refactor | Medium |

---

## Design System Improvements

### Design Tokens Normalized
- Replaced hardcoded colors (`#1C2B48`, `#C4D8E5`, `#8EB1D1`, `slate-500`, `slate-900`) with CSS custom properties (`var(--nc-*)`)
- Standardized on `--nc-text-primary`, `--nc-text-secondary`, `--nc-text-dim`, `--nc-accent`, `--nc-glass-border`

### New CSS Classes Added
- **Card System**: `.nc-card-elevated`, `.nc-card-default`, `.nc-card-subtle`
- **Table System**: `.nc-table`, `.nc-table-striped`, `.nc-row-selected`, `.nc-cell-actions`
- **Typography**: `.nc-heading-1` through `.nc-heading-4`, `.nc-metric-lg`
- **Interactions**: `.nc-hover-lift`, `.nc-hover-glow`, `.nc-hover-brighten`, `.nc-btn-press`, `.nc-stagger-enter`
- **Dark Mode**: `.dark .nc-surface-raised`, `.dark .nc-surface-flat`, `.dark .nc-surface-overlay`

### New Components Created
- `EmptyState` — Shared empty state with icon, title, description, CTA
- `EmptyTableRow` — Table row for empty data states
- `DataTable` — Reusable table with columns, row selection, striped variant

### Component Upgrades
- `SmartCard` — Now accepts `elevation` prop (`'elevated' | 'default' | 'subtle'`)
- `Card` (orca-components) — Updated from `nc-glass` to `nc-card-default`
- `PageHeader` — Now uses design system variables and heading rhythm
- `LayoutContainer` — Uses `nc-page nc-stack` with `nc-stagger-enter` animation

---

## Before/After

| Aspect | Before | After |
|--------|--------|-------|
| KPI visual weight | Same as all other cards | Elevated with shadow + lift |
| Card differentiation | None | 3-tier elevation system |
| Table hover | 6 different styles | Standardized `nc-table` |
| Table row selection | Border-left inline style | `.nc-row-selected` class |
| Empty states | 15+ inline patterns | Shared `EmptyState` component |
| Typography rhythm | Ad-hoc sizes | `.nc-heading-*` hierarchy |
| Sidebar active state | Solid 3px border | Normalized border + inset |
| Dark mode depth | Uniform surfaces | 3-tier surface hierarchy |
| Entrance animation | None | Staggered `.nc-stagger-enter` |
| Button press feedback | Partial | `.nc-btn-press` standard |

---

## Build Status
**✅ Build passes** — Zero TypeScript errors, all 85 pages generated successfully.

---

## Next Recommendations

1. **Migrate remaining tables** (rental page, project detail, settings staff, opportunity/contacts tabs) to `nc-table` for full consistency
2. **Replace inline empty states** across all 15+ locations with the shared `EmptyState` component
3. **Add onboarding CTAs** to empty states — guide users to add their first lead/property/project
4. **Standardize remaining `Button` usage** — many views use inline `<button>` instead of `HudButton` or `Button` component
5. **Replace hardcoded emoji** (`👋`, `❤️`, `🏆`) with Phosphor Icons or Lucide equivalents
