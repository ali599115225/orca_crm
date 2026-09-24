# ORCA CENTRAL BASELINE PLAN
## خطة خط الأساس المركزي لمشروع ORCA CRM
**Document ID:** ORCA-CBP-001
**Version:** 2.1 — Single-Company + External Integration Ownership Override
**Mode:** PLAN + READ-ONLY EXECUTION
**Prepared on:** 2026-07-18
**Project:** ORCA CRM / Real Estate Operating Platform
**Repository:** `ali599115225/orca_crm`
**Primary local repository:** `C:\Users\ali59\Desktop\REDC-orca-clean`
**Primary production reference:** `https://orca.az-ez.pro`
**Execution status:** **IN PROGRESS — GOVERNANCE BASELINE AND CONFLICT ANALYSIS ONLY**
**Approval state:** **APPROVED — OWNER BUSINESS MODEL OVERRIDE 2026-07-19**
---
# 0. القرار الحاكم لنموذج المشروع — إلزامي
هذا القسم يتفوق على أي وصف سابق داخل هذه الوثيقة أو المستودع أو التقارير المؤرشفة.
| البند | القرار المعتمد |
|---|---|
| BUSINESS MODEL | `VERIFIED — SINGLE INDEPENDENT COMPANY` |
| CURRENT PLATFORM MODEL | `INTERNAL COMPANY OPERATING PLATFORM` |
| SAAS MULTI-COMPANY RENTAL | `OUT OF SCOPE` |
| CURRENT MULTI-TENANT IMPLEMENTATION | `CONFLICTING / LEGACY DESIGN — REQUIRES SAFE TRANSITION ANALYSIS` |
| RBAC AND INTERNAL ORGANIZATIONAL ISOLATION | `REQUIRED` |
| LICENSE STATUS | `NO LICENSE ASSUMED / NOT PROVEN` |
قواعد التنفيذ الناتجة:
1. الشركة المستقلة الواحدة هي مالك ومشغل ORCA، وجميع المستخدمين موظفون أو وكلاء أو مديرون أو محاسبون أو مستخدمون داخليون.
2. لا يجوز وصف ORCA كمنصة SaaS مؤجرة لشركات مستقلة ضمن النطاق الحالي.
3. يبقى `tenantId` مؤقتًا كحاجز تقني يمثل **نطاق الشركة الواحدة**، ولا يُحذف أو يعاد تشكيله قبل Impact Assessment وخطة بيانات وتوافق وتراجع واختبارات عدم فقد.
4. العزل المستهدف مستقبلاً هو عزل الأدوار والإدارات والفروع وفرق العمل، مع صلاحيات خادم فعلية.
5. التكاملات الخارجية تخص حسابات الشركة المالكة، ولا تُفترض بيانات اعتماد منفصلة لعملاء متعددين.
6. لا يُفترض وجود ترخيص عقاري أو مالي أو إعلاني أو اتصالات أو اعتماد حكومي دون وثيقة رسمية.
7. أي تسجيل مستأجر، باقات SaaS، فواتير اشتراك، بوابة مستأجر، أو إعداد تكامل مستقل لكل Tenant يسجل في `ORCA_CONFLICT_REGISTER.md` قبل تعديل الكود.
8. يمنع بدء التحويل المعماري أو Migration تلقائيًا؛ الأولوية الحالية تثبيت الحالة وتحليل الاعتماديات وترتيب الانتقال الآمن.
## 0.1 سياسة ملكية التكاملات الخارجية — إلزامية
هذا القسم يتفوق على أي وصف سابق يفترض أن مطور ORCA يملك أو يوفر حسابات أو اشتراكات أو تراخيص لمزودي الخدمات الخارجية.
| البند | القرار المعتمد |
|---|---|
| INTEGRATION OWNERSHIP | `COMPANY OWNER` |
| TECHNICAL PROVIDER RESPONSIBILITY | `INTEGRATION-READY PATHS AND ADAPTERS ONLY` |
| PRODUCTION PROVIDER ACCOUNTS | `NOT PROVIDED / NOT CONFIGURED` |
| LICENSES AND EXTERNAL SUBSCRIPTIONS | `COMPANY OWNER RESPONSIBILITY` |
| DEVELOPER-OWNED CREDENTIALS | `PROHIBITED` |
قواعد التنفيذ الناتجة:
1. لا توجد ضمن نطاق التسليم الحالي تكاملات إنتاجية مثبتة مع WhatsApp/Meta أو البريد أو SMTP/Resend أو الدفع أو SMS أو التخزين أو الإعلانات أو التوقيع أو الخرائط أو أي مزود خارجي آخر.
2. حالة عدم وجود بيانات اعتماد أو اشتراك هي حالة تشغيل طبيعية: `NOT CONFIGURED`، وليست عطلًا متى كانت بنية الربط والعقود والحالات والاختبارات جاهزة.
3. مسؤولية مقدم الخدمة التقنية تقتصر على المسارات والواجهات وAdapters وWebhook endpoints والتحقق والتدقيق واختبارات Mock/Sandbox.
4. فتح الحسابات، الاشتراك، دفع الرسوم، تقديم بيانات الاعتماد، توقيع عقود المزود، واستخراج التراخيص والموافقات هي مسؤولية مالك الشركة المشغلة.
5. يمنع استخدام رقم أو بريد أو حساب أو مفتاح أو بيانات شخصية تخص مطور ORCA لتشغيل أي تكامل.
6. تحفظ بيانات الاعتماد في متغيرات بيئية أو خزنة أسرار، ولا تحفظ في الكود أو GitHub أو التقارير أو السجلات.
7. يمنع الإرسال الحقيقي أو الدفع أو الاسترداد أو رفع ملف خارجي أو تفعيل مزود دون بيانات الشركة وموافقة صريحة وبيئة مناسبة وتحقق أمني.
8. يجب أن تعرض الواجهات حالات: غير مربوط، يحتاج إعدادًا، بيانات غير مكتملة، متصل، وفشل الاتصال، دون ادعاء تفعيل غير مثبت.
9. إثبات الجاهزية يكون بالعقود البرمجية واختبارات الوحدة وMock providers والتحقق من توقيعات Webhooks وحالات الفشل والاستعادة وتوثيق التفعيل المستقبلي.
10. أي مسار ينفذ أثرًا خارجيًا حقيقيًا أو يستخدم بيانات ثابتة/شخصية يدخل سجل التعارضات ويوقف خلف بوابة موافقة المالك.
## 0.2 ترتيب سلطة الوثائق
عند التعارض يُطبق الترتيب التالي:
1. قرار نموذج الشركة الواحدة وسياسة التكاملات الخارجية في هذه الوثيقة.
2. `ORCA_PROJECT_CHARTER.md` و`ORCA_SCOPE_STATEMENT.md`.
3. `ORCA_ARCHITECTURE_BASELINE.md` و`ORCA_TENANT_ISOLATION_CONTRACT.md`.
4. `ORCA_RBAC_MATRIX.md` و`ORCA_FUNCTIONAL_CONTRACT_REGISTRY.md`.
5. `ORCA_RISK_REGISTER.md` و`ORCA_CONFLICT_REGISTER.md`.
6. التقرير المركزي الحالي.
7. الكود الحالي بوصفه حقيقة تنفيذية، لا بوصفه قرارًا تجاريًا صحيحًا.
8. التقارير المؤرشفة والوثائق التاريخية بوصفها أدلة تاريخية فقط.
لا يبدأ تحويل المعمارية أو قاعدة البيانات أو إزالة بقايا SaaS قبل إغلاق حزمة الوثائق أعلاه واعتماد تحليل الأثر وخطط البيانات والتوافق والتراجع.
# 1. الغرض من الوثيقة
هذه الوثيقة هي **خطة تنفيذ المراجعة التأسيسية المركزية** لمشروع ORCA، وليست تقرير نتائج المراجعة.
تهدف الخطة إلى إنشاء مرجع مركزي واحد يحدد:
- ما الذي سيتم فحصه.
- ما الأدلة المقبولة.
- كيف ستُصنّف حالة كل نطاق.
- كيف ستُفصل الحقائق عن الافتراضات والتقارير السابقة.
- كيف ستُراجع الفروع والصفحات والعقود والأمان والتشغيل.
- كيف ستُدار المخاطر والتعارضات والاعتماديات.
- كيف سيتحول الناتج إلى خطة معالجة مرتبة.
- ما شروط الانتقال إلى الإطلاق أو إيقافه.
**لا تتضمن هذه المرحلة:**
- تعديل الكود.
- تشغيل Build شامل.
- تشغيل جميع الاختبارات.
- تنفيذ Merge أو Rebase.
- إنشاء Commit أو Push أو Pull Request.
- تنفيذ Migration.
- تغيير البيانات.
- Deploy أو Rollback.
- حذف الفروع أو الملفات.
- اعتماد صفحة بصريًا دون دليل مرئي.
- إرسال بريد/WhatsApp/SMS حقيقي أو تنفيذ دفع/استرداد/رفع خارجي.
- إدخال بيانات اعتماد مزود أو استخدام بيانات تخص المطور.
---
# 2. قرار البدء والاعتماد
تم اعتماد الخطة، وتم اعتماد تحديث نموذج الشركة الواحدة كمرجع أعلى. المرحلة الحالية:
> **ORCA CENTRAL BASELINE EXECUTION — READ-ONLY ASSESSMENT**
بدأت مرحلة القراءة والتوثيق. تبقى Migration وعمليات البيانات والإرسال الحقيقي والدفع وDeploy خلف بوابات موافقة مستقلة.
---
# 3. المبادئ الحاكمة
## 3.1 مصدر حقيقة واحد
سيكون الناتج النهائي المرجعي:
```text
ORCA_CENTRAL_BASELINE_REPORT.md
```
ويحمل في داخله السجلات والملخصات الأساسية. يجوز إنشاء ملاحق آلية مساعدة، لكن لا تصبح بديلًا عن التقرير المركزي.
## 3.2 الإثبات قبل الحكم
لا يُصنّف أي بند `VERIFIED` لمجرد:
- وجود ملف باسمه.
- وجود تقرير قديم يعلن اكتماله.
- وجود اختبار يبحث عن نص أو Class.
- ظهور واجهة دون إثبات تشغيلها.
- نجاح جزء من التدفق.
- وجود نموذج Prisma دون إثبات استخدامه الفعلي.
## 3.3 الفصل بين ثلاثة أنواع من الحقيقة
| النوع | السؤال |
|---|---|
| **Intended Truth** | ما الذي تقرره وثائق المنتج والعقود المعتمدة؟ |
| **Implemented Truth** | ما الذي ينفذه الكود الحالي فعليًا؟ |
| **Runtime Truth** | ما الذي يعمل في Preview/Production ويمكن إثباته؟ |
عند التعارض، يُسجّل البند `CONFLICTING` ولا يجري اختيار أحد الطرفين بصمت.
## 3.4 عدم الخلط بين الإغلاق الوظيفي والبصري
يمكن أن تكون الصفحة:
- مغلقة وظيفيًا وغير مثبتة بصريًا.
- مغلقة بصريًا وغير مكتملة تشغيليًا.
- مكتملة في فرع وغير موجودة في فرع التجميع.
- ناجحة في الاختبارات وغير مثبتة في بيئة التشغيل.
## 3.5 التدقيق قراءة فقط أولًا
الجولة الأولى تعتمد على القراءة والجرد والمقارنة. لا يبدأ التشغيل المكثف إلا بعد:
1. إغلاق خريطة الفروع.
2. تثبيت الفرع المرشح للتجميع.
3. تحديد الاختبارات المستهدفة.
4. اعتماد أوامر التنفيذ.
5. منع أي أثر كتابي أو Migration.
---
# 4. الأطر المرجعية المعتمدة للخطة
تُستخدم الأطر التالية كمرجع تنظيمي، وليس كادعاء حصول ORCA على شهادة أو امتثال رسمي:
1. **PMI Practice Standard for Work Breakdown Structures**
   لتغطية كامل النطاق وتقسيمه إلى حزم عمل قابلة للإدارة والتتبع.
