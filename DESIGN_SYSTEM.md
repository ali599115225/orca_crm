# ORCA CRM — NovaCore Design System v2

## Cold Misty Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-deep-teal` | `#0C3846` | Base bg |
| `--color-void` | `#020814` | Page bg |
| `--color-surface` | `#0C1D2B` | Card bg |
| `--nc-accent` | `#00E5FF` | HUD accent, links |
| `--nc-accent-dim` | `#0EA5E9` | Dim accent |

## CSS Architecture

Classes prefixed `nc-*` (NovaCore). Legacy `ds-*` and `.orca-*` classes mapped via section 8 of `globals.css`.

### Layout
- `nc-shell` — full-height page wrapper with bg gradient
- `nc-page` — centered max-1600px container
- `nc-header` / `nc-header-row` — page header block
- `nc-section` — glass section with header
- `nc-grid-{1-4}` / `nc-grid-sidebar` — auto-fit grid
- `nc-stack` / `nc-row` — flex layout

### Components
- `nc-glass` / `nc-glass-strong` / `nc-glass-hud` — glassmorphism cards
- `nc-btn nc-btn-{primary|ghost|outline|danger}` — HUD buttons
- `nc-badge nc-badge-{accent|success|warning|danger|info|purple}` — badges
- `nc-progress` / `nc-progress-bar` — HUD progress bars
- `nc-metric` / `nc-metric-label` — numeric data readouts
- `nc-scan` — scanning line animation
- `nc-pulse` — pulsing status dot

### Pipeline
- `nc-pipeline` — horizontal scrollable container
- `nc-stage` — stage column (280px fixed)
- `nc-stage-header` / `nc-stage-title` / `nc-stage-count`
- `nc-lead` — draggable lead card (3px left accent bar)
- `nc-lead-name` / `nc-lead-meta` / `nc-lead-score`

### Utility
- `nc-text-{accent|dim|primary|secondary}` — text colors
- `nc-font-mono` — monospace font
- `nc-enter` — fadeIn animation
