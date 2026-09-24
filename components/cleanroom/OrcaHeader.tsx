"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Globe,
  Moon,
  Sun,
  Bell,
  LogOut,
} from "lucide-react";
import { useApp } from "@/app/context/AppContext";
import { logoutAction } from "@/app/actions/auth";

const routeNames: Record<string, { ar: string; en: string }> = {
  "/operations/dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "/operations/leads": { ar: "العملاء", en: "Leads" },
  "/operations/revenue-integrity": { ar: "سلامة الإيرادات", en: "Revenue Integrity" },
  "/operations/projects": { ar: "المشاريع", en: "Projects" },
  "/operations/properties": { ar: "العقارات", en: "Properties" },
  "/operations/rental": { ar: "الإيجارات", en: "Rentals" },
  "/operations/offers": { ar: "العروض", en: "Offers" },
  "/operations/tours": { ar: "الجولات", en: "Tours" },
  "/operations/marketing": { ar: "التسويق", en: "Marketing" },
  "/operations/campaigns": { ar: "الحملات", en: "Campaigns" },
  "/operations/sales": { ar: "المبيعات", en: "Sales" },
  "/operations/tasks": { ar: "المهام", en: "Tasks" },
  "/operations/documents": { ar: "المستندات", en: "Documents" },
  "/operations/helpdesk": { ar: "الدعم", en: "Helpdesk" },
  "/operations/agents": { ar: "الوكلاء", en: "Agents" },
  "/operations/email": { ar: "البريد", en: "Email" },
  "/operations/whatsapp": { ar: "واتساب", en: "WhatsApp" },
  "/operations/settings": { ar: "الإعدادات", en: "Settings" },
};

export default function OrcaHeader({
  user,
  companyName,
  onMenuClick,
}: {
  user: { name: string; email: string; role: string };
  companyName: string;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, toggleLang, theme, toggleTheme } = useApp();
  const [query, setQuery] = useState("");

  const ar = lang === "AR";

  const matched = Object.keys(routeNames)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  const title = matched
    ? ar
      ? routeNames[matched].ar
      : routeNames[matched].en
    : ar
      ? "العمليات"
      : "Operations";

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("search-change", { detail: query }),
    );
  }, [query]);

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="orca-header">
      <div className="orca-header-start">
        <button
          type="button"
          className="orca-icon-button orca-mobile-menu"
          onClick={onMenuClick}
          aria-label={ar ? "فتح القائمة" : "Open menu"}
        >
          <Menu size={20} />
        </button>

        <div className="orca-header-title">
          <span>{ar ? "العمليات" : "Operations"}</span>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="orca-header-search">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            ar
              ? "ابحث في العملاء، العقارات، المشاريع..."
              : "Search clients, properties, projects..."
          }
          aria-label={ar ? "البحث" : "Search"}
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="orca-header-actions">
        <button
          type="button"
          className="orca-icon-button"
          onClick={toggleLang}
          title={ar ? "English" : "العربية"}
        >
          <Globe size={18} />
        </button>

        <button
          type="button"
          className="orca-icon-button"
          onClick={toggleTheme}
          title={ar ? "تغيير المظهر" : "Toggle theme"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>


        <button
          type="button"
          className="orca-icon-button"
          title={ar ? "فتح الإشعارات" : "Open notifications"}
          aria-label={ar ? "فتح الإشعارات" : "Open notifications"}
        >
          <Bell size={18} />
        </button>
        <span className="orca-header-separator" />

        <div className="orca-header-identity">

          <div>
            <strong>{user.name || (ar ? "مستخدم ORCA" : "ORCA User")}</strong>
            <span>{companyName || "ORCA"}</span>
          </div>
        </div>

        <button
          type="button"
          className="orca-icon-button"
          onClick={handleLogout}
          title={ar ? "تسجيل الخروج" : "Sign out"}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}