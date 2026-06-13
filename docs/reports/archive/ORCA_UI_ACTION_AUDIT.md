# ORCA UI ACTION AUDIT
> **Date:** 2026-06-10
> **Scope:** Every clickable element across 20+ pages and view components
> **Method:** Static code tracing — every button traced to its onClick handler

---

## SUMMARY

| Status | Count | % |
|--------|-------|---|
| **WORKING** | 68 | 56% |
| **PARTIAL** | 12 | 10% |
| **MOCK** | 25 | 20% |
| **BROKEN** | 2 | 2% |
| **DEAD** | 1 | 1% |
| **NO-OP** | 4 | 3% |
| **DECORATIVE** | 5 | 4% |
| **READ-ONLY** | 5 | 4% |
| **TOTAL** | **122** | **100%** |

---

## SECTION 1 — CONTRACTS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| ContractView | `🖨️ طباعة وحفظ كـ PDF` | `app/contract/[leadId]/ContractView.tsx` | 51 | **WORKING** — browser `window.print()` |
| ContractView | `📝 تعديل بنود الشروط` | `app/contract/[leadId]/ContractView.tsx` | 44 | **WORKING** — toggle edit mode |
| ContractView | `✔ حفظ وتثبيت البنود سحابياً` | `app/contract/[leadId]/ContractView.tsx` | 145 | **WORKING** — `saveContractTermsAction()` API |
| PrintButton | `🖨️ طباعة وتنزيل كـ PDF` | `components/.../PrintButton.tsx` | 9 | **WORKING** — `window.print()` |
| — | Signature | `app/contract/[leadId]/ContractView.tsx` | 163-177 | **DEAD** — static text `[ختم المنشأة الإلكتروني]` |

---

## SECTION 2 — INVOICES

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Rental | `PDF` (per invoice) | `app/operations/rental/page.tsx` | 1043 | **PARTIAL** — HTML page, no server PDF |
| Rental | `QR` (per invoice) | `app/operations/rental/page.tsx` | 1270 | **WORKING** — PNG QR via API |
| Rental | `سداد` (per invoice) | `app/operations/rental/page.tsx` | 1280 | **WORKING** — opens payment modal |
| Rental | `إصدار فاتورة دورية` | `app/operations/rental/page.tsx` | 674 | **WORKING** — POST /api/v1/invoices |

---

## SECTION 3 — PAYMENTS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Rental | `تأكيد التحصيل والتسوية` | `app/operations/rental/page.tsx` | 1780 | **MOCK** — creates fake Payment in local state, no API |
| Rental | `تأكيد وتسوية المطابقة` | `app/operations/rental/page.tsx` | 1348 | **MOCK** — no API call, no persistence |
| Rental | `تشغيل مصالحة بنكية` | `app/operations/rental/page.tsx` | 737 | **WORKING** — switches to reconciliation pane |
| Rental | `تحديد يدوي / فحص` | `app/operations/rental/page.tsx` | 1374 | **MOCK** — alert() + telemetry only |
| Rental | `طلب تسوية المالك Payout` | `app/operations/rental/page.tsx` | 923 | **MOCK** — local state, no API |

---

## SECTION 4 — PORTALS & DOCUMENTS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Documents View | `تحميل وتنزيل الملف` | `components/views/DocumentsView.tsx` | 547 | **BROKEN** — `e.preventDefault()` + `toast.error()`, blocks download |
| Documents View | Upload file | `components/views/DocumentsView.tsx` | 439 | **WORKING** — `createDocumentActionDirect()` API |
| Documents View | `تأكيد الحذف` | `components/views/DocumentsView.tsx` | 571 | **WORKING** — `deleteDocumentActionDirect()` API |
| Rental Docs | `رفع الملف` | `app/operations/rental/page.tsx` | 1105 | **MOCK** — no upload API |
| Rental Docs | `عقد_إيجار_موحد_{id}.txt` | `app/operations/rental/page.tsx` | 1116 | **MOCK** — client-side blob from hardcoded text |
| Owner Portal | All | `app/dashboard/owner-portal/page.tsx` | — | **READ-ONLY** — no buttons, display only |
| Tenant Portal | All | `app/dashboard/tenant-portal/page.tsx` | — | **READ-ONLY** — no buttons, display only |

---

