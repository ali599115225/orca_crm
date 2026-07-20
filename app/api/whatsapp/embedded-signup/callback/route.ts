import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code =
    request.nextUrl.searchParams.get("code") || "";
  const state =
    request.nextUrl.searchParams.get("state") || "";
  const targetOrigin = request.nextUrl.origin;

  const payload = JSON.stringify({
    type: "ORCA_WHATSAPP_OAUTH_CALLBACK",
    code,
    state,
  })
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("'", "\\u0027");

  const fallback = JSON.stringify(
    `${targetOrigin}/operations/settings?tab=compliance`,
  );

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ORCA WhatsApp</title>
</head>
<body>
<p>جاري إكمال ربط واتساب…</p>
<script>
(() => {
  const payload = ${payload};
  const origin = ${JSON.stringify(targetOrigin)};
  if (window.opener && payload.code) {
    window.opener.postMessage(payload, origin);
    window.close();
    return;
  }
  window.location.replace(${fallback});
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type":
        "text/html; charset=utf-8",
      "Cache-Control":
        "no-store, max-age=0",
      "Content-Security-Policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}