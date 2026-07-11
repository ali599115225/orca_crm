export default function DashboardLoading() {
  return (
    <main className="min-h-full bg-[var(--nc-bg)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1600px] animate-pulse space-y-6" aria-busy="true">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
          <div className="space-y-3">
            <div className="h-8 w-56 rounded-lg bg-[var(--nc-surface-strong)]" />
            <div className="h-4 w-80 max-w-full rounded bg-[var(--nc-surface-strong)]" />
          </div>
          <div className="h-11 w-44 rounded-xl bg-[var(--nc-surface-strong)]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]"
            />
          ))}
        </div>

        <div className="h-60 rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]" />
        <div className="h-80 rounded-2xl border border-[var(--nc-glass-border)] bg-[var(--nc-surface-solid)]" />
      </div>
    </main>
  );
}
