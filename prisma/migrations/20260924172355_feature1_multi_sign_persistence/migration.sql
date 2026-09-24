-- Feature 1 (multi-signatory contract signing) — approved persistence layer.
-- Scope: ContractSignatory table + tenant-scoped FK to Contract, and the
-- canonical ContractDraft -> Contract uniqueness constraint + FK.
-- No backfill, no data UPDATE/INSERT/DELETE, no unrelated DDL.
-- Hand-scoped from the Prisma-computed diff to exclude unrelated in-flight
-- schema drift (other tracks' models) that is not part of this approved batch.

-- DropIndex
-- Superseded by the new unique index on the identical columns below.
DROP INDEX "idx_contract_drafts_tenant_contract";

-- CreateTable
CREATE TABLE "contract_signatories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signer_reference" TEXT,
    "signature_evidence_hash" VARCHAR(64),
    "signed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_contract_signatories_tenant_contract_status" ON "contract_signatories"("tenant_id", "contract_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contract_signatories_tenant_id" ON "contract_signatories"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contract_drafts_tenant_contract" ON "contract_drafts"("tenant_id", "contract_id");

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_tenant_id_contract_id_fkey" FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatories" ADD CONSTRAINT "contract_signatories_tenant_id_contract_id_fkey" FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "contracts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
