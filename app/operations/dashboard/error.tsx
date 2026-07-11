"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { dashboardCopy } from "@/features/dashboard/copy/dashboardCopy";
import { dashboardVisual } from "@/features/dashboard/visual";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useApp();
  const copy = lang === "EN" ? dashboardCopy.EN : dashboardCopy.AR;

  useEffect(() => {
    console.error("[DashboardRoute] render failed", error);
  }, [error]);

  return (
    <main className={dashboardVisual.page} dir={lang === "EN" ? "ltr" : "rtl"}>
      <div className={`${dashboardVisual.panel} mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center`}>
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
        <h1 className={dashboardVisual.sectionTitle}>{copy.fatalErrorTitle}</h1>
        <p className={dashboardVisual.body}>{copy.fatalErrorDescription}</p>
        <button type="button" onClick={reset} className={dashboardVisual.primaryButton}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {copy.retry}
        </button>
      </div>
    </main>
  );
}
