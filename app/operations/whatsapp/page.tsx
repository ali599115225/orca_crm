import { getWhatsAppChatsAction, getCloudAPIStatusAction } from "@/app/actions/whatsapp";
import WhatsAppView from "@/components/views/WhatsAppView";

export default async function WHATSAPPPage() {
  let chatResult: any = { success: false, chats: [], tenant: null, warning: null };
  let cloudStatus: any = { configured: false, provider: "none", status: "disconnected", error: null };

  try { chatResult = await getWhatsAppChatsAction(); } catch { chatResult.warning = "فشل تحميل المحادثات"; }
  try { cloudStatus = await getCloudAPIStatusAction(); } catch { cloudStatus.error = "فشل الاتصال بـ Meta API"; }

  const chats = chatResult.success && chatResult.chats ? chatResult.chats : [];
  const tenant = {
    companyName: (chatResult.success && chatResult.tenant?.companyName) || "مؤسسة أبعاد السكنية",
    whatsappConnected: cloudStatus.configured && cloudStatus.status === "connected",
  };

  return (
    <WhatsAppView
      initialChats={chats}
      tenant={tenant}
      cloudStatus={cloudStatus}
      warning={chatResult.warning || null}
    />
  );
}
