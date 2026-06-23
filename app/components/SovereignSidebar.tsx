
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
      { labelKey: "nav.dashboard",  icon: LayoutDashboard, path: "/operations/dashboard",  tab: "analytics" },
      { labelKey: "nav.leads",      icon: Users,           path: "/operations/leads",      tab: "leads" },
      { labelKey: "nav.revenue_integrity", icon: Shield,   path: "/operations/revenue-integrity", tab: "revenue-integrity" },
      { labelKey: "nav.offers",     icon: Megaphone,       path: "/operations/offers",     tab: "offers" },
      { labelKey: "nav.tours",      icon: Map,             path: "/operations/tours",      tab: "tours",     tooltipKey: "nav.tours" },
    ],
  },
  {
    titleKey: "sidebar.properties",
    items: [
      { labelKey: "nav.projects",   icon: Building2,       path: "/operations/projects",   tab: "projects" },
      { labelKey: "nav.properties", icon: Home,            path: "/operations/properties", tab: "properties" },
      { labelKey: "nav.rental",     icon: Receipt,         path: "/operations/rental",     tab: "rental",    tooltipKey: "nav.rental" },
      { labelKey: "nav.calculator", icon: Calculator,      path: "/operations/calculator", tab: "calculator" },
    ],
  },
  {
    titleKey: "sidebar.marketing",
    items: [
      { labelKey: "nav.marketing",  icon: ShoppingBag,     path: "/operations/marketing",  tab: "marketing", tooltipKey: "nav.marketing" },
      { labelKey: "nav.campaigns",  icon: Megaphone,       path: "/operations/campaigns",  tab: "campaigns", tooltipKey: "nav.campaigns" },
      { labelKey: "nav.sales",      icon: PieChart,        path: "/operations/sales",      tab: "sales" },
    ],
  },
  {
    titleKey: "sidebar.operations",
    items: [
      { labelKey: "nav.tasks",      icon: Calendar,        path: "/operations/tasks",      tab: "tasks" },
      { labelKey: "nav.documents",  icon: FolderOpen,      path: "/operations/documents",  tab: "documents", tooltipKey: "nav.documents" },
      { labelKey: "nav.helpdesk",   icon: HelpCircle,      path: "/operations/helpdesk",   tab: "helpdesk",  tooltipKey: "nav.helpdesk" },
      { labelKey: "nav.agents",     icon: Bot,             path: "/operations/agents",     tab: "agents" },
      { labelKey: "nav.email",      icon: Mail,            path: "/operations/email",      tab: "email" },
      { labelKey: "nav.whatsapp",   icon: MessageCircle,   path: "/operations/whatsapp",   tab: "whatsapp" },
    ],
  },
  {
    titleKey: "sidebar.settings",
    items: [
      { labelKey: "nav.settings",   icon: Settings,        path: "/operations/settings",   tab: "settings" },
    ],
  },
];

function BadgeTag({ badgeKey, variant }: { badgeKey: string; variant: MenuItem["badgeVariant"] }) {
  const { t } = useApp();

  const variantStyles: Record<string, string> = {
    preview: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    soon: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    paused: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border shrink-0 md:hidden lg:inline ${variantStyles[variant || "preview"]}`}>
      {t(badgeKey)}
    </span>
  );
}

function PlatformOwnerLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useApp();
  const isRTL = lang === 'AR';
  return (
    <div className="border-t border-[var(--nc-glassy-border)] pt-2 mt-2">
      <div className="px-5 py-2 text-[11px] font-black tracking-widest text-[var(--nc-accent)] uppercase md:hidden lg:block" style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {isRTL ? 'مالك المنصة' : 'Platform Owner'}
      </div>
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/admin/command-center"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 px-4 py-2 text-[13px] transition-all duration-200 cursor-pointer rounded-lg mx-2 my-0.5 md:justify-center lg:justify-start md:px-2 lg:px-4 min-h-[44px] text-[var(--nc-accent)] hover:bg-[var(--nc-accent-soft)] hover:text-[var(--nc-accent)]"
          >
            <Shield size={17} className="shrink-0" />
            <span className="leading-tight flex-1 md:hidden lg:inline">{isRTL ? 'مركز القيادة' : 'Command Center'}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const currentTab   = searchParams.get("tab") || "analytics";
  const { t, lang } = useApp();
  const isRTL = lang === 'AR';

  return (
    <nav className="flex-1 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {menuData.map((section, sIdx) => (
        <div key={sIdx} className="mb-1">
          <div className="px-5 py-2 text-[11px] font-black tracking-widest text-[var(--nc-text-secondary)] uppercase md:hidden lg:block" style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t(section.titleKey)}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item, idx) => {
              const isActive =
                pathname === item.path ||
                (pathname === "/operations" && currentTab === item.tab) ||
                (item.path !== "/operations/dashboard" && pathname.startsWith(item.path));

              const Icon = item.icon;

              return (
                <li key={idx}>
                  <Link
                    href={item.path}
                    title={item.tooltipKey ? t(item.tooltipKey) : undefined}
                    onClick={() => onNavigate?.()}
                    className={[
                      "flex items-center gap-3 px-4 py-2 text-[13px] transition-all duration-200 cursor-pointer rounded-lg mx-2 my-0.5 md:justify-center lg:justify-start md:px-2 lg:px-4 min-h-[44px]",
                      isRTL ? "justify-start" : "justify-start",
                      isActive
                        ? "nav-item-active font-bold shadow-sm"
                        : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface)] hover:text-[var(--nc-foreground)] transform",
                    ].join(" ")}
                  >
                    <Icon
                      size={17}
                      className={`shrink-0 transition-transform duration-200 ${
                        isActive
                          ? "scale-110 text-[var(--nc-accent)]"
                          : "text-[var(--nc-foreground-muted)]"
                      }`}
                    />
                    <span className="leading-tight flex-1 md:hidden lg:inline">{t(item.labelKey)}</span>
                    {item.badgeKey && <BadgeTag badgeKey={item.badgeKey} variant={item.badgeVariant} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function SovereignSidebar({ onLinkClick, tenant, companyName, isSuperAdmin }: { onLinkClick?: () => void; tenant?: any; companyName?: string; isSuperAdmin?: boolean }) {
  const { lang } = useApp();
  const isRTL = lang === 'AR';

  return (
    <aside className={`w-[255px] md:w-[80px] lg:w-[255px] h-screen bg-[var(--nc-surface-strong)]/95 backdrop-blur-xl ${isRTL ? 'border-l' : 'border-r'} border-[var(--nc-glass-border)] flex flex-col transition-all duration-300`}>
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-center lg:justify-start px-5 border-b border-[var(--nc-glass-border)] shrink-0">
        <div className="flex items-center gap-2.5" style={{ flexDirection: isRTL ? 'row' : 'row' }}>
          <span className="w-7 h-7 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)] font-black text-sm md:hidden lg:flex">
            O
          </span>
          <div className="md:hidden lg:block">
            <span className="text-[11px] font-black text-[var(--nc-foreground-muted)] tracking-widest uppercase">
              ORCA
            </span>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex-1 py-3 space-y-1 px-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-[var(--nc-surface)] animate-pulse mx-3" />
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
