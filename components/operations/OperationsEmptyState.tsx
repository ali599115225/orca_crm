import React from "react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsEmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function OperationsEmptyState({
  children,
  className = "",
  ...props
}: OperationsEmptyStateProps) {
  return (
    <div
      className={[operationsVisual.emptyState, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}