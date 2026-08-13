from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    write(path, text.replace(old, new, 1))


# Task authorization remains part of the atomic claim.
replace_once(
    "app/api/v1/tasks/[id]/complete/route.ts",
    '            status: { in: ["PENDING", "OVERDUE"] },\n',
    '            status: { in: ["PENDING", "OVERDUE"] },\n            assignedTo: { not: session.userId },\n',
)

# Existing-contract offer acceptance must cancel all competing eligible offers too.
replace_once(
    "lib/domain/transaction-spine/accept-offer.ts",
    '''        if (offer.status !== OFFER_STATUS.ACCEPTED) {\n          await tx.offer.update({\n            where: { id: offer.id },\n            data: { status: OFFER_STATUS.ACCEPTED, updatedBy: userId },\n          });\n        }\n\n        return {''',
    '''        if (offer.status !== OFFER_STATUS.ACCEPTED) {\n          await tx.offer.update({\n            where: { id: offer.id },\n            data: { status: OFFER_STATUS.ACCEPTED, updatedBy: userId },\n          });\n        }\n\n        await tx.offer.updateMany({\n          where: {\n            tenantId,\n            unitId: offer.unitId,\n            id: { not: offer.id },\n            status: {\n              in: [\n                OFFER_STATUS.PENDING,\n                OFFER_STATUS.SENT,\n                OFFER_STATUS.NEGOTIATION,\n              ],\n            },\n          },\n          data: {\n            status: OFFER_STATUS.CANCELLED,\n            updatedBy: userId,\n            auditLog: `Superseded by accepted offer ${offer.id}`,\n          },\n        });\n\n        return {''',
)

# Manual payment calculations stay in integer minor units and completed retries resolve by receipt relation.
replace_once(
    "app/api/v1/invoices/[id]/pay/route.ts",
    '''  if (\n    transaction.status !== 'COMPLETED' ||\n    !transaction.providerTransactionId\n  ) {\n    return { state: 'pending' as const };\n  }\n\n  const receipt = await prisma.receipt.findFirst({\n    where: {\n      id: transaction.providerTransactionId,\n      tenantId,\n      invoiceId,\n    },''',
    '''  if (transaction.status !== 'COMPLETED') {\n    return { state: 'pending' as const };\n  }\n\n  const receipt = await prisma.receipt.findFirst({\n    where: {\n      paymentTransactionId: transaction.id,\n      tenantId,\n      invoiceId,\n    },''',
)
replace_once(
    "app/api/v1/invoices/[id]/pay/route.ts",
    '''      const paidBefore = Number(completedPayments._sum.netAmount || 0);\n      const invoiceAmount =\n        Math.round((invoiceTotal - paidBefore) * 100) / 100;\n      if (!Number.isFinite(invoiceAmount) || invoiceAmount <= 0) {''',
    '''      const paidBefore = Number(completedPayments._sum.netAmount || 0);\n      const invoiceTotalMinor = Math.round(invoiceTotal * 100);\n      const paidBeforeMinor = Math.round(paidBefore * 100);\n      const remainingMinor = invoiceTotalMinor - paidBeforeMinor;\n      const invoiceAmount = remainingMinor / 100;\n      if (!Number.isFinite(remainingMinor) || remainingMinor <= 0) {''',
)
replace_once(
    "app/api/v1/invoices/[id]/pay/route.ts",
    '''        expectedAmountMinor: Math.round(invoiceAmount * 100),''',
    '''        expectedAmountMinor: remainingMinor,''',
)
replace_once(
    "app/api/v1/invoices/[id]/pay/route.ts",
    '''      return { invoiceAmount, paymentTransaction, unpaidInstallments };''',
    '''      return {\n        invoiceAmount,\n        amountMinorUnits: remainingMinor,\n        paymentTransaction,\n        unpaidInstallments,\n      };''',
)
replace_once(
    "app/api/v1/invoices/[id]/pay/route.ts",
    '''        amountMinorUnits: Math.round(created.invoiceAmount * 100),''',
    '''        amountMinorUnits: created.amountMinorUnits,''',
)

