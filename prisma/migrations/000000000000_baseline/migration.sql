-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_ASSET', 'CONTRA_REVENUE');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES_MANAGER', 'SALES_EMPLOYEE', 'MARKETING', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'UNDER_CONSTRUCTION', 'COMPLETED', 'SOLD_OUT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'VISITED', 'OFFER_MADE', 'RESERVED', 'CONTRACT_SIGNED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'RENTAL');

-- CreateEnum
CREATE TYPE "TourStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "SentinelIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SentinelIncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "SentinelEscalationLevel" AS ENUM ('SENTINEL', 'ON_CALL_OPERATOR', 'PLATFORM_OWNER', 'MANUAL_INTERVENTION');

-- CreateEnum
CREATE TYPE "SentinelHeartbeatStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('DISCONNECTED', 'SIGNUP_PENDING', 'TOKEN_EXCHANGED', 'ASSETS_VERIFIED', 'WEBHOOK_SUBSCRIBED', 'ACTIVE', 'REAUTH_REQUIRED', 'SUSPENDED', 'DISCONNECTING', 'DISCONNECT_PENDING', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppSignupSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppWebhookEnvelopeStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'INVALID_SIGNATURE', 'QUARANTINED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "WhatsAppWebhookEventType" AS ENUM ('INBOUND_MESSAGE', 'STATUS_UPDATE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WhatsAppWebhookEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'QUARANTINED', 'DLQ', 'RETRYING');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateSyncStatus" AS ENUM ('APPROVED', 'REJECTED', 'PENDING', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WhatsAppIntegrationAuditAction" AS ENUM ('CONNECTED', 'DISCONNECTED', 'TOKEN_ROTATED', 'SIGNUP_INITIATED', 'SIGNUP_COMPLETED', 'SIGNUP_FAILED', 'PHONE_ADDED', 'PHONE_REMOVED', 'PRIMARY_CHANGED', 'CREDENTIAL_EXPIRED', 'AUTOMATION_ENABLED', 'AUTOMATION_DISABLED', 'TEMPLATE_SYNCED', 'KILL_SWITCH_ENGAGED');

-- CreateEnum
CREATE TYPE "RevenueRiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RevenueRiskStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RevenueSuggestionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevenueProviderStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'CONNECTED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "RevenueOutboxStatus" AS ENUM ('PENDING', 'RETRY', 'DELIVERED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "RevenueProviderApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RevenueModelStatus" AS ENUM ('NOT_READY', 'TRAINING', 'ACTIVE', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevenueIntelligenceCategory" AS ENUM ('REVENUE_LEAK', 'COLLECTION_DELAY', 'DEAL_FALL', 'INTERVENTION_PRIORITY');

-- CreateEnum
CREATE TYPE "RevenueIntelligenceStatus" AS ENUM ('READY', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "RevenueRiskBand" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_hash" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "job_title" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "contract_start_at" TIMESTAMPTZ,
    "contract_end_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "units_total" INTEGER NOT NULL DEFAULT 0,
    "units_sold" INTEGER NOT NULL DEFAULT 0,
    "units_booked" INTEGER NOT NULL DEFAULT 0,
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID,
    "assigned_to" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT,
    "email" TEXT,
    "email_hash" TEXT,
    "city" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL,
    "lost_reason" TEXT,
    "lead_score" INTEGER NOT NULL DEFAULT 50,
    "last_contacted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" TEXT,
    "score" INTEGER,
    "priority" TEXT,
    "ai_summary" TEXT,
    "assigned_agent_id" UUID,
    "unit_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "user_id" UUID,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMPTZ NOT NULL,
    "priority" "Priority" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "subscription_plan" TEXT NOT NULL DEFAULT 'basic',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contract_terms" TEXT,
    "commercial_registry" TEXT,
    "vat_number" TEXT,
    "national_address" TEXT,
    "encrypted_client_id" TEXT,
    "encrypted_client_secret" TEXT,
    "encrypted_api_key" TEXT,
    "encrypted_zatca_credentials" TEXT,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "next_invoice_number" INTEGER NOT NULL DEFAULT 1,
    "next_journal_number" INTEGER NOT NULL DEFAULT 1,
    "leads_webhook_key_id" TEXT,
    "encrypted_leads_webhook_secret" TEXT,
    "leads_webhook_secret_updated_at" TIMESTAMPTZ,
    "subscription_expires_at" TIMESTAMPTZ,
    "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
    "billing_cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "extra_agents" INTEGER NOT NULL DEFAULT 0,
    "whatsapp_connected" BOOLEAN NOT NULL DEFAULT false,
    "growth_warning" BOOLEAN NOT NULL DEFAULT false,
    "messaging_disabled" BOOLEAN NOT NULL DEFAULT false,
    "automation_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ai_response" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "agent_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_meters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agent_slot_id" UUID,
    "metric_type" TEXT NOT NULL,
    "limit_value" INTEGER NOT NULL,
    "usage_value" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "contract_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "unit_number" TEXT NOT NULL,
    "floor_position" INTEGER NOT NULL,
    "price_sar" DECIMAL(12,2) NOT NULL,
    "type" TEXT DEFAULT 'شقة سكنية',
    "area" TEXT DEFAULT '120 م²',
    "beds" INTEGER,
    "city" TEXT,
    "district" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "agent_name" TEXT,
    "description" TEXT,
    "media" JSONB DEFAULT '[]',
    "docs" JSONB DEFAULT '[]',
    "events" JSONB DEFAULT '[]',
    "handovers" JSONB DEFAULT '[]',
    "tour_type" TEXT,
    "tour_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "lead_id" UUID,
    "offer_id" UUID,
    "buyer_name" TEXT NOT NULL,
    "buyer_phone" TEXT NOT NULL,
    "buyer_phone_hash" TEXT,
    "total_volume_sar" DECIMAL(12,2) NOT NULL,
    "accepted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservation_expires_at" TIMESTAMPTZ,
    "signed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "end_date" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "spine_version" INTEGER NOT NULL DEFAULT 2,
    "legacy_financial" BOOLEAN NOT NULL DEFAULT false,
    "legacy_reason" TEXT,
    "vat_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'SINGLE_PAYMENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "schedule_json" JSONB NOT NULL DEFAULT '[]',
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "activated_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_amended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "invoice_id" UUID,
    "payment_plan_id" UUID,
    "installment_number" INTEGER NOT NULL,
    "amount_sar" DECIMAL(12,2) NOT NULL,
    "vat_amount" DECIMAL(12,2),
    "due_date" DATE NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'Pending',
    "secure_payment_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_leases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID,
    "unit_name" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "rent_amount" DECIMAL(12,2) NOT NULL,
    "deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "financial_ref" TEXT,
    "vat_type" TEXT NOT NULL DEFAULT 'STANDARD',
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "type" "InvoiceType" NOT NULL DEFAULT 'RENTAL',
    "lease_id" UUID,
    "contract_id" UUID,
    "invoice_number" INTEGER NOT NULL,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "zatca_uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "vat_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "qr_payload" TEXT,
    "qr_code" TEXT,
    "qr_image" TEXT,
    "invoice_type_code" TEXT NOT NULL DEFAULT '388',
    "previous_invoice_hash" TEXT,
    "zatca_xml" TEXT,
    "zatca_signed_xml" TEXT,
    "zatca_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "zatca_response" TEXT,
    "zatca_error" TEXT,
    "zatca_cleared_at" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paid_at" TIMESTAMPTZ,
    "payment_method" TEXT,
    "payment_ref" TEXT,
    "gateway_provider" TEXT,
    "gateway_status" TEXT,
    "payment_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_invoices_pkey1" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zatca_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" TEXT NOT NULL DEFAULT 'COMPLIANCE',
    "csr" TEXT,
    "compliance_cert" TEXT,
    "production_cert" TEXT,
    "private_key" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zatca_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zatca_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'REPORT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMPTZ,
    "payload" TEXT,
    "response" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "zatca_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_telemetry_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agent_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "log_message_ar" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Info',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_telemetry_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gate_provider" VARCHAR(10),
    "gate_operation" VARCHAR(50),
    "gate_result" VARCHAR(30),
    "gate_reason" VARCHAR(60),
    "idempotency_key" VARCHAR(80),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(10) NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "idempotency_key" VARCHAR(80) NOT NULL,
    "business_entity_type" VARCHAR(30),
    "business_entity_id" UUID,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMPTZ,
    "provider_response" TEXT,
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "government_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_sequences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "delay_days" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mansour_chats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "contact_phone_hash" TEXT,
    "last_message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INTERESTED',
    "messages_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mansour_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "encrypted_api_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "leadTone" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "auto_welcome_msg" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_leases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agent_id" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "lease_price" DECIMAL(10,2) NOT NULL,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_leases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commission_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" TEXT NOT NULL DEFAULT 'PAID',

    CONSTRAINT "commission_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "payment_transaction_id" UUID,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_ledger" (
    "id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "receiptId" TEXT,
    "debit" DECIMAL(65,30) NOT NULL,
    "credit" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "general_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT,
    "type" "AccountType" NOT NULL,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entry_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
    "source" TEXT NOT NULL,
    "source_id" TEXT,
    "posted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_id" UUID,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID,
    "installment_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway_ref" TEXT,
    "gateway_response" TEXT,
    "paid_at" TIMESTAMPTZ,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "provider_transaction_id" TEXT,
    "provider_invoice_id" TEXT,
    "provider_reference" TEXT,
    "payment_url" TEXT,
    "gateway_status" TEXT,
    "raw_payload" JSONB,
    "webhook_received_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "idempotency_key" TEXT,
    "plan_code" TEXT,
    "expected_amount_minor" INTEGER NOT NULL DEFAULT 0,
    "expected_currency" TEXT NOT NULL DEFAULT 'SAR',
    "processed_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT,
    "email" TEXT,
    "email_hash" TEXT,
    "preferred_contact_time" TEXT,
    "budget_range" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "probability" INTEGER NOT NULL,
    "close_date" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "unit_id" UUID,
    "linked_unit_ids" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_passports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "contract_id" UUID,
    "current_offer_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "last_event_id" UUID,
    "last_event_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "deal_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "idempotency_key" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "causation_id" UUID,
    "actor_type" TEXT NOT NULL DEFAULT 'USER',
    "actor_id" UUID,
    "entity_type" TEXT,
    "entity_id" UUID,
    "before_state" JSONB,
    "after_state" JSONB,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "unit_id" UUID,
    "assigned_to" UUID NOT NULL,
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "location" TEXT NOT NULL,
    "status" "TourStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attendees" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,
    "offer_id" UUID,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "linked_opportunity_id" UUID NOT NULL,
    "unit_id" UUID,
    "price" DECIMAL(12,2) NOT NULL,
    "valid_until" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "document_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "actions_json" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "audit_log" TEXT,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "mime_type" TEXT,
    "url" TEXT,
    "size" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_entries" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "reset_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limit_entries_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_login_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "unit_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" "Priority" NOT NULL,
    "category" TEXT DEFAULT 'other',
    "reported_by" TEXT,
    "assigned_to" TEXT,
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "scheduled_date" TIMESTAMPTZ,
    "completed_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT,
    "name" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "meta_contact_id" TEXT,
    "lead_id" UUID,
    "assigned_user_id" UUID,
    "assigned_user_name" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "message_text" TEXT,
    "message_type" TEXT DEFAULT 'text',
    "meta_message_id" TEXT,
    "raw_payload" JSONB,
    "status" TEXT DEFAULT 'received',
    "ai_summary" TEXT,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID,
    "contact_id" UUID,
    "user_id" UUID,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT NOT NULL,
    "html_body" TEXT,
    "text_body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operating_mode" TEXT NOT NULL DEFAULT 'NORMAL_MODE',
    "delegation_level" TEXT NOT NULL DEFAULT 'MONITORING_ONLY',
    "fallback_plan_active" BOOLEAN NOT NULL DEFAULT false,
    "deep_repair_wait_minutes" INTEGER NOT NULL DEFAULT 15,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_task_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "created_by" TEXT NOT NULL DEFAULT 'platform_sentinel',
    "assigned_to_type" TEXT NOT NULL,
    "assigned_to_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "execution_payload" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "risk_level" TEXT NOT NULL DEFAULT 'LOW',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "correlation_id" TEXT,
    "requested_by_id" UUID,
    "approval_requested_at" TIMESTAMPTZ,
    "approval_expires_at" TIMESTAMPTZ,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ,
    "decision_reason" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "sentinel_task_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "severity" "SentinelIncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SentinelIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "escalation_level" "SentinelEscalationLevel" NOT NULL DEFAULT 'SENTINEL',
    "affected_service" TEXT,
    "diagnostic_metadata" JSONB,
    "fingerprint" TEXT,
    "correlation_id" TEXT,
    "request_id" TEXT,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "assigned_to_id" UUID,
    "related_task_order_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sentinel_heartbeats" (
    "service_id" VARCHAR(80) NOT NULL,
    "status" "SentinelHeartbeatStatus" NOT NULL DEFAULT 'HEALTHY',
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentinel_heartbeats_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "waba_id" TEXT,
    "active_since" TIMESTAMPTZ,
    "disconnected_at" TIMESTAMPTZ,
    "last_health_check" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_credentials" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "token_fingerprint" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_validated_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "rotated_from" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_phone_numbers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connection_id" UUID,
    "phone_number_id" TEXT NOT NULL,
    "display_phone_number" TEXT,
    "waba_id" TEXT,
    "business_account_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_name" TEXT,
    "quality_rating" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_signup_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "connection_id" UUID,
    "state_hash" TEXT NOT NULL,
    "code_verifier" TEXT,
    "redirect_uri" TEXT NOT NULL,
    "status" "WhatsAppSignupSessionStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_signup_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_envelopes" (
    "id" UUID NOT NULL,
    "request_hash" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "status" "WhatsAppWebhookEnvelopeStatus" NOT NULL DEFAULT 'RECEIVED',
    "raw_payload_snippet" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_webhook_envelopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_webhook_events" (
    "id" UUID NOT NULL,
    "envelope_id" UUID NOT NULL,
    "tenant_id" UUID,
    "waba_id" TEXT,
    "phone_number_id" TEXT,
    "event_type" "WhatsAppWebhookEventType" NOT NULL,
    "message_id" UUID,
    "meta_message_id" TEXT,
    "occurred_at" TIMESTAMPTZ,
    "event_data" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" "WhatsAppWebhookEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "next_retry_at" TIMESTAMPTZ,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "meta_template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL,
    "meta_status" "WhatsAppTemplateSyncStatus" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" TEXT,
    "components" JSONB,
    "variables" JSONB,
    "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_integration_audits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "connection_id" UUID,
    "credential_id" UUID,
    "phone_number_id" TEXT,
    "action" "WhatsAppIntegrationAuditAction" NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_integration_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_consents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "consented_at" TIMESTAMPTZ NOT NULL,
    "consent_type" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_opt_outs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "reason" TEXT,
    "source" TEXT,
    "opted_out_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_opt_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_platform_settings" (
    "id" UUID NOT NULL,
    "singleton_key" TEXT NOT NULL DEFAULT 'global',
    "whatsapp_messaging_disabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_automation_disabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_events" (
    "id" TEXT NOT NULL,
    "cursor" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_version" INTEGER,
    "source_event_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_risk_signals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rule_code" VARCHAR(80) NOT NULL,
    "fingerprint" VARCHAR(255) NOT NULL,
    "subject_type" VARCHAR(80) NOT NULL,
    "subject_id" VARCHAR(120) NOT NULL,
    "opportunity_id" UUID,
    "invoice_id" UUID,
    "severity" "RevenueRiskSeverity" NOT NULL,
    "status" "RevenueRiskStatus" NOT NULL DEFAULT 'OPEN',
    "reason_ar" TEXT NOT NULL,
    "reason_en" TEXT NOT NULL,
    "revenue_at_risk" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "assignee_id" UUID,
    "due_at" TIMESTAMPTZ(6),
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolution_reason" TEXT,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_rule_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "detected_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_rules" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_rule_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_next_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "target_type" VARCHAR(80) NOT NULL,
    "target_id" VARCHAR(120) NOT NULL,
    "opportunity_id" UUID,
    "action_type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "assigned_to" UUID,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    "source_suggestion_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_next_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_action_suggestions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "source_type" VARCHAR(80) NOT NULL,
    "source_id" VARCHAR(120) NOT NULL,
    "source_text_hash" VARCHAR(64) NOT NULL,
    "opportunity_id" UUID,
    "contact_id" UUID,
    "lead_id" UUID,
    "unit_id" UUID,
    "intent" VARCHAR(80) NOT NULL,
    "extracted_entities" JSONB NOT NULL,
    "action_type" VARCHAR(80) NOT NULL,
    "action_payload" JSONB NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "rationale_ar" TEXT NOT NULL,
    "rationale_en" TEXT NOT NULL,
    "status" "RevenueSuggestionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "created_by" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_reason" TEXT,
    "execution_result" JSONB,
    "executed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_action_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_domain_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "aggregate_type" VARCHAR(80) NOT NULL,
    "aggregate_id" VARCHAR(120) NOT NULL,
    "event_type" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "causation_id" VARCHAR(120),
    "idempotency_key" VARCHAR(180) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "metadata" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_audit_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "resource_type" VARCHAR(80) NOT NULL,
    "resource_id" VARCHAR(120) NOT NULL,
    "correlation_id" VARCHAR(120) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_hash" VARCHAR(64),
    "user_agent_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_outbox_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "topic" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "RevenueOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_provider_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "status" "RevenueProviderStatus" NOT NULL DEFAULT 'PENDING',
    "base_url" TEXT,
    "encrypted_credentials" TEXT NOT NULL,
    "credentials_version" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "last_tested_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "webhook_secret_hash" VARCHAR(64),
    "metadata" JSONB NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_provider_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "connection_id" UUID NOT NULL,
    "external_event_id" VARCHAR(180) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_provider_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_provider_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "status" "RevenueProviderApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "company_data" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "notes" TEXT,
    "external_reference" VARCHAR(180),
    "submitted_by" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_at" TIMESTAMPTZ(6),
    "decision_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_provider_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_dataset_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL,
    "feature_schema" JSONB NOT NULL,
    "label_distribution" JSONB NOT NULL,
    "data_hash" VARCHAR(64) NOT NULL,
    "period_start" TIMESTAMPTZ(6),
    "period_end" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_dataset_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_model_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RevenueModelStatus" NOT NULL DEFAULT 'TRAINING',
    "algorithm" VARCHAR(80) NOT NULL,
    "dataset_snapshot_id" UUID,
    "feature_schema" JSONB NOT NULL,
    "artifact" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "minimum_rows" INTEGER NOT NULL DEFAULT 30,
    "drift_score" DECIMAL(8,4),
    "drift_status" VARCHAR(40),
    "activated_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_predictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "model_version_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "probability" DECIMAL(8,6) NOT NULL,
    "confidence" DECIMAL(8,6) NOT NULL,
    "explanation" JSONB NOT NULL,
    "feature_snapshot" JSONB NOT NULL,
    "outcome" VARCHAR(40),
    "scored_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "revenue_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_intelligence_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(120) NOT NULL,
    "category" "RevenueIntelligenceCategory" NOT NULL,
    "status" "RevenueIntelligenceStatus" NOT NULL DEFAULT 'READY',
    "score" INTEGER,
    "confidence" INTEGER,
    "risk_band" "RevenueRiskBand",
    "horizon_days" INTEGER,
    "feature_hash" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6),
    "reasons" JSONB NOT NULL,
    "source_signals" JSONB NOT NULL,
    "recommended_action" VARCHAR(80),
    "recommended_action_payload" JSONB,
    "model_version" VARCHAR(80) NOT NULL,
    "model_algorithm" VARCHAR(80) NOT NULL,
    "window_key" VARCHAR(160) NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "revenue_intelligence_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_predictive_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "scored_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_entities" JSONB NOT NULL DEFAULT '[]',
    "result" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_predictive_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email_hash" ON "users"("email_hash");

-- CreateIndex
CREATE INDEX "idx_leads_tenant_phone_hash" ON "leads"("tenant_id", "phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_leads_webhook_key_id_key" ON "tenants"("leads_webhook_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_slots_tenant_id_slot_number_key" ON "agent_slots"("tenant_id", "slot_number");

-- CreateIndex
CREATE UNIQUE INDEX "usage_meters_agent_slot_id_key" ON "usage_meters"("agent_slot_id");

-- CreateIndex
CREATE INDEX "idx_units_project_id" ON "units"("project_id");

-- CreateIndex
CREATE INDEX "idx_units_tenant_id" ON "units"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_unit_number" ON "units"("project_id", "unit_number");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_unit_id_key" ON "contracts"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_offer_id_key" ON "contracts"("offer_id");

-- CreateIndex
CREATE INDEX "idx_contracts_unit_id" ON "contracts"("unit_id");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_id" ON "contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_status" ON "contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_contracts_reservation_expiry" ON "contracts"("reservation_expires_at");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_buyer_phone_hash" ON "contracts"("tenant_id", "buyer_phone_hash");

-- CreateIndex
CREATE INDEX "idx_contracts_lead_id" ON "contracts"("lead_id");

-- CreateIndex
CREATE INDEX "idx_contracts_offer_id" ON "contracts"("offer_id");

-- CreateIndex
CREATE INDEX "idx_contracts_tenant_spine_legacy" ON "contracts"("tenant_id", "spine_version", "legacy_financial");

-- CreateIndex
CREATE UNIQUE INDEX "payment_plans_contract_id_key" ON "payment_plans"("contract_id");

-- CreateIndex
CREATE INDEX "idx_payment_plans_tenant_status" ON "payment_plans"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_payment_plans_last_amended_at" ON "payment_plans"("last_amended_at");

-- CreateIndex
CREATE UNIQUE INDEX "installments_secure_payment_token_key" ON "installments"("secure_payment_token");

-- CreateIndex
CREATE INDEX "idx_installments_contract_id" ON "installments"("contract_id");

-- CreateIndex
CREATE INDEX "idx_installments_due_date" ON "installments"("due_date");

-- CreateIndex
CREATE INDEX "idx_installments_tenant_id" ON "installments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_installments_invoice_id" ON "installments"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_installments_payment_plan_id" ON "installments"("payment_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "installments_contract_id_installment_number_key" ON "installments"("contract_id", "installment_number");

-- CreateIndex
CREATE INDEX "idx_rental_leases_tenant_id" ON "rental_leases"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_lease_id_idx" ON "invoices"("lease_id");

-- CreateIndex
CREATE INDEX "idx_invoices_contract_id" ON "invoices"("contract_id");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tenant_invoice_number" ON "invoices"("tenant_id", "invoice_number");

-- CreateIndex
CREATE INDEX "idx_zatca_devices_tenant_id" ON "zatca_devices"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_zatca_queue_tenant_status" ON "zatca_queue"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_zatca_queue_next_retry" ON "zatca_queue"("next_retry_at");

-- CreateIndex
CREATE INDEX "idx_telemetry_tenant_id" ON "agent_telemetry_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_telemetry_created_at" ON "agent_telemetry_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_tenant_id" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_gate_result" ON "audit_logs"("tenant_id", "gate_provider", "gate_result");

-- CreateIndex
CREATE UNIQUE INDEX "gov_outbox_idempotency_key_uq" ON "government_outbox"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_gov_outbox_tenant_status" ON "government_outbox"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_gov_outbox_retry" ON "government_outbox"("next_retry_at", "status");

-- CreateIndex
CREATE INDEX "idx_gov_outbox_provider_status" ON "government_outbox"("provider", "status");

-- CreateIndex
CREATE INDEX "idx_mansour_chats_tenant_contact_phone_hash" ON "mansour_chats"("tenant_id", "contact_phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "platform_connections_tenant_id_platform_key" ON "platform_connections"("tenant_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "agent_leases_tenant_id_agent_id_key" ON "agent_leases"("tenant_id", "agent_id");

-- CreateIndex
CREATE INDEX "commission_payments_commission_id_idx" ON "commission_payments"("commission_id");

-- CreateIndex
CREATE INDEX "commission_payments_tenant_id_idx" ON "commission_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "commission_payments_status_idx" ON "commission_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_transaction_id_key" ON "receipts"("payment_transaction_id");

-- CreateIndex
CREATE INDEX "idx_receipts_tenant_id" ON "receipts"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_ledger_receiptId_key" ON "general_ledger"("receiptId");

-- CreateIndex
CREATE INDEX "idx_general_ledger_tenant_id" ON "general_ledger"("tenant_id");

-- CreateIndex
CREATE INDEX "accounts_tenant_id_idx" ON "accounts"("tenant_id");

-- CreateIndex
CREATE INDEX "accounts_parent_id_idx" ON "accounts"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_tenant_id_code_key" ON "accounts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "account_balances_tenant_id_period_idx" ON "account_balances"("tenant_id", "period");

-- CreateIndex
CREATE INDEX "account_balances_account_id_idx" ON "account_balances"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_balances_account_id_period_tenant_id_key" ON "account_balances"("account_id", "period", "tenant_id");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_status_idx" ON "journal_entries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "journal_entries_tenant_id_posted_at_idx" ON "journal_entries"("tenant_id", "posted_at");

-- CreateIndex
CREATE INDEX "journal_entries_source_id_idx" ON "journal_entries"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_tenant_id_entry_number_key" ON "journal_entries"("tenant_id", "entry_number");

-- CreateIndex
CREATE INDEX "journal_lines_journal_entry_id_idx" ON "journal_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "idx_payment_transactions_tenant_id" ON "payment_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_payment_transactions_invoice_id" ON "payment_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_payment_transactions_installment_id" ON "payment_transactions"("installment_id");

-- CreateIndex
CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_idx" ON "payment_transactions"("provider");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_transaction_id_idx" ON "payment_transactions"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_invoice_id_idx" ON "payment_transactions"("provider_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transaction_provider_reference_uq" ON "payment_transactions"("provider", "provider_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_tenant_idempotency_uq" ON "payment_transactions"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_contacts_tenant_phone_hash" ON "contacts"("tenant_id", "phone_hash");

-- CreateIndex
CREATE INDEX "idx_opportunities_unit_id" ON "opportunities"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_passports_opportunity_id_key" ON "deal_passports"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_passports_contract_id_key" ON "deal_passports"("contract_id");

-- CreateIndex
CREATE INDEX "deal_passports_tenant_id_status_idx" ON "deal_passports"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "deal_passports_tenant_id_opportunity_id_key" ON "deal_passports"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_passports_tenant_id_contract_id_key" ON "deal_passports"("tenant_id", "contract_id");

-- CreateIndex
CREATE INDEX "deal_events_tenant_id_deal_id_occurred_at_idx" ON "deal_events"("tenant_id", "deal_id", "occurred_at");

-- CreateIndex
CREATE INDEX "deal_events_tenant_id_event_type_occurred_at_idx" ON "deal_events"("tenant_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "deal_events_correlation_id_idx" ON "deal_events"("correlation_id");

-- CreateIndex
CREATE INDEX "deal_events_causation_id_idx" ON "deal_events"("causation_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_events_deal_id_sequence_key" ON "deal_events"("deal_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "deal_events_tenant_id_idempotency_key_key" ON "deal_events"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "idx_tours_opportunity_id" ON "tours"("opportunity_id");

-- CreateIndex
CREATE INDEX "idx_tours_unit_id" ON "tours"("unit_id");

-- CreateIndex
CREATE INDEX "tours_offer_id_idx" ON "tours"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offers_unit_id" ON "offers"("unit_id");

-- CreateIndex
CREATE INDEX "user_favorites_tenant_id_idx" ON "user_favorites"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_property_id_key" ON "user_favorites"("user_id", "property_id");

-- CreateIndex
CREATE INDEX "failed_login_attempts_user_id_created_at_idx" ON "failed_login_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "maintenance_tickets_tenant_id_status_idx" ON "maintenance_tickets"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_tickets_unit_id_idx" ON "maintenance_tickets"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_lead_id_key" ON "whatsapp_contacts"("lead_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_contacts_tenant_archived_last_message" ON "whatsapp_contacts"("tenant_id", "archived", "last_message_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_contacts_tenant_last" ON "whatsapp_contacts"("tenant_id", "last_message_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_contacts_tenant_phone_hash" ON "whatsapp_contacts"("tenant_id", "phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_tenant_id_phone_hash_key" ON "whatsapp_contacts"("tenant_id", "phone_hash");

-- CreateIndex
CREATE INDEX "idx_whatsapp_messages_tenant_phone" ON "whatsapp_messages"("tenant_id", "phone", "created_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_messages_tenant_phone_hash" ON "whatsapp_messages"("tenant_id", "phone_hash");

-- CreateIndex
CREATE INDEX "idx_whatsapp_messages_meta_id" ON "whatsapp_messages"("meta_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_messages_tenant_meta" ON "whatsapp_messages"("tenant_id", "meta_message_id") WHERE "meta_message_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "email_messages_tenant_id_created_at_idx" ON "email_messages"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "email_messages_lead_id_idx" ON "email_messages"("lead_id");

-- CreateIndex
CREATE INDEX "email_messages_contact_id_idx" ON "email_messages"("contact_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_chat_created" ON "sentinel_chat_messages"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_status" ON "sentinel_task_orders"("status");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_expiry" ON "sentinel_task_orders"("status", "approval_expires_at");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_assigned" ON "sentinel_task_orders"("assigned_to_type", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_correlation" ON "sentinel_task_orders"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_created" ON "sentinel_task_orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_request" ON "sentinel_task_orders"("request_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_task_orders_decided" ON "sentinel_task_orders"("decided_by_id", "decided_at");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_active" ON "sentinel_incidents"("status", "severity");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_tenant_status" ON "sentinel_incidents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_assignee_status" ON "sentinel_incidents"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_correlation" ON "sentinel_incidents"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_request" ON "sentinel_incidents"("request_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_task_order" ON "sentinel_incidents"("related_task_order_id");

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_detected" ON "sentinel_incidents"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "idx_sentinel_incidents_fingerprint" ON "sentinel_incidents"("fingerprint", "status");

-- CreateIndex
CREATE INDEX "idx_sentinel_heartbeat_status_seen" ON "sentinel_heartbeats"("status", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_waba_id_unique" ON "whatsapp_connections"("waba_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_connections_status" ON "whatsapp_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_tenant_id_unique" ON "whatsapp_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_credentials_connection" ON "whatsapp_credentials"("connection_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_credentials_fingerprint" ON "whatsapp_credentials"("token_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_phone_numbers_phone_number_id" ON "whatsapp_phone_numbers"("phone_number_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_phone_numbers_tenant_active" ON "whatsapp_phone_numbers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_whatsapp_phone_numbers_connection" ON "whatsapp_phone_numbers"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_signup_sessions_state_hash" ON "whatsapp_signup_sessions"("state_hash");

-- CreateIndex
CREATE INDEX "idx_whatsapp_signup_sessions_tenant_status" ON "whatsapp_signup_sessions"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_envelopes_status" ON "whatsapp_webhook_envelopes"("status");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_envelopes_expires" ON "whatsapp_webhook_envelopes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_webhook_events_dedupe" ON "whatsapp_webhook_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_events_envelope" ON "whatsapp_webhook_events"("envelope_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_events_message" ON "whatsapp_webhook_events"("message_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_events_tenant_status" ON "whatsapp_webhook_events"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_whatsapp_webhook_events_status_retry" ON "whatsapp_webhook_events"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_templates_conn_meta_status" ON "whatsapp_templates"("connection_id", "meta_status");

-- CreateIndex
CREATE INDEX "idx_whatsapp_templates_conn_enabled" ON "whatsapp_templates"("connection_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_templates_conn_template_lang" ON "whatsapp_templates"("connection_id", "meta_template_id", "language");

-- CreateIndex
CREATE INDEX "idx_whatsapp_integration_audits_tenant" ON "whatsapp_integration_audits"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_whatsapp_integration_audits_user" ON "whatsapp_integration_audits"("user_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_integration_audits_connection" ON "whatsapp_integration_audits"("connection_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_integration_audits_credential" ON "whatsapp_integration_audits"("credential_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_integration_audits_phone" ON "whatsapp_integration_audits"("phone_number_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_consents_tenant_phone_hash" ON "whatsapp_consents"("tenant_id", "phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_opt_outs_tenant_phone_hash" ON "whatsapp_opt_outs"("tenant_id", "phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "uq_whatsapp_platform_settings_singleton" ON "whatsapp_platform_settings"("singleton_key");

-- CreateIndex
CREATE UNIQUE INDEX "sync_events_cursor_key" ON "sync_events"("cursor");

-- CreateIndex
CREATE INDEX "sync_events_tenant_id_cursor_idx" ON "sync_events"("tenant_id", "cursor");

-- CreateIndex
CREATE INDEX "sync_events_expires_at_idx" ON "sync_events"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_events_tenant_id_idempotency_key_key" ON "sync_events"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "revenue_risk_tenant_status_severity_idx" ON "revenue_risk_signals"("tenant_id", "status", "severity");

-- CreateIndex
CREATE INDEX "revenue_risk_tenant_opportunity_idx" ON "revenue_risk_signals"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "revenue_risk_tenant_invoice_idx" ON "revenue_risk_signals"("tenant_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_risk_tenant_fingerprint_uq" ON "revenue_risk_signals"("tenant_id", "fingerprint");

-- CreateIndex
CREATE INDEX "revenue_rule_run_tenant_started_idx" ON "revenue_rule_runs"("tenant_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_rule_run_tenant_idempotency_uq" ON "revenue_rule_runs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "revenue_next_action_tenant_status_due_idx" ON "revenue_next_actions"("tenant_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "revenue_next_action_tenant_opportunity_idx" ON "revenue_next_actions"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "revenue_suggestion_tenant_status_created_idx" ON "revenue_action_suggestions"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "revenue_suggestion_tenant_opportunity_idx" ON "revenue_action_suggestions"("tenant_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "revenue_event_aggregate_idx" ON "revenue_domain_events"("tenant_id", "aggregate_type", "aggregate_id", "occurred_at");

-- CreateIndex
CREATE INDEX "revenue_event_correlation_idx" ON "revenue_domain_events"("tenant_id", "correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_event_tenant_idempotency_uq" ON "revenue_domain_events"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "revenue_audit_resource_idx" ON "revenue_audit_entries"("tenant_id", "resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_audit_correlation_idx" ON "revenue_audit_entries"("tenant_id", "correlation_id");

-- CreateIndex
CREATE INDEX "revenue_outbox_status_next_idx" ON "revenue_outbox_messages"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "revenue_outbox_tenant_created_idx" ON "revenue_outbox_messages"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_provider_tenant_status_idx" ON "revenue_provider_connections"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_provider_tenant_provider_uq" ON "revenue_provider_connections"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "revenue_webhook_tenant_provider_idx" ON "revenue_provider_webhooks"("tenant_id", "provider", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_webhook_tenant_provider_external_uq" ON "revenue_provider_webhooks"("tenant_id", "provider", "external_event_id");

-- CreateIndex
CREATE INDEX "revenue_provider_application_tenant_idx" ON "revenue_provider_applications"("tenant_id", "provider", "status");

-- CreateIndex
CREATE INDEX "revenue_dataset_tenant_created_idx" ON "revenue_dataset_snapshots"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_dataset_tenant_version_uq" ON "revenue_dataset_snapshots"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "revenue_model_tenant_status_idx" ON "revenue_model_versions"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_model_tenant_version_uq" ON "revenue_model_versions"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "revenue_prediction_opportunity_idx" ON "revenue_predictions"("tenant_id", "opportunity_id", "scored_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_prediction_model_opportunity_uq" ON "revenue_predictions"("tenant_id", "model_version_id", "opportunity_id");

-- CreateIndex
CREATE INDEX "revenue_intelligence_tenant_generated_idx" ON "revenue_intelligence_scores"("tenant_id", "generated_at");

-- CreateIndex
CREATE INDEX "revenue_intelligence_tenant_category_generated_idx" ON "revenue_intelligence_scores"("tenant_id", "category", "generated_at");

-- CreateIndex
CREATE INDEX "revenue_intelligence_entity_idx" ON "revenue_intelligence_scores"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "revenue_intelligence_expires_idx" ON "revenue_intelligence_scores"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_intelligence_entity_category_window_uq" ON "revenue_intelligence_scores"("tenant_id", "entity_type", "entity_id", "category", "window_key");

-- CreateIndex
CREATE INDEX "revenue_predictive_run_tenant_started_idx" ON "revenue_predictive_runs"("tenant_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_predictive_run_tenant_key_uq" ON "revenue_predictive_runs"("tenant_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_slots" ADD CONSTRAINT "agent_slots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_meters" ADD CONSTRAINT "usage_meters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_meters" ADD CONSTRAINT "usage_meters_agent_slot_id_fkey" FOREIGN KEY ("agent_slot_id") REFERENCES "agent_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_commissions" ADD CONSTRAINT "payroll_commissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_commissions" ADD CONSTRAINT "payroll_commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_payment_plan_id_fkey" FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_leases" ADD CONSTRAINT "rental_leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "rental_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "rental_invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "rental_leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zatca_devices" ADD CONSTRAINT "zatca_devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zatca_queue" ADD CONSTRAINT "zatca_queue_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zatca_queue" ADD CONSTRAINT "zatca_queue_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_telemetry_logs" ADD CONSTRAINT "agent_telemetry_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_outbox" ADD CONSTRAINT "government_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_sequences" ADD CONSTRAINT "followup_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mansour_chats" ADD CONSTRAINT "mansour_chats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mansour_chats" ADD CONSTRAINT "mansour_chats_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_leases" ADD CONSTRAINT "agent_leases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "payroll_commissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_passports" ADD CONSTRAINT "deal_passports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_passports" ADD CONSTRAINT "deal_passports_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_passports" ADD CONSTRAINT "deal_passports_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deal_passports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_causation_id_fkey" FOREIGN KEY ("causation_id") REFERENCES "deal_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_linked_opportunity_id_fkey" FOREIGN KEY ("linked_opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_attachments" ADD CONSTRAINT "whatsapp_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_task_orders" ADD CONSTRAINT "sentinel_task_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_task_orders" ADD CONSTRAINT "sentinel_task_orders_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sentinel_incidents" ADD CONSTRAINT "sentinel_incidents_related_task_order_id_fkey" FOREIGN KEY ("related_task_order_id") REFERENCES "sentinel_task_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "fk_whatsapp_connections_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "fk_whatsapp_credentials_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "fk_whatsapp_credentials_rotated_from" FOREIGN KEY ("rotated_from") REFERENCES "whatsapp_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "whatsapp_phone_numbers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_phone_numbers" ADD CONSTRAINT "fk_whatsapp_phone_numbers_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_signup_sessions" ADD CONSTRAINT "fk_whatsapp_signup_sessions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_signup_sessions" ADD CONSTRAINT "fk_whatsapp_signup_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_signup_sessions" ADD CONSTRAINT "fk_whatsapp_signup_sessions_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "fk_whatsapp_webhook_events_envelope" FOREIGN KEY ("envelope_id") REFERENCES "whatsapp_webhook_envelopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "fk_whatsapp_webhook_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "fk_whatsapp_webhook_events_message" FOREIGN KEY ("message_id") REFERENCES "whatsapp_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "fk_whatsapp_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "fk_whatsapp_templates_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_credential" FOREIGN KEY ("credential_id") REFERENCES "whatsapp_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integration_audits" ADD CONSTRAINT "fk_whatsapp_integration_audits_phone" FOREIGN KEY ("phone_number_id") REFERENCES "whatsapp_phone_numbers"("phone_number_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_consents" ADD CONSTRAINT "fk_whatsapp_consents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_opt_outs" ADD CONSTRAINT "fk_whatsapp_opt_outs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_intelligence_scores" ADD CONSTRAINT "revenue_intelligence_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom SQL not expressible in schema.prisma but required for current invariants

-- Extension required for gen_random_uuid() portability on older PostgreSQL versions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Partial unique index: at most one active credential per WhatsApp connection
CREATE UNIQUE INDEX "uq_whatsapp_credentials_active" ON "whatsapp_credentials" ("connection_id") WHERE "is_active" = true;

-- Partial unique index: at most one primary phone number per WhatsApp connection
CREATE UNIQUE INDEX "uq_whatsapp_phone_numbers_primary" ON "whatsapp_phone_numbers" ("connection_id") WHERE "is_primary" = true;

-- Partial unique index: heartbeat incident fingerprint deduplication for active statuses
CREATE UNIQUE INDEX "idx_sentinel_incidents_active_heartbeat_fingerprint_uq"
ON "sentinel_incidents" ("fingerprint")
WHERE "fingerprint" IS NOT NULL
  AND "fingerprint" LIKE 'heartbeat:%'
  AND "status" IN (
    'OPEN'::"SentinelIncidentStatus",
    'ACKNOWLEDGED'::"SentinelIncidentStatus",
    'IN_PROGRESS'::"SentinelIncidentStatus"
  );

-- DB-level updated_at trigger function and triggers for WhatsApp tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON "whatsapp_connections" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_phone_numbers_updated_at BEFORE UPDATE ON "whatsapp_phone_numbers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON "whatsapp_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agent slot cap enforcement based on tenant subscription plan
CREATE OR REPLACE FUNCTION public.check_agent_slots_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  tenant_plan TEXT;
  active_slots_count INT;
  max_slots INT;
BEGIN
  SELECT LOWER(COALESCE(subscription_plan, 'basic'))
  INTO tenant_plan
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  IF tenant_plan IS NULL THEN
    tenant_plan := 'basic';
  END IF;

  CASE tenant_plan
    WHEN 'basic'       THEN max_slots := 1;
    WHEN 'starter'     THEN max_slots := 1;
    WHEN 'silver'      THEN max_slots := 2;
    WHEN 'pro'         THEN max_slots := 2;
    WHEN 'professional'THEN max_slots := 2;
    WHEN 'gold'        THEN max_slots := 5;
    WHEN 'diamond'     THEN max_slots := 5;
    WHEN 'platinum'    THEN max_slots := 5;
    WHEN 'enterprise'  THEN max_slots := 5;
    ELSE max_slots := 1;
  END CASE;

  IF TG_OP = 'UPDATE' THEN
    SELECT COUNT(*)
    INTO active_slots_count
    FROM public.agent_slots
    WHERE tenant_id = NEW.tenant_id
      AND is_active = TRUE
      AND id <> NEW.id;
  ELSE
    SELECT COUNT(*)
    INTO active_slots_count
    FROM public.agent_slots
    WHERE tenant_id = NEW.tenant_id
      AND is_active = TRUE;
  END IF;

  IF active_slots_count >= max_slots THEN
    RAISE EXCEPTION 'CAP LOCK: max % active agent slots for plan %. Current: %.',
      max_slots, tenant_plan, active_slots_count
    USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_check_agent_slots_cap
BEFORE INSERT OR UPDATE OF is_active, tenant_id
ON public.agent_slots
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION public.check_agent_slots_cap();

-- Cross-tenant integrity: connection_id must belong to the same tenant
CREATE OR REPLACE FUNCTION enforce_whatsapp_connection_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."connection_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "whatsapp_connections" c
    WHERE c."id" = NEW."connection_id"
      AND c."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_CONNECTION_TENANT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_whatsapp_phone_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_phone_numbers"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_signup_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_signup_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_template_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_templates"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

CREATE TRIGGER "trg_whatsapp_audit_connection_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_connection_tenant_match();

-- Cross-tenant integrity: user_id must belong to the same tenant
CREATE OR REPLACE FUNCTION enforce_whatsapp_user_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "users" u
    WHERE u."id" = NEW."user_id"
      AND u."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_USER_TENANT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_whatsapp_signup_user_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_signup_sessions"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_user_tenant_match();

CREATE TRIGGER "trg_whatsapp_audit_user_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_user_tenant_match();

-- Cross-tenant integrity: credential_id must belong to the same tenant
CREATE OR REPLACE FUNCTION enforce_whatsapp_audit_credential_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."credential_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "whatsapp_credentials" cr
    JOIN "whatsapp_connections" c ON c."id" = cr."connection_id"
    WHERE cr."id" = NEW."credential_id"
      AND c."tenant_id" = NEW."tenant_id"
  ) THEN
    RAISE EXCEPTION 'WHATSAPP_CREDENTIAL_TENANT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_whatsapp_audit_credential_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_integration_audits"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_audit_credential_tenant_match();

-- Cross-tenant integrity: webhook event message_id must belong to the same tenant
CREATE OR REPLACE FUNCTION enforce_whatsapp_event_message_tenant_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."message_id" IS NOT NULL THEN
    IF NEW."tenant_id" IS NULL OR NOT EXISTS (
      SELECT 1
      FROM "whatsapp_messages" m
      WHERE m."id" = NEW."message_id"
        AND m."tenant_id" = NEW."tenant_id"
    ) THEN
      RAISE EXCEPTION 'WHATSAPP_EVENT_MESSAGE_TENANT_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_whatsapp_event_message_tenant_match"
  BEFORE INSERT OR UPDATE ON "whatsapp_webhook_events"
  FOR EACH ROW EXECUTE FUNCTION enforce_whatsapp_event_message_tenant_match();

-- Domain invariant CHECK constraints
ALTER TABLE "offers"
  ADD CONSTRAINT "offers_accepted_requires_unit_ck"
  CHECK ("status" <> 'ACCEPTED' OR "unit_id" IS NOT NULL);

ALTER TABLE "account_balances"
  ADD CONSTRAINT "account_balances_nonnegative_ck"
  CHECK ("debit" >= 0 AND "credit" >= 0);

ALTER TABLE "journal_lines"
  ADD CONSTRAINT "journal_lines_nonnegative_ck"
  CHECK ("debit" >= 0 AND "credit" >= 0);

ALTER TABLE "journal_lines"
  ADD CONSTRAINT "journal_lines_single_side_ck"
  CHECK (NOT ("debit" > 0 AND "credit" > 0));

ALTER TABLE "journal_lines"
  ADD CONSTRAINT "journal_lines_value_ck"
  CHECK ("debit" > 0 OR "credit" > 0);

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_spine_version_ck"
  CHECK ("spine_version" >= 1);

ALTER TABLE "deal_events"
  ADD CONSTRAINT "deal_events_correlation_id_not_blank_check"
  CHECK (BTRIM("correlation_id") <> '');

ALTER TABLE "deal_events"
  ADD CONSTRAINT "deal_events_actor_type_check"
  CHECK ("actor_type" IN ('USER', 'SYSTEM', 'PROVIDER', 'BACKFILL'));

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_topic_nonempty"
  CHECK (length(btrim("topic")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_event_type_nonempty"
  CHECK (length(btrim("event_type")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_aggregate_identity_nonempty"
  CHECK (
    length(btrim("aggregate_type")) > 0
    AND length(btrim("aggregate_id")) > 0
  );

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_idempotency_key_nonempty"
  CHECK (length(btrim("idempotency_key")) > 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_aggregate_version_valid"
  CHECK ("aggregate_version" IS NULL OR "aggregate_version" >= 0);

ALTER TABLE "sync_events"
  ADD CONSTRAINT "sync_events_expiry_valid"
  CHECK ("expires_at" > "created_at");

ALTER TABLE "revenue_intelligence_scores"
  ADD CONSTRAINT "revenue_intelligence_score_range"
  CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "revenue_intelligence_scores"
  ADD CONSTRAINT "revenue_intelligence_confidence_range"
  CHECK ("confidence" >= 0 AND "confidence" <= 100);
