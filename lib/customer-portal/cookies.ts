export const CUSTOMER_SESSION_COOKIE = "orca_customer_session";
export const EMPLOYEE_SESSION_COOKIE = "orca_session";

export function customerCookieOptions(maxAgeSeconds = 8 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/customer",
    maxAge: maxAgeSeconds,
  };
}

export function assertNoEmployeeCookie(cookies: Readonly<Record<string, string | undefined>>): void {
  if (cookies[EMPLOYEE_SESSION_COOKIE]) throw new Error("employee session cannot authorize customer portal");
}