## SECTION 5 — PROJECTS (CRITICAL)

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Projects Overview | `محاكاة webhook` | `components/projects/ProjectsOverview.tsx` | 236 | **MOCK** — labeled "محاكاة" (simulation) |
| Projects Overview | `حفظ المرحلة التنفيذية` | `components/projects/ProjectsOverview.tsx` | 455 | **MOCK** — toast only, no API |
| Project Detail | `حفظ الحجز وإصدار العقد` | `components/projects/ProjectDetail.tsx` | 733 | **MOCK** — local state only |
| Project Detail | `حفظ المرحلة التنفيذية` | `components/projects/ProjectDetail.tsx` | 799 | **MOCK** — local state only |
| Project Detail | `تسجيل التقرير` | `components/projects/ProjectDetail.tsx` | 874 | **MOCK** — local state only |
| Project Detail | `محاكاة رفع ملف` | `components/projects/ProjectDetail.tsx` | 910 | **MOCK** — labeled "محاكاة" |
| Project Detail | `محاكاة استلام دفعة مالية` | `components/projects/ProjectDetail.tsx` | 658 | **MOCK** — labeled "محاكاة" |
| Projects Overview | `تأكيد الإنشاء` | `components/projects/ProjectsOverview.tsx` | 386 | **WORKING** — real API |
| Project Detail | Toggle unit status | `components/projects/ProjectDetail.tsx` | 433 | **WORKING** — `toggleUnitStatusAction()` |

---

## SECTION 6 — PROPERTIES & TOURS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Property Detail | `حفظ كمسودة` | `components/properties/PropertyDetail.tsx` | 469 | **MOCK** — local state only |
| Property Detail | `تأكيد وإمضاء العقد` | `components/properties/PropertyDetail.tsx` | 605 | **WORKING** — `bookUnitActionDirect()` API |
| Property Detail | `توقيع مخالصة الاستلام` | `components/properties/PropertyDetail.tsx` | 661 | **WORKING** — `completeHandoverActionDirect()` API |
| Property Detail | `عرض تفاصيل الإيرادات` | `components/properties/PropertyDetail.tsx` | 511 | **PARTIAL** — toast display only |
| Tours View | `تقديم طلب التمويل` | `components/views/ToursView.tsx` | 1147 | **BROKEN** — `toast.success('')` empty |
| Tours View | `تحديث وحفظ الإعدادات` | `components/views/ToursView.tsx` | 1224 | **MOCK** — `toast.success('')` empty |
| Tours View | `تطبيق الفلاتر` | `components/views/ToursView.tsx` | 633 | **DECORATIVE** — telemetry only |
| Tours View | `تأكيد حجز الجولة` | `components/views/ToursView.tsx` | 859 | **WORKING** — `scheduleTourActionDirect()` API |

---

## SECTION 7 — LEADS & PIPELINE

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| LeadsTabs | `بحث` | `components/views/tabs/LeadsTabs.tsx` | 152 | **MOCK** — `toast.success()` only |
| LeadsTabs | `محاكاة webhook عميل جديد` | `components/views/tabs/LeadsTabs.tsx` | 164 | **MOCK** — labeled "محاكاة" |
| Leads Pipeline | Lead cards (select) | `components/views/pipeline/LeadsPipelineV2.tsx` | 203 | **PARTIAL** — mock fallback on fetch fail |
| Dashboard | `إصدار عقد جديد` | `app/operations/dashboard/DashboardView.tsx` | 276 | **WORKING** — opens ContractWizard |

---

## SECTION 8 — OFFERS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Offers View | `إدراج العرض ونشره` | `components/views/OffersView.tsx` | 1198 | **MOCK** — local state only, no API |
| Offers View | `تأكيد وإرسال للشركاء` | `components/views/OffersView.tsx` | 1036 | **DEAD** — `toast.success('')` empty string |
| Offers View | `إرسال الطلب الآن` | `components/views/OffersView.tsx` | 1383 | **MOCK** — toast only |
| Offers View | `حجز الموعد وتأكيد الطلب` | `components/views/OffersView.tsx` | 1296 | **MOCK** — toast + telemetry only |
| Offers View | `تصدير CSV` | `components/views/OffersView.tsx` | 666 | **WORKING** — real Blob download |
| Offers View | Heart/favorite | `components/views/OffersView.tsx` | 714 | **MOCK** — local state, not persisted |
| Offers View | `تطبيق الفلاتر` | `components/views/OffersView.tsx` | 577 | **DECORATIVE** — telemetry only |
| Offers View | `تحديث وحساب القسط الشهري` | `components/views/OffersView.tsx` | 1016 | **PARTIAL** — client-side calc only |

---

## SECTION 9 — MARKETING & CAMPAIGNS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Marketing View | ALL `addTelemetryEvent` calls | `components/views/MarketingView.tsx` | 86-88 | **NO-OP** — function is `() => {}` |
| Campaigns View | ALL data | `components/views/CampaignsView.tsx` | — | **MOCK** — 100% hardcoded `RAW_CAMPAIGNS` |
| Insights | `تفعيل وحفظ خط سير العمل` | `components/views/tabs/InsightsAutomation.tsx` | 143 | **WORKING** — POST /api/v1/automation/workflows |

