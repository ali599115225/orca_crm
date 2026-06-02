'use client';

import React from 'react';
import SettingsView from "@/components/views/SettingsView";

export default function SETTINGSPage() {
  // تحضير بيانات مستأجر افتراضية متوافقة مع الخصائص المطلوبة في الواجهة
  const mockTenant = {
    id: "tenant-abaad",
    name: "مؤسسة أبعاد السكنية",
    slug: "abaad",
    plan: "SUPER",
    status: "ACTIVE"
  };

  return <SettingsView tenant={mockTenant} />;
}
