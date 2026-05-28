// app/api/db-init/route.ts
// تهيئة الـ Triggers والـ Functions في Neon PostgreSQL
// يُستدعى مرة واحدة من لوحة الإدارة العليا فقط

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import * as fs from "fs";
import * as path from "path";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId as string }
    });
    const isSuperAdmin =
      user?.email === "ali.orca@outlook.sa" ||
      user?.email === "elite.orca@outlook.sa";

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // تنفيذ الـ SQL مباشرةً على قاعدة البيانات
    const sqlStatements = [
      // 1. دالة Cap Lock لمقاعد الوكلاء
      `CREATE OR REPLACE FUNCTION check_agent_slots_cap()
      RETURNS TRIGGER AS $$
      DECLARE
        tenant_plan VARCHAR(50);
        active_slots_count INT;
        max_slots INT;
      BEGIN
        SELECT subscription_plan INTO tenant_plan FROM tenants WHERE id = NEW.tenant_id;
        CASE tenant_plan
          WHEN 'basic'  THEN max_slots := 1;
          WHEN 'silver' THEN max_slots := 5;
          WHEN 'gold'   THEN max_slots := 999999;
          ELSE               max_slots := 1;
        END CASE;
        SELECT COUNT(*) INTO active_slots_count FROM agent_slots WHERE tenant_id = NEW.tenant_id AND is_active = TRUE;
        IF active_slots_count >= max_slots THEN
          RAISE EXCEPTION '🔒 CAP LOCK: الحد الأقصى للمقاعد في باقة (%) هو % مقاعد. يرجى ترقية باقتك.', tenant_plan, max_slots USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,

      // 2. إنشاء الـ Trigger
      `DROP TRIGGER IF EXISTS trigger_check_agent_slots_cap ON agent_slots`,
      `CREATE TRIGGER trigger_check_agent_slots_cap BEFORE INSERT ON agent_slots FOR EACH ROW EXECUTE FUNCTION check_agent_slots_cap()`,

      // 3. دالة Round-Robin
      `CREATE OR REPLACE FUNCTION get_next_available_agent(p_tenant_id UUID)
      RETURNS UUID AS $$
      DECLARE next_agent_id UUID;
      BEGIN
        SELECT u.id INTO next_agent_id
        FROM users u
        LEFT JOIN (SELECT assigned_to, COUNT(*) as lead_count FROM leads WHERE tenant_id = p_tenant_id AND assigned_to IS NOT NULL GROUP BY assigned_to) lc ON lc.assigned_to = u.id
        WHERE u.tenant_id = p_tenant_id AND u.is_active = TRUE AND u.role IN ('SALES_EMPLOYEE', 'SALES_MANAGER')
        ORDER BY COALESCE(lc.lead_count, 0) ASC, u.created_at ASC LIMIT 1;
        RETURN next_agent_id;
      END;
      $$ LANGUAGE plpgsql`,

      // 4. دالة التوزيع التلقائي للعملاء
      `CREATE OR REPLACE FUNCTION auto_assign_lead_round_robin()
      RETURNS TRIGGER AS $$
      DECLARE assigned_agent UUID;
      BEGIN
        IF NEW.assigned_to IS NULL THEN
          assigned_agent := get_next_available_agent(NEW.tenant_id);
          IF assigned_agent IS NOT NULL THEN NEW.assigned_to := assigned_agent; END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,

      // 5. Trigger التوزيع على الـ leads
      `DROP TRIGGER IF EXISTS trigger_leads_round_robin ON leads`,
      `CREATE TRIGGER trigger_leads_round_robin BEFORE INSERT ON leads FOR EACH ROW EXECUTE FUNCTION auto_assign_lead_round_robin()`,

      // 6. دالة التطهير (WAF)
      `CREATE OR REPLACE FUNCTION sanitize_text_input(input_text TEXT)
      RETURNS TEXT AS $$
      BEGIN
        RETURN regexp_replace(regexp_replace(input_text, '<[^>]*>', '', 'g'), '(DROP|DELETE|INSERT|UPDATE|UNION|ALTER|EXEC|SCRIPT|JAVASCRIPT)', '***', 'gi');
      END;
      $$ LANGUAGE plpgsql`,

      // 7. Trigger تطهير العملاء
      `CREATE OR REPLACE FUNCTION sanitize_lead_inputs()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.first_name := sanitize_text_input(NEW.first_name);
        IF NEW.last_name IS NOT NULL THEN NEW.last_name := sanitize_text_input(NEW.last_name); END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,

      `DROP TRIGGER IF EXISTS trigger_sanitize_leads ON leads`,
      `CREATE TRIGGER trigger_sanitize_leads BEFORE INSERT OR UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION sanitize_lead_inputs()`,

      // 8. فهارس الأداء
      `CREATE INDEX IF NOT EXISTS idx_agent_slots_tenant ON agent_slots(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_usage_meters_tenant ON usage_meters(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_commissions(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(tenant_id, assigned_to)`,
    ];

    const results: string[] = [];
    for (const sql of sqlStatements) {
      await prisma.$executeRawUnsafe(sql);
      results.push(`✅ ${sql.substring(0, 60)}...`);
    }

    return NextResponse.json({
      success: true,
      message: `تم تهيئة ${results.length} دالة وتشغيل بنجاح على قاعدة بيانات Neon PostgreSQL`,
      results,
    });
  } catch (error: any) {
    console.error("خطأ تهيئة قاعدة البيانات:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
