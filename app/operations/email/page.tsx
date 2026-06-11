// app/operations/email/page.tsx
import { getEmailMessagesAction } from "@/app/actions/email";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import EmailClient from "./EmailClient";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  let tenant;
  try {
    tenant = await getActiveTenant();
  } catch {
    return <div className="p-6">يرجى تسجيل الدخول</div>;
  }

  const [messagesResult, leads] = await Promise.all([
    getEmailMessagesAction(50),
    prisma.lead.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const rawMessages = messagesResult.success ? messagesResult.messages : [];
  const messages = rawMessages.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    sentAt: m.sentAt?.toISOString() || null,
    lead: m.lead ? { firstName: m.lead.firstName, lastName: m.lead.lastName || null } : null,
  }));

  const leadsData = leads.map(l => ({
    id: l.id,
    firstName: l.firstName,
    lastName: l.lastName || "",
    email: l.email || null,
  }));

  return (
    <EmailClient
      initialMessages={messages}
      leads={leadsData}
      emailFrom={process.env.EMAIL_FROM || "ORCA <onboarding@resend.dev>"}
    />
  );
}
