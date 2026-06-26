◇ injected env (0) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "commission_payments" DROP CONSTRAINT "commission_payments_commission_id_fkey";

-- DropForeignKey
ALTER TABLE "commission_payments" DROP CONSTRAINT "commission_payments_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "government_outbox" DROP CONSTRAINT "government_outbox_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "installments" DROP CONSTRAINT "installments_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_contract_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_reversed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_lines" DROP CONSTRAINT "journal_lines_account_id_fkey";

-- DropForeignKey
ALTER TABLE "maintenance_tickets" DROP CONSTRAINT "maintenance_tickets_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_installment_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_action_suggestions" DROP CONSTRAINT "revenue_action_suggestions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_action_suggestions" DROP CONSTRAINT "revenue_action_suggestions_decided_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_action_suggestions" DROP CONSTRAINT "revenue_action_suggestions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_audit_entries" DROP CONSTRAINT "revenue_audit_entries_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_audit_entries" DROP CONSTRAINT "revenue_audit_entries_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_dataset_snapshots" DROP CONSTRAINT "revenue_dataset_snapshots_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_domain_events" DROP CONSTRAINT "revenue_domain_events_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_domain_events" DROP CONSTRAINT "revenue_domain_events_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_intelligence_scores" DROP CONSTRAINT "revenue_intelligence_scores_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_model_versions" DROP CONSTRAINT "revenue_model_versions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_model_versions" DROP CONSTRAINT "revenue_model_versions_dataset_snapshot_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_model_versions" DROP CONSTRAINT "revenue_model_versions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_next_actions" DROP CONSTRAINT "revenue_next_actions_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "revenue_next_actions" DROP CONSTRAINT "revenue_next_actions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_outbox_messages" DROP CONSTRAINT "revenue_outbox_messages_event_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_outbox_messages" DROP CONSTRAINT "revenue_outbox_messages_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_predictions" DROP CONSTRAINT "revenue_predictions_model_version_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_predictions" DROP CONSTRAINT "revenue_predictions_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_applications" DROP CONSTRAINT "revenue_provider_applications_submitted_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_applications" DROP CONSTRAINT "revenue_provider_applications_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_connections" DROP CONSTRAINT "revenue_provider_connections_created_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_connections" DROP CONSTRAINT "revenue_provider_connections_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_connections" DROP CONSTRAINT "revenue_provider_connections_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_webhooks" DROP CONSTRAINT "revenue_provider_webhooks_connection_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_provider_webhooks" DROP CONSTRAINT "revenue_provider_webhooks_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_risk_signals" DROP CONSTRAINT "revenue_risk_signals_acknowledged_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_risk_signals" DROP CONSTRAINT "revenue_risk_signals_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_risk_signals" DROP CONSTRAINT "revenue_risk_signals_resolved_by_fkey";

-- DropForeignKey
ALTER TABLE "revenue_risk_signals" DROP CONSTRAINT "revenue_risk_signals_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "revenue_rule_runs" DROP CONSTRAINT "revenue_rule_runs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tours" DROP CONSTRAINT "tours_assigned_to_fkey";

-- DropForeignKey
ALTER TABLE "tours" DROP CONSTRAINT "tours_lead_id_fkey";

-- DropForeignKey
ALTER TABLE "tours" DROP CONSTRAINT "tours_opportunity_id_fkey";

-- DropForeignKey
ALTER TABLE "tours" DROP CONSTRAINT "tours_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_connections" DROP CONSTRAINT "fk_whatsapp_connections_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_consents" DROP CONSTRAINT "fk_whatsapp_consents_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_credentials" DROP CONSTRAINT "fk_whatsapp_credentials_connection";

-- DropForeignKey
ALTER TABLE "whatsapp_credentials" DROP CONSTRAINT "fk_whatsapp_credentials_rotated_from";

-- DropForeignKey
ALTER TABLE "whatsapp_integration_audits" DROP CONSTRAINT "fk_whatsapp_integration_audits_connection";

-- DropForeignKey
ALTER TABLE "whatsapp_integration_audits" DROP CONSTRAINT "fk_whatsapp_integration_audits_credential";

