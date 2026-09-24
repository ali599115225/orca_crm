import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionDiagnosticCode =
  | "SESSION_COOKIE_MISSING"
  | "SESSION_DECRYPT_FAILED"
  | "SESSION_VALID";

function logSessionDiagnostic(code: SessionDiagnosticCode) {
  console.info("[SessionDiagnostics]", { code });
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(
  payload: Record<string, unknown>,
  maxAgeSeconds = DEFAULT_SESSION_MAX_AGE_SECONDS,
) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getJwtSecret());
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(input, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session_token")?.value;
  if (!session) {
    logSessionDiagnostic("SESSION_COOKIE_MISSING");
    return null;
  }

  const payload = await decrypt(session);
  if (!payload) {
    logSessionDiagnostic("SESSION_DECRYPT_FAILED");
    return null;
  }

  logSessionDiagnostic("SESSION_VALID");
  return payload;
}
