"use client";

import React, { useState } from "react";
import { useApp } from "@/app/context/AppContext";
import { AuthProvider } from "@/app/context/AuthContext";
import OrcaHeader from "./OrcaHeader";
import OrcaSidebar from "./OrcaSidebar";

type ShellUser = {
  name: string;
  email: string;
  role: string;
};

export default function OrcaAppShell({
  children,
  user,
  companyName,
  isSuperAdmin,
}: {
  children: React.ReactNode;
  user: ShellUser;
  companyName: string;
  isSuperAdmin: boolean;
}) {
  const { lang } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRTL = lang === "AR";

  return (
    <AuthProvider initialRole={user.role}>
      <div className="orca-shell" dir={isRTL ? "rtl" : "ltr"}>
        {mobileOpen && (
          <button
            type="button"
            className="orca-shell-overlay"
            aria-label={isRTL ? "إغلاق القائمة" : "Close menu"}
            onClick={() => setMobileOpen(false)}
          />
        )}

        <OrcaSidebar
          open={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
          isSuperAdmin={isSuperAdmin}
        />

        <OrcaHeader
          user={user}
          companyName={companyName}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="orca-shell-main">
          <div className="orca-shell-content">{children}</div>
        </main>
      </div>
    </AuthProvider>
  );
}