import React from "react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsPanelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padded?: boolean;
}

export default function OperationsPanel({
  children,
  padded = false,
  className = "",
  ...props
}: OperationsPanelProps) {
  return (
    <div
      className={[
        padded ? operationsVisual.panelPadded : operationsVisual.panel,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}