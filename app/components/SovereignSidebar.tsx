"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
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
} from "lucide-react";

const menu = [
  { label: "لوحة التحكم",            icon: LayoutDashboard, path: "/operations/dashboard", tab: "analytics"  },
  { label: "العملاء المحتملين",       icon: Users,           path: "/operations/leads",     tab: "leads"      },
  { label: "المشاريع العقارية",       icon: Building2,       path: "/operations/projects",  tab: "projects"   },
  { label: "العقارات",               icon: Home,            path: "/operations/properties", tab: "properties" },
  { label: "العقود والمدفوعات",       icon: Receipt,         path: "/operations/rental",     tab: "rental",    tooltip: "إدارة عقود الإيجار، إصدار الفواتير، وتسجيل الدفعات" },
  { label: "حاسبة التمويل السكني",    icon: Calculator,      path: "/operations/calculator", tab: "calculator" },
  { label: "العروض العقارية",         icon: Megaphone,       path: "/operations/offers",     tab: "offers"     },
  { label: "الجولات العقارية",        icon: Map,             path: "/operations/tours",      tab: "tours",     tooltip: "تصفح الجولات العقارية المسجلة و360، حجز المواعيد ومحاكاة التمويل" },
  { label: "الإعلان والتسويق",        icon: ShoppingBag,     path: "/operations/marketing",  tab: "marketing", tooltip: "المنصات الإعلانية والتسوق الإعلاني" },
  { label: "الحملات",                icon: Megaphone,       path: "/operations/campaigns",  tab: "campaigns", tooltip: "حملات التسويق وتحليلات ROI" },
  { label: "أداء المبيعات",           icon: PieChart,        path: "/operations/sales",      tab: "sales"      },
  { label: "الوكلاء الذكيون",         icon: Bot,             path: "/operations/agents",     tab: "agents"     },
  { label: "المهام والتذكيرات",       icon: Calendar,        path: "/operations/tasks",      tab: "tasks"      },
  { label: "مستودع المستندات",        icon: FolderOpen,      path: "/operations/documents",  tab: "documents", tooltip: "مستندات المشاريع والعقود والبطاقات" },
  { label: "قناة الواتساب",           icon: MessageCircle,   path: "/operations/whatsapp",   tab: "whatsapp"   },
  { label: "مركز الدعم",              icon: HelpCircle,      path: "/operations/helpdesk",   tab: "helpdesk",  tooltip: "تذاكر الدعم والوكيل الذكي المساعد" },
  { label: "الإعدادات",              icon: Settings,        path: "/operations/settings",   tab: "settings"   },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const currentTab   = searchParams.get("tab") || "analytics";

  return (
    <nav className="flex-1 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <ul className="space-y-0.5">
        {menu.map((item, idx) => {
          const isActive =
            pathname === item.path ||
            (pathname === "/operations" && currentTab === item.tab) ||
            (item.path !== "/operations/dashboard" && pathname.startsWith(item.path));

          const Icon = item.icon;
          const tooltip = "tooltip" in item ? item.tooltip : undefined;

          return (
            <li key={idx}>
              <Link
                href={item.path}
                title={tooltip}
                onClick={() => onNavigate?.()}
                className={[
                  "flex items-center justify-start gap-3 px-4 py-2 text-sm transition-all duration-200 cursor-pointer rounded-lg mx-2 my-0.5 md:justify-center lg:justify-start md:px-2 lg:px-4",
                  isActive
                    ? "nav-item-active font-bold shadow-sm"
                    : "text-[var(--nc-foreground-muted)] hover:bg-[var(--nc-surface)] hover:text-[var(--nc-foreground)] md:hover:translate-x-0 lg:hover:translate-x-[-4px] transform",
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
                <span className="leading-tight flex-1 md:hidden lg:inline">{item.label}</span>
                {item.tab === "rental" && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse md:hidden lg:inline">
                    2
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function SovereignSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <aside className="w-[255px] md:w-[80px] lg:w-[255px] h-screen bg-[var(--nc-surface-strong)]/95 backdrop-blur-xl border-l border-[var(--nc-glass-border)] flex flex-col transition-all duration-300">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-center lg:justify-start px-5 border-b border-[var(--nc-glass-border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[var(--nc-accent-soft)] flex items-center justify-center text-[var(--nc-accent)] font-black text-sm md:hidden lg:flex">
            O
          </span>
          <span className="text-[11px] font-black text-[var(--nc-foreground-muted)] tracking-widest uppercase md:hidden lg:inline">
            ORCA
          </span>
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
      </Suspense>
    </aside>
  );
}
