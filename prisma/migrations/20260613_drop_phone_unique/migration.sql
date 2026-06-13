-- Drop old unique on raw phone (replaced by phoneHash unique in 08-G2D1)
ALTER TABLE whatsapp_contacts DROP CONSTRAINT IF EXISTS whatsapp_contacts_tenant_id_phone_key;
