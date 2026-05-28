-- ============================================================
-- 🔒 قاعدة البيانات - الـ Triggers والـ Functions الكاملة
-- ORCA CRM - Agent Systems SQL Layer
-- ============================================================

-- ==============================================
-- 1. تفعيل Row-Level Security (RLS) على الجداول
-- ==============================================

ALTER TABLE agent_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_commissions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. دالة قفل السعة - check_agent_slots_cap()
-- تُشغَّل قبل إدراج أي مقعد وكيل جديد
-- تمنع الباقة الفضية من تجاوز 5 مقاعد
-- ==============================================

CREATE OR REPLACE FUNCTION check_agent_slots_cap()
RETURNS TRIGGER AS $$
DECLARE
  tenant_plan VARCHAR(50);
  active_slots_count INT;
  max_slots INT;
BEGIN
  -- جلب خطة اشتراك الشركة
  SELECT subscription_plan INTO tenant_plan
  FROM tenants
  WHERE id = NEW.tenant_id;

  -- تحديد الحد الأقصى للمقاعد بناءً على الباقة
  CASE tenant_plan
    WHEN 'basic'  THEN max_slots := 1;
    WHEN 'silver' THEN max_slots := 5;
    WHEN 'gold'   THEN max_slots := 999999; -- لا محدود
    ELSE               max_slots := 1;
  END CASE;

  -- حساب عدد المقاعد الحالية النشطة للشركة
  SELECT COUNT(*) INTO active_slots_count
  FROM agent_slots
  WHERE tenant_id = NEW.tenant_id AND is_active = TRUE;

  -- تطبيق قفل السعة إذا تم الوصول للحد الأقصى
  IF active_slots_count >= max_slots THEN
    RAISE EXCEPTION '🔒 CAP LOCK: تمت الاستفادة من كامل مقاعد الوكلاء المتاحة لباقة (%). الحد الأقصى هو % مقاعد. يرجى ترقية الباقة للحصول على مقاعد إضافية.', 
      tenant_plan, max_slots
    USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ Trigger بجدول agent_slots
DROP TRIGGER IF EXISTS trigger_check_agent_slots_cap ON agent_slots;
CREATE TRIGGER trigger_check_agent_slots_cap
  BEFORE INSERT ON agent_slots
  FOR EACH ROW
  EXECUTE FUNCTION check_agent_slots_cap();

-- ==============================================
-- 3. دالة التوزيع الدائري - get_next_available_agent()
-- تختار موظف المبيعات الأقل تحميلاً (Round-Robin)
-- ==============================================

CREATE OR REPLACE FUNCTION get_next_available_agent(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  next_agent_id UUID;
BEGIN
  -- اختر أقل موظف نشط ورد مبيعات استقبل عملاء من بين الموظفين النشطين
  -- مع الأولوية لمن لم يُعيَّن له أي عميل بعد
  SELECT u.id INTO next_agent_id
  FROM users u
  LEFT JOIN (
    SELECT assigned_to, COUNT(*) as lead_count
    FROM leads
    WHERE tenant_id = p_tenant_id
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) lc ON lc.assigned_to = u.id
  WHERE u.tenant_id = p_tenant_id
    AND u.is_active = TRUE
    AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
  ORDER BY COALESCE(lc.lead_count, 0) ASC, u.created_at ASC
  LIMIT 1;

  RETURN next_agent_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. دالة تشغيل Round-Robin عند دخول عميل جديد
-- ==============================================

CREATE OR REPLACE FUNCTION auto_assign_lead_round_robin()
RETURNS TRIGGER AS $$
DECLARE
  assigned_agent UUID;
BEGIN
  -- تشغيل التوزيع فقط إذا لم يُعيَّن عميل لموظف مسبقاً
  IF NEW.assigned_to IS NULL THEN
    assigned_agent := get_next_available_agent(NEW.tenant_id);
    IF assigned_agent IS NOT NULL THEN
      NEW.assigned_to := assigned_agent;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الـ Trigger بجدول leads
DROP TRIGGER IF EXISTS trigger_leads_round_robin ON leads;
CREATE TRIGGER trigger_leads_round_robin
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_lead_round_robin();

-- ==============================================
-- 5. دالة تحديث حداثة updated_at تلقائياً
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 6. سياسات RLS لعزل بيانات كل شركة (Tenant Isolation)
-- ==============================================

-- سياسات agent_slots
CREATE POLICY "tenant_agent_slots_isolation"
  ON agent_slots FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- سياسات usage_meters
CREATE POLICY "tenant_usage_meters_isolation"
  ON usage_meters FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- سياسات payroll_commissions
CREATE POLICY "tenant_payroll_isolation"
  ON payroll_commissions FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ==============================================
-- 7. إنشاء فهارس (Indexes) لتحسين الأداء
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_agent_slots_tenant ON agent_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_slots_active ON agent_slots(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_usage_meters_tenant ON usage_meters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_meters_slot ON usage_meters(agent_slot_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_user ON payroll_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_round_robin ON leads(tenant_id, assigned_to, created_at);

-- ==============================================
-- 8. دالة WAF بسيطة - تطهير المدخلات (Sanitization)
-- ==============================================

CREATE OR REPLACE FUNCTION sanitize_text_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- إزالة أكواد SQL الخطيرة والـ XSS
  RETURN regexp_replace(
    regexp_replace(input_text, '<[^>]*>', '', 'g'),
    '(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|EXEC|SCRIPT|JAVASCRIPT)',
    '***', 'gi'
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 9. Trigger لتطهير حقول العملاء تلقائياً (WAF)
-- ==============================================

CREATE OR REPLACE FUNCTION sanitize_lead_inputs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.first_name := sanitize_text_input(NEW.first_name);
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := sanitize_text_input(NEW.last_name);
  END IF;
  IF NEW.source IS NOT NULL THEN
    NEW.source := sanitize_text_input(NEW.source);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sanitize_leads ON leads;
CREATE TRIGGER trigger_sanitize_leads
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_lead_inputs();

COMMENT ON FUNCTION check_agent_slots_cap() IS '🔒 Cap Lock: يمنع تجاوز الحد الأقصى لمقاعد الوكلاء حسب الباقة';
COMMENT ON FUNCTION get_next_available_agent(UUID) IS '🔄 Round-Robin: يختار أقل موظف مبيعات تحميلاً للتوزيع التلقائي';
COMMENT ON FUNCTION auto_assign_lead_round_robin() IS '🤖 يوزع العملاء الجدد تلقائياً على الفريق بالتناوب';
COMMENT ON FUNCTION sanitize_text_input(TEXT) IS '🛡️ WAF: يطهر المدخلات من الـ SQL Injection والـ XSS';
