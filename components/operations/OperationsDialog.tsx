"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { operationsVisual } from "@/features/operations/visual";

interface OperationsDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeLabel: string;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  dir?: "rtl" | "ltr";
}

export default function OperationsDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel,
  closeDisabled = false,
  closeOnBackdrop = true,
  className = "",
  dir,
}: OperationsDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabledRef.current) {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`orca-v1-shell ${operationsVisual.dialogOverlay}`}
      role="presentation"
      dir={dir}
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          !closeDisabled &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={[operationsVisual.dialog, className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={operationsVisual.dialogHeader}>
          <div className="min-w-0">
            <h2 id={titleId} className={operationsVisual.sectionTitle}>
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[var(--nc-text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className={operationsVisual.closeButton}
            onClick={onClose}
            disabled={closeDisabled}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={operationsVisual.dialogBody}>{children}</div>

        {footer ? (
          <div className={operationsVisual.dialogFooter}>{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
