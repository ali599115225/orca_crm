// app/login/page.tsx
import React from "react";
import { headers } from "next/headers";
import { getActiveTenant } from "@/lib/tenant";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "بوابة دخول المستشار العقاري - أوركا CRM",
};

export default async function LoginPage() {
  let tenantName = "منصة ORCA العقارية";
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
      tenantName = tenant.companyName || "منصة ORCA العقارية";
    }
  } catch (e) {
    // قيمة بديلة في حال تعذر قراءة النطاق الفرعي
  }

  return <LoginClient tenantName={tenantName} host={host} />;
}
