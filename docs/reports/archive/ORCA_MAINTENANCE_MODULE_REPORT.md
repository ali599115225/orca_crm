# تقرير وحدة الصيانة — ORCA Maintenance Module

## الملفات التي تم بناؤها أو تعديلها

| الملف | الإجراء |
|-------|---------|
| `prisma/schema.prisma` | إضافة موديل `MaintenanceTicket` وعلاقة عكسية مع `Tenant` |
| `lib/prisma.ts` | إضافة `"MaintenanceTicket"` إلى قائمة عزل المستأجرين (tenant isolation) |
| `app/dashboard/maintenance/page.tsx` | صفحة الخادم (Server Component) — جلب البيانات |
| `app/dashboard/maintenance/MaintenanceView.tsx` | مكون العميل (Client Component) — واجهة تفاعلية |
| `app/api/v1/maintenance/route.ts` | API: GET (قائمة) و POST (إنشاء) |
| `app/api/v1/maintenance/[id]/route.ts` | API: PATCH (تحديث الحالة والتعيين) |

## موديل MaintenanceTicket الجديد

```prisma
model MaintenanceTicket {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId       String       @map("tenant_id") @db.Uuid
  tenant         Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  unitId         String?      @map("unit_id") @db.Uuid
  title          String
  description    String       @db.Text
  status         String       @default("pending")   // pending, in_progress, completed, cancelled
  priority       Priority                             // LOW, MEDIUM, HIGH (enum موجود)
  category       String?      @default("other")      // electrical, plumbing, hvac, structural, other
  reportedBy     String?      @map("reported_by")
  assignedTo     String?      @map("assigned_to")    // اسم الفني المعين
  estimatedCost  Decimal?     @map("estimated_cost") @db.Decimal(10, 2)
  actualCost     Decimal?     @map("actual_cost") @db.Decimal(10, 2)
  scheduledDate  DateTime?    @map("scheduled_date") @db.Timestamptz
  completedDate  DateTime?    @map("completed_date") @db.Timestamptz
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime     @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  @@index([tenantId, status])
  @@index([unitId])
  @@map("maintenance_tickets")
}
```

## الميزات المبنية

### 1. قائمة أوامر العمل (Work Orders List)
- عرض جميع بلاغات الصيانة في جدول مع:
  - العنوان، الفئة، الأولوية، الحالة، الفني، التكاليف، التاريخ
- **فلترة**: حسب الحالة (معلق / قيد التنفيذ / مكتمل / ملغي)
- **بحث**: نصي حسب العنوان أو اسم المبلغ
- **ترجمة عربية** لجميع الحقول: الفئات (كهرباء/سباكة/تكييف/إنشائي/أخرى)، الأولويات (عاجل/متوسط/منخفض)، الحالات

### 2. إنشاء بلاغ صيانة جديد (Create)
- نموذج إدخال متكامل:
  - العنوان (إجباري)
  - الوصف (نصي)
  - الفئة (اختيار من قائمة)
  - الأولوية (منخفض/متوسط/عاجل)
  - الوحدة المرتبطة (اختيار من قائمة الوحدات)
  - التكلفة التقديرية (رقمي)
- POST عبر `/api/v1/maintenance/`

### 3. تعيين الفنيين (Technician Assignment)
- زر "تعيين فني" في كل صف
- نافذة منبثقة (prompt) لإدخال اسم الفني
- تحديث فوري في الواجهة
- PATCH عبر `/api/v1/maintenance/[id]`

### 4. تتبع الحالة (Status Tracking)
- دورة حياة البلاغ: `pending` → `in_progress` → `completed`
- أزرار سياقية حسب الحالة الحالية:
  - معلق: زر "بدء العمل"
  - قيد التنفيذ: زر "إكمال"
  - غير مكتمل/ملغي: زر "إلغاء"
- عند الإكمال: تسجيل تلقائي لـ `completedDate`

### 5. تتبع التكاليف (Cost Tracking)
- مؤشرات رئيسية: إجمالي التكلفة التقديرية + إجمالي التكلفة الفعلية
- عرض التكلفة التقديرية والفعلية لكل بلاغ في الجدول
- إدخال التكلفة التقديرية عند الإنشاء

#### إحصائيات
- عداد لكل حالة: معلق / قيد التنفيذ / مكتمل
- إجمالي التكاليف التقديرية والفعلية

## API Routes

| المسار | الطريقة | الوظيفة |
|--------|---------|---------|
| `/api/v1/maintenance/` | `GET` | قائمة بلاغات الصيانة (مع فلتر `?status=`) |
| `/api/v1/maintenance/` | `POST` | إنشاء بلاغ صيانة جديد |
| `/api/v1/maintenance/[id]` | `PATCH` | تحديث حالة / تعيين فني / تكاليف |

## النمط البرمجي
- **Server Component** للصفحة الرئيسية: جلب البيانات عبر `prisma` مع `getActiveTenant()`
- **Client Component** (`MaintenanceView.tsx`): واجهة تفاعلية مع `useState` و `useTransition`
- **Next.js App Router API Routes**: REST-style مع `getTenantAndUser` لعزل المستأجرين
- واجهة عربية كاملة مع اتجاه RTL
