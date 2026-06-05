// app/operations/page.tsx
import { redirect } from "next/navigation";

export default function OperationsPage() {
  redirect("/operations/dashboard");
}