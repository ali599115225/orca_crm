import { describe, expect, it } from "vitest";
import {
  localizeEmailProviderError,
  localizeSystemLeadActivityDescription,
  localizeSystemLeadTaskTitle,
  opportunityStatusLabel,
} from "@/features/leads/copy/leadsCopy";

describe("Leads runtime localization", () => {
  it("never exposes provider credentials or raw technical email errors", () => {
    expect(localizeEmailProviderError("Missing RESEND_API_KEY in environment", "ar"))
      .toBe("خدمة البريد غير مهيأة حاليًا. تواصل مع مسؤول النظام.");
    expect(localizeEmailProviderError("Missing RESEND_API_KEY in environment", "en"))
      .toBe("Email is not configured. Contact an administrator.");
    expect(localizeEmailProviderError("Unexpected provider stack trace", "en"))
      .toBe("The email provider could not send the message.");
    expect(localizeEmailProviderError("Unexpected provider stack trace", "en"))
      .not.toContain("stack trace");
  });

  it("localizes platform-generated task titles but preserves user-authored titles", () => {
    expect(
      localizeSystemLeadTaskTitle("تواصل ترحيبي مع العميل: أحمد", "en"),
    ).toBe("Welcome follow-up with lead: أحمد");
    expect(
      localizeSystemLeadTaskTitle("Call the owner tomorrow", "ar"),
    ).toBe("Call the owner tomorrow");
  });

  it("localizes known platform activity descriptions in both directions", () => {
    expect(
      localizeSystemLeadActivityDescription(
        "أرسل بريد إلى test@example.com — الموضوع: Hello",
        "en",
      ),
    ).toBe("Email sent to test@example.com — subject: Hello");
    expect(
      localizeSystemLeadActivityDescription(
        "WhatsApp message sent to 0500000000: Hello",
        "ar",
      ),
    ).toBe("تم إرسال رسالة واتساب إلى 0500000000: Hello");
  });

  it("maps opportunity workflow values without raw-enum fallback", () => {
    expect(opportunityStatusLabel("OPEN", "ar")).toBe("مفتوحة");
    expect(opportunityStatusLabel("OPEN", "en")).toBe("Open");
    expect(opportunityStatusLabel("UNKNOWN_VALUE", "ar")).toBe("غير محددة");
    expect(opportunityStatusLabel("UNKNOWN_VALUE", "en")).toBe("Not specified");
  });
});
