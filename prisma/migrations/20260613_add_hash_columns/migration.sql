ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users (email_hash);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_hash TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_tenant_phone_hash ON leads (tenant_id, phone_hash);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_hash TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone_hash ON contacts (tenant_id, phone_hash);

ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_phone_hash ON whatsapp_contacts (tenant_id, phone_hash);

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_phone_hash ON whatsapp_messages (tenant_id, phone_hash);

ALTER TABLE mansour_chats ADD COLUMN IF NOT EXISTS contact_phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_mansour_chats_tenant_contact_phone_hash ON mansour_chats (tenant_id, contact_phone_hash);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS buyer_phone_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_buyer_phone_hash ON contracts (tenant_id, buyer_phone_hash);
