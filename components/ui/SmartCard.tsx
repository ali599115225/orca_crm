import React from 'react';

type Elevation = 'elevated' | 'default' | 'subtle';

interface SmartCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevation?: Elevation;
}

const elevationMap: Record<Elevation, string> = {
  elevated: 'nc-card-elevated',
  default: 'nc-card-default',
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
