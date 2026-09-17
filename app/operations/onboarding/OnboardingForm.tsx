"use client";

import SettingsSelect from "@/components/settings/SettingsSelect";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import {
  OperationsFormField,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("الرياض");
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await completeOnboardingAction(formData);
    setLoading(false);

    if (result.success) {
      setSuccess("تم تفعيل وتحديث ملف منشأتك العقارية بنجاح. جاري الانتقال إلى لوحة العمليات…");
      window.setTimeout(() => {
        router.refresh();
        router.push("/operations");
      }, 1500);
    } else {
      setError(result.error || "حدث خطأ غير متوقع.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4" data-onboarding-form-contract>
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300">
          {success}
        </div>
      ) : null}

      <OperationsFormField label="الاسم الرسمي والكامل للمنشأة العقارية">
        <OperationsTextField
          name="companyName"
          required
          placeholder="مثال: شركة صرح الوطن العقارية"
        />
      </OperationsFormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <OperationsFormField label="المدينة (المقر الرئيسي)">
          <SettingsSelect name="city" className="orca-operations-input" value={city} onChange={(value) => setCity(value)}
            options={[{ value: "الرياض", label: "الرياض" },
              { value: "جدة", label: "جدة" },
              { value: "الدمام", label: "الدمام" },
              { value: "مكة المكرمة", label: "مكة المكرمة" },
              { value: "الخبر", label: "الخبر" }]}
          />
        </OperationsFormField>

        <OperationsFormField label="هاتف التواصل الإداري">
          <OperationsTextField
            type="tel"
            name="phone"
            required
            inputMode="tel"
            placeholder="05xxxxxxxx"
            dir="ltr"
          />
        </OperationsFormField>
      </div>

      <OperationsFormField label="رقم السجل التجاري أو وثيقة العمل الحر">
        <OperationsTextField
          name="documentNumber"
          required
          placeholder="مثال: FL-837482"
          dir="ltr"
        />
      </OperationsFormField>

      <button type="submit" disabled={loading} className={`${operationsVisual.primaryButton} w-full`}>
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Building2 aria-hidden="true" />}
        {loading ? "جاري تفعيل المنشأة…" : "تنشيط لوحة العمليات"}
      </button>
    </form>
  );
}
