import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptText } from "@/lib/crypto";
import {
  MarketingProviderError,
} from "@/lib/marketing/campaign-contract";

export async function saveTikTokConnection(input: {
  tenantId: string;
  userId: string;
  advertiserId: string;
  accessToken: string;
}): Promise<void> {
  if (
    !input.tenantId ||
    !input.userId ||
    !input.advertiserId ||
    !input.accessToken
  ) {
    throw new MarketingProviderError(
      "TIKTOK_CONNECTION_INPUT_INVALID",
      "TIKTOK",
    );
  }

  const encryptedAccessToken = encryptText(input.accessToken);

  await prisma.$transaction(async (tx) => {
    const connection = await tx.platformConnection.upsert({
      where: {
        tenantId_platform: {
          tenantId: input.tenantId,
          platform: "TIKTOK",
        },
      },
      create: {
        tenantId: input.tenantId,
        platform: "TIKTOK",
        accountId: input.advertiserId,
        encryptedApiKey: encryptedAccessToken,
        status: "CONNECTED",
        leadTone: "PROFESSIONAL",
        autoWelcomeMsg: "",
      },
      update: {
        accountId: input.advertiserId,
        encryptedApiKey: encryptedAccessToken,
        status: "CONNECTED",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: "TIKTOK_ADVERTISER_CONNECTED",
        tableName: "platform_connections",
        recordId: connection.id,
        details:
          "TikTok advertiser account authorized through OAuth.",
      },
    });
  });
}
