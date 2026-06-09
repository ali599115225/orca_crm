# ORCA CRM — التحقيق في الأخطاء المالية الحرجة

**التاريخ:** 2026-06-09
**الهدف:** التحقيق في 3 أخطاء مالية حرجة تمنع التشغيل التجاري
**النطاق:** حصراً Bugs FI-01, FI-02, FI-03

---

## FI-01: Journal Entry خارج Transaction الدفع

### Location

| الطبقة | الملف | السطر |
|--------|-------|-------|
| Route | `app/api/v1/invoices/[id]/pay/route.ts` | 95-106 |
| Action | `app/actions/finance.ts` | 37-41 |
| Service | `lib/accounting/posting-engine.ts` | 188-215 |
| Prisma Model | `Receipt`, `RentalInvoice`, `JournalEntry` | schema.prisma:600-613, 399-445, 672-694 |
| DB Table | `receipts`, `rental_invoices`, `journal_entries` | — |

### Reproduction Steps

1. أرسل طلب POST إلى `/api/v1/invoices/{id}/pay` بالمبلغ وطريقة الدفع
2. الـ Route ينفذ `prisma.$transaction` لإنشاء receipt + تحديث invoice إلى "paid" (سطور 70-93)
3. **بعد** commit الـ Transaction، يتم استدعاء `postPaymentEntry` (سطور 95-106)
4. `postPaymentEntry` ينشئ **Transaction منفصل** عبر `postJournalEntry`
5. إذا فشلت الخطوة 4 (crash server, timeout, deploy)، يتم فقدان القيد المحاسبي بالكامل

### الكود المسبب

```typescript
// pay/route.ts:70-93 — الـ Transaction الأول
const result = await prisma.$transaction(async (tx) => {
  const receipt = await tx.receipt.create({...});   // تم إنشاء السند
  await tx.rentalInvoice.update({... status: 'paid' ...});  // تم تحديث الفاتورة
  return receipt;
}); // ← COMMIT هنا. انتهى الـ Transaction.

// pay/route.ts:95-106 — خارج الـ Transaction بالكامل
const cashAccount = await findAccountByCode(tenantId, '1.1.1');
const receivableAccount = await findAccountByCode(tenantId, '1.1.3');
if (cashAccount && receivableAccount) {
  await postPaymentEntry(tenantId, result.id, ...);
  // ↑ يستدعي postJournalEntry الذي يفتح Transaction منفصل
}
```

### Financial Impact

| السيناريو | التأثير |
|-----------|---------|
| Server crash بين السطر 93 و 106 | **ضياع القيد المحاسبي** — receipt موجود، invoice مدفوعة، لكن لا يوجد journal entry |
| Timeout في طلب journal entry | **اختلال ميزان المراجعة** — النقدية لم تزد، الذمم لم تنخفض، لكن الفاتورة مدفوعة |
| Deploy أثناء تنفيط الدفع | **عدم تطابق دفتري** — إيراد مسجل في النظام التجاري ولكن غير موجود في الدفاتر المحاسبية |

### Severity Justification: CRITICAL

ليس HIGH بل CRITICAL للأسباب التالية:

1. **فقدان دائم للأموال في الدفاتر** — الخلل لا يسبب خطأ مؤقتاً، بل يسبب فقداناً دائماً للقيد المحاسبي. بمجرد Commit الـ Transaction الأول، لا توجد آلية استرداد.

2. **لا يوجد manual override** — ليس هناك واجهة أو زر "إعادة ترحيل القيد المحاسبي للفاتورة". الخلل صامت. قد تكتشفه الشركة بعد شهور في التسوية البنكية.

3. **يخالف مبدأ Double-Entry Accounting** — مبدأ القيد المزدوج ينص على أن كل حركة مالية يجب أن تسجل في حسابين على الأقل. هذا الـ Bug يسمح بتسجيل حركة مالية (receipt) دون تسجيلها محاسبياً.

4. **التصنيف HIGH يتطلب وجود manual workaround** — لا يوجد. الخطأ الوحيد هو "إعادة الدفع يدوياً" وهذا مستحيل لأن الفاتورة مدفوعة.

### Real World Scenario

