-- WhatsApp tables for ORCA CRM
-- Run: npx prisma db execute --file scripts/create-whatsapp-tables.sql

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    provider TEXT DEFAULT 'meta',
    meta_contact_id TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, phone)
);

ALTER TABLE whatsapp_contacts ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_last 
    ON whatsapp_contacts(tenant_id, last_message_at);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    direction TEXT DEFAULT 'inbound',
    provider TEXT DEFAULT 'meta',
    message_text TEXT,
    message_type TEXT DEFAULT 'text',
    meta_message_id TEXT,
    raw_payload JSONB,
    status TEXT DEFAULT 'received',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS ai_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_phone 
    ON whatsapp_messages(tenant_id, phone, created_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id 
    ON whatsapp_messages(meta_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES whatsapp_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    mime_type TEXT,
    url TEXT,
    size INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
