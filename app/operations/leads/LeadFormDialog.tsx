"use client";

// Unified create/edit lead form used by the list page (create) and the
// detail page (edit). Permission gating is re-checked on the server; here
// we only shape the available options.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  createManagedLeadAction,
  updateLeadAction,
  restoreLeadAction,
  getProjectsAction,
  getAssignableUsersAction,
  type AssignableUser,
} from "@/app/actions/leads";
import { isLeadsManagerRole } from "@/lib/leads/model";
import { FieldError } from "@/components/leads/helpers";
import { localizeLeadError, type LeadsCopy } from "./leadsCopy";
import SettingsSelect from "@/components/settings/SettingsSelect";
import type { SettingsSelectOption } from "@/components/settings/SettingsSelect";

export interface LeadFormInitial {
  id?: string;
  firstName?: string;
  lastName?: string | null;
  phone?: string;
  email?: string | null;
  city?: string;
  source?: string;
  projectId?: string | null;
}

interface LeadFormDialogProps {
  mode: "create" | "edit";
  lang: "ar" | "en";
  labels: LeadsCopy;
  direction: "rtl" | "ltr";
  viewerRole: string;
  viewerUserId: string;
  initial?: LeadFormInitial;
  onClose: () => void;
  onSaved: (leadId?: string) => void;
  onRestored?: (leadId: string) => void;
}

interface ProjectOption {
  id: string;
  name: string;
  city: string;
}

export default function LeadFormDialog({
  mode,
  lang,
  labels,
  direction,
  viewerRole,
  viewerUserId,
  initial,
  onClose,
  onSaved,
  onRestored,
}: LeadFormDialogProps) {
  const isManager = isLeadsManagerRole(viewerRole);

  const [firstName, setFirstName] = useState(initial?.firstName || "");
  const [lastName, setLastName] = useState(initial?.lastName || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [city, setCity] = useState(initial?.city || "");
  const [source, setSource] = useState(initial?.source || "");
  const [projectId, setProjectId] = useState(initial?.projectId || "");
  const [assignedTo, setAssignedTo] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [formError, setFormError] = useState("");
  const [duplicateArchivedId, setDuplicateArchivedId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; phone?: string }>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [projectRows, userRows] = await Promise.all([
        getProjectsAction(),
        mode === "create" ? getAssignableUsersAction() : Promise.resolve([]),
      ]);
      if (cancelled) return;
      setProjects(projectRows as ProjectOption[]);
      setUsers(userRows);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const assigneeOptions = useMemo(() => {
    if (isManager) return users;
    return users.filter((user) => user.id === viewerUserId);
  }, [users, isManager, viewerUserId]);

  const validate = () => {
    const errors: { firstName?: string; phone?: string } = {};
    if (!firstName.trim()) errors.firstName = labels.firstNameLabel;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) errors.phone = labels.phoneLabel;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setDuplicateArchivedId(null);
    if (!validate()) return;

    try {
      setSaving(true);

      if (mode === "create") {
        const formData = new FormData();
        formData.set("firstName", firstName.trim());
        formData.set("lastName", lastName.trim());
        formData.set("phone", phone.trim());
        formData.set("email", email.trim());
        formData.set("city", city.trim());
        formData.set("source", source.trim());
        formData.set("projectId", projectId);
        formData.set("assignedTo", assignedTo);

        const result = await createManagedLeadAction(formData);
        if (!result.success) {
          if (result.code === "DUPLICATE_ARCHIVED" && result.duplicateLeadId) {
            setDuplicateArchivedId(result.duplicateLeadId);
          }
          setFormError(localizeLeadError(result, lang));
          return;
        }
        onSaved(result.leadId);
        return;
      }

      if (!initial?.id) return;
      const result = await updateLeadAction(initial.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        city: city.trim(),
        source: source.trim(),
        projectId: projectId || null,
      });
      if (!result.success) {
        setFormError(localizeLeadError(result, lang));
        return;
      }
      onSaved(initial.id);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDuplicate = async () => {
    if (!duplicateArchivedId) return;
    try {
      setRestoring(true);
      const result = await restoreLeadAction(duplicateArchivedId);
      if (!result.success) {
        setFormError(localizeLeadError(result, lang));
        return;
      }
      onRestored?.(duplicateArchivedId);
    } finally {
      setRestoring(false);
    }
  };

  const inputClass =
    "min-h-[44px] w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 text-sm font-semibold text-[var(--nc-text-primary)] outline-none transition-colors focus:border-[#D9AD55]";
  const labelClass = "mb-1.5 block text-xs font-bold text-[var(--nc-text-secondary)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-form-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        dir={direction}
        className="flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nc-border)] bg-[var(--nc-surface-solid)] text-[var(--nc-text-primary)] shadow-2xl sm:w-full"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--nc-border)] px-5 py-4">
          <h2 id="lead-form-title" className="text-base font-bold text-[var(--nc-text-primary)]">
            {mode === "create" ? labels.formTitleCreate : labels.formTitleEdit}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] text-[var(--nc-text-secondary)] transition-colors hover:text-[var(--nc-text-primary)]"
            aria-label={labels.cancel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
              <p>{formError}</p>
              {duplicateArchivedId && (
                <button
                  type="button"
                  onClick={() => void handleRestoreDuplicate()}
                  disabled={restoring}
                  className="mt-2 min-h-[36px] rounded-lg border border-[#D9AD55]/40 bg-[#D9AD55]/10 px-3 py-1.5 text-xs font-bold text-[var(--nc-text-primary)] transition-colors hover:bg-[#D9AD55]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {restoring ? labels.saving : labels.restoreAndOpen}
                </button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="lead-first-name">
                {labels.firstNameLabel} *
              </label>
              <input
                id="lead-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={inputClass}
                required
              />
              <FieldError message={fieldErrors.firstName} />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-last-name">
                {labels.lastNameLabel}
              </label>
              <input
                id="lead-last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-phone">
                {labels.phoneLabel} *
              </label>
              <input
                id="lead-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className={`${inputClass} text-left`}
                required
              />
              <FieldError message={fieldErrors.phone} />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-email">
                {labels.emailLabel}
              </label>
              <input
                id="lead-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${inputClass} text-left`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-city">
                {labels.city}
              </label>
              <input
                id="lead-city"
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-source">
                {labels.sourceLabel}
              </label>
              <input
                id="lead-source"
                type="text"
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lead-project">
                {labels.projectLabel}
              </label>
              <SettingsSelect
                value={projectId}
                onChange={setProjectId}
                options={[
                  { value: "", label: labels.noProject },
                  ...projects.map((p): SettingsSelectOption => ({ value: p.id, label: p.name })),
                ]}
                className="min-h-[44px] [&>button]:min-h-[44px]"
              />
            </div>
            {mode === "create" && (
              <div>
                <label className={labelClass} htmlFor="lead-assignee">
                  {labels.assigneeLabel}
                </label>
                <SettingsSelect
                  value={assignedTo}
                  onChange={setAssignedTo}
                  options={[
                    { value: "", label: labels.unassigned },
                    ...assigneeOptions.map((u): SettingsSelectOption => ({ value: u.id, label: u.name })),
                  ]}
                  className="min-h-[44px] [&>button]:min-h-[44px]"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--nc-border)] bg-[var(--nc-surface-solid)] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="nc-btn-ghost min-h-[42px] rounded-xl px-4 py-2 text-sm font-bold"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] rounded-xl bg-[#D9AD55] px-5 py-2 text-sm font-bold text-[#07182D] transition-colors hover:bg-[#EDC66D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </form>
    </div>
  );
}
