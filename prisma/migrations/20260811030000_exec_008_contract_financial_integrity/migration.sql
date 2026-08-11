-- EXEC-008 — Contract and financial integrity spine
-- Additive only. No backfill, no destructive legacy changes.

CREATE TABLE "exec008_contract_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "template_key" text NOT NULL,
  "version" integer NOT NULL CHECK ("version" > 0),
  "content_hash" text NOT NULL,
  "content_snapshot" text NOT NULL,
  "issued_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenant_id", "template_key", "version")
);

CREATE TABLE "exec008_contract_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "contract_id" uuid NOT NULL REFERENCES "contracts"("id") ON DELETE RESTRICT,
  "version" integer NOT NULL CHECK ("version" > 0),
  "previous_version_id" uuid REFERENCES "exec008_contract_versions"("id") ON DELETE RESTRICT,
  "template_version_id" uuid NOT NULL REFERENCES "exec008_contract_template_versions"("id") ON DELETE RESTRICT,
  "template_content_hash" text NOT NULL,
  "content_hash" text NOT NULL,
  "content_snapshot" text NOT NULL,
  "state" text NOT NULL CHECK ("state" IN ('DRAFT','ISSUED','SIGNED','ACCEPTED','ACTIVATED','CANCELLED','SUPERSEDED')),
  "branch_id" uuid,
  "department_id" uuid,
  "team_id" uuid,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "issued_at" timestamptz,
  "signed_at" timestamptz,
  "accepted_at" timestamptz,
  "activated_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenant_id", "contract_id", "version")
);
CREATE UNIQUE INDEX "exec008_contract_versions_one_active_idx"
  ON "exec008_contract_versions" ("tenant_id", "contract_id")
  WHERE "state" = 'ACTIVATED';
CREATE INDEX "exec008_contract_versions_current_idx"
  ON "exec008_contract_versions" ("tenant_id", "contract_id", "version" DESC);

CREATE TABLE "exec008_signatory_authority_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "contract_version_id" uuid NOT NULL REFERENCES "exec008_contract_versions"("id") ON DELETE RESTRICT,
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "assignment_id" uuid NOT NULL,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "captured_at" timestamptz NOT NULL,
  UNIQUE ("tenant_id", "contract_version_id")
);

CREATE TABLE "exec008_idempotency" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "operation" text NOT NULL,
  "key_hash" text NOT NULL,
  "payload_hash" text NOT NULL,
  "result_ref" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenant_id", "operation", "key_hash")
);

CREATE TABLE "exec008_financial_obligations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" >= 0),
  "corrected_minor" bigint NOT NULL DEFAULT 0,
  "finalized" boolean NOT NULL DEFAULT false,
  "branch_id" uuid,
  "department_id" uuid,
  "team_id" uuid,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenant_id", "source_type", "source_id")
);

CREATE TABLE "exec008_financial_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "obligation_id" uuid NOT NULL REFERENCES "exec008_financial_obligations"("id") ON DELETE RESTRICT,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" <> 0),
  "reason" text NOT NULL CHECK (btrim("reason") <> ''),
  "actor_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "exec008_payment_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_reference" text NOT NULL,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" > 0),
  "branch_id" uuid,
  "department_id" uuid,
  "team_id" uuid,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "verified_at" timestamptz,
  "payload_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenant_id", "provider", "provider_reference"),
  CHECK (("verified" = false AND "verified_at" IS NULL) OR ("verified" = true AND "verified_at" IS NOT NULL))
);

CREATE TABLE "exec008_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "evidence_id" uuid NOT NULL REFERENCES "exec008_payment_evidence"("id") ON DELETE RESTRICT,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" > 0),
  "branch_id" uuid,
  "department_id" uuid,
  "team_id" uuid,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "completed_at" timestamptz NOT NULL,
  UNIQUE ("tenant_id", "evidence_id")
);

