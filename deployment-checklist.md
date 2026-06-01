# ✅ ORCA CRM — Deployment Checklist
> **الإصدار**: v2.1 | **المنصة**: Vercel + Neon PostgreSQL | **آخر تحديث**: 2026-06-01

---

## 🔴 المرحلة 0 — ما قبل الإطلاق (يُكمَل محلياً)

### أمان الكود
- [x] **إزالة المسارات المحلية من `prisma.config.ts`** ← تم إصلاحه ✅
- [ ] **توليد JWT_SECRET آمن** ← شغّل: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] التأكد من أن `.env` و `.env.production` موجودان في `.gitignore` ← ✅ موجودان
- [ ] لا توجد API Keys أو Secrets في الكود المرفوع لـ GitHub

### جودة الكود
- [ ] `npm run build` يكتمل بدون أخطاء TypeScript
- [ ] لا توجد `console.log` تطبع بيانات حساسة
- [ ] `prisma generate` يعمل بنجاح

---

## 🟡 المرحلة 1 — إعداد Vercel

### ربط GitHub
- [ ] المستودع مرفوع على GitHub (يُفضَّل Private)
- [ ] Vercel → Add New Project → Import Git Repository → REDC
- [ ] **Framework**: Next.js (تلقائي)
- [ ] **Build Command**: `prisma generate && next build`
- [ ] **Install Command**: `npm install`
- [ ] **Root Directory**: `./`

### متغيرات البيئة (Environment Variables) في Vercel Dashboard
**المسار**: Project → Settings → Environment Variables

| المتغير | نوع البيئة | الحالة |
|---------|-----------|--------|
| `DATABASE_URL` | Production + Preview | [ ] |
| `DIRECT_URL` | Production + Preview | [ ] |
| `JWT_SECRET` | Production فقط | [ ] |
| `GEMINI_API_KEY` | Production + Preview | [ ] |
| `GOOGLE_AI_API_KEY` | Production + Preview | [ ] |
| `RESEND_API_KEY` | Production | [ ] |
| `GREEN_API_ID_INSTANCE` | Production | [ ] |
| `GREEN_API_URL` | Production | [ ] |
| `GREEN_API_TOKEN_INSTANCE` | Production | [ ] |
| `WHATSAPP_API_URL` | Production | [ ] |
| `WHATSAPP_INSTANCE_ID` | Production | [ ] |
| `WHATSAPP_API_TOKEN` | Production | [ ] |
| `WHATSAPP_WEBHOOK_SECRET` | Production | [ ] |
| `WHATSAPP_WEBHOOK_URL` | Production | [ ] |
| `VERCEL_API_TOKEN` | Production | [ ] |
| `VERCEL_PROJECT_ID` | Production | [ ] |
| `VERCEL_TEAM_ID` | Production | [ ] |
| `ADMIN_EMAIL` | Production | [ ] |
| `SUPPORT_EMAIL` | Production | [ ] |
| `FROM_EMAIL` | Production | [ ] |
| `ENABLE_SYSTEM_LOGGER` | Production | [ ] تقييم: `true` |
| `SAFE_MODE_ENABLED` | Production | [ ] تقييم: `false` |
| `NODE_ENV` | Production | [ ] تقييم: `production` |
| `TZ` | Production | [ ] تقييم: `Asia/Riyadh` |
| `NEXT_TELEMETRY_DISABLED` | Production | [ ] تقييم: `1` |

---

## 🟢 المرحلة 2 — مزامنة قاعدة البيانات

- [ ] تأكيد أن `DATABASE_URL` في Vercel تشير لـ **Neon Main Branch** (وليس Dev Branch)
- [ ] تشغيل Schema Sync يدوياً:
  ```bash
  # محلياً مع DATABASE_URL الإنتاج
  npx prisma db push
  ```
- [ ] التحقق من الـ Tables في Neon Console بعد الـ Push

---

## 🔵 المرحلة 3 — ما بعد النشر (Post-Deploy Verification)

### اختبار الصحة العامة
- [ ] فتح `https://orca.az-ez.pro` → يظهر صفحة تسجيل الدخول
- [ ] تسجيل الدخول بحساب Admin حقيقي
- [ ] إنشاء عميل جديد → يُحفظ في قاعدة البيانات
- [ ] فتح صفحة العمليات → ظهور لوحة السجلات

### اختبار الأنظمة الفرعية
- [ ] **WhatsApp (ساهر)**: إرسال رسالة تجريبية → يصل الرد
- [ ] **البريد الإلكتروني (Resend)**: إنشاء تذكرة دعم → يصل بريد التأكيد
- [ ] **Cron Jobs**: التأكد من ظهور `/api/cron/billing` في Vercel Crons
- [ ] **SAFE_MODE**: تغيير `SAFE_MODE_ENABLED=true` → التحقق من التحويل لـ `/safe-mode`

### قياس الأداء
- [ ] متوسط وقت الاستجابة < 2 ثانية
- [ ] لا توجد أخطاء 500 في Vercel Logs خلال أول 15 دقيقة

---

## 🔴 بروتوكول الطوارئ (Emergency Protocols)

### Kill Switch 1 — Safe Mode (30 ثانية)
```
Vercel → Settings → Environment Variables → SAFE_MODE_ENABLED → true → Redeploy
```

### Kill Switch 2 — Rollback فوري (60 ثانية)
```
Vercel → Deployments → اختر آخر Deployment ناجح → "..." → "Promote to Production"
```

### Kill Switch 3 — Logger Off (إيقاف Logger)
```
Vercel → Settings → Environment Variables → ENABLE_SYSTEM_LOGGER → false → Redeploy
```

### تشخيص أخطاء 500 الشائعة
| الخطأ | السبب المحتمل | الحل |
|--------|--------------|-------|
| `PrismaClientInitializationError` | DATABASE_URL غير مضبوط | تحقق من ENV Variables |
| `Cannot read properties of undefined` | متغير بيئة ناقص | راجع قائمة ENV أعلاه |
| `JWT malformed` | JWT_SECRET غير صحيح | أعد توليده |
| `fetch failed` | Green API Token منتهي | جدد التوكن |
| `Rate limit exceeded` | Gemini API quota | راجع Google Cloud Console |

---

## 📋 معلومات المشروع

| العنصر | القيمة |
|--------|--------|
| المنصة | Vercel (Serverless) |
| قاعدة البيانات | Neon PostgreSQL (us-east-1) |
| الـ ORM | Prisma v6 |
| Framework | Next.js 15 (App Router) |
| النطاق الرئيسي | `orca.az-ez.pro` |
| Neon Project | `ep-fragrant-dream-aqbliivf` |
| Vercel Crons | `/api/cron/billing` (02:00) + `/api/cron/sentinel` (06:00) |
| Safe Mode URL | `https://safe-ali.orca.pro` |
