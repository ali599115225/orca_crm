import React from 'react';
import dynamic from 'next/dynamic';

// استخدام الـ Dynamic Import لحماية الـ Build وتفادي أخطاء الـ Case Sensitivity
const RentalComponent = dynamic(() => 
  import('@/components/views/RentalView').catch(() => import('@/components/views/RentalsView')),
  { ssr: false }
);

export default function RentalPage() {
  return <RentalComponent />;
}