CREATE TABLE "exec008_payment_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "payment_id" uuid NOT NULL REFERENCES "exec008_payments"("id") ON DELETE RESTRICT,
  "obligation_id" uuid NOT NULL REFERENCES "exec008_financial_obligations"("id") ON DELETE RESTRICT,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" > 0),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "exec008_payment_allocations_obligation_idx"
  ON "exec008_payment_allocations" ("tenant_id", "obligation_id");

CREATE TABLE "exec008_refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "payment_id" uuid NOT NULL REFERENCES "exec008_payments"("id") ON DELETE RESTRICT,
  "currency" char(3) NOT NULL CHECK ("currency" ~ '^[A-Z]{3}$'),
  "amount_minor" bigint NOT NULL CHECK ("amount_minor" > 0),
  "reason" text NOT NULL CHECK (btrim("reason") <> ''),
  "initiated_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "approved_by_user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT,
  "state" text NOT NULL CHECK ("state" IN ('REQUESTED','APPROVED','REJECTED','EXECUTED','CANCELLED')),
  "branch_id" uuid,
  "department_id" uuid,
  "team_id" uuid,
  "resource_type" text NOT NULL,
  "resource_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "approved_at" timestamptz,
  CHECK ("approved_by_user_id" IS NULL OR "approved_by_user_id" <> "initiated_by_user_id")
);
CREATE INDEX "exec008_refunds_payment_idx" ON "exec008_refunds" ("tenant_id", "payment_id");

CREATE OR REPLACE FUNCTION exec008_contract_version_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id"
     OR OLD."contract_id" IS DISTINCT FROM NEW."contract_id"
     OR OLD."version" IS DISTINCT FROM NEW."version"
     OR OLD."previous_version_id" IS DISTINCT FROM NEW."previous_version_id"
     OR OLD."template_version_id" IS DISTINCT FROM NEW."template_version_id"
     OR OLD."template_content_hash" IS DISTINCT FROM NEW."template_content_hash"
     OR OLD."content_hash" IS DISTINCT FROM NEW."content_hash"
     OR OLD."content_snapshot" IS DISTINCT FROM NEW."content_snapshot"
     OR OLD."branch_id" IS DISTINCT FROM NEW."branch_id"
     OR OLD."department_id" IS DISTINCT FROM NEW."department_id"
     OR OLD."team_id" IS DISTINCT FROM NEW."team_id"
     OR OLD."resource_type" IS DISTINCT FROM NEW."resource_type"
     OR OLD."resource_id" IS DISTINCT FROM NEW."resource_id"
     OR OLD."issued_at" IS DISTINCT FROM NEW."issued_at" THEN
    RAISE EXCEPTION 'EXEC008_CONTRACT_VERSION_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_contract_version_immutable_fields_trg"
BEFORE UPDATE ON "exec008_contract_versions"
FOR EACH ROW EXECUTE FUNCTION exec008_contract_version_immutable_fields();

CREATE OR REPLACE FUNCTION exec008_deny_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'EXEC008_APPEND_ONLY';
END $$;

CREATE TRIGGER "exec008_template_immutable_update" BEFORE UPDATE OR DELETE ON "exec008_contract_template_versions" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_signatory_evidence_append_only" BEFORE UPDATE OR DELETE ON "exec008_signatory_authority_evidence" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_idempotency_append_only" BEFORE UPDATE OR DELETE ON "exec008_idempotency" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_corrections_append_only" BEFORE UPDATE OR DELETE ON "exec008_financial_corrections" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_payment_evidence_append_only" BEFORE UPDATE OR DELETE ON "exec008_payment_evidence" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_payments_append_only" BEFORE UPDATE OR DELETE ON "exec008_payments" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();
CREATE TRIGGER "exec008_allocations_append_only" BEFORE UPDATE OR DELETE ON "exec008_payment_allocations" FOR EACH ROW EXECUTE FUNCTION exec008_deny_mutation();

