import DashboardLayout from "../../components/layout/DashboardLayout";
import React from "react";
import { getSession } from "../../lib/session";
import { redirect } from "next/navigation";

export default async function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
