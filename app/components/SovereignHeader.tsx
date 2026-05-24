"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function SovereignHeader() {
  const router = useRouter();

  return (
    <header className="w-full h-16 bg-theme-panel border-b border-theme-border flex items-center px-6 justify-between">
      
      {/* Logo */}
      <div 
        onClick={() => router.push("/home")}
        className="flex items-center gap-3 cursor-pointer"
      >
        <div className="w-10 h-10 bg-theme-primary rounded-xl rotate-45 flex items-center justify-center shadow-theme-glow">
          <Shield className="text-white -rotate-45" size={20} />
        </div>

        <h1 className="text-theme-text font-black tracking-tight text-sm">
          REDC SYSTEM
        </h1>
      </div>

      {/* Placeholder */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-theme-text-sub font-bold">
          v1.0
        </span>
      </div>

    </header>
  );
}
