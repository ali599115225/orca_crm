"use client";

import Link from "next/link";
import { Archive, ChevronLeft, ChevronRight, Paperclip, Plus, Send } from "lucide-react";

import styles from "./UnifiedOperationsWorkspace.module.css";
import type {
  UnifiedOperationsWorkspaceProps,
  WorkspaceBadge,
  WorkspaceLanguage,
  OperationsModule,
} from "./types";

const MODULE_LINKS: Array<{ module: OperationsModule; ar: string; en: string; href: string }> = [
  { module: "whatsapp", ar: "واتساب", en: "WhatsApp", href: "/operations/whatsapp" },
  { module: "email", ar: "البريد الإلكتروني", en: "Email", href: "/operations/email" },
  { module: "tasks", ar: "المهام والتذكيرات", en: "Tasks & reminders", href: "/operations/tasks" },
  { module: "helpdesk", ar: "مركز الدعم", en: "Support Center", href: "/operations/helpdesk" },
];

function text(language: WorkspaceLanguage, ar: string, en: string) {
  return language === "AR" ? ar : en;
}

function pageLabel(language: WorkspaceLanguage, page: number, totalPages: number) {
  return language === "AR" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`;
}

function badgeClass(badge: WorkspaceBadge) {
  if (badge.tone === "success") return `${styles.badge} ${styles.badgeSuccess}`;
  if (badge.tone === "warning") return `${styles.badge} ${styles.badgeWarning}`;
  if (badge.tone === "danger") return `${styles.badge} ${styles.badgeDanger}`;
  return `${styles.badge} ${styles.badgeNeutral}`;
}

function buttonTone(tone?: "secondary" | "danger") {
  return `${styles.button} ${tone === "danger" ? styles.dangerButton : styles.secondaryButton}`;
}

export default function UnifiedOperationsWorkspace({
  module,
  language,
  title,
  description,
  kpis,
  listTitle,
  listSubtitle,
  newLabel,
  onNew,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  filterValue,
  filterLabel,
  filterOptions,
  onFilterChange,
  items,
  pagination,
  detail,
  emptyDetailTitle,
  emptyDetailDescription,
  loading = false,
  loadingLabel,
  errorMessage,
  retryLabel,
  onRetry,
}: UnifiedOperationsWorkspaceProps) {
  const dir = language === "AR" ? "rtl" : "ltr";

  return (
    <section className={styles.root} dir={dir} data-module={module}>
      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div className={styles.titleBlock}>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <nav className={styles.moduleNav} aria-label={text(language, "وحدات مركز العمليات", "Operations modules")}>
            {MODULE_LINKS.map((link) => (
              <Link
                key={link.module}
                href={link.href}
                className={`${styles.moduleTab} ${module === link.module ? styles.moduleTabActive : ""}`}
                aria-current={module === link.module ? "page" : undefined}
              >
                {language === "AR" ? link.ar : link.en}
              </Link>
            ))}
          </nav>
        </header>

        <div className={styles.kpiGrid}>
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <article className={styles.kpiCard} key={kpi.label}>
                <div>
                  <div className={styles.kpiLabel}>{kpi.label}</div>
                  <div className={styles.kpiValue}>{kpi.value}</div>
                </div>
                <div className={styles.kpiIcon} aria-hidden="true">
                  <Icon size={21} />
                </div>
              </article>
            );
          })}
        </div>

        <div className={styles.workspace}>
          <section className={styles.listPanel} aria-label={listTitle} dir={dir}>
            <div className={styles.panelHead}>
              <div>
                <h2>{listTitle}</h2>
                <small>{listSubtitle}</small>
              </div>
              <button
                type="button"
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={onNew}
                disabled={loading || Boolean(errorMessage)}
              >
                <Plus size={17} />
                <span>{newLabel}</span>
              </button>
            </div>

            <div className={styles.toolbar}>
              <input
                className={styles.searchBox}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                disabled={loading || Boolean(errorMessage)}
              />
              <label className="sr-only" htmlFor={`${module}-filter`}>
                {filterLabel}
              </label>
              <select
                id={`${module}-filter`}
                className={styles.filterSelect}
                value={filterValue}
                onChange={(event) => onFilterChange(event.target.value)}
                aria-label={filterLabel}
                disabled={loading || Boolean(errorMessage)}
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.list} role="listbox" tabIndex={0} aria-label={listTitle}>
              {loading ? (
                <div className={styles.loadingState} role="status" aria-live="polite">
                  <span className={styles.stateSpinner} aria-hidden="true" />
                  <p>{loadingLabel || text(language, "جاري تحميل البيانات...", "Loading data...")}</p>
                </div>
              ) : errorMessage ? (
                <div className={styles.errorState} role="alert">
                  <div>
                    <h3>{text(language, "تعذر تحميل البيانات", "Unable to load data")}</h3>
                    <p>{errorMessage}</p>
                    {onRetry ? (
                      <button
                        type="button"
                        className={`${styles.button} ${styles.secondaryButton}`}
                        onClick={onRetry}
                      >
                        {retryLabel || text(language, "إعادة المحاولة", "Retry")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className={styles.emptyState}>
                  <div>
                    <h3>{text(language, "لا توجد نتائج", "No results")}</h3>
                    <p>{text(language, "غيّر البحث أو عامل التصفية.", "Change the search or filter.")}</p>
                  </div>
                </div>
              ) : items.map((item) => (
                <div
                  key={item.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={item.selected}
                  className={`${styles.listItem} ${item.selected ? styles.listItemActive : ""}`}
                  onClick={item.onSelect}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      item.onSelect();
                    }
                  }}
                >
                  <span className={styles.avatar} aria-hidden="true">
                    {item.avatar}
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemRow}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      <time className={styles.itemTime} dir="ltr">{item.timestamp}</time>
                    </span>
                    <span className={styles.itemSnippet}>{item.snippet}</span>
                    <span className={styles.itemMeta}>
                      <span className={badgeClass(item.badge)}>{item.badge.label}</span>
                      {item.actions.length > 0 ? <span className={styles.itemActions}>
                        {item.actions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.label}
                              type="button"
                              aria-label={action.label}
                              title={action.label}
                              className={styles.miniButton}
                              disabled={action.disabled}
                              onClick={(event) => {
                                event.stopPropagation();
                                action.onClick();
                              }}
                            >
                              <Icon size={15} />
                            </button>
                          );
                        })}
                      </span> : null}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <footer className={styles.pagination}>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={pagination.onPrevious}
                disabled={pagination.page <= 1}
              >
                {dir === "rtl" ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                <span>{text(language, "السابق", "Previous")}</span>
              </button>
              <span className={styles.paginationText}>{pageLabel(language, pagination.page, pagination.totalPages)}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={pagination.onNext}
                disabled={pagination.page >= pagination.totalPages}
              >
                <span>{text(language, "التالي", "Next")}</span>
                {dir === "rtl" ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
              </button>
            </footer>
          </section>

          <section className={styles.detailPanel} aria-label={text(language, "تفاصيل العنصر", "Item details")} dir={dir}>
            {detail ? (
              <>
                <div className={styles.detailTop}>
                  <div className={styles.detailContact}>
                    <div className={styles.avatar} aria-hidden="true">
                      {detail.avatar}
                    </div>
                    <div>
                      <h3>{detail.title}</h3>
                      <p className={styles.detailMeta}>{detail.meta}</p>
                    </div>
                  </div>
                  {detail.actions.length > 0 ? <div className={styles.detailActions}>
                    {detail.actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          type="button"
                          className={buttonTone(action.tone)}
                          onClick={action.onClick}
                          disabled={action.disabled}
                          aria-label={action.label}
                        >
                          <Icon size={17} />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div> : null}
                </div>

                <div className={styles.detailBody}>
                  <div className={styles.contextCard}>
                    {detail.context.map((item) => (
                      <div key={item.label} className={styles.contextCell}>
                        <b>{item.label}</b>
                        <span>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.timeline} tabIndex={0} aria-label={text(language, "سجل المحادثة والتفاصيل", "Conversation and details timeline")}>
                    {detail.timeline.length === 0 ? (
                      <div className={styles.emptyState}>
                        <div>
                          <h3>{detail.emptyTitle}</h3>
                          <p>{detail.emptyDescription}</p>
                        </div>
                      </div>
                    ) : (
                      detail.timeline.map((entry) => (
                        <div
                          key={entry.id}
                          className={`${styles.bubble} ${
                            entry.side === "out"
                              ? styles.bubbleOut
                              : entry.side === "neutral"
                                ? styles.bubbleNeutral
                                : styles.bubbleIn
                          }`}
                        >
                          {entry.body}
                          {entry.time ? <time dir="ltr">{entry.time}</time> : null}
                        </div>
                      ))
                    )}
                  </div>

                  {detail.composer ? (
                    <div className={styles.composer}>
                      {detail.composer.mode === "message" && detail.composer.onAttach ? (
                        <button
                          type="button"
                          className={styles.miniButton}
                          onClick={detail.composer.onAttach}
                          aria-label={detail.composer.attachLabel || text(language, "إرفاق ملف", "Attach file")}
                          title={detail.composer.attachLabel || text(language, "إرفاق ملف", "Attach file")}
                        >
                          <Paperclip size={16} />
                        </button>
                      ) : null}

                      <div className={styles.composerMain}>
                        {detail.composer.extra ? <div className={styles.composerExtra}>{detail.composer.extra}</div> : null}
                        {detail.composer.fields && detail.composer.fields.length > 0 ? (
                          <div className={styles.composerExtra}>
                            {detail.composer.fields.map((field) => (
                              <label key={field.id}>
                                <span className={styles.composerFieldLabel}>{field.label}</span>
                                {field.type === "select" ? (
                                  <select
                                    className={styles.composerInput}
                                    value={field.value}
                                    required={field.required}
                                    aria-label={field.label}
                                    onChange={(event) => field.onChange(event.target.value)}
                                  >
                                    <option value="">{field.placeholder}</option>
                                    {(field.options || []).map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className={styles.composerInput}
                                    type={field.type || "text"}
                                    value={field.value}
                                    placeholder={field.placeholder}
                                    required={field.required}
                                    dir={field.dir}
                                    aria-label={field.label}
                                    onChange={(event) => field.onChange(event.target.value)}
                                  />
                                )}
                              </label>
                            ))}
                          </div>
                        ) : null}
                        {detail.composer.bodyLabel ? (
                          <span className={styles.composerFieldLabel}>{detail.composer.bodyLabel}</span>
                        ) : null}
                        <textarea
                          className={styles.composerTextarea}
                          value={detail.composer.value}
                          onChange={(event) => detail.composer?.onChange(event.target.value)}
                          placeholder={detail.composer.placeholder}
                          aria-label={detail.composer.bodyLabel || detail.composer.placeholder}
                          rows={1}
                        />
                      </div>

                      <button
                        type="button"
                        className={`${styles.button} ${styles.accentButton}`}
                        onClick={detail.composer.onSend}
                        disabled={detail.composer.disabled}
                      >
                        {detail.composer.mode === "message" ? <Send size={17} /> : <Archive size={17} />}
                        <span>{detail.composer.sendLabel}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <div>
                  <h3>{emptyDetailTitle}</h3>
                  <p>{emptyDetailDescription}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
