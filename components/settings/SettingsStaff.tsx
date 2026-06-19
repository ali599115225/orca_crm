// components/settings/SettingsStaff.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenantUserAction, updateTenantUserAction, deleteTenantUserAction } from '@/app/actions/users';
import { useApp } from '@/app/context/AppContext';
import { useAuth } from '@/app/context/AuthContext';
import { SmartCard } from '@/components/ui/SmartCard';
import { toast } from '@/app/context/ToastContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsStaffProps {
  tenant: {
    companyName: string;
    subscriptionPlan: string;
  };
  users: User[];
  lang: 'AR' | 'EN';
  isArabic: boolean;
}

const PLAN_LIMITS: Record<string, number> = {
  basic: 2,
  silver: 10,
  gold: 99999,
};

const STAFF_PAGE_SIZE = 5;

const ROLE_TRANSLATIONS = {
  AR: {
    ADMIN: "المدير العام (Admin)",
    SALES_MANAGER: "مدير المبيعات",
    SALES_EMPLOYEE: "مستشار عقاري",
    MARKETING: "إدارة التسويق",
    READ_ONLY: "مشاهدة فقط",
  },
  EN: {
    ADMIN: "General Manager (Admin)",
    SALES_MANAGER: "Sales Manager",
    SALES_EMPLOYEE: "Real Estate Consultant",
    MARKETING: "Marketing Department",
    READ_ONLY: "Read Only",
  }
};

const TRANSLATIONS = {
  AR: {
    successMsg: "تم إضافة الموظف الجديد بنجاح وتفعيل حسابه بالنظام.",
    addStaffTitle: "إضافة موظف عقاري جديد",
    staffName: "الاسم الكامل *",
    staffEmail: "البريد الإلكتروني المعتمد *",
    staffRole: "دور الصلاحية والنفاذ *",
    roleEmployee: "مستشار عقاري (مبيعات)",
    roleManager: "مدير مبيعات",
    roleMarketing: "إدارة تسويق",
    roleReadOnly: "مشاهدة فقط",
    roleAdmin: "المدير العام (Admin)",
    staffPassword: "كلمة المرور الافتراضية *",
    staffSubmit: "إنشاء حساب الموظف ➔",
    editStaffTitle: "تعديل صلاحيات الموظف: ",
    editStaffSave: "اعتماد وتحديث إعدادات المنشأة",
    editStaffCancel: "✕ إلغاء",
    editStaffName: "الاسم الكامل",
    editStaffRole: "دور الصلاحية",
    actionCreatePrep: "جاري إنشاء الحساب...",
    staffTableTitle: "جدول الموظفين النشطين بالشركة",
    staffTableId: "المعرف",
    staffTableEmail: "البريد والتسجيل",
    staffTableStatus: "حالة الحساب",
    staffTableActions: "إجراءات",
    statusActive: "نشط",
    statusInactive: "معطل",
    btnToggleDeactivate: "تعطيل",
    btnToggleActivate: "تفعيل",
    btnEdit: "تعديل الصلاحية",
    btnDelete: "حذف نهائي",
    confirmDelete: "هل أنت متأكد من رغبتك في حذف هذا الموظف نهائياً من شركتك العقارية؟",
    loadingAction: "جاري...",
    staffCapacityTitle: "حالة مقاعد الموظفين بالباقة",
    staffActiveSeats: "المقاعد النشطة:",
    unlimited: "لا محدود",
    paginationPrevious: "السابق",
    paginationNext: "التالي",
    paginationPage: "صفحة",
    paginationOf: "من",
    paginationShowing: "عرض",
  },
  EN: {
    successMsg: "New employee added successfully and account activated.",
    addStaffTitle: "Add New Employee",
    staffName: "Full Name *",
    staffEmail: "Verified Email *",
    staffRole: "Role & Permissions *",
    roleEmployee: "Real Estate Consultant (Sales)",
    roleManager: "Sales Manager",
    roleMarketing: "Marketing Department",
    roleReadOnly: "Read Only",
    roleAdmin: "General Manager (Admin)",
    staffPassword: "Default Password *",
    staffSubmit: "Create Staff Account ➔",
    editStaffTitle: "Edit Employee Permissions: ",
    editStaffSave: "Save Changes",
    editStaffCancel: "✕ Cancel",
    editStaffName: "Full Name",
    editStaffRole: "Role",
    actionCreatePrep: "Creating account...",
    staffTableTitle: "Active Company Employee Ledger",
    staffTableId: "ID",
    staffTableEmail: "Email & Registration Date",
    staffTableStatus: "Account Status",
    staffTableActions: "Actions",
    statusActive: "Active",
    statusInactive: "Inactive",
    btnToggleDeactivate: "Deactivate",
    btnToggleActivate: "Activate",
    btnEdit: "Edit Permissions",
    btnDelete: "Delete Account",
    confirmDelete: "Are you sure you want to permanently delete this employee from your workspace?",
    loadingAction: "Loading...",
    staffCapacityTitle: "Staff Seat Allocation",
    staffActiveSeats: "Active seats:",
    unlimited: "Unlimited",
    paginationPrevious: "Previous",
    paginationNext: "Next",
    paginationPage: "Page",
    paginationOf: "of",
    paginationShowing: "Showing",
  }
};

