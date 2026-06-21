"use client";

import type { Copy } from "../types";
import { EmptyState } from "../helpers";

interface LeadTasksPanelProps {
  labels: Copy;
}

export default function LeadTasksPanel({ labels }: LeadTasksPanelProps) {
  return <EmptyState message={labels.noTasks} />;
}
