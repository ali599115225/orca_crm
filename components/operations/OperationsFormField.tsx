import React from "react";

interface OperationsFormFieldProps {
  label: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function OperationsFormField({
  label,
  error,
  hint,
  children,
  className = "",
}: OperationsFormFieldProps) {
  return (
    <label className={["orca-operations-form-field", className].filter(Boolean).join(" ")}>
      <span className="orca-operations-form-label">{label}</span>
      {children}
      {error ? (
        <span className="orca-operations-form-error">{error}</span>
      ) : hint ? (
        <span className="orca-operations-form-hint">{hint}</span>
      ) : null}
    </label>
  );
}
