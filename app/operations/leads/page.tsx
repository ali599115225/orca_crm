import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LeadsWorkspace from "@/components/views/LeadsWorkspace";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <LeadsWorkspace
      viewerRole={String(session.role || "")}
      viewerUserId={String(session.userId || "")}
    />
  );
}
