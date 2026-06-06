# ORCA CRM — Design System & Visual Identity

## Color Palette
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--ds-primary` | `#0E5E6E` (Deep Teal) | `#8EB1D1` (Soft Blue) | Headers, primary buttons |
| `--ds-secondary` | `#1A365D` (Midnight Blue) | `#1C2B48` (Dark Navy) | Cards, sidebars, surfaces |
| `--ds-accent` | `#0EA5E9` (Sky) | `#22D3EE` (Cyan) | Active states, highlights |
| `--ds-bg` | `#F1F5F9` (Slate 50) | `#0A1628` (Deep Navy) | Page background |
| `--ds-surface` | `#FFFFFF` | `#1C2B48` | Card backgrounds |
| `--ds-text` | `#1E293B` | `#E6EEF6` | Primary text |
| `--ds-muted` | `#64748B` | `#C4D8E5` | Secondary text |

## Component Classes (Prefix: `ds-*`)

### Typography
- `ds-h1` — Page title (24px, bold)
- `ds-h2` — Section title (20px, bold)
- `ds-h3` — Card title (16px, bold)
- `ds-h4` — Subtitle (14px, semibold)
- `ds-body` — Body text (13px)
- `ds-body-sm` — Small body (11px)
- `ds-label` — Field label (10px, uppercase)
- `ds-value` — Data value (13px, bold, mono)
- `ds-muted` — Muted text (11px)

### Cards
- `ds-card` — Base card (rounded-2xl, border, shadow)
- `ds-card-glass` — Glass variant (backdrop-blur)
- `ds-card-header` — Card header with bottom border
- `ds-card-body` — Card body with padding
- `ds-card-footer` — Card footer (flex, gap, border-top)

### Buttons
- `ds-btn` — Base button
- `ds-btn-primary` — Primary filled
- `ds-btn-secondary` — Secondary outline
- `ds-btn-ghost` — Ghost
- `ds-btn-danger` — Red danger
- `ds-btn-success` — Green success
- `ds-btn-sm` / `ds-btn-lg` — Size variants

### Grid & Layout
- `ds-card-grid` — Auto-fill grid (min 280px)
- `ds-card-grid-sm` — Small cards (min 220px)
- `ds-card-grid-lg` — Large cards (min 350px)
- `ds-card-grid-2/3/4` — Fixed columns
- `ds-gap-xs/sm/md/lg/xl` — Gap spacing
- `ds-p-xs/sm/md/lg/xl` — Padding
- `ds-flex-center` / `ds-flex-between` — Flex helpers

### Status Badges
- `ds-badge` — Base badge
- `ds-badge-success` — Green (Available/Active/Paid)
- `ds-badge-warning` — Amber (Hold/Pending/Due)
- `ds-badge-danger` — Red (Sold/Overdue/Expired)
- `ds-badge-info` — Blue (Info/New)
- `ds-badge-neutral` — Gray (Inactive/Draft)

### Tabs
- `<div class="ds-tabs">` — Tab container
- `<button class="ds-tab ds-tab-active">` — Active tab
- `<button class="ds-tab">` — Inactive tab

### Modals
- Use `<Modal>` component from `@/components/ui/Modal`
- Props: `open`, `onClose`, `title`, `children`, `maxWidth`

### Pipeline
- `.stage-column` — Droppable stage column
- `.lead-card` — Draggable lead card
- `.lead-card.dragging` — While dragging

## Dark Mode
Uses `prefers-color-scheme` media query.
All `--ds-*` CSS variables switch automatically.
