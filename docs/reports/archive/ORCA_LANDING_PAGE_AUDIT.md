# ORCA Landing Page Audit — EnterpriseHome.tsx

## Scope
Every factual claim, metric, certification, and feature promise made on the public landing page (`app/components/EnterpriseHome.tsx`), rated against verifiable platform reality.

## Rating Definitions
| Rating | Meaning |
|--------|---------|
| ✅ Verified | Claim is backed by real code, DB queries, or verifiable implementation |
| ⚠️ Unverified | Cannot confirm or deny — no clear source but plausible |
| 🔶 Misleading | Partially true but exaggerates or omits critical context |
| ❌ False | No supporting implementation exists, or contradicts evidence |

---

## Hero Section Metrics

### 1. "1,247+ Assets Managed" / "أصل عقاري ١,٢٤٧+"
- **Source:** `EnterpriseHome.tsx:205` — `<span className="eh-token eh-token-num">1,247</span>`
- **Source (AR):** `EnterpriseHome.tsx:743` — `{ val: "١,٢٤٧+", lbl: "أصل عقاري" }`
- **Rating:** ❌ **False**
- **Evidence:** Hardcoded string in terminal visualization. No database query. No `COUNT(*) FROM properties` or equivalent. The `initialProperties` mock data in OffersView.tsx has exactly 5 properties.
- **File:** `app/components/EnterpriseHome.tsx:205,743`

### 2. "4,832+ Units Under Management" / "وحدة تحت الإدارة ٤,٨٣٢+"
- **Source:** `EnterpriseHome.tsx:206` — `<span className="eh-token eh-token-num">4,832</span>`
- **Source (AR):** `EnterpriseHome.tsx:744` — `{ val: "٤,٨٣٢+", lbl: "وحدة تحت الإدارة" }`
- **Rating:** ❌ **False**
- **Evidence:** Hardcoded string. No `COUNT(*) FROM units` query. No lookup against any database table.
- **File:** `app/components/EnterpriseHome.tsx:206,744`

### 3. "97.2% Collection Rate" / "نسبة التحصيل ٩٧.٢٪"
- **Source:** `EnterpriseHome.tsx:209` — `<span className="eh-token eh-token-num">97.2</span><span className="eh-token eh-token-unit">%</span>`
- **Source (AR):** `EnterpriseHome.tsx:745` — `{ val: "٩٧.٢٪", lbl: "نسبة التحصيل" }`
- **Rating:** ❌ **False**
- **Evidence:** Hardcoded string. No `SELECT AVG(collection_rate) FROM tenants` or similar. No collection rate computation exists anywhere in the codebase.
- **File:** `app/components/EnterpriseHome.tsx:209,745`

### 4. "SAR 428M+ Asset Value" / "قيمة الأصول ٤٢٨+M (ر.س)"
- **Source:** `EnterpriseHome.tsx:208` — `<span className="eh-token eh-token-num">SAR 428M</span>`
- **Source (AR):** `EnterpriseHome.tsx:746` — `{ val: "٤٢٨+M", lbl: "قيمة الأصول (ر.س)" }`
- **Rating:** ❌ **False**
- **Evidence:** Hardcoded string. No `SELECT SUM(price) FROM properties` query. The 5 mock properties in OffersView sum to approximately SAR 10.07M, not 428M.
- **File:** `app/components/EnterpriseHome.tsx:208,746`

### 5. "94.7% Occupancy" / "نسبة الإشغال" in terminal
- **Source:** `EnterpriseHome.tsx:207` — `<span className="eh-token eh-token-num">94.7</span><span className="eh-token eh-token-unit">%</span>`
- **Rating:** ❌ **False**
- **Evidence:** Hardcoded string in terminal visualization. No occupancy calculation anywhere in codebase.
- **File:** `app/components/EnterpriseHome.tsx:207`

---

## Trust & Certifications Section

### 6. "ISO 27001" — Footer badge
- **Source:** `EnterpriseHome.tsx:886` — `footerISO: "ISO 27001"`
- **Source (EN):** `EnterpriseHome.tsx:1107` — `footerISO: "ISO 27001"`
- **Rating:** ❌ **False**
- **Evidence:** Text badge only. No ISMS documentation, no ISO 27001 certification number, no certification body reference, no Statement of Applicability, no internal audit procedures, no evidence of certification process in the codebase or documentation files.
- **File:** `app/components/EnterpriseHome.tsx:886,1107`

