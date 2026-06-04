import DashboardLayout from "../../components/layout/DashboardLayout";
import React from "react";

export default function LeadsRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
