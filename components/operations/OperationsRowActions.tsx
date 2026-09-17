import React from "react";
import { Ban, type LucideIcon } from "lucide-react";

interface OperationsRowActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  label: string;
}

export function OperationsRowActions({
  children,
  label,
  className = "",
  ...props
}: OperationsRowActionsProps) {
  return (
    <div
      className={["orca-operations-row-actions", className]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={label}
      {...props}
    >
      {children}
    </div>
  );
}

interface OperationsRowActionProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: LucideIcon;
  available?: boolean;
  unavailableReason?: string;
  children: React.ReactNode;
}

export function OperationsRowAction({
  icon: Icon,
  available = true,
  unavailableReason,
  children,
  className = "",
  disabled,
  title,
  ...props
}: OperationsRowActionProps) {
  const isUnavailable = !available || Boolean(disabled);
  const ActionIcon = isUnavailable ? Ban : Icon;

  return (
    <span
      className="orca-operations-row-action-slot"
      title={isUnavailable ? unavailableReason : title}
    >
      <button
        type="button"
        className={[
          "orca-operations-row-action",
          isUnavailable ? "is-unavailable" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={isUnavailable}
        aria-disabled={isUnavailable}
        {...props}
      >
        {ActionIcon ? <ActionIcon size={13} aria-hidden="true" /> : null}
        <span>{children}</span>
      </button>
    </span>
  );
}
