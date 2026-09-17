import React from "react";
import type { LucideIcon } from "lucide-react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsPanelHeaderProps {
  title: React.ReactNode;
  dir?: "rtl" | "ltr";
  description?: React.ReactNode;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function OperationsPanelHeader({
  title,
  dir,
  description,
  icon: Icon,
  meta,
  actions,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
}: OperationsPanelHeaderProps) {
  return (
    <div
      dir={dir}
      className={["orca-operations-panel-header", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex min-w-0 items-start gap-2">
        {Icon ? (
          <span className={operationsVisual.iconTile} aria-hidden="true">
            <Icon />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2
            className={[operationsVisual.sectionTitle, titleClassName]
              .filter(Boolean)
              .join(" ")}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={[
                "mt-1 truncate text-[11px] text-[var(--nc-text-secondary)]",
                descriptionClassName,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {meta || actions ? (
        <div className="flex shrink-0 items-center gap-2">
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
