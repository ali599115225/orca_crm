ALTER TABLE "users" ADD COLUMN "job_title" TEXT;
ALTER TABLE "users" ADD COLUMN "department" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "contract_start_at" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "contract_end_at" TIMESTAMPTZ;
