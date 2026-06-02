import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import CorporateHomeClient from "./components/CorporateHomeClient";

export const metadata = {
  title: "ORCA CRM — الجيل الجديد من إدارة العقارات",
  description: "المنصة السحابية المبتكرة التي تدير دورة المبيعات والتحصيل بالكامل عبر طاقم رقمي مستقل يعمل على مدار الساعة.",
};

export default async function CorporateHomePage() {
  let companyName = "منصة ORCA العقارية";
  let host = "";
  let projects: any[] = [];
  
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

    let tenantIdToQuery = null;
    if (!isMainDomain) {
      const tenant = await getActiveTenant(host);
      companyName = tenant.companyName || "منصة ORCA العقارية";
      tenantIdToQuery = tenant.id;
    } else {
      // For main domain, find any active tenant to display demo projects or use fallback
      const demoTenant = await prisma.tenant.findFirst({
        where: { isActive: true }
      });
      if (demoTenant) {
        tenantIdToQuery = demoTenant.id;
      }
    }

    if (tenantIdToQuery) {
      const dbProjects = await prisma.project.findMany({
        where: { tenantId: tenantIdToQuery },
        orderBy: { createdAt: 'desc' }
      });
      projects = dbProjects.map(p => ({
        id: p.id,
        name: p.name,
        city: p.city,
        status: p.status,
        unitsTotal: p.unitsTotal,
        unitsSold: p.unitsSold,
        unitsBooked: p.unitsBooked,
        minPrice: p.minPrice ? Number(p.minPrice) : null,
        maxPrice: p.maxPrice ? Number(p.maxPrice) : null,
      }));
    }
  } catch (e) {
    // خطوة أمان بديلة
  }

  return (
    <CorporateHomeClient 
      host={host} 
      companyName={companyName} 
      initialProjects={projects}
    />
  );
}
