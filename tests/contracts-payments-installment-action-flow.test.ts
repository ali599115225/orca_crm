import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("sales contract installment action flow", () => {
  const workspace = read(
    "components/sales/SalesContractWorkspace.tsx",
  );
  const paymentRoute = read(
    "app/api/v1/installments/[id]/pay/route.ts",
  );

  it("shows explicit action states instead of an unexplained dash", () => {
    expect(workspace).toContain('L("للعرض فقط", "Read-only")');
    expect(workspace).toContain(
      'L("بانتظار التوقيع", "Awaiting signature")',
    );
    expect(workspace).toContain(
      'L("بانتظار الفاتورة", "Awaiting invoice")',
    );
    expect(workspace).toContain('L("مدفوع", "Paid")');
    expect(workspace).toContain(
      'L("ملغي بعد التسوية", "Cancelled after settlement")',
    );
    expect(workspace).toContain(
      'L("ملغي بالخطة", "Cancelled by plan")',
    );
    expect(workspace).toContain(
      'L("استكمال الدفع", "Complete payment")',
    );
    expect(workspace).toContain(
      'L("دفع القسط", "Pay installment")',
    );
    expect(workspace).toContain('L("غير متاح", "Unavailable")');
  });

  it("keeps the real installment payment action wired to N-Genius", () => {
    expect(workspace).toContain(
      "/api/v1/installments/${item.id}/pay",
    );
    expect(workspace).toContain(
      "onClick={() => void payInstallment(item)}",
    );
    expect(workspace).toContain(
      'busy === `pay:${item.id}`',
    );
  });

  it("mirrors all backend payment eligibility guards in the UI", () => {
    expect(workspace).toContain("contract.legacyFinancial");
    expect(workspace).toContain(
      'contract.status !== "SIGNED"',
    );
    expect(workspace).toContain("!contract.invoice");
    expect(workspace).toContain("item.remainingAmount <= 0");
    expect(workspace).toContain(
      "COLLECTIBLE.has(item.paymentStatus)",
    );

    expect(paymentRoute).toContain(
      "installment.contract.legacyFinancial",
    );
    expect(paymentRoute).toContain(
      "installment.contract.status !== CONTRACT_STATUS.SIGNED",
    );
    expect(paymentRoute).toContain(
      "!installment.invoiceId || !installment.invoice",
    );
    expect(paymentRoute).toContain(
      "installment.paymentStatus === INSTALLMENT_STATUS.PAID",
    );
    expect(paymentRoute).toContain("amountMinor <= 0");
  });
});
