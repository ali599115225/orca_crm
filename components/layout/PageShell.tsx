// components/layout/PageShell.tsx
// NovaCore Universal Page Shell — wraps any page with Cyber-Glassmorphism + HUD layout

import React from "react";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return <div className="nc-shell">{children}</div>;
}

export function PageContainer({ children, title, subtitle, actions }: PageShellProps) {
  return (
    <div className="nc-page">
      {(title || actions) && (
        <div className="nc-header nc-enter">
          <div className="nc-header-row">
            <div>
              {title && <h1 className="nc-title">{title}</h1>}
              {subtitle && <p className="nc-subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="nc-row">{actions}</div>}
          </div>
        </div>
      )}
      <div className="nc-stack">{children}</div>
    </div>
  );
}

export function Section({ children, title, actions, className = "" }: PageShellProps & { className?: string }) {
  return (
    <div className={`nc-section ${className}`}>
      {(title || actions) && (
        <div className="nc-section-header">
          {title && <h2 className="nc-section-title">{title}</h2>}
          {actions && <div className="nc-row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
