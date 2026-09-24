import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getActiveTenant } from "@/lib/tenant";
import { runWithTenantContext } from "@/lib/tenant-context";
import { isPrivilegedSessionPayload } from "@/lib/platform-identity";
import OrcaAppShell from "@/components/cleanroom/OrcaAppShell";
import "./orca-shell-cleanroom.css";

export const metadata = {
  title: "ORCA — العمليات العقارية",
  description: "منصة ORCA لإدارة العمليات العقارية",
};

function TenantUnavailable() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <section>
        <h1>تعذر فتح لوحة العمليات</h1>
        <p>يرجى التواصل مع مسؤول النظام للتحقق من حالة المنشأة.</p>
      </section>
    </main>
  );
}

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let tenant: any;

  try {
    tenant = await getActiveTenant();
  } catch {
    return <TenantUnavailable />;
  }

  const user = await runWithTenantContext(
    {
      tenantId: tenant.id,
      userId: session.userId as string,
    },
    async () =>
      prisma.user.findFirst({
        where: {
          id: session.userId as string,
          tenantId: tenant.id,
          isActive: true,
        },
      }),
  );

  const isSuperAdmin = isPrivilegedSessionPayload(session);

  if (!user && !isSuperAdmin) {
    redirect("/login");
  }

  return (
    <OrcaAppShell
      user={{
        name: user?.name || "",
        email: user?.email || "",
        role: isSuperAdmin ? "SUPER_ADMIN" : String(user?.role || "READ_ONLY"),
      }}
      companyName={tenant?.companyName || "ORCA"}
      isSuperAdmin={isSuperAdmin}
    >
      {children}
    </OrcaAppShell>
  );
}