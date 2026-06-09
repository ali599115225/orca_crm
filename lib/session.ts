import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_DURATION = "12h";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
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
  if (!session) return null;
  return await decrypt(session);
}
