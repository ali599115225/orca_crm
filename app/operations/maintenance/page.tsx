"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type MaintenanceTicket = {
  id: string;
  title: string;
  status: string;
};

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const loadTickets = useCallback(async () => {
    const response = await fetch("/api/v1/maintenance", {
      credentials: "include",
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Failed to load maintenance tickets.");
    }
    setTickets(payload.tickets || []);
  }, []);

  useEffect(() => {
    void loadTickets().catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Load failed.");
    });
  }, [loadTickets]);

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/v1/maintenance", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      setError(payload.error || "Failed to create maintenance ticket.");
      return;
    }
    setTitle("");
    await loadTickets();
  }

  return (
    <main className="nc-page orca-container space-y-4 p-4">
      <h1 className="text-xl font-black">الصيانة</h1>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <form onSubmit={(event) => void createTicket(event)} className="flex gap-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="min-h-[44px] flex-1 rounded-xl border px-3"
        />
        <button type="submit" className="nc-btn-primary rounded-xl px-4 text-xs font-black">
          إنشاء
        </button>
      </form>
      <ul className="space-y-2">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            {ticket.title} · {ticket.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
