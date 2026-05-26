// app/operations/settings/page.tsx
import React from 'react';
import { getActiveTenant } from '@/lib/tenant';
import SettingsView from './SettingsView';

export const metadata = {
  title: 'إعدادات النظام والترقيات - أوركا',
};

export default async function SettingsPage() {
  const tenant = await getActiveTenant();
  
  return (
    <SettingsView 
      tenant={{
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscriptionPlan,
        extraAgents: tenant.extraAgents || 0,
      }} 
    />
  );
}