```
فاتورة إيجار: 10,000 SAR
حالة الفاتورة: unpaid

1. المستخدم يضغط "دفع" → تظهر شاشة التحميل
2. الـ Route ينفذ الـ Transaction:
   - receipt منشأ (10,000 SAR)
   - invoice → paid
3. **COMMIT**
4. الاتصال بقاعدة البيانات ينقطع (Outage في Neon)
5. `findAccountByCode` يفشل → `postPaymentEntry` لم ينفذ أبداً
6. المستخدم يرى خطأ 500

النتيجة:
- receipt: موجود (10,000 SAR)
- invoice: مدفوعة
- journal_entry: غير موجود
- cash account (1.1.1): لم يزد 10,000 SAR
- receivable account (1.1.3): لم ينخفض 10,000 SAR

المبلغ 10,000 SAR اختفى من دفاتر ORCA.
العميل يعتقد أنه دفع. الشركة لا ترى المبلغ في التقارير المالية.
```

### Fix Strategy

**التعديل المطلوب:** نقل `postPaymentEntry` داخل `prisma.$transaction` نفسه.

**الملف:** `app/api/v1/invoices/[id]/pay/route.ts`

```typescript
// BEFORE (خاطئ):
const result = await prisma.$transaction(async (tx) => {
  const receipt = await tx.receipt.create({...});
  await tx.rentalInvoice.update({... status: 'paid' ...});
  return receipt;
});

const cashAccount = await findAccountByCode(tenantId, '1.1.1');
const receivableAccount = await findAccountByCode(tenantId, '1.1.3');
await postPaymentEntry(tenantId, result.id, ...);

// AFTER (صحيح):
const cashAccount = await findAccountByCode(tenantId, '1.1.1');
const receivableAccount = await findAccountByCode(tenantId, '1.1.3');

const result = await prisma.$transaction(async (tx) => {
  const receipt = await tx.receipt.create({...});
  await tx.rentalInvoice.update({... status: 'paid' ...});

  // أنشئ القيد المحاسبي يدوياً داخل نفس الـ Transaction
  const entry = await tx.journalEntry.create({
    data: {
      tenantId, entryNumber: ...,  // ← entryNumber يحتاج Fix منفصل (FI-03)
      description: 'تحصيل دفعة',
      source: 'RECEIPT',
      sourceId: receipt.id,
      status: 'POSTED',
      lines: {
        create: [
          { accountId: cashAccount.id, debit: amount, credit: 0, description: 'إيداع نقدي' },
          { accountId: receivableAccount.id, debit: 0, credit: amount, description: 'تخفيض حسابات القبض' },
        ],
      },
    },
  });

  // حدّث أرصدة الحسابات
  for (const line of [cashAccount, receivableAccount]) { /* upsert accountBalance */ }

  return receipt;
});
```

**الملفات المطلوبة للتعديل:**
- `app/api/v1/invoices/[id]/pay/route.ts` — إعادة هيكلة الـ Transaction
- `app/actions/finance.ts` — نفس التعديل (سطور 16-44)
- `lib/accounting/posting-engine.ts` — إما تعديل `postPaymentEntry` لاستقبال `tx` parameter، أو إنشاء `postPaymentEntryTx(tx, ...)`

**هل يحتاج Migration؟** لا. لا تغيير في الـ Schema.

**هل يحتاج Data Repair؟** نعم. يجب فحص جميع `receipts` التي ليس لها `journal_entry` مرتبط (عبر `sourceId` = `receipt.id`) وإنشاء القيود المفقودة. يمكن تنفيذها بـ Script:

```sql
SELECT r.id, r.tenant_id, r.amount, r.invoice_id
FROM receipts r
LEFT JOIN journal_entries je ON je.source = 'RECEIPT' AND je.source_id = r.id
WHERE je.id IS NULL AND r.status = 'COMPLETED';
```

---

## FI-02: Idempotency Key غير مفعّل

### Location

| الطبقة | الملف | السطر |
|--------|-------|-------|
| Route | `app/api/v1/invoices/[id]/pay/route.ts` | 37-44 (يقرأ الـ Key فقط) |
| Action | `app/actions/finance.ts` | 11-49 (لا يقرأ Idempotency Key أصلاً) |
| Prisma Model | `Receipt` | schema.prisma:600-613 (لا يوجد حقل `idempotencyKey`) |
| DB Table | `receipts` | لا يوجد عمود idempotency_key |

### Reproduction Steps

1. أرسل طلب POST إلى `/api/v1/invoices/{id}/pay` مع Header `Idempotency-Key: abc-123`
2. الدفع يتم بنجاح (receipt منشأ، invoice → paid، journal entry منشأ)
3. **انقطع الاتصال قبل وصول Response** — المستخدم لم يرَ التأكيد
4. المستخدم يضغط "دفع" مرة أخرى
5. **الـ Idempotency-Key غير مخزّن في أي مكان** — لا يوجد `UNIQUE` constraint على key
6. النظام ينفذ الدفع مرة أخرى → **دفعة مزدوجة**

