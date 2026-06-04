import { getMockWhatsAppChatsAction } from "@/app/actions/whatsapp";
import WhatsAppView from "@/components/views/WhatsAppView";

export default async function WHATSAPPPage() {
  const result = await getMockWhatsAppChatsAction();

  const chats = result.success && result.chats ? result.chats : [];
  const tenant = {
    companyName: (result.success && result.tenant?.companyName) || "مؤسسة أبعاد السكنية",
    whatsappConnected: (result.success && result.tenant?.whatsappConnected) || false,
  };

  return <WhatsAppView initialChats={chats} tenant={tenant} />;
}

