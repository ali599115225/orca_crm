'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'PLATFORM_ARCHITECT' | 'ADMIN' | 'SALES_MANAGER' | 'SALES_EMPLOYEE' | 'MARKETING' | 'READ_ONLY' | 'rental_manager' | 'accountant' | 'owner';

export const PERMISSIONS: Record<UserRole, string[]> = {
  PLATFORM_ARCHITECT: ['CREATE_UNIT', 'BOOK_UNIT', 'START_HANDOVER', 'UPDATE_STATUS', 'VIEW_FINANCE', 'CREATE_PROJECT', 'ADD_PHASE', 'UPDATE_UNIT', 'CREATE_BOOKING', 'POST_PROGRESS', 'UPLOAD_DOC', 'CREATE_OFFER', 'CALC_MORTGAGE', 'SCHEDULE_VISIT', 'CONTACT_AGENT', 'CREATE_LEASE', 'CREATE_INVOICE', 'PAY_INVOICE', 'REQUEST_SETTLEMENT', 'MANAGE_RECONCILE'],
  ADMIN: ['CREATE_UNIT', 'BOOK_UNIT', 'START_HANDOVER', 'UPDATE_STATUS', 'VIEW_FINANCE', 'CREATE_PROJECT', 'ADD_PHASE', 'UPDATE_UNIT', 'CREATE_BOOKING', 'POST_PROGRESS', 'UPLOAD_DOC', 'CREATE_OFFER', 'CALC_MORTGAGE', 'SCHEDULE_VISIT', 'CONTACT_AGENT', 'CREATE_LEASE', 'CREATE_INVOICE', 'PAY_INVOICE', 'REQUEST_SETTLEMENT', 'MANAGE_RECONCILE'],
  SALES_MANAGER: ['BOOK_UNIT', 'UPDATE_STATUS', 'ADD_PHASE', 'UPDATE_UNIT', 'CREATE_BOOKING', 'UPLOAD_DOC', 'CALC_MORTGAGE', 'SCHEDULE_VISIT', 'CONTACT_AGENT'],
  SALES_EMPLOYEE: ['BOOK_UNIT', 'UPDATE_UNIT', 'CREATE_BOOKING', 'UPLOAD_DOC', 'CALC_MORTGAGE', 'SCHEDULE_VISIT', 'CONTACT_AGENT'],
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('READ_ONLY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole | null;
    if (savedRole && PERMISSIONS[savedRole]) {
      setRole(savedRole);
    }
    setLoading(false);

    const handler = (e: CustomEvent) => {
      const newRole = e.detail as UserRole;
      if (PERMISSIONS[newRole]) {
        setRole(newRole);
        localStorage.setItem('userRole', newRole);
      }
    };
    window.addEventListener('role-change' as any, handler as any);
    return () => window.removeEventListener('role-change' as any, handler as any);
  }, []);

  const hasPermission = useCallback((action: string): boolean => {
    return (PERMISSIONS[role] || []).includes(action);
  }, [role]);

  return (
    <AuthContext.Provider value={{ role, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
