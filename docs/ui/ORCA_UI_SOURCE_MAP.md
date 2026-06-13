# ORCA UI Source Map

## 1. الغرض

هذه الوثيقة هي المرجع الرسمي لمعرفة الملف الفعلي لكل صفحة قبل أي تعديل UI/UX في ORCA CRM. يجب استخدام الخريطة لتثبيت العلاقة بين `Route` و`Page File` و`Main Component` و`Source Location` حتى لا يتم تعديل ملفات غير مستخدمة أو ملفات legacy بالخطأ في مراحل الهوية البصرية.

## 2. Active Operations Routes

| Route | Page File | Main Component | Source Location | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/operations/dashboard` | `app/operations/dashboard/page.tsx` | `DashboardView` | `app/operations/dashboard/DashboardView.tsx` | Active | الصفحة تجمع بيانات server ثم تمررها إلى مكون محلي. |
| `/operations/properties` | `app/operations/properties/page.tsx` | `PropertiesView` | `components/views/PropertiesView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/rental` | `app/operations/rental/page.tsx` | `RentalPage` | `app/operations/rental/page.tsx` | Active | الواجهة منفذة داخل ملف الصفحة مباشرة. |
| `/operations/campaigns` | `app/operations/campaigns/page.tsx` | `CampaignsView` | `components/views/CampaignsView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/marketing` | `app/operations/marketing/page.tsx` | `MarketingView` | `components/views/MarketingView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/offers` | `app/operations/offers/page.tsx` | `OffersView` | `components/views/OffersView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/projects` | `app/operations/projects/page.tsx` | `ProjectsView` | `components/views/ProjectsView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/leads` | `app/operations/leads/page.tsx` | `LeadsTabs` | `components/views/tabs/LeadsTabs.tsx` | Active | الصفحة تستخدم تبويبات leads كواجهة فعلية. |
| `/operations/tasks` | `app/operations/tasks/page.tsx` | `TasksView` | `components/views/TasksView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/settings` | `app/operations/settings/page.tsx` | `SettingsView` | `components/views/SettingsView.tsx` | Active | الصفحة تجمع بيانات server ثم تمررها إلى SettingsView. |
| `/operations/agents` | `app/operations/agents/page.tsx` | `AgentManagementView` | `components/views/AgentManagementView.tsx` | Active | الصفحة تجمع بيانات agents ثم تمررها إلى view. |
| `/operations/sales` | `app/operations/sales/page.tsx` | `SalesView` | `components/views/SalesView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/tours` | `app/operations/tours/page.tsx` | `ToursView` | `components/views/ToursView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/whatsapp` | `app/operations/whatsapp/page.tsx` | `WhatsAppView` | `components/views/WhatsAppView.tsx` | Active | الصفحة تجمع حالة WhatsApp ثم تمررها إلى view. |
| `/operations/helpdesk` | `app/operations/helpdesk/page.tsx` | `HelpdeskView` | `components/views/HelpdeskView.tsx` | Active | الصفحة تجمع بيانات helpdesk ثم تمررها إلى view. |
| `/operations/documents` | `app/operations/documents/page.tsx` | `DocumentsView` | `components/views/DocumentsView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/email` | `app/operations/email/page.tsx` | `EmailClient` | `app/operations/email/EmailClient.tsx` | Active | الصفحة تجمع الرسائل ثم تمررها إلى مكون محلي. |
| `/operations/calculator` | `app/operations/calculator/page.tsx` | `CalculatorView` | `components/views/CalculatorView.tsx` | Active | واجهة رئيسية من مجلد views. |
| `/operations/compliance` | `app/operations/compliance/page.tsx` | `CompliancePage` | `app/operations/compliance/page.tsx` | Active | الواجهة منفذة داخل ملف الصفحة مباشرة. |
| `/operations/health` | `app/operations/health/page.tsx` | `HealthPage` | `app/operations/health/page.tsx` | Active / Review | صفحة تشغيلية مباشرة وتحتاج قفل هوية قبل أي تعديل بصري. |

## 3. Dashboard / Legacy Routes

| Route | Page File | Main Component | Source Location | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `/dashboard` | `app/dashboard/page.tsx` | `DashboardPage` | `app/dashboard/page.tsx` | Redirect | يوجه المستخدم إلى `/operations/dashboard`. |
| `/dashboard/owner-portal` | `app/dashboard/owner-portal/page.tsx` | `OwnerPortalPage` | `app/dashboard/owner-portal/page.tsx` | Legacy / Active | الواجهة منفذة داخل ملف الصفحة مباشرة. |
| `/dashboard/tenant-portal` | `app/dashboard/tenant-portal/page.tsx` | `TenantPortalPage` | `app/dashboard/tenant-portal/page.tsx` | Legacy / Active | الواجهة منفذة داخل ملف الصفحة مباشرة. |
| `/dashboard/maintenance` | `app/dashboard/maintenance/page.tsx` | `MaintenanceView` | `app/dashboard/maintenance/MaintenanceView.tsx` | Legacy / Active | صفحة dashboard legacy تعتمد مكونًا محليًا. |
| `/admin/command-center` | `app/admin/command-center/page.tsx` | `CommandCenterPage` | `app/admin/command-center/page.tsx` | Admin / Review | واجهة admin مباشرة وتستخدم `SmartCard`. |
| `/contract/[leadId]` | `app/contract/[leadId]/page.tsx` | `ContractView` | `app/contract/[leadId]/ContractView.tsx` | Active / Review | صفحة عقد ديناميكية تعتمد بيانات tenant/session. |
| `/login` | `app/login/page.tsx` | `LoginClient` | `app/login/LoginClient.tsx` | Active | الصفحة تضبط tenant ثم تمرر البيانات إلى LoginClient. |
| `/demo` | `app/demo/page.tsx` | `DemoForm` | `app/demo/DemoForm.tsx` | Active | صفحة demo مستقلة عن عمليات CRM الداخلية. |

## 4. UI Component Folders

| Folder | Role | Important Files | Notes |
| --- | --- | --- | --- |
| `components/views/` | واجهات العمليات الرئيسية | `PropertiesView.tsx`, `ProjectsView.tsx`, `CampaignsView.tsx`, `MarketingView.tsx`, `SettingsView.tsx`, `WhatsAppView.tsx` | المصدر الأساسي لمعظم صفحات `/operations/*`. |
| `components/ui/` | عناصر UI مشتركة | `PageHeader.tsx`, `LayoutContainer.tsx`, `DataTable.tsx`, `GlassCard.tsx`, `Modal.tsx`, `StatusBadge.tsx` | يجب تعديلها بحذر لأنها قد تؤثر على عدة صفحات. |
| `components/layout/` | هياكل layout عامة | `DashboardLayout.tsx`, `PageShell.tsx` | مرشح لتوحيد shell بعد إثبات الاستخدام. |
| `components/properties/` | مكونات نطاق العقارات | `PropertyDetail.tsx`, `PropertyList.tsx` | تستخدم في شاشات العقارات أو تفاصيلها. |
| `components/projects/` | مكونات نطاق المشاريع | `ProjectDetail.tsx`, `ProjectsOverview.tsx` | يحتوي دين بصري واضح في تفاصيل المشروع. |
| `components/settings/` | مكونات إعدادات النظام | `AutomationSettings.tsx`, `SettingsBilling.tsx`, `SettingsCompliance.tsx`, `SettingsStaff.tsx` | مرتبطة بتجربة settings وتحتاج توثيق استخدام قبل تعديل واسع. |
| `components/marketing/` | مكونات التسويق | `MarketingCampaigns.tsx`, `PlatformConnectors.tsx` | مرشحة للتنسيق مع `MarketingView`. |
| `app/components/` | مكونات landing/app shell داخل app | `EnterpriseHome.tsx`, `PricingGrid.tsx`, `SovereignHeader.tsx`, `SovereignSidebar.tsx` | ليست بديلًا مباشرًا عن `components/views/`. |
| `app/operations/` | ملفات routes العمليات | `layout.tsx`, `page.tsx`, route folders | المصدر الرسمي لصفحات operations. |
| `app/dashboard/` | routes dashboard legacy | `layout.tsx`, `page.tsx`, `owner-portal/`, `tenant-portal/`, `maintenance/` | لا تعدل قبل إثبات أنها route فعلي مطلوب. |

## 5. Legacy / Review Candidates

| File | Current Role | Review Status | Notes |
| --- | --- | --- | --- |
| `components/ui/DataTable.tsx` | جدول UI مشترك محتمل | Review | لا يعدل قبل إثبات استخدامه في route مستهدف. |
| `components/ui/GlassCard.tsx` | card legacy/visual utility | Review | مرشح لتقليل التباين البصري أو استبداله تدريجيًا. |
| `components/ui/HudElements.tsx` | عناصر HUD بصرية | Review | قد تكون مرتبطة بالهوية القديمة. |
| `components/ui/Modal.tsx` | modal مشترك | Review | يجب فحص الاستخدام قبل أي تغيير عام. |
| `components/ui/Breadcrumb.tsx` | breadcrumb مشترك | Review | تعديل عام قد يؤثر على navigation. |
| `components/ui/PageShell.tsx` | page shell مشترك | Review | يوجد أيضًا `components/layout/PageShell.tsx`، يلزم حسم المصدر الفعلي قبل التعديل. |
| `components/ui/EmptyState.tsx` | حالة فارغة مشتركة | Review | مرشح للتوحيد ضمن نظام الهوية. |
| `components/ui/StatusBadge.tsx` | badge مشترك | Review | مرشح لتوحيد حالات CRM. |
| `app/operations/onboarding/page.tsx` | صفحة onboarding | Review | ليست ضمن قائمة active operations الأساسية في هذه الوثيقة. |
| `app/operations/debug/whatsapp-health/page.tsx` | صفحة debug | Debug / Review | لا تدخل في الهوية البصرية العامة إلا بقرار صريح. |
| `app/operations/health/page.tsx` | صفحة health تشغيلية | Active / Review | موجودة ضمن active routes وتحتاج ضبط بصري حذر. |

## 6. Visual Identity Debt

| File | Issue | Severity | Recommended Phase |
| --- | --- | --- | --- |
| `components/projects/ProjectDetail.tsx` | يحتاج مواءمة مع نظام ORCA visual الجديد وتثبيت layout التفاصيل. | Medium | Phase 10-X2.3 |
| `app/contract/[leadId]/ContractView.tsx` | واجهة عقد حساسة وقد تحمل أنماطًا خاصة خارج النظام الموحد. | High | Phase 10-X2.4 |
| `app/operations/rental/page.tsx` | صفحة كبيرة تنفذ UI وstate داخل ملف واحد مع تباين بصري محتمل. | High | Phase 10-X2.2 |
| `app/dashboard/maintenance/MaintenanceView.tsx` | legacy dashboard view يحتاج فصلًا بصريًا عن operations أو توحيدًا صريحًا. | Medium | Phase 10-X2.5 |
| `app/dashboard/owner-portal/page.tsx` | واجهة legacy مباشرة داخل الصفحة وتحتاج تثبيت هوية البوابة. | Medium | Phase 10-X2.5 |
| `app/operations/compliance/page.tsx` | لوحة compliance منفذة مباشرة وبألوان/أنماط خاصة. | High | Phase 10-X2.2 |
| `app/operations/health/page.tsx` | صفحة تشغيلية مباشرة وتستخدم بطاقات داكنة مخصصة. | Medium | Phase 10-X2.2 |
| `components/views/CampaignsView.tsx` | يحتاج توحيد نمط الحملات مع باقي views. | Medium | Phase 10-X2.3 |
| `app/globals.css` | مصدر tokens والأنماط العامة؛ أي تعديل يؤثر على كل التطبيق. | High | Phase 10-X2.1 |

## 7. Rules Before Editing UI

- لا تعدل صفحة قبل تحديد `route -> component`.
- لا تعدل legacy file قبل إثبات أنه مستخدم في route فعلي.
- لا تخلط UI مع backend/security في نفس phase.
- كل Phase UI يجب أن يذكر الملف الفعلي الذي سيتم تعديله.
- كل تعديل بصري يحتاج `npm run build` وvisual verification.
