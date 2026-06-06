import React from 'react';

interface SmartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const SmartCard: React.FC<SmartCardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-none transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default SmartCard;
