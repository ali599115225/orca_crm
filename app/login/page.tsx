// app/login/page.tsx
import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "بوابة دخول المستشار العقاري - أوركا CRM",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session?.userId && session?.tenantId) {
    redirect("/operations");
  }

  let tenantName = "منصة ORCA العقارية";
  let host = "";
  
  try {
    const headersList = await headers();
    host = headersList.get("host") || "";
  } catch (e) {
    // قيمة بديلة في حال تعذر قراءة النطاق
  }

  return <LoginClient tenantName={tenantName} host={host} />;
}