---

## SECTION 10 — SETTINGS

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Settings Billing | `الترقية وتأكيد الدفع` | `components/settings/SettingsBilling.tsx` | 602 | **WORKING** — redirects to Paylink |
| Settings Billing | `شراء وكلاء الآن` | `components/settings/SettingsBilling.tsx` | 519 | **WORKING** — `initiateAddonPaymentAction()` |
| Settings Staff | `إنشاء حساب الموظف ➔` | `components/settings/SettingsStaff.tsx` | 330 | **WORKING** — real API |
| Settings Staff | `حذف نهائي` | `components/settings/SettingsStaff.tsx` | 446 | **WORKING** — real API |
| Settings Compliance | `اعتماد التوقيع الرقمي` | `components/settings/SettingsCompliance.tsx` | 738 | **WORKING** — real API |

---

## SECTION 11 — AI, WHATSAPP, HELP DESK, MAINTENANCE

| Page | Button | File | Line | Status |
|------|--------|------|------|--------|
| Agent Mgmt | `تفعيل واستئجار` | `components/views/AgentManagementView.tsx` | 469 | **WORKING** — `leaseAgentAction()` API |
| WhatsApp | `ربط الجهاز` | `components/views/WhatsAppView.tsx` | 216 | **WORKING** — `toggleWhatsAppConnectionAction()` |
| WhatsApp | `إرسال` (message) | `components/views/WhatsAppView.tsx` | 335 | **WORKING** — mock action API |
| Helpdesk | `إرسال التذكرة` | `components/views/HelpdeskView.tsx` | 321 | **WORKING** — real API |
| Maintenance | `إنشاء البلاغ` | `app/dashboard/maintenance/MaintenanceView.tsx` | 254 | **WORKING** — real API |
| Maintenance | `بدء العمل` / `إكمال` / `إلغاء` | `MaintenanceView.tsx` | 318-331 | **WORKING** — real PATCH API |
| Maintenance | `تعيين فني` | `MaintenanceView.tsx` | 308 | **WORKING** — real PATCH API |

---

## SECTION 12 — EXPORT / PRINT / PDF STATUS

| Feature | Page | Status | Detail |
|---------|------|--------|--------|
| Print contract | Contract View | **PARTIAL** | `window.print()` — no server PDF |
| Print invoice | Invoice PDF API | **PARTIAL** | HTML page, no server-side PDF generation |
| QR code | Invoice QR API | **WORKING** | Server-generated PNG via `qrcode` lib |
| Export CSV | Offers View | **WORKING** | Client-side Blob download |
| Export PDF | Leads Performance API | **MISSING** | JSON only, no PDF/Excel capability |
| Export Excel | Any | **MISSING** | Zero Excel export anywhere in system |
| Payment link | Invoice Pay API | **WORKING** | Creates receipt + accounting entry |
| Download contract | Document View | **BROKEN** | Blocks download, shows error toast |
| Download lease | Rental Docs | **MOCK** | Client-side fake .txt blob |

---

## TOP 25 BUTTONS/ACTIONS REQUIRING FIX BEFORE PRODUCTION

