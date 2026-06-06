import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, ...props }) => {
  const variants = {
    primary: "ds-btn ds-btn-primary",
    secondary: "ds-btn ds-btn-secondary",
  };
  return (
    <button className={`${variants[variant]}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`ds-card ds-p-lg ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{text: string, color?: 'blue' | 'green' | 'yellow'}> = ({ text, color = 'blue' }) => {
  const colors = {
    blue: 'ds-badge ds-badge-info',
    green: 'ds-badge ds-badge-success',
    yellow: 'ds-badge ds-badge-warning',
  };
  return <span className={colors[color]}>{text}</span>;
};

export const DataTable: React.FC<{columns: any[], data: any[]}> = ({ columns, data }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-right border-collapse">
      <thead>
        <tr className="border-b border-[#A7C7E7]/20 dark:border-slate-700 text-[var(--ds-text-secondary)] font-medium text-sm">
          {columns.map((col, i) => <th key={i} className="pb-4 font-normal px-4">{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 dark:border-[#A7C7E7]/20 hover:bg-slate-50 dark:hover:bg-[#1C2B48]/50 orca-transition">
            {columns.map((col, j) => <td key={j} className="py-4 px-4 text-[var(--ds-text-primary)] font-bold">{row[col.accessor]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