### 7. "GDPR" — Footer badge
- **Source:** `EnterpriseHome.tsx:885` — `footerGDPR: "GDPR"`
- **Source (EN):** `EnterpriseHome.tsx:1106` — `footerGDPR: "GDPR"`
- **Rating:** ❌ **False**
- **Evidence:** Text badge only. No consent management UI, no Data Processing Agreement (DPA) template, no right-to-erasure mechanism, no data export functionality, no cookie consent banner implementation. The platform is Saudi-focused with Arabic as primary language — GDPR applicability is questionable.
- **File:** `app/components/EnterpriseHome.tsx:885,1106`

### 8. "AWS Saudi Arabia" / "استضافة AWS السعودية"
- **Source:** `EnterpriseHome.tsx:755` — `"استضافة على AWS Saudi Arabia مع نسخ احتياطي فوري و SLA بنسبة 99.99٪."`
- **Source (EN):** `EnterpriseHome.tsx:975` — `"Hosted on AWS Saudi Arabia with instant backup and 99.99% SLA guarantee."`
- **Rating:** ❌ **False**
- **Evidence:** Database connection string in `.env:1` reads:
  ```
  DATABASE_URL=postgresql://neondb_owner:...@ep-fragrant-dream-aqbliivf-pooler.c-8.us-east-1.aws.neon.tech:5432/neondb
  ```
  The database is hosted in **us-east-1 (Virginia, USA)**, not **me-central-1 (Saudi Arabia)**. There is also no 99.99% SLA — Neon's standard SLA does not guarantee 99.99%.
- **File:** `app/components/EnterpriseHome.tsx:755,975` | `.env:1-3`

### 9. "CMA Compliance" / "هيئة السوق المالية"
- **Source:** `EnterpriseHome.tsx:735` — `"نظام تشغيل العقارات المرخص من هيئة السوق المالية"`
- **Source (EN):** `EnterpriseHome.tsx:955` — `"CMA-Regulated Real Estate Operating System"`
- **Source:** `EnterpriseHome.tsx:754` — `"مصمم وفق متطلبات هيئة السوق المالية السعودية وضوابط الأمان السيبراني."`
- **Rating:** ❌ **False**
- **Evidence:** No CMA license number, no regulatory submission code, no compliance certificate, no regulatory filing references. The "CMA compliance" badge in SettingsCompliance.tsx only checks whether a tenant has filled in a commercial registry number and VAT number — not actual CMA regulatory registration.
- **File:** `app/components/EnterpriseHome.tsx:735,754,955`

### 10. "AES-256 Encryption" / "تشفير مصرفي AES-256"
- **Source:** `EnterpriseHome.tsx:753` — `"تشفير مصرفي AES-256، التحقق الثنائي، وسجلات تدقيق كاملة"`
- **Source:** `EnterpriseHome.tsx:877` — `"🔒 تشفير مصرفي AES-256"`
- **Rating:** 🔶 **Misleading**
- **Evidence:** `lib/crypto.ts:17` uses `crypto.createCipheriv('aes-256-cbc', deriveKey(), iv)` — AES-256-CBC is indeed used. **However**, `lib/crypto.ts:4` shows: `const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;` — the encryption key falls back to JWT_SECRET if ENCRYPTION_KEY is not set. JWT_SECRET is typically weaker and not meant to be an AES key. This is a cryptographic weakness in key derivation.
- **File:** `lib/crypto.ts:4,17` | `app/components/EnterpriseHome.tsx:753,877`

### 11. "Two-Factor Authentication" / "التحقق الثنائي"
- **Source:** `EnterpriseHome.tsx:753` — `"التحقق الثنائي، وسجلات تدقيق كاملة لجميع العمليات."`
- **Rating:** ⚠️ **Unverified**
- **Evidence:** No 2FA implementation found in the authentication flow. The auth system appears to use NextAuth/JWT-based auth. No TOTP, SMS OTP, or hardware token implementation detected.
- **File:** `app/components/EnterpriseHome.tsx:753`

