CREATE TABLE "rate_limit_entries" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "reset_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("key")
);