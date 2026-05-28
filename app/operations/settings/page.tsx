import React from 'react';
import { getActiveTenant } from '@/lib/tenant';
import { getSession } from '@/lib/session';
import { getTenantUsersAction } from '@/app/actions/users';
import SettingsView from './SettingsView';

export const metadata = {
  title: 'إعدادات النظام والترقيات - أوركا',
};

export default async function SettingsPage() {
  const tenant = await getActiveTenant();
  const session = await getSession();
  const users = await getTenantUsersAction();
  const currentUserRole = session?.role || "READ_ONLY";
  
  return (
    <SettingsView 
      tenant={{
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscriptionPlan,
        extraAgents: tenant.extraAgents || 0,
      }} 
      users={users}
      currentUserRole={currentUserRole}
    />
  );
}