### 12. "Apple Pay & Mada" / "Apple Pay & Mada"
- **Source:** `EnterpriseHome.tsx:881` — `"💳 Apple Pay & Mada"`
- **Source (EN):** `EnterpriseHome.tsx:1102` — `"💳 Apple Pay & Mada"`
- **Rating:** ❌ **False**
- **Evidence:** No payment gateway integration found in the codebase. No Stripe, no HyperPay, no Moyasar, no Apple Pay JS API calls, no Mada integration. The "payment" on the contract view is a hardcoded "5,000 ر.س" value (ContractView.tsx:122).
- **File:** `app/components/EnterpriseHome.tsx:881`

---

## AI Intelligence Section

### 13. "94.7% Prediction Accuracy" (AI Occupancy)
- **Source:** `EnterpriseHome.tsx:781` — `metric: "94.7%", metricLbl: "دقة التنبؤ"`
- **Source (EN):** `EnterpriseHome.tsx:1001` — `metric: "94.7%", metricLbl: "Prediction Accuracy"`
- **Rating:** ❌ **False**
- **Evidence:** No machine learning model, no training data, no prediction pipeline. The AI agent gallery (AgentManagementView.tsx, HelpdeskView.tsx, WhatsAppView.tsx) shows simulated responses. The `AIAnalysis.tsx` tab component is 10 lines (a stub). No AI model endpoint exists.
- **File:** `app/components/EnterpriseHome.tsx:781,1001`

### 14. "92.3% Analysis Accuracy" (AI Collection Risk)
- **Source:** `EnterpriseHome.tsx:782` — `metric: "92.3%", metricLbl: "دقة التحليل"`
- **Rating:** ❌ **False**
- **Evidence:** Same as above — no ML pipeline exists for collection risk analysis. Zero evidence of any prediction model.
- **File:** `app/components/EnterpriseHome.tsx:782`

### 15. "98.1% Analytics Coverage" (AI Executive Insights)
- **Source:** `EnterpriseHome.tsx:783` — `metric: "98.1%", metricLbl: "التغطية التحليلية"`
- **Rating:** ❌ **False**
- **Evidence:** Same as above. No analytics coverage metric computation exists.
- **File:** `app/components/EnterpriseHome.tsx:783`

### 16. "24/7 Continuous Operation" (AI Smart Reporting)
- **Source:** `EnterpriseHome.tsx:784` — `metric: "24/7", metricLbl: "تشغيل متواصل"`
- **Rating:** 🔶 **Misleading**
- **Evidence:** This is not an AI metric — it's a hosting claim. The platform may be available 24/7 as any web app, but labeling this as an AI feature metric is misleading.
- **File:** `app/components/EnterpriseHome.tsx:784`

### 17. 5 AI Agents Claim
- **Source:** `EnterpriseHome.tsx:780-784` — 4 AI items listed (prediction, risk, insights, reporting), plus the "AI Chat Agent" in WhatsAppView
- **Rating:** ❌ **False**
- **Evidence:** The 5 claimed AI agents break down as follows:
  - 1 real: `AIAnalysis.tsx` — but it's a 10-line stub file
  - 2 scripts: `HelpdeskView.tsx` (AI auto-response) and `WhatsAppView.tsx` (AI Chat Agent) — both use simulated/mock responses
  - 1 fake: AI Occupancy Prediction — no model, no code, no endpoint
  - 1 ghost: AI Collection Risk — no implementation exists
- **File:** `app/components/EnterpriseHome.tsx:780-784` | `components/views/tabs/AIAnalysis.tsx` | `components/views/WhatsAppView.tsx:7`

---

## Case Studies Section

### 18. Case Study 1: "SAR 4.2M Annual Savings"
- **Source:** `EnterpriseHome.tsx:921` — `{ industry: "شركة إدارة عقارات", result: "وفر ٤.٢ مليون ر.س سنوياً", ... }`
- **Rating:** ❌ **False**
- **Evidence:** No real client data. The case study references "managing 1,200 units manually with Excel" — but the platform has 0 production tenants and mock data. All metrics (97% collection, 82% time saved, 4.2M savings) are fabricated.
- **File:** `app/components/EnterpriseHome.tsx:921-924`