export default function SettingsStaff({ tenant, users, lang, isArabic }: SettingsStaffProps) {
  const router = useRouter();
  const { role: currentUserRole } = useAuth();
  const t = TRANSLATIONS[lang] || TRANSLATIONS.AR;

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [staffPage, setStaffPage] = useState(1);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toArabicNumerals = (num: string | number | undefined | null): string => {
    if (num === undefined || num === null) return "";
    let str = num.toString();
    if (!isArabic) return str;
    const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
    return str
      .replace(/[0-9]/g, (w) => arabicDigits[parseInt(w)])
      .replace(/%/g, "٪");
  };

  const plan = (tenant.subscriptionPlan || "basic").toLowerCase() as "basic" | "silver" | "gold";
  const limit = PLAN_LIMITS[plan] || 2;
  const currentUsersCount = users.length;
  const isLimitReached = currentUsersCount >= limit;
  const staffPageCount = Math.max(1, Math.ceil(users.length / STAFF_PAGE_SIZE));
  const currentStaffPage = Math.min(staffPage, staffPageCount);
  const staffStartIndex = (currentStaffPage - 1) * STAFF_PAGE_SIZE;
  const staffEndIndex = Math.min(staffStartIndex + STAFF_PAGE_SIZE, users.length);
  const visibleUsers = users.slice(staffStartIndex, staffEndIndex);

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoadingCreate(true);

    const formData = new FormData(e.currentTarget);
    const result = await createTenantUserAction(formData);
    setLoadingCreate(false);

    if (result.success) {
      setSuccess(t.successMsg);
      (e.target as HTMLFormElement).reset();
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "عذراً، فشل إنشاء حساب الموظف." : "Sorry, failed to create employee account."));
    }
  };

  const handleToggleStatus = async (user: User) => {
    setSuccess(null);
    setError(null);
    setLoadingActionId(user.id);

    const formData = new FormData();
    formData.append("name", user.name);
    formData.append("role", user.role);
    formData.append("isActive", (!user.isActive).toString());

    const result = await updateTenantUserAction(user.id, formData);
    setLoadingActionId(null);

    if (result.success) {
      const toggleMsg = isArabic
        ? `تم ${user.isActive ? 'تعطيل' : 'تفعيل'} حساب الموظف بنجاح.`
        : `Employee account has been successfully ${user.isActive ? 'deactivated' : 'activated'}.`;
      setSuccess(toggleMsg);
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تعديل حالة الموظف." : "Failed to toggle employee status."));
    }
  };

  const handleEditRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    setSuccess(null);
    setError(null);
    setLoadingActionId(editingUser.id);

    const formData = new FormData(e.currentTarget);
    formData.append("isActive", editingUser.isActive.toString());

    const result = await updateTenantUserAction(editingUser.id, formData);
    setLoadingActionId(null);
    setEditingUser(null);

    if (result.success) {
      setSuccess(isArabic ? "تم تحديث صلاحيات وبيانات الموظف بنجاح." : "Employee permissions updated successfully.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل تعديل بيانات الموظف." : "Failed to update employee details."));
    }
  };

  const handleDeleteEmployee = async (userId: string) => {
    setConfirmDeleteId(userId);
  };

  const confirmDeleteEmployee = async () => {
    if (!confirmDeleteId) return;
    setSuccess(null);
    setError(null);
    setLoadingActionId(confirmDeleteId);

    const result = await deleteTenantUserAction(confirmDeleteId);
    setLoadingActionId(null);
    setConfirmDeleteId(null);

    if (result.success) {
      setSuccess(isArabic ? "تم حذف حساب الموظف بالكامل وتحرير مقعد في باقتك." : "Employee account deleted successfully.");
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || (isArabic ? "فشل عملية حذف الموظف." : "Failed to delete employee account."));
    }
  };

  return (
    <>      
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

        {/* Create new employee form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          <SmartCard className="p-6 shadow-sm space-y-4">
            <div className="border-b border-[var(--nc-border)] pb-3 flex justify-between items-center">
              <h3 className="text-[var(--nc-foreground)] font-bold text-base">{t.addStaffTitle}</h3>
              <span className="text-xs font-bold bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] border border-[var(--nc-border)] px-2.5 py-1 rounded-full font-en">
                {toArabicNumerals(currentUsersCount)} / {limit === 99999 ? t.unlimited : toArabicNumerals(limit)} {t.staffActiveSeats}
              </span>
            </div>

            {isLimitReached ? (
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 text-xs font-semibold leading-relaxed">
                {isArabic
                  ? `⚠️ لقد استنفدت كامل مقاعد الموظفين المتاحة لباقة ${plan === 'basic' ? 'الباقة الأساسية' : plan === 'silver' ? 'الباقة الفضية' : 'الباقة الذهبية'}. قم بترقية اشتراكك لفتح مقاعد إضافية.`
                  : `⚠️ You have used all available seats for the ${plan === 'basic' ? 'Basic' : plan === 'silver' ? 'Silver' : 'Gold'} plan. Please upgrade to unlock more slots.`}
              </div>
            ) : (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.staffName}</label>
                  <input
                    type="text"
                    name="name"
                    required
                    aria-label={t.staffName}
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.staffEmail}</label>
                  <input
                    type="email"
                    name="email"
                    required
                    aria-label={t.staffEmail}
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.staffRole}</label>
                  <select
                    name="role"
                    required
                    aria-label={t.staffRole}
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                  >
                    <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                    <option value="SALES_MANAGER">{t.roleManager}</option>
                    <option value="MARKETING">{t.roleMarketing}</option>
                    <option value="READ_ONLY">{t.roleReadOnly}</option>
                    <option value="ADMIN">{t.roleAdmin}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-xs font-semibold mb-2">{t.staffPassword}</label>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="••••••••"
                    aria-label={t.staffPassword}
                    className="w-full rounded-xl bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-4 py-3 text-sm text-[var(--nc-foreground)] focus:outline-none focus:border-[var(--nc-accent-border)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingCreate}
                  className="w-full py-3.5 rounded-xl bg-[var(--nc-accent)] hover:bg-[var(--nc-accent-hover)] text-[var(--nc-foreground)] font-bold text-sm transition-colors mt-4 cursor-pointer hover:shadow-md disabled:opacity-55"
                >
                  {loadingCreate ? t.actionCreatePrep : t.staffSubmit}
                </button>
              </form>
            )}
          </SmartCard>

          {/* Edit User Modal/Form Overlay */}
          {editingUser && (
            <SmartCard className="p-6 shadow-md" style={{borderColor: "rgba(99,102,241,0.25)"}}>
              <div className="border-b border-[var(--nc-border)] pb-3 flex justify-between items-center">
                <h4 className="text-indigo-550 dark:text-indigo-400 font-bold text-sm">{t.editStaffTitle} {editingUser.name}</h4>
                <button onClick={() => setEditingUser(null)} className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)] cursor-pointer text-sm">✕</button>
              </div>
              <form onSubmit={handleEditRole} className="space-y-4">
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-semibold mb-1">{t.editStaffName}</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingUser.name}
                    aria-label={t.editStaffName}
                    className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--nc-foreground-muted)] text-[10px] font-semibold mb-1">{t.editStaffRole}</label>
                  <select
                    name="role"
                    required
                    defaultValue={editingUser.role}
                    aria-label={t.editStaffRole}
                    className="w-full rounded-lg bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] px-3 py-2 text-xs text-[var(--nc-foreground)] focus:outline-none"
                  >
                    <option value="SALES_EMPLOYEE">{t.roleEmployee}</option>
                    <option value="SALES_MANAGER">{t.roleManager}</option>
                    <option value="MARKETING">{t.roleMarketing}</option>
                    <option value="READ_ONLY">{t.roleReadOnly}</option>
                    <option value="ADMIN">{t.roleAdmin}</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-755 text-[var(--nc-foreground)] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer">{t.editStaffSave}</button>
                  <button type="button" onClick={() => setEditingUser(null)} className="bg-[var(--nc-surface)] text-[var(--nc-foreground-muted)] px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer">{t.editStaffCancel}</button>
                </div>
              </form>
            </SmartCard>
          )}
        </div>

        {/* Active staff ledger table (7 cols) */}
        <SmartCard className="lg:col-span-7 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--nc-border)] bg-[var(--nc-surface)]">
            <h2 className="text-[var(--nc-foreground)] font-bold text-base">{t.staffTableTitle}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-xs ${isArabic ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-[var(--nc-border)] text-[var(--nc-foreground-muted)] bg-[var(--nc-surface)]">
                  <th className="p-3 font-semibold text-center w-14">{t.staffTableId}</th>
                  <th className="p-3 font-semibold">{t.staffName}</th>
                  <th className="p-3 font-semibold">{t.staffTableEmail}</th>
                  <th className="p-3 font-semibold text-center">{t.staffTableStatus}</th>
                  <th className="p-3 font-semibold text-center w-48">{t.staffTableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--nc-border)] text-[var(--nc-foreground-muted)]">
                {visibleUsers.map((u, idx) => {
                  const number = staffStartIndex + idx + 1;
                  const isProcessing = loadingActionId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--nc-surface)] transition-colors">
                      <td className="p-3 text-center font-en">{toArabicNumerals(number)}</td>
                      <td className="p-3 font-bold text-[var(--nc-foreground)]">
                        {u.name}
                        <span className="text-[10px] text-[var(--nc-foreground-muted)] block font-bold font-sans mt-0.5">
                          {ROLE_TRANSLATIONS[lang]?.[u.role as keyof typeof ROLE_TRANSLATIONS.EN] || u.role}
                        </span>
                      </td>
                      <td className="p-3 font-en">
                        {u.email}
                        <span className="text-[9px] text-[var(--nc-foreground-muted)] block mt-0.5">
                          {toArabicNumerals(new Date(u.createdAt).toLocaleDateString())}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          u.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {u.isActive ? t.statusActive : t.statusInactive}
                        </span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setEditingUser(u)}
                            disabled={isProcessing}
                            className="text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 font-bold transition-all px-2 py-1 rounded bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] cursor-pointer"
                          >
                            {t.btnEdit}
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isProcessing}
                            className={`font-bold transition-all px-2 py-1 rounded bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] cursor-pointer ${
                              u.isActive ? 'text-amber-600 hover:text-amber-500' : 'text-emerald-600 hover:text-emerald-500'
                            }`}
                          >
                            {u.isActive ? t.btnToggleDeactivate : t.btnToggleActivate}
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(u.id)}
                            disabled={isProcessing}
                            className="text-rose-600 hover:text-rose-500 font-bold transition-all px-2 py-1 rounded bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] cursor-pointer"
                          >
                            {t.btnDelete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length > STAFF_PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-[var(--nc-border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold text-[var(--nc-foreground-muted)]">
                {t.paginationShowing} {toArabicNumerals(staffStartIndex + 1)}-{toArabicNumerals(staffEndIndex)} {t.paginationOf} {toArabicNumerals(users.length)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStaffPage((page) => Math.max(1, page - 1))}
                  disabled={currentStaffPage <= 1}
                  className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-2 text-[11px] font-bold text-[var(--nc-foreground)] transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {t.paginationPrevious}
                </button>
                <span className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-3 py-2 text-[11px] font-bold text-[var(--nc-foreground)]">
                  {t.paginationPage} {toArabicNumerals(currentStaffPage)} {t.paginationOf} {toArabicNumerals(staffPageCount)}
                </span>
                <button
                  type="button"
                  onClick={() => setStaffPage((page) => Math.min(staffPageCount, page + 1))}
                  disabled={currentStaffPage >= staffPageCount}
                  className="rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface)] px-3 py-2 text-[11px] font-bold text-[var(--nc-foreground)] transition disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {t.paginationNext}
                </button>
              </div>
            </div>
          )}
        </SmartCard>

      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)}></div>
          <div className="relative bg-[var(--nc-surface-strong)] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-right text-xs">
            <h3 className="text-base font-extrabold text-rose-400 border-b border-white/5 pb-2">{isArabic ? 'تأكيد حذف الموظف' : 'Confirm Delete Employee'}</h3>
            <p className="text-[var(--nc-text-dim)]">{t.confirmDelete}</p>
            <div className="flex gap-2 pt-2">
              <button onClick={confirmDeleteEmployee} disabled={loadingActionId === confirmDeleteId} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all">{loadingActionId === confirmDeleteId ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'تأكيد الحذف' : 'Delete')}</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 bg-[var(--nc-surface)] border border-white/5 text-[var(--nc-text-dim)] rounded-xl transition-all">{isArabic ? 'إلغاء' : 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
