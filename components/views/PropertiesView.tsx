'use client';

import React, { useState } from 'react';
import PropertyList from '../properties/PropertyList';
import PropertyDetail from '../properties/PropertyDetail';
import { useAuth } from '@/app/context/AuthContext';

export default function PropertiesView() {
  const { hasPermission } = useAuth();
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
        lang="AR"
        isArabic={true}
      />
    );
  }

  return (
    <PropertyList
      onSelectProperty={(id) => setSelectedPropertyId(id)}
      hasPermission={hasPermission}
      addTelemetryEvent={addTelemetryEvent}
      lang="AR"
      isArabic={true}
    />
  );
}
