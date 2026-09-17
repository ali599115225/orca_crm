"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import {
  requireWhatsAppAccess,
  type WhatsAppAccess,
  WHATSAPP_READ_ROLES,
} from "@/lib/whatsapp/access";

export interface WhatsAppCustomerDirectoryItem {
  key: string;
  leadId: string | null;
  contactId: string | null;
  name: string;
  phone: string;
  leadStatus: string | null;
  leadArchived: boolean;
  conversationStatus: "OPEN" | "ARCHIVED" | "NONE";
  assignedUserName: string | null;
}

interface WhatsAppCustomerDirectoryResult {
  success: boolean;
  customers: WhatsAppCustomerDirectoryItem[];
  error?: string;
}

async function withWhatsAppReadAccess<T>(
  operation: (access: WhatsAppAccess) => Promise<T> | T,
): Promise<T> {
  const access = await requireWhatsAppAccess(WHATSAPP_READ_ROLES);
  return runWithTenantContext(
    { tenantId: access.tenantId, userId: access.userId },
    () => operation(access),
  );
}

function normalizePhone(value: string) {
  let digits = String(value || "").replace(/[^\d]/g, "");
  while (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

function cleanName(firstName: string | null | undefined, lastName?: string | null) {
  const name = `${String(firstName || "").trim()} ${String(lastName || "").trim()}`
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

function recordKey(phone: string, fallback: string) {
  const normalized = normalizePhone(phone);
  return normalized ? `phone:${normalized}` : fallback;
}

function mergeCustomer(
  current: WhatsAppCustomerDirectoryItem | undefined,
  incoming: WhatsAppCustomerDirectoryItem,
) {
  if (!current) return incoming;

  const preferIncomingLead =
    Boolean(incoming.leadId) &&
    (!current.leadId || (current.leadArchived && !incoming.leadArchived));

  return {
    ...current,
    ...(preferIncomingLead
      ? {
          leadId: incoming.leadId,
          name: incoming.name,
          phone: incoming.phone,
          leadStatus: incoming.leadStatus,
          leadArchived: incoming.leadArchived,
        }
      : {}),
    contactId: incoming.contactId || current.contactId,
    conversationStatus:
      incoming.conversationStatus !== "NONE"
        ? incoming.conversationStatus
        : current.conversationStatus,
    assignedUserName:
      incoming.assignedUserName || current.assignedUserName || null,
  } satisfies WhatsAppCustomerDirectoryItem;
}

export async function getWhatsAppCustomerDirectoryAction(
  options: { q?: string; limit?: number } = {},
): Promise<WhatsAppCustomerDirectoryResult> {
  const query = String(options.q || "").trim().slice(0, 120);
  const limit = Math.min(30, Math.max(5, Math.floor(options.limit || 20)));
  const tokens = query.split(/\s+/).filter(Boolean).slice(0, 4);
  const phoneQuery = normalizePhone(query);

  try {
    return await withWhatsAppReadAccess(async ({ tenantId }) => {
      const leadWhere: Prisma.LeadWhereInput = { tenantId };
      if (tokens.length > 0) {
        leadWhere.AND = tokens.map((token) => {
          const tokenDigits = normalizePhone(token);
          const OR: Prisma.LeadWhereInput[] = [
            { firstName: { contains: token, mode: "insensitive" } },
            { lastName: { contains: token, mode: "insensitive" } },
          ];
          if (tokenDigits) OR.push({ phone: { contains: tokenDigits } });
          return { OR };
        });
      }

      const contactWhere: Prisma.WhatsAppContactWhereInput = { tenantId };
      if (query) {
        const OR: Prisma.WhatsAppContactWhereInput[] = [
          { name: { contains: query, mode: "insensitive" } },
        ];
        if (phoneQuery) OR.push({ phone: { contains: phoneQuery } });
        contactWhere.OR = OR;
      }

      const crmContactWhere: Prisma.ContactWhereInput = { tenantId };
      if (query) {
        const OR: Prisma.ContactWhereInput[] = [
          { name: { contains: query, mode: "insensitive" } },
        ];
        if (phoneQuery) OR.push({ phone: { contains: phoneQuery } });
        crmContactWhere.OR = OR;
      }

      const [leads, crmContacts, contacts] = await Promise.all([
        prisma.lead.findMany({
          where: leadWhere,
          orderBy: { createdAt: "desc" },
          take: Math.max(limit * 2, 30),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
            isArchived: true,
            assignedUser: { select: { name: true } },
            whatsappContact: {
              select: {
                id: true,
                archived: true,
                assignedUserName: true,
              },
            },
          },
        }),
        prisma.contact.findMany({
          where: crmContactWhere,
          orderBy: { createdAt: "desc" },
          take: Math.max(limit * 2, 30),
          select: {
            id: true,
            name: true,
            phone: true,
          },
        }),
        prisma.whatsAppContact.findMany({
          where: contactWhere,
          orderBy: { lastMessageAt: "desc" },
          take: Math.max(limit * 2, 30),
          select: {
            id: true,
            name: true,
            phone: true,
            leadId: true,
            archived: true,
            assignedUserName: true,
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
                isArchived: true,
                assignedUser: { select: { name: true } },
              },
            },
          },
        }),
      ]);

      const byIdentity = new Map<string, WhatsAppCustomerDirectoryItem>();

      for (const lead of leads) {
        const name = cleanName(lead.firstName, lead.lastName) || normalizePhone(lead.phone) || "جهة اتصال";
        const item: WhatsAppCustomerDirectoryItem = {
          key: `lead:${lead.id}`,
          leadId: lead.id,
          contactId: lead.whatsappContact?.id || null,
          name,
          phone: lead.phone,
          leadStatus: String(lead.status),
          leadArchived: lead.isArchived,
          conversationStatus: lead.whatsappContact
            ? lead.whatsappContact.archived
              ? "ARCHIVED"
              : "OPEN"
            : "NONE",
          assignedUserName:
            lead.whatsappContact?.assignedUserName || lead.assignedUser?.name || null,
        };
        const key = recordKey(lead.phone, item.key);
        byIdentity.set(key, mergeCustomer(byIdentity.get(key), item));
      }

      for (const crmContact of crmContacts) {
        const name = String(crmContact.name || "").trim() || normalizePhone(crmContact.phone) || "جهة اتصال";
        const item: WhatsAppCustomerDirectoryItem = {
          key: `crm-contact:${crmContact.id}`,
          leadId: null,
          contactId: null,
          name,
          phone: crmContact.phone,
          leadStatus: null,
          leadArchived: false,
          conversationStatus: "NONE",
          assignedUserName: null,
        };
        const key = recordKey(crmContact.phone, item.key);
        byIdentity.set(key, mergeCustomer(byIdentity.get(key), item));
      }

      for (const contact of contacts) {
        const linkedLead = contact.lead;
        const linkedLeadName = linkedLead
          ? cleanName(linkedLead.firstName, linkedLead.lastName)
          : "";
        const contactName = String(contact.name || "").trim();
        const name = linkedLeadName || contactName || normalizePhone(contact.phone) || "جهة اتصال";
        const item: WhatsAppCustomerDirectoryItem = {
          key: linkedLead ? `lead:${linkedLead.id}` : `contact:${contact.id}`,
          leadId: linkedLead?.id || contact.leadId || null,
          contactId: contact.id,
          name,
          phone: linkedLead?.phone || contact.phone,
          leadStatus: linkedLead ? String(linkedLead.status) : null,
          leadArchived: linkedLead?.isArchived || false,
          conversationStatus: contact.archived ? "ARCHIVED" : "OPEN",
          assignedUserName:
            contact.assignedUserName || linkedLead?.assignedUser?.name || null,
        };
        const key = recordKey(item.phone, item.key);
        byIdentity.set(key, mergeCustomer(byIdentity.get(key), item));
      }

      const customers = [...byIdentity.values()]
        .sort((left, right) => {
          const leftOpen = left.conversationStatus === "OPEN" ? 0 : 1;
          const rightOpen = right.conversationStatus === "OPEN" ? 0 : 1;
          if (leftOpen !== rightOpen) return leftOpen - rightOpen;
          if (left.leadArchived !== right.leadArchived) return left.leadArchived ? 1 : -1;
          return left.name.localeCompare(right.name, "ar");
        })
        .slice(0, limit);

      return { success: true, customers };
    });
  } catch (error) {
    console.error("[WhatsApp] failed to load customer directory", error);
    return {
      success: false,
      customers: [],
      error: "تعذر تحميل دليل العملاء.",
    };
  }
}
