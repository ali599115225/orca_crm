"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
  Bot,
  Calendar,
  FolderOpen,
  MessageCircle,
  HelpCircle,
  Settings,
  Calculator,
  Mail,
  Shield,
} from "lucide-react";

type MenuItem = {
  labelKey: string;
  icon: any;
  path: string;
  tab: string;
  tooltipKey?: string;
  badgeKey?: string;
  badgeVariant?: "preview" | "soon" | "paused";
};

type MenuSection = {
  titleKey: string;
  items: MenuItem[];
};

const menuData: MenuSection[] = [
  {
    titleKey: "sidebar.sales",
    items: [
      { labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/operations/dashboard", tab: "analytics" },
      { labelKey: "nav.leads", icon: Users, path: "/operations/leads", tab: "leads" },
      { labelKey: "nav.revenue_integrity", icon: Shield, path: "/operations/revenue-integrity", tab: "revenue-integrity" },
      { labelKey: "nav.offers", icon: Megaphone, path: "/operations/offers", tab: "offers" },
      { labelKey: "nav.tours", icon: Map, path: "/operations/tours", tab: "tours", tooltipKey: "nav.tours" },
    ],
  },
  {
    titleKey: "sidebar.properties",
    items: [
      { labelKey: "nav.properties", icon: Home, path: "/operations/properties", tab: "properties" },
      { labelKey: "nav.projects", icon: Building2, path: "/operations/projects", tab: "projects" },
      { labelKey: "nav.rental", icon: Receipt, path: "/operations/rental", tab: "rental" },
      { labelKey: "nav.calculator", icon: Calculator, path: "/operations/calculator", tab: "calculator" },
    ],
  },
  {
    titleKey: "sidebar.marketing",
    items: [
      { labelKey: "nav.marketing", icon: ShoppingBag, path: "/operations/marketing", tab: "marketing", tooltipKey: "nav.marketing" },
      { labelKey: "nav.campaigns", icon: Megaphone, path: "/operations/campaigns", tab: "campaigns", tooltipKey: "nav.campaigns" },
      { labelKey: "nav.sales", icon: PieChart, path: "/operations/sales", tab: "sales" },
    ],
  },
  {
    titleKey: "sidebar.operations",
    items: [
      { labelKey: "nav.tasks", icon: Calendar, path: "/operations/tasks", tab: "tasks" },
      { labelKey: "nav.documents", icon: FolderOpen, path: "/operations/documents", tab: "documents", tooltipKey: "nav.documents" },
      { labelKey: "nav.helpdesk", icon: HelpCircle, path: "/operations/helpdesk", tab: "helpdesk", tooltipKey: "nav.helpdesk" },
      { labelKey: "nav.agents", icon: Bot, path: "/operations/agents", tab: "agents" },
      { labelKey: "nav.email", icon: Mail, path: "/operations/email", tab: "email" },
      { labelKey: "nav.whatsapp", icon: MessageCircle, path: "/operations/whatsapp", tab: "whatsapp" },
    ],
  },
  {
    titleKey: "sidebar.settings",
    items: [
      { labelKey: "nav.settings", icon: Settings, path: "/operations/settings", tab: "settings" },
    ],
  },
];

function BadgeTag({
  badgeKey,
  variant,
}: {
  badgeKey: string;
  variant: MenuItem["badgeVariant"];
}) {
  const { t } = useApp();

  return (
    <span className={`orca-v1-nav-badge is-${variant || "preview"}`}>
      {t(badgeKey)}
    </span>
  );
}

function PlatformOwnerLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { lang } = useApp();
  const isRTL = lang === "AR";

  return (
    <div className="orca-v1-owner-zone">
      <div className="orca-v1-owner-title">
        {isRTL ? "مالك المنصة" : "Platform Owner"}
      </div>
      <Link
        href="/admin/command-center"
        onClick={() => onNavigate?.()}
        className="orca-v1-nav-item orca-v1-owner-link"
        title={isRTL ? "مركز القيادة" : "Command Center"}
      >
        <Shield size={18} className="orca-v1-nav-icon" aria-hidden="true" />
        <span className="orca-v1-nav-label">
          {isRTL ? "مركز القيادة" : "Command Center"}
        </span>
      </Link>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams.get("tab") || "analytics";
  const { t, lang } = useApp();
  const isRTL = lang === "AR";

  return (
    <nav
      className="orca-v1-nav"
      aria-label={isRTL ? "التنقل الرئيسي" : "Primary navigation"}
    >
      {menuData.map((section) => (
        <section key={section.titleKey} className="orca-v1-nav-section">
          <div className="orca-v1-nav-title">{t(section.titleKey)}</div>
          <ul className="orca-v1-nav-list">
            {section.items.map((item) => {
              const isActive =
                pathname === item.path ||
                (pathname === "/operations" && currentTab === item.tab) ||
                (item.path !== "/operations/dashboard" &&
                  pathname.startsWith(item.path));

              const Icon = item.icon;
              const label = t(item.labelKey);

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    title={item.tooltipKey ? t(item.tooltipKey) : label}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onNavigate?.()}
                    className={`orca-v1-nav-item ${isActive ? "is-active" : ""}`}
                  >
                    <Icon
                      size={18}
                      className="orca-v1-nav-icon"
                      aria-hidden="true"
                    />
                    <span className="orca-v1-nav-label">{label}</span>
                    {item.badgeKey && (
                      <BadgeTag
                        badgeKey={item.badgeKey}
                        variant={item.badgeVariant}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export default function SovereignSidebar({
  onLinkClick,
  tenant,
  companyName,
  isSuperAdmin,
}: {
  onLinkClick?: () => void;
  tenant?: any;
  companyName?: string;
  isSuperAdmin?: boolean;
}) {
  const { lang } = useApp();
  const isRTL = lang === "AR";

  return (
    <aside className="orca-v1-sidebar" aria-label={isRTL ? "القائمة الجانبية" : "Sidebar"}>
      <div className="orca-v1-brand">
        <span className="orca-v1-brand-mark" aria-hidden="true">O</span>
        <div className="orca-v1-brand-copy">
          <strong className="orca-v1-brand-name">ORCA</strong>
          <span className="orca-v1-brand-subtitle">
            {isRTL ? "العمليات العقارية" : "Real Estate Operations"}
          </span>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="orca-v1-nav-loading" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="orca-v1-nav-loading-row" />
            ))}
          </div>
        }
      >
        <SidebarNav onNavigate={onLinkClick} />
        {isSuperAdmin && <PlatformOwnerLinks onNavigate={onLinkClick} />}
      </Suspense>
    </aside>
  );
}