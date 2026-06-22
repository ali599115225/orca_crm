export const SYNC_TOPICS = {
  DEALS: "deals",
  CONTRACTS: "contracts",
  OFFERS: "offers",
  PAYMENT_PLANS: "payment-plans",
  INSTALLMENTS: "installments",
  PAYMENTS: "payments",
  TIMELINE: "timeline",
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  TASKS: "tasks",
  REMINDERS: "reminders",
  SUPPORT: "support",
  DASHBOARD: "dashboard",
  NOTIFICATIONS: "notifications",
} as const;

export type SyncTopic = (typeof SYNC_TOPICS)[keyof typeof SYNC_TOPICS];

const ALLOWED_TOPICS = new Set<string>(Object.values(SYNC_TOPICS));

export function assertSyncTopic(topic: string): void {
  if (!ALLOWED_TOPICS.has(topic)) {
    throw new Error(`Unsupported sync topic: ${topic}`);
  }
}