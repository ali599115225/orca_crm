'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// استدعاء مباشر وحصري للملف الفعلي الموجود في الشجرة بدون حرف s زائد
const RentalViewComponent = dynamic(() => import('@/components/views/RentalView'), {
  ssr: false,
});

export default function RentalPage() {
  return <RentalViewComponent />;
}
