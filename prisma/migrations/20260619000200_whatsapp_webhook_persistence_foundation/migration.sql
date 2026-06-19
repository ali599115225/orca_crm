CREATE TABLE IF NOT EXISTS public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT whatsapp_phone_numbers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_phone_numbers_phone_number_id
  ON public.whatsapp_phone_numbers (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_tenant_active
  ON public.whatsapp_phone_numbers (tenant_id, is_active);

DROP INDEX IF EXISTS public.idx_whatsapp_messages_meta_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_meta_message_id
  ON public.whatsapp_messages (meta_message_id);
