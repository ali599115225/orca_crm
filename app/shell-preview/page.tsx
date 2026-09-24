import OrcaAppShell from "@/components/cleanroom/OrcaAppShell";
import CleanroomDashboard from "@/features/dashboard/components/CleanroomDashboard";
import type { DashboardReadModel } from "@/features/dashboard/model";
import "@/app/operations/orca-shell-cleanroom.css";

const model: DashboardReadModel = {
  generatedAt: "2026-09-21T18:00:00.000Z",
  timezone: "Asia/Riyadh",

  kpis: {
    activeLeads: { status: "ready", data: 24 },
    todayTours: { status: "ready", data: 3 },
    activeOffers: { status: "ready", data: 7 },
    signedContractsThisMonth: { status: "ready", data: 5 },
  },

  pipeline: {
    status: "ready",
    data: {
      stages: [
        { key: "opportunity", count: 12 },
        { key: "tour", count: 7 },
        { key: "offer", count: 5 },
        { key: "contract", count: 3 },
        { key: "closed", count: 8 },
      ],
      total: 35,
      legacyFallbackCount: 0,
    },
  },

  operations: {
    tasks: {
      status: "ready",
      data: {
        total: 3,
        items: [
          {
            id: "preview-task-1",
            title: "متابعة عرض عقاري",
            dueDate: "2026-09-21T17:00:00.000Z",
            priority: "HIGH",
            status: "OVERDUE",
            leadName: "عميل معاينة",
            assignedName: "فريق المبيعات",
            isOverdue: true,
          },
          {
            id: "preview-task-2",
            title: "تأكيد موعد جولة",
            dueDate: "2026-09-22T09:00:00.000Z",
            priority: "MEDIUM",
            status: "PENDING",
            leadName: "عميل معاينة",
            assignedName: "فريق المبيعات",
            isOverdue: false,
          },
        ],
      },
    },

    recentLeads: {
      status: "ready",
      data: {
        newThisWeek: 6,
        items: [
          {
            id: "preview-lead-1",
            firstName: "أحمد",
            lastName: "السالم",
            phone: "0500000000",
            city: "الرياض",
            status: "NEW",
            createdAt: "2026-09-21T12:00:00.000Z",
            projectName: "مشروع سكني",
          },
          {
            id: "preview-lead-2",
            firstName: "سارة",
            lastName: "محمد",
            phone: "0500000000",
            city: "الرياض",
            status: "CONTACTED",
            createdAt: "2026-09-21T11:00:00.000Z",
            projectName: null,
          },
        ],
      },
    },

    whatsapp: {
      status: "ready",
      data: {
        conversationsCount: 18,
        newLeadsCount: 4,
        unreadMessagesCount: 2,
      },
    },
  },
};

export default function ShellPreviewPage() {
  return (
    <OrcaAppShell
      user={{
        name: "مستخدم ORCA",
        email: "preview@orca.local",
        role: "SUPER_ADMIN",
      }}
      companyName="ORCA"
      isSuperAdmin={true}
    >
      <CleanroomDashboard
        user={{ name: "مستخدم ORCA" }}
        model={model}
        capabilities={{ canIssueContract: true }}
        preview
      />
    </OrcaAppShell>
  );
}