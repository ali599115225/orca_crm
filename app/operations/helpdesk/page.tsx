'use client';

import React from 'react';
import HelpdeskView from "@/components/views/HelpdeskView";

export default function HELPDESKPage() {
  // تمرير مصفوفة فارغة للـ tickets واسم افتراضي للمستأجر لحماية الـ Type Validation
  return <HelpdeskView initialTickets={[]} tenantName="مؤسسة أبعاد السكنية" />;
}
