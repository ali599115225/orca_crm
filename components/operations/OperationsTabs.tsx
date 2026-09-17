import React from "react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsTabsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function OperationsTabs({
  children,
  className = "",
  ...props
}: OperationsTabsProps) {
  return (
    <div
      className={[operationsVisual.tabs, className].filter(Boolean).join(" ")}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}