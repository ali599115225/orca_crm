'use client';

import React, { useState } from 'react';
import PropertyList from '../properties/PropertyList';
import PropertyDetail from '../properties/PropertyDetail';
import { useAuth } from '@/app/context/AuthContext';

export default function PropertiesView() {
  const { hasPermission } = useAuth();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([
    {
      id: 'evt_init',
      type: 'units.initialized',
      timestamp: new Date().toISOString(),
      actorId: 'system_core',
      payload: { message: 'تهيئة نظام إدارة سجل الوحدات والعقارات بنجاح' }
    }
  ]);

  const addTelemetryEvent = (type: string, payload?: any) => {
    const newEvt = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      actorId: 'usr_active',
      payload
    };
    setTelemetryLogs(prev => [newEvt, ...prev]);
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
