"use server";

import { revalidatePath } from "next/cache";

import { assertServerActionRole, TENANT_ROLES } from "@/lib/api-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { runWithTenantContext } from "@/lib/tenant-context";

const HELPDESK_WRITE_ROLES = [
  "ADMIN",
  "SALES_MANAGER",
  "SALES_EMPLOYEE",
  "MARKETING",
] as const;

type TicketStatus = "OPEN" | "CLOSED";

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function serializeTicket(ticket: {
  id: string;
  title: string;
  description: string;
  status: string;
  aiResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    aiResponse: ticket.aiResponse,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

async function requireHelpdeskSession(allowedRoles: readonly string[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  return await assertServerActionRole(session, allowedRoles);
}

export async function getTicketsAction() {
  try {
    const session = await requireHelpdeskSession(TENANT_ROLES);

    return await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      async () => {
        const tickets = await prisma.ticket.findMany({
          where: { tenantId: session.tenantId },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 200,
        });

        return {
          success: true as const,
          data: tickets.map(serializeTicket),
        };
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "HELPDESK_LOAD_FAILED";
    console.error("[Helpdesk] getTicketsAction failed:", message);
    return {
      success: false as const,
      data: [],
      error: message === "UNAUTHORIZED" || message === "FORBIDDEN"
        ? message
        : "تعذر تحميل تذاكر الدعم.",
    };
  }
}

export async function createTicketAction(formData: FormData) {
  try {
    const session = await requireHelpdeskSession(HELPDESK_WRITE_ROLES);
    const title = cleanText(formData.get("title"), 160);
    const description = cleanText(formData.get("description"), 5000);

    if (title.length < 3 || description.length < 5) {
      throw new Error("عنوان التذكرة وتفاصيلها مطلوبة.");
    }

    return await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      async () => {
        const ticket = await prisma.ticket.create({
          data: {
            tenantId: session.tenantId,
            title,
            description,
            status: "OPEN",
            aiResponse: null,
          },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: "TICKET_CREATED",
          tableName: "tickets",
          recordId: ticket.id,
          details: JSON.stringify({ title }),
        });

        revalidatePath("/operations/helpdesk");
        return {
          success: true as const,
          ticket: serializeTicket(ticket),
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "تعذر إنشاء التذكرة.",
    };
  }
}

async function updateTicketStatusAction(
  ticketId: string,
  status: TicketStatus,
) {
  try {
    const session = await requireHelpdeskSession(HELPDESK_WRITE_ROLES);
    const normalizedTicketId = String(ticketId || "").trim();

    if (!normalizedTicketId) {
      throw new Error("معرف التذكرة غير صالح.");
    }

    return await runWithTenantContext(
      { tenantId: session.tenantId, userId: session.userId },
      async () => {
        const ticket = await prisma.ticket.update({
          where: {
            id: normalizedTicketId,
            tenantId: session.tenantId,
          },
          data: { status },
        });

        await writeAuditLog({
          tenantId: session.tenantId,
          userId: session.userId,
          action: status === "CLOSED" ? "TICKET_CLOSED" : "TICKET_REOPENED",
          tableName: "tickets",
          recordId: ticket.id,
        });

        revalidatePath("/operations/helpdesk");
        return {
          success: true as const,
          ticket: serializeTicket(ticket),
        };
      },
    );
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "تعذر تحديث حالة التذكرة.",
    };
  }
}

export async function closeTicketAction(ticketId: string) {
  return await updateTicketStatusAction(ticketId, "CLOSED");
}

export async function reopenTicketAction(ticketId: string) {
  return await updateTicketStatusAction(ticketId, "OPEN");
}
