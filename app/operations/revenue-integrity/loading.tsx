export default function RevenueIntegrityLoading() {
  return (
    <main
      className="min-h-full bg-[var(--nc-bg)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-label="Loading Revenue Integrity"
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-[var(--nc-surface-strong)]" />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-72 max-w-[70vw] animate-pulse rounded-xl bg-[var(--nc-surface-strong)]" />
            <div className="h-4 w-96 max-w-[80vw] animate-pulse rounded-lg bg-[var(--nc-surface-strong)]" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-[var(--nc-accent-soft)]" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="min-h-32 animate-pulse rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]"
            />
          ))}
        </div>
        <div className="h-14 animate-pulse rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]" />
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]" />
      </div>
    </main>
  );
}
