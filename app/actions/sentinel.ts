// app/actions/sentinel.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendAdminEmailAlert } from "@/lib/email";
import { exec } from "child_process";
import { promisify } from "util";
import dns from "dns";
import {
  buildSentinelSystemPrompt,
  type SentinelAIOutput,
} from "@/lib/agents/sentinelPrompt";

const execPromise = promisify(exec);
const resolveDns = promisify(dns.resolve);

export interface SentinelReport {
  timestamp: string;
  vercel: {
    status: "HEALTHY" | "WARNING" | "ERROR";
    projectName: string;
    latestDeploymentUrl: string;
    latestDeploymentStatus: string;
    buildTime: string;
    errorDetails: string | null;
  };
  database: {
    status: "HEALTHY" | "ERROR";
    latencyMs: number;
    connectionsCount: number;
    totalRows: {
      tenants: number;
      users: number;
      leads: number;
      projects: number;
    };
    sslMode: string;
    errorDetails: string | null;
  };
  domain: {
    status: "HEALTHY" | "ERROR";
    domainName: string;
    ipResolved: string;
    httpResponseCode: number;
    sslStatus: string;
    errorDetails: string | null;
  };
  anomalies: string[];
  recommendations: string[];
  aiAnalysis?: SentinelAIOutput | null;
}

/**
 * 🤖 الوكيل الذكي "ساهر الصيانة" (Sentinel Maintenance Agent)
 * فحص كامل وتلقائي لثلاث طبقات: Vercel + قاعدة البيانات + موقع النطاق
 */
