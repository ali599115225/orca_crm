import React from "react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsKpiGridProps
  extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export default function OperationsKpiGrid({
  children,
  className = "",
  ...props
}: OperationsKpiGridProps) {
  return (
    <section
      className={[operationsVisual.metrics, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </section>
  );
}