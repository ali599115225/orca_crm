"use client";

import type { Copy } from "../types";
import { EmptyState } from "../helpers";

interface LeadContactsPanelProps {
  labels: Copy;
}

export default function LeadContactsPanel({ labels }: LeadContactsPanelProps) {
  return <EmptyState message={labels.noContacts} />;
}
