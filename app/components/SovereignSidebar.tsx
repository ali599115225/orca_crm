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
  Megaphone as MegaphoneAlt,
  PieChart,
  Bot,
  Calendar,
  FolderOpen,
  MessageCircle,
  HelpCircle,
  Settings,
  LogOut,
  Calculator,
} from "lucide-react";

// القائمة الموحدة والثابتة للمشروع (بعد تنظيف النمو والتسويق ودمج الإعلان والتسويق)
const menu = [
  { label: "لوحة التحكم",            icon: LayoutDashboard, path: "/operations/dashboard", tab: "analytics"  },
  { label: "العملاء المحتملين",       icon: Users,           path: "/operations/leads",     tab: "leads"      },
  { label: "المشاريع العقارية",       icon: Building2,       path: "/operations/projects",  tab: "projects"   },
  { label: "العقارات",               icon: Home,            path: "/operations/properties", tab: "properties" },
  { label: "العقود والمدفوعات",       icon: Receipt,         path: "/operations/rental",     tab: "rental",   tooltip: "إدارة عقود الإيجار، إصدار الفواتير، وتسجيل الدفعات" },
  { label: "حاسبة التمويل السكني",    icon: Calculator,      path: "/operations/calculator", tab: "calculator" },
  { label: "العروض العقارية",         icon: Megaphone,       path: "/operations/offers",     tab: "offers"     },
  { label: "الجولات العقارية",        icon: Map,             path: "/operations/tours",      tab: "tours",    tooltip: "تصفح الجولات العقارية المسجلة و360، حجز المواعيد ومحاكاة التمويل" },
  { label: "الإعلان والتسويق",        icon: MegaphoneAlt,    path: "/operations/marketing",  tab: "marketing", tooltip: "الحملات التسويقية والتسوق الإعلاني" },
  { label: "أداء المبيعات",           icon: PieChart,        path: "/operations/sales",      tab: "sales"      },
  { label: "الوكلاء الذكيون",         icon: Bot,             path: "/operations/agents",     tab: "agents"     },
  { label: "المهام والتذكيرات",       icon: Calendar,        path: "/operations/tasks",      tab: "tasks"      },
  { label: "مستودع المستندات",        icon: FolderOpen,      path: "/operations/helpdesk",   tab: "helpdesk"   },
  { label: "قناة الواتساب",           icon: MessageCircle,   path: "/operations/whatsapp",   tab: "whatsapp"   },
  { label: "مركز الدعم",              icon: HelpCircle,      path: "/operations/helpdesk",   tab: "helpdesk"   },
  { label: "الإعدادات",              icon: Settings,        path: "/operations/settings",   tab: "settings"   },
];

function SidebarNav() {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const currentTab   = searchParams.get("tab") || "analytics";

  return (
    <nav className="flex-1 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <ul className="space-y-0.5">
        {menu.map((item, idx) => {
          const isMarketing = item.tab === "marketing";
          const isMarketingActive = pathname.startsWith("/operations/marketing");

          const isActive =
            (isMarketing && isMarketingActive) ||
            (!isMarketing &&
              (pathname === item.path ||
                (pathname === "/operations" && currentTab === item.tab)));

          const Icon = item.icon;
          const tooltip = "tooltip" in item ? item.tooltip : undefined;

          return (
            <li key={idx}>
              <Link
                href={item.path}
                title={tooltip}
                className={[
                  "flex items-center justify-start gap-3 px-4 py-2 text-sm transition-all duration-200 cursor-pointer rounded-lg mx-2 my-0.5 md:justify-center lg:justify-start md:px-2 lg:px-4",
                  isActive
                    ? "bg-[#8EB1D1]/10 text-[#8EB1D1] font-bold border-r-4 border-[#8EB1D1] shadow-[inset_-10px_0_15px_-10px_rgba(142,177,209,0.2)]"
                    : "text-brand-text-secondary hover:bg-brand-panel hover:text-brand-text-primary md:hover:translate-x-0 lg:hover:translate-x-[-4px] transform",
                ].join(" ")}
              >
                <Icon
                  size={17}
                  className={`shrink-0 transition-transform duration-200 ${
                    isActive
                      ? "scale-110 text-[#8EB1D1]"
                      : "text-brand-text-secondary group-hover:text-brand-text-primary"
                  }`}
                />
                <span className="leading-tight flex-1 md:hidden lg:inline">{item.label}</span>
                {item.tab === "rental" && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 animate-pulse md:hidden lg:inline">
                    2
                  </span>
                )}
              </Link>

              {/* Subtabs لصفحة الإعلان والتسويق */}
              {isMarketing && isMarketingActive && (
                <ul className="mt-0.5 mb-1 space-y-0.5 md:hidden lg:block">
                  {[
                    { label: "الحملات",  path: "/operations/marketing",             q: ""        },
                    { label: "التسوق",   path: "/operations/marketing?tab=shopping", q: "shopping"},
                  ].map((sub) => {
                    const subActive =
                      sub.q
                        ? searchParams.get("tab") === sub.q
                        : pathname === "/operations/marketing" && !searchParams.get("tab");
                    return (
                      <li key={sub.label}>
                        <Link
                          href={sub.path}
                          className={[
                            "flex items-center gap-2 pr-10 pl-4 py-1.5 text-xs rounded-lg mx-2 transition-all",
                            subActive
                              ? "text-[#8EB1D1] font-bold bg-[#8EB1D1]/10"
                              : "text-brand-text-secondary/70 hover:text-brand-text-primary",
                          ].join(" ")}
                        >
                          <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                          {sub.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function SovereignSidebar() {
  return (
    <aside className="w-[255px] md:w-[80px] lg:w-[255px] h-screen bg-brand-bg border-l border-brand-border flex flex-col transition-all duration-300">
      <div className="h-16 flex items-center justify-center lg:justify-start px-5 border-b border-brand-border shrink-0">
        <span className="text-[11px] font-black text-brand-text-secondary tracking-widest uppercase md:hidden lg:inline">
          ORCA CRM
        </span>
        <span className="text-[14px] font-black text-[#8EB1D1] tracking-widest uppercase hidden md:inline lg:hidden">
          O
        </span>
      </div>

      <Suspense
        fallback={
          <div className="flex-1 py-3 space-y-1 px-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-brand-panel animate-pulse mx-3" />
            ))}
          </div>
        }
      >
        <SidebarNav />
      </Suspense>

      <div className="p-4 border-t border-brand-border shrink-0">
        <Link
          href="/logout"
          className="flex items-center justify-center lg:justify-start gap-3 md:gap-0 lg:gap-3 px-2 lg:px-4 py-2.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-sm font-bold transition-all border border-rose-500/20 hover:border-rose-500/40 w-full"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="md:hidden lg:inline mr-2 md:mr-0 lg:mr-2">تسجيل الخروج</span>
        </Link>
      </div>
    </aside>
  );
}