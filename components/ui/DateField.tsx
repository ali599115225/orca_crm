import React, { useRef, useEffect, useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

// ─── Utility Formatters & Parsers ───────────────────────────────────────────

export function formatDateToDDMMYYYY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function parseNativeValueToDate(val: string): Date | null {
  if (!val) return null;
  const parts = val.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

export function parseVisibleToNative(val: string): string {
  if (!val) return '';
  const parts = val.trim().split('/');
  if (parts.length !== 3) return '';
  const dd = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  const yyyy = parts[2];
  if (isNaN(Number(dd)) || isNaN(Number(mm)) || isNaN(Number(yyyy))) return '';
  return `${yyyy}-${mm}-${dd}`;
}

export function isValidDDMMYYYY(val: string): boolean {
  const clean = val.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return false;
  const parts = clean.split('/');
  const dd = Number(parts[0]);
  const mm = Number(parts[1]);
  const yyyy = Number(parts[2]);
  if (yyyy < 1900 || yyyy > 2100) return false;
  if (mm < 1 || mm > 12) return false;
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return false;
  return true;
}

// ─── DateField Component ────────────────────────────────────────────────────

interface DateFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  error?: string;
  className?: string;
}

export const DateField: React.FC<DateFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  min,
  max,
  error: customError,
  className = ''
}) => {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [visibleVal, setVisibleVal] = useState('');
  const [error, setError] = useState('');

  // Sync visible input when value prop changes (Native YYYY-MM-DD -> Visible DD/MM/YYYY)
  useEffect(() => {
    if (value) {
      const d = parseNativeValueToDate(value);
      if (d) {
        setVisibleVal(formatDateToDDMMYYYY(d));
        setError('');
      }
    } else {
      setVisibleVal('');
    }
  }, [value]);

  const openNativePicker = async () => {
    if (disabled || !nativeRef.current) return;
    try {
      if (typeof nativeRef.current.showPicker === 'function') {
        nativeRef.current.showPicker();
        return;
      }
    } catch (err) {
      console.warn('Native showPicker is not supported in this browser, falling back to focus/click.');
    }
    nativeRef.current.focus();
    nativeRef.current.click();
  };

  // Sync native value and visible text on native picker change
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  // Handles manual keyboard entry and auto-formatting
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d/]/g, ''); // keep numbers and slashes
    
    // Auto-inserts slashes
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    
    // Cap length to DD/MM/YYYY (10 chars)
    if (val.length > 10) {
      val = val.substring(0, 10);
    }
    
    setVisibleVal(val);

    if (val.length === 10) {
      if (isValidDDMMYYYY(val)) {
        const nativeVal = parseVisibleToNative(val);
        setError('');
        onChange(nativeVal);
      } else {
        setError('التاريخ غير صحيح');
      }
    } else {
      setError('');
    }
  };

  const handleBlur = () => {
    if (!visibleVal) {
      onChange('');
      setError('');
      return;
    }
    
    if (visibleVal.length < 10 || !isValidDDMMYYYY(visibleVal)) {
      setError('يرجى كتابة التاريخ بصيغة DD/MM/YYYY');
      // Highlight element briefly
    } else {
      setError('');
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && <label className="text-xs text-[var(--nc-text-dim)] font-medium font-bold">{label}</label>}
      
      <div className="relative flex items-center w-full">
        {/* Visible Text Field */}
        <input
          type="text"
          value={visibleVal}
          onChange={handleTextChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-[var(--nc-surface-strong)] border rounded-xl py-2 px-3 pl-10 text-xs text-white outline-none transition-all text-center font-mono tracking-wider ${
            error || customError
              ? 'border-rose-500 focus:border-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
              : 'border-white/10 focus:border-[var(--nc-accent-border)]/50'
          }`}
          dir="ltr"
        />

        {/* Hidden Native Picker Trigger Input */}
        <input
          type="date"
          ref={nativeRef}
          value={value || ''}
          onChange={handleNativeChange}
          disabled={disabled}
          min={min}
          max={max}
          className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
        />

        {/* Icon click trigger */}
        <button
          type="button"
          onClick={openNativePicker}
          disabled={disabled}
          className="absolute left-3.5 top-2.5 text-[var(--nc-text-dim)] font-medium hover:text-white transition-colors cursor-pointer"
          aria-label="فتح التقويم"
        >
          <Calendar size={15} />
        </button>
      </div>

      {(error || customError) && (
        <span className="text-[10px] text-rose-400 flex items-center gap-1">
          <AlertCircle size={10} />
          {error || customError}
        </span>
      )}
    </div>
  );
};

// ─── DateRangeField Component ───────────────────────────────────────────────

interface DateRangeProps {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  labelFrom?: string;
  labelTo?: string;
}

export const DateRangeField: React.FC<DateRangeProps> = ({
  fromDate,
  toDate,
  onChange,
  labelFrom = 'تاريخ البداية',
  labelTo = 'تاريخ النهاية'
}) => {
  const [rangeWarning, setRangeWarning] = useState('');

  const handleFromChange = (newFrom: string) => {
    if (newFrom && toDate) {
      const fromD = parseNativeValueToDate(newFrom);
      const toD = parseNativeValueToDate(toDate);
      if (fromD && toD && fromD > toD) {
        // Swap values and issue alert warning
        onChange(toDate, newFrom);
        setRangeWarning('تم تبديل التواريخ تلقائياً للحفاظ على الترتيب الصحيح.');
        setTimeout(() => setRangeWarning(''), 3000);
        return;
      }
    }
    setRangeWarning('');
    onChange(newFrom, toDate);
  };

  const handleToChange = (newTo: string) => {
    if (fromDate && newTo) {
      const fromD = parseNativeValueToDate(fromDate);
      const toD = parseNativeValueToDate(newTo);
      if (fromD && toD && fromD > toD) {
        // Swap values and issue alert warning
        onChange(newTo, fromDate);
        setRangeWarning('تم تبديل التواريخ تلقائياً للحفاظ على الترتيب الصحيح.');
        setTimeout(() => setRangeWarning(''), 3000);
        return;
      }
    }
    setRangeWarning('');
    onChange(fromDate, newTo);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-row gap-3 w-full">
        <DateField
          value={fromDate}
          onChange={handleFromChange}
          label={labelFrom}
          className="flex-1"
        />
        <DateField
          value={toDate}
          onChange={handleToChange}
          label={labelTo}
          className="flex-1"
        />
      </div>

      {rangeWarning && (
        <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
          <AlertCircle size={11} className="shrink-0" />
          {rangeWarning}
        </span>
      )}
    </div>
  );
};
