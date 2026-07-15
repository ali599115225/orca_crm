"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export interface ContractWizardSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ContractWizardSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ContractWizardSelectOption[];
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  mono?: boolean;
  placement?: "auto" | "bottom" | "top";
  portalZIndex?: number;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyLabel?: string;
  "aria-label"?: string;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export default function ContractWizardSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  name,
  disabled,
  mono,
  placement = "auto",
  portalZIndex = 1100,
  isEmpty = false,
  emptyMessage,
  emptyLabel,
  "aria-label": ariaLabel,
}: ContractWizardSelectProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = `${useId()}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    direction: "rtl" | "ltr";
  } | null>(null);

  const selected =
    options.find((option) => option.value === value) ?? null;

  const enabledOptions = useMemo(
    () =>
      options.filter(
        (option) => !option.disabled && Boolean(option.value),
      ),
    [options],
  );

  const normalizedQuery = normalizeSearch(query);
  const requiresSearch = enabledOptions.length > 8;
  const waitingForSearch =
    requiresSearch && normalizedQuery.length < 2;
  const hasNoOptions = isEmpty || enabledOptions.length === 0;

  const visibleOptions = useMemo(() => {
    if (waitingForSearch || hasNoOptions) return [];

    const matches = normalizedQuery
      ? enabledOptions.filter((option) =>
          normalizeSearch(option.label).includes(normalizedQuery),
        )
      : enabledOptions;

    return matches.slice(0, 8);
  }, [
    enabledOptions,
    hasNoOptions,
    normalizedQuery,
    waitingForSearch,
  ]);

  const direction =
    position?.direction ??
    (typeof document !== "undefined" &&
    document.documentElement.dir === "rtl"
      ? "rtl"
      : "ltr");

  const resolvedEmptyMessage =
    emptyMessage ||
    emptyLabel ||
    options.find((option) => option.disabled)?.label ||
    (direction === "rtl"
      ? "لا توجد نتائج متاحة"
      : "No results available");

  function computePosition() {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const gap = 8;
    const estimatedHeight = Math.min(
      Math.max(112, visibleOptions.length * 44 + 16),
      280,
    );

    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    const openUpward =
      placement === "top" ||
      (placement === "auto" &&
        spaceBelow < estimatedHeight &&
        spaceAbove > spaceBelow);

    const availableHeight = openUpward ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(
      104,
      Math.min(280, availableHeight - 4),
    );
    const renderedHeight = Math.min(estimatedHeight, maxHeight);

    setPosition({
      top: openUpward
        ? Math.max(gap, rect.top - renderedHeight - 4)
        : Math.min(
            rect.bottom + 4,
            window.innerHeight - renderedHeight - gap,
          ),
      left: Math.max(
        gap,
        Math.min(
          rect.left,
          window.innerWidth - rect.width - gap,
        ),
      ),
      width: rect.width,
      maxHeight,
      direction:
        window.getComputedStyle(input).direction === "rtl"
          ? "rtl"
          : "ltr",
    });
  }

  function openList() {
    if (disabled) return;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function selectOption(option: ContractWizardSelectOption) {
    if (option.disabled || !option.value) return;
    onChange(option.value);
    closeList();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeList();
      return;
    }

    if (!open && ["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      openList();
      return;
    }

    if (!open || visibleOptions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        Math.min(index + 1, visibleOptions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(visibleOptions.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = visibleOptions[activeIndex];
      if (option) selectOption(option);
    }
  }

  useEffect(() => {
    if (!open) return;

    computePosition();

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        inputRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }

      closeList();
    }

    function handleReposition() {
      computePosition();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, query, visibleOptions.length]);

  const displayValue = open ? query : selected?.label ?? "";

  return (
    <>
      <div className={`relative ${className ?? ""}`} dir={direction}>
        <Search
          size={17}
          aria-hidden="true"
          className="pointer-events-none absolute start-4 top-1/2 z-10 -translate-y-1/2 text-[var(--nc-text-dim)]"
        />

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && visibleOptions[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            if (!open) openList();
          }}
          onClick={() => {
            if (!open) openList();
          }}
          onChange={(event) => {
            if (value) onChange("");
            setQuery(event.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] pe-11 ps-11 text-start text-sm text-[var(--nc-text-primary)] outline-none transition-colors placeholder:text-[var(--nc-text-dim)] focus:border-[var(--nc-accent-border)] focus:ring-2 focus:ring-[var(--nc-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 ${
            mono ? "font-mono" : ""
          }`}
        />

        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[var(--nc-text-dim)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {name ? <input type="hidden" name={name} value={value} /> : null}

      {open &&
        position &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            dir={position.direction}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: portalZIndex,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] py-1 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {hasNoOptions ? (
              <div className="px-4 py-5 text-center text-sm text-[var(--nc-text-secondary)]">
                {resolvedEmptyMessage}
              </div>
            ) : waitingForSearch ? (
              <div className="px-4 py-5 text-center text-sm text-[var(--nc-text-secondary)]">
                {position.direction === "rtl"
                  ? "اكتب حرفين على الأقل للبحث"
                  : "Type at least two characters to search"}
              </div>
            ) : visibleOptions.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-[var(--nc-text-secondary)]">
                {position.direction === "rtl"
                  ? "لا توجد نتائج مطابقة"
                  : "No matching results"}
              </div>
            ) : (
              visibleOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={option.value}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectOption(option);
                    }}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-start text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--nc-accent-soft)] text-[var(--nc-text-primary)]"
                        : "text-[var(--nc-text-primary)] hover:bg-[var(--nc-surface-soft)]"
                    } ${mono ? "font-mono" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>

                    {isSelected ? (
                      <Check
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 text-[var(--nc-accent)]"
                      />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
