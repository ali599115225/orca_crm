# 📊 تقرير فحص مشروع ORCA CRM — الفحص الشامل
**تاريخ التقرير:** 2026-06-04 | **المفحوص بواسطة:** Antigravity Agent

---

## ✅ الملخص التنفيذي (5 نقاط أساسية)

1. **تعارض مكتبات DnD:** المشروع يحتوي على **مكتبتين** للسحب والإفلات في نفس الوقت: `react-beautiful-dnd@13.1.1` و `@dnd-kit/core@6.3.1` — وهذا يسبب تعارضاً وأخطاء في الـ Console. يجب توحيد الاختيار.
2. **ملف globals.css ملوّث بتكرار:** ملف `app/globals.css` يبلغ **1031 سطراً** ويحتوي على **تعريفات `.stage-column` و `.lead-card` و `.custom-scrollbar` مكررة 8+ مرات** بقيم متضاربة — مما يجعل سلوك CSS غير متوقع.
3. **ملفات .bak متروكة (10 ملفات):** يوجد 10 ملفات backup في جذر المشروع ومجلدات المكوّنات — تحتاج حذفاً أو نقلاً لمجلد archive.
4. **تبويبات فارغة (stub components):** ملفات `AIAnalysis.tsx`, `Activities.tsx`, `Tasks.tsx`, `Details.tsx` هي placeholder بسيطة من 12 سطر — لم تُبنَ بعد بشكل كامل.
5. **لا يوجد Git repository:** الـ `.git` المُشار إليه في `.gitignore` غير موجود — لا يوجد تتبع للتغييرات مما يزيد خطر فقدان الكود.

---

## 1. بنية المشروع (شجرة الملفات — عمق 3)

