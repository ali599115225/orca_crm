import React from "react";

interface OperationsTableToolbarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function OperationsTableToolbar({
  children,
  className = "",
  ...props
}: OperationsTableToolbarProps) {
  return (
    <div
      className={["orca-operations-table-toolbar", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
