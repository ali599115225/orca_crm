"use client";

import React from "react";

export default function OperationsTextField({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={["orca-operations-input", className].filter(Boolean).join(" ")}
    />
  );
}
