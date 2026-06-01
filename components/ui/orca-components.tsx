import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', icon: Icon, ...props }) => {
  const baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2";
  const variants = {
    primary: "bg-[#df7b62] text-white hover:bg-[#c5654e] shadow-sm",
    secondary: "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
  };
  return (
    <button className={`${baseClass} ${variants[variant]}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-[#151f32] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 ${className}`}>
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
        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-sm">
          {columns.map((col, i) => <th key={i} className="pb-4 font-normal px-4">{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            {columns.map((col, j) => <td key={j} className="py-4 px-4 text-slate-800 dark:text-slate-200">{row[col.accessor]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
