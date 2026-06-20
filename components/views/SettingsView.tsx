// components/views/SettingsView.tsx
'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from '@/app/context/ToastContext';
import { SmartCard } from '@/components/ui/SmartCard';
import SettingsBilling from '@/components/settings/SettingsBilling';
import SettingsStaff from '@/components/settings/SettingsStaff';
import SettingsCompliance from '@/components/settings/SettingsCompliance';
import WhatsAppIntegrationSettings from '@/components/settings/WhatsAppIntegrationSettings';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsViewProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  users?: User[];
}

const TAB_TRANSLATIONS = {
  AR: { title: "حوكمة النظام والإعدادات", desc: "إدارة الاشتراك والموظفين والامتثال", tabBilling: "💳 باقة الاشتراك", tabStaff: "👥 إدارة فريق العمل", tabCompliance: "🔒 الربط والامتثال" },
  EN: { title: "System Settings & Governance", desc: "Manage subscription, staff and compliance", tabBilling: "💳 Subscription Plan", tabStaff: "👥 Staff Management", tabCompliance: "🔒 Compliance" },
};

export default function SettingsView({ tenant, users = [] }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, lang } = useApp();
  const isArabic = lang === 'AR';
  const t = TAB_TRANSLATIONS[lang] || TAB_TRANSLATIONS.AR;

  const [activeTab, setActiveTab] = useState<'billing' | 'staff' | 'compliance'>(
    searchParams.get('tab') === 'compliance' ? 'compliance' : 'billing',
  );

  return (
    <div className="nc-page nc-stack">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--nc-accent-soft)] border border-[var(--nc-accent-border)] text-[var(--nc-text-secondary)] text-xs font-semibold mb-3">
            <i className="ph-bold ph-gear"></i> {isArabic ? "عمليات المنصة والتهيئة" : "System & Client Configurations"}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--nc-foreground)] mb-2">
            {t.title}
          </h1>
          <p className="text-xs md:text-sm text-[var(--nc-foreground-muted)] font-medium">
            {t.desc}
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-[var(--nc-surface)] p-1 rounded-xl border border-[var(--nc-border)] shrink-0">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
            }`}
          >
            {t.tabBilling}
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
            }`}
          >
            {t.tabStaff}
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] shadow-sm'
                : 'text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]'
            }`}
          >
            {t.tabCompliance}
          </button>
        </div>
      </div>

      {/* Tab 1: Billing & Upgrades */}
      {activeTab === 'billing' && (
        <SettingsBilling tenant={tenant} lang={lang} isArabic={isArabic} />
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === 'staff' && (
        <section className="settings-staff-stretch min-h-[620px]">
          <SettingsStaff tenant={tenant} users={users} lang={lang} isArabic={isArabic} />
        </section>
      )}

      {/* Tab 3: Compliance & Connection */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <SettingsCompliance lang={lang} isArabic={isArabic} />
          <WhatsAppIntegrationSettings lang={lang} />
        </div>
      )}

      <style>{`
        .settings-staff-stretch {
          display: block;
          min-height: 620px;
        }

        .settings-staff-stretch > * {
          min-height: inherit;
        }

        .settings-staff-stretch :is(.grid) {
          align-items: stretch;
        }

        .settings-staff-stretch :is(.grid) > * {
          height: 100%;
          min-height: 220px;
        }

        .settings-staff-stretch :is(.nc-card, .smart-card, [data-card], article) {
          height: 100%;
          min-height: 220px;
          display: flex;
          flex-direction: column;
        }

        .settings-staff-stretch :is(.nc-card, .smart-card, [data-card], article) > * {
          min-width: 0;
        }
      `}</style>

    </div>
  );
}
