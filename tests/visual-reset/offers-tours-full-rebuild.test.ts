import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const offers = read("components/real-estate/offers/OffersWorkspace.tsx");
const tours = read("components/real-estate/tours/ToursWorkspace.tsx");
const dateTime = read("components/operations/OperationsDateTimeFields.tsx");

describe("Offers and Tours full shared-contract rebuild", () => {
  it("rebuilds both pages on the canonical shared Operations primitives", () => {
    for (const source of [offers, tours]) {
      expect(source).toContain("OperationsPageHeader");
      expect(source).toContain("OperationsKpiGrid");
      expect(source).toContain("OperationsPanel");
      expect(source).toContain("OperationsEmptyState");
      expect(source).toContain("OperationsDialog");
      expect(source).toContain("operationsVisual.primaryButton");
      expect(source).toContain("operationsVisual.iconButton");
    }

    expect(offers).toContain("data-offers-rebuild-v1");
    expect(tours).toContain("data-tours-rebuild-v1");
  });

  it("removes the local legacy modal implementations instead of visually patching them", () => {
    expect(offers).not.toContain("function Modal(");
    expect(tours).not.toContain("function Modal(");
    expect(offers).not.toContain('className="orca-dialog-overlay"');
    expect(tours).not.toContain('className="orca-dialog-overlay"');
  });

  it("uses fixed dialog footers and inline validation instead of browser validation bubbles", () => {
    expect(offers).toContain('form="offer-create-form"');
    expect(offers).toContain('form="offer-tour-form"');
    expect(tours).toContain('form="tour-create-form"');
    expect(tours).toContain('form="tour-edit-form"');
    expect(offers).toContain("noValidate");
    expect(tours).toContain("noValidate");
  });

  it("uses the ORCA date/time contract and removes native date/datetime-local fields", () => {
    expect(offers).toContain("OperationsDateTimeFields");
    expect(tours).toContain("OperationsDateTimeFields");
    expect(offers).not.toContain('type="date"');
    expect(offers).not.toContain('type="datetime-local"');
    expect(tours).not.toContain('type="date"');
    expect(tours).not.toContain('type="datetime-local"');
    expect(dateTime).toContain('placeholder="DD/MM/YYYY"');
    expect(dateTime).toContain('placeholder="HH:MM"');
  });

  it("preserves every real offer and tour mutation path", () => {
    expect(offers).toContain('fetch("/api/v1/offers"');
    expect(offers).toContain('fetch(`/api/v1/offers/${selected.id}`');
    expect(offers).toContain('fetch(`/api/v1/offers/${selected.id}/accept`');
    expect(offers).toContain('fetch(`/api/v1/offers/${selected.id}/tours`');

    expect(tours).toContain('fetch("/api/v1/tours"');
    expect(tours).toContain('fetch(`/api/v1/tours/${selected.id}/status`');
    expect(tours).toContain('fetch(`/api/v1/tours/${selected.id}`');
  });

  it("keeps write controls capability-gated and refresh icon-only", () => {
    expect(offers).toContain("{canWrite ? (");
    expect(tours).toContain("{canWrite ? (");
    expect(offers).toContain('aria-label={t("تحديث العروض", "Refresh offers")}');
    expect(tours).toContain('aria-label={t("تحديث الجولات", "Refresh tours")}');
  });

  it("keeps the physical master list left and detail panel right in RTL", () => {
    expect(offers).toContain('dir="ltr"');
    expect(tours).toContain('dir="ltr"');
    expect(offers).toContain('dir={ar ? "rtl" : "ltr"}');
    expect(tours).toContain('dir={ar ? "rtl" : "ltr"}');
  });
});
