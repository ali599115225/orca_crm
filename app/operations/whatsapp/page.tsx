import { getWhatsAppChatsAction, getCloudAPIStatusAction } from "@/app/actions/whatsapp";
import WhatsAppView from "@/components/views/WhatsAppView";

export default async function WHATSAPPPage() {
  const [chatResult, cloudStatus] = await Promise.all([
    getWhatsAppChatsAction(),
    getCloudAPIStatusAction(),
  ]);

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
