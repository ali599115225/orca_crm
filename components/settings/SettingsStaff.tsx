"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SmartCard } from "@/components/ui/SmartCard";
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

  React.useEffect(() => {
    const handleDocClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const totalPages = Math.max(1, Math.ceil(users.length / STAFF_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * STAFF_PAGE_SIZE;
  const visibleUsers = users.slice(startIndex, startIndex + STAFF_PAGE_SIZE);

  const getContractStatus = (endAt?: Date | string | null) => {
    if (!endAt)
      return {
        labelAr: "غير محدد",
        labelEn: "Not Set",
        color: "bg-slate-100 text-slate-600",
      };
    const end = new Date(endAt);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffMonths = diffTime / (1000 * 3600 * 24 * 30.44);

    if (diffMonths < 0)
      return {
        labelAr: "منتهي",
        labelEn: "Expired",
        color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      };
    if (diffMonths <= 1)
      return {
        labelAr: "أقل من شهر",
        labelEn: "< 1 Month",
        color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
      };
    if (diffMonths <= 6)
      return {
        labelAr: "أقل من 6 أشهر",
        labelEn: "< 6 Months",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    return {
      labelAr: "ساري (> 6 أشهر)",
      labelEn: "Valid (> 6m)",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    };
  };

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-[var(--nc-foreground)]">
            {isArabic ? "فريق العمل" : "Staff Directory"}
          </h2>
          <p className="text-sm text-[var(--nc-foreground-muted)]">
            {isArabic
              ? "إدارة موظفي المنشأة وعقودهم وصلاحياتهم"
              : "Manage company employees, contracts, and permissions"}
          </p>
        </div>
        <button
          onClick={() => setIsAddMode(true)}
          className="bg-[var(--nc-accent)] text-slate-950 px-4 py-2 rounded-xl font-bold text-sm"
        >
          {isArabic ? "+ موظف جديد" : "+ New Employee"}
        </button>
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
                className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 text-sm"
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
                className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "المسمى الوظيفي" : "Job Title"}
              </label>
              <input
                name="jobTitle"
                className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "الصلاحية" : "Role"}
              </label>
              <select
                name="role"
                required
                className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 text-sm text-[var(--nc-foreground)]"
              >
                <option className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)]" value="SALES_EMPLOYEE">
                  {isArabic ? "مستشار عقاري" : "Sales Employee"}
                </option>
                <option className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)]" value="SALES_MANAGER">
                  {isArabic ? "مدير مبيعات" : "Sales Manager"}
                </option>
                <option className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)]" value="ADMIN">{isArabic ? "مدير عام" : "Admin"}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--nc-foreground-muted)] mb-1">
                {isArabic ? "كلمة المرور" : "Password"}
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full bg-[var(--nc-surface-strong)] border border-[var(--nc-border)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loadingId === "new"}
                className="bg-[var(--nc-accent)] text-slate-950 px-4 py-2 rounded-lg font-bold text-sm"
              >
                {loadingId === "new" ? "..." : isArabic ? "حفظ" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsAddMode(false)}
                className="bg-[var(--nc-surface-strong)] text-[var(--nc-foreground)] px-4 py-2 rounded-lg font-bold text-sm border border-[var(--nc-border)]"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </form>
        </SmartCard>
      )}

      <SmartCard className="overflow-hidden">
        <table className="w-full table-fixed text-sm text-start">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[25%]" />
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
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-bold transition-all text-xs"
                    >
                      {isArabic ? "عرض التفاصيل" : "Details"}
                    </button>
                    <span className="text-[var(--nc-border)]">|</span>
                    <button
                      onClick={() => { void handleToggleStatus(u); }}
                      disabled={loadingId === u.id}
                      className={`font-bold transition-all text-xs disabled:opacity-50 ${
                        u.isActive ? 'text-amber-600 hover:text-amber-500' : 'text-emerald-600 hover:text-emerald-500'
                      }`}
                    >
                      {u.isActive ? (isArabic ? "تعطيل" : "Disable") : (isArabic ? "تفعيل" : "Activate")}
                    </button>
                    <span className="text-[var(--nc-border)]">|</span>
                    <button
                      onClick={() => { void handleDelete(u); }}
                      disabled={loadingId === u.id}
                      className="text-rose-600 hover:text-rose-500 font-bold transition-all text-xs disabled:opacity-50"
                    >
                      {isArabic ? "حذف" : "Delete"}
                    </button>
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

        {/* Pagination - 5 rows exactly */}
        {users.length > 0 && (
          <div className="flex items-center justify-between border-t border-[var(--nc-border)] px-5 py-3 bg-[var(--nc-surface)]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-50"
            >
              {isArabic ? "السابق" : "Previous"}
            </button>
            <span className="text-xs font-bold text-[var(--nc-foreground-muted)]">
              {isArabic ? "صفحة" : "Page"} {currentPage}{" "}
              {isArabic ? "من" : "of"} {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-surface-strong)] text-xs font-bold text-[var(--nc-foreground)] disabled:opacity-50"
            >
              {isArabic ? "التالي" : "Next"}
            </button>
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
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[var(--nc-foreground-muted)] hover:text-[var(--nc-foreground)]"
              >
                ✕
              </button>
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
              <div className="grid grid-cols-3 border-b border-[var(--nc-border)] pb-2">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "الدور والصلاحيات:" : "Role & Permissions:"}
                </dt>
                <dd className="col-span-2 text-[var(--nc-foreground)]">
                  {ROLE_TRANSLATIONS[lang][
                    selectedUser.role as keyof typeof ROLE_TRANSLATIONS.EN
                  ] || selectedUser.role}
                </dd>
              </div>
              <div className="grid grid-cols-3 pt-2 items-center">
                <dt className="text-[var(--nc-foreground-muted)] font-bold">
                  {isArabic ? "حالة العقد:" : "Contract Status:"}
                </dt>
                <dd className="col-span-2">
                  <span
                    className={`px-2.5 py-1 rounded border text-xs font-bold ${getContractStatus(selectedUser.contractEndAt).color}`}
                  >
                    {isArabic
                      ? getContractStatus(selectedUser.contractEndAt).labelAr
                      : getContractStatus(selectedUser.contractEndAt).labelEn}
                  </span>
                </dd>
              </div>
            </dl>
          </SmartCard>
        </div>
      )}
    </div>
  );
}