CREATE OR REPLACE FUNCTION exec008_guard_allocation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  obligation_currency text;
  obligation_net bigint;
  already_allocated bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."tenant_id"::text || ':' || NEW."obligation_id"::text, 0));
  SELECT "currency", "amount_minor" + "corrected_minor"
    INTO obligation_currency, obligation_net
    FROM "exec008_financial_obligations"
   WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."obligation_id"
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC008_OBLIGATION_NOT_FOUND'; END IF;
  IF obligation_currency <> NEW."currency" THEN RAISE EXCEPTION 'EXEC008_CURRENCY_MISMATCH'; END IF;
  SELECT COALESCE(sum("amount_minor"),0) INTO already_allocated
    FROM "exec008_payment_allocations"
   WHERE "tenant_id" = NEW."tenant_id" AND "obligation_id" = NEW."obligation_id";
  IF already_allocated + NEW."amount_minor" > obligation_net THEN
    RAISE EXCEPTION 'EXEC008_OVER_ALLOCATION';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_guard_allocation_trg"
BEFORE INSERT ON "exec008_payment_allocations"
FOR EACH ROW EXECUTE FUNCTION exec008_guard_allocation();

CREATE OR REPLACE FUNCTION exec008_guard_refund()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payment_currency text;
  payment_amount bigint;
  already_refunded bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."tenant_id"::text || ':' || NEW."payment_id"::text, 1));
  SELECT "currency", "amount_minor" INTO payment_currency, payment_amount
    FROM "exec008_payments"
   WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."payment_id"
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC008_PAYMENT_NOT_FOUND'; END IF;
  IF payment_currency <> NEW."currency" THEN RAISE EXCEPTION 'EXEC008_CURRENCY_MISMATCH'; END IF;
  SELECT COALESCE(sum("amount_minor"),0) INTO already_refunded
    FROM "exec008_refunds"
   WHERE "tenant_id" = NEW."tenant_id" AND "payment_id" = NEW."payment_id"
     AND "state" IN ('REQUESTED','APPROVED','EXECUTED');
  IF already_refunded + NEW."amount_minor" > payment_amount THEN
    RAISE EXCEPTION 'EXEC008_REFUND_EXCEEDS_PAYMENT';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_guard_refund_trg"
BEFORE INSERT ON "exec008_refunds"
FOR EACH ROW EXECUTE FUNCTION exec008_guard_refund();

CREATE OR REPLACE FUNCTION exec008_guard_refund_approval()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."state" = 'APPROVED' AND OLD."state" <> 'APPROVED' THEN
    IF NEW."approved_by_user_id" IS NULL THEN RAISE EXCEPTION 'EXEC008_APPROVER_REQUIRED'; END IF;
    IF NEW."approved_by_user_id" = OLD."initiated_by_user_id" THEN RAISE EXCEPTION 'EXEC008_SELF_APPROVAL_DENIED'; END IF;
    NEW."approved_at" := COALESCE(NEW."approved_at", now());
  END IF;
  IF OLD."tenant_id" IS DISTINCT FROM NEW."tenant_id"
     OR OLD."payment_id" IS DISTINCT FROM NEW."payment_id"
     OR OLD."currency" IS DISTINCT FROM NEW."currency"
     OR OLD."amount_minor" IS DISTINCT FROM NEW."amount_minor"
     OR OLD."reason" IS DISTINCT FROM NEW."reason"
     OR OLD."initiated_by_user_id" IS DISTINCT FROM NEW."initiated_by_user_id"
     OR OLD."branch_id" IS DISTINCT FROM NEW."branch_id"
     OR OLD."department_id" IS DISTINCT FROM NEW."department_id"
     OR OLD."team_id" IS DISTINCT FROM NEW."team_id"
     OR OLD."resource_type" IS DISTINCT FROM NEW."resource_type"
     OR OLD."resource_id" IS DISTINCT FROM NEW."resource_id" THEN
    RAISE EXCEPTION 'EXEC008_REFUND_IMMUTABLE_FIELDS';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_guard_refund_approval_trg"
