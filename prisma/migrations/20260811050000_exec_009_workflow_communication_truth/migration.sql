-- EXEC-009 — durable workflow and communication truth
-- Additive only. No backfill. No provider activation.

CREATE TABLE "exec009_workflow_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "workflow_id" UUID NOT NULL REFERENCES "automation_workflows"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "definition_hash" CHAR(64) NOT NULL,
  "trigger_event" TEXT NOT NULL,
  "actions_json" TEXT NOT NULL,
  "approval_required" BOOLEAN NOT NULL DEFAULT FALSE,
  "approval_permission" TEXT,
  "resource_scope" JSONB NOT NULL,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec009_workflow_versions_approval_ck" CHECK (
    (NOT "approval_required") OR ("approval_permission" IS NOT NULL AND length(trim("approval_permission")) > 0)
  ),
  CONSTRAINT "exec009_workflow_versions_tenant_workflow_version_uq" UNIQUE ("tenant_id", "workflow_id", "version")
);
CREATE INDEX "exec009_workflow_versions_current_idx" ON "exec009_workflow_versions" ("tenant_id", "workflow_id", "version" DESC);

CREATE TABLE "exec009_workflow_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "workflow_version_id" UUID NOT NULL REFERENCES "exec009_workflow_versions"("id") ON DELETE RESTRICT,
  "idempotency_key_hash" CHAR(64) NOT NULL,
  "payload_hash" CHAR(64) NOT NULL,
  "state" TEXT NOT NULL CHECK ("state" IN ('PENDING','WAITING_APPROVAL','RUNNING','RETRY_WAIT','COMPLETED','FAILED','DEAD_LETTER','CANCELLED')),
  "requested_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "attempt_count" INTEGER NOT NULL DEFAULT 0 CHECK ("attempt_count" >= 0),
  "max_attempts" INTEGER NOT NULL DEFAULT 3 CHECK ("max_attempts" BETWEEN 1 AND 10),
  "deadline_at" TIMESTAMPTZ,
  "next_attempt_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "result_hash" CHAR(64),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec009_workflow_runs_no_self_approval_ck" CHECK (
    "approved_by_user_id" IS NULL OR "approved_by_user_id" <> "requested_by_user_id"
  ),
  CONSTRAINT "exec009_workflow_runs_idempotency_uq" UNIQUE ("tenant_id", "idempotency_key_hash")
);
CREATE INDEX "exec009_workflow_runs_state_idx" ON "exec009_workflow_runs" ("tenant_id", "state", "next_attempt_at");

CREATE TABLE "exec009_workflow_attempts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "run_id" UUID NOT NULL REFERENCES "exec009_workflow_runs"("id") ON DELETE CASCADE,
  "attempt_number" INTEGER NOT NULL CHECK ("attempt_number" > 0),
  "outcome" TEXT NOT NULL CHECK ("outcome" IN ('STARTED','FAILED','TIMED_OUT','COMPLETED')),
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec009_workflow_attempts_uq" UNIQUE ("tenant_id", "run_id", "attempt_number", "outcome")
);

CREATE TABLE "exec009_workflow_escalations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "run_id" UUID NOT NULL REFERENCES "exec009_workflow_runs"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("state" IN ('OPEN','ACKNOWLEDGED','CLOSED')),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "exec009_workflow_escalations_open_idx" ON "exec009_workflow_escalations" ("tenant_id", "state", "created_at");

CREATE TABLE "exec009_communication_threads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('WHATSAPP','EMAIL','SMS')),
  "identity_hash" CHAR(64) NOT NULL,
  "identity_state" TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK ("identity_state" IN ('UNKNOWN','VERIFIED','AMBIGUOUS')),
  "party_id" UUID,
  "retention_policy_key" TEXT,
  "retention_until" TIMESTAMPTZ,
  "legal_hold" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec009_threads_party_state_ck" CHECK (
    ("identity_state" = 'VERIFIED' AND "party_id" IS NOT NULL) OR
    ("identity_state" <> 'VERIFIED' AND "party_id" IS NULL)
  ),
  CONSTRAINT "exec009_threads_identity_uq" UNIQUE ("tenant_id", "channel", "identity_hash")
);

CREATE TABLE "exec009_communication_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "thread_id" UUID NOT NULL REFERENCES "exec009_communication_threads"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL CHECK ("channel" IN ('WHATSAPP','EMAIL','SMS')),
  "provider_identity" TEXT NOT NULL,
  "provider_identity_hash" CHAR(64) NOT NULL,
  "direction" TEXT NOT NULL CHECK ("direction" IN ('INBOUND','OUTBOUND')),
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('MARKETING','OPERATIONAL','SERVICE')),
  "content_hash" CHAR(64) NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "exec009_communication_provider_identity_uq" UNIQUE ("tenant_id", "channel", "provider_identity_hash")
);
CREATE INDEX "exec009_communication_events_thread_idx" ON "exec009_communication_events" ("tenant_id", "thread_id", "occurred_at");

