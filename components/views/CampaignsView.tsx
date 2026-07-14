"use client";

import CampaignManagementWorkspace from "@/components/marketing/CampaignManagementWorkspace";

export type CampaignStatusKey = "active" | "paused" | "draft";

export interface Campaign {
  id: string;
  name: string;
  nameEn: string;
  platform: string;
  platformUrl: string;
  platformColor: string;
  platformBg: string;
  platformEmoji: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
  statusKey?: CampaignStatusKey;
  status: "نشطة" | "متوقفة" | "مسودة";
  statusEn: "Active" | "Paused" | "Draft";
}

export default function CampaignsView() {
  return <CampaignManagementWorkspace />;
}