BEFORE UPDATE ON "exec008_refunds"
FOR EACH ROW EXECUTE FUNCTION exec008_guard_refund_approval();

-- Final hardening: finalized obligations are immutable; changes must be append-only corrections.
CREATE OR REPLACE FUNCTION exec008_guard_finalized_obligation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."finalized" THEN
    RAISE EXCEPTION 'EXEC008_FINALIZED_OBLIGATION_IMMUTABLE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_guard_finalized_obligation_trg"
BEFORE UPDATE OR DELETE ON "exec008_financial_obligations"
FOR EACH ROW EXECUTE FUNCTION exec008_guard_finalized_obligation();

-- Corrections must refer to the same tenant/currency as the immutable original obligation.
CREATE OR REPLACE FUNCTION exec008_guard_correction()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  obligation_currency text;
BEGIN
  SELECT "currency"
    INTO obligation_currency
    FROM "exec008_financial_obligations"
   WHERE "tenant_id" = NEW."tenant_id"
     AND "id" = NEW."obligation_id";
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC008_OBLIGATION_NOT_FOUND'; END IF;
  IF obligation_currency <> NEW."currency" THEN RAISE EXCEPTION 'EXEC008_CURRENCY_MISMATCH'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "exec008_guard_correction_trg"
BEFORE INSERT ON "exec008_financial_corrections"
FOR EACH ROW EXECUTE FUNCTION exec008_guard_correction();

-- Reconciliation is derived from immutable original + append-only corrections + allocations.
CREATE OR REPLACE FUNCTION exec008_guard_allocation()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  obligation_currency text;
  obligation_base bigint;
  correction_total bigint;
  obligation_net bigint;
  obligation_resource_type text;
  obligation_resource_id text;
  payment_currency text;
  payment_resource_type text;
  payment_resource_id text;
  already_allocated bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."tenant_id"::text || ':' || NEW."obligation_id"::text, 0));

  SELECT "currency", "amount_minor", "resource_type", "resource_id"
    INTO obligation_currency, obligation_base, obligation_resource_type, obligation_resource_id
    FROM "exec008_financial_obligations"
   WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."obligation_id"
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC008_OBLIGATION_NOT_FOUND'; END IF;

  SELECT "currency", "resource_type", "resource_id"
    INTO payment_currency, payment_resource_type, payment_resource_id
    FROM "exec008_payments"
   WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."payment_id";
  IF NOT FOUND THEN RAISE EXCEPTION 'EXEC008_PAYMENT_NOT_FOUND'; END IF;

  IF obligation_currency <> NEW."currency" OR payment_currency <> NEW."currency" THEN
    RAISE EXCEPTION 'EXEC008_CURRENCY_MISMATCH';
  END IF;
  IF obligation_resource_type <> payment_resource_type OR obligation_resource_id <> payment_resource_id THEN
    RAISE EXCEPTION 'EXEC008_SCOPE_MISMATCH';
  END IF;

  SELECT COALESCE(sum("amount_minor"),0)
    INTO correction_total
    FROM "exec008_financial_corrections"
   WHERE "tenant_id" = NEW."tenant_id" AND "obligation_id" = NEW."obligation_id";
  obligation_net := obligation_base + correction_total;

  SELECT COALESCE(sum("amount_minor"),0) INTO already_allocated
    FROM "exec008_payment_allocations"
   WHERE "tenant_id" = NEW."tenant_id" AND "obligation_id" = NEW."obligation_id";
  IF already_allocated + NEW."amount_minor" > obligation_net THEN
    RAISE EXCEPTION 'EXEC008_OVER_ALLOCATION';
  END IF;
  RETURN NEW;
END $$;
