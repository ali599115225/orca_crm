export const contractWizardVisual = {
  /**
   * z-[1000] ensures the overlay sits above every application surface:
   * Header (typically z-50 / 50), Sidebar (z-40) and any sticky toolbars.
   * The listbox inside ContractWizardSelect uses z-[1100] relative to
   * the portal root (document.body), which is always above this overlay.
   */
  overlay:
    "fixed inset-0 z-[1000] flex items-center justify-center bg-black/[0.62] p-3 backdrop-blur-sm sm:p-6",
  dialog:
    "relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-y-auto overscroll-contain rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)] p-5 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-6",
  header:
    "mb-5 flex items-start justify-between gap-4 border-b border-[var(--nc-glass-border)] pb-4",
  iconTile:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]",
  title: "text-lg font-black text-[var(--nc-text-primary)]",
  subtitle: "mt-1 text-sm leading-6 text-[var(--nc-text-secondary)]",
  closeButton:
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--nc-glass-border)] text-[var(--nc-text-secondary)] transition hover:border-[var(--nc-accent-border)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
  stepList:
    "mb-5 grid grid-cols-3 gap-2 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] p-2",
  step:
    "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-start",
  stepCurrent:
    "border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]",
  stepComplete:
    "border border-transparent text-[var(--nc-text-primary)]",
  stepPending:
    "border border-transparent text-[var(--nc-text-dim)]",
  stepNumber:
    "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current text-xs font-black",
  label: "text-sm font-bold text-[var(--nc-text-primary)]",
  helper: "text-xs leading-5 text-[var(--nc-text-secondary)]",
  field:
    "w-full rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] px-4 py-3 text-start text-sm text-[var(--nc-text-primary)] outline-none transition focus:border-[var(--nc-accent-border)] focus:ring-2 focus:ring-[var(--nc-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50",
  /** Compound wrapper for the amount field (trigger for focus-within ring). */
  amountFieldWrapper:
    "flex min-h-[44px] w-full items-center overflow-hidden rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] transition focus-within:border-[var(--nc-accent-border)] focus-within:ring-2 focus-within:ring-[var(--nc-accent-soft)]",
  /** Numeric input inside the compound field. */
  amountInput:
    "min-w-0 flex-1 bg-transparent px-4 py-3 text-left font-mono text-sm tabular-nums text-[var(--nc-text-primary)] outline-none placeholder:font-sans placeholder:text-[var(--nc-text-dim)] disabled:cursor-not-allowed",
  /** Fixed currency suffix inside the compound field. */
  amountSuffix:
    "shrink-0 select-none border-s border-[var(--nc-glass-border)] px-3 py-3 text-xs font-bold text-[var(--nc-text-secondary)]",
  reviewPanel:
    "rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)] p-4",
  primaryButton:
    "nc-btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nc-surface-solid)] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "nc-btn nc-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--nc-border)] px-5 text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-accent)] disabled:cursor-not-allowed disabled:opacity-50",
} as const;

