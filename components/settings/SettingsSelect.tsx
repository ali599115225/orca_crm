"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import OperationsScrollRegion from "@/components/operations/OperationsScrollRegion";

export interface SettingsSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SettingsSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SettingsSelectOption[];
  placeholder?: string;
  className?: string;
  /** When provided, a hidden native input mirrors the value so this select
   * still participates in plain `<form>` + `FormData` submission. */
  name?: string;
  id?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  mono?: boolean;
  placement?: "auto" | "bottom";
  portalZIndex?: number;
  dir?: "ltr" | "rtl" | "auto";
  "aria-label"?: string;
}

function firstEnabledIndex(options: SettingsSelectOption[]): number {
  return options.findIndex((option) => !option.disabled);
}

function lastEnabledIndex(options: SettingsSelectOption[]): number {
  for (let i = options.length - 1; i >= 0; i -= 1) {
    if (!options[i].disabled) return i;
  }
  return -1;
}

function nextEnabledIndex(
  options: SettingsSelectOption[],
  current: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;
  if (current < 0) {
    return direction === 1
      ? firstEnabledIndex(options)
      : lastEnabledIndex(options);
  }

  let next = current;
  for (let step = 0; step < options.length; step += 1) {
    next = (next + direction + options.length) % options.length;
    if (!options[next]?.disabled) return next;
  }
  return current;
}

/**
 * The single shared dropdown for every Settings surface. Renders a button
 * (role="combobox") that opens a portaled, dark-themed listbox — never the
 * native OS dropdown popup. Built only from React state + createPortal +
 * the existing --nc-* tokens; no new dependency.
 */
export default function SettingsSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  name,
  disabled,
  required,
  mono,
  placement = "auto",
  portalZIndex = 200,
  ...rest
}: SettingsSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    direction: "ltr" | "rtl";
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function computePosition() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const viewportGap = 8;
    const estimatedListHeight = Math.min(options.length * 36 + 8, 240);
    const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
    const spaceAbove = rect.top - viewportGap;
    const openUpward =
      placement === "auto" &&
      spaceBelow < estimatedListHeight &&
      spaceAbove > spaceBelow;
    const availableHeight = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(96, Math.min(240, availableHeight - 4));
    const renderedHeight = Math.min(estimatedListHeight, maxHeight);
    const preferredMinimum = Math.min(220, Math.max(0, window.innerWidth - 8));
    const width = Math.min(
      Math.max(rect.width, preferredMinimum),
      Math.max(0, window.innerWidth - 8),
    );
    const direction =
      window.getComputedStyle(button).direction === "rtl" ? "rtl" : "ltr";

    setPosition({
      top: openUpward
        ? Math.max(rect.top - renderedHeight - 4, 4)
        : Math.min(rect.bottom + 4, window.innerHeight - renderedHeight - 4),
      left: Math.max(4, Math.min(rect.left, window.innerWidth - width - 4)),
      width,
      maxHeight,
      direction,
    });
  }

  function openList() {
    if (disabled) return;
    computePosition();
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : firstEnabledIndex(options),
    );
    setOpen(true);
  }

  function closeList(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeList();
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return;
      closeList(false);
    }
    function handleReposition() {
      computePosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;

    const activeOption = document.getElementById(
      `${listboxId}-option-${activeIndex}`,
    );
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        closeList();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => nextEnabledIndex(options, current, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => nextEnabledIndex(options, current, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(firstEnabledIndex(options));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(lastEnabledIndex(options));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (activeIndex >= 0) selectOption(activeIndex);
        break;
      case "Tab":
        closeList(false);
        break;
      default:
        break;
    }
  }

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-required={required || undefined}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? activeOptionId : undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
        className={`flex h-11 items-center justify-between gap-2 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-start text-sm text-[var(--nc-foreground)] outline-none transition-colors focus:border-[var(--nc-accent-border)] disabled:cursor-not-allowed disabled:opacity-50 ${
          mono ? "font-mono" : ""
        } ${className || ""}`}
        {...rest}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={14} className="shrink-0 text-[var(--nc-foreground-muted)]" aria-hidden="true" />
      </button>

      {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
      {required ? (
        <input
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          required
          disabled={disabled}
          value={selected && !selected.disabled ? value : ""}
          onChange={() => {}}
          onInvalid={(event) => {
            event.preventDefault();
            buttonRef.current?.focus();
          }}
        />
      ) : null}

      {open &&
        position &&
        createPortal(
          <div
            ref={listRef}
            dir={position.direction}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: portalZIndex,
            }}
            className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] shadow-2xl"
          >
            <OperationsScrollRegion
              scrollRole="menu"
              data-operations-portal-scroll="true"
              id={listboxId}
              role="listbox"
              dir={position.direction}
              style={{ maxHeight: position.maxHeight }}
              className="rounded-xl py-1"
            >
              {options.map((option, index) => (
                <div
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onClick={() => selectOption(index)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-start text-sm transition-colors ${mono ? "font-mono" : ""} ${
                    option.disabled
                      ? "cursor-not-allowed text-[var(--nc-foreground-muted)] opacity-50"
                      : option.value === value || index === activeIndex
                        ? "bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)]"
                        : "text-[var(--nc-foreground)] hover:bg-[var(--nc-surface-strong)]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && (
                    <Check size={14} className="shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </OperationsScrollRegion>
          </div>,
          document.body,
        )}
    </>
  );
}
