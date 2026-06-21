"use client";

import React, { useState, useEffect } from "react";
import { toInputTime } from "@/lib/display/dateTime";

interface TimeFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}

export function TimeField({ value, onChange, required, className, ...props }: TimeFieldProps) {
  const currentTime = toInputTime(value || "");
  const [hour, setHour] = useState(currentTime ? currentTime.split(":")[0] : "");
  const [minute, setMinute] = useState(currentTime ? currentTime.split(":")[1] : "");

  useEffect(() => {
    const t = toInputTime(value || "");
    if (t) {
      const parts = t.split(":");
      if (parts.length === 2) {
        setHour(parts[0]);
        setMinute(parts[1]);
      }
    } else {
      setHour("");
      setMinute("");
    }
  }, [value]);

  const handleChange = (h: string, m: string) => {
    setHour(h);
    setMinute(m);
    if (h && m) {
      onChange(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const selectClass = "bg-transparent outline-none appearance-none cursor-pointer pr-4 hover:text-[var(--nc-primary)] transition-colors";

  return (
    <div 
      className={`flex items-center gap-1 bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] text-sm focus-within:border-[var(--nc-primary)] focus-within:ring-1 focus-within:ring-[var(--nc-primary)] transition-all [unicode-bidi:isolate] ${className || ""}`}
      dir="ltr"
    >
      <select 
        value={hour} 
        onChange={(e) => handleChange(e.target.value, minute)} 
        className={selectClass}
        required={required}
        {...props}
      >
        <option value="" disabled>HH</option>
        {hours.map(h => <option key={`h-${h}`} value={h}>{h}</option>)}
      </select>
      <span className="text-[var(--nc-text-dim)] select-none">:</span>
      <select 
        value={minute} 
        onChange={(e) => handleChange(hour, e.target.value)} 
        className={selectClass}
        required={required}
        {...props}
      >
        <option value="" disabled>mm</option>
        {minutes.map(m => <option key={`m-${m}`} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
