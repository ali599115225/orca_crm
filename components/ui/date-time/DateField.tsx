"use client";

import React, { useState, useEffect } from "react";
import { toInputDate } from "@/lib/display/dateTime";

interface DateFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  value?: string | null;
  onChange: (value: string) => void;
  required?: boolean;
}

export function DateField({ value, onChange, required, className, ...props }: DateFieldProps) {
  const currentDate = toInputDate(value || "");
  const [day, setDay] = useState(currentDate ? currentDate.split("-")[2] : "");
  const [month, setMonth] = useState(currentDate ? currentDate.split("-")[1] : "");
  const [year, setYear] = useState(currentDate ? currentDate.split("-")[0] : "");

  useEffect(() => {
    const d = toInputDate(value || "");
    if (d) {
      const parts = d.split("-");
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    } else {
      setYear("");
      setMonth("");
      setDay("");
    }
  }, [value]);

  const handleChange = (y: string, m: string, d: string) => {
    setYear(y);
    setMonth(m);
    setDay(d);
    if (y && m && d) {
      const next = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      const parsed = new Date(`${next}T00:00:00`);
      const isValid =
        !Number.isNaN(parsed.getTime()) &&
        parsed.getFullYear() === Number(y) &&
        parsed.getMonth() + 1 === Number(m) &&
        parsed.getDate() === Number(d);
      onChange(isValid ? next : "");
    } else {
      onChange("");
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

  const selectClass = "bg-transparent outline-none appearance-none cursor-pointer pr-4 hover:text-[var(--nc-primary)] transition-colors";

  return (
    <div 
      className={`flex items-center gap-1 bg-[var(--nc-surface-solid)] border border-slate-700 rounded px-2.5 py-2 text-[var(--nc-foreground)] text-sm focus-within:border-[var(--nc-primary)] focus-within:ring-1 focus-within:ring-[var(--nc-primary)] transition-all [unicode-bidi:isolate] ${className || ""}`}
      dir="ltr"
    >
      <select 
        value={day} 
        onChange={(e) => handleChange(year, month, e.target.value)} 
        className={selectClass}
        required={required}
        {...props}
      >
        <option value="" disabled>DD</option>
        {days.map(d => <option key={`d-${d}`} value={d}>{d}</option>)}
      </select>
      <span className="text-[var(--nc-text-dim)] select-none">-</span>
      <select 
        value={month} 
        onChange={(e) => handleChange(year, e.target.value, day)} 
        className={selectClass}
        required={required}
        {...props}
      >
        <option value="" disabled>MM</option>
        {months.map(m => <option key={`m-${m}`} value={m}>{m}</option>)}
      </select>
      <span className="text-[var(--nc-text-dim)] select-none">-</span>
      <select 
        value={year} 
        onChange={(e) => handleChange(e.target.value, month, day)} 
        className={selectClass}
        required={required}
        {...props}
      >
        <option value="" disabled>YY</option>
        {years.map(y => <option key={`y-${y}`} value={y}>{y.slice(-2)}</option>)}
      </select>
    </div>
  );
}