### 19. Case Study 2: "3x Sales Velocity"
- **Source:** `EnterpriseHome.tsx:926` — `{ industry: "مطور عقاري", result: "ضاعف سرعة المبيعات ٣ مرات", ... }`
- **Rating:** ❌ **False**
- **Evidence:** Fabricated. Claims "digital contracts issued in minutes" but the contract system shows a generic template (ContractView.tsx) with hardcoded "5,000 ر.س" earnest money. No real developer client exists.
- **File:** `app/components/EnterpriseHome.tsx:926-929`

### 20. Case Study 3: "60% Team Reduction"
- **Source:** `EnterpriseHome.tsx:931` — `{ industry: "مؤسسة استثمارية", result: "قلص فريق العمليات ٦٠٪", ... }`
- **Rating:** ❌ **False**
- **Evidence:** Fabricated. Claims "15-person operations team reduced to 6" — no real client, no real metrics.
- **File:** `app/components/EnterpriseHome.tsx:931-934`

---

## Feature Comparison Table

### 21. Comparison: "Unified real estate management platform" vs Excel/CRM
- **Source:** `EnterpriseHome.tsx:848` — ORCA rated "✓" across the board
- **Rating:** 🔶 **Misleading**
- **Evidence:** ORCA is presented as a complete, production-ready platform. Reality: LeadsPipelineV2 is 100% mock data, 3 major views depend on mock data fallbacks, AI features are non-existent, payment gateways not integrated. The comparison table claims the platform delivers 8/8 features — but at least 4 of those features are either incomplete or non-existent.
- **File:** `app/components/EnterpriseHome.tsx:847-855`

---

## Portals Section

### 22. "Owner Portal" / "بوابة المالك"
- **Source:** `EnterpriseHome.tsx:813-819` — Lists 6 features (executive dashboard, real-time reports, occupancy tracking, custom reports, contract management, direct communication)
- **Rating:** ❌ **False**
- **Evidence:** No dedicated Owner Portal UI exists. The `OWNER_PORTAL_READINESS.md` report likely confirms this gap. No route for `/owner-portal`, no owner-specific dashboard, no owner authentication flow. The `EnterpriseHome.tsx` portal section renders a styled card with bullet points — no actual page behind it.
- **File:** `app/components/EnterpriseHome.tsx:813-819`

### 23. "Tenant Portal" / "بوابة المستأجر"
- **Source:** `EnterpriseHome.tsx:822-829` — Lists 6 features (view contract, pay invoices, maintenance requests, communication, notifications, document downloads)
- **Rating:** ❌ **False**
- **Evidence:** No dedicated Tenant Portal UI exists. No route for `/tenant-portal`, no tenant-specific dashboard, no tenant payment flow. Same as Owner Portal — a styled card with no backend.
- **File:** `app/components/EnterpriseHome.tsx:822-829`

---

## Financial Operations Section

### 24. "ZATCA Integration" / "التكامل مع ZATCA"
- **Source:** `EnterpriseHome.tsx:804` — `{ icon: "🇸🇦", title: "ZATCA", desc: "التكامل الكامل مع هيئة الزكاة والضريبة والجمارك لإصدار الفواتير الضريبية." }`
- **Source:** `EnterpriseHome.tsx:851` — Comparison row: "التكامل مع ZATCA" — ORCA gets "✓"
- **Rating:** 🔶 **Misleading**
- **Evidence:** ZATCA libraries exist (`lib/zatca/` directory with XML generation, QR codes, encryption, PIH), and `ACCOUNTING_ZATCA_AUDIT.md` may confirm partial implementation. However, integration is incomplete: no CSID production certificate, no production onboarding, no compliance certificate. The landing page implies full production integration.
- **File:** `app/components/EnterpriseHome.tsx:804,851` | `lib/zatca/`

### 25. "Financial Reports: Journal Entries, General Ledger, Trial Balance, Financial Statements"
- **Source:** `EnterpriseHome.tsx:803` — `{ icon: "📊", title: "التقارير المالية", desc: "تقارير مالية شاملة: قيود اليومية، الأستاذ العام، ميزان المراجعة، القوائم المالية." }`
- **Rating:** 🔶 **Misleading**
- **Evidence:** The accounting module may have partial implementation (see `lib/vat/`, `lib/zatca/`), but the full claim of GAAP-compliant financial statements (journal entries, general ledger, trial balance, financial statements) is substantially more complex than what the codebase demonstrates. Needs independent accounting review.
- **File:** `app/components/EnterpriseHome.tsx:803`

