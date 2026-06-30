import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { httpErrorResponse } from "@/lib/http-error-response";
import { proxy } from "@/proxy";

describe("P0 HTTP request IDs", () => {
  it("correlates body, nested error and response header", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "req-http-p0-001" },
    });

    const response = httpErrorResponse(
      request,
      ErrorCode.FORBIDDEN,
      "authorization failed",
    );

    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBe("req-http-p0-001");
    expect(body.requestId).toBe("req-http-p0-001");
    expect(body.error.requestId).toBe("req-http-p0-001");
  });

  it("rejects an unsafe incoming request ID", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { "x-request-id": "unsafe id" },
    });

    const response = httpErrorResponse(
      request,
      ErrorCode.INTERNAL_ERROR,
      "failure",
    );

    const body = await response.json();

    expect(body.requestId).not.toBe("unsafe id");
    expect(response.headers.get("x-request-id")).toBe(body.requestId);
  });

  it("propagates a valid request ID at the HTTP boundary", () => {
    const response = proxy(
      new NextRequest("http://localhost/api/v1/test", {
        headers: {
          "x-request-id": "req-proxy-p0-001",
          "x-forwarded-for": "203.0.113.10",
        },
      }),
    );

    expect(response.headers.get("x-request-id")).toBe("req-proxy-p0-001");
  });
});