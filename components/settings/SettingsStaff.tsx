"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SmartCard } from "@/components/ui/SmartCard";
import {
  OperationsDialog,
  OperationsFormField,
  OperationsTextField,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
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
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !email || password.length < 8) {
      setNotice({
        type: "error",
        text: isArabic
          ? "أدخل الاسم والبريد وكلمة مرور من 8 أحرف على الأقل."
          : "Enter name, email, and a password of at least 8 characters.",
      });
      return;
    }

    setLoadingId("new");
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

      <OperationsDialog
        open={isAddMode}
        onClose={() => loadingId !== "new" && setIsAddMode(false)}
        title={isArabic ? "إضافة موظف" : "Add Employee"}
        description={
          isArabic
            ? "أدخل بيانات الموظف وحدد الصلاحية قبل الحفظ."
            : "Enter employee details and select the role before saving."
        }
        closeLabel={isArabic ? "إغلاق" : "Close"}
        closeDisabled={loadingId === "new"}
        dir={isArabic ? "rtl" : "ltr"}
        className="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              disabled={loadingId === "new"}
              onClick={() => setIsAddMode(false)}
              className={operationsVisual.secondaryButton}
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              form="settings-add-employee-form"
              disabled={loadingId === "new"}
              className={operationsVisual.primaryButton}
            >
              {loadingId === "new" ? "..." : isArabic ? "حفظ" : "Save"}
            </button>
          </>
        }
      >
        <form
          id="settings-add-employee-form"
          onSubmit={handleAddEmployee}
          noValidate
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <OperationsFormField label={isArabic ? "الاسم" : "Name"}>
            <OperationsTextField name="name" autoComplete="name" />
          </OperationsFormField>

          <OperationsFormField label={isArabic ? "البريد الإلكتروني" : "Email"}>
            <OperationsTextField type="email" name="email" autoComplete="email" />
          </OperationsFormField>

          <OperationsFormField label={isArabic ? "المسمى الوظيفي" : "Job Title"}>
            <OperationsTextField name="jobTitle" />
          </OperationsFormField>

          <OperationsFormField label={isArabic ? "الصلاحية" : "Role"}>
            <SettingsSelect
              name="role"
              className="w-full"
              aria-label={isArabic ? "الصلاحية" : "Role"}
              value={newEmployeeRole}
              onChange={setNewEmployeeRole}
              options={[
                { value: "SALES_EMPLOYEE", label: ROLE_TRANSLATIONS[lang].SALES_EMPLOYEE },
                { value: "SALES_MANAGER", label: ROLE_TRANSLATIONS[lang].SALES_MANAGER },
                { value: "ADMIN", label: ROLE_TRANSLATIONS[lang].ADMIN },
                { value: "MARKETING", label: ROLE_TRANSLATIONS[lang].MARKETING },
                { value: "READ_ONLY", label: ROLE_TRANSLATIONS[lang].READ_ONLY },
              ]}
            />
          </OperationsFormField>

          <OperationsFormField
            label={isArabic ? "كلمة المرور" : "Password"}
            hint={isArabic ? "8 أحرف على الأقل" : "At least 8 characters"}
            className="md:col-span-2"
          >
            <OperationsTextField
              type="password"
              name="password"
              autoComplete="new-password"
            />
          </OperationsFormField>
        </form>
      </OperationsDialog>

      <SmartCard className="orca-workspace-panel relative z-0 overflow-hidden">
        <div className="overflow-x-auto">
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
              <th className="px-4 py-2.5 text-start font-bold truncate">
                {isArabic ? "الموظف" : "Employee"}
              </th>
              <th className="px-4 py-2.5 text-start font-bold truncate">
                {isArabic ? "المسمى الوظيفي" : "Job Title"}
              </th>
              <th className="px-4 py-2.5 text-start font-bold truncate">
                {isArabic ? "البريد الإلكتروني" : "Email"}
              </th>
              <th className="px-4 py-2.5 text-start font-bold truncate">
                {isArabic ? "الحالة" : "Status"}
              </th>
              <th className="px-4 py-2.5 text-start font-bold">
                {isArabic ? "الإجراءات" : "Actions"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--nc-border)]">
            {visibleUsers.map((u) => (
              <tr key={u.id} className="orca-data-row">
                <td className="px-4 py-2 font-bold text-[var(--nc-foreground)] truncate">
                  {displayPerson(u.name, isArabic ? "ar" : "en", { route: "/operations/settings" })}
                </td>
                <td className="orca-table-secondary px-4 py-2 text-[var(--nc-foreground-muted)] truncate">
                  {u.jobTitle || "—"}
                </td>
                <td className="orca-table-secondary px-4 py-2 font-en text-[var(--nc-foreground-muted)] truncate">
                  {u.email}
                </td>
                <td className="px-4 py-2 truncate">
                  <span
                    className={`orca-table-badge px-2 py-1 rounded-md font-bold border ${u.isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}
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
                <td className="px-4 py-2 text-start">
                  <div className="orca-table-row-actions flex items-center gap-2">
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
            {visibleUsers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-[var(--nc-foreground-muted)]"
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
          <div className="flex items-center justify-between border-t border-[var(--nc-border)] px-4 py-2.5 bg-[var(--nc-surface)]">
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

      <OperationsDialog
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={isArabic ? "تفاصيل الموظف" : "Employee Details"}
        description={
          selectedUser
            ? `${selectedUser.name} · ${ROLE_TRANSLATIONS[lang][selectedUser.role as keyof typeof ROLE_TRANSLATIONS.EN] || selectedUser.role}`
            : undefined
        }
        closeLabel={isArabic ? "إغلاق" : "Close"}
        dir={isArabic ? "rtl" : "ltr"}
        footer={
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className={operationsVisual.secondaryButton}
          >
            {isArabic ? "إغلاق" : "Close"}
          </button>
        }
      >
        {selectedUser ? (
          <dl className="grid gap-2">
            {[
              [isArabic ? "الاسم" : "Name", selectedUser.name],
              [isArabic ? "المسمى الوظيفي" : "Job Title", selectedUser.jobTitle || "—"],
              [isArabic ? "القسم" : "Department", selectedUser.department || "—"],
              [isArabic ? "رقم الجوال" : "Phone", selectedUser.phone || "—"],
              [
                isArabic ? "الدور والصلاحيات" : "Role & Permissions",
                ROLE_TRANSLATIONS[lang][
                  selectedUser.role as keyof typeof ROLE_TRANSLATIONS.EN
                ] || selectedUser.role,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className={operationsVisual.contentCard + " grid grid-cols-[140px_minmax(0,1fr)] gap-3 p-3"}
              >
                <dt className="text-xs font-bold text-[var(--nc-text-dim)]">{label}</dt>
                <dd className="text-xs font-black text-[var(--nc-text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </OperationsDialog>

    </div>
  );
}
