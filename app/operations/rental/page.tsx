'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// الاستيراد الديناميكي الآمن الحامي للـ Build من أخطاء الـ Case Sensitivity
const RentalViewComponent = dynamic(() => 
  import('@/components/views/RentalView').catch(() => import('@/components/views/RentalsView')),
  { ssr: false }
);

export default function RentalPage() {
  return <RentalViewComponent />;
}