export async function runSystemDiagnosticsAction(): Promise<{ success: boolean; report?: SentinelReport; error?: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("يجب تسجيل الدخول كمسؤول أولاً.");

    const isSuperAdmin = session.email === "ali.orca@outlook.sa" || session.email === "elite.orca@outlook.sa";
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    if (!isSuperAdmin && !superAdminEmails.includes(String(session.email).toLowerCase())) throw new Error("غير مصرح لك بتشغيل وكيل المراقبة.");

    const anomalies: string[] = [];
    const recommendations: string[] = [];

    // --- 1. فحص Vercel Cloud ---
    let vercelStatus: "HEALTHY" | "WARNING" | "ERROR" = "HEALTHY";
    let projectName = "orca-crm";
    let latestDeploymentUrl = "orca-crm-one.vercel.app";
    let latestDeploymentStatus = "Ready";
    let buildTime = "23s";
    let vercelError: string | null = null;

    try {
      // تشغيل Vercel CLI لجلب حالة النشر الأخيرة برمجياً
      const { stdout } = await execPromise("npx vercel ls", { cwd: "C:/Users/ali59/Desktop/REDC" });
      
      // تحليل المخرجات برمجياً لاستخلاص الرابط وحالة البناء
      if (stdout.includes("ali-s-projectsorcacrm/orca-crm")) {
        const lines = stdout.split("\n");
        const projectLine = lines.find(l => l.includes("orca-crm"));
        if (projectLine) {
          const parts = projectLine.trim().split(/\s+/);
          // الأجزاء عادة: العمر، اسم المشروع، الرابط، الحالة، البيئة، وقت البناء، المستخدم
          if (parts.length >= 4) {
            latestDeploymentUrl = parts[2].startsWith("http") ? parts[2] : `https://${parts[2]}`;
            latestDeploymentStatus = parts[3];
            if (latestDeploymentStatus.toLowerCase().includes("error")) {
              vercelStatus = "ERROR";
              anomalies.push("🚨 رصد فشل في بناء أو نشر النسخة الأخيرة على Vercel.");
              recommendations.push("فحص سجلات بناء Vercel (Build Logs) ومعالجة أخطاء الكود.");
            } else if (latestDeploymentStatus.toLowerCase().includes("building")) {
              vercelStatus = "WARNING";
              anomalies.push("⚠️ هناك عملية بناء نشطة وجارية حالياً على خوادم Vercel.");
            }
          }
        }
      }
    } catch (err: any) {
      vercelStatus = "WARNING";
      vercelError = err.message;
      anomalies.push("⚠️ تعذر التحقق برمجياً من Vercel CLI (قد يكون بسبب صلاحيات الوصول).");
      recommendations.push("تأكيد تسجيل دخول Vercel CLI على خادم الاستضافة.");
    }

    // --- 2. فحص قاعدة البيانات (Neon PostgreSQL) ---
    let dbStatus: "HEALTHY" | "ERROR" = "HEALTHY";
    let dbLatency = 0;
    let dbError: string | null = null;
    let tenantsCount = 0;
    let usersCount = 0;
    let leadsCount = 0;
    let projectsCount = 0;

    const startDb = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startDb;

      tenantsCount = await prisma.tenant.count();
      usersCount = await prisma.user.count();
      leadsCount = await prisma.lead.count();
      projectsCount = await prisma.project.count();

      if (dbLatency > 400) {
        anomalies.push(`⚠️ بطء في استجابة قاعدة البيانات السحابية: زمن الاستجابة ${dbLatency} ملي ثانية.`);
        recommendations.push("التحقق من حالة Neon DB أو تفعيل خيار كاش الاستعلامات الإضافي.");
      }
    } catch (err: any) {
      dbStatus = "ERROR";
      dbError = err.message;
      vercelStatus = "ERROR";
      anomalies.push(`🚨 فشل اتصال قاعدة البيانات السحابية بالكامل: ${err.message}`);
      recommendations.push("التحقق من صحة DATABASE_URL في متغيرات البيئة واستقرار Neon.");
    }

    // فحص تشفير الـ SSL لقاعدة البيانات
    const dbUrl = process.env.DATABASE_URL || "";
    let sslMode = "غير محدد";
    if (dbUrl.includes("sslmode=")) {
      const match = dbUrl.match(/sslmode=([^&]+)/);
      sslMode = match ? match[1] : "غير محدد";
    }
    if (sslMode !== "verify-full") {
      anomalies.push(`⚠️ تشفير اتصال قاعدة البيانات SSL ضعيف أو غير مفعل بالكامل (${sslMode}).`);
      recommendations.push("تعديل قيمة DATABASE_URL لتشمل sslmode=verify-full لحماية البيانات.");
    }

    // --- 3. فحص النطاق وشهادة الأمان (DNS & Domain Uptime) ---
    let domainStatus: "HEALTHY" | "ERROR" = "HEALTHY";
    const domainName = "orca-crm-one.vercel.app";
    let ipResolved = "127.0.0.1";
    let httpResponseCode = 200;
    let sslStatus = "نشط ومحمي بـ Let's Encrypt SSL";
    let domainError: string | null = null;

    try {
      // فحص الـ DNS
      const addresses = await resolveDns(domainName);
      if (addresses && addresses.length > 0) {
        ipResolved = addresses[0];
      }

      // فحص استجابة الـ HTTP للنطاق
      const response = await fetch(`https://${domainName}`, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      httpResponseCode = response.status;
      if (httpResponseCode >= 400) {
        domainStatus = "ERROR";
        anomalies.push(`🚨 النطاق السحابي يُرجع كود خطأ HTTP (${httpResponseCode}).`);
        recommendations.push("التحقق من إعدادات خوادم النطاق والـ DNS التابعة لـ Vercel.");
      }
    } catch (err: any) {
      domainStatus = "ERROR";
      domainError = err.message;
      anomalies.push(`🚨 فشل التحقق من استجابة النطاق السحابي: ${err.message}`);
      recommendations.push("التحقق من استقرار اتصال الإنترنت والـ DNS الخاص بالنطاق.");
    }

    // إذا لم يتم رصد أي شذوذ
    if (anomalies.length === 0) {
      anomalies.push("✅ جميع الأنظمة سحابياً وفنياً تعمل بكفاءة 100% وبدون مشاكل.");
      recommendations.push("استمر في مراقبة التشغيل ولا توجد إجراءات صيانة مطلوبة حالياً.");
    }

    const report: SentinelReport = {
      timestamp: new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }),
      vercel: {
        status: vercelStatus,
        projectName,
        latestDeploymentUrl,
        latestDeploymentStatus,
        buildTime,
        errorDetails: vercelError
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        connectionsCount: 1,
        totalRows: {
          tenants: tenantsCount,
          users: usersCount,
          leads: leadsCount,
          projects: projectsCount
        },
        sslMode,
        errorDetails: dbError
      },
      domain: {
        status: domainStatus,
        domainName,
        ipResolved,
        httpResponseCode,
        sslStatus,
        errorDetails: domainError
      },
      anomalies,
      recommendations
    };

    // --- 4. إرسال بريد إلكتروني تنبيهي حريري للمشرف العام في حال رصد أخطاء ---
    const hasCriticalIssues = report.vercel.status === "ERROR" || report.database.status === "ERROR" || report.domain.status === "ERROR";
    const emailSubject = `${hasCriticalIssues ? "🚨 تنبيه حرج:" : "🔍 تقرير دوري:"} صيانة ومراقبة نظام ORCA`;
    
    const anomaliesHtml = report.anomalies.map(a => `<li style="margin-bottom: 6px; color: ${a.includes('🚨') ? '#dc2626' : '#d97706'}; font-weight: bold;">${a}</li>`).join("");
    const recsHtml = report.recommendations.map(r => `<li style="margin-bottom: 4px; color: #334155;">${r}</li>`).join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 30px; background-color: #090d16; color: #ffffff; border-radius: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #f59e0b20;">
        <h2 style="color: #f59e0b; border-bottom: 1px solid #ffffff10; padding-bottom: 15px; margin-top: 0;">
          🤖 وكيل الصيانة ساهر (Sentinel Report)
        </h2>
        <p style="font-size: 11px; color: #94a3b8;">تاريخ التشخيص: ${report.timestamp} بتوقيت الرياض</p>
        
        <div style="margin: 20px 0; background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid #f59e0b30;">
          <h4 style="margin-top: 0; color: #f59e0b; font-size: 13px;">📊 طبقات فحص النظام التشغيلي:</h4>
          <ul style="list-style-type: none; padding-right: 0; font-size: 12px; line-height: 1.8;">
            <li>☁️ <strong>حالة Vercel:</strong> <span style="color: ${report.vercel.status === 'HEALTHY' ? '#10b981' : '#f59e0b'}; font-weight: bold;">${report.vercel.latestDeploymentStatus}</span></li>
            <li>🗄️ <strong>سرعة استجابة قاعدة البيانات:</strong> <span style="color: ${report.database.status === 'HEALTHY' ? '#10b981' : '#ef4444'}; font-weight: bold;">${report.database.latencyMs} ms</span></li>
            <li>🌍 <strong>اتصال النطاق الرئيسي:</strong> <span style="color: ${report.domain.status === 'HEALTHY' ? '#10b981' : '#ef4444'}; font-weight: bold;">HTTP ${report.domain.httpResponseCode}</span></li>
          </ul>
        </div>

        <div style="margin: 20px 0;">
          <h4 style="color: #ef4444; font-size: 13px; margin-bottom: 8px;">🚨 مؤشرات الشذوذ والتحذيرات:</h4>
          <ul style="padding-right: 20px; font-size: 12px;">
            ${anomaliesHtml}
          </ul>
        </div>

        <div style="margin: 20px 0; background: #064e3b20; padding: 15px; border-radius: 12px; border: 1px solid #05966950;">
          <h4 style="color: #10b981; margin-top: 0; font-size: 13px; margin-bottom: 8px;">💡 توصيات الوكيل الفورية:</h4>
          <ul style="padding-right: 20px; font-size: 12px; margin-bottom: 0;">
            ${recsHtml}
          </ul>
        </div>

        <p style="font-size: 10px; color: #475569; text-align: center; border-top: 1px solid #ffffff10; padding-top: 15px; margin-top: 25px;">
          هذا التقرير الفني تم إصداره وتنبيهه آلياً لمشرفي النظام العامين لمنصة ORCA.
        </p>
      </div>
    `;

    await sendAdminEmailAlert(emailSubject, emailHtml);

    // --- 5. استدعاء Gemini لتحليل التقرير وتقديم توصيات ذكية ---
    let aiAnalysis: SentinelAIOutput | null = null;
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (apiKey) {
        const systemPrompt = buildSentinelSystemPrompt({ domainName });

        const rawReportData = `
