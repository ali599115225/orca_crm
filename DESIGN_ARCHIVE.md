# Sovereign Operations Design Archive

This file preserves the approved design direction before rebuilding the project from scratch.

## Global Style

- Direction: Arabic RTL.
- Visual language: sovereign operations system, clean executive dashboard, light/dark capable.
- Layout: fixed top header, right sidebar, adaptive content area.
- Colors: primary blue, light slate background, dark navy background, subtle borders.
- Shape system: rounded 14px to 30px.
- Shadows: soft large slate shadows for main panels.
- Responsive: desktop sidebar, mobile drawer sidebar, compact header on mobile.

## Header To Preserve

- System status: active badge.
- Security status: encrypted badge.
- Center brand: أنظمة التشغيل / SOVEREIGN OS.
- Notification button with counter.
- Language button.
- Settings button.
- Dark/light mode toggle button.
- User profile button: علي أحمد / مدير النظام.

## Sidebar Sections To Preserve

Keep this exact order:

1. الرئيسية
2. خريطة العمليات
3. غرفة العمليات
4. الأتمتة
5. الطلبات
6. الموظفين
7. الأداء المالي
8. التقارير

Sidebar footer:

- تفضيلات النظام
- البوابة الرئيسية
- Node 591-A

## Page: مركز العمليات

Route target for rebuild: `/operations`

Preserve:

- Hero section for executive live operations control.
- CTA buttons: فتح غرفة التوجيه, استعراض ملخص اليوم.
- KPI cards: العمليات النشطة, جاهزية الأنظمة, الاستجابة اللحظية, المهام الحرجة.
- Live operational feed panel.
- Radar visual panel.
- Operational efficiency / team load content.
- Professional adaptive dashboard grid.

## Page: خريطة العمليات

Route target for rebuild: `/operations/map`

Preserve:

- Full content area map card.
- Rounded map viewport.
- Floating toolbar inside map viewport.
- Title: خريطة العمليات.
- Chips: شبكة مفعلة, 14 عقدة متصلة, تحديث مباشر.
- Iframe source: `https://019e45d1-9f9f-7450-b1e3-3f1ac72e3ba3.arena.site/?embed=true`

## Rebuild Rule

All future pages inside `app` must follow the same responsive style as the map page:

- Shared header/sidebar through layout or shared components.
- No broken links.
- Mobile-first behavior.
- Every sidebar item must have a valid page or safe placeholder.
- Dark mode must affect header, sidebar, panels, and content.