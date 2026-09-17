"use client";

import React from "react";

export default function OperationsTextareaField({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={["orca-operations-textarea", className].filter(Boolean).join(" ")}
    />
  );
}