CREATE TABLE "exec009_communication_consents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "thread_id" UUID NOT NULL REFERENCES "exec009_communication_threads"("id") ON DELETE CASCADE,
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('MARKETING','OPERATIONAL','SERVICE')),
  "state" TEXT NOT NULL CHECK ("state" IN ('UNKNOWN','OPTED_IN','OPTED_OUT','NOT_REQUIRED')),
  "source" TEXT NOT NULL,
  "actor_user_id" UUID,
  "effective_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "exec009_communication_consents_latest_idx" ON "exec009_communication_consents" ("tenant_id", "thread_id", "purpose", "effective_at" DESC, "created_at" DESC);

CREATE OR REPLACE FUNCTION "exec009_reject_immutable_change"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXEC009_IMMUTABLE';
END;
$$;

CREATE TRIGGER "exec009_workflow_versions_immutable"
BEFORE UPDATE OR DELETE ON "exec009_workflow_versions"
FOR EACH ROW EXECUTE FUNCTION "exec009_reject_immutable_change"();

CREATE TRIGGER "exec009_workflow_attempts_append_only"
BEFORE UPDATE OR DELETE ON "exec009_workflow_attempts"
FOR EACH ROW EXECUTE FUNCTION "exec009_reject_immutable_change"();

CREATE TRIGGER "exec009_communication_events_append_only"
BEFORE UPDATE OR DELETE ON "exec009_communication_events"
FOR EACH ROW EXECUTE FUNCTION "exec009_reject_immutable_change"();

CREATE TRIGGER "exec009_communication_consents_append_only"
BEFORE UPDATE OR DELETE ON "exec009_communication_consents"
FOR EACH ROW EXECUTE FUNCTION "exec009_reject_immutable_change"();

CREATE OR REPLACE FUNCTION "exec009_enforce_scope"()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_tenant UUID;
BEGIN
  IF TG_TABLE_NAME = 'exec009_workflow_versions' THEN
    SELECT tenant_id INTO parent_tenant FROM automation_workflows WHERE id = NEW.workflow_id;
  ELSIF TG_TABLE_NAME = 'exec009_workflow_runs' THEN
    SELECT tenant_id INTO parent_tenant FROM exec009_workflow_versions WHERE id = NEW.workflow_version_id;
  ELSIF TG_TABLE_NAME IN ('exec009_workflow_attempts','exec009_workflow_escalations') THEN
    SELECT tenant_id INTO parent_tenant FROM exec009_workflow_runs WHERE id = NEW.run_id;
  ELSIF TG_TABLE_NAME IN ('exec009_communication_events','exec009_communication_consents') THEN
    SELECT tenant_id INTO parent_tenant FROM exec009_communication_threads WHERE id = NEW.thread_id;
  END IF;
  IF parent_tenant IS NULL OR parent_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'EXEC009_TENANT_SCOPE_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "exec009_workflow_versions_scope" BEFORE INSERT ON "exec009_workflow_versions" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();
CREATE TRIGGER "exec009_workflow_runs_scope" BEFORE INSERT OR UPDATE ON "exec009_workflow_runs" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();
CREATE TRIGGER "exec009_workflow_attempts_scope" BEFORE INSERT ON "exec009_workflow_attempts" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();
CREATE TRIGGER "exec009_workflow_escalations_scope" BEFORE INSERT ON "exec009_workflow_escalations" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();
CREATE TRIGGER "exec009_communication_events_scope" BEFORE INSERT ON "exec009_communication_events" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();
CREATE TRIGGER "exec009_communication_consents_scope" BEFORE INSERT ON "exec009_communication_consents" FOR EACH ROW EXECUTE FUNCTION "exec009_enforce_scope"();

CREATE OR REPLACE FUNCTION "exec009_guard_run_transition"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.workflow_version_id <> NEW.workflow_version_id OR
     OLD.idempotency_key_hash <> NEW.idempotency_key_hash OR
     OLD.payload_hash <> NEW.payload_hash OR
     OLD.requested_by_user_id <> NEW.requested_by_user_id THEN
    RAISE EXCEPTION 'EXEC009_RUN_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.state IN ('COMPLETED','FAILED','DEAD_LETTER','CANCELLED') AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION 'EXEC009_TERMINAL_RUN_IMMUTABLE';
  END IF;
  IF NEW.state = 'COMPLETED' AND NEW.deadline_at IS NOT NULL AND now() > NEW.deadline_at THEN
    RAISE EXCEPTION 'EXEC009_TIMEOUT_NOT_SUCCESS';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "exec009_workflow_runs_transition_guard"
BEFORE UPDATE ON "exec009_workflow_runs"
FOR EACH ROW EXECUTE FUNCTION "exec009_guard_run_transition"();
