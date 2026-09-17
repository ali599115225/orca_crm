import React from "react";

interface OperationsMasterListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function OperationsMasterList({
  children,
  className = "",
  ...props
}: OperationsMasterListProps) {
  return (
    <div
      className={["orca-operations-master-list", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