### 26. "Bank Reconciliation" / "التسويات البنكية"
- **Source:** `EnterpriseHome.tsx:805` — `{ icon: "🏦", title: "التسويات البنكية", desc: "مطابقة آلية للحركات البنكية مع التسويات المحاسبية بشكل يومي." }`
- **Rating:** ❌ **False**
- **Evidence:** No bank API integration found (no bank connection, no OFX/QFX parsing, no bank statement import). Daily automated reconciliation would require real bank feed integration — none exists.
- **File:** `app/components/EnterpriseHome.tsx:805`

---

## Other Claims

### 27. "99.99% SLA"
- **Source:** `EnterpriseHome.tsx:755` — `"SLA بنسبة 99.99٪"`
- **Source:** `EnterpriseHome.tsx:869` — Enterprise plan: `"SLA 99.99%"`
- **Rating:** ❌ **False**
- **Evidence:** No SLA contract, no uptime monitoring configuration visible, no status page. The platform runs on a single Neon PostgreSQL instance — 99.99% uptime (52 minutes downtime/year) is unachievable without multi-region failover and load balancing.
- **File:** `app/components/EnterpriseHome.tsx:755,869`

### 28. "Mobile App" / "تطبيق جوال"
- **Source:** `EnterpriseHome.tsx:795` — `{ icon: "📱", title: "تطبيق جوال", desc: "تطبيق جوال للملاك والمستأجرين لمتابعة العقود والفواتير وطلبات الصيانة." }`
- **Rating:** ❌ **False**
- **Evidence:** No React Native, Flutter, or any mobile app code in the repository. The project is a Next.js web app only. No PWA manifest, no service worker for offline capability.
- **File:** `app/components/EnterpriseHome.tsx:795`

### 29. "24/7 Support" / "دعم فني 24/7"
- **Source:** `EnterpriseHome.tsx:855` — Comparison row: `"دعم فني 24/7"` — ORCA gets "✓"
- **Source:** `EnterpriseHome.tsx:868` — Professional plan includes `"دعم 24/7"`
- **Rating:** 🔶 **Misleading**
- **Evidence:** The HelpdeskView.tsx shows a ticket system (`createTicketAction`, `closeTicketAction`) with auto-responses, but no 24/7 human support infrastructure. No on-call rotation, no SLA for response times, no support team evidence.
- **File:** `app/components/EnterpriseHome.tsx:855,868` | `components/views/HelpdeskView.tsx`

### 30. "30% Launch Discount" / "خصم ٣٠٪"
- **Source:** `EnterpriseHome.tsx:725` — `launchBanner: "🚀 عرض الإطلاق الحصري 2026 — خصم 30% للمشتركين الجدد"`
- **Rating:** 🔶 **Misleading**
- **Evidence:** The discount exists only as a banner string. No coupon code system, no discount logic in the pricing section, no payment processing to apply such a discount to. Purely a marketing banner with no backend.
- **File:** `app/components/EnterpriseHome.tsx:725`

---

## Summary Statistics

| Rating | Count | Percentage |
|--------|-------|------------|
| ✅ Verified | 0 | 0% |
| ⚠️ Unverified | 1 | 3.3% |
| 🔶 Misleading | 7 | 23.3% |
| ❌ False | 22 | 73.3% |
| **Total Claims Audited** | **30** | **100%** |

---

## Critical Risk Items (Must-Fix Before Public Launch)
1. **AWS region claim** (`us-east-1` ≠ `me-central-1`) — false geographic data sovereignty claim, regulatory risk for Saudi clients
2. **CMA license claim** — no license number, potential regulatory violation
3. **ISO 27001 badge** — no certification, potential false advertising
4. **GDPR badge** — no compliance infrastructure
5. **Case studies** — all 3 are fabricated; potential consumer protection violation
6. **Hero metrics** (assets, units, collection rate, revenue) — all hardcoded with no database backing
7. **ZATCA integration** — presented as production-ready; actual state is pre-production
