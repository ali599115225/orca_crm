ALTER TABLE public.whatsapp_contacts
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_user_name TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant_archived_last_message
  ON public.whatsapp_contacts (tenant_id, archived, last_message_at);