```
REDC/
├── app/
│   ├── api/
│   │   └── leads/route.ts          ← API endpoint للعملاء (بيانات demo فقط)
│   ├── actions/                    ← Server Actions (auth, leads, whatsapp, contract...)
│   ├── context/                    ← AppContext
│   ├── contract/                   ← صفحة العقود
│   ├── leads/
│   │   └── page.tsx                ← صفحة العملاء المحتملين (محدّثة 04/06)
│   ├── login/ register/ safe-mode/ operations/
│   ├── globals.css                 ← ⚠️ 1031 سطر، تكرار عالٍ
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── i18n/
│   │   └── ar.ts                   ← ملف الترجمة العربية الوحيد
│   ├── layout/
│   │   └── DashboardLayout.tsx     ← التخطيط الرئيسي (Sidebar + Header)
│   ├── ui/
│   │   └── orca-components.tsx
│   └── views/
│       ├── pipeline/
│       │   ├── Pipeline.tsx        ← Pipeline DnD (react-beautiful-dnd)
│       │   ├── Pipeline.tsx.bak    ← backup
│       │   ├── PipelineDnd.tsx     ← نسخة ثانية مكررة من Pipeline
│       │   └── PipelineView.tsx    ← نسخة ثالثة بدون DnD (static)
│       ├── tabs/
│       │   ├── LeadsTabs.tsx       ← مكوّن التبويبات الرئيسي
│       │   ├── Pipeline.tsx        ← ⚠️ تعارض اسم مع pipeline/Pipeline.tsx
│       │   ├── AIAnalysis.tsx      ← stub (12 سطر)
│       │   ├── Activities.tsx      ← stub (12 سطر)
│       │   ├── Tasks.tsx           ← stub (12 سطر)
│       │   ├── Details.tsx         ← stub (12 سطر)
│       │   └── *.bak               ← 5 ملفات backup
│       ├── LeadsView.tsx, AgentManagementView.tsx, SettingsView.tsx... (18 view)
│       └── ...
├── lib/                            ← session, tenant, prisma, agents, saher...
├── prisma/                         ← Schema قاعدة البيانات
├── generated/                      ← Prisma client generated
├── database/                       ← SQL migrations
├── logs/, scratch/, scripts/
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 2. الملفات المعدّلة حديثاً (آخر 7 أيام)

> ملاحظة: **لا يوجد Git**، تم الاعتماد على تواريخ تعديل نظام الملفات.

| الملف | آخر تعديل |
|-------|-----------|
| `components/views/pipeline/Pipeline.tsx.bak` | 04/06/2026 02:45 |
| `components/views/tabs/AIAnalysis.tsx` | 04/06/2026 02:45 |
| `components/views/tabs/LeadsTabs.tsx` | 04/06/2026 02:45 |
| `components/i18n/ar.ts` | 04/06/2026 02:45 |
| `components/views/tabs/*.bak` (5 files) | 04/06/2026 02:40 |
| `app/leads/page.tsx` | 04/06/2026 02:40 |
| `app/globals.css` | 04/06/2026 02:35 |
| `app/api/leads/route.ts` | 04/06/2026 02:35 |
| `components/views/tabs/Pipeline.tsx` | 04/06/2026 02:32 |
| `package.json` | 04/06/2026 02:20 |
| `app/actions/*` (12+ files) | 02/06/2026 |
| `lib/*` (10 files) | 02/06/2026 |

**ملفات .bak الموجودة (10 ملفات):**
```
app/globals.css.bak
app/api/leads/route.ts.bak
app/leads/page.tsx.bak
components/views/pipeline/Pipeline.tsx.bak
components/views/tabs/Activities.tsx.bak
components/views/tabs/AIAnalysis.tsx.bak
components/views/tabs/Details.tsx.bak
components/views/tabs/LeadsTabs.tsx.bak
components/views/tabs/Pipeline.tsx.bak
components/views/tabs/Tasks.tsx.bak
```

---

## 3. مكوّنات الواجهة والتبويبات

### 3.1 ملفات `components/views/tabs/`

| الملف | الوصف |
|-------|--------|
| `LeadsTabs.tsx` | المكوّن الرئيسي للتبويبات — يعرض 5 تبويبات ويتحكم في التبديل بينها بـ `useState` |
| `Pipeline.tsx` | ⚠️ **تعارض اسم** — يبدو أنه نسخة من Pipeline DnD داخل مجلد tabs |
| `AIAnalysis.tsx` | **Stub/Placeholder** — عرض عنوان فقط، لا توجد بيانات حقيقية |
| `Activities.tsx` | **Stub/Placeholder** — عرض عنوان فقط، لا قائمة أنشطة |
| `Tasks.tsx` | **Stub/Placeholder** — عرض عنوان فقط، لا قائمة مهام |
| `Details.tsx` | **Stub/Placeholder** — عرض عنوان فقط، لا بيانات عميل |

### 3.2 مكوّنات Pipeline — ثلاث نسخ متعارضة!

| الملف | النوع | DnD | المشكلة |
|-------|-------|-----|---------|
| `components/views/pipeline/Pipeline.tsx` | **رئيسي** | react-beautiful-dnd | بخصائص boolean صريحة ✓ |
| `components/views/pipeline/PipelineDnd.tsx` | **مكرر** | react-beautiful-dnd | بدون الخصائص الصريحة ⚠️ |
| `components/views/pipeline/PipelineView.tsx` | **Static** | ❌ لا يوجد | بيانات ثابتة، لا drag |
| `components/views/tabs/Pipeline.tsx` | **مكرر في tabs** | react-beautiful-dnd | اسم متعارض ⚠️ |

**الحقول والحالة في Pipeline.tsx (الرئيسي):**
```typescript
type Lead = { id: string; name: string; city?: string; score?: string }

const stages = [
  { id: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed", title: string }
]

// State:
const [data, setData] = useState<Record<string, Lead[]>>(initialData)

// Props on Droppable:
isDropDisabled={false}       // ✓ boolean صريح
isCombineEnabled={false}     // ✓ boolean صريح
ignoreContainerClipping={false} // ✓ boolean صريح
```

---

## 4. ملفات الترجمة (i18n)

**الملف الوحيد:** `components/i18n/ar.ts` (66 سطراً)

**المفاتيح الأساسية الموجودة:**

| المجموعة | المفاتيح |
|---------|---------|
| Navigation | `dashboard`, `leads`, `realEstateProjects`, `operations`, `settings`... |
| UI Labels | `globalSearchPlaceholder`, `searchButton`, `viewDetails`, `updateStatus` |
| Tabs | `tabPipeline`, `tabAI`, `tabActivities`, `tabTasks`, `tabDetails` |
| Pipeline | `pipelineTitle`, `stageNew`→`stageClosed`, `stageCounts` |
| Leads (sample) | `lead1`, `lead2`, `lead3` (hardcoded!) |
| Error messages | `dndSetupError.isDropDisabled`, `dndSetupError.isCombineEnabled` |
| Info | `frameworkInfo`, `bundlerInfo` |

> ⚠️ **ملاحظة:** بيانات العينة مثل `lead1.name = "أحمد السبيعي"` مكتوبة hardcoded داخل ملف الترجمة — هذا غير مناسب، يجب أن تكون من API.
> ⚠️ **لا يوجد ملف `en.ts`** — النظام حالياً عربي فقط رغم وجود زر EN في الـ Sidebar.

---

## 5. ملف globals.css — التحليل

**الحجم الإجمالي:** 1031 سطراً / 28 KB

### تكرار القواعد — مشكلة حرجة:

| القاعدة | عدد التعريفات | القيم المتضاربة |
|---------|--------------|----------------|
| `.stage-column` | **9 مرات** | height بين `68vh` و `82vh` و `75vh` و `78vh`... |
| `.lead-card` | **5 مرات** | border-radius بين `8px` و `10px` و `12px` |
| `.custom-scrollbar` | **6 مرات** | تعريفات mask-image مختلفة |
| `.tabs-row` + `.tab-btn` | **مرتين** | (سطور 676–699 وسطور 887–906) |
| `.modal-root` + `.modal-card` | **مرتين** | (سطور 743–799 وسطور 967–1014) |

### القواعد المهمة حسب التصنيف:

**التبويبات:**
```css
.tab-btn { padding:8px 14px; border-radius:10px; font-size:14px; font-weight:600; }
.tab-active { background: linear-gradient(90deg,#0EA5E9,#22D3EE); color:#02121F; }
.tab-inactive { background: rgba(4,42,68,0.45); color:#94A3B8; }
```

**المودال:**
```css
.modal-root { position:fixed; inset:0; z-index:60; }
.modal-backdrop { background:rgba(0,0,0,0.55); backdrop-filter:blur(2px); }
.modal-card { max-width:720px; animation: modalIn 220ms; }
@keyframes modalIn { from { opacity:0; transform:translateY(18px); } }
```

**Pipeline:**
```css
.stage-column { height:68vh; /* آخر قيمة سائدة */ background:rgba(4,42,68,0.42); }
.stage-column.drag-over { border-color:rgba(34,211,238,0.35); transform:translateY(-4px); }
.lead-card.dragging { box-shadow:0 14px 40px rgba(2,18,31,0.6); transform:scale(1.02); }
```

---

## 6. الاعتمادات (package.json)

### dependencies:
```json
"react-beautiful-dnd": "^13.1.1"   ← ✓ مثبّت (13.1.1)
"@dnd-kit/core": "^6.3.1"          ← ✓ مثبّت (6.3.1) — ⚠️ تعارض!
"@dnd-kit/modifiers": "^9.0.0"
"@dnd-kit/sortable": "^10.0.0"
"@dnd-kit/utilities": "^3.2.2"
"next": "latest"
"react": "latest"
"react-dom": "latest"
"@google/generative-ai": "^0.24.1"
"@neondatabase/serverless": "^1.1.0"
"@prisma/adapter-neon": "^7.8.0"
"prisma": "^7.8.0"
"bcryptjs": "^3.0.3"
"jose": "^6.2.3"
"lucide-react": "^1.16.0"
"gsap": "^3.15.0"
"resend": "^6.12.4"
```

### devDependencies:
```json
"@tailwindcss/postcss": "^4.3.0"
"tailwindcss": "^4.3.0"
"@prisma/client": "^7.8.0"
"autoprefixer": "^10.5.0"
"postcss": "^8.5.15"
"dotenv": "^17.4.2"
"tsx": "^4.22.3"
```

### فحص مكتبات DnD:
| المكتبة | الإصدار المثبّت | ملاحظة |
|---------|---------------|--------|
| `react-beautiful-dnd` | **13.1.1** | مثبّت ✓، غير محدّث منذ 2021 ⚠️ |
| `@dnd-kit/core` | **6.3.1** | مثبّت ✓، محدّث وفعّال ✓ |
| `@dnd-kit/sortable` | **10.0.0** | مثبّت ✓ |
| `@hello-pangea/dnd` | **غير مثبّت** | البديل الحديث لـ react-beautiful-dnd |

---

## 7. أخطاء DnD المتوقعة وتحليلها

### الأخطاء المعروفة في `react-beautiful-dnd@13.1.1` مع React 18:

#### الخطأ الأول:
```
Warning: isDropDisabled must be a boolean
```
**السبب:** عند عدم تمرير `isDropDisabled` أو تمريرها بقيمة `undefined`.
**الموقع:** `PipelineDnd.tsx` السطر 77:
```tsx
// ❌ المشكلة — في PipelineDnd.tsx:
<Droppable droppableId={stage.id} key={stage.id}>
// لا يوجد isDropDisabled

