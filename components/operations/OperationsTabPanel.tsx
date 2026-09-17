import React from "react";

interface OperationsTabPanelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  horizontalScroll?: boolean;
}

/**
 * Canonical detail-tab body for Operations pages.
 *
 * Vertical scrolling belongs to the page shell by default. A tab panel therefore
 * grows naturally with its content and never becomes a nested vertical scroll
 * owner. Wide tables may opt into horizontal scrolling only.
 */
export default function OperationsTabPanel({
  children,
  horizontalScroll = false,
  className = "",
  ...props
}: OperationsTabPanelProps) {
  return (
    <div
      className={[
        "orca-operations-tab-panel",
        horizontalScroll ? "is-horizontal-scroll" : "",
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
