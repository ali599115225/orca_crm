"use client";

import { useEffect } from "react";
import LeadsRouteState from "@/features/leads/components/LeadsRouteState";

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Leads Route]", { digest: error.digest || "unknown" });
  }, [error]);

  return <LeadsRouteState state="error" onRetry={reset} />;
}
