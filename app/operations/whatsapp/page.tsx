import { getWhatsAppChatsAction, getCloudAPIStatusAction } from "@/app/actions/whatsapp";
import WhatsAppView from "@/components/views/WhatsAppView";
import { requireAuth } from "@/lib/api-auth-guard";

export default async function WHATSAPPPage() {
  const session = await requireAuth();

  let chatResult: any = { success: false, chats: [], tenant: null, warning: null };
  let cloudStatus: any = { configured: false, provider: "none", source: "none", status: "disconnected", error: null };

  try { chatResult = await getWhatsAppChatsAction(); } catch { chatResult.warning = "فشل تحميل المحادثات"; }
  try { cloudStatus = await getCloudAPIStatusAction(); } catch { cloudStatus.error = "تعذر التحقق من مزود واتساب"; }

  const chats = chatResult.success && chatResult.chats ? chatResult.chats : [];
  const tenant = {
    companyName: (chatResult.success && chatResult.tenant?.companyName) || "المنشأة",
    whatsappConnected: cloudStatus.configured && (cloudStatus.status === "connected" || cloudStatus.status === "test-mode"),
  };

  return (
    <WhatsAppView
      initialChats={chats}
      tenant={tenant}
      cloudStatus={cloudStatus}
      warning={chatResult.warning || null}
      currentUserId={session?.userId || null}
    />
  );
}
