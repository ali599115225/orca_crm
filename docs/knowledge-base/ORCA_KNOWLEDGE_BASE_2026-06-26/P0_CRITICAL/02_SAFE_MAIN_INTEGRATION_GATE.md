# P0 — Safe Main Integration Gate

## الهدف

دمج الأعمال المعتمدة من الفروع وWorktrees إلى `REDC/main` دون استبدال التصميمات المعتمدة أو فقد ملفات أو إدخال تعارضات غير مرئية.

## القيود

- لا تستخدم `git add .` أو`git add -A` في الإغلاق الحساس.
- لا Push إلا بطلب صريح.
- لا تحذف Worktrees أوStashes.
- لا تستبدل Login المعتمد بنسخة قديمة.
- لا تعتبر Copy/Paste للملفات بديلًا عن توثيق المصدر والCommit.
- لا تبدأ Database migration أثناء دمج الواجهات والكود.

## بوابات القبول

1. إثبات branch وHEAD لكل مصدر.
2. إعداد قائمة Commits/Files المطلوب دمجها.
3. تحديد الملفات المتعارضة قبل الدمج.
4. حماية Login وLanguage/Theme وGlobal Shell.
5. إثبات وجود Routes المطلوبة في `main`.
6. لا 404 للمسارات المدمجة.
7. Git diff مفهوم ومحصور.
8. تقرير إغلاق يذكر الملفات والCommits التي دخلت `main`.

## المسار ذو الأولوية

- المصدر: `integration/revenue-integrity`
- الهدف: `main`
- Commit الإغلاق التجميعي: `7663135`

## الحكم الحالي

`SAFE_MAIN_INTEGRATION_REQUIRED`