### الكود المسبب

```typescript
// pay/route.ts:37-44 — فقط قراءة الـ Key وليس تخزينه
const idempotencyKey = request.headers.get('idempotency-key')
  || request.headers.get('Idempotency-Key');

if (!idempotencyKey) {
  return NextResponse.json({
    success: false,
    error: 'Missing Idempotency-Key header',
  }, { status: 400 });
}

// ← لا يوجد: تخزين idempotencyKey في الـ Receipt
// ← لا يوجد: التحقق من idempotencyKey موجود مسبقاً
// ← لا يوجد: UNIQUE constraint في قاعدة البيانات
```

```prisma
// schema.prisma:600-613 — لا يوجد حقل idempotencyKey
model Receipt {
  id            String        @id @default(uuid())
  tenantId      String        @map("tenant_id") @db.Uuid
  invoiceId     String
  amount        Decimal
  paymentMethod String
  receivedDate  DateTime      @default(now())
  status        String        @default("COMPLETED")
  ledgerEntry   GeneralLedger?
}
```

### Financial Impact

| السيناريو | التأثير |
|-----------|---------|
| Retry بعد Network Timeout | **دفعة مزدوجة** على نفس الفاتورة — 20,000 SAR بدلاً من 10,000 |
| المستخدم يضغط "دفع" مرتين | **إيراد مكرر** — قيدان محاسبيان لنفس الفاتورة |
| Bot/Webhook يعيد الإرسال | **تضخم الأرصدة** — cash account يزيد مرتين، receivable ينخفض مرتين |

### Severity Justification: CRITICAL

ليس HIGH بل CRITICAL للأسباب التالية:

1. **خسارة مالية مباشرة** — هذا الـ Bug يسمح بخصم مبلغ 10,000 SAR مرتين من حساب العميل (عبر Moyasar أو أي بوابة دفع) مع تسجيل دفعتين منفصلتين.

2. **لا يوجد حماية على مستوى التطبيق ولا على مستوى قاعدة البيانات** — لا تحقق منطقي، لا UNIQUE constraint، لا تخزين للـ Key.

3. **طبيعة Idempotency في المدفوعات** — في أنظمة الدفع، Idempotency Key هو خط الدفاع الوحيد ضد الدفعات المكررة. بدونه، أي انقطاع شبكة يتحول إلى خسارة مالية.

4. **HIGH هو عندما تكون هناك طبقة حماية واحدة على الأقل** — هنا لا توجد أي طبقة حماية. HIGH يتطلب وجود manual workaround أو طبقة partial protection. هنا لا يوجد.

### Real World Scenario

```
فاتورة إيجار: 10,000 SAR
حالة الفاتورة: unpaid

1. المستخدم يضغط "دفع عبر مدى" → النظام يستدعي Moyasar
2. Moyasar تؤكد الدفع → ORCA ينشئ receipt و journal entry ويرسل Response
3. **انقطاع الإنترنت** → المستخدم لم يستلم Response 200
4. المستخدم يرى شاشة خطأ → يعيد المحاولة
5. ORCA ينفذ الدفع مرة أخرى

النتيجة:
- Receipt 1: 10,000 SAR (COMPLETED)
- Receipt 2: 10,000 SAR (COMPLETED) ← مكرر
- Moyasar خصم 10,000 × 2 = 20,000 SAR
- Journal entry 1: Cash +10,000 / Receivable -10,000
- Journal entry 2: Cash +10,000 / Receivable -10,000
- رصيد Cash account: +20,000 SAR (خطأ)
- رصيد Receivable account: -20,000 SAR (خطأ)
- الفاتورة: مدفوعة (لكن بقيمة 20,000 بدلاً من 10,000)

الخسارة: 10,000 SAR خصمت من العميل بدون وجه حق.
```

### Fix Strategy

**التعديل المطلوب:**

1. إضافة حقل `idempotencyKey` إلى `Receipt` مع `UNIQUE` constraint
2. إضافة التحقق من الـ Key قبل تنفيذ الدفع
3. إرجاع الـ Receipt الموجود إذا كان الـ Key مستخدماً مسبقاً

**الملفات:**

