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
  Target,
  TrendingUp,
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

// ─── خريطة الأقسام الكاملة (16 قسماً + حاسبة التمويل) ──────────────────────
const menu = [
  { label: "لوحة التحكم",            icon: LayoutDashboard, tab: "analytics"  },
  { label: "العملاء المحتملين",       icon: Users,           tab: "leads"      },
  { label: "المشاريع العقارية",       icon: Building2,       tab: "projects"   },
  { label: "العقارات",               icon: Home,            tab: "projects"   },
  { label: "الإيجارات والمحاسبة",     icon: Receipt,         tab: "rental"     },
  { label: "حاسبة التمويل السكني",    icon: Calculator,      tab: "calculator" },
  { label: "العروض العقارية",         icon: Megaphone,       tab: "sales"      },
  { label: "الجولات العقارية",        icon: Map,             tab: "growth"     },
  { label: "الحملات التسويقية",       icon: Target,          tab: "growth"     },
  { label: "النمو والتسويق",          icon: TrendingUp,      tab: "growth"     },
  { label: "أداء المبيعات",           icon: PieChart,        tab: "sales"      },
  { label: "الوكلاء الذكيون",         icon: Bot,             tab: "agents"     },
  { label: "المهام والتذكيرات",       icon: Calendar,        tab: "tasks"      },
  { label: "مستودع المستندات",        icon: FolderOpen,      tab: "helpdesk"   },
  { label: "قناة الواتساب",           icon: MessageCircle,   tab: "whatsapp"   },
  { label: "مركز الدعم",              icon: HelpCircle,      tab: "helpdesk"   },
  { label: "الإعدادات",              icon: Settings,        tab: "settings"   },
];

// ─── المكوّن الداخلي (يستخدم useSearchParams داخل Suspense) ─────────────────
function SidebarNav() {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const currentTab   = searchParams.get("tab") || "analytics";
  const isOperations = pathname?.startsWith("/operations");

  return (
    <nav className="flex-1 py-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <ul className="space-y-0.5">
        {menu.map((item, idx) => {
          const targetHref = `/operations?tab=${item.tab}`;
          const isActive   = isOperations
            ? currentTab === item.tab
            : pathname === targetHref;

          const Icon = item.icon;

          return (
            <li key={idx}>
              <Link
                href={targetHref}
                className={[
                  "flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#df7b62]/10 text-[#df7b62] font-bold border-r-2 border-[#df7b62]"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                ].join(" ")}
              >
                <Icon size={17} className="shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────
export default function SovereignSidebar() {
  return (
    <aside className="w-[255px] h-screen bg-[#0b1120] border-r border-slate-800 flex flex-col">

      {/* ── الهيدر ──────────────────────────────────────────────────────── */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 shrink-0">
        <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">
          ORCA CRM
        </span>
      </div>

      {/* ── قائمة التنقل (داخل Suspense لـ useSearchParams) ─────────────── */}
      <Suspense
        fallback={
          <div className="flex-1 py-3 space-y-1 px-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-slate-800/40 animate-pulse mx-3" />
            ))}
          </div>
        }
      >
        <SidebarNav />
      </Suspense>

      {/* ── الجزء السفلي ─────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-800 space-y-2 shrink-0">
        <Link
          href="/logout"
          className="flex items-center gap-3 px-4 py-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl text-sm font-bold transition-all"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </Link>

        <Link
          href="/home"
          className="flex items-center gap-3 px-4 py-2.5 bg-[#df7b62] text-white rounded-xl text-sm font-bold justify-center shadow-lg shadow-[#df7b62]/20 hover:bg-[#c96a51] transition-all"
        >
          <Home size={16} />
          العودة للمنصة الرئيسية
        </Link>
      </div>

    </aside>
  );
}