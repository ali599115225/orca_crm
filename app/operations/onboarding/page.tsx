import { Building2, CheckCircle2, FileText, MapPin, Phone } from "lucide-react";
import { getActiveTenant } from "@/lib/tenant";
import { redirect } from "next/navigation";
import {
  OperationsKpiGrid,
  OperationsMetricCard,
  OperationsPageHeader,
  OperationsPanel,
  OperationsPanelHeader,
} from "@/components/operations";
import { operationsVisual } from "@/features/operations/visual";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = {
  title: "خطوة التفعيل النهائية - ORCA",
};

export default async function OnboardingPage() {
  const tenant = await getActiveTenant();
  const rawCompanyName = tenant?.companyName || "";
  const isNewTenant =
    rawCompanyName === "" ||
    rawCompanyName === "منشأة جديدة قيد التأسيس" ||
    rawCompanyName.includes("قيد التأسيس");

  if (!isNewTenant) redirect("/operations");

  return (
    <main className={operationsVisual.page} dir="rtl" data-onboarding-rebuild-v1>
      <div className={operationsVisual.pageStack}>
        <OperationsPageHeader
          eyebrow="المنشأة → التحقق → التفعيل"
          title="إكمال بيانات المنشأة"
          description="أكمل البيانات الأساسية مرة واحدة لتفعيل لوحة العمليات وربط التقارير والفواتير بهوية المنشأة."
          icon={Building2}
        />

        <OperationsKpiGrid>
          <OperationsMetricCard title="هوية المنشأة" value="1" description="الاسم الرسمي" icon={Building2} />
          <OperationsMetricCard title="الموقع" value="1" description="المدينة الرئيسية" icon={MapPin} />
          <OperationsMetricCard title="التواصل" value="1" description="رقم إداري" icon={Phone} />
          <OperationsMetricCard title="الوثيقة" value="1" description="سجل أو عمل حر" icon={FileText} />
        </OperationsKpiGrid>

        <OperationsPanel className="mx-auto w-full max-w-3xl overflow-hidden">
          <OperationsPanelHeader
            title="بيانات التفعيل"
            description="جميع الحقول مطلوبة لإكمال التفعيل."
            icon={CheckCircle2}
          />
          <div className="p-4">
            <OnboardingForm />
          </div>
        </OperationsPanel>
      </div>
    </main>
  );
}