2. **PMI Governance of Portfolios, Programs, and Projects**
   لبناء الحوكمة، نقاط القرار، المسؤوليات، والتصعيد.
3. **PMI Risk Management**
   لبناء سجل المخاطر وتقييم الاحتمال والأثر والاستجابة والخطر المتبقي.
4. **NIST SP 800-218 SSDF**
   لدمج الأمن داخل دورة التطوير والتسليم والتحسين بدل وضعه كفحص نهائي فقط.
5. **NIST Cybersecurity Framework 2.0**
   لتغطية: Govern, Identify, Protect, Detect, Respond, Recover.
6. **OWASP ASVS**
   لبناء متطلبات تحقق فنية لأمن تطبيق الويب والـAPIs.
7. **GitHub Branch Protection and Required Status Checks**
   لبناء بوابة دمج وإطلاق قابلة للفرض آليًا.
> المرجع النهائي في هذه المراجعة هو ما يناسب طبيعة ORCA ومخاطره الفعلية، وليس التطبيق الحرفي غير الضروري لأي معيار.
---
# 5. نطاق خط الأساس المركزي
يشمل خط الأساس خمسة مستويات مترابطة:
```text
الاستراتيجية والحوكمة
        ↓
المعمارية والبيانات والأمان
        ↓
النطاقات التشغيلية والصفحات
        ↓
الجودة والتكامل والتشغيل
        ↓
المخاطر والإطلاق والاستمرارية
```
## 5.1 النطاقات الرئيسية
1. تعريف المنتج ونطاقه التجاري.
2. الحوكمة وإدارة القرارات.
3. المستودع والفروع والدمج.
4. معمارية Frontend.
5. معمارية Backend.
6. نموذج المجال والبيانات.
7. تحليل التصميم Multi-Tenant القديم واعتماد `tenantId` المؤقت كنطاق للشركة الواحدة.
8. المصادقة والجلسات.
9. الصلاحيات والأدوار.
10. الصفحات والمسارات.
11. العقود الوظيفية.
12. النظام البصري.
13. التكاملات الخارجية.
14. الملفات والمستندات.
15. Webhooks والوظائف المجدولة.
16. إدارة الأخطاء والتسجيل.
17. الاختبارات والجودة.
18. CI/CD والبيئات.
19. الأسرار وإدارة الإعداد.
20. المراقبة والتنبيهات.
21. النسخ الاحتياطي والاستعادة.
22. التراجع وإدارة الحوادث.
23. التوثيق ونقل المعرفة.
24. المخاطر والاعتماديات.
25. بوابة الإطلاق.
---
# 6. مصادر الأدلة
## 6.1 الأدلة المتاحة عند إعداد الخطة
تم توفير حزمة أدلة محلية تحتوي على:
- بيانات Git والفروع وWorktrees.
- الفروع المطلوبة للمراجعة.
- جرد صفحات App Router.
- جرد APIs وActions والاختبارات.
- إعدادات المشروع.
- Prisma schema والمهاجرات.
- GitHub Actions workflows.
- تقارير ووثائق سابقة.
- مراجع بصرية.
- أسماء متغيرات البيئة دون قيمها.
- نسخة منقحة من التغييرات المحلية.
- بيانات مختصرة من مستودعات تاريخية.
هذه الحزمة تثبت **توفر مادة المراجعة**، ولا تثبت وحدها اكتمال المشروع.
## 6.2 ترتيب أولوية الأدلة
| الأولوية | الدليل | الاستخدام |
|---:|---|---|
| 1 | الكود الحالي المرفوع في GitHub | إثبات التنفيذ |
| 2 | فرق الفروع وتاريخ Git | إثبات النسخ والتعارضات |
| 3 | Prisma schema والمهاجرات | إثبات نموذج البيانات |
| 4 | إعدادات CI/CD والنتائج الفعلية | إثبات بوابات الجودة |
| 5 | Runtime/Preview/Production | إثبات التشغيل |
| 6 | اختبارات السلوك والأمان | إثبات العقود |
| 7 | صور وPreview بصري | إثبات الواجهة |
| 8 | الوثائق المعتمدة | إثبات المقصود |
| 9 | التقارير السابقة | قرائن مساعدة |
| 10 | الذاكرة والمحادثات | سياق يحتاج تثبيتًا |
## 6.3 قاعدة فض التعارض
- **السلوك الفعلي** يتغلب على تقرير قديم يصف سلوكًا مختلفًا.
- **العقد التجاري المعتمد** يحدد المطلوب حتى إن كان الكود يخالفه.
- **الكود المرفوع** يتغلب على نسخة محلية قديمة، إلا إذا كانت النسخة المحلية غير المرفوعة هي المقصودة صراحة.
- **الصور** مطلوبة للحكم البصري؛ الكود وحده لا يكفي.
- أي تعارض غير محلول يُصنف `CONFLICTING`.
---
# 7. نظام التصنيف
## 7.1 التصنيفات الرسمية
| التصنيف | التعريف |
|---|---|
| **VERIFIED** | موجود، مطبق، ومثبت بدليل قابل لإعادة التحقق |
| **PARTIAL** | موجود، لكنه ناقص أو محدود أو غير مطبق على كامل النطاق |
| **MISSING** | غير موجود أو لا يوجد له تطبيق/وثيقة مركزية مطلوبة |
| **CONFLICTING** | توجد نسخ أو عقود أو تطبيقات متعارضة |
| **NOT PROVEN** | توجد إشارة أو ادعاء دون دليل كافٍ |
| **OUT OF SCOPE** | خارج النطاق بقرار معتمد |
## 7.2 درجات الثقة
| الدرجة | المعنى |
|---|---|
| **High** | كود + اختبار/تشغيل + وثيقة متسقة |
| **Medium** | كود أو وثيقة قوية دون إثبات تشغيل كامل |
| **Low** | تقرير أو اسم ملف أو قرينة غير كافية |
## 7.3 شدة الأثر
| الشدة | الوصف |
|---|---|
| **Critical** | يمنع الإطلاق أو قد يؤدي لاختراق/فقد بيانات/تجاوز Tenant |
| **High** | يعطل رحلة أساسية أو يسبب التزامًا قانونيًا/ماليًا |
| **Medium** | خلل وظيفي أو تشغيلي مهم مع بديل مؤقت |
| **Low** | تحسين أو نقص توثيقي محدود |
| **Informational** | ملاحظة لا تتطلب معالجة فورية |
---
# 8. لقطة الاستلام الأولية قبل المراجعة
> هذه ليست النتيجة النهائية. هي خريطة أولية لتوجيه المراجعة، وستتغير فقط بناءً على الأدلة.
## 8.1 الموجود والمثبت عند مستوى الوجود فقط
| البند | الحالة الأولية | حدود الإثبات الحالي |
|---|---|---|
| مستودع GitHub | VERIFIED | وجود المستودع؛ الجودة لم تُراجع |
| الفروع السبعة المطلوبة | VERIFIED | وجود المراجع؛ الدمج لم يُحلل نهائيًا |
| حزمة أدلة محلية | VERIFIED | سلامة مادة الجرد؛ النتائج غير مستخلصة |
| Next.js project structure | VERIFIED | وجود البنية؛ جودة الفصل NOT PROVEN |
| Prisma schema والمهاجرات | VERIFIED | وجودها؛ سلامة النموذج PARTIAL/NOT PROVEN |
| GitHub Actions workflows | VERIFIED | وجودها؛ صلاحية بوابة الإطلاق NOT PROVEN |
| Vitest/Playwright configuration | VERIFIED | وجود البنية؛ التغطية والاعتمادية NOT PROVEN |
| Production URL | VERIFIED AT INTAKE | الصحة التشغيلية الحالية تحتاج إعادة إثبات |
## 8.2 الموجود جزئيًا بحسب المعرفة السابقة
| البند | الحالة الأولية | سبب التصنيف |
|---|---|---|
| تعريف المنتج والنطاق | PARTIAL | موجود في وثائق ومحادثات متعددة دون Charter مركزي |
| المعمارية | PARTIAL | توجد وثائق وبنية، لكن التطبيق غير موحد بالكامل |
| Multi-Tenancy | PARTIAL | توجد أنماط واختبارات، لكن التغطية الشاملة غير مثبتة |
| RBAC | PARTIAL | توجد صلاحيات، لكن المصفوفة المركزية غير مثبتة |
| العقود الوظيفية | PARTIAL | بعض التدفقات قوية وبعضها غير مكتمل أو غير موثق |
| النظام البصري | PARTIAL | توجد عقود وإغلاقات متفرقة دون مصدر واحد نهائي |
| الاختبارات | PARTIAL | عدد كبير من الاختبارات، لكن جودة التغطية متفاوتة |
| CI/CD | PARTIAL | Workflows موجودة، لكن معايير الدمج والإطلاق غير مثبتة |
| إدارة الأسرار | PARTIAL | متغيرات وبيئات موجودة؛ دورة الحياة غير موثقة |
| المراقبة والتسجيل | PARTIAL | مكونات موجودة؛ التغطية والتنبيه غير مثبتين |
| التوثيق | PARTIAL | وثائق كثيرة لكن موزعة ومتعارضة زمنيًا |
| النسخ الاحتياطي | PARTIAL | وجود سياسة أو خدمة محتمل؛ Restore Test غير مثبت |
| إدارة الفروع | PARTIAL | الفروع موجودة، لكن ملكية الملفات وترتيب الدمج غير مركزيين |
## 8.3 غير الموجود كمرجع مركزي معتمد
> تعني `MISSING AS CENTRAL AUTHORITY` أن عناصر متفرقة قد تكون موجودة، لكن لا يوجد حتى الآن مرجع مركزي واحد مثبت.
| البند | الحالة الأولية |
|---|---|
| Project Charter نهائي | MISSING AS CENTRAL AUTHORITY |
| Central Baseline معتمد | MISSING |
| Page & Route Registry مركزي | MISSING AS CENTRAL AUTHORITY |
| Functional Contract Registry | MISSING AS CENTRAL AUTHORITY |
| RBAC Matrix كاملة | MISSING AS CENTRAL AUTHORITY |
| Tenant Isolation Contract شامل | MISSING AS CENTRAL AUTHORITY |
| ADR Index / Decision Log | MISSING AS CENTRAL AUTHORITY |
| RACI Matrix للمشروع | MISSING |
| Risk Register مركزي | MISSING |
| Dependency Register | MISSING |
| Conflict & Duplication Register | MISSING |
| Branch Ownership Map | MISSING |
| Definition of Done موحدة | MISSING AS CENTRAL AUTHORITY |
| Release Readiness Gate موحدة | MISSING AS CENTRAL AUTHORITY |
| Restore Test Evidence | NOT PROVEN |
| Rollback Playbook | MISSING/NOT PROVEN |
| Incident Response Runbook | MISSING/NOT PROVEN |
| Secrets Lifecycle Matrix | MISSING AS CENTRAL AUTHORITY |
| Visual Proof Registry | MISSING AS CENTRAL AUTHORITY |
## 8.4 ما لا يمكن إثباته قبل التنفيذ
- عدم وجود أسرار مكشوفة في تاريخ Git.
- عدم وجود Cross-Tenant query.
- اكتمال Security Headers.
- سلامة CSRF لجميع المسارات المحتاجة.
- صحة Webhook signatures لكل مزود.
- خلو Production من Mock data.
- صلاحية كل Cron job.
- نجاح جميع GitHub Actions على فرع التجميع.
- صلاحية النسخ الاحتياطية للاستعادة.
- اكتمال الصفحات والتبويبات والنماذج.
- التطابق البصري في Light/Dark وRTL/LTR.
- خلو الفروع من تعارضات دلالية.
- إمكانية التراجع الآمن عن آخر إصدار.
هذه البنود تبدأ بالحالة `NOT PROVEN`.
---
# 9. هيكل تقسيم العمل WBS
## WBS-0 — إدارة المراجعة
### WBS-0.1 اعتماد الخطة
- مراجعة هذه الوثيقة.
- تحديد التعديلات.
- موافقة صريحة على البدء.
### WBS-0.2 تثبيت قواعد العمل
- قراءة فقط.
- عدم تشغيل Build شامل في الجولة الأولى.
- عدم تعديل أو Merge.
- حفظ النتائج الطويلة في التقرير.
### WBS-0.3 ضبط الإصدارات
- كل تحديث للخطة يحمل رقم إصدار.
- كل حكم نهائي يرتبط بدليل.
- لا تُعدّل النتائج السابقة بصمت؛ يُسجل سبب التغيير.
**المخرج:** Plan Approval Record.
---
## WBS-1 — الحوكمة والاستراتيجية
### الهدف
تحديد ما هو ORCA، ولمن، وما حدود مسؤوليته، وما الإصدار المستهدف.
### الأعمال
1. استخراج تعريف المنتج من الوثائق والكود.
2. توحيد نطاق SaaS العقاري متعدد المستأجرين.
3. تحديد الأطراف:
   - مالك المنصة.
   - المشترك/الشركة العقارية.
   - موظفو المشترك.
   - مزودو التكاملات.
   - العملاء النهائيون.
