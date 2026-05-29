-- =====================================================================
-- Orca CRM SaaS - دالة Round-Robin الذكية للإسناد التلقائي
-- Migration: get_next_available_agent SQL Function
-- تاريخ: 2026-05-29
-- =====================================================================
-- تشغيل:
--   npx prisma db execute --file=database/migrations/round_robin_function.sql
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- دالة Round-Robin: يختار المستشار بأقل حمل عمل خلال 7 أيام
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_next_available_agent(p_tenant_id UUID)
RETURNS UUID AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  -- اختيار المستشار النشط بأقل عدد عملاء مسندين في الأسبوع الماضي
  SELECT u.id
  INTO v_agent_id
  FROM users u
  LEFT JOIN (
    SELECT
      assigned_to,
      COUNT(*) AS recent_lead_count
    FROM leads
    WHERE
      tenant_id = p_tenant_id
      AND created_at > NOW() - INTERVAL '7 days'
      AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) l ON l.assigned_to = u.id
  WHERE
    u.tenant_id = p_tenant_id
    AND u.is_active = true
    AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
  ORDER BY
    COALESCE(l.recent_lead_count, 0) ASC,
    u.created_at ASC  -- في حال التساوي: الأقدم أولاً (ثبات التسلسل)
  LIMIT 1;

  RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────
-- دالة الإسناد التلقائي الكاملة مع تسجيل النشاط
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auto_assign_lead_round_robin(
  p_lead_id   UUID,
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_agent_id   UUID;
  v_agent_name TEXT;
  v_result     JSONB;
BEGIN
  -- جلب المستشار الأمثل
  v_agent_id := get_next_available_agent(p_tenant_id);

  IF v_agent_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'لا يوجد مستشار نشط للإسناد في هذه الشركة',
      'lead_id', p_lead_id
    );
  END IF;

  -- جلب اسم المستشار للتوثيق
  SELECT name INTO v_agent_name FROM users WHERE id = v_agent_id;

  -- تحديث سجل العميل بالمستشار المختار
  UPDATE leads
  SET assigned_to = v_agent_id
  WHERE id = p_lead_id AND tenant_id = p_tenant_id;

  -- تسجيل نشاط الإسناد التلقائي
  INSERT INTO lead_activities (
    id, tenant_id, lead_id, user_id, activity_type, description, created_at
  )
  VALUES (
    gen_random_uuid(),
    p_tenant_id,
    p_lead_id,
    NULL,  -- وكيل آلي (لا مستخدم بشري)
    'AUTO_ASSIGNED_BY_SAHER',
    FORMAT(
      'تم إسناد العميل تلقائياً بواسطة الوكيل ساهر (Round-Robin) إلى المستشار: %s',
      v_agent_name
    ),
    NOW()
  );

  v_result := jsonb_build_object(
    'success',        true,
    'lead_id',        p_lead_id,
    'assigned_to_id', v_agent_id,
    'assigned_to',    v_agent_name,
    'timestamp',      NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────
-- التحقق: عرض الدوال المنشأة
-- ─────────────────────────────────────────────────────────────────────

SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_next_available_agent', 'auto_assign_lead_round_robin')
ORDER BY routine_name;
