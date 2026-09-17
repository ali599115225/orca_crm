import React from "react";

interface OperationsDataRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export default function OperationsDataRow({
  children,
  interactive = false,
  className = "",
  ...props
}: OperationsDataRowProps) {
  return (
    <tr
      className={[
        "orca-data-row",
        interactive ? "is-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </tr>
  );
}