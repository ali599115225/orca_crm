// components/ui/GlassCard.tsx
// NovaCore Reusable Glass Card — HUD corner accents + glassmorphism

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "strong" | "hud";
  as?: "div" | "section" | "article";
}

export function GlassCard({
  children,
  className = "",
  variant = "default",
  as: Tag = "div",
}: GlassCardProps) {
  const variantClass =
    variant === "strong" ? "nc-glass-strong" :
    variant === "hud" ? "nc-glass-hud" :
    "nc-glass";

  return <Tag className={`${variantClass} ${className}`}>{children}</Tag>;
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`nc-card-header ${className}`}>{children}</div>;
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`nc-card-body ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`nc-card-footer ${className}`}>{children}</div>;
}
