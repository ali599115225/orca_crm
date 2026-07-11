'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_ARCHITECT'
  | 'ADMIN'
  | 'SALES_MANAGER'
  | 'SALES_EMPLOYEE'
  | 'MARKETING'
  | 'READ_ONLY'
  | 'rental_manager'
  | 'accountant'
  | 'owner';

const FULL_ACCESS = [
  'CREATE_UNIT',
  'BOOK_UNIT',
  'START_HANDOVER',
  'UPDATE_STATUS',
  'VIEW_FINANCE',
  'CREATE_PROJECT',
  'ADD_PHASE',
  'UPDATE_UNIT',
  'CREATE_BOOKING',
  'POST_PROGRESS',
  'UPLOAD_DOC',
  'CREATE_OPPORTUNITY',
  'CREATE_OFFER',
  'CALC_MORTGAGE',
  'SCHEDULE_VISIT',
  'CONTACT_AGENT',
  'CREATE_LEASE',
  'CREATE_INVOICE',
  'PAY_INVOICE',
  'REQUEST_SETTLEMENT',
  'MANAGE_RECONCILE',
] as const;

export const PERMISSIONS: Record<UserRole, readonly string[]> = {
  SUPER_ADMIN: FULL_ACCESS,
  PLATFORM_ARCHITECT: FULL_ACCESS,
  ADMIN: FULL_ACCESS,
  SALES_MANAGER: [
    'BOOK_UNIT',
    'UPDATE_STATUS',
    'ADD_PHASE',
    'UPDATE_UNIT',
    'CREATE_BOOKING',
    'UPLOAD_DOC',
    'CREATE_OPPORTUNITY',
    'CREATE_OFFER',
    'CALC_MORTGAGE',
    'SCHEDULE_VISIT',
    'CONTACT_AGENT',
    'CREATE_LEASE',
    'CREATE_INVOICE',
    'PAY_INVOICE',
    'REQUEST_SETTLEMENT',
    'MANAGE_RECONCILE',
  ],
  SALES_EMPLOYEE: [
    'BOOK_UNIT',
    'UPDATE_UNIT',
    'CREATE_BOOKING',
    'UPLOAD_DOC',
    'CREATE_OPPORTUNITY',
    'CREATE_OFFER',
    'CALC_MORTGAGE',
    'SCHEDULE_VISIT',
    'CONTACT_AGENT',
  ],
  MARKETING: ['UPLOAD_DOC', 'CALC_MORTGAGE', 'SCHEDULE_VISIT'],
  READ_ONLY: [],
  rental_manager: ['CALC_MORTGAGE', 'SCHEDULE_VISIT', 'VIEW'],
  accountant: ['CALC_MORTGAGE', 'VIEW'],
  owner: ['VIEW'],
};

interface AuthContextType {
  role: UserRole;
  hasPermission: (action: string) => boolean;
  loading: boolean;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialRole?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeRole(value: string | null | undefined): UserRole {
  if (value && Object.prototype.hasOwnProperty.call(PERMISSIONS, value)) {
    return value as UserRole;
  }
  return 'READ_ONLY';
}

export function AuthProvider({ children, initialRole }: AuthProviderProps) {
  const [role, setRole] = useState<UserRole>(() => normalizeRole(initialRole));

  useEffect(() => {
    setRole(normalizeRole(initialRole));
  }, [initialRole]);

  const hasPermission = useCallback(
    (action: string): boolean => PERMISSIONS[role].includes(action),
    [role],
  );

  return (
    <AuthContext.Provider value={{ role, hasPermission, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
