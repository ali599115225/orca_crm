import fs from "node:fs";
import { describe, expect, it } from "vitest";

const actionSource = fs.readFileSync("app/actions/contract.ts", "utf8");
const wizardSource = fs.readFileSync(
  "components/features/ContractWizard.tsx",
  "utf8",
);
const wizardVisualSource = fs.readFileSync(
  "components/features/contractWizardVisual.ts",
  "utf8",
);
const translations = fs.readFileSync(
  "lib/i18n/translations.ts",
  "utf8",
);

describe("contract and dashboard architecture", () => {
  it("runs contract reads and writes inside an explicit tenant boundary", () => {
    expect(actionSource).toContain(
      'import { runWithTenantContext } from "@/lib/tenant-context"',
    );
    expect(
      actionSource.match(/return await runWithTenantContext\(/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });

  it("does not return raw internal errors from wizard actions", () => {
    expect(actionSource).not.toContain("error: error.message");
    expect(actionSource).toContain("TENANT_CONTEXT_UNAVAILABLE");
  });

  it("contains no hardcoded Arabic interface copy or local hex theme values", () => {
    expect(wizardSource).not.toMatch(/[\u0600-\u06FF]/);
    expect(wizardSource).not.toContain('dir="rtl"');
    expect(wizardSource).toContain("const { lang, t } = useApp()");
    expect(`${wizardSource}\n${wizardVisualSource}`).not.toMatch(
      /#[0-9a-fA-F]{3,8}/,
    );
  });

  it("uses a genuine progressive flow instead of a decorative stepper", () => {
    expect(wizardSource).toContain("type WizardStep = 0 | 1 | 2");
    expect(wizardSource).toContain("const goNext = () =>");
    expect(wizardSource).toContain("const goBack = () =>");
    expect(wizardSource).toContain("currentStep === 0");
    expect(wizardSource).toContain("currentStep === 1");
    expect(wizardSource).toContain("currentStep === 2");
    expect(wizardSource).toContain("selectedClient");
    expect(wizardSource).toContain("selectedProperty");
  });

  it("keeps destructive submission behind the final review step", () => {
    const submitIndex = wizardSource.indexOf('type="submit"');
    const reviewIndex = wizardSource.indexOf("currentStep === 2");

    expect(reviewIndex).toBeGreaterThan(-1);
    expect(submitIndex).toBeGreaterThan(reviewIndex);
    expect(wizardSource).toContain("currentStep !== 2 || !canReview");
  });

  it("supports modal keyboard handling and focus restoration", () => {
    expect(wizardSource).toContain('event.key === "Escape"');
    expect(wizardSource).toContain('aria-modal="true"');
    expect(wizardSource).toContain("previousFocusRef.current?.focus()");
    expect(wizardSource).toContain('tabIndex={-1}');
  });

  it("uses accurate issuance wording rather than approval wording", () => {
    expect(translations).toContain(
      "'contractWizard.submit':             { ar: 'إصدار العقد', en: 'Issue Contract' }",
    );
    expect(translations).not.toContain("Issue and Approve Contract");
    expect(translations).not.toContain("إصدار وتعميد العقد");
  });
});
