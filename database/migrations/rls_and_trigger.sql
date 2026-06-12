-- =====================================================================
-- Orca CRM SaaS - نظام عزل المستأجرين وأمان قاعدة البيانات
-- Migration: RLS Policies + Agent Slots Cap Trigger
-- تاريخ: 2026-05-29
-- =====================================================================
-- ⚠️ تنفيذ هذا الملف مباشرةً على قاعدة بيانات Neon PostgreSQL عبر:
--    npx prisma db execute --file=database/migrations/rls_and_trigger.sql
-- أو عبر Neon Console → SQL Editor
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- القسم 1: Row Level Security (RLS) على جدول tenants
-- ─────────────────────────────────────────────────────────────────────

-- تفعيل RLS على جدول المستأجرين
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- إزالة السياسة القديمة إن وجدت (لأمان التطبيق المتكرر)
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;

-- سياسة العزل: يمنح كل مستأجر رؤية سجله الخاص فقط
-- يتم تمرير app.current_tenant_id من خلال Server Action أو API قبل أي استعلام
CREATE POLICY tenant_isolation_policy ON tenants
  FOR ALL
  USING (
    id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- ─────────────────────────────────────────────────────────────────────
-- القسم 2: RLS على الجداول الفرعية (leads, users, projects, tasks)
-- ─────────────────────────────────────────────────────────────────────

-- جدول المستخدمين
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- جدول العملاء المحتملين
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_tenant_isolation ON leads;
CREATE POLICY leads_tenant_isolation ON leads
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- جدول المشاريع
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_tenant_isolation ON projects;
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- جدول المهام
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- جدول التذاكر
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tickets_tenant_isolation ON tickets;
CREATE POLICY tickets_tenant_isolation ON tickets
  FOR ALL
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR current_setting('app.is_super_admin', true) = 'true'
  );

-- ─────────────────────────────────────────────────────────────────────
-- القسم 3: Trigger - منع تجاوز سعة الوكلاء حسب الباقة
-- ⚠️ DEPRECATED (2026-06-13): Replaced by unified trigger in
--    database/patches/20260612_agent_slots_plan_alignment.sql
--    and database/agent_systems.sql.
--    This section uses a legacy plan taxonomy (basic/starter/pro/business/enterprise)
--    that does not match the canonical plans (basic/silver/gold) in lib/plan-guard.ts.
--    DO NOT re-apply this trigger. It has been dropped in production.
-- ─────────────────────────────────────────────────────────────────────

-- الدالة الأساسية للتحقق من سعة الوكلاء
CREATE OR REPLACE FUNCTION check_agent_slots_cap_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_plan        TEXT;
  v_extra       INT;
  v_current     INT;
  v_max_slots   INT;
BEGIN
  -- جلب خطة الاشتراك والوكلاء الإضافيين للمستأجر
  SELECT subscription_plan, COALESCE(extra_agents, 0)
  INTO v_plan, v_extra
  FROM tenants
  WHERE id = NEW.tenant_id;

  -- إذا لم يوجد مستأجر، ارفض العملية
  IF NOT FOUND THEN
    RAISE EXCEPTION 'لا يوجد مستأجر بالمعرف: %', NEW.tenant_id;
  END IF;

  -- عدد الوكلاء النشطين الحالي
  SELECT COUNT(*)
  INTO v_current
  FROM agent_slots
  WHERE tenant_id = NEW.tenant_id
    AND is_active = true;

  -- تحديد الحد الأقصى حسب الباقة
  v_max_slots := CASE v_plan
    WHEN 'basic'      THEN 1
    WHEN 'starter'    THEN 2
    WHEN 'pro'        THEN 5
    WHEN 'business'   THEN 10
    WHEN 'enterprise' THEN 50
    ELSE 1
  END + v_extra;

  -- رفع الاستثناء إذا تجاوز الحد الأقصى
  IF v_current >= v_max_slots THEN
    RAISE EXCEPTION
      'تجاوز حد الوكلاء: باقة "%" تسمح بـ % وكيل كحد أقصى (حاليًا: % وكيل نشط). لزيادة الحد، يرجى ترقية الباقة أو إضافة وكلاء إضافيين.',
      v_plan, v_max_slots, v_current;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الـ Trigger بجدول agent_slots
DROP TRIGGER IF EXISTS trg_check_agent_slots ON agent_slots;
CREATE TRIGGER trg_check_agent_slots
  BEFORE INSERT ON agent_slots
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION check_agent_slots_cap_logic();

-- ─────────────────────────────────────────────────────────────────────
-- القسم 4: Trigger - تحديث طابع الوقت تلقائياً
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق Trigger التحديث على جدول leads
DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- تطبيق Trigger التحديث على جدول tickets
DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────
-- تحقق نهائي: عرض السياسات والمشغلات المنشأة
-- ─────────────────────────────────────────────────────────────────────

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
