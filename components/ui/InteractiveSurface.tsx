"use client";

import React from "react";

type InteractiveSurfaceVariant = "card" | "stage" | "row";

interface InteractiveSurfaceProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: InteractiveSurfaceVariant;
}

const variantClass: Record<InteractiveSurfaceVariant, string> = {
  card: "rounded-xl",
  stage: "rounded-lg",
  row: "rounded-lg",
};

export default function InteractiveSurface({
  variant = "card",
  className = "",
  children,
  ...props
}: InteractiveSurfaceProps) {
  return (
    <button
      type="button"
      className={[
        "group w-full appearance-none border border-[#0A1F3A]/10 bg-white text-inherit shadow-sm",
        "transition-[background-color,border-color,box-shadow,transform] duration-150",
        "hover:border-[#D9AD55]/50 hover:bg-[#EDC66D]/5 hover:shadow-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9AD55] focus-visible:ring-offset-2",
        "active:translate-y-px",
        "dark:border-white/10 dark:bg-[#0A1F3A]",
        "dark:hover:border-[#D9AD55]/50 dark:hover:bg-[#D9AD55]/[0.07]",
        "dark:focus-visible:ring-offset-[#07182D]",
        variantClass[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
