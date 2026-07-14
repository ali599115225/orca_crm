"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SmartCard } from "@/components/ui/SmartCard";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsSelect from "@/components/settings/SettingsSelect";
import {
  updateTenantUserAction,
  deleteTenantUserAction,
  createTenantUserAction,
} from "@/app/actions/users";
import { displayPerson } from "@/lib/display";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  contractStartAt?: Date | string | null;
  contractEndAt?: Date | string | null;
  createdAt: Date | string;
}

interface SettingsStaffProps {
  tenant: {
    companyName: string;
    subscriptionPlan: string;
  };
  users: User[];
  lang: "AR" | "EN";
  isArabic: boolean;
}

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
  },
};

export default function SettingsStaff({
  tenant,
  users,
  lang,
  isArabic,
}: SettingsStaffProps) {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newEmployeeRole, setNewEmployeeRole] = useState("SALES_EMPLOYEE");

  React.useEffect(() => {
    const handleDocClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const totalPages = Math.max(1, Math.ceil(users.length / STAFF_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * STAFF_PAGE_SIZE;
  const visibleUsers = users.slice(startIndex, startIndex + STAFF_PAGE_SIZE);



  const handleToggleStatus = async (user: User) => {
    setLoadingId(user.id);
    const formData = new FormData();
    formData.append("name", user.name);
    formData.append("role", user.role);
    formData.append("isActive", (!user.isActive).toString());

    const result = await updateTenantUserAction(user.id, formData);
    if (result.success) {
      setNotice({
        type: "success",
        text: isArabic
          ? "تم تحديث الحالة بنجاح"
          : "Status updated successfully",
      });
      router.refresh();
    } else {
      setNotice({
        type: "error",
        text: result.error || "Failed to update status",
      });
    }
    setLoadingId(null);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(isArabic ? "تأكيد حذف الموظف؟" : "Confirm delete employee?"))
      return;
    setLoadingId(user.id);
    const result = await deleteTenantUserAction(user.id);
    if (result.success) {
      setNotice({
        type: "success",
        text: isArabic ? "تم الحذف بنجاح" : "Deleted successfully",
      });
      router.refresh();
    } else {
      setNotice({ type: "error", text: result.error || "Failed to delete" });
    }
    setLoadingId(null);
    setSelectedUser(null);
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingId("new");
    const formData = new FormData(e.currentTarget);
    const result = await createTenantUserAction(formData);

    if (result.success) {
      setNotice({
        type: "success",
        text: isArabic
          ? "تم إضافة الموظف بنجاح"
          : "Employee added successfully",
      });
      setIsAddMode(false);
      setNewEmployeeRole("SALES_EMPLOYEE");
      router.refresh();
    } else {
      setNotice({
        type: "error",
        text: result.error || "Failed to add employee",
      });
    }
    setLoadingId(null);
  };

  return (
    <div className="orca-settings-section orca-settings-staff-section">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--nc-foreground)]">
            {isArabic ? "فريق العمل" : "Staff Directory"}
          </h2>
          <p className="text-sm font-medium leading-6 text-[var(--nc-foreground-secondary)]">
            {isArabic
              ? "إدارة موظفي المنشأة وعقودهم وصلاحياتهم"
              : "Manage company employees, contracts, and permissions"}
          </p>
        </div>
        <SettingsButton variant="primary" onClick={() => setIsAddMode(true)}>
          {isArabic ? "+ موظف جديد" : "+ New Employee"}
        </SettingsButton>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-xl text-sm font-bold border ${notice.type === "success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}
        >
          {notice.text}
        </div>
      )}

      {isAddMode && (
        <SmartCard className="p-6">
          <h3 className="font-bold text-lg mb-4">
            {isArabic ? "إضافة موظف" : "Add Employee"}
          </h3>
          <form
            onSubmit={handleAddEmployee}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "الاسم" : "Name"}
              </label>
              <input
                name="name"
                required
                className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                type="email"
                name="email"
                required
                className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "المسمى الوظيفي" : "Job Title"}
              </label>
              <input
                name="jobTitle"
                className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "الصلاحية" : "Role"}
              </label>
              <SettingsSelect
                name="role"
                className="w-full"
                aria-label={isArabic ? "الصلاحية" : "Role"}
                value={newEmployeeRole}
                onChange={setNewEmployeeRole}
                options={[
                  { value: "SALES_EMPLOYEE", label: isArabic ? "مستشار عقاري" : "Sales Employee" },
                  { value: "SALES_MANAGER", label: isArabic ? "مدير مبيعات" : "Sales Manager" },
                  { value: "ADMIN", label: isArabic ? "مدير عام" : "Admin" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "كلمة المرور" : "Password"}
              </label>
              <input
                type="password"
                name="password"
                required
                className="h-11 w-full rounded-xl border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] px-4 text-sm text-[var(--nc-foreground)] transition-colors focus:border-[var(--nc-accent-border)] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <SettingsButton variant="primary" type="submit" disabled={loadingId === "new"}>
                {loadingId === "new" ? "..." : isArabic ? "حفظ" : "Save"}
              </SettingsButton>
              <SettingsButton variant="secondary" onClick={() => setIsAddMode(false)}>
                {isArabic ? "إلغاء" : "Cancel"}
              </SettingsButton>
            </div>
          </form>
        </SmartCard>
      )}

      <SmartCard className="orca-workspace-panel relative z-0 overflow-hidden">
        <div className="min-h-[400px] overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-start text-sm">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[18%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
              <col className="w-[22%]" />
            </colgroup>
          <thead className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground-muted)] border-b border-[var(--nc-border)]">
            <tr>
              <th className="px-5 py-3 text-start font-bold truncate">
                {isArabic ? "الموظف" : "Employee"}
              </th>
              <th className="px-5 py-3 text-start font-bold truncate">
                {isArabic ? "المسمى الوظيفي" : "Job Title"}
              </th>
              <th className="px-5 py-3 text-start font-bold truncate">
                {isArabic ? "البريد الإلكتروني" : "Email"}
              </th>
              <th className="px-5 py-3 text-start font-bold truncate">
                {isArabic ? "الحالة" : "Status"}
              </th>
              <th className="px-5 py-3 text-start font-bold">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nc-border)]">
            {visibleUsers.map((u) => (
              <tr key={u.id} className="hover:bg-[var(--nc-surface)]">
                <td className="px-5 py-4 font-bold text-[var(--nc-foreground)] truncate">
                  {displayPerson(u.name, isArabic ? "ar" : "en", { route: "/operations/settings" })}
                </td>
                <td className="px-5 py-4 text-[var(--nc-foreground-muted)] truncate">
                  {u.jobTitle || "—"}
                </td>
                <td className="px-5 py-4 font-en text-[var(--nc-foreground-muted)] text-xs truncate">
                  {u.email}
                </td>
                <td className="px-5 py-4 truncate">
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border ${u.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}
                  >
                    {u.isActive
                      ? isArabic
                        ? "نشط"
                        : "Active"
                      : isArabic
                        ? "معطل"
                        : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-4 text-start">
                  <div className="flex items-center gap-2">
                    <SettingsButton variant="ghost" onClick={() => setSelectedUser(u)}>
                      {isArabic ? "عرض التفاصيل" : "Details"}
                    </SettingsButton>
                    <SettingsButton
                      variant="secondary"
                      onClick={() => { void handleToggleStatus(u); }}
                      disabled={loadingId === u.id}
                    >
                      {u.isActive ? (isArabic ? "تعطيل" : "Disable") : (isArabic ? "تفعيل" : "Activate")}
                    </SettingsButton>
                    <SettingsButton
                      variant="danger"
                      onClick={() => { void handleDelete(u); }}
                      disabled={loadingId === u.id}
                    >
                      {isArabic ? "حذف" : "Delete"}
                    </SettingsButton>
                  </div>
                </td>
              </tr>
            ))}
            {visibleUsers.length > 0 && visibleUsers.length < STAFF_PAGE_SIZE && (
              Array.from({ length: STAFF_PAGE_SIZE - visibleUsers.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-[65px] bg-transparent">
                  <td colSpan={5}></td>
                </tr>
              ))
            )}
            {visibleUsers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-[var(--nc-foreground-muted)] h-[325px]"
                >
                  {isArabic ? "لا يوجد موظفين" : "No staff members"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination - 5 rows exactly */}
        {users.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--nc-border)] px-5 py-3 bg-[var(--nc-surface)]">
            <SettingsButton
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              {isArabic ? "السابق" : "Previous"}
            </SettingsButton>
            <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
              {isArabic ? "صفحة" : "Page"} {currentPage}{" "}
              {isArabic ? "من" : "of"} {totalPages}
            </span>
            <SettingsButton
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              {isArabic ? "التالي" : "Next"}
            </SettingsButton>
          </div>
        )}
      </SmartCard>

      {/* Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <SmartCard className="w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-[var(--nc-border)] pb-4 mb-4">
              <h3 className="text-lg font-black text-[var(--nc-foreground)]">
                {isArabic ? "تفاصيل الموظف" : "Employee Details"}
              </h3>
              <SettingsButton
                variant="icon"
                onClick={() => setSelectedUser(null)}
                aria-label={isArabic ? "إغلاق" : "Close"}
              >
                ×
              </SettingsButton>
            </div>

            <dl className="space-y-4 text-sm">
              <div className="grid grid-cols-3 border-b border-[var(--nc-border)] pb-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "الاسم:" : "Name:"}
                </dt>
                <dd className="col-span-2 font-bold text-[var(--nc-foreground)]">
                  {selectedUser.name}
                </dd>
              </div>
              <div className="grid grid-cols-3 border-b border-[var(--nc-border)] pb-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "المسمى الوظيفي:" : "Job Title:"}
                </dt>
                <dd className="col-span-2 text-[var(--nc-foreground)]">
                  {selectedUser.jobTitle || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 border-b border-[var(--nc-border)] pb-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "القسم:" : "Department:"}
                </dt>
                <dd className="col-span-2 text-[var(--nc-foreground)]">
                  {selectedUser.department || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 border-b border-[var(--nc-border)] pb-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "رقم الجوال:" : "Phone:"}
                </dt>
                <dd className="col-span-2 text-[var(--nc-foreground)]">
                  {selectedUser.phone || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-3 pt-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "الدور والصلاحيات:" : "Role & Permissions:"}
                </dt>
                <dd className="col-span-2 text-[var(--nc-foreground)]">
                  {ROLE_TRANSLATIONS[lang][
                    selectedUser.role as keyof typeof ROLE_TRANSLATIONS.EN
                  ] || selectedUser.role}
                </dd>
              </div>
            </dl>
          </SmartCard>
        </div>
      )}
    </div>
  );
}
