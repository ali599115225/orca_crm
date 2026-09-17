"use client";

// Unified create/edit lead form used by the list page (create) and the
// detail page (edit). Permission gating is re-checked on the server; here
// we only shape the available options.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createManagedLeadAction,
  updateLeadAction,
  restoreLeadAction,
  getProjectsAction,
  getAssignableUsersAction,
  type AssignableUser,
} from "@/app/actions/leads";
import { isLeadsManagerRole } from "@/lib/leads/model";
import { localizeLeadError, type LeadsCopy } from "@/features/leads/copy/leadsCopy";
import SettingsSelect from "@/components/settings/SettingsSelect";
import type { SettingsSelectOption } from "@/components/settings/SettingsSelect";
import {
  OperationsDialog,
  OperationsFormField,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

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
      const nextProjects = projectRows as ProjectOption[];
      setProjects((current) => (nextProjects.length > 0 ? nextProjects : current));
      setUsers((current) => (userRows.length > 0 ? userRows : current));
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

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

  return (
    <OperationsDialog
      open
      onClose={onClose}
      title={mode === "create" ? labels.formTitleCreate : labels.formTitleEdit}
      description={mode === "create" ? labels.subtitle : labels.formTitleEdit}
      closeLabel={labels.cancel}
      closeDisabled={saving || restoring}
      dir={direction}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving || restoring} className={operationsVisual.secondaryButton}>
            {labels.cancel}
          </button>
          <button form="lead-form-contract" type="submit" disabled={saving || restoring} className={operationsVisual.primaryButton}>
            {saving ? labels.saving : labels.save}
          </button>
        </>
      }
    >
      <form id="lead-form-contract" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError ? (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">
            <p>{formError}</p>
            {duplicateArchivedId ? (
              <button type="button" onClick={() => void handleRestoreDuplicate()} disabled={restoring} className={`${operationsVisual.secondaryButton} mt-2`}>
                {restoring ? labels.saving : labels.restoreAndOpen}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <OperationsFormField label={labels.firstNameLabel} error={fieldErrors.firstName}>
            <OperationsTextField id="lead-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus />
          </OperationsFormField>
          <OperationsFormField label={labels.lastNameLabel}>
            <OperationsTextField id="lead-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </OperationsFormField>
          <OperationsFormField label={labels.phoneLabel} error={fieldErrors.phone}>
            <OperationsTextField id="lead-phone" type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} className="text-left" />
          </OperationsFormField>
          <OperationsFormField label={labels.emailLabel}>
            <OperationsTextField id="lead-email" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className="text-left" />
          </OperationsFormField>
          <OperationsFormField label={labels.city}>
            <OperationsTextField id="lead-city" value={city} onChange={(event) => setCity(event.target.value)} />
          </OperationsFormField>
          <OperationsFormField label={labels.sourceLabel}>
            <OperationsTextField id="lead-source" value={source} onChange={(event) => setSource(event.target.value)} />
          </OperationsFormField>
          <OperationsFormField label={labels.projectLabel}>
            <SettingsSelect value={projectId} onChange={setProjectId} options={[{ value: "", label: labels.noProject }, ...projects.map((p): SettingsSelectOption => ({ value: p.id, label: p.name }))]} className="w-full" />
          </OperationsFormField>
          {mode === "create" ? (
            <OperationsFormField label={labels.assigneeLabel}>
              <SettingsSelect value={assignedTo} onChange={setAssignedTo} options={[{ value: "", label: labels.unassigned }, ...assigneeOptions.map((u): SettingsSelectOption => ({ value: u.id, label: u.name }))]} className="w-full" />
            </OperationsFormField>
          ) : null}
        </div>
      </form>
    </OperationsDialog>
  );
}
