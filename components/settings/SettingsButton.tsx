"use client";

import { forwardRef } from "react";

export type SettingsButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "icon";

export interface SettingsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SettingsButtonVariant;
}

const VARIANT_CLASSES: Record<SettingsButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--nc-accent)] text-slate-950 hover:bg-[var(--nc-accent-hover)]",
  secondary:
    "border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] hover:bg-[var(--nc-surface)]",
  danger:
    "border border-rose-500/30 bg-transparent text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
  ghost:
    "border border-transparent bg-transparent text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface-strong)] hover:text-[var(--nc-foreground)]",
  icon:
    "border border-[var(--nc-border)] bg-transparent text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]",
};

/**
 * The single shared button for every Settings surface (Organization, Staff,
 * Billing, AI, Integrations, Compliance, and their drawers/modals). Fixed
 * 44px height / 12px radius / 16px horizontal padding / 14px semibold text
 * across every variant so buttons never differ in height, radius, or type
 * between screens at the same level.
 */
const SettingsButton = forwardRef<HTMLButtonElement, SettingsButtonProps>(
  function SettingsButton(
    { variant = "secondary", className = "", type = "button", children, ...rest },
    ref,
  ) {
    const isIcon = variant === "icon";

    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isIcon ? "w-11 px-0" : "px-4"
        } ${VARIANT_CLASSES[variant]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export default SettingsButton;
