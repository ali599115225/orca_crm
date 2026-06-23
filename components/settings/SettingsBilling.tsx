"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { initiateSubscriptionPaymentAction } from "@/app/actions/payment";
import { SmartCard } from "@/components/ui/SmartCard";

interface SettingsBillingProps {
  tenant: {
    companyName: string;
    subdomain: string;
    subscriptionPlan: string;
    extraAgents: number;
  };
  lang: "AR" | "EN";
  isArabic: boolean;
}

type BillingPlan = "basic" | "silver" | "gold";

interface PlanCard {
  id: BillingPlan;
  price: number;
  staff: string;
  leads: string;
  projects: string;
  agents: string;
  whatsapp: boolean;
}

const PLAN_ORDER: Record<BillingPlan, number> = {
  basic: 1,
  silver: 2,
  gold: 3,
};

const PLANS: PlanCard[] = [
  {
    id: "basic",
    price: 450,
    staff: "2",
    leads: "100",
    projects: "2",
    agents: "1",
    whatsapp: false,
  },
  {
    id: "silver",
    price: 900,
    staff: "10",
    leads: "1,000",
    projects: "10",
    agents: "2",
    whatsapp: false,
  },
  {
    id: "gold",
    price: 2400,
    staff: "∞",
    leads: "∞",
    projects: "∞",
    agents: "5",
    whatsapp: true,
  },
];

function normalizeBillingPlan(value: string): BillingPlan {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "gold" ||
    normalized === "diamond" ||
    normalized === "platinum" ||
    normalized === "super"
  ) {
    return "gold";
  }

  if (
    normalized === "silver" ||
    normalized === "pro" ||
    normalized === "professional"
  ) {
    return "silver";
  }

  return "basic";
}

export default function SettingsBilling({
  tenant,
  lang,
  isArabic,
}: SettingsBillingProps) {
  const searchParams = useSearchParams();
  const currentPlan = normalizeBillingPlan(tenant.subscriptionPlan);
  const locale = isArabic ? "ar-SA" : "en-US";

  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSuccess(searchParams.get("success"));
    setError(searchParams.get("error"));
  }, [searchParams]);

  const currentPlanLabel = useMemo(() => {
    if (currentPlan === "gold") {
      return isArabic ? "الباقة الذهبية" : "Gold Plan";
    }
    if (currentPlan === "silver") {
      return isArabic ? "الباقة الفضية" : "Silver Plan";
    }
    return isArabic ? "الباقة الأساسية" : "Basic Plan";
  }, [currentPlan, isArabic]);

  const planName = (plan: BillingPlan) => {
    if (plan === "gold") return isArabic ? "الباقة الذهبية" : "Gold Plan";
    if (plan === "silver") return isArabic ? "الباقة الفضية" : "Silver Plan";
    return isArabic ? "الباقة الأساسية" : "Basic Plan";
  };

  const startUpgrade = async (targetPlan: BillingPlan) => {
    setLoadingPlan(targetPlan);
    setSuccess(null);
    setError(null);

    const result = (await initiateSubscriptionPaymentAction(targetPlan)) as {
      success: boolean;
      paymentUrl?: string;
      error?: string;
    };

    setLoadingPlan(null);

    if (result.success && result.paymentUrl) {
      window.location.href = result.paymentUrl;
      return;
    }

    setError(
      result.error ||
        (isArabic
          ? "تعذر بدء عملية الدفع."
          : "Unable to initialize payment."),
    );
  };

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      <SmartCard className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--nc-foreground-muted)]">
              {isArabic ? "الباقة الحالية" : "Current Plan"}
            </p>
            <h2 className="mt-2 text-xl font-black text-[var(--nc-foreground)]">
              {currentPlanLabel}
            </h2>
          </div>

          <span className="rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--nc-foreground)]">
            {isArabic ? "اشتراك نشط" : "Active Subscription"}
          </span>
        </div>
      </SmartCard>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--nc-foreground)]">
            {isArabic ? "الباقات المتاحة" : "Available Plans"}
          </h2>
          <p className="mt-1 text-xs text-[var(--nc-foreground-muted)]">
            {isArabic
              ? "قارن الباقات واختر الترقية المناسبة للمنشأة."
              : "Compare plans and choose the appropriate upgrade."}
          </p>
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isUpgrade =
              PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];
            const disabled = isCurrent || !isUpgrade || loadingPlan !== null;

            return (
              <SmartCard
                key={plan.id}
                className={
                  isCurrent
                    ? "flex min-h-[360px] flex-col justify-between border-[var(--nc-accent-border)] p-6"
                    : "flex min-h-[360px] flex-col justify-between p-6"
                }
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-black text-[var(--nc-foreground)]">
                      {planName(plan.id)}
                    </h3>
                    {isCurrent && (
                      <span className="rounded-full border border-[var(--nc-accent-border)] bg-[var(--nc-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--nc-foreground)]">
                        {isArabic ? "الحالية" : "Current"}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-2xl font-black text-[var(--nc-foreground)]">
                    {new Intl.NumberFormat(locale, {
                      style: "currency",
                      currency: "SAR",
                      maximumFractionDigits: 0,
                    }).format(plan.price)}
                    <span className="ms-1 text-xs font-semibold text-[var(--nc-foreground-muted)]">
                      {isArabic ? "شهريًا" : "monthly"}
                    </span>
                  </p>

                  <dl className="mt-6 space-y-3 border-t border-[var(--nc-border)] pt-5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "أعضاء الفريق" : "Team Members"}
                      </dt>
                      <dd className="font-bold text-[var(--nc-foreground)]">
                        {plan.staff}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "العملاء المحتملون" : "Leads"}
                      </dt>
                      <dd className="font-bold text-[var(--nc-foreground)]">
                        {plan.leads}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "المشاريع" : "Projects"}
                      </dt>
                      <dd className="font-bold text-[var(--nc-foreground)]">
                        {plan.projects}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "الوكلاء المشمولون" : "Included Agents"}
                      </dt>
                      <dd className="font-bold text-[var(--nc-foreground)]">
                        {plan.agents}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--nc-foreground-muted)]">
                        {isArabic ? "تكامل واتساب" : "WhatsApp Integration"}
                      </dt>
                      <dd className="font-bold text-[var(--nc-foreground)]">
                        {plan.whatsapp
                          ? isArabic
                            ? "مشمول"
                            : "Included"
                          : isArabic
                            ? "غير مشمول"
                            : "Not Included"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void startUpgrade(plan.id)}
                  className={
                    isUpgrade && !isCurrent
                      ? "mt-6 w-full rounded-xl bg-[var(--nc-accent)] px-4 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      : "mt-6 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 py-3 text-sm font-bold text-[var(--nc-foreground-muted)] disabled:cursor-not-allowed disabled:opacity-70"
                  }
                >
                  {loadingPlan === plan.id
                    ? isArabic
                      ? "جارٍ التحضير..."
                      : "Preparing..."
                    : isCurrent
                      ? isArabic
                        ? "الباقة الحالية"
                        : "Current Plan"
                      : isUpgrade
                        ? isArabic
                          ? "ترقية الباقة"
                          : "Upgrade Plan"
                        : isArabic
                          ? "غير متاح للخفض"
                          : "Downgrade Unavailable"}
                </button>
              </SmartCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}