// ✅ الإصلاح:
<Droppable droppableId={stage.id} key={stage.id} isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>
```

#### الخطأ الثاني:
```
Warning: isCombineEnabled must be a boolean
```
**الموقع:** نفس `PipelineDnd.tsx` السطر 77.

#### الخطأ الثالث (React 18 Strict Mode):
```
Error: Invariant failed: Cannot find droppable entry with id [...]
```
**السبب:** `react-beautiful-dnd` يعاني من عدم التوافق مع React 18 Strict Mode + double rendering.
**الإصلاح:** إضافة `<React.StrictMode>` ← إزالته مؤقتاً من `layout.tsx` أو الانتقال لـ `@hello-pangea/dnd`.

#### الخطأ الرابع:
```
Warning: findDOMNode is deprecated in StrictMode
```
**السبب:** `react-beautiful-dnd` يستخدم `findDOMNode` الذي تم إهماله في React 18.

---

## 8. الفحوص الوظيفية السريعة

### Pipeline (DnD):
- ✅ **الكود صحيح نظرياً** في `pipeline/Pipeline.tsx` — الخصائص Boolean موجودة.
- ⚠️ **`PipelineDnd.tsx`** تفتقر للخصائص الإلزامية.
- ⚠️ **`LeadsTabs.tsx` يستورد من `../pipeline/Pipeline`** — لكن `tabs/Pipeline.tsx` موجود أيضاً بنفس الاسم — قد يسبب confusion.

### المودال:
- ✅ **CSS موجود** للمودال (`.modal-root`, `.modal-backdrop`, `.modal-card`).
- ⚠️ **لا يوجد مكوّن Modal منفصل** — CSS موجود لكن لا يوجد JSX component مستقل لإغلاق بـ Esc أو النقر على الخلفية.
- ❌ **لا يوجد `useEffect` لـ keydown Escape** في أي مكوّن.

### البحث والتبويبات:
- ✅ **التبويبات تعمل** — `LeadsTabs.tsx` يستخدم `useState` للتبديل.
- ⚠️ **حقل البحث decorative فقط** — `<input>` موجود بدون `onChange` handler حقيقي.

---

## 9. الاقتراحات والتحسينات العملية

### 🔴 إصلاح DnD — أولوية عاجلة

**الخيار A: إصلاح react-beautiful-dnd (10 دقائق)**
في `PipelineDnd.tsx` السطر 77:
```tsx
// قبل:
<Droppable droppableId={stage.id} key={stage.id}>

