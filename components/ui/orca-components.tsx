import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, ...props }) => {
  const variants = {
    primary: "nc-btn nc-btn-primary",
    secondary: "nc-btn nc-btn-ghost",
  };
  return (
    <button className={`${variants[variant]}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`nc-glass ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{text: string, color?: 'blue' | 'green' | 'yellow'}> = ({ text, color = 'blue' }) => {
  const colors = {
    blue: 'nc-badge nc-badge-info',
    green: 'nc-badge nc-badge-success',
    yellow: 'nc-badge nc-badge-warning',
  };
  return <span className={colors[color]}>{text}</span>;
};

export const DataTable: React.FC<{columns: any[], data: any[]}> = ({ columns, data }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-right border-collapse">
      <thead>
        <tr className="border-b border-[rgba(0,229,255,0.08)] text-[#B0CCE0] font-medium text-sm">
          {columns.map((col, i) => <th key={i} className="pb-4 font-normal px-4">{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-[rgba(0,229,255,0.06)] hover:bg-white/[0.03] transition-colors">
            {columns.map((col, j) => <td key={j} className="py-4 px-4 text-[#E2EEF5] font-bold">{row[col.accessor]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