4. تحديد ما تحتفظ به ORCA وما لا تحتفظ به.
5. تحديد حدود الدفع والمستندات والإعلانات والتكاملات.
6. تحديد MVP/Launch Scope.
7. تحديد Deferred Scope.
8. إنشاء سجل القرارات.
9. إنشاء Change Control.
### المخرجات
- Project Charter.
- Scope Statement.
- In-Scope / Out-of-Scope Matrix.
- Stakeholder Register.
- Decision Register.
- Change Control Procedure.
### معيار القبول
- لا توجد صفحة أو ميزة دون ارتباط بهدف أو نطاق.
- كل بند مؤجل يحمل قرارًا وسببًا.
- حدود المسؤولية التقنية والتجارية واضحة.
---
## WBS-2 — المستودع والفروع
### الهدف
تحديد الفرع الأساسي، نسخة كل ملف، والتعارضات قبل أي دمج.
### الفروع المشمولة
- `work/orca-pre-parallel-20260715`
- `work/advertising-page`
- `claude/property-offers-visual-audit-83d21e`
- `work/email-page`
- `work/projects-visual-replanning-20260718`
- `work/properties-visual-replanning-20260718`
- `work/tours-visual-replanning-20260718`
### الأعمال
1. خريطة Commit ancestry.
2. مقارنة كل فرع بالمرشح الأساسي.
3. قائمة الملفات المتغيرة.
4. الملفات المعدلة في عدة فروع.
5. مقارنة النسخ الأحدث دلاليًا، لا زمنيًا فقط.
6. رصد:
   - ملفات Cursor.
   - تقارير آلية.
   - `next-env.d.ts`.
   - ملفات Build/Cache.
   - Worktree artifacts.
