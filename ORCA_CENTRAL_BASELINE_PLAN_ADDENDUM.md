# ORCA CENTRAL BASELINE PLAN — EXECUTION ADDENDUM

## ملحق إكمال خريطة تنفيذ خطة الأساس

- **Document ID:** ORCA-CBP-001-A1
- **Version:** 3.0 — Complete Foundation Execution Map
- **Parent:** `ORCA_CENTRAL_BASELINE_PLAN.md`
- **Authority:** approved execution addendum for the missing WBS/Gate definitions
- **Start baseline:** `55bc7e09816186e4b96e27e35eee0958699eb8c9`
- **Operating model:** `VERIFIED — SINGLE INDEPENDENT COMPANY`
- **Production action authorized:** no

## 1. سبب الملحق

الخطة الأصلية عرّفت نطاقًا من 25 مجالًا، لكنها وثقت WBS-0 وWBS-1 وWBS-2 فقط ولم تثبت تعريفًا تنفيذيًا رسميًا لحزم G3 إلى G8 أو شروط الانتقال بينها.

هذا الملحق لا يلغي القرارات التجارية والأمنية الحاكمة في الخطة الأصلية. وهو يكمل فقط خريطة التنفيذ، المخرجات، شروط القبول، وملكية البنود المؤجلة.

عند التعارض:

1. قرارات الشركة الواحدة وملكية التكاملات في الخطة الأصلية تبقى الأعلى.
2. هذا الملحق هو السلطة التنفيذية لتعريف G0–G8 وشروط الانتقال.
3. تقارير الإغلاق الحالية هي دليل التنفيذ لكل مرحلة.
4. التقارير المؤرشفة تبقى Historical Evidence فقط.

## 2. خريطة المراحل الرسمية

```text
G0 — Governance & Operating Model
  ↓
G1 — Evidence Integrity
  ↓
G2 — Repository & Branch Reconciliation
  ↓
G3 — Architecture, Organization, RBAC & Data Safety
  ↓
G4 — Page & Operational Contracts
  ↓
G5 — Security & Quality
  ↓
G6 — Operations, Recovery & Reliability
  ↓
G7 — Remediation Reconciliation & Closure
  ↓
G8 — Final Foundation Gate
```

يمنع القفز من G6 إلى G8. يجب إغلاق G7 أولًا بسجل مصالحة مركزي قابل للتحقق.

## 3. G0 — Governance & Operating Model

### الهدف

تثبيت نموذج المنتج، حدود المسؤولية، وملكية التكاملات.

### المخرجات

- نموذج الشركة المستقلة الواحدة.
- SaaS متعدد الشركات خارج النطاق الحالي.
- `tenantId` كنطاق أمني مؤقت للشركة الواحدة.
- سياسة ملكية الشركة لحسابات وتراخيص ومفاتيح المزودين.
- منع بيانات اعتماد المطور في Production.

### معيار القبول

- لا يوجد وصف تجاري متعارض غير مسجل.
- كل أثر خارجي خلف موافقة وبيئة وبيانات اعتماد الشركة.

## 4. G1 — Evidence Integrity

### الهدف

تثبيت سلامة الأدلة وترتيب سلطتها.

### المخرجات

- بصمات حزمة الأدلة.
- ترتيب مصادر الحقيقة.
- فصل GitHub الحالي عن الملفات المحلية أو التقارير التاريخية.

### معيار القبول

- كل حكم نهائي مرتبط بدليل قابل لإعادة التحقق.
- لا تتحول إشارة تاريخية إلى PASS دون دليل حالي.

## 5. G2 — Repository & Branch Reconciliation

### الهدف

تحديد الفرع المركزي، نطاق كل فرع، التعارضات، وترتيب الدمج.

### المخرجات

- خريطة الفروع والأنساب.
- سجل الملفات المتداخلة والتعارضات.
- قائمة الاستبعادات.
- سياسة ملكية الفروع.
- فرع دمج مركزي محمي.

