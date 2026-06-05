import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, ...props }) => {
  const baseClass = "orca-focus px-4 py-2 rounded-lg font-medium orca-transition flex items-center gap-2 cursor-pointer";
  const variants = {
    primary: "bg-brand-interactive text-[#1C2B48] hover:bg-brand-interactive-hover shadow-sm font-bold",
    secondary: "bg-white dark:bg-[#151f32] border border-slate-350 dark:border-brand-border text-slate-700 dark:text-brand-text-secondary hover:bg-slate-50 dark:hover:bg-brand-bg shadow-sm"
  };
  return (
    <button className={`${baseClass} ${variants[variant]}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`orca-panel-light orca-transition p-6 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{text: string, color?: 'blue' | 'green' | 'yellow'}> = ({ text, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[color]}`}>{text}</span>;
};

export const DataTable: React.FC<{columns: any[], data: any[]}> = ({ columns, data }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-right border-collapse">
      <thead>
        <tr className="border-b border-[#A7C7E7]/20 dark:border-slate-700 text-[#C4D8E5] font-medium text-sm">
          {columns.map((col, i) => <th key={i} className="pb-4 font-normal px-4">{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 dark:border-[#A7C7E7]/20 hover:bg-slate-50 dark:hover:bg-[#1C2B48]/50 orca-transition">
            {columns.map((col, j) => <td key={j} className="py-4 px-4 text-[#E8ECEF] font-bold dark:text-slate-200">{row[col.accessor]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
