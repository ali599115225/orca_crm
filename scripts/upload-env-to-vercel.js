#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════
 *  🚀 ORCA CRM — Vercel Environment Variables Auto-Uploader
 *  سكريبت الرفع الآلي الكامل لمتغيرات بيئة الإنتاج إلى Vercel
 *  الإصدار: 2.1 | تاريخ: 2026-05-29
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  📋 التشغيل:
 *    node scripts/upload-env-to-vercel.js
 *
 *  🔧 المتطلبات المسبقة:
 *    1. npm install -g vercel      ← تثبيت Vercel CLI
 *    2. vercel login               ← تسجيل الدخول
 *    3. vercel link                ← ربط المشروع
 *    4. أضف VERCEL_TOKEN في .env.local
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── الألوان في الـ Terminal ──────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(icon, color, msg) {
  console.log(`${color}${icon} ${msg}${c.reset}`);
}

// ─── قراءة وتحليل ملف .env ────────────────────────────────────────────────────
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log("❌", c.red, `الملف غير موجود: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const vars = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // تجاهل التعليقات والأسطر الفارغة
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // إزالة علامات الاقتباس
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // تخطي القيم الإرشادية (Placeholders)
    const SKIP_PATTERNS = [
      "REPLACE_WITH",
      "YOUR_",
      "ضع_هنا",
      "نفس_القيمة",
      "AIzaSy_REPLACE",
      "re_REPLACE",
      "prj_REPLACE",
      "team_REPLACE",
    ];

    const isPlaceholder = SKIP_PATTERNS.some((p) => value.includes(p));

    if (isPlaceholder) {
      log("⚠️ ", c.yellow, `تخطي (Placeholder): ${key}`);
      continue;
    }

    vars[key] = value;
  }

  return vars;
}

// ─── رفع متغير واحد إلى Vercel ─────────────────────────────────────────────────
function uploadVar(key, value, environments = ["production", "preview", "development"]) {
  try {
    // استخدام vercel env add مع الإدخال الآلي عبر echo
    const envList = environments.join(",");

    // نمط الرفع المتعدد البيئات
    const cmd = `echo "${value}" | vercel env add "${key}" ${environments[0]} --force`;
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });

    log("✅", c.green, `رُفع: ${key} → [${envList}]`);
    return true;
  } catch (error) {
    log("❌", c.red, `فشل رفع: ${key} — ${error.message?.substring(0, 80)}`);
    return false;
  }
}

// ─── التحقق من تثبيت Vercel CLI ─────────────────────────────────────────────────
function checkVercelCLI() {
  try {
    const version = execSync("vercel --version", { stdio: "pipe" }).toString().trim();
    log("✅", c.green, `Vercel CLI: ${version}`);
    return true;
  } catch {
    log("❌", c.red, "Vercel CLI غير مثبت! شغّل: npm install -g vercel");
    return false;
  }
}

// ─── البرنامج الرئيسي ──────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${c.bold}${c.cyan}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("  🚀 ORCA CRM — Vercel Env Auto-Uploader v2.1");
  console.log("═══════════════════════════════════════════════════");
  console.log(c.reset);

  // 1. التحقق من Vercel CLI
  if (!checkVercelCLI()) process.exit(1);

  // 2. قراءة الملف
  const envFile = path.join(process.cwd(), ".env.production");
  log("📂", c.cyan, `قراءة الملف: ${envFile}`);
  const vars = parseEnvFile(envFile);

  const total = Object.keys(vars).length;
  log("📊", c.cyan, `تم رصد ${total} متغير صالح للرفع`);

  if (total === 0) {
    log("⚠️ ", c.yellow, "لا توجد متغيرات للرفع. تحقق من الملف وأضف القيم الحقيقية.");
    process.exit(0);
  }

  console.log(`\n${c.dim}─────────────────────────────────────────────${c.reset}`);

  // 3. رفع المتغيرات دفعة واحدة
  let success = 0, failed = 0;

  // المتغيرات التي تُرفع لبيئة الإنتاج فقط (حساسة)
  const PRODUCTION_ONLY = [
    "DATABASE_URL", "DIRECT_URL", "JWT_SECRET",
    "GEMINI_API_KEY", "GOOGLE_AI_API_KEY",
    "RESEND_API_KEY", "VERCEL_API_TOKEN",
    "GREEN_API_TOKEN_INSTANCE", "WHATSAPP_API_TOKEN",
    "WHATSAPP_WEBHOOK_SECRET",
  ];

  for (const [key, value] of Object.entries(vars)) {
    const isProductionOnly = PRODUCTION_ONLY.includes(key);
    const environments = isProductionOnly
      ? ["production"]
      : ["production", "preview"];

    const ok = uploadVar(key, value, environments);
    ok ? success++ : failed++;

    // تأخير بسيط لتفادي Rate Limit
    await new Promise((r) => setTimeout(r, 150));
  }

  // 4. تقرير الرفع
  console.log(`\n${c.bold}${c.cyan}═══════════════════════════════════════════════════${c.reset}`);
  log("📊", c.bold, `النتيجة: ${success} ✅ نجح | ${failed} ❌ فشل | ${total} إجمالي`);

  if (failed > 0) {
    log("💡", c.yellow, "للمتغيرات الفاشلة: أضفها يدوياً في Vercel Dashboard");
  }

  if (success > 0) {
    console.log(`\n${c.dim}خطوات ما بعد الرفع:${c.reset}`);
    console.log(`  ${c.cyan}1. vercel --prod${c.reset}  ← إعادة نشر بالمتغيرات الجديدة`);
    console.log(`  ${c.cyan}2. vercel logs${c.reset}    ← مراقبة السجلات`);
  }

  console.log();
}

main().catch((e) => {
  log("❌", c.red, `خطأ غير متوقع: ${e.message}`);
  process.exit(1);
});