### معيار القبول

- لا Merge صامت لتعارض دلالي أو بصري أو وظيفي.
- لا Force update أو تجاوز للبوابات.
- `main` لا يتغير إلا ضمن مرحلة إطلاق مستقلة.

## 6. G3 — Architecture, Organization, RBAC & Data Safety

### الهدف

تأسيس معمارية الشركة الواحدة، التنظيم الداخلي، الصلاحيات، وانتقال البيانات الآمن.

### المخرجات

- عقد معماري للشركة الواحدة.
- سجل صلاحيات Typed.
- OrgUnit وOrgAssignment وRoleAssignment.
- AccessContext وDefault-Deny Authorization.
- Audit mode وProgressive Dual-Allow Enforcement.
- تعطيل Legacy SaaS دون حذف البيانات التاريخية.
- Migration وBackfill وConstraints/Indexes وخطط Rollback خلف بوابات مستقلة.

### معيار القبول

- Repository: جميع عقود G3 قابلة للتنفيذ و`PASS / CLOSED`.
- Production: تبقى Migration وBackfill وEnforcement منفصلة حتى موافقة وتدريب واستعادة واختبارات ممثلة.

## 7. G4 — Page & Operational Contracts

### الهدف

إنشاء سجل مركزي لكل الصفحات والمسارات والعقود التشغيلية والأدلة البصرية.

### المخرجات

- سجل الصفحات وAPIs وServer Actions والتبويبات والنوافذ والحالات.
- ربط Prisma والصلاحيات والاختبارات.
- حالات بصرية صريحة تمنع الإغلاق الوهمي.

### معيار القبول

- كل Contract له معرف ومصدر ووصف وظيفي.
- `NOT_PROVEN` و`PARTIAL` تبقى ظاهرة ولا تتحول إلى PASS.
- الانحراف في العدد أو المصدر أو الصلاحية يفشل CI.

## 8. G5 — Security & Quality

### الهدف

تحويل الأمن والجودة إلى بوابات مستودع دائمة.

### المخرجات

- Production dependency audit.
- TypeScript typecheck.
- CodeQL.
- تصنيف API boundaries.
- تصنيف فجوات الاختبارات المباشرة.
- اختبارات Foundation وRegression وAcceptance وBuild.

### معيار القبول

- لا Critical أو High حالي غير مراجع.
- لا API بلا تصنيف أمني.
- لا Focused/Skipped/TODO tests في الشجرة المقبولة.
- كل فجوة دليل لها أولوية ومالك لاحق.

## 9. G6 — Operations, Recovery & Reliability

### الهدف

إثبات عقود الصحة والوظائف المجدولة والنسخ والاستعادة والموثوقية.

### المخرجات

- Health contracts.
- Cron inventory/auth/test evidence.
- Backup plan-only by default.
- Restore refusal for Production.
- Isolated PostgreSQL recovery drill.
- Runbook وتشغيل قابل للتدقيق.

### معيار القبول

- جميع Crons المجدولة مصنفة READY.
- جميع Health contracts موجودة.
- Restore drill معزول وناجح.
- Production recovery objectives تبقى UNVERIFIED حتى تدريب ممثل مصرح به.

## 10. G7 — Remediation Reconciliation & Closure

### الهدف

جمع جميع نتائج G0–G6 في سجل معالجة مركزي، ومنع ضياع أي P0/P1 أو تعارض أو فجوة أو شرط Production قبل G8.

### حالات المعالجة المسموحة فقط

- `CLOSED`
- `DEFERRED_WITH_APPROVAL`
- `OUT_OF_SCOPE`
- `ACCEPTED_RESIDUAL_RISK`
- `PRODUCTION_ACTIVATION_BLOCKER`

لا يسمح داخل سجل G7 النهائي بحالات عامة مثل `PARTIAL`, `MISSING`, `CONFLICTING`, أو `NOT_PROVEN` دون تحويلها إلى قرار معالجة صريح.

