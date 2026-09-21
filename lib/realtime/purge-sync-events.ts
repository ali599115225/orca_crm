import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SyncEventPurger = Pick<Prisma.TransactionClient, "$executeRaw">;

export async function purgeExpiredSyncEvents(
  batchSize = 5_000,
  db: SyncEventPurger = prisma as unknown as SyncEventPurger,
): Promise<number> {
  const safeBatchSize = Math.min(Math.max(Math.trunc(batchSize), 1), 25_000);

  return db.$executeRaw(Prisma.sql`
    DELETE FROM "sync_events"
    WHERE "id" IN (
      SELECT "id"
      FROM "sync_events"
      WHERE "expires_at" <= NOW()
      ORDER BY "expires_at" ASC
      LIMIT ${safeBatchSize}
    )
  `);
}