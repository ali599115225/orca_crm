// components/ui/HudElements.tsx
// NovaCore HUD Tactical UI Components

import React from "react";

// ─── HUD Button ──────────────────────────────────────────────
interface HudButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export function HudButton({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}: HudButtonProps) {
  const variantClass =
    variant === "primary" ? "nc-btn-primary" :
    variant === "ghost" ? "nc-btn-ghost" :
    variant === "outline" ? "nc-btn-outline" :
    "nc-btn-danger";

  const sizeClass = size === "sm" ? "nc-btn-sm" : size === "lg" ? "nc-btn-lg" : "";

  return (
    <button className={`nc-btn ${variantClass} ${sizeClass} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

// ─── HUD Progress Bar ────────────────────────────────────────
interface HudProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function HudProgress({ value, max = 100, className = "" }: HudProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={`nc-progress ${className}`}>
      <div className="nc-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── HUD Badge ────────────────────────────────────────────────
interface HudBadgeProps {
  children: React.ReactNode;
  variant?: "accent" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
}

export function HudBadge({ children, variant = "accent", className = "" }: HudBadgeProps) {
  return (
    <span className={`nc-badge nc-badge-${variant} ${className}`}>
      {children}
    </span>
  );
}

// ─── HUD Metric (number display) ─────────────────────────────
interface HudMetricProps {
  value: string | number;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HudMetric({ value, label, size = "md", className = "" }: HudMetricProps) {
  return (
    <div className={className}>
      <div className={`nc-metric ${size === "sm" ? "nc-metric-sm" : size === "lg" ? "nc-metric-lg" : ""}`}>
        {value}
      </div>
      {label && <div className="nc-metric-label">{label}</div>}
    </div>
  );
}

// ─── Scanning Line overlay ───────────────────────────────────
export function HudScan({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`nc-scan ${className}`}>{children}</div>;
}

// ─── Pulse Dot ────────────────────────────────────────────────
export function HudPulse({ className = "" }: { className?: string }) {
  return <span className={`nc-pulse ${className}`} />;
}
