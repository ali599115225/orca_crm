# ORCA CRM — خطة تحمل السيرفرات والأداء

## 1. قاعدة البيانات (Neon PostgreSQL)

### المشاكل الحالية
- Database connection من Next.js بدون connection pooling مناسب
- Prisma متوسط 100ms لكل استعلام
- 22 طلب DB في صفحة Dashboard وحدها

### الحلول
- [ ] استخدام `@prisma/adapter-neon` مع connection pooling (موجود حالياً pg pool)
- [ ] تنفيذ `cache()` من React لنتائج الاستعلامات المتكررة (موجود في `getActiveTenant`)
- [x] تحديد `max: 1` اتصال في serverless mode
- [ ] إضافة Redis cache (Upstash) للاستعلامات الثقيلة
- [ ] استخدام Prisma `select` بدلاً من `include` لتقليل البيانات

## 2. Next.js (Vercel)

### التكوين الحالي
- Hosting: Vercel (Serverless)
- Build: Turbopack (سريع)
- Edge Runtime: بعض المسارات

### التحسينات
- [ ] تفعيل ISR للصفحات الثابتة (Dashboard metrics)
- [ ] Streaming SSR للصفحات الثقيلة (Rental, Offers)
- [ ] Lazy loading للمكونات الثقيلة
- [ ] تقسيم الـ API Routes إلى Edge و Server حسب الحاجة
- [ ] تحميل البيانات بالتوازي (Promise.all)

## 3. Vercel Configuration

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### التوصيات
- `maxDuration`: 10s لـ API Routes (كافٍ لـ Neon cold start)
- زيادة `connectionLimit` في pool مع زيادة traffic
- مراقبة Vercel Analytics للـ cold starts

## 4. التخزين المؤقت (Caching)

### 4.1 Client Cache
- [ ] React Query / SWR للبيانات المتكررة
- [ ] localStorage للتحديثات غير الحرجة

### 4.2 Server Cache
- [ ] `NextResponse.json` headers: `Cache-Control: public, max-age=60`
- [ ] Prisma `cache` extension للاستعلامات المتكررة

## 5. قياس الأداء

### الأدوات
- Vercel Analytics (مدمج)
- Neon Dashboard (مدة الاستعلامات)
- Lighthouse (حد أدنى 90)
- Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)

### أهداف الأداء
| المقياس | الهدف الحالي | الهدف المطلوب |
|---------|-------------|---------------|
| وقت تحميل الصفحة | ~3s | < 1.5s |
| API response (متوسط) | ~500ms | < 200ms |
| First Contentful Paint | ~2s | < 1s |
| Time to Interactive | ~3.5s | < 2s |
| Database query (متوسط) | ~100ms | < 50ms |

## 6. خطة التوسع (Scaling)

### 6.1 Vertical (حالياً)
- Neon: 0.25 vCPU, 1GB RAM (free tier)
- Vercel: Serverless (auto-scale)

### 6.2 Horizontal (عند النمو)
- [ ] ترقية Neon إلى paid tier (1 vCPU, 4GB)
- [ ] استخدام Vercel Pro (أولوية build)
- [ ] Connection pooling مع PgBouncer

## 7. المراقبة (Monitoring)

### 7.1 Vercel Logs
- مراجعة يومية لأخطاء 500 و 504
- تنبيهات Vercel Alerts

### 7.2 Neon Monitoring
- CPU usage
- Connection count
- Query duration

### 7.3 Custom Health Check
- [x] `/api/v1/health` — موجود
- [ ] `/api/v1/health/db` — اختبار اتصال DB
- [ ] `/api/v1/health/redis` — اختبار Cache
