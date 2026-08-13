"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "../helpers";

interface LeadContactsPanelProps {
  labels?: { noContacts: string };
  leadId: string;
}

type ContactRow = {
  id: string;
  name: string;
  phone: string;
};

export default function LeadContactsPanel({
  labels = { noContacts: "No contacts" },
  leadId,
}: LeadContactsPanelProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const loadContacts = useCallback(async () => {
    const response = await fetch(
      `/api/v1/contacts?leadId=${encodeURIComponent(leadId)}`,
      { credentials: "include", cache: "no-store" },
    );
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to load contacts.");
    }
    setContacts(payload.data || []);
  }, [leadId]);

  useEffect(() => {
    void loadContacts().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Load failed.");
    });
  }, [loadContacts]);

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/contacts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, name, phone }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload.error || "Failed to create contact.");
      return;
    }
    setName("");
    setPhone("");
    await loadContacts();
  }

  return (
    <section className="space-y-3">
      <form
        onSubmit={(event) => void createContact(event)}
        className="flex flex-wrap gap-2"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder={labels.noContacts}
          className="h-11 min-w-[140px] flex-1 rounded-xl border px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="h-11 min-w-[140px] flex-1 rounded-xl border px-3 text-sm"
        />
        <button type="submit" className="nc-btn-primary h-11 rounded-xl px-4 text-xs font-black">
          +
        </button>
      </form>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      {contacts.length === 0 ? (
        <EmptyState message={labels.noContacts} />
      ) : (
        <ul className="space-y-1 text-sm">
          {contacts.map((contact) => (
            <li key={contact.id}>
              {contact.name} · {contact.phone}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
