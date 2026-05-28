import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import CorporateHomeClient from "./components/CorporateHomeClient";

export const metadata = {
  title: "ORCA CRM — الجيل الجديد من إدارة العقارات",
  description: "المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة.",
};

export default async function CorporateHomePage() {
  let companyName = "منصة ORCA العقارية";
  let host = "";
  
  try {
    const headersList = await headers();
    host = headersList.get("host") || "";
    
    const domainParts = host.split(".");
    let currentSubdomain = "orca";
    const isVercelDomain = host.endsWith(".vercel.app");

    if (domainParts.length > 2 && !isVercelDomain) {
      currentSubdomain = domainParts[0];
    }

    const isMainDomain = currentSubdomain === "orca" || currentSubdomain === "www" || currentSubdomain === "dar-al-amar" || currentSubdomain === "orca-crm";

    if (!isMainDomain) {
      const tenant = await getActiveTenant(host);
      companyName = tenant.companyName || "منصة ORCA العقارية";
    }
  } catch (e) {
    // خطوة أمان بديلة
  }

  return <CorporateHomeClient host={host} companyName={companyName} />;
}