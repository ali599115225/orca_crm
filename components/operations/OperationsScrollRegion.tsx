import React from "react";

type OperationsScrollRole = "log" | "conversation" | "menu" | "dialog";

interface OperationsScrollRegionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  scrollRole: OperationsScrollRole;
  children: React.ReactNode;
}

export default function OperationsScrollRegion({
  scrollRole,
  children,
  className = "",
  ...props
}: OperationsScrollRegionProps) {
  return (
    <div
      data-operations-scroll-role={scrollRole}
      className={[
        "orca-operations-scroll-region",
        `is-${scrollRole}`,
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
