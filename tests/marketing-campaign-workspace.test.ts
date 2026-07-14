import { describe, expect, it } from "vitest";
import fs from "node:fs";

const workspace = fs.readFileSync(
  "components/marketing/CampaignManagementWorkspace.tsx",
  "utf8",
);
const marketing = fs.readFileSync(
  "components/views/MarketingView.tsx",
  "utf8",
);
const campaigns = fs.readFileSync(
  "components/views/CampaignsView.tsx",
  "utf8",
);

describe("marketing campaign workspace", () => {
  it("supports real campaign draft and control actions", () => {
    expect(workspace).toContain("createMarketingCampaignAction");
    expect(workspace).toContain("executeMarketingCampaignCommandAction");
    expect(workspace).toContain('"PUBLISH"');
    expect(workspace).toContain('"PAUSE"');
    expect(workspace).toContain('"RESUME"');
    expect(workspace).toContain('"SYNC"');
  });

  it("does not generate campaign metrics or fake publishing results", () => {
    expect(workspace).not.toContain("Math.random");
    expect(workspace).not.toContain("RAW_CAMPAIGNS");
    expect(workspace).not.toContain("setTimeout");
  });

  it("keeps credentials and platform setup outside the campaign page", () => {
    expect(workspace).not.toContain("apiKey");
    expect(workspace).not.toContain("encryptedApiKey");
    expect(workspace).toContain("/operations/settings?tab=integrations");
  });

  it("exposes campaign management from both operational routes", () => {
    expect(marketing).toContain("CampaignManagementWorkspace");
    expect(campaigns).toContain("CampaignManagementWorkspace");
    expect(marketing).not.toContain("PlatformConnectors");
  });
});
