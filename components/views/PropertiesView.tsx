'use client';

import React, { useState } from 'react';
import PropertyList from '../properties/PropertyList';
import PropertyDetail from '../properties/PropertyDetail';
import { useAuth } from '@/app/context/AuthContext';
import { useApp } from '@/app/context/AppContext';

export default function PropertiesView() {
  const { hasPermission } = useAuth();
  const { lang } = useApp();
  const isArabic = lang === 'AR';
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const addTelemetryEvent = (_type: string, _payload?: any) => {
    // Telemetry removed — production cleanup
  };

  if (selectedPropertyId) {
    return (
      <PropertyDetail
        propertyId={selectedPropertyId}
        onBack={() => setSelectedPropertyId(null)}
        hasPermission={hasPermission}
        addTelemetryEvent={addTelemetryEvent}
        lang={lang}
        isArabic={isArabic}
      />
    );
  }

  return (
    <PropertyList
      onSelectProperty={(id) => setSelectedPropertyId(id)}
      hasPermission={hasPermission}
      addTelemetryEvent={addTelemetryEvent}
      lang={lang}
      isArabic={isArabic}
    />
  );
}
