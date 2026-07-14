"use client";

import CampaignsView, { Campaign } from "@/components/views/CampaignsView";

interface MarketingCampaignsProps {
  lang: string;
  isArabic: boolean;
  addTelemetryEvent: (type: string, payload?: unknown) => void;
  campaignsList: Campaign[];
  platformFilter: string | null;
  setPlatformFilter: (filter: string | null) => void;
}

export type { MarketingCampaignsProps };

export default function MarketingCampaigns(
  _props: MarketingCampaignsProps,
) {
  return (
    <div className="animate-[ncFadeIn_0.3s_ease]">
      <CampaignsView />
    </div>
  );
}