-- DropForeignKey
ALTER TABLE "whatsapp_integration_audits" DROP CONSTRAINT "fk_whatsapp_integration_audits_phone";

-- DropForeignKey
ALTER TABLE "whatsapp_integration_audits" DROP CONSTRAINT "fk_whatsapp_integration_audits_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_integration_audits" DROP CONSTRAINT "fk_whatsapp_integration_audits_user";

-- DropForeignKey
ALTER TABLE "whatsapp_opt_outs" DROP CONSTRAINT "fk_whatsapp_opt_outs_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_phone_numbers" DROP CONSTRAINT "fk_whatsapp_phone_numbers_connection";

-- DropForeignKey
ALTER TABLE "whatsapp_signup_sessions" DROP CONSTRAINT "fk_whatsapp_signup_sessions_connection";

-- DropForeignKey
ALTER TABLE "whatsapp_signup_sessions" DROP CONSTRAINT "fk_whatsapp_signup_sessions_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_signup_sessions" DROP CONSTRAINT "fk_whatsapp_signup_sessions_user";

-- DropForeignKey
ALTER TABLE "whatsapp_templates" DROP CONSTRAINT "fk_whatsapp_templates_connection";

-- DropForeignKey
ALTER TABLE "whatsapp_templates" DROP CONSTRAINT "fk_whatsapp_templates_tenant";

-- DropForeignKey
ALTER TABLE "whatsapp_webhook_events" DROP CONSTRAINT "fk_whatsapp_webhook_events_envelope";

-- DropForeignKey
ALTER TABLE "whatsapp_webhook_events" DROP CONSTRAINT "fk_whatsapp_webhook_events_message";

-- DropForeignKey
ALTER TABLE "whatsapp_webhook_events" DROP CONSTRAINT "fk_whatsapp_webhook_events_tenant";

-- DropIndex
DROP INDEX "revenue_suggestion_tenant_status_created_idx";

-- DropIndex
DROP INDEX "revenue_audit_resource_idx";

-- DropIndex
DROP INDEX "revenue_dataset_tenant_created_idx";

-- DropIndex
DROP INDEX "revenue_event_aggregate_idx";

-- DropIndex
DROP INDEX "revenue_model_tenant_status_idx";

-- DropIndex
DROP INDEX "revenue_outbox_tenant_created_idx";

-- DropIndex
DROP INDEX "revenue_prediction_opportunity_idx";

-- DropIndex
DROP INDEX "revenue_webhook_tenant_provider_idx";

-- DropIndex
DROP INDEX "revenue_rule_run_tenant_started_idx";

-- DropTable
DROP TABLE "rental_invoices_legacy";

-- CreateIndex
CREATE INDEX "revenue_suggestion_tenant_status_created_idx" ON "revenue_action_suggestions"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "revenue_audit_resource_idx" ON "revenue_audit_entries"("tenant_id", "resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_dataset_tenant_created_idx" ON "revenue_dataset_snapshots"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_event_aggregate_idx" ON "revenue_domain_events"("tenant_id", "aggregate_type", "aggregate_id", "occurred_at");

-- CreateIndex
CREATE INDEX "revenue_model_tenant_status_idx" ON "revenue_model_versions"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "revenue_outbox_tenant_created_idx" ON "revenue_outbox_messages"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "revenue_prediction_opportunity_idx" ON "revenue_predictions"("tenant_id", "opportunity_id", "scored_at");

-- CreateIndex
CREATE INDEX "revenue_webhook_tenant_provider_idx" ON "revenue_provider_webhooks"("tenant_id", "provider", "received_at");

-- CreateIndex
CREATE INDEX "revenue_rule_run_tenant_started_idx" ON "revenue_rule_runs"("tenant_id", "started_at");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "rental_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "rental_invoices_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "rental_leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_outbox" ADD CONSTRAINT "government_outbox_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_commission_id_fkey" FOREIGN KEY ("commission_id") REFERENCES "payroll_commissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "fk_whatsapp_connections_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "fk_whatsapp_credentials_connection" FOREIGN KEY ("connection_id") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_credentials" ADD CONSTRAINT "fk_whatsapp_credentials_rotated_from" FOREIGN KEY ("rotated_from") REFERENCES "whatsapp_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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

