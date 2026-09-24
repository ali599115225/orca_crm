"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/app/context/AppContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Receipt,
  Megaphone,
  Map,
  ShoppingBag,
  PieChart,
  Calendar,
  FolderOpen,
  MessageCircle,
  HelpCircle,
  Settings,
  Calculator,
  Mail,
  Bot,
  Shield,
} from "lucide-react";

const sections = [
  {
    ar: "المبيعات والعملاء",
    en: "Sales & Clients",
    items: [
      ["لوحة التحكم", "Dashboard", "/operations/dashboard", LayoutDashboard],
      ["العملاء", "Leads", "/operations/leads", Users],
      ["سلامة الإيرادات", "Revenue Integrity", "/operations/revenue-integrity", Shield],
      ["العروض", "Offers", "/operations/offers", Megaphone],
      ["الجولات", "Tours", "/operations/tours", Map],
    ],
  },
  {
    ar: "العقارات والعقود",
    en: "Properties & Contracts",
    items: [
      ["العقارات", "Properties", "/operations/properties", Home],
      ["المشاريع", "Projects", "/operations/projects", Building2],
      ["الإيجارات", "Rentals", "/operations/rental", Receipt],
      ["الحاسبة", "Calculator", "/operations/calculator", Calculator],
    ],
  },
  {
    ar: "التسويق",
    en: "Marketing",
    items: [
      ["التسويق", "Marketing", "/operations/marketing", ShoppingBag],
      ["الحملات", "Campaigns", "/operations/campaigns", Megaphone],
      ["المبيعات", "Sales", "/operations/sales", PieChart],
    ],
  },
  {
    ar: "التشغيل",
    en: "Operations",
    items: [
      ["المهام", "Tasks", "/operations/tasks", Calendar],
      ["المستندات", "Documents", "/operations/documents", FolderOpen],
      ["الدعم", "Helpdesk", "/operations/helpdesk", HelpCircle],
      ["الوكلاء", "Agents", "/operations/agents", Bot],
      ["البريد", "Email", "/operations/email", Mail],
      ["واتساب", "WhatsApp", "/operations/whatsapp", MessageCircle],
    ],
  },
];

export default function OrcaSidebar({
  open,
  onNavigate,
  isSuperAdmin,
}: {
  open: boolean;
  onNavigate: () => void;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const { lang } = useApp();
  const ar = lang === "AR";

  return (
    <aside className={`orca-sidebar ${open ? "is-open" : ""}`}>
      <div className="orca-sidebar-brand">
        <strong>ORCA</strong>
        <span>{ar ? "العمليات العقارية" : "Real Estate Operations"}</span>
      </div>

      <nav
        className="orca-sidebar-nav"
        aria-label={ar ? "التنقل الرئيسي" : "Primary navigation"}
      >
        {sections.map((section) => (
          <section className="orca-nav-section" key={section.en}>
            <div className="orca-nav-section-title">
              {ar ? section.ar : section.en}
            </div>

            {section.items.map(([arLabel, enLabel, href, Icon]: any) => {
              const active =
                pathname === href ||
                (href !== "/operations/dashboard" &&
                  pathname.startsWith(`${href}/`));

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`orca-nav-item ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={ar ? arLabel : enLabel}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{ar ? arLabel : enLabel}</span>
                </Link>
              );
            })}
          </section>
        ))}

        <section className="orca-nav-section orca-nav-final-section">
          <Link
            href="/operations/settings"
            onClick={onNavigate}
            className={`orca-nav-item ${
              pathname.startsWith("/operations/settings")
                ? "is-active"
                : ""
            }`}
          >
            <Settings size={18} />
            <span>{ar ? "الإعدادات" : "Settings"}</span>
          </Link>

          {isSuperAdmin && (
            <Link
              href="/admin/command-center"
              onClick={onNavigate}
              className="orca-nav-item"
            >
              <Shield size={18} />
              <span>{ar ? "مركز القيادة" : "Command Center"}</span>
            </Link>
          )}
        </section>
      </nav>
    </aside>
  );
}