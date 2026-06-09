import React from 'react';

type Elevation = 'elevated' | 'default' | 'subtle';

interface SmartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevation?: Elevation;
}

const elevationMap: Record<Elevation, string> = {
  elevated: 'nc-card-elevated',
  default: 'card-modern border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-none',
  subtle: 'nc-card-subtle',
};

export const SmartCard: React.FC<SmartCardProps> = ({
  children,
  className = '',
  elevation = 'default',
  ...props
}) => {
  return (
    <div
      className={`${elevationMap[elevation]} transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default SmartCard;
