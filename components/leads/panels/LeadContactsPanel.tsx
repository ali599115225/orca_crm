"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import {
  OperationsDialog,
  OperationsEmptyState,
  OperationsFormField,
  OperationsMasterList,
  OperationsPanel,
  OperationsPanelHeader,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

interface LeadContactsPanelProps {
  labels?: { noContacts: string };
  leadId: string;
  locale?: "ar" | "en";
}

type ContactRow = {
  id: string;
  name: string;
  phone: string;
};

export default function LeadContactsPanel({
  labels = { noContacts: "No contacts" },
  leadId,
  locale = "en",
}: LeadContactsPanelProps) {
  const isArabic = locale === "ar";
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const copy = isArabic
    ? {
        title: "جهات الاتصال",
        description: "الأشخاص المرتبطون مباشرة بهذا العميل.",
        add: "إضافة جهة اتصال",
        name: "الاسم",
        phone: "رقم الجوال",
        cancel: "إلغاء",
        save: "حفظ جهة الاتصال",
        saving: "جارٍ الحفظ...",
        loadError: "تعذر تحميل جهات الاتصال.",
        createError: "تعذر إنشاء جهة الاتصال.",
      }
    : {
        title: "Contacts",
        description: "People directly associated with this lead.",
        add: "Add contact",
        name: "Name",
        phone: "Mobile number",
        cancel: "Cancel",
        save: "Save contact",
        saving: "Saving...",
        loadError: "Unable to load contacts.",
        createError: "Unable to create contact.",
      };

  const loadContacts = useCallback(async () => {
    const response = await fetch(
      `/api/v1/contacts?leadId=${encodeURIComponent(leadId)}`,
      { credentials: "include", cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || copy.loadError);
    }
    setContacts(payload.data || []);
  }, [leadId, copy.loadError]);

  useEffect(() => {
    void loadContacts().catch((cause) => {
      setError(cause instanceof Error ? cause.message : copy.loadError);
    });
  }, [loadContacts, copy.loadError]);

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
    setName("");
    setPhone("");
    setError("");
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/v1/contacts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, name, phone }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload.error || copy.createError);
        return;
      }
      setName("");
      setPhone("");
      setDialogOpen(false);
      await loadContacts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.createError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <OperationsPanel className="overflow-hidden" data-lead-contacts-panel>
        <OperationsPanelHeader
          title={copy.title}
          description={copy.description}
          icon={UsersRound}
          meta={<span className={operationsVisual.counterBadge}>{contacts.length}</span>}
          actions={
            <button
              type="button"
              onClick={() => {
                setError("");
                setDialogOpen(true);
              }}
              className={operationsVisual.secondaryButton}
            >
              <Plus aria-hidden="true" />
              {copy.add}
            </button>
          }
        />

        {error && !dialogOpen ? (
          <div role="alert" className="border-b border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
            {error}
          </div>
        ) : null}

        {contacts.length === 0 ? (
          <div className="p-3">
            <OperationsEmptyState>{labels.noContacts}</OperationsEmptyState>
          </div>
        ) : (
          <OperationsMasterList className="orca-operations-flow-region">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2.5"
              >
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-[var(--nc-text-primary)]">{contact.name}</strong>
                  <span dir="ltr" className="mt-1 block truncate text-[10px] text-[var(--nc-text-dim)]">{contact.phone}</span>
                </span>
                <span className="rounded-full border border-[var(--nc-border)] bg-[var(--nc-surface-soft)] px-2 py-1 text-[10px] font-bold text-[var(--nc-text-secondary)]">
                  {isArabic ? "جهة اتصال" : "Contact"}
                </span>
              </div>
            ))}
          </OperationsMasterList>
        )}
      </OperationsPanel>

      <OperationsDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={copy.add}
        description={isArabic ? "أدخل بيانات جهة الاتصال المرتبطة بهذا العميل." : "Enter the contact details associated with this lead."}
        closeLabel={copy.cancel}
        closeDisabled={saving}
        dir={isArabic ? "rtl" : "ltr"}
        footer={
          <>
            <button type="button" onClick={closeDialog} disabled={saving} className={operationsVisual.secondaryButton}>
              {copy.cancel}
            </button>
            <button type="submit" form="lead-contact-create-form" disabled={saving || !name.trim() || !phone.trim()} className={operationsVisual.primaryButton}>
              {saving ? copy.saving : copy.save}
            </button>
          </>
        }
      >
        <form id="lead-contact-create-form" onSubmit={(event) => void createContact(event)} className="grid gap-4 sm:grid-cols-2">
          <OperationsFormField label={copy.name}>
            <OperationsTextField value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
          </OperationsFormField>
          <OperationsFormField label={copy.phone}>
            <OperationsTextField value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" dir="ltr" autoComplete="tel" />
          </OperationsFormField>
          {error ? (
            <p role="alert" className="sm:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">
              {error}
            </p>
          ) : null}
        </form>
      </OperationsDialog>
    </>
  );
}