7. تحديد تعارضات:
   - نصية.
   - دلالية.
   - وظيفية.
   - بصرية.
   - في الاختبارات.
8. اقتراح ترتيب دمج دون تنفيذه.
9. اقتراح Branch protection بعد اعتماد الفرع المركزي.
### المخرجات
- Repository Map.
- Branch Matrix.
- Overlapping Files Register.
- Conflict Register.
- Exclusion List.
- Recommended Merge Order.
- Branch Ownership Policy.
### معيار القبول
- كل ملف متداخل له نسخة مختارة وسبب.
- لا يوجد فرع مجهول الغرض.
- لا تُدمج ملفات آلية أو مؤقتة.
- ترتيب الدمج قابل للتنفيذ دون تخمين.
---
## WBS-3 — المعمارية
### الهدف
تحديد المعمارية الفعلية والفجوة بينها وبين المعمارية المقصودة.
### الأعمال
1. رسم Context Diagram.
2. رسم Container/Module Map.
3. تحليل:
   - `app`
   - `components`
   - `features`
   - `lib`
   - `prisma`
   - `tests`
   - `scripts`
4. تحديد حدود Domains.
5. رصد المكونات العملاقة.
6. فصل:
   - UI.
   - State.
   - Data access.
   - Business rules.
   - Integrations.
7. تحليل الاعتماديات الدائرية.
8. تحديد Shared Components الحقيقية.
9. رصد النسخ المحلية المكررة.
10. إنشاء ADR backlog.
### المخرجات
- Architecture Assessment.
- Domain Boundary Map.
- Dependency Map.
- Shared Component Map.
- Architecture Debt Register.
- ADR Index.
### معيار القبول
- كل نطاق له حدود واضحة.
- لا يوصف فصل الطبقات دون إثباته.
- كل ازدواجية معروفة ومسجلة.
---
## WBS-4 — نموذج البيانات وانتقال Single-Company الآمن
### الهدف
إثبات سلامة البيانات وملكية السجلات وعزل العملاء.
### الأعمال
1. استخراج ERD.
2. تصنيف النماذج:
   - Tenant-owned.
   - Platform-owned.
   - Shared reference.
   - Audit/system.
3. مراجعة `tenantId`.
4. تحليل العلاقات والفهارس والقيود.
5. مراجعة عمليات:
   - Create.
   - Read.
   - Update.
   - Delete/archive.
6. مراجعة Server Actions وAPIs وJobs وWebhooks.
7. مراجعة الملفات والمستندات.
8. رصد fallbacks أو queries غير المعزولة.
9. مراجعة Transactions.
10. مراجعة البيانات اليتيمة.
11. مراجعة migrations.
12. وضع اختبارات Cross-Tenant المستهدفة.
### المخرجات
- ERD.
- Data Ownership Matrix.
- Tenant Isolation Contract.
- Tenant Query Inventory.
- Migration Assessment.
- Data Lifecycle Matrix.
- Data Integrity Risk Register.
### معيار القبول
- كل سجل تجاري له مالك Tenant مثبت.
- الاستثناءات محدودة وموثقة.
- لا يعتمد `tenantId` على مدخل غير موثوق.
- توجد اختبارات سلبية للنطاقات الحرجة.
---
## WBS-5 — المصادقة والصلاحيات
### الهدف
إثبات من يدخل، كيف تستمر الجلسة، وما الذي يستطيع فعله.
### الأعمال
1. تحليل تسجيل الدخول والخروج.
2. الجلسات والكوكيز.
3. مدة الجلسة وRemember Me.
4. Session rotation/revocation.
5. Rate limiting.
6. Password handling.
7. Super Admin.
8. استخراج الأدوار.
9. استخراج permissions الفعلية.
10. بناء RBAC Matrix.
11. مراجعة التحقق داخل:
    - Pages.
    - Server Actions.
    - APIs.
    - Jobs.
12. اختبار:
    - Unauthenticated.
    - Unauthorized.
    - Cross-role.
    - Cross-tenant.
