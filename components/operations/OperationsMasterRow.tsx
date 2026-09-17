import React from "react";

interface OperationsMasterRowProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: React.ReactNode;
  selected?: boolean;
}

export default function OperationsMasterRow({
  children,
  selected = false,
  className = "",
  ...props
}: OperationsMasterRowProps) {
  return (
    <button
      type="button"
      className={[
        "orca-operations-master-row text-start focus-visible:outline-none",
        selected
          ? "border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)]"
          : "border-transparent bg-transparent hover:border-[var(--nc-border)] hover:bg-[var(--nc-surface-soft)] focus-visible:border-[var(--nc-border)] focus-visible:bg-[var(--nc-surface-soft)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