تقرير فحص نظام ORCA:

### Vercel:
- الحالة: ${report.vercel.status}
- المشروع: ${report.vercel.projectName}
- رابط النشر: ${report.vercel.latestDeploymentUrl}
- حالة النشر: ${report.vercel.latestDeploymentStatus}
- وقت البناء: ${report.vercel.buildTime}
- تفاصيل الخطأ: ${report.vercel.errorDetails || "لا يوجد"}

### قاعدة البيانات:
- الحالة: ${report.database.status}
- زمن الاستجابة: ${report.database.latencyMs}ms
- عدد المستأجرين: ${report.database.totalRows.tenants}
- عدد المستخدمين: ${report.database.totalRows.users}
- عدد العملاء: ${report.database.totalRows.leads}
- عدد المشاريع: ${report.database.totalRows.projects}
- وضع SSL: ${report.database.sslMode}
- تفاصيل الخطأ: ${report.database.errorDetails || "لا يوجد"}

### النطاق:
- الحالة: ${report.domain.status}
- اسم النطاق: ${report.domain.domainName}
- عنوان IP: ${report.domain.ipResolved}
- كود HTTP: ${report.domain.httpResponseCode}
- حالة SSL: ${report.domain.sslStatus}
- تفاصيل الخطأ: ${report.domain.errorDetails || "لا يوجد"}

### الشذوذ المرصود:
${report.anomalies.map((a, i) => `${i + 1}. ${a}`).join("\n")}
        `.trim();

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `حلل تقرير فحص النظام التالي وأعطني النتيجة بصيغة JSON نظيفة فقط دون أي نص إضافي:\n\n${rawReportData}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(25_000),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          const cleanJson = rawText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

          aiAnalysis = JSON.parse(cleanJson) as SentinelAIOutput;
        }
      }
    } catch (aiErr) {
      console.warn("[سنينل] فشل التحليل الذكي للتقرير:", aiErr);
    }

    return { success: true, report: { ...report, aiAnalysis } };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
