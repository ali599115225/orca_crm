'use client';

import React from 'react';
import RentalView from '@/components/views/RentalView';

// تحويل الصفحة إلى مكون مرن ومباشر لكسر أي انهيار في السيرفر (Internal Server Error)
export default function RentalOperationsPage() {
  return (
    <div className="w-full min-h-screen p-4 md:p-6 bg-[#0b1120]">
      <RentalView />
    </div>
  );
}