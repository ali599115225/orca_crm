CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_contacts_tenant_id_phone_hash_key ON whatsapp_contacts (tenant_id, phone_hash);
