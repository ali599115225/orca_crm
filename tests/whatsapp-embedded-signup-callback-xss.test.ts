import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/whatsapp/embedded-signup/callback/route";

// Empirical verification for CodeQL Alert #9 (js/reflected-xss,
// app/api/whatsapp/embedded-signup/callback/route.ts:47). This calls the
// real route handler with adversarial `code`/`state`/Host values and
// inspects the ACTUAL, UNMODIFIED response body — it does not reason about
// the code theoretically, and it never cleans/strips/normalizes the body
// before asserting on it (a stripping step could itself hide a real
// breakout). No network calls: NextRequest is constructed in-process, and
// the route itself performs no I/O.

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
// The HTML/JS-string metacharacters route.ts neutralizes inside the dynamic
// JSON slice, and their expected \uXXXX escape form. A bare, unescaped
// instance of any of these is the raw ingredient an HTML/script breakout
// needs; the dynamic JSON slice (see extractPayloadLiteral) must contain
// none of them, ever — checked directly on that raw slice, never on a
// stripped/cleaned copy of the body. ('"' is intentionally excluded: it is
// a JSON structural delimiter that JSON.stringify already escapes
// correctly, and re-escaping it here would corrupt the JSON syntax itself.)
const ESCAPED_CHARS: Array<[string, string]> = [
  ["<", "\\u003c"],
  [">", "\\u003e"],
  ["&", "\\u0026"],
  ["'", "\\u0027"],
];
const RAW_UNESCAPED_METACHAR_PATTERN = /[<>&']/;

function getScriptTagCounts(body: string) {
  return {
    openCount: (body.match(/<script\b[^>]*>/gi) ?? []).length,
    closeCount: (body.match(/<\/script>/gi) ?? []).length,
  };
}

// Locates the dynamic JSON payload literal using the template's own fixed,
// hard-coded surrounding text in route.ts (`const payload = ...;\n  const
// origin = `) — never by deleting/stripping HTML tags ourselves, which
// would risk hiding exactly the kind of breakout this test exists to catch.
function extractPayloadLiteral(body: string): string {
  const match = body.match(/const payload = ([\s\S]*?);\n {2}const origin = /);
  if (!match) {
    throw new Error(
      "could not locate 'const payload = ...;' via the route's fixed template boundary",
    );
  }
  return match[1];
}

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
    ["greater-than raw", "a>b"],
    ["ampersand raw", "a&b"],
    ["single quote raw", "a'b"],
    ["combined metacharacter injection attempt", "<img src=x onerror=alert(1)>'&"],
    ["null byte and control chars", "a\u0000b\u0007c"],
  ];

  let baselineScriptTagCounts: { openCount: number; closeCount: number };

  beforeAll(async () => {
    const { body } = await runAndGetBody({ code: "abc123", state: "xyz789" });
    baselineScriptTagCounts = getScriptTagCounts(body);
  });

  function assertPayloadStaysInert(body: string, payload: string) {
    // 1) The raw, unmodified body must never contain the attacker payload
    // verbatim, and never exhibit the concrete breakout signature.
    expect(body).not.toMatch(SCRIPT_BREAKOUT_PATTERN);
    if (ESCAPED_CHARS.some(([char]) => payload.includes(char))) {
      expect(body).not.toContain(payload);
    }

    // 2) The raw document's <script>/</script> tag count must be identical
    // to the known-safe baseline: the payload opened or closed no element.
    expect(getScriptTagCounts(body)).toEqual(baselineScriptTagCounts);

    // 3) Extract exactly the dynamic JSON slice via the template's real
    // fixed boundary text, then assert directly on that raw slice: no
    // unescaped metacharacter survives, and every one the payload actually
    // contains shows up in its escaped \uXXXX form.
    const jsonLiteral = extractPayloadLiteral(body);
    expect(jsonLiteral).not.toMatch(RAW_UNESCAPED_METACHAR_PATTERN);
    for (const [char, escaped] of ESCAPED_CHARS) {
      if (payload.includes(char)) {
        expect(jsonLiteral).toContain(escaped);
      }
    }

    // 4) Any event-handler/javascript: text the payload contributes is
    // proven inert data (not a live HTML attribute) by check 3 above: it
    // lives only inside the JSON slice, which is already proven free of
    // unescaped '<'/'>', so no new tag exists for such an attribute to
    // attach to. This check targets the STATIC remainder of the document
    // (JSON slice excised) to additionally prove no event handler or
    // javascript: URI ever leaks into a real, executable position outside
    // that slice.
    const bodyOutsideJsonLiteral = body.replace(jsonLiteral, "");
    if (/onerror\s*=|onload\s*=/i.test(payload)) {
      expect(bodyOutsideJsonLiteral).not.toMatch(/onerror\s*=|onload\s*=/i);
    }
    if (payload.toLowerCase().includes("javascript:")) {
      expect(bodyOutsideJsonLiteral.toLowerCase()).not.toContain("javascript:");
    }

    // 5) Prove, via the real JS engine (not visual inspection), that the
    // slice parses back to exactly the original payload.
    // eslint-disable-next-line no-new-func
    const evaluated = new Function(`return (${jsonLiteral});`)();
    return evaluated;
  }

  it.each(codeStatePayloads)("code=%s payload does not break out of the script context", async (_label, payload) => {
    const { response, body } = await runAndGetBody({ code: payload, state: "benign" });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const evaluated = assertPayloadStaysInert(body, payload);
    expect(evaluated.code).toBe(payload);
  });

  it.each(codeStatePayloads)("state=%s payload does not break out of the script context", async (_label, payload) => {
    const { response, body } = await runAndGetBody({ code: "benign", state: payload });
    expect(response.headers.get("Content-Type")).toContain("text/html");
    const evaluated = assertPayloadStaysInert(body, payload);
    expect(evaluated.state).toBe(payload);
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
