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

        /* Tablet contract: 640–1279px, including portrait and landscape devices. */
        @media (min-width: 640px) and (max-width: 1279px) {
          .orca-login-card {
            width: min(100%, 500px) !important;
            max-width: 500px !important;
            padding: 26px 28px !important;
            background: #ffffff !important;
            background-image: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }

          .dark .orca-login-card {
            background: #07182d !important;
          }

          .orca-login-card > div {
            max-width: 420px !important;
          }
        }

        /* Tablet portrait: centered card with a stronger scene anchored below it. */
        @media (min-width: 640px) and (max-width: 1279px) and (orientation: portrait) {
          .orca-header-controls,
          .orca-brand {
            transform: none !important;
          }

          .orca-login-stage {
            padding-inline: 40px !important;
          }

          .orca-login-stage > div {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 0 !important;
          }

          .orca-login-card {
            justify-self: center !important;
            transform: none !important;
          }

          .orca-login-scene {
            top: auto !important;
            right: auto !important;
            bottom: 60px !important;
            left: -3% !important;
            width: 112% !important;
            height: auto !important;
            object-position: center bottom !important;
          }
        }

        /* Tablet landscape: preserve a split composition without falling into Desktop styling. */
        @media (min-width: 640px) and (max-width: 1279px) and (orientation: landscape) {
          .orca-header-controls,
          .orca-brand {
            transform: none !important;
          }

          .orca-login-stage {
            padding-inline: 40px !important;
            padding-top: 14px !important;
            padding-bottom: 14px !important;
          }

          .orca-login-stage > div {
            grid-template-columns: minmax(360px, 480px) minmax(0, 1fr) !important;
            gap: clamp(32px, 5vw, 64px) !important;
          }

          .orca-login-card {
            width: min(100%, 480px) !important;
            max-width: 480px !important;
            justify-self: start !important;
            transform: translateY(-8px) !important;
            padding: 24px 28px !important;
          }

          .orca-login-scene {
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: auto !important;
            width: auto !important;
            height: 100% !important;
            object-position: right bottom !important;
          }
        }

        /* Mobile landscape: short-height phones must not inherit tablet proportions. */
        @media (min-width: 640px) and (max-width: 1279px) and (orientation: landscape) and (max-height: 599px) {
          .orca-login-header {
            height: 52px !important;
            padding-inline: 20px !important;
          }

          .orca-header-controls,
          .orca-brand {
            transform: none !important;
          }

          .orca-brand {
            gap: 8px !important;
          }

          .orca-brand-mark {
            width: 27px !important;
            height: 34px !important;
          }

          .orca-brand-word {
            font-size: 24px !important;
          }

          .orca-brand-tagline {
            margin-top: 3px !important;
            font-size: 5.5px !important;
            letter-spacing: .2em !important;
          }

          .orca-login-stage {
            padding: 4px 20px !important;
          }

          .orca-login-stage > div {
            grid-template-columns: minmax(340px, 390px) minmax(0, 1fr) !important;
            gap: 24px !important;
          }

          .orca-login-card {
            width: 100% !important;
            max-width: 390px !important;
            justify-self: start !important;
            transform: none !important;
            border-radius: 20px !important;
            padding: 10px 16px !important;
          }

          .orca-login-card > div {
            max-width: 358px !important;
          }

          .orca-login-card #login-heading {
            font-size: 24px !important;
            line-height: 1.1 !important;
          }

          .orca-login-feedback {
            height: 10px !important;
            margin-top: 0 !important;
          }

          .orca-login-card form > div {
            display: grid !important;
            gap: 5px !important;
          }

          .orca-login-card form > div > * {
            margin-top: 0 !important;
          }

          .orca-login-card form label:not(:has(.orca-remember-input)) {
            margin-bottom: 2px !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
          }

          .orca-field {
            height: 44px !important;
            border-radius: 12px !important;
            font-size: 13px !important;
          }

          .orca-login-card label:has(.orca-remember-input) {
            min-height: 44px !important;
            font-size: 12px !important;
          }

          .orca-submit {
            height: 44px !important;
            margin-top: 0 !important;
            border-radius: 12px !important;
            font-size: 14px !important;
          }

          .orca-login-footer {
            min-height: 48px !important;
            padding: 4px 20px !important;
            font-size: 10px !important;
          }

          .orca-login-footer > div {
            flex-direction: row !important;
            gap: 12px !important;
            font-size: 10px !important;
          }

          .orca-login-footer nav {
            flex-wrap: nowrap !important;
            column-gap: 12px !important;
            row-gap: 4px !important;
          }

          .orca-login-footer svg {
            width: 16px !important;
            height: 16px !important;
          }

          .orca-login-scene {
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            left: auto !important;
            width: auto !important;
            height: 100% !important;
            object-position: right bottom !important;
          }
        }

        /* Mobile: lighter card footprint while retaining touch targets. */
        @media (max-width: 639px) {
          .orca-login-card {
            width: calc(100% - 12px) !important;
            max-width: 520px !important;
            border-radius: 24px !important;
            padding: 24px 20px 22px !important;
            background: var(--login-shell) !important;
          }

          .orca-login-card > div {
            max-width: 100% !important;
          }

          .orca-login-feedback {
            height: 40px !important;
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
