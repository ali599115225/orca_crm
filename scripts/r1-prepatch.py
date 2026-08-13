from pathlib import Path
import re

builder_path = Path("scripts/r1-remediation-builder.py")
builder = builder_path.read_text(encoding="utf-8")
old_helper = '''    if count != 1:\n        raise SystemExit(f"{path}: expected one literal match, found {count}")\n    write(path, text.replace(old, new, 1))'''
new_helper = '''    if count == 0 and new in text:\n        return\n    if count != 1:\n        raise SystemExit(f"{path}: expected one literal match, found {count}")\n    write(path, text.replace(old, new, 1))'''
if old_helper not in builder:
    raise SystemExit("builder helper shape changed")
builder_path.write_text(builder.replace(old_helper, new_helper, 1), encoding="utf-8")

path = Path("app/api/v1/tasks/[id]/complete/route.ts")
text = path.read_text(encoding="utf-8")
pattern = re.compile(
    r'''        const updatedTask = await prisma\.task\.update\(\{.*?\n        \}\);\n\n        await writeAuditLog''',
    re.S,
)
replacement = '''        const claimed = await prisma.task.updateMany({
          where: {
            id: task.id,
            tenantId: session.tenantId,
            status: { in: ["PENDING", "OVERDUE"] },
          },
          data: {
            status: "COMPLETED",
            updatedBy: session.userId,
            auditLog:
              `${task.auditLog || ""}\\nTask completed at ${new Date().toISOString()}`.trim(),
          },
        });

        if (claimed.count !== 1) {
          return NextResponse.json(
            { success: false, error: "تم إكمال المهمة بواسطة طلب آخر." },
            { status: 409 },
          );
        }

        const updatedTask = await prisma.task.findFirst({
          where: { id: task.id, tenantId: session.tenantId },
        });
        if (!updatedTask) {
          return NextResponse.json(
            { success: false, error: "المهمة غير موجودة." },
            { status: 404 },
          );
        }

        await writeAuditLog'''
updated, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"task prepatch expected one match, found {count}")
path.write_text(updated, encoding="utf-8")

audit_path = Path("lib/audit.ts")
audit = audit_path.read_text(encoding="utf-8")
old = '''  | "TICKET_CREATED"\n  | "TICKET_CLOSED"\n  | "TICKET_REOPENED"\n  | "TICKET_REPLIED"'''
new = '''  | "TICKET_CREATED"\n  | "TICKET_CLOSED"\n  | "TICKET_REOPENED"\n  | "TICKET_REPLIED"\n  | "TICKET_NOTIFICATION_FAILED"'''
if old not in audit:
    raise SystemExit("helpdesk AuditAction shape changed")
audit_path.write_text(audit.replace(old, new, 1), encoding="utf-8")
