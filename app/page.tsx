import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import EnterpriseHome from "@/app/components/EnterpriseHome";

export default async function Page() {
  const session = await getSession();
  if (session) redirect("/operations/dashboard");
  return <EnterpriseHome />;
}
