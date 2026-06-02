"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, FolderKanban, ShoppingCart, CheckSquare, BarChart3, Settings, Home, FileText, Calculator, LogOut } from "lucide-react";

export default function SovereignSidebar() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "analytics";

  // مصفوفة الروابط العقارية الموحدة المتوافقة مع معمارية النطاق السحابي ?tab=
  const menu = [
    { name: "Leads", id: "leads", label: "إدارة العملاء والمستثمرين", icon: <Users size={18} /> },
    { name: "Projects", id: "projects", label: "إدارة المشاريع العقارية", icon: <FolderKanban size={18} /> },
    { name: "Sales", id: "sales", label: "الأداء والمبيعات العقارية", icon: <ShoppingCart size={18} /> },
    { name: "Tasks", id: "tasks", label: "المهام والتذكيرات الميدانية", icon: <CheckSquare size={18} /> },
    { name: "Rental", id: "rental", label: "الإيجارات والمحاسبة العقارية", icon: <Calculator size={18} /> },
    { name: "Analytics", id: "analytics", label: "لوحة النمو والمؤشرات", icon: <BarChart3 size={18} /> },
    { name: "Settings", id: "settings", label: "إعدادات الحساب والمنشأة", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-[230px] h-screen bg-[#0b1120] border-r border-slate-800 flex flex-col">

      {/* الهيدر الرئيسي الموحد */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <span className="text-[11px] font-black text-slate-400 tracking-wide">
          ORCA CRM MENU
        </span>
      </div>

      {/* قائمة الخيارات والتبويبات */}
      <nav className="flex-1 py-4 space-y-1">
        {menu.map((item) => {
          const active = currentTab === item.id;
          const targetHref = `/operations?tab=${item.id}`;

          return (
            <Link
              key={item.id}
              href={targetHref}
              className={[
                "flex items-center gap-3 px-5 py-3 text-sm transition-all cursor-pointer",
                active
                  ? "bg-[#df7b62]/10 text-[#df7b62] font-bold border-l-2 border-[#df7b62]"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              ].join(" ")}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* الجزء السفلي - خروج وبوابة رئيسية */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <Link
          href="/logout"
          className="flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-500/10 rounded-xl text-sm font-bold transition-all"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </Link>

        <Link
          href="/home"
          className="flex items-center gap-3 px-4 py-3 bg-[#df7b62] text-white rounded-xl text-sm font-bold justify-center shadow-lg shadow-[#df7b62]/20"
        >
          <Home size={16} />
          العودة للمنصة الرئيسية
        </Link>
      </div>

    </aside>
  );
}