1. **`prisma/schema.prisma`** — إضافة حقل `idempotencyKey`:
```prisma
model Receipt {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id") @db.Uuid
  invoiceId       String
  amount          Decimal
  paymentMethod   String
  receivedDate    DateTime @default(now())
  status          String   @default("COMPLETED")
  idempotencyKey  String?  @unique @map("idempotency_key")  // ← NEW
  ledgerEntry     GeneralLedger?
  @@map("receipts")
}
```

2. **`app/api/v1/invoices/[id]/pay/route.ts`** — إضافة التحقق:
```typescript
// بعد قراءة idempotencyKey وقبل أي Process:
const existingReceipt = await prisma.receipt.findUnique({
  where: { idempotencyKey },
});
if (existingReceipt) {
  return NextResponse.json({
    success: true,
    message: 'تم تسجيل الدفعة مسبقاً',
    idempotencyCached: true,
    payment: { id: existingReceipt.id, ... },
  });
}

// عند إنشاء receipt داخل الـ Transaction:
data: {
  ...,
  idempotencyKey,  // ← تخزين الـ Key
}
```

3. **`app/actions/finance.ts`** — نفس التعديل.

**هل يحتاج Migration؟** نعم.
```bash
npx prisma migrate dev --name add_idempotency_key
```

**هل يحتاج Data Repair؟** لا. الحقل الجديد `Optional` مع `?`. القيم الموجودة `null`.

---

## FI-03: entryNumber سباق (Race Condition)

### Location

| الطبقة | الملف | السطر |
|--------|-------|-------|
| Service | `lib/accounting/posting-engine.ts` | 47-52 (قراءة خارج Transaction) |
| Service | `lib/accounting/posting-engine.ts` | 54-100 (الاستخدام داخل Transaction) |
| Prisma Model | `JournalEntry` | schema.prisma:672-694 (`@@unique([tenantId, entryNumber])`) |
| DB Table | `journal_entries` | unique constraint على (tenant_id, entry_number) |

### Reproduction Steps

1. طلبان متزامنان يصلان في نفس الوقت لترحيل قيدين محاسبيين
2. كلا الطلبين ينفذ `findFirst` (سطر 47) — كلاهما يقرأ `lastEntry.entryNumber = 100`
3. كلا الطلبين يحسب `nextNumber = 101`
4. كلا الطلبين يفتح `prisma.$transaction` ويحاول `journalEntry.create({ entryNumber: 101 })`
5. الطلب الأول ينجح — يُنشأ `JournalEntry` برقم 101
6. الطلب الثاني يفشل — **Unique constraint violation** على `(tenantId, entryNumber)`
7. الـ Transaction الكامل (Journal Entry + Account Balances) يرجع بالكامل
8. في `pay/route.ts`: الـ Transaction الخارجي (receipt + invoice) **قد Commit بالفعل** → بيانات مالية غير متطابقة

### الكود المسبب

```typescript
// posting-engine.ts:47-52 — قراءة خارج الـ Transaction
const lastEntry = await prisma.journalEntry.findFirst({
  where: { tenantId },
  orderBy: { entryNumber: 'desc' },
  select: { entryNumber: true },
});
const nextNumber = (lastEntry?.entryNumber ?? 0) + 1;
// ↑ كل طلبين متزامنين يقرآن نفس القيمة (مثلاً 100) ويحسبان 101

// posting-engine.ts:54-100 — استخدام القيمة داخل Transaction منفصل
return prisma.$transaction(async (tx) => {
  const entry = await tx.journalEntry.create({
    data: {
      tenantId,
      entryNumber: nextNumber,  // ← 101 لكلا الطلبين
      ...
    },
  });
  // ↑ الطلب الثاني يفشل هنا: Unique constraint violation
  // ↑ الـ Transaction يرجع. Account balances لم تحدث.
});
```

### Financial Impact

| السيناريو | التأثير |
|-----------|---------|
| طلبا دفع متزامنان على فاتورتين | الأولى تنجح، الثانية تفشل — لكن receipt موجود (FI-01) |
| ZATCA cron يعالج عناصر متعددة | فشل cascade في ترحيل القيود المحاسبية للفواتير |
| Installment collection لبائعين متعددين | بعض الأقساط تدفع بدون تسجيل محاسبي |
| أي طلب concurrent | **EntryNumber skipped** — الرقم 101 يحترق (لا يمكن استعماله)، الرقم 102 يصبح التالي |

### Severity Justification: CRITICAL

ليس HIGH بل CRITICAL للأسباب التالية:

1. **الـ Race Condition حتمي عند Scale** — مع 100+ Tenant ونظام Billing Cron ودفعات متزامنة، هذا الـ Bug سيحدث يومياً. ليس "edge case" نادراً.

