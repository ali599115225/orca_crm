import "server-only";

import { rawPrisma } from "@/lib/prisma";

export type OperationalNotificationSource =
  | "WHATSAPP"
  | "EMAIL"
  | "SUPPORT"
  | "TASKS";

export interface OperationalNotification {
  id: string;
  source: OperationalNotificationSource;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  href: string;
  createdAt: string;
  read: boolean;
}

type NotificationSession = {
  tenantId: string;
  userId: string;
  role: string;
};

type SupportTicketSnapshot = {
  id: string;
  title: string | null;
  status: string | null;
};

const MANAGER_ROLES = new Set(["ADMIN", "SALES_MANAGER"]);
const RETENTION_DAYS = 30;
const DUE_WINDOW_HOURS = 48;
const MAX_SOURCE_ROWS = 40;

function cleanText(value: unknown, fallback: string, maxLength = 180) {
  const cleaned = String(value || "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
    .replace(/\b(?:WHATSAPP|META|GRAPH|JWT|TOKEN|SECRET)_[A-Z0-9_]+\b/g, "")
    .replace(/\b(?:chat|contact|lead|task|user|id)_[a-z0-9_-]+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return cleaned || fallback;
}

function preview(value: unknown, fallback: string) {
  return cleanText(value, fallback, 96);
}

function ticketReference(value: unknown) {
  const compact = String(value || "").replace(/[^a-z0-9]/gi, "");
  return compact ? `#${compact.slice(-6).toUpperCase()}` : "#------";
}

function canSeeAssignedRecord(
  targetUserId: unknown,
  session: NotificationSession,
) {
  const target = String(targetUserId || "").trim();
  if (target) return target === session.userId;
  return MANAGER_ROLES.has(session.role);
}

function parseDetails(value: unknown): Record<string, unknown> {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function isOperationalNotificationId(value: string) {
  return /^(?:wa|email-in|email-fail|ticket|ticket-reply|task-new|task-due):[a-z0-9-]{6,80}$/i.test(
    String(value || "").trim(),
  );
}

export async function listOperationalNotifications(
  session: NotificationSession,
  limit = 30,
): Promise<OperationalNotification[]> {
  const db = rawPrisma as any;
  const now = new Date();
  const since = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const dueUntil = new Date(
    now.getTime() + DUE_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const [whatsAppMessages, emailMessages, ticketEvents, assignedTasks] =
    await Promise.all([
      db.whatsAppMessage.findMany({
        where: {
          tenantId: session.tenantId,
          direction: "inbound",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_SOURCE_ROWS,
        select: {
          id: true,
          phone: true,
          phoneHash: true,
          messageText: true,
          createdAt: true,
        },
      }),
      db.emailMessage.findMany({
        where: {
          tenantId: session.tenantId,
          createdAt: { gte: since },
          OR: [
            { direction: "inbound" },
            { status: { in: ["FAILED", "BOUNCED", "REJECTED"] } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: MAX_SOURCE_ROWS,
        select: {
          id: true,
          direction: true,
          status: true,
          from: true,
          to: true,
          subject: true,
          errorMessage: true,
          createdAt: true,
          userId: true,
          contact: { select: { name: true } },
          lead: {
            select: {
              assignedTo: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      db.auditLog.findMany({
        where: {
          tenantId: session.tenantId,
          tableName: "tickets",
          action: { in: ["TICKET_CREATED", "TICKET_REPLIED"] },
          createdAt: { gte: since },
          NOT: { userId: session.userId },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_SOURCE_ROWS,
        select: {
          id: true,
          userId: true,
          action: true,
          recordId: true,
          details: true,
          createdAt: true,
        },
      }),
      db.task.findMany({
        where: {
          tenantId: session.tenantId,
          assignedTo: session.userId,
          OR: [
            { createdAt: { gte: since } },
            {
              status: "PENDING",
              dueDate: { gte: now, lte: dueUntil },
            },
          ],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: MAX_SOURCE_ROWS,
        select: {
          id: true,
          title: true,
          dueDate: true,
          createdAt: true,
          createdBy: true,
          status: true,
          lead: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

  const phoneHashes = whatsAppMessages
    .map((row: any) => String(row.phoneHash || "").trim())
    .filter(Boolean);
  const phones = whatsAppMessages
    .map((row: any) => String(row.phone || "").trim())
    .filter(Boolean);

  const whatsAppContacts =
    phoneHashes.length || phones.length
      ? await db.whatsAppContact.findMany({
          where: {
            tenantId: session.tenantId,
            OR: [
              ...(phoneHashes.length ? [{ phoneHash: { in: phoneHashes } }] : []),
              ...(phones.length ? [{ phone: { in: phones } }] : []),
            ],
          },
          select: {
            phone: true,
            phoneHash: true,
            name: true,
            assignedUserId: true,
            lead: {
              select: {
                assignedTo: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        })
      : [];

  const contactByKey = new Map<string, any>();
  for (const contact of whatsAppContacts) {
    if (contact.phoneHash) contactByKey.set(`hash:${contact.phoneHash}`, contact);
    if (contact.phone) contactByKey.set(`phone:${contact.phone}`, contact);
  }

  const ticketIds = [
    ...new Set(
      ticketEvents
        .map((event: any) => String(event.recordId || "").trim())
        .filter(Boolean),
    ),
  ];
  const tickets = ticketIds.length
    ? await db.ticket.findMany({
        where: {
          tenantId: session.tenantId,
          id: { in: ticketIds },
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      })
    : [];
  const ticketById = new Map<string, SupportTicketSnapshot>(
    tickets.map(
      (ticket: any): [string, SupportTicketSnapshot] => [
        String(ticket.id),
        {
          id: String(ticket.id),
          title: ticket.title == null ? null : String(ticket.title),
          status: ticket.status == null ? null : String(ticket.status),
        },
      ],
    ),
  );

  const notifications: OperationalNotification[] = [];

  for (const message of whatsAppMessages) {
    const contact =
      contactByKey.get(`hash:${String(message.phoneHash || "")}`) ||
      contactByKey.get(`phone:${String(message.phone || "")}`) ||
      null;
    const targetUserId =
      contact?.assignedUserId || contact?.lead?.assignedTo || null;

    if (!canSeeAssignedRecord(targetUserId, session)) continue;

    const fallbackName = String(message.phone || "").replace(/\D/g, "").slice(-4);
    const contactName = cleanText(
      contact?.name ||
        [contact?.lead?.firstName, contact?.lead?.lastName]
          .filter(Boolean)
          .join(" "),
      fallbackName ? `رقم ينتهي بـ ${fallbackName}` : "عميل واتساب",
      72,
    );
    const body = preview(message.messageText, "رسالة واتساب جديدة");

    notifications.push({
      id: `wa:${message.id}`,
      source: "WHATSAPP",
      titleAr: "رسالة واتساب جديدة",
      titleEn: "New WhatsApp message",
      messageAr: `${contactName}: ${body}`,
      messageEn: `${contactName}: ${body}`,
      href: "/operations/whatsapp",
      createdAt: new Date(message.createdAt).toISOString(),
      read: false,
    });
  }

  for (const email of emailMessages) {
    const targetUserId = email.userId || email.lead?.assignedTo || null;
    if (!canSeeAssignedRecord(targetUserId, session)) continue;

    const isInbound = String(email.direction).toLowerCase() === "inbound";
    const leadName = [email.lead?.firstName, email.lead?.lastName]
      .filter(Boolean)
      .join(" ");
    const sender = cleanText(
      email.contact?.name || leadName || email.from,
      "مرسل البريد",
      72,
    );
    const subject = preview(email.subject, "بلا موضوع");

    notifications.push({
      id: `${isInbound ? "email-in" : "email-fail"}:${email.id}`,
      source: "EMAIL",
      titleAr: isInbound ? "رسالة بريد جديدة" : "تعذر إرسال البريد",
      titleEn: isInbound ? "New email message" : "Email delivery failed",
      messageAr: isInbound
        ? `${sender}: ${subject}`
        : `${subject}: ${preview(email.errorMessage, "راجع إعدادات مزود البريد")}`,
      messageEn: isInbound
        ? `${sender}: ${subject}`
        : `${subject}: ${preview(email.errorMessage, "Check the email provider settings")}`,
      href: "/operations/email",
      createdAt: new Date(email.createdAt).toISOString(),
      read: false,
    });
  }

  for (const event of ticketEvents) {
    const ticket = ticketById.get(String(event.recordId));
    if (!ticket) continue;

    const details = parseDetails(event.details);
    const isReply = event.action === "TICKET_REPLIED";
    const reference = ticketReference(ticket.id);
    const title = cleanText(ticket.title, "تذكرة دعم", 96);
    const replyPreview = preview(details.message, "رد جديد على التذكرة");

    notifications.push({
      id: `${isReply ? "ticket-reply" : "ticket"}:${event.id}`,
      source: "SUPPORT",
      titleAr: isReply ? "رد جديد في مركز الدعم" : "تذكرة دعم جديدة",
      titleEn: isReply ? "New support reply" : "New support ticket",
      messageAr: isReply
        ? `${reference} · ${title}: ${replyPreview}`
        : `${reference} · ${title}`,
      messageEn: isReply
        ? `${reference} · ${title}: ${replyPreview}`
        : `${reference} · ${title}`,
      href: "/operations/helpdesk",
      createdAt: new Date(event.createdAt).toISOString(),
      read: false,
    });
  }

  for (const task of assignedTasks) {
    const customerName = cleanText(
      [task.lead?.firstName, task.lead?.lastName].filter(Boolean).join(" "),
      "عميل",
      72,
    );
    const taskTitle = cleanText(task.title, "مهمة متابعة", 96);
    const createdAt = new Date(task.createdAt);
    const dueDate = new Date(task.dueDate);

    if (createdAt >= since && task.createdBy !== session.userId) {
      notifications.push({
        id: `task-new:${task.id}`,
        source: "TASKS",
        titleAr: "مهمة جديدة مسندة إليك",
        titleEn: "New task assigned to you",
        messageAr: `${taskTitle} · ${customerName}`,
        messageEn: `${taskTitle} · ${customerName}`,
        href: "/operations/tasks",
        createdAt: createdAt.toISOString(),
        read: false,
      });
    }

    if (
      task.status === "PENDING" &&
      dueDate >= now &&
      dueDate <= dueUntil
    ) {
      notifications.push({
        id: `task-due:${task.id}`,
        source: "TASKS",
        titleAr: "موعد مهمة قريب",
        titleEn: "Task due soon",
        messageAr: `${taskTitle} · ${customerName}`,
        messageEn: `${taskTitle} · ${customerName}`,
        href: "/operations/tasks",
        createdAt: dueDate.toISOString(),
        read: false,
      });
    }
  }

  notifications.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
      new Date(left.createdAt).getTime(),
  );

  const limited = notifications.slice(0, Math.max(1, Math.min(limit, 100)));
  const notificationIds = limited.map((notification) => notification.id);

  const readRows = notificationIds.length
    ? await db.auditLog.findMany({
        where: {
          tenantId: session.tenantId,
          userId: session.userId,
          tableName: "notifications",
          action: "NOTIFICATION_READ",
          recordId: { in: notificationIds },
        },
        select: { recordId: true },
      })
    : [];

  const readIds = new Set(readRows.map((row: any) => String(row.recordId)));

  return limited.map((notification) => ({
    ...notification,
    read: readIds.has(notification.id),
  }));
}

export async function markOperationalNotificationRead(
  session: NotificationSession,
  notificationId: string,
) {
  const id = String(notificationId || "").trim();
  if (!isOperationalNotificationId(id)) {
    throw new Error("INVALID_NOTIFICATION");
  }

  const visible = await listOperationalNotifications(session, 100);
  if (!visible.some((notification) => notification.id === id)) {
    throw new Error("NOTIFICATION_NOT_FOUND");
  }

  const db = rawPrisma as any;
  const existing = await db.auditLog.findFirst({
    where: {
      tenantId: session.tenantId,
      userId: session.userId,
      tableName: "notifications",
      action: "NOTIFICATION_READ",
      recordId: id,
    },
    select: { id: true },
  });

  if (!existing) {
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        tableName: "notifications",
        action: "NOTIFICATION_READ",
        recordId: id,
        details: JSON.stringify({ readAt: new Date().toISOString() }),
      },
    });
  }
}

export async function markAllOperationalNotificationsRead(
  session: NotificationSession,
) {
  const visible = await listOperationalNotifications(session, 100);
  const unreadIds = visible
    .filter((notification) => !notification.read)
    .map((notification) => notification.id);

  if (!unreadIds.length) return 0;

  const db = rawPrisma as any;
  await db.auditLog.createMany({
    data: unreadIds.map((id) => ({
      tenantId: session.tenantId,
      userId: session.userId,
      tableName: "notifications",
      action: "NOTIFICATION_READ",
      recordId: id,
      details: JSON.stringify({ readAt: new Date().toISOString() }),
    })),
  });

  return unreadIds.length;
}
