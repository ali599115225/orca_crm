-- EXEC-010 — documents, privacy, reporting and export controls
-- Additive integrity/evidence only. No backfill. No provider/storage/scanner activation.

CREATE TABLE "exec010_document_evidence" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "resource_scope" JSONB NOT NULL,
  "display_name" TEXT NOT NULL,
  "detected_media_type" TEXT NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "byte_length" BIGINT NOT NULL CHECK ("byte_length" >= 0),
  "source" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "retention_policy_key" TEXT,
  "retention_until" TIMESTAMPTZ,
  "legal_hold" BOOLEAN NOT NULL DEFAULT FALSE,
  "content_expired" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec010_document_scope_tenant_ck" CHECK (("resource_scope"->>'tenantId')::uuid = "tenant_id")
);
CREATE INDEX "exec010_document_scope_idx" ON "exec010_document_evidence" ("tenant_id", (("resource_scope"->>'resourceType')), (("resource_scope"->>'resourceId')));

CREATE TABLE "exec010_privacy_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "subject_type" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "request_type" TEXT NOT NULL CHECK ("request_type" IN ('ACCESS','EXPORT','CORRECTION','DELETION','OBJECTION')),
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('MARKETING','OPERATIONAL','SERVICE','LEGAL','REPORTING')),
  "request_key_hash" CHAR(64) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "state" TEXT NOT NULL CHECK ("state" IN ('PENDING','COMPLETED','DENIED')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec010_privacy_request_key_uq" UNIQUE ("tenant_id", "request_key_hash")
);
CREATE INDEX "exec010_privacy_subject_idx" ON "exec010_privacy_requests" ("tenant_id", "subject_type", "subject_id", "created_at");

CREATE TABLE "exec010_metric_definitions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "metric_key" TEXT NOT NULL,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "definition_hash" CHAR(64) NOT NULL,
  "source_lineage" TEXT[] NOT NULL CHECK (cardinality("source_lineage") > 0),
  "window_key" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec010_metric_version_uq" UNIQUE ("tenant_id", "metric_key", "version")
);

CREATE TABLE "exec010_metric_results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "metric_definition_id" UUID NOT NULL REFERENCES "exec010_metric_definitions"("id") ON DELETE RESTRICT,
  "input_digest" CHAR(64) NOT NULL,
  "value_minor_units" NUMERIC(30,0) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "exec010_metric_results_definition_idx" ON "exec010_metric_results" ("tenant_id", "metric_definition_id", "created_at");

CREATE TABLE "exec010_export_audits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "actor_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "resource_scope" JSONB NOT NULL,
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('MARKETING','OPERATIONAL','SERVICE','LEGAL','REPORTING')),
  "data_class" TEXT NOT NULL,
  "fields" TEXT[] NOT NULL CHECK (cardinality("fields") > 0),
  "query_digest" CHAR(64) NOT NULL,
  "result_count" INTEGER NOT NULL CHECK ("result_count" >= 0),
  "export_format" TEXT NOT NULL CHECK ("export_format" IN ('CSV','JSON','PDF')),
  "job_key_hash" CHAR(64) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec010_export_scope_tenant_ck" CHECK (("resource_scope"->>'tenantId')::uuid = "tenant_id"),
  CONSTRAINT "exec010_export_job_uq" UNIQUE ("tenant_id", "job_key_hash")
);

CREATE OR REPLACE FUNCTION "exec010_reject_change"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXEC010_APPEND_ONLY';
END;
$$;

CREATE TRIGGER "exec010_privacy_append_only" BEFORE UPDATE OR DELETE ON "exec010_privacy_requests" FOR EACH ROW EXECUTE FUNCTION "exec010_reject_change"();
CREATE TRIGGER "exec010_metric_definitions_immutable" BEFORE UPDATE OR DELETE ON "exec010_metric_definitions" FOR EACH ROW EXECUTE FUNCTION "exec010_reject_change"();
CREATE TRIGGER "exec010_metric_results_immutable" BEFORE UPDATE OR DELETE ON "exec010_metric_results" FOR EACH ROW EXECUTE FUNCTION "exec010_reject_change"();
CREATE TRIGGER "exec010_export_audits_immutable" BEFORE UPDATE OR DELETE ON "exec010_export_audits" FOR EACH ROW EXECUTE FUNCTION "exec010_reject_change"();

CREATE OR REPLACE FUNCTION "exec010_guard_document_update"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.tenant_id <> NEW.tenant_id OR OLD.resource_scope <> NEW.resource_scope OR
     OLD.detected_media_type <> NEW.detected_media_type OR OLD.content_hash <> NEW.content_hash OR
     OLD.byte_length <> NEW.byte_length OR OLD.source <> NEW.source OR OLD.actor_user_id <> NEW.actor_user_id OR
     OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'EXEC010_DOCUMENT_EVIDENCE_IMMUTABLE';
  END IF;
  IF OLD.legal_hold AND NEW.content_expired AND NOT OLD.content_expired THEN
    RAISE EXCEPTION 'EXEC010_LEGAL_HOLD_BLOCKS_EXPIRY';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "exec010_document_identity_guard" BEFORE UPDATE ON "exec010_document_evidence" FOR EACH ROW EXECUTE FUNCTION "exec010_guard_document_update"();

CREATE OR REPLACE FUNCTION "exec010_metric_result_scope"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_tenant UUID; parent_approved BOOLEAN;
BEGIN
  SELECT tenant_id, approved INTO parent_tenant, parent_approved FROM exec010_metric_definitions WHERE id=NEW.metric_definition_id;
  IF parent_tenant IS NULL OR parent_tenant <> NEW.tenant_id THEN RAISE EXCEPTION 'EXEC010_METRIC_TENANT_SCOPE_MISMATCH'; END IF;
  IF NOT parent_approved THEN RAISE EXCEPTION 'EXEC010_UNAPPROVED_METRIC_RESULT'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "exec010_metric_result_scope_guard" BEFORE INSERT ON "exec010_metric_results" FOR EACH ROW EXECUTE FUNCTION "exec010_metric_result_scope"();
