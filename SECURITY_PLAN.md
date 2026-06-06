# ORCA CRM — خطة الأمان

## 1. المصادقة (Authentication)
- [ ] JWT tokens مع expiry (موجود في `/api/v1/auth/login`)
- [ ] Session cookies مع HttpOnly + Secure + SameSite
- [ ] Rate limiting على `/api/v1/auth/login` (منع brute force)
- [ ] Captcha على صفحة تسجيل الدخول

## 2. التفويض (Authorization)
- [x] RBAC على مستوى الـ View (Admin, Sales Manager, Employee, Marketing, Read-Only)
- [ ] RBAC على مستوى API — التحقق من الدور في كل Route Handler
- [ ] tenant isolation (موجود في `lib/prisma.ts` عبر `tenantContext`)

## 3. حماية API
- [ ] تطبيق rate limiting على جميع الـ API routes
- [ ] CORS — تقييد النطاقات المسموحة
- [ ] Request validation لجميع الـ POST/PUT bodies
- [ ] Sanitize المدخلات (منع XSS, SQL injection)
- [x] Audit log لكل عملية كتابة (موجود في Prisma extension)

## 4. حماية البيانات
- [ ] تشفير API Keys والـ Secrets (موجود: `encrypted_api_key`, `encrypted_client_id`)
- [ ] عدم تخزين كلمات المرور بنص عادي (bcrypt موجود)
- [ ] HTTPS إلزامي (Vercel + Neon)
- [ ] Masking بيانات العملاء الحساسة في logs

## 5. الجلسات (Sessions)
- [ ] Session timeout (30 دقيقة)
- [ ] إبطال الجلسة عند تغيير كلمة المرور
- [ ] منع session fixation

## 6. البيئة (Environment)
- [x] `.env` في `.gitignore`
- [ ] جميع الـ Secrets في Vercel Environment Variables
- [ ] لا API Keys في الكود المصدري

## 7. التدقيق (Audit)
- [x] Audit Log لكل عملية (موجود)
- [ ] لوحة تحكم للـ Audit Logs
- [ ] تنبيهات عند محاولات دخول فاشلة

## 8. خطة الاستجابة للاختراق
- [ ] Safe Mode (موجود — `/safe-mode`)
- [ ] Kill Switch: تعطيل النظام فوراً
- [ ] Backup يومي لقاعدة البيانات