### الحقول الإلزامية لكل بند

- معرف ثابت.
- عنوان ووصف.
- الفئة والشدة.
- الحالة النهائية.
- المالك.
- الدليل الحالي.
- المرحلة أو البوابة المستهدفة.
- الاعتماديات.
- سبب القرار.

### المخرجات

- `ORCA_G7_REMEDIATION_POLICY.json`
- `docs/architecture/ORCA_G7_REMEDIATION_REGISTER.md`
- `scripts/g7-remediation-reconciliation.mjs`
- `tests/foundation/g7-remediation-reconciliation.test.ts`
- `docs/reports/foundation/ORCA_G7_DISCOVERY.md`
- `docs/reports/foundation/ORCA_G7_FINAL_CLOSURE.md`
- CI artifacts للسجل الكامل والاختبارات.

### معيار القبول

1. G3–G6 مغلقة ومثبتة.
2. لا P0/P1 مجهول أو بلا مالك.
3. كل فجوة بصرية أو اختبارية مرتبطة بحالة ومالك وهدف.
4. كل شرط Production مصنف `PRODUCTION_ACTIVATION_BLOCKER`.
5. كل تعارض تاريخي إما CLOSED أو OUT_OF_SCOPE أو مؤجل بموافقة.
6. لا بند غير مصنف أو دليل مفقود بصمت.
7. CI يعيد بناء سجل G7 ويرفض الانجراف.
8. وجود blockers خاصة بـProduction لا يمنع إغلاق G7؛ المطلوب أن تكون ظاهرة ومملوكة وتنتقل إلى G8.

## 11. G8 — Final Foundation Gate

### الهدف

إصدار القرار النهائي بعد إغلاق G7 فقط.

### القرارات الرسمية

- `NO_GO`: فشل مستودع أو أمن أو جودة أو مصالحة يمنع الانتقال.
- `CONDITIONAL_GO`: الأساس مغلق لكن شروط Production أو نطاق الإطلاق غير مكتملة.
- `GO`: جميع شروط المستودع والتفعيل مثبتة لنسخة Release واحدة، مع بقاء التنفيذ خلف موافقة مالك صريحة.

### المخرجات

- بوابة G8 قابلة للتنفيذ.
- تقرير مركزي نهائي محدث.
- سجل شروط Production Activation.
- قرار Go/Conditional-Go/No-Go مدعوم بالأدلة.

### معيار القبول

1. G7 `PASS / CLOSED`.
2. لا Repository blocker غير محلول.
3. كل Production blocker ظاهر ومملوك.
4. CI وCodeQL وPreview ناجحة على الرأس النهائي.
5. الفروع متصالحة دون Force.
6. `main` لا يتغير ضمن إغلاق خطة الأساس.
7. لا Production Deploy أو Migration أو Backfill أو Secret change يحدث ضمن G8 repository closure.

## 12. قواعد الانتقال

- كل مرحلة تُغلق بتقرير `PASS / CLOSED` مستقل.
- إغلاق المستودع لا يعني تفعيل Production.
- أي بند مؤجل يجب أن يحمل مالكًا وسببًا وشرط إعادة فتح.
- أي تغيير في حالات G7 أو شروط G8 يتطلب تحديث السجل والاختبارات وCI والتقرير المركزي.
- يمنع تحويل `NOT_CONFIGURED` لمزود خارجي إلى عطل ما دام السلوك يفشل بأمان ولا يدعي الاتصال.
- يمنع تمثيل اختبار CI اصطناعي كـProduction RTO/RPO أو Restore evidence ممثل.

## 13. سجل التغيير

هذا الملحق يعالج النقص البنيوي في الخطة الأصلية: غياب تعريف WBS/Gates من G3 إلى G8. لا يغير نموذج العمل ولا ينفذ أي أثر Production.
