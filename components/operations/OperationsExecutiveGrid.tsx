import React from "react";

interface OperationsExecutiveGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "detailWide" | "singlePane" | "masterRightDetailWide";
}

export default function OperationsExecutiveGrid({
  children,
  variant = "default",
  className = "",
  ...props
}: OperationsExecutiveGridProps) {
  return (
    <div
      className={[
        "orca-operations-executive-grid",
        variant === "detailWide" ? "is-detail-wide" : "",
        variant === "singlePane" ? "is-single-pane" : "",
        variant === "masterRightDetailWide" ? "is-master-right-detail-wide" : "",
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
