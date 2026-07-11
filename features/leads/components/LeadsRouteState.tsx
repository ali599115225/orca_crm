"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, ShieldX } from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { leadsCopy } from "@/features/leads/copy/leadsCopy";
import { leadVisual } from "@/features/leads/visual";

interface LeadsRouteStateProps {
  state: "forbidden" | "error";
  onRetry?: () => void;
}

export default function LeadsRouteState({ state, onRetry }: LeadsRouteStateProps) {
  const router = useRouter();
  const { lang } = useApp();
  const isArabic = lang === "AR";
  const labels = isArabic ? leadsCopy.ar : leadsCopy.en;
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const StateIcon = state === "forbidden" ? ShieldX : AlertTriangle;

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className={`${leadVisual.page} flex items-center justify-center`}
    >
      <div
        role={state === "error" ? "alert" : "status"}
        className={`${leadVisual.panel} w-full max-w-xl p-6 text-center sm:p-8`}
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] text-[var(--nc-accent)]">
          <StateIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-[var(--nc-text-primary)]">
          {state === "forbidden" ? labels.forbiddenTitle : labels.routeErrorTitle}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--nc-text-secondary)]">
          {state === "forbidden"
            ? labels.forbiddenDescription
            : labels.routeErrorDescription}
        </p>
        <div className="mt-5 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/operations/dashboard")}
            className={leadVisual.secondaryButton}
          >
            <BackIcon className="h-4 w-4" aria-hidden="true" />
            {labels.returnToDashboard}
          </button>
          {state === "error" && onRetry && (
            <button type="button" onClick={onRetry} className={leadVisual.primaryButton}>
              {labels.retry}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
