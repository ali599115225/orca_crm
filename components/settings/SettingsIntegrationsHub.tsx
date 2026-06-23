"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import WhatsAppIntegrationSettings from "@/components/settings/WhatsAppIntegrationSettings";
import { SmartCard } from "@/components/ui/SmartCard";

type ProviderId =
  | "whatsapp"
  | "paylink"
  | "ngenius"
  | "resend"
  | "zatca"
  | "ejar";

interface SettingsIntegrationsHubProps {
  lang: "AR" | "EN";
}

const PROVIDERS: Array<{
  id: ProviderId;
  icon: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  destination: string;
  destinationAr: string;
  destinationEn: string;
}> = [
  {
    id: "whatsapp",
    icon: "ph-whatsapp-logo",
    nameAr: "واتساب للأعمال",
    nameEn: "WhatsApp Business",
    descriptionAr: "المحادثات الواردة والصادرة وربط رقم الشركة.",
    descriptionEn: "Inbound and outbound conversations with company-number connection.",
    destination: "",
    destinationAr: "إدارة الربط",
    destinationEn: "Manage Connection",
  },
  {
    id: "paylink",
    icon: "ph-credit-card",
    nameAr: "Paylink",
    nameEn: "Paylink",
    descriptionAr: "روابط الدفع والتحصيل الإلكتروني ومتابعة العمليات.",
    descriptionEn: "Payment links, online collection, and transaction tracking.",
    destination: "/operations/settings?tab=billing",
    destinationAr: "فتح إعدادات الدفع",
    destinationEn: "Open Payment Settings",
  },
  {
    id: "ngenius",
    icon: "ph-bank",
    nameAr: "N-Genius",
    nameEn: "N-Genius",
    descriptionAr: "بوابة دفع البطاقات ومعالجة نتائج الدفع.",
    descriptionEn: "Card-payment gateway and payment-result processing.",
    destination: "/operations/settings?tab=billing",
    destinationAr: "فتح إعدادات الدفع",
    destinationEn: "Open Payment Settings",
  },
  {
    id: "resend",
    icon: "ph-envelope-simple",
    nameAr: "Resend والبريد",
    nameEn: "Resend & Email",
    descriptionAr: "إرسال البريد التشغيلي والقوالب والإشعارات.",
    descriptionEn: "Operational email, templates, and notifications.",
    destination: "/operations/email",
    destinationAr: "فتح مساحة البريد",
    destinationEn: "Open Email Workspace",
  },
  {
    id: "zatca",
    icon: "ph-receipt",
    nameAr: "هيئة الزكاة والضريبة والجمارك",
    nameEn: "ZATCA",
    descriptionAr: "الفوترة الإلكترونية وشهادات الامتثال الفني.",
    descriptionEn: "Electronic invoicing and technical compliance certificates.",
    destination: "/operations/settings?tab=compliance",
    destinationAr: "فتح الامتثال الحكومي",
    destinationEn: "Open Compliance",
  },
  {
    id: "ejar",
    icon: "ph-buildings",
    nameAr: "إيجار",
    nameEn: "Ejar",
    descriptionAr: "اعتماد العقود الإيجارية ومتابعة بيانات الربط.",
    descriptionEn: "Rental-contract submission and connection management.",
    destination: "/operations/settings?tab=compliance",
    destinationAr: "فتح الامتثال الحكومي",
    destinationEn: "Open Compliance",
  },
];

export default function SettingsIntegrationsHub({
  lang,
}: SettingsIntegrationsHubProps) {
  const isArabic = lang === "AR";
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderId>("whatsapp");

  const selected = useMemo(
    () => PROVIDERS.find((provider) => provider.id === selectedProvider)!,
    [selectedProvider],
  );

  return (
    <div className="space-y-5">
      <SmartCard className="p-6">
        <h2 className="text-lg font-black text-[var(--nc-foreground)]">
          {isArabic ? "مركز التكاملات" : "Integrations Center"}
        </h2>
        <p className="mt-2 text-sm text-[var(--nc-foreground-muted)]">
          {isArabic
            ? "اختر مزودًا لعرض حالة الربط ومسار الإدارة المناسب."
            : "Select a provider to review its connection status and management path."}
        </p>
      </SmartCard>

      <section className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const active = provider.id === selectedProvider;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => setSelectedProvider(provider.id)}
              className={
                active
                  ? "orca-provider-card orca-provider-card-active"
                  : "orca-provider-card"
              }
            >
              <span className="orca-provider-icon">
                <i className={"ph-bold " + provider.icon} aria-hidden="true" />
              </span>
              <span className="min-w-0 text-start">
                <strong>
                  {isArabic ? provider.nameAr : provider.nameEn}
                </strong>
                <small>
                  {isArabic
                    ? provider.descriptionAr
                    : provider.descriptionEn}
                </small>
              </span>
              <span className="orca-provider-state">
                {isArabic ? "إدارة" : "Manage"}
              </span>
            </button>
          );
        })}
      </section>

      {selected.id === "whatsapp" ? (
        <div className="orca-integration-detail">
          <WhatsAppIntegrationSettings lang={lang} />
        </div>
      ) : (
        <SmartCard className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="orca-provider-icon">
                <i className={"ph-bold " + selected.icon} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-black text-[var(--nc-foreground)]">
                  {isArabic ? selected.nameAr : selected.nameEn}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-[var(--nc-foreground-muted)]">
                  {isArabic
                    ? selected.descriptionAr
                    : selected.descriptionEn}
                </p>
              </div>
            </div>

            <Link href={selected.destination} className="orca-primary-button">
              {isArabic
                ? selected.destinationAr
                : selected.destinationEn}
            </Link>
          </div>
        </SmartCard>
      )}
    </div>
  );
}