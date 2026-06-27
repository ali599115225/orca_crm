ORCA CRM — OpenCode Long Task Mode

التفعيل:
pwsh -NoProfile -ExecutionPolicy Bypass -File .\enable-long-task-mode.ps1

بعد التفعيل:
1. أغلق OpenCode.
2. افتحه من جديد.
3. استخدم وكيل build فقط.
4. شغّل ملف الإغلاق مرة واحدة.
5. لا تسمح بأي تعديل أو إصلاح أثناء الجولة.

الاسترجاع بعد انتهاء المهمة:
pwsh -NoProfile -ExecutionPolicy Bypass -File .\restore-original-settings.ps1

ثم أغلق OpenCode وافتحه من جديد.

ما تغيّر مؤقتًا:
- build.steps: من 16 إلى 48 لمنع MAXIMUM STEPS REACHED.
- temperature: 0.1 لتقليل الاستطراد.
- shell: pwsh لتثبيت التنفيذ على Windows.
- السماح التلقائي فقط لتشغيل سكربت الإغلاق وقراءة تقاريره.
- edit: deny لأن هذه الجولة تحقق فقط.
- تعطيل final-review وsecurity-review لمنع إعادة الفحص والتفويض.

لا تُحذف opencode.original.jsonc قبل الاسترجاع.
