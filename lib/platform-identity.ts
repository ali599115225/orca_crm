export type PrivilegedPlatformRole = "SUPER_ADMIN" | "PLATFORM_ARCHITECT";

function configuredEmails(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isConfiguredSuperAdminEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email);
  return Boolean(normalized && configuredEmails("SUPER_ADMIN_EMAILS").has(normalized));
}

export function isConfiguredPlatformArchitectEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email);
  return Boolean(
    normalized && configuredEmails("PLATFORM_ARCHITECT_EMAILS").has(normalized)
  );
}

export function getConfiguredPrivilegedRole(
  email: unknown,
): PrivilegedPlatformRole | null {
  if (isConfiguredSuperAdminEmail(email)) return "SUPER_ADMIN";
  if (isConfiguredPlatformArchitectEmail(email)) return "PLATFORM_ARCHITECT";
  return null;
}

export function isPrivilegedSessionPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;
  const role = typeof payload.role === "string" ? payload.role : "";
  return (
    role === "SUPER_ADMIN" ||
    role === "PLATFORM_ARCHITECT" ||
    Boolean(getConfiguredPrivilegedRole(payload.email))
  );
}