13. Audit trail للإجراءات الحساسة.
### المخرجات
- Authentication Contract.
- Session Security Assessment.
- RBAC Matrix.
- Privileged Actions Registry.
- Authorization Test Matrix.
### معيار القبول
- لا تعتمد الحماية على إخفاء الزر.
- كل عملية حساسة محمية في الخادم.
- أدوار المنصة والمستأجر مفصولة.
---
## WBS-6 — سجل الصفحات والمسارات
### الهدف
إنتاج جرد مركزي لكل Route وربطه الفعلي.
### الحقول الإلزامية لكل صفحة
- Page ID.
- الاسم العربي والإنجليزي.
- Route.
- Sidebar visibility.
- Entry file.
- Layout.
- Child components.
- Actions.
- APIs.
- Prisma models.
- Roles/permissions.
- Tabs.
- Modals/Drawers.
- Loading.
- Empty.
- Error.
- RTL/LTR.
- Light/Dark.
- Responsive evidence.
- Tests.
- Runtime evidence.
- Visual evidence.
- Branch source.
- Functional status.
- Visual status.
- Security status.
- Overall status.
### الحالات الخاصة
- `CLOSED`
- `PARTIAL`
- `HIDDEN`
- `SHELL ONLY`
- `NOT IMPLEMENTED`
- `NOT PROVEN`
### المخرجات
- Page Registry.
- Hidden Route Register.
- Duplicate Route Register.
- Navigation Consistency Report.
### معيار القبول
- لا توجد Route غير مصنفة.
- لا تعتمد الصفحة على اسم الملف فقط.
- التبويبات والنوافذ تعامل كوحدات ضمن عقد الصفحة.
---
## WBS-7 — سجل العقود الوظيفية
### الهدف
إثبات الدورة التشغيلية لكل نطاق وربط الصفحات والبيانات.
### النطاقات
1. Dashboard.
2. Leads.
3. Properties.
4. Projects.
5. Tours.
6. Offers.
7. Sales contracts.
8. Rental.
9. Payment plans.
10. Installments.
11. Invoices.
12. Payments.
13. Reconciliation.
14. Tasks.
15. Documents.
16. Email.
17. WhatsApp.
18. Campaigns/Advertising.
19. Support.
20. Notifications.
21. Settings.
22. Agents.
23. Financing calculator.
24. Reporting/Revenue integrity.
### الحقول لكل عقد
- Contract ID.
- Trigger.
- Actor.
- Preconditions.
- Input.
- Validation.
- Authorization.
- Tenant rule.
- State transition.
- Side effects.
- Events.
- Audit event.
- Success result.
- Error states.
- Retry/idempotency.
- Downstream links.
- Tests.
- Status.
### المخرجات
- Functional Contract Registry.
- State Machine Maps.
- Broken Flow Register.
- Mock/Placeholder Register.
- Missing Relationship Register.
### معيار القبول
- كل عملية أساسية لها بداية ونهاية.
- الانتقالات مسموحة ومقيدة.
- الواجهة والـAPI ونموذج البيانات متسقة.
---
## WBS-8 — النظام البصري وتجربة الاستخدام
### الهدف
تحديد مصدر الحقيقة البصري وإثبات التزام الصفحات به.
### الأعمال
1. جمع وثائق التصميم والعقود.
2. تحديد Tokens.
3. تحديد الأنماط:
   - Title Card.
   - KPIs.
   - Lists/Tables.
   - Master/Detail.
   - Cards.
   - Buttons.
   - Inputs.
   - Forms.
   - Modals/Drawers.
   - Hover.
   - Selected.
   - Empty/Error/Loading.
4. فحص RTL/LTR.
5. فحص Light/Dark.
6. فحص Responsive.
7. فحص Accessibility.
8. فحص التمرير والارتفاعات والكثافة.
9. رصد المكونات المكررة.
10. ربط الحكم بصورة أو Preview.
11. تطبيق بروتوكول:
    - الهيكل والتخطيط.
    - التفاصيل الدقيقة.
### قاعدة إلزامية
أي صفحة لا تملك صورة أو Preview كافيًا تحصل على:
```text
VISUAL_STATUS: NOT PROVEN
```
### المخرجات
- Visual System Assessment.
- Design Source of Truth.
- Visual Proof Registry.
- Component Duplication Register.
- Visual Debt Backlog.
### معيار القبول
- لا إعلان CLOSED من قراءة Classes فقط.
- كل حالة أساسية لها دليل.
- لا تُغلق التبويبات غير المفحوصة تبعًا للصفحة الرئيسية.
---
## WBS-9 — التكاملات والملفات والمهام الخلفية
### الهدف
إثبات صحة الحدود الخارجية والتعامل مع الفشل.
### المجالات
- Email.
- WhatsApp.
- Payment gateways.
- Advertising providers.
- Storage.
- Document generation.
- Webhooks.
- Cron.
- Notifications.
- AI providers/agents.
### الأعمال
1. Provider abstraction.
2. Credential ownership.
3. Tenant scoping.
4. Sandbox/Production state.
5. Webhook signature.
6. Replay protection.
7. Idempotency.
8. Retry/backoff.
9. Dead-letter or failure queue.
10. Timeouts.
11. Logging/redaction.
12. Secret rotation.
13. File allowlist.
14. MIME/size validation.
15. Signed URLs.
16. Retention/deletion.
17. Malware scanning status.
### المخرجات
- Integration Registry.
- Provider Readiness Matrix.
- Webhook Security Matrix.
- Scheduled Job Registry.
- File Security Assessment.
- External Dependency Risk Register.
### معيار القبول
- فشل المزود لا يفسد البيانات.
- لا تعرض الأسرار في السجلات.
- كل callback قابل للتحقق والتكرار الآمن.
---
## WBS-10 — الجودة والاختبارات
### الهدف
تحويل الاختبارات من كمية ملفات إلى بوابة ثقة.
### الأعمال
1. مراجعة TypeScript strictness.
2. Lint/Formatting.
3. تصنيف الاختبارات:
   - Unit.
   - Domain.
   - Integration.
   - API/Action.
   - Tenant.
   - RBAC.
   - E2E.
   - Visual.
   - Accessibility.
   - Security.
   - Smoke.
4. رصد الاختبارات القديمة.
5. رصد اختبارات Classes والنصوص.
6. رصد الاختبارات التي لا تشغل الكود الحقيقي.
7. خريطة تغطية بالنطاق.
8. Failure-path tests.
9. Flakiness.
10. Test data strategy.
11. ترتيب التشغيل المستهدف.
12. تصميم Release Test Suite.
### سياسة التشغيل
- الجولة الأولى: قراءة الإعدادات والنتائج فقط.
- الجولة الثانية: اختبارات مستهدفة بعد اعتمادها.
- Build الشامل: بوابة لاحقة، وليس خطوة افتتاحية.
### المخرجات
- Test Inventory.
- Coverage by Domain.
- Fragile/Obsolete Test Register.
- Missing Test Matrix.
- Proposed Release Gate Suite.
### معيار القبول
- كل نطاق حرج لديه اختبارات سلوك وفشل.
- Tenant/RBAC لا يُثبتان باختبارات نصية فقط.
- الاختبارات المختارة قابلة للتكرار.
---
## WBS-11 — الأمن
### الهدف
تحديد المخاطر الأمنية الفعلية وربطها بدورة التطوير.
### المحاور
1. Secrets exposure.
2. Environment files.
3. Authentication.
4. Session/cookies.
5. Authorization.
6. Tenant isolation.
7. Input validation.
8. Output encoding.
9. CSRF.
10. XSS.
11. SSRF.
12. SQL/ORM misuse.
13. File uploads.
14. Webhook signatures.
15. Rate limiting.
16. Security headers.
17. Dependency risks.
18. Audit logs.
19. Admin actions.
20. Sensitive data.
21. Error leakage.
22. Supply chain/CI.
23. AI agent boundaries.
### المخرجات
- Threat Model.
- Attack Surface Map.
- ASVS-oriented Control Matrix.
- Security Findings Register.
- Security Remediation Priorities.
### معيار القبول
- لا تُعرض قيمة سرية.
- كل finding يحمل دليلًا ومسار استغلال وتأثيرًا.
- لا تُضخم الشدة دون مسار واقعي.
- Critical/High findings تمنع الإطلاق حتى المعالجة أو قبول خطر رسمي.
---
## WBS-12 — التشغيل والمراقبة والاستمرارية
### الهدف
إثبات أن النظام يمكن تشغيله ومراقبته واستعادته.
### الأعمال
1. Environment matrix.
2. Preview/Production separation.
3. Health checks.
4. Structured logs.
5. Request/Correlation IDs.
6. Error tracking.
7. Alerts.
8. Cron monitoring.
9. Webhook monitoring.
10. SLO/SLI proposals.
11. Backup policy.
12. Restore test.
13. RPO/RTO.
14. Rollback strategy.
15. Migration rollback/forward-fix.
16. Incident response.
17. Runbooks.
18. Ownership/escalation.
### المخرجات
- Operations Readiness Matrix.
- Environment Matrix.
- Monitoring and Alerting Plan.
- Backup/Restore Assessment.
- Rollback Playbook.
- Incident Response Plan.
- Runbook Index.
### معيار القبول
- وجود Backup لا يكفي دون Restore evidence.
- كل خدمة حرجة لها إشارة صحة وتنبيه.
- مسار التراجع لا يعتمد على الذاكرة الشخصية.
---
## WBS-13 — التوثيق والمعرفة
### الهدف
تحديد الوثائق الصحيحة وإلغاء التناقض الزمني.
### الأعمال
1. جرد الوثائق.
2. تصنيف:
   - Current.
   - Superseded.
   - Historical.
   - Draft.
   - Conflicting.
