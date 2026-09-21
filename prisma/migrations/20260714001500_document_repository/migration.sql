CREATE TABLE "documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "owner_id" UUID,
  "owner_name" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "mime_type" TEXT NOT NULL,
  "extension" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "content" BYTEA NOT NULL,
  "checksum_sha256" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documents_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_documents_tenant_created_at"
  ON "documents"("tenant_id", "created_at");

CREATE INDEX "idx_documents_tenant_type_status"
  ON "documents"("tenant_id", "type", "status");

CREATE INDEX "idx_documents_tenant_owner_name"
  ON "documents"("tenant_id", "owner_name");

CREATE INDEX "idx_documents_tenant_checksum"
  ON "documents"("tenant_id", "checksum_sha256");