# Durable notification failure records use a non-swallowing Prisma write in close and reply flows.
replace_once(
    "app/actions/helpdesk.ts",
    '''            await writeAuditLog({\n              tenantId: session.tenantId,\n              userId: session.userId,\n              action: "TICKET_NOTIFICATION_FAILED",\n              tableName: "tickets",\n              recordId: ticket.id,\n              details: JSON.stringify({ code: notificationError.slice(0, 200) }),\n            });''',
    '''            await prisma.auditLog.create({\n              data: {\n                tenantId: session.tenantId,\n                userId: session.userId,\n                action: "TICKET_NOTIFICATION_FAILED",\n                tableName: "tickets",\n                recordId: ticket.id,\n                details: JSON.stringify({ code: notificationError.slice(0, 200) }),\n              },\n            });''',
)
replace_once(
    "app/api/v1/support/tickets/[id]/reply/route.ts",
    '''        if (!delivery.success) {\n          return NextResponse.json(\n            { success: false, error: delivery.error },\n            { status: 409 },\n          );\n        }''',
    '''        if (!delivery.success) {\n          await prisma.auditLog.create({\n            data: {\n              tenantId: session.tenantId,\n              userId: session.userId,\n              action: "TICKET_NOTIFICATION_FAILED",\n              tableName: "tickets",\n              recordId: id,\n              details: JSON.stringify({ code: delivery.error.slice(0, 200) }),\n            },\n          });\n          return NextResponse.json(\n            { success: false, error: delivery.error },\n            { status: 409 },\n          );\n        }''',
)

# Avoid a table-wide validation scan while adding the Paylink constraint.
replace_once(
    "prisma/migrations/20260813174500_paylink_provider_url_guard/migration.sql",
    ");\n",
    ") NOT VALID;\n",
)
validate_dir = Path("prisma/migrations/20260813174600_validate_paylink_provider_url_guard")
validate_dir.mkdir(parents=True, exist_ok=True)
write(
    str(validate_dir / "migration.sql"),
    '''-- Validate the already-enforced Paylink URL constraint with the lighter validation lock.\nALTER TABLE "revenue_provider_connections"\nVALIDATE CONSTRAINT "revenue_provider_paylink_base_url_ck";\n''',
)

# Review contracts.
replace_once(
    "tests/email-admin-alert.test.ts",
    '''    expect(result.success).toBe(false);\n    expect(prismaMocks.findFirst).not.toHaveBeenCalled();''',
    '''    expect(result.success).toBe(false);\n    expect(result.code).toBe("EMAIL_PROVIDER_NOT_CONFIGURED");\n    expect(prismaMocks.findFirst).not.toHaveBeenCalled();''',
)
replace_once(
    "tests/tasks-operational-closure.test.ts",
    '''    expect(completeApi).toContain('task.status !== "PENDING" && task.status !== "OVERDUE"');''',
    '''    expect(completeApi).toContain('task.status !== "PENDING" && task.status !== "OVERDUE"');\n    expect(completeApi).toContain('assignedTo: { not: session.userId }');''',
)
replace_once(
    "tests/dedicated-helpdesk.test.ts",
    '''    expect(mockSendEmail).not.toHaveBeenCalled();\n  });\n\n  it("returns notification warning without rolling back a durable close",''',
    '''    expect(mockSendEmail).not.toHaveBeenCalled();\n    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(\n      expect.objectContaining({\n        data: expect.objectContaining({\n          action: "TICKET_NOTIFICATION_FAILED",\n          recordId: "ticket-1",\n        }),\n      }),\n    );\n  });\n\n  it("returns notification warning without rolling back a durable close",''',
)
replace_once(
    "tests/dedicated-helpdesk.test.ts",
    '''    expect(String((result as { notificationError?: string }).notificationError)).toContain(\n      "EMAIL_PROVIDER_NOT_CONFIGURED",\n    );\n  });''',
    '''    expect(String((result as { notificationError?: string }).notificationError)).toContain(\n      "EMAIL_PROVIDER_NOT_CONFIGURED",\n    );\n    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(\n      expect.objectContaining({\n        data: expect.objectContaining({\n          action: "TICKET_NOTIFICATION_FAILED",\n          recordId: "ticket-1",\n        }),\n      }),\n    );\n  });''',
)

print("R1C_SECOND_PASS_APPLIED")
