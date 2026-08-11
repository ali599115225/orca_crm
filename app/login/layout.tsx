import type { ReactNode } from 'react';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* EXEC-011 S01 — owner-approved login baseline minor polish only */
        @media (min-width: 640px) {
          .orca-login-card[dir='rtl'] #login-heading {
            font-size: 34px;
            letter-spacing: -0.01em;
          }
        }

        .orca-login-feedback {
          height: 40px;
          margin-top: 4px !important;
        }

        .dark .orca-login-root {
          --login-field-border: rgba(151, 174, 204, .46);
          --login-field-hover: rgba(196, 211, 231, .64);
        }

        .dark .orca-field::placeholder {
          color: rgba(193, 208, 229, .74);
          opacity: 1;
        }

        .orca-login-card label:has(.orca-remember-input) {
          min-height: 44px;
          padding-inline: 2px;
        }

        .orca-login-card label:has(.orca-remember-input) .orca-remember-control {
          flex: 0 0 20px;
        }

        .orca-login-footer {
          font-size: 12.5px;
        }

        @media (max-width: 639px) {
          .orca-login-feedback {
            height: 52px;
            margin-top: 4px !important;
          }

          .orca-login-footer {
            font-size: 12px;
          }
        }
      `}</style>
      {children}
    </>
  );
}
