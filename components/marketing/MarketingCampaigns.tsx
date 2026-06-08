// components/marketing/MarketingCampaigns.tsx
'use client';
import React from 'react';
import CampaignsView, { Campaign } from '@/components/views/CampaignsView';

interface MarketingCampaignsProps {
  lang: 'AR' | 'EN';
  isArabic: boolean;
  addTelemetryEvent: (type: string, payload?: any) => void;
  campaignsList: Campaign[];
  platformFilter: string | null;
  setPlatformFilter: (filter: string | null) => void;
}

export type { MarketingCampaignsProps };

export default function MarketingCampaigns({
  lang,
  isArabic,
  addTelemetryEvent,
  campaignsList,
  platformFilter,
  setPlatformFilter,
}: MarketingCampaignsProps) {
  return (
    <div className="animate-[ncFadeIn_0.3s_ease]">
      <CampaignsView
        embedded={true}
        campaignsState={campaignsList}
        platformFilterState={platformFilter}
        setPlatformFilterState={setPlatformFilter}
      />
    </div>
  );
}
