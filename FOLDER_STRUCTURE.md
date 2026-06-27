# 📁 هيكل المجلد المنظم

تم ترتيب المشروع بشكل منطقي في المجلدات التالية:

## 📚 المجلدات الرئيسية

### 01-Documentation
ملفات التوثيق الشاملة للمشروع:
- ملفات المعمارية (Architecture)
- ملفات التصميم (Design)
- ملفات المراجعة (Reviews)
- التقارير التقنية
- ملفات التعليمات

**الملفات:**
- `SPRINT1_TECHNICAL_DESIGN.md` - تصميم المرحلة الأولى
- `SPRINT2_TECHNICAL_DESIGN.md` - تصميم المرحلة الثانية
- `FINANCIAL_ARCHITECTURE.md` - معمارية النظام المالي
- `ZATCA_ARCHITECTURE.md` - معمارية التكامل مع ZATCA
- والمزيد...

---

### 02-Configuration
ملفات الإعدادات والتكوين:
- ملفات `package.json` و `tsconfig.json`
- ملفات `.config` للأدوات المختلفة
- ملفات البيئة والإعدادات
- ملفات البناء والنشر

**الملفات:**
- `next.config.mjs` - إعدادات Next.js
- `tailwind.config.ts` - إعدادات Tailwind CSS
- `playwright.config.ts` - إعدادات الاختبار
- `vercel.json` - إعدادات النشر على Vercel

---

### 03-Source-Code
كود المشروع المصدري:
- `app/` - صفحات وتطبيق Next.js
- `components/` - مكونات React
- `database/` - ملفات قاعدة البيانات
- `lib/` - مكتبات ودوال مساعدة
- `prisma/` - إعدادات ORM
- `docs/` - توثيق إضافية

---

### 04-Scripts
السكريبتات والأتمتة:
- `.mjs` - سكريبتات JavaScript/Node.js
- `.ps1` - سكريبتات PowerShell
- `.py` - سكريبتات Python
- `.js` - ملفات JavaScript

**الأمثلة:**
- `check_db.mjs` - فحص قاعدة البيانات
- `enable-long-task-mode.ps1` - تفعيل وضع المهام الطويلة
- `run_ai.py` - تشغيل وحدة الذكاء الاصطناعي

---

### 05-Reports
التقارير والبيانات:
- تقارير الأداء
- ملفات JSON للتحليل
- بيانات OpenAPI

**الملفات:**
- `lighthouse-report.json` - تقرير أداء Lighthouse
- `report.json` - التقرير الرئيسي
- `openapi-projects.json` - بيانات المشاريع

---

### 06-Generated
الملفات المولدة والتقارير التفصيلية:
- `playwright-report/` - تقارير اختبارات Playwright
- `unlighthouse-report/` - تقارير أداء النموذج
- ملفات HTML و JSON للتقارير

---

### 07-Logs
ملفات السجلات والتسجيل:
- `system.log` - السجلات الرئيسية للنظام
- ملفات تسجيل أخرى

---

### 08-Development-Artifacts
ملفات التطوير والمكتبات:
- `node_modules/` - المكتبات المثبتة
- `scratch/` - ملفات تجريبية ومسودات
- `.agents/` - وكلاء التطوير
- `.github/` - إعدادات GitHub
- `.next/` - ملفات البناء المؤقتة

---

## 🎯 نصائح الاستخدام

1. **للتطوير:** ركز على مجلد `03-Source-Code`
2. **للتكوين:** عدّل الملفات في `02-Configuration`
3. **للتوثيق:** اطّلع على `01-Documentation`
4. **للاختبار:** استخدم السكريبتات من `04-Scripts`
5. **للمراجعة:** تحقق من التقارير في `05-Reports` و `06-Generated`

---

**آخر تحديث:** 2026-06-26