3. إنشاء Documentation Map.
4. ربط الوثائق بالكود.
5. توحيد المصطلحات.
6. تحديد مالك كل وثيقة.
7. تحديد دورة مراجعتها.
8. فصل تقارير الأدلة عن العقود الملزمة.
### المخرجات
- Documentation Registry.
- Superseded Document Register.
- Terminology Glossary.
- Documentation Governance.
### معيار القبول
- لكل موضوع وثيقة مرجعية واحدة.
- الوثائق القديمة لا تظهر كحقيقة حالية دون وسم.
---
## WBS-14 — المخاطر والاعتماديات والتغيير
### الهدف
تحويل الفجوات إلى سجل مخاطر قابل للإدارة.
### حقول سجل المخاطر
- Risk ID.
- العنوان.
- الوصف.
- السبب.
- النتيجة.
- النطاق المتأثر.
- الاحتمال.
- الأثر.
- الدرجة.
- المالك.
- Trigger.
- Response strategy.
- Mitigation.
- Contingency.
- Due phase.
- Residual risk.
- Acceptance authority.
- Evidence/status.
### مصفوفة الاحتمال والأثر
| الاحتمال \ الأثر | 1 محدود | 2 منخفض | 3 متوسط | 4 مرتفع | 5 حرج |
|---|---:|---:|---:|---:|---:|
| 1 نادر | 1 | 2 | 3 | 4 | 5 |
| 2 غير محتمل | 2 | 4 | 6 | 8 | 10 |
| 3 ممكن | 3 | 6 | 9 | 12 | 15 |
| 4 مرجح | 4 | 8 | 12 | 16 | 20 |
| 5 شبه مؤكد | 5 | 10 | 15 | 20 | 25 |
### التفسير
- 1–4: Low.
- 5–9: Medium.
- 10–15: High.
- 16–25: Critical.
### المخرجات
- Risk Register.
- Dependency Register.
- Assumption Log.
- Issue Log.
- Change Log.
### معيار القبول
- كل خطر High/Critical له مالك واستجابة.
- لا تُستخدم كلمة “مقبول” دون جهة قبول.
- الاعتماديات تربط بخطة المعالجة.
---
## WBS-15 — بوابة الإطلاق
### الهدف
تحديد قرار Go/No-Go مبني على الأدلة.
### محاور البوابة
1. Scope.
2. Functional.
3. Data.
4. Tenant.
5. RBAC.
6. Security.
7. Quality.
8. Visual.
9. Integrations.
10. Operations.
11. Backup/Restore.
12. Rollback.
13. Legal/business boundaries.
14. Documentation.
15. Branch/release integrity.
### حالات القرار
- **GO**
- **CONDITIONAL GO**
- **NO-GO**
- **NOT PROVEN**
### شروط NO-GO التلقائية
- Cross-Tenant vulnerability.
- فقد أو فساد بيانات غير محكوم.
- صلاحيات حساسة قابلة للتجاوز.
- أسرار إنتاج مكشوفة وغير مدوّرة.
- دفع أو Webhook غير قابل للتحقق.
- غياب Restore/Recovery لمكون حرج.
- فشل Build/CI على فرع الإصدار.
- تدفق تعاقد/دفع أساسي منقطع.
- تعارض فروع غير محلول يؤثر على إصدار الإنتاج.
### المخرجات
- Launch Readiness Scorecard.
- Go/No-Go Decision.
- Blocking Remediation List.
- Deferred Risk Acceptance List.
---
# 10. سجل الصفحات — القالب النهائي
| الحقل | الوصف |
|---|---|
| PAGE-ID | معرف ثابت |
| Domain | النطاق |
| Name AR/EN | الاسم |
| Route | المسار |
| Sidebar | ظاهر/مخفي/شرطي |
| Entry file | ملف الصفحة |
| Branch source | الفرع |
| Components | المكونات |
| Actions/APIs | الربط |
| Models | البيانات |
| Permissions | الأدوار |
| Tabs | التبويبات |
| Modals/Drawers | النوافذ |
| Loading | مثبت/ناقص |
| Empty | مثبت/ناقص |
| Error | مثبت/ناقص |
| RTL/LTR | الحالة |
| Light/Dark | الحالة |
| Responsive | الحالة |
| Functional status | الحالة |
| Visual status | الحالة |
| Security status | الحالة |
| Tests | الأدلة |
| Overall | CLOSED/PARTIAL/... |
| Evidence | الروابط/الملفات |
| Blockers | الموانع |
---
# 11. سجل العقود الوظيفية — القالب النهائي
| الحقل | الوصف |
|---|---|
| FC-ID | معرف العقد |
| Domain | النطاق |
| Use case | العملية |
| Actor | المنفذ |
| Preconditions | الشروط |
| Input | المدخلات |
| Validation | التحقق |
| Authorization | الصلاحية |
| Tenant rule | العزل |
| State before | الحالة السابقة |
| State after | الحالة اللاحقة |
| Side effects | الآثار |
| Audit | السجل |
| Idempotency | منع التكرار |
| Success | النجاح |
| Failures | الفشل |
| UI entry | الصفحة |
| API/Action | التنفيذ |
| Models | البيانات |
| Tests | الاختبارات |
| Status | التصنيف |
---
# 12. الحوكمة والمسؤوليات RACI
| النشاط | المستخدم/المالك | المراجع المركزي | الوكيل البرمجي | GitHub/CI | مزود خارجي |
|---|---|---|---|---|---|
| اعتماد النطاق | A | R/C | I | I | I |
| استخراج الأدلة | I | R | C | C | I |
| الحكم النهائي | A | R | C | I | I |
| تعديل الكود | A | C | R | C | I |
| Merge/Push/Deploy | A | C | R بعد الإذن | R تقنيًا | I |
| قبول المخاطر | A | C | I | I | C |
| Go/No-Go | A | R | C | C | C |
**R:** Responsible
**A:** Accountable
**C:** Consulted
**I:** Informed
لا ينفذ أي وكيل تعديلًا أو Merge أو Deploy دون تفويض صريح.
---
# 13. بوابات المرحلة
## Gate G0 — اعتماد الخطة
**المطلوب:** اعتماد هذه الوثيقة.
## Gate G1 — صلاحية الأدلة
- الحزمة قابلة للقراءة.
- الفروع متاحة.
- لا توجد بيانات حساسة مكشوفة في الحزمة.
## Gate G2 — تثبيت خريطة المستودع
- تحديد الفرع الأساسي المرشح.
- اكتمال خريطة الفروع والتعارضات.
## Gate G3 — تثبيت المعمارية والبيانات وتحليل انتقال الشركة الواحدة
- Architecture map.
- ERD.
- Tenant/RBAC baseline.
## Gate G4 — تثبيت الصفحات والعقود
- Page Registry.
- Functional Contract Registry.
## Gate G5 — الأمن والجودة
- Threat model.
- Test assessment.
- Security blockers.
## Gate G6 — التشغيل والاستمرارية
- Environments.
- Monitoring.
- Backup/Restore.
- Rollback.
## Gate G7 — خطة المعالجة
- ترتيب الأولويات.
- المالك.
- الاعتماديات.
- معايير القبول.
## Gate G8 — Go/No-Go
- لا يبدأ إلا بعد معالجة أو قبول الموانع.
لا يمكن تجاوز Gate دون توثيق سبب رسمي.
---
# 14. ترتيب التنفيذ المقترح
## المرحلة 0 — اعتماد الخطة
**العمل:** مراجعة هذه الوثيقة فقط.
**المخرج:** موافقة أو تعديلات.
## المرحلة 1 — Intake Validation
**العمل:** التحقق من سلامة الأدلة والفروع.
**لا Build ولا اختبارات شاملة.**
## المرحلة 2 — Repository and Branch Baseline
**العمل:** المقارنات والتعارضات وترتيب الدمج.
## المرحلة 3 — Architecture, Data, Legacy Tenant Impact, Internal RBAC
**العمل:** الأساس الهندسي والأمني قبل الصفحات.
## المرحلة 4 — Page and Functional Registries
**العمل:** الجرد الفعلي وربط كل Route بعقدها.
## المرحلة 5 — Visual System
**العمل:** مراجعة الوثائق والأدلة البصرية؛ ما دون صورة = NOT PROVEN.
## المرحلة 6 — Quality, Security, Integrations
**العمل:** تحليل الاختبارات والثغرات والتكاملات.
## المرحلة 7 — Operations and Recovery
**العمل:** البيئة والمراقبة والنسخ والاستعادة والتراجع.
## المرحلة 8 — Remediation Roadmap
**العمل:** تحويل النتائج إلى مسار تأسيس وإصلاح مرتب.
## المرحلة 9 — Release Assessment
**العمل:** إصدار Go/No-Go.
---
# 15. ترتيب الأولويات
## Priority P0 — منع الضرر
- Tenant isolation.
- Authorization.
- Secrets.
- Data corruption/loss.
- Payments/Webhooks.
- Production rollback.
- Backup/restore.
## Priority P1 — العمود الفقري التشغيلي
- Lead → Property → Tour → Offer.
- Offer → Contract → Payment.
- Rental flows.
- Documents.
- Audit trail.
## Priority P2 — الاستقرار والجودة
- CI.
- Tests.
- Error handling.
- Monitoring.
- Integrations.
- Branch convergence.
## Priority P3 — الإغلاق البصري
- Design source of truth.
- Pages/tabs/modals.
- RTL/LTR.
- Light/Dark.
- Responsive.
- Accessibility.
## Priority P4 — التحسين والتوسع
- Optimization.
- Advanced reporting.
- External provider expansion.
- Non-launch enhancements.
---
# 16. منهج إعداد خطة المعالجة
كل فجوة ستتحول إلى Remediation Item يحتوي:
- ID.
- المشكلة.
- التصنيف.
- الدليل.
- الخطر.
- الأولوية.
- النطاق.
- الملفات المتوقعة.
- الاعتماديات.
- الإجراء.
- معيار القبول.
- الاختبارات المطلوبة.
- هل يحتاج Migration؟
- هل يحتاج Preview؟
- هل يحتاج موافقة قانونية/تجارية؟
- هل يمنع الإطلاق؟
- ترتيب التنفيذ.
## قاعدة التجميع
لا تُعالج الصفحة منفردة عندما يكون السبب مشتركًا، مثل:
- Button system.
- Modal portal.
- Scroll behavior.
- Tenant helper.
- Error envelope.
- Date/time formatting.
- Permission guard.
تُعالج المشكلة في الطبقة الصحيحة ثم تُتحقق الصفحات المتأثرة.
---
# 17. خطة ضبط التغيير
أي تغيير بعد اعتماد Baseline يمر بالآتي:
1. Change Request ID.
2. سبب التغيير.
3. النطاق المتأثر.
4. الملفات/البيانات.
5. المخاطر.
6. أثر الجدول والإطلاق.
7. الاختبارات.
8. موافقة المستخدم.
9. التنفيذ.
10. إعادة التحقق.
11. تحديث Baseline.
لا تُعدّل حالة `VERIFIED` إلى أخرى أو العكس دون تسجيل الدليل والسبب.
---
# 18. ضمان جودة المراجعة
## 18.1 مراجعة مزدوجة
كل حكم حرج يمر عبر:
1. فحص أولي.
2. تحقق مستقل أو دليل ثانٍ.
## 18.2 منع التحيز للتقارير السابقة
التقارير السابقة تستخدم لتحديد مواقع الفحص، وليس لتكرار أحكامها.
## 18.3 منع الحكم من أسماء الملفات
وجود `tenant-isolation.test.ts` لا يثبت اكتمال العزل.
وجود `visual-contract` لا يثبت التطابق البصري.
وجود `backup` لا يثبت الاستعادة.
## 18.4 قابلية إعادة التحقق
كل نتيجة يجب أن تشير إلى:
- Branch/SHA.
- File/path.
- Test/workflow.
- Runtime route.
- Screenshot/reference.
- Timestamp عند الحاجة.
---
# 19. المخاطر الأولية لخطة المراجعة
| ID | الخطر | الاحتمال | الأثر | الدرجة | الاستجابة |
|---|---|---:|---:|---:|---|
| R-001 | تقارير قديمة تعلن إغلاقًا غير موجود في الفرع الأساسي | 4 | 4 | 16 Critical | مقارنة الكود وRuntime |
| R-002 | تعديل الملف نفسه في عدة فروع | 5 | 4 | 20 Critical | Conflict Register قبل الدمج |
| R-003 | اعتبار الاختبارات النصية دليل تشغيل | 4 | 4 | 16 Critical | تصنيف الاختبارات حسب السلوك |
| R-004 | وجود تغييرات محلية غير مرفوعة | 3 | 4 | 12 High | جرد Snapshot ومنع فقدها |
| R-005 | أسرار في تاريخ Git لا تظهر في الحالة الحالية | 3 | 5 | 15 High | Secret-history scan لاحقًا بإذن |
| R-006 | عزل Tenant مطبق جزئيًا | 3 | 5 | 15 High | Inventory + negative tests |
| R-007 | صفحة مغلقة رئيسيًا وتبويباتها غير مفحوصة | 5 | 3 | 15 High | Page contract لكل تبويب |
| R-008 | Backup موجود دون Restore قابل للتنفيذ | 4 | 5 | 20 Critical | Restore evidence gate |
| R-009 | Provider غير مفعّل يُفهم كعطل في المنصة | 4 | 3 | 12 High | فصل foundation عن activation |
| R-010 | توسيع المراجعة إلى تعديلات قبل تثبيت الأساس | 4 | 4 | 16 Critical | PLAN/READ-ONLY gates |
| R-011 | تضارب المقصود التجاري مع الكود | 3 | 4 | 12 High | Intended/Implemented/Runtime split |
| R-012 | ضياع الوقت في Build شامل مبكر | 4 | 2 | 8 Medium | تحليل ثم targeted execution |
---
# 20. المخرجات النهائية بعد تنفيذ الخطة
## المخرج الرئيسي
```text
ORCA_CENTRAL_BASELINE_REPORT.md
```
## محتويات المخرج الرئيسي
1. Executive Summary.
2. Project Charter.
3. Repository and Branch Map.
4. Architecture Assessment.
5. Data and Tenant Model.
6. Authentication and Authorization.
7. Page Registry.
8. Functional Contract Registry.
9. Visual System Assessment.
10. Integrations and Background Operations.
11. Testing and Quality Assessment.
12. Security Assessment.
13. Operations and Recovery.
14. Documentation Assessment.
15. Conflicts and Duplication.
16. Missing Foundations.
17. Risk Register.
18. Dependency Register.
19. Prioritized Remediation Plan.
20. Recommended Branch Merge Order.
21. Release Gates.
22. Go/No-Go Assessment.
## ملاحق اختيارية
لا تُنشأ إلا إذا كان الحجم يمنع سهولة الاستخدام:
- `ORCA_PAGE_REGISTRY.csv`
- `ORCA_RISK_REGISTER.csv`
- `ORCA_BRANCH_CONFLICT_MATRIX.csv`
- `ORCA_TEST_COVERAGE_MATRIX.csv`
يبقى ملف Markdown الرئيسي هو المرجع الرسمي.
---
# 21. معايير اكتمال خط الأساس
يعتبر Central Baseline مكتملًا فقط عندما:
- جميع الفروع المطلوبة مصنفة.
- جميع Routes مصنفة.
- جميع النطاقات التشغيلية لها عقود.
- نموذج البيانات وعزل Tenant موثقان.
- RBAC Matrix موجودة.
- كل حكم بصري يحمل دليلًا أو NOT PROVEN.
- كل خطر High/Critical له استجابة.
- كل فجوة مرتبطة بإجراء ومعيار قبول.
- يوجد ترتيب دمج آمن.
- يوجد ترتيب معالجة.
- توجد بوابة إطلاق قابلة للقياس.
- جرى اعتماد التقرير من المستخدم.
---
# 22. ما لن تعتبره الخطة إنجازًا
لن تعتبر الخطة الأمور التالية كافية:
- نجاح TypeScript وحده.
- نجاح Build وحده.
- عدد اختبارات مرتفع دون جودة.
- صفحة جميلة دون تشغيل.
- API موجود دون مستهلك فعلي.
- زر مخفي بدل صلاحية خادم.
- `tenantId` موجود في Model دون تقييد query.
- Backup job دون Restore test.
- Workflow موجود دون Required Check.
- تقرير “CLOSED” دون أدلة.
- أحدث تاريخ ملف باعتباره أفضل نسخة تلقائيًا.
---
# 23. القيود التنفيذية الملزمة بعد الاعتماد
1. قراءة فقط في أول جولة.
2. لا Build شامل في أول جولة.
3. لا تعديل أو تنظيف.
4. لا Commit أو Push.
5. لا PR أو Merge.
6. لا Deploy.
7. لا Migration.
8. لا تغيير بيانات.
9. لا كشف أسرار.
10. لا حذف فروع.
11. لا اعتماد بصري دون صور.
12. المخرجات الطويلة داخل التقرير.
13. أي افتراض = `NOT PROVEN`.
14. كل خطوة تنفيذية لاحقة تحتاج أمرًا واضحًا.
15. لا تتوسع المراجعة إلى إصلاحات أثناء مرحلة Baseline.
---
# 24. قرار الاعتماد المطلوب
يرجى اعتماد أو تعديل البنود التالية:
| القرار | الخيار المقترح |
|---|---|
| اسم الخطة | ORCA CENTRAL BASELINE PLAN |
| المخرج النهائي | تقرير مركزي واحد |
| الجولة الأولى | قراءة فقط |
| Build شامل أولًا | ممنوع |
| الفروع المشمولة | الفروع السبعة المذكورة |
| الصور للحكم البصري | إلزامية |
| التصنيفات | VERIFIED/PARTIAL/MISSING/CONFLICTING/NOT PROVEN/OUT OF SCOPE |
| ترتيب المراجعة | فروع → معمارية/بيانات/أمان → صفحات/عقود → بصري → تشغيل → إطلاق |
| بدء التنفيذ | بعد موافقة صريحة فقط |
---
# 25. المرحلة التالية بعد الاعتماد
```text
NEXT PHASE:
G1 — Evidence Validation and Repository/Branch Baseline
```
وتشمل فقط:
1. التحقق من اكتمال الأدلة.
2. تثبيت SHA والفروع.
3. استخراج خريطة الفروقات.
4. تحديد الملفات المتداخلة.
5. اقتراح الفرع الأساسي.
6. إصدار ملخص قصير دون دمج أو تعديل.
---
# 26. المراجع الرسمية
- Project Management Institute — Practice Standard for Work Breakdown Structures
  https://www.pmi.org/standards/work-breakdown-structures-third-edition