2. **يتفاعل مع FI-01 ليزيد الضرر** — في `pay/route.ts`، فشل `postJournalEntry` بسبب race condition يترك receipt موجوداً بدون journal entry. الضرر مضاعف.

3. **مشكلة هيكلية وليست سطحية** — الخطأ ليس في Validation (سهل) بل في تصميم توليد الأرقام المتسلسلة. يتطلب إعادة تصميم الـ Sequence.

4. **Database Constraint ليس حلًا** — الـ `@@unique([tenantId, entryNumber])` يمنع الفساد ولكنه يسبب الفشل. الحل الصحيح هو ضمان عدم حدوث الـ collision أصلاً.

### Real World Scenario

```
فاتورة A: 5,000 SAR
فاتورة B: 15,000 SAR

1. مدير النظام يضغط "تحصيل" على الفاتورتين في نفس الوقت
2. طلب A: findFirst → entryNumber = 100 → nextNumber = 101
3. طلب B: findFirst → entryNumber = 100 → nextNumber = 101
4. طلب A: journalEntry.create({ entryNumber: 101 }) → ينجح
5. طلب B: journalEntry.create({ entryNumber: 101 }) → UNIQUE VIOLATION
6. طلب B: الـ Transaction يرجع → لم يُنشأ Journal Entry
7. حساب B: لم يزد Cash account, لم ينخفض Receivable

النتيجة:
- الفاتورة A: مدفوعة (5,000 SAR) — صحيح
- الفاتورة B: غير مدفوعة (15,000 SAR) — صحيح، لكن خطأ 500
- لكن إذا كان طلب B عبر pay/route.ts:
  - Receipt B موجود (15,000 SAR) — تم Commit قبل الفشل
  - الفاتورة B: مدفوعة
  - Journal Entry B: غير موجود
  - Cash account: 5,000+ فقط بدلاً من 20,000
  - Receivable account: -5,000 فقط بدلاً من -20,000

الخلل المحاسبي: 15,000 SAR مفقودة من Cash account.
```

### Fix Strategy

**التعديل المطلوب:** استخدام Database Sequence بدلاً من القراءة المنطقية.

**الخيار A — PostgreSQL Sequence (موصى به):**

إنشاء Sequence في قاعدة البيانات:

```sql
CREATE SEQUENCE journal_entry_number_seq;
```

ثم استخدام `dbgenerated` في Prisma أو SQL raw داخل الـ Transaction:

```typescript
return prisma.$transaction(async (tx) => {
  // استخدم SQL raw لجلب الرقم التالي من الـ Sequence — Atomic
  const result: [{ nextval: bigint }] = await tx.$queryRaw`
    SELECT nextval('journal_entry_number_seq') AS nextval
  `;
  const nextNumber = Number(result[0].nextval);

  const entry = await tx.journalEntry.create({
    data: {
      entryNumber: nextNumber,  // ← مضمون أنه unique — Atomic read + increment
      ...
    },
  });
  // ↑ لا يمكن أن يحدث Collision — الـ DB Sequence يضمن التفرد
});
```

**الخيار B — منع الـ Collision (حل بديل مؤقت):**

الاستمرار في القراءة المنطقية ولكن مع Retry عند Unique Constraint Violation:

```typescript
export async function postJournalEntry(input: JournalEntryInput): Promise<any> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const lastEntry = await prisma.journalEntry.findFirst({ ... });
    const nextNumber = (lastEntry?.entryNumber ?? 0) + 1;

    try {
      return await prisma.$transaction(async (tx) => {
        // نفس الكود الحالي
      });
    } catch (error: any) {
      if (error.code === 'P2002' && attempt < MAX_RETRIES) {
        continue; // ← إعادة المحاولة برقم جديد
      }
      throw error;
    }
  }
}
```

**الملفات المطلوبة:**
- `lib/accounting/posting-engine.ts` — تعديل `postJournalEntry`
- `prisma/schema.prisma` — لا تغيير (الـ Constraint موجود مسبقاً)

**هل يحتاج Migration؟**
- الخيار A: يحتاج `CREATE SEQUENCE` migration
- الخيار B: لا يحتاج

**هل يحتاج Data Repair؟**
- الخيار A: يحتاج إعادة تعبئة الـ Sequence (`SELECT setval('journal_entry_number_seq', COALESCE(MAX(entry_number), 0)) FROM journal_entries;`)
- الخيار B: لا يحتاج

