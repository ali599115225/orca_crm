import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockIsDedicatedCopy } = vi.hoisted(() => {
  const mockIsDedicatedCopy = vi.fn();
  return { mockIsDedicatedCopy };
});

vi.mock("@/lib/deployment-license", () => ({
  isDedicatedCopyDeployment: () => mockIsDedicatedCopy(),
}));

import TermsPage from "@/app/terms-and-conditions/page";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function extractText(element: any): string {
  if (typeof element === "string") return element;
  if (!element || !element.props) return "";
  const children = element.props.children;
  if (!children) return "";
  if (Array.isArray(children)) return children.map(extractText).join(" ");
  return extractText(children);
}

function normalizeText(element: any): string {
  return extractText(element).replace(/\s+/g, " ").trim();
}

describe("TermsPage — DEDICATED_COPY", () => {
  it("DEDICATED_COPY shows independent license text", () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).toContain("أحكام الترخيص");
  });

  it("DEDICATED_COPY mentions no automatic renewal", () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).toContain("لا يوجد اشتراك شهري");
  });

  it("DEDICATED_COPY mentions customer data ownership", () => {
    mockIsDedicatedCopy.mockReturnValue(true);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).toContain("بيانات العميل");
  });

  it("SaaS shows monthly subscription text", () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).toContain("الاشتراك الشهري");
  });

  it("SaaS shows automatic renewal text", () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).toContain("تجديد الاشتراك تلقائياً");
  });

  it("SaaS does NOT show independent license text", () => {
    mockIsDedicatedCopy.mockReturnValue(false);
    const page = TermsPage();
    const normalizedText = normalizeText(page);

    expect(normalizedText).not.toContain("أحكام الترخيص");
  });
});
