import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const logMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSession: logMocks.getSession }));
vi.mock("@/lib/resilience/logger", () => ({
  systemLogger: { error: logMocks.loggerError },
}));
vi.mock("fs", () => ({
  default: {
    existsSync: logMocks.existsSync,
    writeFileSync: logMocks.writeFileSync,
    readFileSync: logMocks.readFileSync,
  },
  existsSync: logMocks.existsSync,
  writeFileSync: logMocks.writeFileSync,
  readFileSync: logMocks.readFileSync,
}));

type ExactClaimActions = {
  clearSystemLogsAction: () => Promise<{ success: boolean; error?: string }>;
  triggerMockErrorAction: (
    errorMessage?: string,
  ) => Promise<{ success: boolean; error?: string }>;
};

let clearSystemLogsAction: ExactClaimActions["clearSystemLogsAction"];
let triggerMockErrorAction: ExactClaimActions["triggerMockErrorAction"];

beforeAll(async () => {
  const modulePath = ["@/app/actions", "logs"].join("/");
  const actions = await vi.importActual<ExactClaimActions>(modulePath);
  clearSystemLogsAction = actions.clearSystemLogsAction;
  triggerMockErrorAction = actions.triggerMockErrorAction;
});

beforeEach(() => {
  vi.clearAllMocks();
  logMocks.getSession.mockResolvedValue({
    userId: "user-1",
    tenantId: "tenant-1",
    role: "Admin",
    name: "Administrator",
  });
  logMocks.existsSync.mockReturnValue(false);
});

describe("EXEC-003 exact session-claim boundaries", () => {
  it("DIRECT_BEHAVIORAL EXEC-003-C18-O01 ALLOW accepts the exact legacy Admin claim", async () => {
    await expect(clearSystemLogsAction()).resolves.toEqual({ success: true });
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C18-O01 DENY rejects the normalized ADMIN claim", async () => {
    logMocks.getSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
    });

    await expect(clearSystemLogsAction()).resolves.toEqual({
      success: false,
      error: "Unauthorized access",
    });
    expect(logMocks.writeFileSync).not.toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C19-O01 ALLOW accepts Admin and reaches the logger", async () => {
    await expect(triggerMockErrorAction("test")).resolves.toEqual({ success: true });
    expect(logMocks.loggerError).toHaveBeenCalled();
  });

  it("DIRECT_BEHAVIORAL EXEC-003-C19-O01 DENY rejects ADMIN before the logger", async () => {
    logMocks.getSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
    });

    await expect(triggerMockErrorAction("test")).resolves.toEqual({
      success: false,
      error: "Unauthorized access",
    });
    expect(logMocks.loggerError).not.toHaveBeenCalled();
  });
});