---

## الجدول النهائي

| Bug | Severity | Revenue Risk | Data Corruption Risk | Fix Complexity |
|-----|----------|-------------|---------------------|----------------|
| **FI-01**: Journal Entry خارج Transaction الدفع | **CRITICAL** | **مباشر** — فقدان إيراد بدون تسجيل محاسبي. لا يمكن اكتشافه إلا بالتسوية البنكية اليدوية. | **دائم** — إنشاء Receipt بدون Journal Entry. الفرق بين الدفاتر والمقبوضات النقدية. | **متوسطة** — ساعتان. إعادة هيكلة الـ Transaction. |
| **FI-02**: Idempotency Key غير مفعّل | **CRITICAL** | **مباشر** — دفع مزدوج. خصم 10,000 SAR مرتين من العميل. خسارة مالية حقيقية. | **دائم** — Receipts مكررة، Journal Entries مكررة. تضاعف الأرصدة. | **متوسطة** — 3 ساعات. Migration + تعديل Route. |
| **FI-03**: entryNumber Race Condition | **CRITICAL** | **غير مباشر** — فشل القيد يمنع إكمال الدفع، لكنه يتفاعل مع FI-01 ليسبب خسارة. | **دائم مع FI-01** — بدون FI-01: فقط فشل الطلب مع Retry. مع FI-01: Receipt بدون Journal Entry. | **بسيطة** — ساعة واحدة. إضافة Retry loop أو ساعتين مع PostgreSQL Sequence. |

---

## Final Verdict

بعد التحقيق في الأخطاء المالية الحرجة الثلاثة:

| المعيار | التقييم |
|---------|---------|
| FI-01 | يمنع التشغيل التجاري ✅ — أي دفعة حقيقية معرضة لفقدان القيد المحاسبي |
| FI-02 | يمنع التشغيل التجاري ✅ — الدفعات المكررة ستحدث حتماً مع أي انقطاع شبكة |
| FI-03 | يمنع التشغيل التجاري ✅ — مع 100+ Tenant و Cron Jobs، Race Condition سيحدث يومياً |
| التفاعل بينها | FI-01 + FI-03 = **أسوأ سيناريو** — Race Condition يسبب فشل journal entry، لكن receipt موجود. مزيج مميت. |

## COMMERCIAL BLOCKER CONFIRMED ✅

**التبرير النهائي:**

1. **FI-01 وحده كافٍ لمنع التشغيل التجاري.** أي عملية دفع — سواء كانت إيجار 500 SAR أو عقد بيع 5,000,000 SAR — يمكن أن تسجل في النظام (فاتورة مدفوعة، receipt منشأ) بدون أي أثر في الدفاتر المحاسبية. هذا ليس خطأ في واجهة المستخدم. هذا كسر لقوانين المحاسبة الأساسية (Double-Entry Accounting).

2. **FI-02 يسمح بسرقة/خسارة أموال حقيقية.** Idempotency في أنظمة الدفع ليس "أفضل ممارسة" — هو شرط أساسي. بدونه، كل انقطاع شبكة هو فرصة لخصم مزدوج. مع Moyasar أو أي بوابة دفع، المبلغ يُخصم من حساب العميل فوراً.

3. **FI-03 يجعل النظام غير موثوق تحت الضغط.** مع Billing Cron الشهري الذي يعالج مئات الفواتير، السباق على entryNumber سيحدث حتماً. النظام سيصطدم بقيود Unique، وسيفشل ترحيل الإيرادات.

4. **التفاعل بين الأخطاء يضاعف الخطورة.** FI-01 + FI-03 معاً يعنيان أن Receipt يُنشأ (خصم من العميل) ثم Journal Entry يفشل (لا تسجيل محاسبي). الشركة تظن أن الدفع تم، العميل يظن أنه دفع، لكن الحسابات لا تعكس ذلك.

5. **لا يوجد Manual Workaround.** لا يمكن "إلغاء الدفع" وإعادة المحاولة بسهولة. لا توجد واجهة "إعادة ترحيل القيود المفقودة". كل دفعة خاطئة تتطلب تدخل يدوي في قاعدة البيانات — وهذا غير مقبول تجارياً.

**الخلاصة:** ORCA CRM لا يمكنها استقبال أموال حقيقية من العملاء قبل إصلاح هذه الأخطاء الثلاثة. أي عملية دفع تجارية ستعرض أموال العملاء وسمعة الشركة للخطر.

**COMMERCIAL BLOCKER CONFIRMED ✅**
