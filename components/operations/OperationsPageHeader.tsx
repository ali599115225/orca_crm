import React from "react";
import type { LucideIcon } from "lucide-react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsPageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

export default function OperationsPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  meta,
  actions,
  className = "",
  ...props
}: OperationsPageHeaderProps) {
  return (
    <header
      className={[operationsVisual.hero, className].filter(Boolean).join(" ")}
      {...props}
    >
      <div className={operationsVisual.heroCopy}>
        <div className={Icon ? "flex min-w-0 items-start gap-3" : "min-w-0"}>
          {Icon ? (
            <span className={operationsVisual.iconTile} aria-hidden="true">
              <Icon />
            </span>
          ) : null}

          <div className="min-w-0">
            {eyebrow ? (
              <p className={operationsVisual.eyebrow}>{eyebrow}</p>
            ) : null}
            <h1 className={operationsVisual.title}>{title}</h1>
            {description ? (
              <p className={operationsVisual.description}>{description}</p>
            ) : null}
          </div>
        </div>
      </div>

      {meta || actions ? (
        <div className={operationsVisual.heroActions}>
          {meta ? <div className={operationsVisual.heroMeta}>{meta}</div> : null}
          {actions ? (
            <div className={operationsVisual.actionRow}>{actions}</div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}