- Project Management Institute — Governance of Portfolios, Programs, and Projects
  https://www.pmi.org/standards/governance
- Project Management Institute — Risk Management in Portfolios, Programs, and Projects
  https://www.pmi.org/standards/risk-management
- NIST SP 800-218 — Secure Software Development Framework
  https://csrc.nist.gov/pubs/sp/800/218/final
- NIST Cybersecurity Framework 2.0
  https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
- OWASP Application Security Verification Standard
  https://owasp.org/www-project-application-security-verification-standard/
- GitHub Docs — Protected Branches and Required Status Checks
  https://docs.github.com/en/rest/branches/branch-protection
---
# 27. سجل الإصدارات
| الإصدار | التاريخ | الوصف | الحالة |
|---|---|---|---|
| 1.0 | 2026-07-18 | الخطة الكاملة قبل بدء المراجعة | PENDING APPROVAL |
---
# 28. توقيع الاعتماد
```text
PLAN_STATUS: PENDING APPROVAL
APPROVED_BY:
DATE:
APPROVAL_NOTES:
AUTHORIZED_NEXT_PHASE:
G1 — Evidence Validation and Repository/Branch Baseline
```
---
# 29. ملحق التنفيذ الإلزامي — Single-Company Transition Workstream
## 29.1 المخرجات المطلوبة قبل أي تعديل معماري
- `ORCA_PROJECT_CHARTER.md`
- `ORCA_SCOPE_STATEMENT.md`
- `ORCA_ARCHITECTURE_BASELINE.md`
- `ORCA_TENANT_ISOLATION_CONTRACT.md`
- `ORCA_RBAC_MATRIX.md`
- `ORCA_RISK_REGISTER.md`
- `ORCA_FUNCTIONAL_CONTRACT_REGISTRY.md`
- `ORCA_CONFLICT_REGISTER.md`
## 29.2 بوابة التحويل
لا يبدأ تحويل فعلي قبل اكتمال واعتماد:
1. Impact Assessment على قاعدة البيانات وServer Actions وAPIs وWebhooks وCron والملفات والعقود والمدفوعات.
2. Data Migration Plan يثبت عدد سجلات `Tenant` وعلاقاتها وحجم البيانات والمفاتيح الأجنبية.
3. Backward Compatibility Plan يحافظ على المسارات الحالية خلال فترة الانتقال.
4. Rollback أو Forward-Fix Plan قابل للتطبيق.
5. اختبارات عدم فقد البيانات والمبالغ والمستندات وسجل التدقيق.
6. فصل واضح بين مدفوعات العملاء العقارية وبين مدفوعات الاشتراك القديمة.
7. نموذج RBAC تنظيمي داخلي مع نطاقات الإدارة والفرع والفريق.
8. سجل تعارضات مكتمل ومُصنف.
## 29.3 قاعدة التفسير
كل ذكر لـ`Tenant` في الكود الحالي يفسر مؤقتًا كـ`Legacy Company Scope`، وليس كإثبات أن نموذج SaaS متعدد الشركات ما زال معتمدًا.