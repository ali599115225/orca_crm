// app/operations/whatsapp/page.tsx
import React from "react";
import { getMockWhatsAppChatsAction } from "@/app/actions/whatsapp";
import WhatsAppView from "./WhatsAppView";

export const metadata = {
  title: "قناة الواتساب والوكلاء الذكاء الاصطناعي - أوركا",
  description: "محاكاة وربط قناة الواتساب الرسمية لمنصتك وتجربة ردود الوكيل الآلي",
};

export default async function WhatsAppPage() {
  const result = await getMockWhatsAppChatsAction();
  
  const initialChats = result.success && result.chats ? result.chats : [];
  const tenant = result.success && result.tenant ? result.tenant : { companyName: "منصتك العقارية", whatsappConnected: false };

  return (
    <WhatsAppView 
      initialChats={initialChats}
      tenant={tenant}
    />
  );
}
