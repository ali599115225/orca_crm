import { leadVisual } from "@/features/leads/visual";

export default function LeadsLoading() {
  return (
    <section className={leadVisual.page} aria-busy="true" aria-live="polite">
      <div className={`${leadVisual.pageStack} animate-pulse`}>
        <div className="space-y-3">
          <div className="h-3 w-36 rounded bg-[var(--nc-surface-strong)]" />
          <div className="h-8 w-64 max-w-full rounded bg-[var(--nc-surface-strong)]" />
          <div className="h-4 w-96 max-w-full rounded bg-[var(--nc-surface-strong)]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={`${leadVisual.panel} min-h-32 p-5`}>
              <div className="h-3 w-24 rounded bg-[var(--nc-surface-strong)]" />
              <div className="mt-5 h-8 w-16 rounded bg-[var(--nc-surface-strong)]" />
              <div className="mt-5 h-3 w-32 rounded bg-[var(--nc-surface-strong)]" />
            </div>
          ))}
        </div>

        <div className={`${leadVisual.panel} space-y-3 p-4 sm:p-5`}>
          <div className="h-11 w-full rounded-xl bg-[var(--nc-surface-strong)]" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-soft)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
