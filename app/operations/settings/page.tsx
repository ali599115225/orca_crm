'use client';

import React from 'react';
import SettingsView from "@/components/views/SettingsView";

export default function SETTINGSPage() {
  // تحضير بيانات مستأجر افتراضية متوافقة مع الخصائص المطلوبة في الواجهة
  const mockTenant = {
    companyName: "مؤسسة أبعاد السكنية",
    subdomain: "abaad",
    subscriptionPlan: "SUPER",
    extraAgents: 0,
    growthWarning: false,
  };

  return <SettingsView tenant={mockTenant} />;
}
