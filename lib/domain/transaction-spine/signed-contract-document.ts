import { verifySignedOperationalSnapshot } from "./signed-contract-snapshot";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 })
    : "-";
}

export function renderSignedContractDocument(
  snapshot: Parameters<typeof verifySignedOperationalSnapshot>[0],
  isDownload = false,
) {
  const identity = verifySignedOperationalSnapshot(snapshot);
  const facts = snapshot.structuredFacts as any;
  const plan = snapshot.paymentPlanSnapshot as any;
  const signed = facts?.contract ?? {};
  const seller = facts?.seller ?? {};
  const unit = facts?.unit ?? {};
  const invoice = facts?.invoice ?? null;
  const total = Number(signed.totalVolumeSar);
  const vatRate = Number(signed.vatRate);
  const vatAmount = invoice ? Number(invoice.vatAmount) : (total * vatRate) / 100;
  const grandTotal = invoice ? Number(invoice.totalAmount) : total + vatAmount;
  const installments: any[] = Array.isArray(plan?.installments) ? plan.installments : [];
  const label = `CONTRACT-${identity.contractId.substring(0, 8).toUpperCase()}`;

  const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>${escapeHtml(label)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
  .contract { max-width: 800px; margin: auto; background: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 8px; }
  h1 { font-size: 24px; color: #1a365d; margin: 0 0 5px; }
  .meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px 0; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
  .seller, .customer { width: 45%; }
  .seller h3, .customer h3 { font-size: 12px; color: #718096; margin: 0 0 5px; text-transform: uppercase; }
  .seller p, .customer p { font-size: 14px; margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f7fafc; padding: 10px; font-size: 12px; color: #718096; text-align: right; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  .totals { margin: 20px 0; text-align: left; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .totals .grand-total { font-size: 18px; font-weight: bold; color: #1a365d; border-top: 2px solid #1a365d; padding-top: 10px; margin-top: 10px; }
  .footer { text-align: center; font-size: 11px; color: #a0aec0; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
  .info-bar { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; background: #f7fafc; padding: 10px 15px; border-radius: 6px; margin: 15px 0; font-size: 12px; color: #4a5568; word-break: break-all; }
  @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="contract">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
  <h1>${escapeHtml(label)}</h1>
  <p style="color: #718096; font-size: 14px;">عقد بيع وحدة عقارية / Property Sale Contract</p>
      </div>
      <div style="text-align: left;">
  <p style="font-size: 12px; color: #718096;">${escapeHtml(seller.companyName)}</p>
      </div>
    </div>

    <div class="info-bar">
      <span>الحالة: ${escapeHtml(signed.status)}</span>
      <span>نوع الضريبة: ${escapeHtml(signed.vatType)}</span>
    </div>

    <div class="meta">
      <div class="seller">
  <h3>البائع / Seller</h3>
  <p><strong>${escapeHtml(seller.companyName)}</strong></p>
  <p>الرقم الضريبي: ${escapeHtml(seller.vatNumber || "-")}</p>
  <p>السجل التجاري: ${escapeHtml(seller.commercialRegistry || "-")}</p>
  <p>${escapeHtml(seller.nationalAddress || "")}</p>
      </div>
      <div class="customer">
  <h3>المشتري / Buyer</h3>
  <p><strong>${escapeHtml(signed.buyerName)}</strong></p>
  <p>رقم الجوال: ${escapeHtml(signed.buyerPhone)}</p>
  <p>الوحدة: ${escapeHtml(unit.unitNumber || "-")}</p>
  <p>النوع: ${escapeHtml(unit.type || "-")} | المساحة: ${escapeHtml(unit.area || "-")}</p>
  ${unit.city ? `<p>المدينة: ${escapeHtml(unit.city)}${unit.district ? " - " + escapeHtml(unit.district) : ""}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
  <tr>
    <th>البيان / Description</th>
    <th style="text-align: left;">القيمة / Value</th>
  </tr>
      </thead>
      <tbody>
  <tr>
    <td>إجمالي قيمة العقد</td>
    <td style="text-align: left;">${money(total)} SAR</td>
  </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><span>قيمة العقد قبل الضريبة / Contract Value</span><span>${money(total)} SAR</span></div>
      <div><span>نسبة الضريبة / VAT Rate</span><span>${escapeHtml(signed.vatRate)}%</span></div>
      <div><span>قيمة الضريبة / VAT Amount</span><span>${money(vatAmount)} SAR</span></div>
      <div class="grand-total"><span>الإجمالي شامل الضريبة / Grand Total</span><span>${money(grandTotal)} SAR</span></div>
    </div>

    ${
      installments.length > 0
  ? `
    <h3 style="font-size: 16px; color: #1a365d; margin: 20px 0 10px;">جدول الأقساط / Installment Schedule</h3>
    <table>
      <thead>
  <tr>
    <th>رقم القسط</th>
    <th style="text-align: left;">المبلغ</th>
    <th style="text-align: left;">الضريبة</th>
    <th>تاريخ الاستحقاق</th>
    <th>الحالة وقت التوقيع</th>
  </tr>
      </thead>
      <tbody>
  ${installments
    .map(
      (installment) => `
  <tr>
    <td>${escapeHtml(installment.installmentNumber)}</td>
    <td style="text-align: left;">${money(installment.amountSar)} SAR</td>
    <td style="text-align: left;">${installment.vatAmount ? money(installment.vatAmount) : "-"} SAR</td>
    <td>${escapeHtml(String(installment.dueDate || "").split("T")[0])}</td>
    <td>${escapeHtml(installment.paymentStatus)}</td>
  </tr>
  `,
    )
    .join("")}
      </tbody>
    </table>
    `
  : ""
    }

    <div class="info-bar" data-contract-identity>
      <span>Contract: ${escapeHtml(identity.contractId)}</span>
      <span>Version: ${escapeHtml(identity.contractVersion)}</span>
      <span>Signed: ${escapeHtml(identity.signedAt)}</span>
      <span>Evidence SHA-256: ${escapeHtml(identity.signatureEvidenceHash)}</span>
      <span>Snapshot digest: ${escapeHtml(snapshot.digest)}</span>
    </div>

    <div class="footer">
<p>تم إنشاؤها بواسطة ORCA | عقد بيع وحدة عقارية</p>
<p>Generated by ORCA | Property Sale Contract</p>
    </div>

    <div class="no-print" style="text-align: center; margin-top: 20px;">
      <button onclick="window.print()" style="padding: 10px 30px; background: #1a365d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">طباعة / Print</button>
    </div>
  </div>
  ${isDownload ? "<script>window.onload = function() { window.print(); }</script>" : ""}
</body>
</html>`;

  return { html, identity, label };
}
