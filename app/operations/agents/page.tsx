// app/operations/agents/page.tsx
// 🤖 لوحة HUD للوكلاء الذكيين - Server Component
import React from "react";
import { getAgentSlotsAction, getUsageMetersAction } from "@/app/actions/agentSlots";
import AgentsHudView from "./AgentsHudView";
import { getActiveTenant } from "@/lib/tenant";

export const metadata = {
  title: "لوحة وكلاء الذكاء الاصطناعي - HUD",
  description: "مركز تحكم وكلاء ساهر وسند والرصد المباشر لبنية النظام السحابية",
};

export default async function AgentsPage() {
  const [slotsResult, metersResult, tenant] = await Promise.all([
    getAgentSlotsAction(),
    getUsageMetersAction(),
    getActiveTenant(),
  ]);

  return (
    <AgentsHudView
      slots={slotsResult.success ? slotsResult.slots ?? [] : []}
      meters={metersResult.success ? metersResult.meters ?? [] : []}
      maxSlots={slotsResult.maxSlots ?? 1}
      activeCount={slotsResult.activeCount ?? 0}
      isAtCap={slotsResult.isAtCap ?? false}
      plan={(slotsResult.plan as string) ?? "basic"}
      tenant={{
        companyName: tenant?.companyName ?? "",
        subscriptionPlan: tenant?.subscriptionPlan ?? "basic",
        extraAgents: tenant?.extraAgents ?? 0,
      }}
    />
  );
}