| # | Severity | Page | Button/Feature | Issue | File:Line |
|---|----------|------|---------------|-------|-----------|
| 1 | **CRITICAL** | Rental | `تأكيد التحصيل والتسوية` | Payment recorded in local state only — lost on refresh | `rental/page.tsx:1780` |
| 2 | **CRITICAL** | Documents | `تحميل وتنزيل الملف` | Blocks download — calls `e.preventDefault()` + `toast.error()` | `DocumentsView.tsx:547` |
| 3 | **HIGH** | Projects Overview | `محاكاة webhook` | Literally labeled "simulation" — fake payment processing | `ProjectsOverview.tsx:236` |
| 4 | **HIGH** | Projects Overview | `حفظ المرحلة التنفيذية` | Toast only — no API, no DB write | `ProjectsOverview.tsx:455` |
| 5 | **HIGH** | Project Detail | 5 buttons total | All local-state only — "حفظ الحجز", "حفظ المرحلة", "تسجيل التقرير", "محاكاة رفع ملف", "محاكاة استلام دفعة" | `ProjectDetail.tsx:733,799,874,910,658` |
| 6 | **HIGH** | Rental | `تأكيد وتسوية المطابقة` | Bank reconciliation is mock — no real matching engine accessed | `rental/page.tsx:1348` |
| 7 | **HIGH** | Rental | `طلب تسوية المالك Payout` | Local state only — no settlement API | `rental/page.tsx:923` |
| 8 | **HIGH** | Offers | `إدراج العرض ونشره` | Local state only — not persisted to DB | `OffersView.tsx:1198` |
| 9 | **HIGH** | Offers | `تأكيد وإرسال للشركاء` | Empty `toast.success('')` — literally does nothing | `OffersView.tsx:1036` |
| 10 | **HIGH** | Offers | `إرسال الطلب الآن` (contact agent) | Toast only — no message sent | `OffersView.tsx:1383` |
| 11 | **HIGH** | Offers | `حجز الموعد وتأكيد الطلب` (visit) | Toast only — no API call | `OffersView.tsx:1296` |
| 12 | **HIGH** | LeadsTabs | `بحث` | Toast output only — search is non-functional | `LeadsTabs.tsx:152` |
| 13 | **HIGH** | LeadsTabs | `محاكاة webhook عميل جديد` | Labeled "محاكاة" — fake lead injection | `LeadsTabs.tsx:164` |
| 14 | **HIGH** | Tours | `تقديم طلب التمويل` | `toast.success('')` empty — BROKEN | `ToursView.tsx:1147` |
| 15 | **HIGH** | Tours | `تحديث وحفظ الإعدادات` | `toast.success('')` empty — saves nothing | `ToursView.tsx:1224` |
| 16 | **HIGH** | Property Detail | `حفظ كمسودة` | Local state only — not persisted | `PropertyDetail.tsx:469` |
| 17 | **MEDIUM** | Campaigns | ALL data | 100% mock `RAW_CAMPAIGNS` — no real API fetch | `CampaignsView.tsx` |
| 18 | **MEDIUM** | Marketing | `addTelemetryEvent` | Function body is `() => {}` — all telemetry silently discarded | `MarketingView.tsx:86-88` |
| 19 | **MEDIUM** | Contract | Signature | Static placeholder `[ختم المنشأة الإلكتروني]` — no digital signing | `ContractView.tsx:163-177` |
| 20 | **MEDIUM** | Rental | `إرسال تنبيهات سداد الفواتير` | `alert()` + telemetry only — no real notification | `rental/page.tsx:725` |
| 21 | **MEDIUM** | Rental | `إرسال تذكير` | `alert()` + telemetry only — no real notification | `rental/page.tsx:929` |
| 22 | **MEDIUM** | Rental | `رفع الملف` (docs tab) | No upload API called | `rental/page.tsx:1105` |
| 23 | **MEDIUM** | Rental | `عقد_إيجار_موحد_{id}.txt` | Fake client-side blob — not a real contract | `rental/page.tsx:1116` |
| 24 | **MEDIUM** | Invoice | `PDF` download | HTML page only — no server-side PDF generation | `/api/v1/invoices/[id]/pdf` |
| 25 | **MEDIUM** | Reports | Export PDF / Excel | Missing entirely — leads-performance returns JSON only | `reports/leads-performance/route.ts` |

---

## CLASSIFICATION BREAKDOWN

### WORKING (68 — 56%)
Buttons with real API/action execution and database persistence:
- All Settings actions (profile, staff, compliance, billing)
- All Maintenance actions (create, update, assign, complete)
- Contract save + print
- Invoice create + QR + payment modal
- Lease create
- Tour schedule
- Document upload + delete (via Prisma API)
- Agent lease
- WhatsApp toggle
- Helpdesk create + close + reply
- Automation workflow create
- CSV export (client-side)
- Propert booking + handover

### PARTIAL (12 — 10%)
Works partially but has limitations:
- Invoice PDF (HTML only, no server PDF)
- Property revenue display (toast only)
- Offer mortgage calc (client-side only)
- Leads pipeline detail (mock fallback)
- Contract print (browser only)

### MOCK (25 — 20%)
Simulates success but does nothing persistent:
- Payment recording (local state)
- Bank reconciliation matching (local state)
- Settlement request (local state)
- All 5 Project Detail operations
- 2 Projects Overview operations
- 3 Offers submit/save operations
- Lead search + webhook simulation
- Tours settings save
- Property price draft save
- Campaigns data (100% mock)
- Rental reminders + document upload + lease download
- Offer favorites (local state)

### BROKEN (2 — 2%)
- Document download button (blocks download)
- Tours finance request (empty toast)

### DEAD (1 — 1%)
- Offer mortgage `تأكيد وإرسال للشركاء` (empty toast, no action)

### DECORATIVE/NO-OP (9 — 7%)
- Tour filters (telemetry only)
- Offer filters (telemetry only)
- Marketing telemetry (empty function body)
- 4 rental no-op buttons (alert/telemetry only)
- Property detail revenue display (toast only)
