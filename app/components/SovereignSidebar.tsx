"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FolderKanban, ShoppingCart, CheckSquare, BarChart3, Settings, Home, FileText, Calculator, LogOut } from "lucide-react";

export default function SovereignSidebar() {
  const pathname = usePathname();

  const menu = [
    { name: "Leads", href: "/operations/leads", icon: <Users size={18} /> },
    { name: "Projects", href: "/operations/projects", icon: <FolderKanban size={18} /> },
    { name: "Sales", href: "/operations/sales", icon: <ShoppingCart size={18} /> },
    { name: "Tasks", href: "/operations/tasks", icon: <CheckSquare size={18} /> },
    { name: "Ejar", href: "/operations/ejar", icon: <FileText size={18} /> },
    { name: "Accounting", href: "/operations/accounting", icon: <Calculator size={18} /> },
    { name: "Analytics", href: "/operations", icon: <BarChart3 size={18} /> },
    { name: "Settings", href: "/operations/settings", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="w-[230px] h-screen bg-theme-panel border-r border-theme-border flex flex-col">

      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-theme-border">
        <span className="text-[11px] font-black text-theme-text tracking-wide">
          REDC MENU
        </span>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 space-y-1">
        {menu.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-5 py-3 text-sm transition-all",
                active
                  ? "bg-theme-primary/10 text-theme-text-accent font-bold"
                  : "text-theme-text-sub hover:bg-theme-card-hover hover:text-theme-text"
              ].join(" ")}
            >
              {item.icon}
              <span>{item.name === "Settings" ? "إعدادات الحساب" : item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Area */}
      <div className="p-4 border-t border-theme-border space-y-3">
        
        {/* Logout Button */}
        <Link
          href="/logout"
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </Link>

        {/* Home Button */}
        <Link
          href="/home"
          className="flex items-center gap-3 px-4 py-3 bg-theme-primary text-white rounded-xl text-sm font-bold justify-center"
        >
          <Home size={16} />
          Back to Portal
        </Link>
      </div>

    </aside>
  );
}
