-- AlterTable
ALTER TABLE "tours" ADD COLUMN "offer_id" UUID;

-- CreateIndex
CREATE INDEX "tours_offer_id_idx" ON "tours"("offer_id");

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
