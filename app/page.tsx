import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ComingSoonLanding from "@/app/components/ComingSoonLanding";

export default async function Page() {
  const session = await getSession();
  if (session) redirect("/operations/dashboard");
  return <ComingSoonLanding />;
}
