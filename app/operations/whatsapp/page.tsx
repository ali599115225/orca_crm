import { getWhatsAppChatsAction, getCloudAPIStatusAction } from "@/app/actions/whatsapp";
import WhatsAppView from "@/components/views/WhatsAppView";
import {
  requireWhatsAppAccess,
  WHATSAPP_READ_ROLES,
} from "@/lib/whatsapp/access";
import { redirect } from "next/navigation";

export default async function WHATSAPPPage() {
  const access = await requireWhatsAppAccess(WHATSAPP_READ_ROLES).catch(() => null);
  if (!access) redirect("/login");

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
      currentUserId={access.userId}
    />
  );
}
