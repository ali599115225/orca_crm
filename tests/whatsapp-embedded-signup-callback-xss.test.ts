import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/whatsapp/embedded-signup/callback/route";

// Empirical verification for CodeQL Alert #9 (js/reflected-xss,
// app/api/whatsapp/embedded-signup/callback/route.ts:47). This calls the
// real route handler with adversarial `code`/`state`/Host values and
// inspects the ACTUAL response body — it does not reason about the code
// theoretically. No network calls: NextRequest is constructed in-process,
// and the route itself performs no I/O.

const BASE = "https://orca.az-ez.pro/api/whatsapp/embedded-signup/callback";

function buildRequest(params: Record<string, string>, headers?: Record<string, string>) {
  const url = new URL(BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url.toString(), { headers });
}

async function runAndGetBody(params: Record<string, string>, headers?: Record<string, string>) {
  const response = await GET(buildRequest(params, headers));
  const body = await response.text();
  return { response, body };
}

// The concrete exploit signature: an attacker-controlled value re-opening a
// new <script> element after prematurely closing the legitimate one.
const SCRIPT_BREAKOUT_PATTERN = /<\/script[^>]*>\s*<script/i;
// A bare, unescaped '<' immediately followed by '/' or a tag name character
// is the raw ingredient the breakout needs; assert none survives at all.
const RAW_LESS_THAN_PATTERN = /</;

describe("Alert #9 — reflected XSS empirical verification (WhatsApp embedded-signup callback)", () => {
  it("baseline: returns HTML with the expected Content-Type (confirms the sink)", async () => {
    const { response, body } = await runAndGetBody({ code: "abc123", state: "xyz789" });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(body).toContain("<script>");
    expect(body).toContain('"code":"abc123"');
  });

  const codeStatePayloads: Array<[string, string]> = [
    ["script breakout", "</script><script>alert(1)</script>"],
    ["case-varied breakout", "</SCRIPT><script>alert(1)</script>"],
    ["breakout with attributes", "</script ><script>alert(1)</script>"],
    ["double quote", '"; alert(1); //'],
    ["single backslash", "\\"],
    ["backslash then quote", '\\"; alert(1); //'],
    ["URL-encoded breakout (already decoded by URLSearchParams)", "%3C%2Fscript%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E"],
    ["double-encoded breakout", "%253C%252Fscript%253E%253Cscript%253E"],
    ["U+2028 line separator", "line1\u2028alert(1)"],
    ["U+2029 paragraph separator", "line1\u2029alert(1)"],
    ["HTML entity for <", "&lt;script&gt;alert(1)&lt;/script&gt;"],
    ["template-literal breakout attempt", "${alert(1)}`;alert(1);//"],
    ["null byte and control chars", "a\u0000b\u0007c"],
  ];

  it.each(codeStatePayloads)("code=%s payload does not break out of the script context", async (_label, payload) => {
    const { response, body } = await runAndGetBody({ code: payload, state: "benign" });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(body).not.toMatch(SCRIPT_BREAKOUT_PATTERN);

    // Every literal '<' contributed by `code`/`state` must have been
    // neutralized. The only legitimate '<' characters in the whole document
    // are the fixed template markup; strip those known-good tags out —
    // repeatedly, to a fixed point, so an adversarial string that only
    // resolves into a stripped tag after an earlier removal pass can't
    // hide behind a single-pass replace — and assert nothing
    // attacker-shaped remains.
    let withoutFixedMarkup = body.replace(/<!doctype html>/i, "");
    let previousPass: string;
    do {
      previousPass = withoutFixedMarkup;
      withoutFixedMarkup = withoutFixedMarkup.replace(
        /<\/?(html|head|meta|title|body|p|script)[^>]*>/gi,
        "",
      );
    } while (withoutFixedMarkup !== previousPass);
    expect(withoutFixedMarkup).not.toMatch(RAW_LESS_THAN_PATTERN);
  });

  it.each(codeStatePayloads)("state=%s payload does not break out of the script context", async (_label, payload) => {
    const { response, body } = await runAndGetBody({ code: "benign", state: payload });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(body).not.toMatch(SCRIPT_BREAKOUT_PATTERN);
  });

  it("the payload object round-trips through JSON.parse-equivalent semantics (JS engine, not just visual inspection)", async () => {
    const { body } = await runAndGetBody({
      code: '</script><script>alert(1)</script>"\\',
      state: "normal-state-value",
    });

    const match = body.match(/const payload = (\{[\s\S]*?\});/);
    expect(match).not.toBeNull();
    const objectLiteralSource = match![1];

    // Execute the exact object-literal source the browser's JS engine would
    // parse, in an isolated Function scope (no DOM, no ambient globals) —
    // proves it parses to a harmless object and not executable injected code.
    // eslint-disable-next-line no-new-func
    const evaluated = new Function(`return (${objectLiteralSource});`)();
    expect(evaluated).toEqual({
      type: "ORCA_WHATSAPP_OAUTH_CALLBACK",
      code: '</script><script>alert(1)</script>"\\',
      state: "normal-state-value",
    });
  });

  describe("path 3 — request.nextUrl.origin via Host / X-Forwarded-Host headers", () => {
    it("NextRequest.nextUrl.origin ignores Host/X-Forwarded-Host header values entirely", () => {
      const req = buildRequest(
        { code: "a", state: "b" },
        { "x-forwarded-host": "<script>alert(1)</script>", host: "<script>alert(2)</script>" },
      );
      // The origin is derived from the URL the request was constructed
      // with, not from these headers — empirically confirmed, not assumed.
      expect(req.nextUrl.origin).toBe("https://orca.az-ez.pro");
    });

    it("a malicious Host/X-Forwarded-Host header does not alter the response body's origin/fallback values", async () => {
      const { body } = await runAndGetBody(
        { code: "a", state: "b" },
        { "x-forwarded-host": "<script>alert(1)</script>", host: "<script>alert(2)</script>" },
      );
      expect(body).not.toMatch(SCRIPT_BREAKOUT_PATTERN);
      expect(body).toContain('const origin = "https://orca.az-ez.pro"');
      expect(body).toContain('"https://orca.az-ez.pro/operations/settings?tab=compliance"');
    });

    it("WHATWG URL parsing rejects '<' in an http/https host outright (the underlying reason path 3 cannot carry '<')", () => {
      expect(() => new URL("https://<script>.evil.com/x")).toThrow();
      expect(() => new URL("https://evil.com<script>/x")).toThrow();
      expect(() =>
        new NextRequest("https://ev<il.com/api/whatsapp/embedded-signup/callback"),
      ).toThrow();
    });
  });
});
