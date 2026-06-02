import React from 'react';
import RentalView from '@/components/views/RentalView';

// منع الكاش الميت وإجبار السيرفر على الرندرة الديناميكية النقية لصفحة الـ HTML
export const dynamic = 'force-dynamic';

export default function RentalOperationsPage() {
  return (
    <div className="w-full min-h-screen p-4 md:p-6 bg-[#0b1120]">
      <RentalView />
    </div>
  );
}