// بعد:
<Droppable
  droppableId={stage.id}
  key={stage.id}
  isDropDisabled={false}
  isCombineEnabled={false}
  ignoreContainerClipping={false}
>
```

**الخيار B: الانتقال إلى @hello-pangea/dnd (30 دقيقة) — موصى به**
```bash
npm uninstall react-beautiful-dnd
npm install @hello-pangea/dnd
```
التغيير في كل ملف Pipeline:
```tsx
// قبل:
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

// بعد:
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
// باقي الكود يبقى كما هو تماماً!
```

### 🟡 حفظ ترتيب Pipeline في localStorage (20 دقيقة)

في `Pipeline.tsx` أضف:
```tsx
// تحميل من localStorage
const [data, setData] = useState<Record<string, Lead[]>>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pipeline-order');
    if (saved) return JSON.parse(saved);
  }
  return initialData;
});

// حفظ عند التغيير
function onDragEnd(result: DropResult) {
  // ... كود موجود ...
  const newData = { ...prev, [source.droppableId]: sourceItems, [destination.droppableId]: destItems };
  localStorage.setItem('pipeline-order', JSON.stringify(newData));
  return newData;
}
```

### 🟡 تنظيف globals.css (1-2 ساعة)

احتفظ فقط بالقواعد من السطر 809 حتى 1031 (الأحدث والأكمل) وأزل كل التعريفات المكررة للـ `.stage-column`, `.lead-card`, `.custom-scrollbar` من السطور 235–807.

### 🟢 إضافة Modal كمكوّن مستقل (30 دقيقة)

أنشئ `components/ui/Modal.tsx`:
```tsx
'use client';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;
  return (
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

### 🟢 إنشاء Git Repository (5 دقائق)

```bash
cd c:\Users\ali59\Desktop\REDC
git init
git add .
git commit -m "initial commit: orca crm project"
```

---

## 10. قائمة أولويات التطوير (مرتبة حسب الأثر)

| الأولوية | المهمة | الجهد التقديري |
|---------|-------|--------------|
| 🔴 1 | الانتقال من `react-beautiful-dnd` إلى `@hello-pangea/dnd` | 30 دقيقة |
| 🔴 2 | تنظيف `globals.css` وإزالة التكرار (8x) | 1-2 ساعة |
| 🟡 3 | بناء تبويبات حقيقية: Activities, Tasks, Details | 3-4 ساعات |
| 🟡 4 | إضافة `Modal` مكوّن مستقل مع دعم Esc | 30 دقيقة |
| 🟢 5 | حفظ Pipeline في localStorage أو API | 20-30 دقيقة |

---

## ملاحظات ختامية

- **لا يوجد Git** — اجعل تهيئة Git أول أولوياتك لمنع فقدان العمل.
- **ثلاث نسخ من Pipeline** في ثلاثة مسارات مختلفة — اختر واحدة وأزل البقية.
- **ملف `en.ts` مفقود** — النظام لا يدعم الإنجليزية فعلياً.
- **API العملاء** (`/api/leads/route.ts`) تعيد بيانات demo hardcoded — لا تتصل بقاعدة البيانات.

---
*تم إنشاء هذا التقرير بواسطة Antigravity Agent — ORCA CRM Project Audit 2026-06-04*
